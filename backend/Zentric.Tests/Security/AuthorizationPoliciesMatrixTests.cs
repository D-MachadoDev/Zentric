using System;
using System.Collections.Generic;
using System.Linq;
using Xunit;
using Zentric.Api.Security;
using Zentric.Domain.Users.Enums;

namespace Zentric.Tests.Security
{
    /// <summary>
    /// Pruebas exhaustivas de la Matriz Canónica de 21 Políticas de Autorización.
    /// Fuente de Verdad: backendSDD/Presentation/02-authorization.md, sección 2.
    /// Valida roles permitidos, exclusividad de operaciones sensibles y principio de menor privilegio.
    /// </summary>
    public sealed class AuthorizationPoliciesMatrixTests
    {
        private static readonly IReadOnlyDictionary<string, string[]> CanonicalSpecMatrix =
            new Dictionary<string, string[]>
            {
                [AuthorizationPolicies.AnyAuthenticatedUser] = Array.Empty<string>(),
                [AuthorizationPolicies.UserAdministration] = new[] { nameof(UserRole.Administrator) },
                [AuthorizationPolicies.WarehouseManagement] = new[] { nameof(UserRole.Administrator) },
                [AuthorizationPolicies.WarehouseRead] = new[]
                {
                    nameof(UserRole.Administrator),
                    nameof(UserRole.Seller),
                    nameof(UserRole.LogisticsOperator)
                },
                [AuthorizationPolicies.ProductManagement] = new[] { nameof(UserRole.Seller) },
                [AuthorizationPolicies.InventoryManagement] = new[]
                {
                    nameof(UserRole.Seller),
                    nameof(UserRole.LogisticsOperator)
                },
                [AuthorizationPolicies.InventoryRead] = new[]
                {
                    nameof(UserRole.Seller),
                    nameof(UserRole.LogisticsOperator)
                },
                [AuthorizationPolicies.InventoryAdjust] = new[]
                {
                    nameof(UserRole.Administrator),
                    nameof(UserRole.Supervisor)
                },
                [AuthorizationPolicies.Checkout] = new[] { nameof(UserRole.Buyer) },
                [AuthorizationPolicies.OrderRead] = new[]
                {
                    nameof(UserRole.Buyer),
                    nameof(UserRole.Seller),
                    nameof(UserRole.LogisticsOperator),
                    nameof(UserRole.Administrator),
                    nameof(UserRole.Supervisor)
                },
                [AuthorizationPolicies.FulfillmentOperate] = new[]
                {
                    nameof(UserRole.Seller),
                    nameof(UserRole.LogisticsOperator)
                },
                [AuthorizationPolicies.FulfillmentDeliver] = new[] { nameof(UserRole.LogisticsOperator) },
                [AuthorizationPolicies.FulfillmentCancelByQuiebre] = new[]
                {
                    nameof(UserRole.Seller),
                    nameof(UserRole.LogisticsOperator)
                },
                [AuthorizationPolicies.FulfillmentRead] = new[]
                {
                    nameof(UserRole.Buyer),
                    nameof(UserRole.Seller),
                    nameof(UserRole.LogisticsOperator),
                    nameof(UserRole.Administrator),
                    nameof(UserRole.Supervisor)
                },
                [AuthorizationPolicies.ReturnRequest] = new[] { nameof(UserRole.Buyer) },
                [AuthorizationPolicies.ReturnInspect] = new[] { nameof(UserRole.LogisticsOperator) },
                [AuthorizationPolicies.ReturnApprove] = new[] { nameof(UserRole.Seller) },
                [AuthorizationPolicies.ReturnRefund] = new[] { nameof(UserRole.Administrator) },
                [AuthorizationPolicies.ReturnRead] = new[]
                {
                    nameof(UserRole.Buyer),
                    nameof(UserRole.Seller),
                    nameof(UserRole.LogisticsOperator),
                    nameof(UserRole.Administrator),
                    nameof(UserRole.Supervisor)
                },
                [AuthorizationPolicies.BillingGenerate] = new[] { nameof(UserRole.Administrator) },
                [AuthorizationPolicies.BillingRead] = new[]
                {
                    nameof(UserRole.Buyer),
                    nameof(UserRole.Seller),
                    nameof(UserRole.Administrator),
                    nameof(UserRole.Supervisor)
                }
            };

        [Fact]
        public void Matrix_ContainsExactly21Policies()
        {
            Assert.Equal(21, AuthorizationPolicies.RolesByPolicy.Count);
            Assert.Equal(21, CanonicalSpecMatrix.Count);
        }

        [Fact]
        public void Matrix_MatchesCanonicalSpecificationExactly()
        {
            foreach (var kvp in CanonicalSpecMatrix)
            {
                Assert.True(
                    AuthorizationPolicies.RolesByPolicy.ContainsKey(kvp.Key),
                    $"Falta la política '{kvp.Key}' en RolesByPolicy.");

                var actualRoles = AuthorizationPolicies.RolesByPolicy[kvp.Key];
                var expectedRoles = kvp.Value;

                Assert.Equal(expectedRoles.Length, actualRoles.Count);
                foreach (var expectedRole in expectedRoles)
                {
                    Assert.Contains(expectedRole, actualRoles);
                }
            }
        }

        [Theory]
        [InlineData(AuthorizationPolicies.ReturnRefund, nameof(UserRole.Administrator))]
        [InlineData(AuthorizationPolicies.ReturnApprove, nameof(UserRole.Seller))]
        [InlineData(AuthorizationPolicies.FulfillmentDeliver, nameof(UserRole.LogisticsOperator))]
        [InlineData(AuthorizationPolicies.Checkout, nameof(UserRole.Buyer))]
        [InlineData(AuthorizationPolicies.ReturnRequest, nameof(UserRole.Buyer))]
        [InlineData(AuthorizationPolicies.ProductManagement, nameof(UserRole.Seller))]
        [InlineData(AuthorizationPolicies.BillingGenerate, nameof(UserRole.Administrator))]
        [InlineData(AuthorizationPolicies.UserAdministration, nameof(UserRole.Administrator))]
        [InlineData(AuthorizationPolicies.WarehouseManagement, nameof(UserRole.Administrator))]
        public void Policy_HasExclusiveRole(string policyName, string expectedExclusiveRole)
        {
            var allowedRoles = AuthorizationPolicies.RolesByPolicy[policyName];
            Assert.Single(allowedRoles);
            Assert.Equal(expectedExclusiveRole, allowedRoles.Single());
        }

        [Fact]
        public void Buyer_IsStrictlyIsolatedFromAdministrativeAndWarehousePolicies()
        {
            var prohibitedPolicies = new[]
            {
                AuthorizationPolicies.UserAdministration,
                AuthorizationPolicies.WarehouseManagement,
                AuthorizationPolicies.WarehouseRead,
                AuthorizationPolicies.ProductManagement,
                AuthorizationPolicies.InventoryManagement,
                AuthorizationPolicies.InventoryRead,
                AuthorizationPolicies.InventoryAdjust,
                AuthorizationPolicies.FulfillmentOperate,
                AuthorizationPolicies.FulfillmentDeliver,
                AuthorizationPolicies.FulfillmentCancelByQuiebre,
                AuthorizationPolicies.ReturnInspect,
                AuthorizationPolicies.ReturnApprove,
                AuthorizationPolicies.ReturnRefund,
                AuthorizationPolicies.BillingGenerate
            };

            var buyerRole = nameof(UserRole.Buyer);
            foreach (var policy in prohibitedPolicies)
            {
                var allowed = AuthorizationPolicies.RolesByPolicy[policy];
                Assert.DoesNotContain(buyerRole, allowed);
            }
        }

        [Fact]
        public void LogisticsOperator_IsExcludedFromFinancialAndCommercialApprovals()
        {
            var prohibitedPolicies = new[]
            {
                AuthorizationPolicies.ReturnApprove,
                AuthorizationPolicies.ReturnRefund,
                AuthorizationPolicies.BillingGenerate,
                AuthorizationPolicies.BillingRead,
                AuthorizationPolicies.ProductManagement,
                AuthorizationPolicies.Checkout
            };

            var opRole = nameof(UserRole.LogisticsOperator);
            foreach (var policy in prohibitedPolicies)
            {
                var allowed = AuthorizationPolicies.RolesByPolicy[policy];
                Assert.DoesNotContain(opRole, allowed);
            }
        }

        [Fact]
        public void InvariantRG02_UserRoleEnum_EnforcesDistinctSingleRoles()
        {
            var roles = Enum.GetValues<UserRole>();
            var roleNames = Enum.GetNames<UserRole>();

            // Cada rol debe ser único y tener representación exacta de cadena
            Assert.Equal(5, roles.Length);
            Assert.Contains(nameof(UserRole.Buyer), roleNames);
            Assert.Contains(nameof(UserRole.Seller), roleNames);
            Assert.Contains(nameof(UserRole.Administrator), roleNames);
            Assert.Contains(nameof(UserRole.LogisticsOperator), roleNames);
            Assert.Contains(nameof(UserRole.Supervisor), roleNames);
        }
    }
}
