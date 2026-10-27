using System;
using System.Collections.Generic;
using Xunit;
using Zentric.Domain.Inventories;

namespace Zentric.Tests.Domain.Inventories
{
    /// <summary>
    /// Adversarial stress tests, boundary permutations, and invariant verification
    /// for the Inventory aggregate and its deletion lifecycle.
    /// Authored by challenger_m1_1.
    /// </summary>
    public sealed class InventoryAdversarialStressTests
    {
        private static readonly Guid TestVariantId = Guid.NewGuid();
        private static readonly Guid TestWarehouseId = Guid.NewGuid();

        #region 1. Constructor Guard Validations (Negative & Boundary Values)

        [Theory]
        [InlineData(-1)]
        [InlineData(-5)]
        [InlineData(-100)]
        [InlineData(int.MinValue)]
        public void Constructor_NegativeAvailableQuantity_ThrowsArgumentOutOfRangeException(int negativeAvailable)
        {
            var ex = Assert.Throws<ArgumentOutOfRangeException>(() =>
                new Inventory(TestVariantId, TestWarehouseId, negativeAvailable, 0, 0, 0));

            Assert.Equal("availableQuantity", ex.ParamName);
        }

        [Theory]
        [InlineData(-1)]
        [InlineData(-5)]
        [InlineData(-100)]
        [InlineData(int.MinValue)]
        public void Constructor_NegativeReservedQuantity_ThrowsArgumentOutOfRangeException(int negativeReserved)
        {
            var ex = Assert.Throws<ArgumentOutOfRangeException>(() =>
                new Inventory(TestVariantId, TestWarehouseId, 0, negativeReserved, 0, 0));

            Assert.Equal("reservedQuantity", ex.ParamName);
        }

        [Theory]
        [InlineData(-1)]
        [InlineData(-5)]
        [InlineData(-100)]
        [InlineData(int.MinValue)]
        public void Constructor_NegativeDamagedQuantity_ThrowsArgumentOutOfRangeException(int negativeDamaged)
        {
            var ex = Assert.Throws<ArgumentOutOfRangeException>(() =>
                new Inventory(TestVariantId, TestWarehouseId, 0, 0, negativeDamaged, 0));

            Assert.Equal("damagedQuantity", ex.ParamName);
        }

        [Theory]
        [InlineData(-1)]
        [InlineData(-5)]
        [InlineData(-100)]
        [InlineData(int.MinValue)]
        public void Constructor_NegativeUsedQuantity_ThrowsArgumentOutOfRangeException(int negativeUsed)
        {
            var ex = Assert.Throws<ArgumentOutOfRangeException>(() =>
                new Inventory(TestVariantId, TestWarehouseId, 0, 0, 0, negativeUsed));

            Assert.Equal("usedQuantity", ex.ParamName);
        }

        [Fact]
        public void Constructor_AllNegativeQuantities_ThrowsOnFirstViolation()
        {
            var ex = Assert.Throws<ArgumentOutOfRangeException>(() =>
                new Inventory(TestVariantId, TestWarehouseId, -1, -2, -3, -4));

            Assert.Equal("availableQuantity", ex.ParamName);
        }

        [Fact]
        public void Constructor_EmptyGuids_ThrowsArgumentException()
        {
            var ex1 = Assert.Throws<ArgumentException>(() =>
                new Inventory(Guid.Empty, TestWarehouseId, 0, 0, 0, 0));
            Assert.Equal("variantId", ex1.ParamName);

            var ex2 = Assert.Throws<ArgumentException>(() =>
                new Inventory(TestVariantId, Guid.Empty, 0, 0, 0, 0));
            Assert.Equal("warehouseId", ex2.ParamName);
        }

        [Fact]
        public void Constructor_BoundaryValues_MaxIntQuantities_Succeeds()
        {
            var inv = new Inventory(TestVariantId, TestWarehouseId, int.MaxValue, 0, 0, 0);
            Assert.Equal(int.MaxValue, inv.AvailableQuantity);
            Assert.Equal(0, inv.ReservedQuantity);
            Assert.Equal(0, inv.DamagedQuantity);
            Assert.Equal(0, inv.UsedQuantity);
            Assert.False(inv.IsDeleted);
        }

        #endregion

        #region 2. Exhaustive Permutation Matrix for MarkAsDeleted()

        [Fact]
        public void MarkAsDeleted_ExhaustiveCombinatorialGrid_EnforcesZeroPhysicalStockInvariant()
        {
            // Grid of test values across all 4 dimensions: Available, Reserved, Damaged, Used
            int[] testValues = [0, 1, 5, 100, int.MaxValue];

            int totalPermutations = 0;
            int successfulDeletions = 0;
            int rejectedDeletions = 0;

            foreach (var available in testValues)
            {
                foreach (var reserved in testValues)
                {
                    foreach (var damaged in testValues)
                    {
                        foreach (var used in testValues)
                        {
                            totalPermutations++;
                            var inv = new Inventory(TestVariantId, TestWarehouseId, available, reserved, damaged, used);

                            bool hasPhysicalStock = available > 0 || reserved > 0 || damaged > 0 || used > 0;

                            if (hasPhysicalStock)
                            {
                                var ex = Assert.Throws<InvalidOperationException>(() => inv.MarkAsDeleted());
                                Assert.Contains("existencias físicas", ex.Message);
                                Assert.False(inv.IsDeleted, $"Inventory must NOT be marked deleted when stock exists ({available},{reserved},{damaged},{used})");
                                Assert.Null(inv.DeletedAt);
                                rejectedDeletions++;
                            }
                            else
                            {
                                inv.MarkAsDeleted();
                                Assert.True(inv.IsDeleted, "Inventory with zero stock must be marked deleted.");
                                Assert.NotNull(inv.DeletedAt);
                                Assert.Equal(inv.DeletedAt.Value, inv.UpdatedAt);
                                successfulDeletions++;
                            }
                        }
                    }
                }
            }

            // Assert exact counts: 5^4 = 625 total permutations
            Assert.Equal(625, totalPermutations);
            Assert.Equal(1, successfulDeletions); // Only (0,0,0,0) succeeds
            Assert.Equal(624, rejectedDeletions); // All other 624 cases must be rejected
        }

        [Fact]
        public void MarkAsDeleted_SecondCall_ThrowsAlreadyDeletedException()
        {
            var inv = new Inventory(TestVariantId, TestWarehouseId, 0, 0, 0, 0);
            inv.MarkAsDeleted();
            Assert.True(inv.IsDeleted);

            var ex = Assert.Throws<InvalidOperationException>(() => inv.MarkAsDeleted());
            Assert.Contains("already deleted", ex.Message, StringComparison.OrdinalIgnoreCase);
        }

        #endregion

        #region 3. Randomized Fuzzing Stress Harness

        [Fact]
        public void MarkAsDeleted_RandomizedFuzzing_1000Iterations_InvariantHolds()
        {
            var rng = new Random(42); // Deterministic seed for reproducible testing

            for (int i = 0; i < 1000; i++)
            {
                // Generate random quantities between 0 and 1,000,000 with occasional zero bias
                int available = rng.Next(0, 5) == 0 ? 0 : rng.Next(1, 100000);
                int reserved = rng.Next(0, 5) == 0 ? 0 : rng.Next(1, 100000);
                int damaged = rng.Next(0, 5) == 0 ? 0 : rng.Next(1, 100000);
                int used = rng.Next(0, 5) == 0 ? 0 : rng.Next(1, 100000);

                var inv = new Inventory(TestVariantId, TestWarehouseId, available, reserved, damaged, used);

                bool expectedSuccess = (available == 0 && reserved == 0 && damaged == 0 && used == 0);

                if (expectedSuccess)
                {
                    inv.MarkAsDeleted();
                    Assert.True(inv.IsDeleted);
                }
                else
                {
                    Assert.Throws<InvalidOperationException>(() => inv.MarkAsDeleted());
                    Assert.False(inv.IsDeleted);
                }
            }
        }

        #endregion

        #region 4. Lifecycle State Transitions Leading to Deletion

        [Fact]
        public void Lifecycle_StockTransitionToZero_AllowsDeletionOnlyAfterCompleteDrain()
        {
            // Start with available stock = 10
            var inv = new Inventory(TestVariantId, TestWarehouseId, availableQuantity: 10, reservedQuantity: 0, damagedQuantity: 0, usedQuantity: 0);

            // Attempt deletion with stock present
            Assert.Throws<InvalidOperationException>(() => inv.MarkAsDeleted());

            // Reserve 10 units
            inv.ReserveStock(10);
            Assert.Equal(0, inv.AvailableQuantity);
            Assert.Equal(10, inv.ReservedQuantity);

            // Cannot delete while stock is reserved
            Assert.Throws<InvalidOperationException>(() => inv.MarkAsDeleted());

            // Dispatch 10 units
            inv.DispatchStock(10);
            Assert.Equal(0, inv.AvailableQuantity);
            Assert.Equal(0, inv.ReservedQuantity);

            // Now total physical stock is 0: Deletion MUST succeed
            inv.MarkAsDeleted();
            Assert.True(inv.IsDeleted);
            Assert.NotNull(inv.DeletedAt);
        }

        [Fact]
        public void Lifecycle_PhysicalCountAdjustmentToZero_AllowsDeletion()
        {
            var inv = new Inventory(TestVariantId, TestWarehouseId, availableQuantity: 15, reservedQuantity: 0, damagedQuantity: 0, usedQuantity: 0);

            Assert.Throws<InvalidOperationException>(() => inv.MarkAsDeleted());

            // Apply physical count adjustment down to 0
            inv.ApplyPhysicalCount(countedQuantity: 0, countedBy: Guid.NewGuid(), reason: "Mermas totales auditadas");
            Assert.Equal(0, inv.AvailableQuantity);

            // Deletion now succeeds
            inv.MarkAsDeleted();
            Assert.True(inv.IsDeleted);
        }

        [Fact]
        public void Lifecycle_ReturnToUsedStock_PreventsDeletion()
        {
            var inv = new Inventory(TestVariantId, TestWarehouseId, availableQuantity: 0, reservedQuantity: 0, damagedQuantity: 0, usedQuantity: 0);

            // Return 1 unit of used stock
            inv.ReturnToUsedStock(1);
            Assert.Equal(1, inv.UsedQuantity);

            // Deletion must be rejected
            var ex = Assert.Throws<InvalidOperationException>(() => inv.MarkAsDeleted());
            Assert.Contains("existencias físicas", ex.Message);
            Assert.False(inv.IsDeleted);
        }

        [Fact]
        public void Lifecycle_MarkAsDamaged_PreventsDeletion()
        {
            var inv = new Inventory(TestVariantId, TestWarehouseId, availableQuantity: 5, reservedQuantity: 0, damagedQuantity: 0, usedQuantity: 0);

            inv.MarkAsDamaged(5);
            Assert.Equal(0, inv.AvailableQuantity);
            Assert.Equal(5, inv.DamagedQuantity);

            // Deletion must be rejected
            var ex = Assert.Throws<InvalidOperationException>(() => inv.MarkAsDeleted());
            Assert.Contains("existencias físicas", ex.Message);
            Assert.False(inv.IsDeleted);
        }

        #endregion
    }
}
