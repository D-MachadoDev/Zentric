using System;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Moq;
using Xunit;
using Zentric.Api.Security;
using Zentric.Domain.Users.Enums;

namespace Zentric.Tests.Security
{
    /// <summary>
    /// Pruebas para ClaimsUserAccessor y ClaimsPrincipalExtensions.
    /// Valida la extracción segura de identidad (claim 'sub' / NameIdentifier) y rol único (RG-01, RG-02).
    /// </summary>
    public sealed class ClaimsSecurityTests
    {
        [Fact]
        public void ClaimsUserAccessor_NullHttpContext_ReturnsNull()
        {
            var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
            httpContextAccessorMock.Setup(x => x.HttpContext).Returns((HttpContext?)null);

            var accessor = new ClaimsUserAccessor(httpContextAccessorMock.Object);

            Assert.Null(accessor.UserId);
        }

        [Fact]
        public void ClaimsUserAccessor_UnauthenticatedUser_ReturnsNull()
        {
            var context = new DefaultHttpContext();
            var identity = new ClaimsIdentity(); // IsAuthenticated = false
            context.User = new ClaimsPrincipal(identity);

            var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
            httpContextAccessorMock.Setup(x => x.HttpContext).Returns(context);

            var accessor = new ClaimsUserAccessor(httpContextAccessorMock.Object);

            Assert.Null(accessor.UserId);
        }

        [Fact]
        public void ClaimsUserAccessor_AuthenticatedUserWithSubClaim_ReturnsGuid()
        {
            var expectedId = Guid.NewGuid();
            var context = new DefaultHttpContext();
            var identity = new ClaimsIdentity(new[]
            {
                new Claim("sub", expectedId.ToString())
            }, "TestAuth");
            context.User = new ClaimsPrincipal(identity);

            var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
            httpContextAccessorMock.Setup(x => x.HttpContext).Returns(context);

            var accessor = new ClaimsUserAccessor(httpContextAccessorMock.Object);

            Assert.Equal(expectedId, accessor.UserId);
        }

        [Fact]
        public void ClaimsUserAccessor_AuthenticatedUserWithNameIdentifierClaim_ReturnsGuid()
        {
            var expectedId = Guid.NewGuid();
            var context = new DefaultHttpContext();
            var identity = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, expectedId.ToString())
            }, "TestAuth");
            context.User = new ClaimsPrincipal(identity);

            var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
            httpContextAccessorMock.Setup(x => x.HttpContext).Returns(context);

            var accessor = new ClaimsUserAccessor(httpContextAccessorMock.Object);

            Assert.Equal(expectedId, accessor.UserId);
        }

        [Fact]
        public void ClaimsUserAccessor_AuthenticatedUserWithInvalidGuidClaim_ReturnsNull()
        {
            var context = new DefaultHttpContext();
            var identity = new ClaimsIdentity(new[]
            {
                new Claim("sub", "not-a-valid-guid")
            }, "TestAuth");
            context.User = new ClaimsPrincipal(identity);

            var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
            httpContextAccessorMock.Setup(x => x.HttpContext).Returns(context);

            var accessor = new ClaimsUserAccessor(httpContextAccessorMock.Object);

            Assert.Null(accessor.UserId);
        }

        [Theory]
        [InlineData(UserRole.Buyer, "Buyer")]
        [InlineData(UserRole.Seller, "Seller")]
        [InlineData(UserRole.Administrator, "Administrator")]
        [InlineData(UserRole.LogisticsOperator, "LogisticsOperator")]
        [InlineData(UserRole.Supervisor, "Supervisor")]
        public void GetUserRole_ValidRoleClaim_ReturnsExpectedRole(UserRole expectedRole, string roleClaimValue)
        {
            var principal = new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.Role, roleClaimValue)
            }));

            var parsedRole = principal.GetUserRole();

            Assert.Equal(expectedRole, parsedRole);
        }

        [Fact]
        public void GetUserRole_MissingRoleClaim_ReturnsNull()
        {
            var principal = new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim("sub", Guid.NewGuid().ToString())
            }));

            var parsedRole = principal.GetUserRole();

            Assert.Null(parsedRole);
        }

        [Fact]
        public void GetUserRole_UnknownRoleClaim_ReturnsNullFailClosed()
        {
            var principal = new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.Role, "UnknownRole_Or_SuperAdmin")
            }));

            var parsedRole = principal.GetUserRole();

            Assert.Null(parsedRole);
        }
    }
}
