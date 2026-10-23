using System;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Users.Ports;

namespace Zentric.Application.Users.Commands
{
    /// <summary>
    /// Devuelve el acceso a un usuario bloqueado (INV-05).
    /// </summary>
    /// <param name="Id">Identificador del usuario que se reactiva.</param>
    public record ActivateUserCommand(Guid Id) : IRequest<Result>;

    public class ActivateUserCommandHandler : IRequestHandler<ActivateUserCommand, Result>
    {
        private readonly IUserRepository _userRepository;
        private readonly IUnitOfWork _unitOfWork;

        public ActivateUserCommandHandler(IUserRepository userRepository, IUnitOfWork unitOfWork)
        {
            _userRepository = userRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<Result> Handle(ActivateUserCommand request, CancellationToken cancellationToken)
        {
            var user = await _userRepository.GetByIdAsync(request.Id);
            if (user is null)
            {
                return Result.NotFound("User not found.");
            }

            try
            {
                user.Activate();
            }
            // INV-05: la guarda del agregado (ya activo, usuario borrado) es regla de
            // negocio predecible: se traduce a Result para responder 400, no 500.
            catch (InvalidOperationException ex)
            {
                return Result.Failure(ex.Message);
            }

            await _userRepository.UpdateAsync(user);
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            return Result.Success();
        }
    }
}
