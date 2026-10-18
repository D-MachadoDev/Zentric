using System;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Domain.Buyers.Ports;
using Zentric.Domain.Users.Ports;

namespace Zentric.Application.Users.Queries
{
    public record AddressDto(
        string Street,
        string City,
        string State,
        string ZipCode,
        string Country);

    public record UserProfileDto(
        Guid Id,
        string Email,
        string FullName,
        string DocumentNumber,
        string Role,
        string? Phone,
        AddressDto? Address)
    {
        public string? Street => Address?.Street;
        public string? City => Address?.City;
        public string? State => Address?.State;
        public string? ZipCode => Address?.ZipCode;
        public string? Country => Address?.Country;
    }

    public record GetUserProfileQuery(Guid UserId) : IRequest<Result<UserProfileDto>>;

    public class GetUserProfileQueryHandler : IRequestHandler<GetUserProfileQuery, Result<UserProfileDto>>
    {
        private readonly IUserRepository _userRepository;
        private readonly IBuyerRepository _buyerRepository;

        public GetUserProfileQueryHandler(IUserRepository userRepository, IBuyerRepository buyerRepository)
        {
            _userRepository = userRepository;
            _buyerRepository = buyerRepository;
        }

        public async Task<Result<UserProfileDto>> Handle(
            GetUserProfileQuery request, CancellationToken cancellationToken)
        {
            var user = await _userRepository.GetByIdAsync(request.UserId);
            if (user == null)
            {
                return Result<UserProfileDto>.NotFound("User not found.");
            }

            var buyer = await _buyerRepository.GetByIdAsync(request.UserId, cancellationToken);

            var addressDto = buyer?.MainAddress != null
                ? new AddressDto(
                    buyer.MainAddress.Street,
                    buyer.MainAddress.City,
                    buyer.MainAddress.State,
                    buyer.MainAddress.ZipCode,
                    buyer.MainAddress.Country)
                : null;

            var dto = new UserProfileDto(
                user.Id,
                user.Email.Value,
                user.FullName.Value,
                user.IdentityDocument,
                user.Role.ToString(),
                buyer?.Phone,
                addressDto);

            return Result<UserProfileDto>.Success(dto);
        }
    }
}
