using System;
using System.Threading;
using System.Threading.Tasks;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Application.Users.Queries;
using Zentric.Domain.Buyers;
using Zentric.Domain.Buyers.Ports;
using Zentric.Domain.Buyers.ValueObjects;
using Zentric.Domain.Users.Ports;
using Zentric.Domain.Users.ValueObjects;

namespace Zentric.Application.Users.Commands
{
    public record UpdateUserProfileRequest(
        string FullName,
        string? Phone = null,
        AddressDto? Address = null,
        string? Street = null,
        string? City = null,
        string? State = null,
        string? ZipCode = null,
        string? Country = null)
    {
        public AddressDto? ResolveAddress()
        {
            if (Address != null)
            {
                return Address;
            }

            if (!string.IsNullOrWhiteSpace(Street))
            {
                return new AddressDto(
                    Street,
                    City ?? "",
                    State ?? "",
                    ZipCode ?? "",
                    string.IsNullOrWhiteSpace(Country) ? "Colombia" : Country);
            }

            return null;
        }
    }

    public record UpdateUserProfileCommand(
        Guid UserId,
        string FullName,
        string? Phone,
        AddressDto? Address) : IRequest<Result<UserProfileDto>>;

    public class UpdateUserProfileCommandHandler : IRequestHandler<UpdateUserProfileCommand, Result<UserProfileDto>>
    {
        private readonly IUserRepository _userRepository;
        private readonly IBuyerRepository _buyerRepository;
        private readonly IUnitOfWork _unitOfWork;

        public UpdateUserProfileCommandHandler(
            IUserRepository userRepository,
            IBuyerRepository buyerRepository,
            IUnitOfWork unitOfWork)
        {
            _userRepository = userRepository;
            _buyerRepository = buyerRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<Result<UserProfileDto>> Handle(
            UpdateUserProfileCommand request, CancellationToken cancellationToken)
        {
            var user = await _userRepository.GetByIdAsync(request.UserId);
            if (user == null)
            {
                return Result<UserProfileDto>.NotFound("User not found.");
            }

            user.UpdateFullName(new FullName(request.FullName));
            await _userRepository.UpdateAsync(user);

            var buyer = await _buyerRepository.GetByIdAsync(request.UserId, cancellationToken);

            if (request.Address != null)
            {
                var domainAddress = new Address(
                    request.Address.Street,
                    request.Address.City,
                    request.Address.State,
                    request.Address.ZipCode,
                    request.Address.Country);

                if (buyer != null)
                {
                    buyer.UpdateMainAddress(domainAddress);
                    buyer.UpdatePhone(request.Phone);
                    await _buyerRepository.UpdateAsync(buyer, cancellationToken);
                }
                else
                {
                    buyer = new Buyer(request.UserId, domainAddress, request.Phone);
                    await _buyerRepository.AddAsync(buyer, cancellationToken);
                }
            }
            else if (buyer != null)
            {
                buyer.UpdatePhone(request.Phone);
                await _buyerRepository.UpdateAsync(buyer, cancellationToken);
            }

            await _unitOfWork.SaveChangesAsync(cancellationToken);

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
