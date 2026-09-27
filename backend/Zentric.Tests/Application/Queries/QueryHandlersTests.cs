using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;
using Zentric.Application.Billing.Queries;
using Zentric.Application.Catalog.Queries;
using Zentric.Application.Inventories.Queries;
using Zentric.Application.Orders.Queries;
using Zentric.Application.Users.Queries;
using Zentric.Application.Warehouses.Queries;
using Zentric.Domain.Billing;
using Zentric.Domain.Billing.Ports;
using Zentric.Domain.Inventories;
using Zentric.Domain.Inventories.Ports;
using Zentric.Domain.Orders;
using Zentric.Domain.Orders.Ports;
using Zentric.Domain.Products;
using Zentric.Domain.Products.Enums;
using Zentric.Domain.Products.Ports;
using Zentric.Domain.Products.ValueObjects;
using Zentric.Domain.Users;
using Zentric.Domain.Users.Enums;
using Zentric.Domain.Users.Ports;
using Zentric.Domain.Users.ValueObjects;
using Zentric.Domain.Warehouses;
using Zentric.Domain.Warehouses.Enum;
using Zentric.Domain.Warehouses.Ports;

namespace Zentric.Tests.Application.Queries
{
    public class QueryHandlersTests
    {
        [Fact]
        public async Task GetUsersQuery_ReturnsUsers()
        {
            var user = new User("123456", new FullName("Carlos", "Gomez"), new Email("carlos@zentric.com"), "hash123", UserRole.Seller);
            var repo = new FakeUserQueryRepo(new List<User> { user });
            var handler = new GetUsersQueryHandler(repo);

            var result = await handler.Handle(new GetUsersQuery(UserRole.Seller), CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Single(result.Value);
            Assert.Equal("123456", result.Value[0].IdentityDocument);
        }

        [Fact]
        public async Task GetUserByIdQuery_WhenFound_ReturnsUser()
        {
            var user = new User("123456", new FullName("Carlos", "Gomez"), new Email("carlos@zentric.com"), "hash123", UserRole.Buyer);
            var repo = new FakeUserQueryRepo(new List<User> { user });
            var handler = new GetUserByIdQueryHandler(repo);

            var result = await handler.Handle(new GetUserByIdQuery(user.Id), CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Equal(user.Id, result.Value.Id);
        }

        [Fact]
        public async Task GetWarehousesQuery_ReturnsWarehouses()
        {
            var warehouse = new Warehouse("Principal", "Bogota", 500, WarehouseType.Marketplace, null);
            var repo = new FakeWarehouseQueryRepo(new List<Warehouse> { warehouse });
            var handler = new GetWarehousesQueryHandler(repo);

            var result = await handler.Handle(new GetWarehousesQuery(), CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Single(result.Value);
            Assert.Equal("Principal", result.Value[0].Name);
        }

        [Fact]
        public async Task GetInventoryByVariantQuery_ReturnsStock()
        {
            var variantId = Guid.NewGuid();
            var warehouseId = Guid.NewGuid();
            var inv = new Inventory(variantId, warehouseId, availableQuantity: 50, reservedQuantity: 10, damagedQuantity: 2, usedQuantity: 5);
            var repo = new FakeInventoryQueryRepo(new List<Inventory> { inv });
            var handler = new GetInventoryByVariantQueryHandler(repo);

            var result = await handler.Handle(new GetInventoryByVariantQuery(variantId), CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Single(result.Value);
            Assert.Equal(50, result.Value[0].AvailableQuantity);
        }
    }

    internal class FakeUserQueryRepo : IUserRepository
    {
        private readonly List<User> _users;
        public FakeUserQueryRepo(List<User> users) => _users = users;

        public Task<User?> GetByIdAsync(Guid id) => Task.FromResult(_users.FirstOrDefault(u => u.Id == id));
        public Task<User?> GetByEmailAsync(Email email) => Task.FromResult(_users.FirstOrDefault(u => u.Email.Equals(email)));
        public Task<IReadOnlyList<User>> GetAllAsync(UserRole? role = null, CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<User>>(role.HasValue ? _users.Where(u => u.Role == role.Value).ToList() : _users.ToList());
        public Task<bool> IsEmailUniqueAsync(Email email, CancellationToken cancellationToken = default) => Task.FromResult(true);
        public Task<bool> IsIdentityDocumentUniqueAsync(string identityDocument, CancellationToken cancellationToken = default) => Task.FromResult(true);
        public Task AddAsync(User user) => Task.CompletedTask;
        public Task UpdateAsync(User user) => Task.CompletedTask;
    }

    internal class FakeWarehouseQueryRepo : IWarehouseRepository
    {
        private readonly List<Warehouse> _warehouses;
        public FakeWarehouseQueryRepo(List<Warehouse> warehouses) => _warehouses = warehouses;

        public Task<Warehouse?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
            Task.FromResult(_warehouses.FirstOrDefault(w => w.Id == id));
        public Task<IReadOnlyList<Warehouse>> GetAllAsync(Guid? vendorId = null, CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<Warehouse>>(vendorId.HasValue ? _warehouses.Where(w => w.VendorId == vendorId.Value).ToList() : _warehouses.ToList());
        public Task AddAsync(Warehouse warehouse, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task UpdateAsync(Warehouse warehouse, CancellationToken cancellationToken = default) => Task.CompletedTask;
    }

    internal class FakeInventoryQueryRepo : IInventoryRepository
    {
        private readonly List<Inventory> _inventories;
        public FakeInventoryQueryRepo(List<Inventory> inventories) => _inventories = inventories;

        public Task<Inventory?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) => Task.FromResult(_inventories.FirstOrDefault(i => i.Id == id));
        public Task<Inventory?> GetByVariantAndWarehouseAsync(Guid variantId, Guid warehouseId, CancellationToken cancellationToken = default) =>
            Task.FromResult(_inventories.FirstOrDefault(i => i.VariantId == variantId && i.WarehouseId == warehouseId));
        public Task<IEnumerable<Inventory>> GetByVariantIdAsync(Guid variantId, CancellationToken cancellationToken = default) =>
            Task.FromResult<IEnumerable<Inventory>>(_inventories.Where(i => i.VariantId == variantId).ToList());
        public Task<int> GetTotalAvailableStockAsync(Guid variantId, CancellationToken cancellationToken = default) =>
            Task.FromResult(_inventories.Where(i => i.VariantId == variantId).Sum(i => i.AvailableQuantity));
        public Task AddAsync(Inventory inventory, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task UpdateAsync(Inventory inventory, CancellationToken cancellationToken = default) => Task.CompletedTask;
    }
}
