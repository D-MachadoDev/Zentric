using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;
using Zentric.Api.Controllers;
using Zentric.Api.Security;
using Zentric.Application.Catalog.Commands;
using Zentric.Application.Catalog.Queries;
using Zentric.Application.Common.Messaging;
using Zentric.Application.Common.Models;
using Zentric.Application.Common.Ports;
using Zentric.Application.Orders.Queries;
using Zentric.Application.Users.Commands;
using Zentric.Application.Users.Queries;
using Zentric.Application.Users.Validators;
using Zentric.Domain.Buyers;
using Zentric.Domain.Buyers.Ports;
using Zentric.Domain.Buyers.ValueObjects;
using Zentric.Domain.Orders;
using Zentric.Domain.Orders.Entities;
using Zentric.Domain.Orders.Enums;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Products;
using Zentric.Domain.Products.Enums;
using Zentric.Domain.Products.Ports;
using Zentric.Domain.Products.ValueObjects;
using Zentric.Domain.Users;
using Zentric.Domain.Users.Enums;
using Zentric.Domain.Users.Ports;
using Zentric.Domain.Users.ValueObjects;

namespace Zentric.Tests.Application
{
    public class SddSynchronizationSlicesTests
    {
        // ====================================================================
        // SLICE 1 & SLICE 2: ORDER SNAPSHOT ENRICHMENT & EXPIRATION SYNC
        // ====================================================================

        [Fact]
        public async Task GetOrderByIdQueryHandler_EnrichesOrderItem_WithProductAndVendorMetadata_AndExpiresAt()
        {
            var buyerId = Guid.NewGuid();
            var vendorId = Guid.NewGuid();
            var order = new CustomerOrder(buyerId);
            var variantId = Guid.NewGuid();

            order.AddItem(variantId, vendorId, 2, new Money(50000m, "COP"));

            var product = new Product(
                "ThinkPad X1 Carbon",
                "Laptop empresarial ultra liviana",
                new Money(50000m, "COP"),
                vendorId,
                ProductType.Physical,
                new (string Sku, IEnumerable<VariantAttribute> Attributes)[] { ("TP-X1-001", new[] { new VariantAttribute("RAM", "32GB") }) },
                "https://cdn.zentric.local/x1.jpg",
                "computacion"
            );
            // Replace the generated variantId on product's variant with our variantId
            typeof(ProductVariant).GetProperty("Id")?.SetValue(product.Variants.First(), variantId);

            var vendor = new User("DOC-SELLER-001", new FullName("Valeria", "Mendoza"), new Email("seller@zentric.local"), "hashed_secret", UserRole.Seller);
            typeof(User).GetProperty("Id")?.SetValue(vendor, vendorId);

            var orderRepoMock = new Mock<ICustomerOrderRepository>();
            orderRepoMock.Setup(r => r.GetByIdAsync(order.Id, It.IsAny<CancellationToken>()))
                .ReturnsAsync(order);

            var productRepoMock = new Mock<IProductRepository>();
            productRepoMock.Setup(r => r.GetByVariantIdAsync(variantId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(product);

            var userRepoMock = new Mock<IUserRepository>();
            userRepoMock.Setup(r => r.GetByIdAsync(vendorId))
                .ReturnsAsync(vendor);

            var handler = new GetOrderByIdQueryHandler(orderRepoMock.Object, productRepoMock.Object, userRepoMock.Object);

            var result = await handler.Handle(new GetOrderByIdQuery(order.Id), CancellationToken.None);

            Assert.True(result.IsSuccess);
            var dto = result.Value;
            Assert.NotNull(dto);
            Assert.Equal(order.Id, dto.Id);
            Assert.Equal(order.CreatedAt.AddMinutes(15), dto.ExpiresAt);
            Assert.Single(dto.Items);

            var item = dto.Items[0];
            Assert.Equal("ThinkPad X1 Carbon", item.ProductName);
            Assert.Equal("TP-X1-001", item.Sku);
            Assert.Equal("https://cdn.zentric.local/x1.jpg", item.ImageUrl);
            Assert.Equal("Valeria Mendoza", item.VendorName);
        }

        [Fact]
        public async Task GetOrderByIdForBuyerQueryHandler_EnrichesOrderItem_AndComputesExpiresAt()
        {
            var buyerId = Guid.NewGuid();
            var vendorId = Guid.NewGuid();
            var order = new CustomerOrder(buyerId);
            var variantId = Guid.NewGuid();

            order.AddItem(variantId, vendorId, 1, new Money(100000m, "COP"));

            var product = new Product(
                "Monitor Dell 4K",
                "Monitor profesional",
                new Money(100000m, "COP"),
                vendorId,
                ProductType.Physical,
                new (string Sku, IEnumerable<VariantAttribute> Attributes)[] { ("DELL-4K-01", new[] { new VariantAttribute("Panel", "IPS") }) },
                "https://cdn.zentric.local/dell.jpg",
                "audio"
            );
            typeof(ProductVariant).GetProperty("Id")?.SetValue(product.Variants.First(), variantId);

            var vendor = new User("DOC-SELLER-001", new FullName("Valeria", "Mendoza"), new Email("seller@zentric.local"), "hashed_secret", UserRole.Seller);
            typeof(User).GetProperty("Id")?.SetValue(vendor, vendorId);

            var orderRepoMock = new Mock<ICustomerOrderRepository>();
            orderRepoMock.Setup(r => r.GetByIdForBuyerAsync(order.Id, buyerId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(order);

            var productRepoMock = new Mock<IProductRepository>();
            productRepoMock.Setup(r => r.GetByVariantIdAsync(variantId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(product);

            var userRepoMock = new Mock<IUserRepository>();
            userRepoMock.Setup(r => r.GetByIdAsync(vendorId))
                .ReturnsAsync(vendor);

            var handler = new GetOrderByIdForBuyerQueryHandler(orderRepoMock.Object, productRepoMock.Object, userRepoMock.Object);

            var result = await handler.Handle(new GetOrderByIdForBuyerQuery(order.Id, buyerId), CancellationToken.None);

            Assert.True(result.IsSuccess);
            var dto = result.Value;
            Assert.Equal(order.CreatedAt.AddMinutes(15), dto.ExpiresAt);
            Assert.Equal("Monitor Dell 4K", dto.Items[0].ProductName);
            Assert.Equal("DELL-4K-01", dto.Items[0].Sku);
            Assert.Equal("https://cdn.zentric.local/dell.jpg", dto.Items[0].ImageUrl);
            Assert.Equal("Valeria Mendoza", dto.Items[0].VendorName);
        }

        [Fact]
        public async Task GetOrdersQueryHandler_EnrichesListItems_WithExpiresAtAndMetadata()
        {
            var buyerId = Guid.NewGuid();
            var vendorId = Guid.NewGuid();
            var order = new CustomerOrder(buyerId);
            var variantId = Guid.NewGuid();

            order.AddItem(variantId, vendorId, 3, new Money(25000m, "COP"));

            var product = new Product(
                "Mouse Logitech MX Master",
                "Mouse inalámbrico ergonómico",
                new Money(25000m, "COP"),
                vendorId,
                ProductType.Physical,
                new (string Sku, IEnumerable<VariantAttribute> Attributes)[] { ("MX-MST-01", new[] { new VariantAttribute("Color", "Graphite") }) },
                "https://cdn.zentric.local/mouse.jpg",
                "perifericos"
            );
            typeof(ProductVariant).GetProperty("Id")?.SetValue(product.Variants.First(), variantId);

            var vendor = new User("DOC-SELLER-001", new FullName("Valeria", "Mendoza"), new Email("seller@zentric.local"), "hashed_secret", UserRole.Seller);
            typeof(User).GetProperty("Id")?.SetValue(vendor, vendorId);

            var orderRepoMock = new Mock<ICustomerOrderRepository>();
            orderRepoMock.Setup(r => r.GetListAsync(buyerId, null, null, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<CustomerOrder> { order });

            var productRepoMock = new Mock<IProductRepository>();
            productRepoMock.Setup(r => r.GetByVariantIdAsync(variantId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(product);

            var userRepoMock = new Mock<IUserRepository>();
            userRepoMock.Setup(r => r.GetByIdAsync(vendorId))
                .ReturnsAsync(vendor);

            var handler = new GetOrdersQueryHandler(orderRepoMock.Object, productRepoMock.Object, userRepoMock.Object);

            var result = await handler.Handle(new GetOrdersQuery(buyerId, UserRole.Buyer, null), CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Single(result.Value);
            var listItem = result.Value[0];
            Assert.Equal(order.CreatedAt.AddMinutes(15), listItem.ExpiresAt);
            Assert.Single(listItem.Items);
            Assert.Equal("Mouse Logitech MX Master", listItem.Items[0].ProductName);
            Assert.Equal("MX-MST-01", listItem.Items[0].Sku);
            Assert.Equal("https://cdn.zentric.local/mouse.jpg", listItem.Items[0].ImageUrl);
            Assert.Equal("Valeria Mendoza", listItem.Items[0].VendorName);
        }

        [Fact]
        public async Task OrdersController_GetBuyerOrders_DispatchesCorrectQuery()
        {
            var buyerId = Guid.NewGuid();
            var mediatorMock = new Mock<IMediator>();
            var currentUserMock = new Mock<ICurrentUserAccessor>();
            currentUserMock.Setup(c => c.UserId).Returns(buyerId);

            mediatorMock.Setup(m => m.Send(It.Is<GetOrdersQuery>(q => q.CallerId == buyerId && q.CallerRole == UserRole.Buyer), It.IsAny<CancellationToken>()))
                .ReturnsAsync(Result<IReadOnlyList<OrderListItemDto>>.Success(new List<OrderListItemDto>()));

            var controller = new OrdersController(mediatorMock.Object, currentUserMock.Object);

            var response = await controller.GetBuyerOrders(null);

            var okResult = Assert.IsType<OkObjectResult>(response);
            Assert.NotNull(okResult.Value);
            mediatorMock.Verify(m => m.Send(It.Is<GetOrdersQuery>(q => q.CallerId == buyerId && q.CallerRole == UserRole.Buyer), It.IsAny<CancellationToken>()), Times.Once);
        }

        // ====================================================================
        // SLICE 3: PERSISTENT BUYER PROFILE
        // ====================================================================

        [Fact]
        public void Buyer_SupportsPhoneProperty_AndMutations()
        {
            var userId = Guid.NewGuid();
            var address = new Address("Calle 100 #15-20", "Bogotá", "Cundinamarca", "110111", "Colombia");
            var buyer = new Buyer(userId, address, "+573001234567");

            Assert.Equal("+573001234567", buyer.Phone);
            Assert.Equal("Calle 100 #15-20", buyer.MainAddress.Street);

            buyer.UpdatePhone("+573119876543");
            Assert.Equal("+573119876543", buyer.Phone);
        }

        [Fact]
        public async Task GetUserProfileQueryHandler_ReturnsProfile_WithBuyerAddressAndPhone()
        {
            var userId = Guid.NewGuid();
            var user = new User("DOC-BUYER-001", new FullName("Andrés", "Castillo"), new Email("buyer@zentric.local"), "hashed_password", UserRole.Buyer);
            typeof(User).GetProperty("Id")?.SetValue(user, userId);

            var address = new Address("Cra 7 #72-41", "Bogotá", "Cundinamarca", "110221", "Colombia");
            var buyer = new Buyer(userId, address, "+573105551234");

            var userRepoMock = new Mock<IUserRepository>();
            userRepoMock.Setup(r => r.GetByIdAsync(userId)).ReturnsAsync(user);

            var buyerRepoMock = new Mock<IBuyerRepository>();
            buyerRepoMock.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>())).ReturnsAsync(buyer);

            var handler = new GetUserProfileQueryHandler(userRepoMock.Object, buyerRepoMock.Object);

            var result = await handler.Handle(new GetUserProfileQuery(userId), CancellationToken.None);

            Assert.True(result.IsSuccess);
            var profile = result.Value;
            Assert.Equal(userId, profile.Id);
            Assert.Equal("Andrés Castillo", profile.FullName);
            Assert.Equal("buyer@zentric.local", profile.Email);
            Assert.Equal("DOC-BUYER-001", profile.DocumentNumber);
            Assert.Equal("+573105551234", profile.Phone);
            Assert.NotNull(profile.Address);
            Assert.Equal("Cra 7 #72-41", profile.Address.Street);
            Assert.Equal("Bogotá", profile.Address.City);
            Assert.Equal("Cundinamarca", profile.Address.State);
            Assert.Equal("110221", profile.Address.ZipCode);
            Assert.Equal("Colombia", profile.Address.Country);
            Assert.Equal("Cra 7 #72-41", profile.Street);
        }

        [Fact]
        public async Task UpdateUserProfileCommandHandler_UpdatesUserFullNameAndBuyerAddressPhone()
        {
            var userId = Guid.NewGuid();
            var user = new User("DOC-BUYER-001", new FullName("Andrés", "Castillo"), new Email("buyer@zentric.local"), "hashed_password", UserRole.Buyer);
            typeof(User).GetProperty("Id")?.SetValue(user, userId);

            var initialAddress = new Address("Calle 1 #2-3", "Cali", "Valle", "760001", "Colombia");
            var buyer = new Buyer(userId, initialAddress, "+573000000000");

            var userRepoMock = new Mock<IUserRepository>();
            userRepoMock.Setup(r => r.GetByIdAsync(userId)).ReturnsAsync(user);

            var buyerRepoMock = new Mock<IBuyerRepository>();
            buyerRepoMock.Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>())).ReturnsAsync(buyer);

            var uowMock = new Mock<IUnitOfWork>();
            uowMock.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);

            var handler = new UpdateUserProfileCommandHandler(userRepoMock.Object, buyerRepoMock.Object, uowMock.Object);

            var command = new UpdateUserProfileCommand(
                userId,
                "Andrés Castillo",
                "+573109998877",
                new AddressDto("Avenida El Dorado #68C-61", "Bogotá", "Cundinamarca", "110931", "Colombia")
            );

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Equal("Andrés Castillo", result.Value.FullName);
            Assert.Equal("+573109998877", result.Value.Phone);
            Assert.Equal("Avenida El Dorado #68C-61", result.Value.Address?.Street);
            Assert.Equal("Bogotá", result.Value.Address?.City);

            userRepoMock.Verify(r => r.UpdateAsync(It.Is<User>(u => u.FullName.Value == "Andrés Castillo")), Times.Once);
            buyerRepoMock.Verify(r => r.UpdateAsync(It.Is<Buyer>(b => b.Phone == "+573109998877" && b.MainAddress.Street == "Avenida El Dorado #68C-61"), It.IsAny<CancellationToken>()), Times.Once);
            uowMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public void UpdateUserProfileCommandValidator_RejectsEmptyNameOrInvalidAddress()
        {
            var validator = new UpdateUserProfileCommandValidator();

            var emptyNameCommand = new UpdateUserProfileCommand(Guid.NewGuid(), "", null, null);
            var result1 = validator.Validate(emptyNameCommand);
            Assert.False(result1.IsValid);

            var singleWordNameCommand = new UpdateUserProfileCommand(Guid.NewGuid(), "Andres", null, null);
            var result2 = validator.Validate(singleWordNameCommand);
            Assert.False(result2.IsValid);

            var invalidAddressCommand = new UpdateUserProfileCommand(
                Guid.NewGuid(),
                "Andrés Castillo",
                null,
                new AddressDto("", "Bogotá", "Cundinamarca", "110111", "Colombia"));
            var result3 = validator.Validate(invalidAddressCommand);
            Assert.False(result3.IsValid);

            var validCommand = new UpdateUserProfileCommand(
                Guid.NewGuid(),
                "Andrés Castillo",
                "+573001234567",
                new AddressDto("Calle 100 #15-20", "Bogotá", "Cundinamarca", "110111", "Colombia"));
            var result4 = validator.Validate(validCommand);
            Assert.True(result4.IsValid);
        }

        // ====================================================================
        // SLICE 4: PRODUCT CATEGORIES & FILTERING
        // ====================================================================

        [Fact]
        public void Product_SupportsCategory_InConstructorAndMutations()
        {
            var vendorId = Guid.NewGuid();
            var product = new Product(
                "Teclado Keychron Q1",
                "Teclado mecánico custom",
                new Money(850000m, "COP"),
                vendorId,
                ProductType.Physical,
                new (string Sku, IEnumerable<VariantAttribute> Attributes)[] { ("KC-Q1-01", new[] { new VariantAttribute("Switch", "Red") }) },
                "https://cdn.zentric.local/keychron.jpg",
                "perifericos"
            );

            Assert.Equal("perifericos", product.Category);

            product.UpdateCategory("hardware");
            Assert.Equal("hardware", product.Category);

            product.Update("Teclado Keychron Q1 Pro", "Teclado mecánico wireless", new Money(920000m, "COP"), null, "perifericos");
            Assert.Equal("perifericos", product.Category);
            Assert.Equal("Teclado Keychron Q1 Pro", product.Name);
        }

        [Fact]
        public async Task GetProductsPagedQueryHandler_PassesCategoryToRepository()
        {
            var vendorId = Guid.NewGuid();
            var callerId = Guid.NewGuid();

            var productRepoMock = new Mock<IProductRepository>();
            productRepoMock.Setup(r => r.GetPagedAsync(
                vendorId,
                It.IsAny<ProductStatus?>(),
                It.IsAny<int>(),
                It.IsAny<int>(),
                "computacion",
                It.IsAny<CancellationToken>()))
                .ReturnsAsync((new List<Product>(), 0));

            var handler = new GetProductsPagedQueryHandler(productRepoMock.Object);

            var result = await handler.Handle(
                new GetProductsPagedQuery(vendorId, callerId, 0, 20, "computacion"),
                CancellationToken.None);

            Assert.True(result.IsSuccess);
            productRepoMock.Verify(r => r.GetPagedAsync(
                vendorId,
                It.IsAny<ProductStatus?>(),
                0,
                20,
                "computacion",
                It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task CreateProductCommandHandler_PersistsProductWithCategory()
        {
            var vendorId = Guid.NewGuid();
            var repoMock = new Mock<IProductRepository>();
            var uowMock = new Mock<IUnitOfWork>();

            Product? savedProduct = null;
            repoMock.Setup(r => r.AddAsync(It.IsAny<Product>(), It.IsAny<CancellationToken>()))
                .Callback<Product, CancellationToken>((p, ct) => savedProduct = p)
                .Returns(Task.CompletedTask);

            uowMock.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);

            var handler = new CreateProductCommandHandler(repoMock.Object, uowMock.Object);

            var command = new CreateProductCommand(
                "MacBook Pro 16",
                "M3 Max 36GB RAM",
                14200000m,
                "COP",
                vendorId,
                ProductType.Physical,
                new List<CreateProductVariantDto>
                {
                    new("MBP-16-001", new List<VariantAttributeDto> { new("Color", "Space Black") })
                },
                "https://cdn.zentric.local/mbp.jpg",
                "computacion"
            );

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.NotNull(savedProduct);
            Assert.Equal("computacion", savedProduct.Category);
            Assert.Equal("MacBook Pro 16", savedProduct.Name);
            uowMock.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }
    }
}
