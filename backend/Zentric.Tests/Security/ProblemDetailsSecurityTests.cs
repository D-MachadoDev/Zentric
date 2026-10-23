using System.IO;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Formatters;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Xunit;
using Zentric.Api.Contracts;

namespace Zentric.Tests.Security
{
    /// <summary>
    /// Pruebas unitarias para ProblemDetailsOutputFormatter y registro de contrato RFC 7807 / RFC 9457.
    /// </summary>
    public sealed class ProblemDetailsSecurityTests
    {
        private sealed class TestOutputFormatterContext : OutputFormatterWriteContext
        {
            public TestOutputFormatterContext(
                HttpContext httpContext,
                Func<Stream, Encoding, TextWriter> writerFactory,
                Type objectType,
                object @object)
                : base(httpContext, writerFactory, objectType, @object)
            {
            }
        }

        private sealed class TestCanWriteContext : OutputFormatterCanWriteContext
        {
            public TestCanWriteContext(HttpContext httpContext, Type? objectType, object? @object)
                : base(httpContext)
            {
                ObjectType = objectType;
                Object = @object;
            }
        }

        [Fact]
        public void Formatter_SupportedMediaTypes_ContainsProblemJson()
        {
            var formatter = new ProblemDetailsOutputFormatter();
            Assert.Contains("application/problem+json", formatter.SupportedMediaTypes);
        }

        [Theory]
        [InlineData(typeof(ProblemDetails), true)]
        [InlineData(typeof(ValidationProblemDetails), true)]
        [InlineData(typeof(string), false)]
        [InlineData(typeof(int), false)]
        [InlineData(null, false)]
        public void Formatter_CanWriteType_OnlyAllowsProblemDetailsTypes(Type? targetType, bool expected)
        {
            var formatter = new ProblemDetailsOutputFormatter();
            object? instance = targetType switch
            {
                null => null,
                var t when t == typeof(string) => "sample-text",
                var t when t == typeof(int) => 123,
                _ => Activator.CreateInstance(targetType)
            };
            var context = new TestCanWriteContext(new DefaultHttpContext(), targetType, instance);

            var canWrite = formatter.CanWriteResult(context);
            Assert.Equal(expected, canWrite);
        }

        [Fact]
        public async Task Formatter_WriteResponseBodyAsync_EmitsProblemJsonWithCamelCaseProperties()
        {
            var services = new ServiceCollection();
            services.AddControllers();
            var sp = services.BuildServiceProvider();

            var httpContext = new DefaultHttpContext
            {
                RequestServices = sp
            };
            using var memoryStream = new MemoryStream();
            httpContext.Response.Body = memoryStream;

            var problem = new ProblemDetails
            {
                Title = "Validation Failed",
                Status = 400,
                Detail = "Stock cannot be negative."
            };

            var formatter = new ProblemDetailsOutputFormatter();
            var writeContext = new TestOutputFormatterContext(
                httpContext,
                (stream, encoding) => new StreamWriter(stream, encoding),
                typeof(ProblemDetails),
                problem);

            await formatter.WriteResponseBodyAsync(writeContext);

            Assert.Equal("application/problem+json; charset=utf-8", httpContext.Response.ContentType);

            memoryStream.Seek(0, SeekOrigin.Begin);
            using var reader = new StreamReader(memoryStream, Encoding.UTF8);
            var jsonString = await reader.ReadToEndAsync();

            using var doc = JsonDocument.Parse(jsonString);
            var root = doc.RootElement;

            Assert.Equal("Validation Failed", root.GetProperty("title").GetString());
            Assert.Equal(400, root.GetProperty("status").GetInt32());
            Assert.Equal("Stock cannot be negative.", root.GetProperty("detail").GetString());
        }

        [Fact]
        public void AddProblemDetailsContract_RegistersFormatterAtFirstPosition()
        {
            var services = new ServiceCollection();
            var builder = services.AddControllers();
            builder.AddProblemDetailsContract();

            var sp = services.BuildServiceProvider();
            var mvcOptions = sp.GetRequiredService<IOptions<MvcOptions>>().Value;

            Assert.NotEmpty(mvcOptions.OutputFormatters);
            Assert.IsType<ProblemDetailsOutputFormatter>(mvcOptions.OutputFormatters[0]);
        }
    }
}
