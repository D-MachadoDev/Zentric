using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Domain.Users;
using Zentric.Domain.Users.Enums;
using Zentric.Domain.Users.Ports;
using Zentric.Domain.Users.ValueObjects;

namespace Zentric.Application.Users.Commands
{
    public record CreateUserCommand(
        string IdentityDocument,
        string FullName,
        string Email,
        string Password,
        UserRole Role
    ) : IRequest<Result<Guid>>;

    public class CreateUserCommandHandler : IRequestHandler<CreateUserCommand, Result<Guid>>
    {
        private readonly IUserRepository _userRepository;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IPasswordHasher _passwordHasher;

        public CreateUserCommandHandler(
            IUserRepository userRepository,
            IUnitOfWork unitOfWork,
            IPasswordHasher passwordHasher)
        {
            _userRepository = userRepository;
            _unitOfWork = unitOfWork;
            _passwordHasher = passwordHasher;
        }

        public async Task<Result<Guid>> Handle(CreateUserCommand request, CancellationToken cancellationToken)
        {
            try
            {
                var emailVo = new Email(request.Email);

                var isEmailUnique = await _userRepository.IsEmailUniqueAsync(emailVo, cancellationToken);
                if (!isEmailUnique)
                {
                    return Result<Guid>.Failure("A user with this email already exists.");
                }

                var isDocUnique = await _userRepository.IsIdentityDocumentUniqueAsync(request.IdentityDocument, cancellationToken);
                if (!isDocUnique)
                {
                    return Result<Guid>.Failure("A user with this identity document already exists.");
                }

                var fullName = new FullName(request.FullName);

                var user = new User(
                    request.IdentityDocument,
                    fullName,
                    emailVo,
                    _passwordHasher.Hash(request.Password),
                    request.Role
                );

                await _userRepository.AddAsync(user);
                await _unitOfWork.SaveChangesAsync(cancellationToken);

                return Result<Guid>.Success(user.Id);
            }
            catch (Exception ex) when (ex is ArgumentException || ex is InvalidOperationException)
            {
                return Result<Guid>.Failure(ex.Message);
            }
        }
    }
}
