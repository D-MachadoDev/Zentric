using MediatR;
using Zentric.Application.Common.Models;
using Zentric.Domain.Users;
using Zentric.Domain.Users.Enums;
using Zentric.Domain.Users.Ports;

namespace Zentric.Application.Users.Queries
{
    public record UserDto(Guid Id, string Name, string Email, string Role, string IdentityDocument, bool IsActive, DateTime CreatedAt);

    public record GetUsersQuery(UserRole? Role = null) : IRequest<Result<IReadOnlyList<UserDto>>>;

    public class GetUsersQueryHandler : IRequestHandler<GetUsersQuery, Result<IReadOnlyList<UserDto>>>
    {
        private readonly IUserRepository _userRepository;

        public GetUsersQueryHandler(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        public async Task<Result<IReadOnlyList<UserDto>>> Handle(GetUsersQuery request, CancellationToken cancellationToken)
        {
            var users = await _userRepository.GetAllAsync(request.Role, cancellationToken);
            var dtos = users.Select(u => new UserDto(
                u.Id,
                u.FullName.Value,
                u.Email.Value,
                u.Role.ToString(),
                u.IdentityDocument,
                u.Status == UserStatus.Active,
                u.CreatedAt
            )).ToList();

            return Result<IReadOnlyList<UserDto>>.Success(dtos);
        }
    }

    public record GetUserByIdQuery(Guid Id) : IRequest<Result<UserDto>>;

    public class GetUserByIdQueryHandler : IRequestHandler<GetUserByIdQuery, Result<UserDto>>
    {
        private readonly IUserRepository _userRepository;

        public GetUserByIdQueryHandler(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        public async Task<Result<UserDto>> Handle(GetUserByIdQuery request, CancellationToken cancellationToken)
        {
            var user = await _userRepository.GetByIdAsync(request.Id);
            if (user == null)
            {
                return Result<UserDto>.Failure("User not found.");
            }

            var dto = new UserDto(
                user.Id,
                user.FullName.Value,
                user.Email.Value,
                user.Role.ToString(),
                user.IdentityDocument,
                user.Status == UserStatus.Active,
                user.CreatedAt
            );

            return Result<UserDto>.Success(dto);
        }
    }
}
