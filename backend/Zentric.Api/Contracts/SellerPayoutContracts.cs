using System;

namespace Zentric.Api.Contracts
{
    public record SaveSellerBankAccountRequest(
        string BankName,
        string AccountType,
        string AccountNumber,
        string AccountHolderName,
        string DocumentNumber);

    public record SellerBankAccountDto(
        Guid Id,
        string BankName,
        string AccountType,
        string AccountNumber,
        string AccountHolderName,
        string DocumentNumber,
        DateTime UpdatedAt);

    public record RequestPayoutRequest(
        decimal Amount,
        string? Currency = "COP");

    public record SellerPayoutDto(
        Guid Id,
        decimal Amount,
        string Currency,
        string Status,
        string BankSummary,
        DateTime RequestedAt,
        DateTime? ProcessedAt,
        string ReferenceNumber);

    public record SellerPayoutSummaryDto(
        decimal AvailableBalance,
        decimal PendingBalance,
        decimal TotalPaidOut,
        string Currency,
        SellerBankAccountDto? BankAccount)
    {
        public decimal AvailableCredit => AvailableBalance;
        public decimal TotalSettled => TotalPaidOut;
        public decimal PendingOrdersCredit => PendingBalance;
    }
}
