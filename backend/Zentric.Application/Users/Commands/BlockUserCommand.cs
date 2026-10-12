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
    /// Cierra el acceso de un usuario a la plataforma (INV-05).
    /// </summary>
    /// <param name="Id">Identificador del usuario que se bloquea.</param>
    public record BlockUserCommand(Guid Id) : IRequest<Result>;

    public class BlockUserCommandHandler : IRequestHandler<BlockUserCommand, Result>
    {
        private readonly IUserRepository _userRepository;
        private readonly IUnitOfWork _unitOfWork;

        public BlockUserCommandHandler(IUserRepository userRepository, IUnitOfWork unitOfWork)
        {
            _userRepository = userRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<Result> Handle(BlockUserCommand request, CancellationToken cancellationToken)
        {
            var user = await _userRepository.GetByIdAsync(request.Id);
            if (user is null)
            {
                return Result.NotFound("User not found.");
            }

            try
            {
                user.Block();
            }
            // INV-05: las guardas del agregado (ya bloqueado, usuario borrado) son
            // reglas de negocio predecibles, no fallos de infraestructura. Se traducen
            // a Result para que salgan como 400 y no lleguen al middleware.
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
