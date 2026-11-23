using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Zentric.Api.Contracts;
using Zentric.Api.Security;
using Zentric.Domain.Billing.Enums;
using Zentric.Domain.Users;
using Zentric.Infrastructure.Persistence;
using Zentric.Infrastructure.Persistence.Mappers;

namespace Zentric.Api.Controllers
{
    /// <summary>
    /// Gestión de saldos comerciales, balance liquidado, retiros y cuentas bancarias del vendedor.
    /// </summary>
    [ApiController]
    [Route("api/seller/payouts")]
    [Tags("Seller Payouts")]
    [Produces("application/json")]
    public class SellerPayoutsController : ControllerBase
    {
        private readonly ZentricDbContext _dbContext;
        private readonly ICurrentUserAccessor _currentUser;

        public SellerPayoutsController(ZentricDbContext dbContext, ICurrentUserAccessor currentUser)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _currentUser = currentUser ?? throw new ArgumentNullException(nameof(currentUser));
        }

        /// <summary>
        /// Obtiene el resumen financiero del vendedor: balance disponible (crédito a favor), total liquidado y saldo pendiente.
        /// </summary>
        /// <response code="200">Resumen financiero y cuenta bancaria configurada.</response>
        /// <response code="401">No autenticado o token inválido.</response>
        /// <response code="403">No autorizado: requiere rol Vendedor.</response>
        [HttpGet("summary")]
        [Authorize(Policy = AuthorizationPolicies.ProductManagement)]
        [ProducesResponseType(typeof(SellerPayoutSummaryDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> GetSummary(CancellationToken cancellationToken)
        {
            var userId = _currentUser.UserId;
            if (userId is null)
            {
                return Unauthorized(new ProblemDetails { Detail = "Missing or invalid bearer token." });
            }

            var bankDb = await _dbContext.SellerBankAccounts
                .AsNoTracking()
                .FirstOrDefaultAsync(b => b.SellerId == userId.Value, cancellationToken);

            var invoices = await _dbContext.Invoices
                .AsNoTracking()
                .Where(i => i.VendorId == userId.Value && i.Type == InvoiceType.VendorDetail && i.Status == InvoiceStatus.Issued)
                .ToListAsync(cancellationToken);

            var totalSettled = invoices.Sum(i => i.TotalAmount.Amount);

            var payouts = await _dbContext.SellerPayouts
                .AsNoTracking()
                .Where(p => p.SellerId == userId.Value)
                .ToListAsync(cancellationToken);

            var activePayouts = payouts
                .Where(p => !string.Equals(p.Status, "Rejected", StringComparison.OrdinalIgnoreCase))
                .Sum(p => p.Amount);

            var pendingOrdersCredit = payouts
                .Where(p => string.Equals(p.Status, "Pending", StringComparison.OrdinalIgnoreCase))
                .Sum(p => p.Amount);

            var availableBalance = Math.Max(0m, totalSettled - activePayouts);

            SellerBankAccountDto? bankDto = bankDb != null
                ? new SellerBankAccountDto(
                    bankDb.Id,
                    bankDb.BankName,
                    bankDb.AccountType,
                    bankDb.AccountNumber,
                    bankDb.AccountHolderName,
                    bankDb.DocumentNumber,
                    bankDb.UpdatedAt)
                : null;

            return Ok(new SellerPayoutSummaryDto(
                availableBalance,
                pendingOrdersCredit,
                totalSettled,
                "COP",
                bankDto));
        }

        /// <summary>
        /// Obtiene el historial de solicitudes de retiro y pagos del vendedor autenticado.
        /// </summary>
        /// <response code="200">Listado de transacciones de retiro.</response>
        /// <response code="401">No autenticado o token inválido.</response>
        /// <response code="403">No autorizado: requiere rol Vendedor.</response>
        [HttpGet("history")]
        [Authorize(Policy = AuthorizationPolicies.ProductManagement)]
        [ProducesResponseType(typeof(IReadOnlyList<SellerPayoutDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> GetHistory(CancellationToken cancellationToken)
        {
            var userId = _currentUser.UserId;
            if (userId is null)
            {
                return Unauthorized(new ProblemDetails { Detail = "Missing or invalid bearer token." });
            }

            var payouts = await _dbContext.SellerPayouts
                .AsNoTracking()
                .Where(p => p.SellerId == userId.Value)
                .OrderByDescending(p => p.RequestedAt)
                .ToListAsync(cancellationToken);

            var list = payouts.Select(p => new SellerPayoutDto(
                p.Id,
                p.Amount,
                p.Currency,
                p.Status,
                p.BankSummary,
                p.RequestedAt,
                p.ProcessedAt,
                p.ReferenceNumber)).ToList();

            return Ok(list);
        }

        /// <summary>
        /// Solicita un retiro o transferencia de fondos del saldo disponible del vendedor.
        /// </summary>
        /// <param name="request">Monto y moneda solicitados.</param>
        /// <param name="cancellationToken">Token de cancelación.</param>
        /// <response code="200">Solicitud de retiro registrada exitosamente.</response>
        /// <response code="400">Monto inválido o excede el saldo disponible.</response>
        /// <response code="401">No autenticado o token inválido.</response>
        /// <response code="403">No autorizado: requiere rol Vendedor.</response>
        [HttpPost("request")]
        [Authorize(Policy = AuthorizationPolicies.ProductManagement)]
        [ProducesResponseType(typeof(SellerPayoutDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> RequestPayout([FromBody] RequestPayoutRequest request, CancellationToken cancellationToken)
        {
            var userId = _currentUser.UserId;
            if (userId is null)
            {
                return Unauthorized(new ProblemDetails { Detail = "Missing or invalid bearer token." });
            }

            if (request.Amount <= 0)
            {
                return BadRequest(new ProblemDetails { Detail = "El monto a retirar debe ser mayor a cero." });
            }

            var invoices = await _dbContext.Invoices
                .AsNoTracking()
                .Where(i => i.VendorId == userId.Value && i.Type == InvoiceType.VendorDetail && i.Status == InvoiceStatus.Issued)
                .ToListAsync(cancellationToken);

            var totalSettled = invoices.Sum(i => i.TotalAmount.Amount);

            var activePayouts = await _dbContext.SellerPayouts
                .AsNoTracking()
                .Where(p => p.SellerId == userId.Value && p.Status != "Rejected")
                .SumAsync(p => p.Amount, cancellationToken);

            var availableBalance = Math.Max(0m, totalSettled - activePayouts);

            if (request.Amount > availableBalance)
            {
                return BadRequest(new ProblemDetails
                {
                    Detail = $"El monto solicitado ({request.Amount:N0} COP) excede tu saldo disponible ({availableBalance:N0} COP)."
                });
            }

            var bankDb = await _dbContext.SellerBankAccounts
                .AsNoTracking()
                .FirstOrDefaultAsync(b => b.SellerId == userId.Value, cancellationToken);

            var bankSummary = bankDb != null
                ? $"{bankDb.BankName} - {bankDb.AccountType} (terminada en {bankDb.AccountNumber[^Math.Min(4, bankDb.AccountNumber.Length)..].Trim()})"
                : "Bancolombia - Cuenta comercial predeterminada";

            var payoutDomain = new SellerPayout(
                userId.Value,
                request.Amount,
                bankSummary,
                currency: request.Currency ?? "COP");

            var payoutDb = SellerPayoutMapper.ToDbModel(payoutDomain);
            await _dbContext.SellerPayouts.AddAsync(payoutDb, cancellationToken);
            await _dbContext.SaveChangesAsync(cancellationToken);

            return Ok(new SellerPayoutDto(
                payoutDb.Id,
                payoutDb.Amount,
                payoutDb.Currency,
                payoutDb.Status,
                payoutDb.BankSummary,
                payoutDb.RequestedAt,
                payoutDb.ProcessedAt,
                payoutDb.ReferenceNumber));
        }

        /// <summary>
        /// Guarda o actualiza la cuenta bancaria de dispersión del vendedor.
        /// </summary>
        /// <param name="request">Datos bancarios nacionales.</param>
        /// <param name="cancellationToken">Token de cancelación.</param>
        /// <response code="200">Cuenta bancaria guardada y vinculada exitosamente.</response>
        /// <response code="400">Datos bancarios incompletos o inválidos.</response>
        /// <response code="401">No autenticado o token inválido.</response>
        /// <response code="403">No autorizado: requiere rol Vendedor.</response>
        [HttpPut("bank-account")]
        [Authorize(Policy = AuthorizationPolicies.ProductManagement)]
        [ProducesResponseType(typeof(SellerBankAccountDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> SaveBankAccount([FromBody] SaveSellerBankAccountRequest request, CancellationToken cancellationToken)
        {
            var userId = _currentUser.UserId;
            if (userId is null)
            {
                return Unauthorized(new ProblemDetails { Detail = "Missing or invalid bearer token." });
            }

            if (string.IsNullOrWhiteSpace(request.BankName) ||
                string.IsNullOrWhiteSpace(request.AccountType) ||
                string.IsNullOrWhiteSpace(request.AccountNumber) ||
                string.IsNullOrWhiteSpace(request.AccountHolderName) ||
                string.IsNullOrWhiteSpace(request.DocumentNumber))
            {
                return BadRequest(new ProblemDetails { Detail = "Todos los campos de la cuenta bancaria son obligatorios." });
            }

            var bankDb = await _dbContext.SellerBankAccounts
                .FirstOrDefaultAsync(b => b.SellerId == userId.Value, cancellationToken);

            if (bankDb != null)
            {
                bankDb.BankName = request.BankName.Trim();
                bankDb.AccountType = request.AccountType.Trim();
                bankDb.AccountNumber = request.AccountNumber.Trim();
                bankDb.AccountHolderName = request.AccountHolderName.Trim();
                bankDb.DocumentNumber = request.DocumentNumber.Trim();
                bankDb.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                var domainAccount = new SellerBankAccount(
                    userId.Value,
                    request.BankName,
                    request.AccountType,
                    request.AccountNumber,
                    request.AccountHolderName,
                    request.DocumentNumber);

                bankDb = SellerBankAccountMapper.ToDbModel(domainAccount);
                await _dbContext.SellerBankAccounts.AddAsync(bankDb, cancellationToken);
            }

            await _dbContext.SaveChangesAsync(cancellationToken);

            return Ok(new SellerBankAccountDto(
                bankDb.Id,
                bankDb.BankName,
                bankDb.AccountType,
                bankDb.AccountNumber,
                bankDb.AccountHolderName,
                bankDb.DocumentNumber,
                bankDb.UpdatedAt));
        }
    }
}
