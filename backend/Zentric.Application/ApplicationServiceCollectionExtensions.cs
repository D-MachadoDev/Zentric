using System;
using System.Reflection;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Zentric.Application.Common.Messaging;

namespace Zentric.Application
{
    /// <summary>
    /// Montaje de la capa Application. Q-14: el registro de mensajes y handlers
    /// reemplaza a <c>AddMediatR</c> con un escaneo del propio ensamblado.
    /// </summary>
    public static class ApplicationServiceCollectionExtensions
    {
        /// <summary>
        /// Registra el dispatcher, los validadores de FluentValidation y todos los
        /// handlers de mensajes declarados en el ensamblado indicado.
        /// </summary>
        public static IServiceCollection AddZentricApplication(
            this IServiceCollection services,
            Assembly? assembly = null)
        {
            services.AddScoped<IMediator, Mediator>();

            services.AddValidatorsFromAssembly(assembly ?? typeof(ApplicationServiceCollectionExtensions).Assembly);

            RegisterHandlers(services, assembly ?? typeof(ApplicationServiceCollectionExtensions).Assembly);

            return services;
        }

        /// <summary>
        /// Registra cada <see cref="IRequestHandler{TRequest,TResponse}"/> como
        /// servicio abierto, para que MS.DI pueda resolver el tipo cerrado.
        /// </summary>
        private static void RegisterHandlers(IServiceCollection services, Assembly assembly)
        {
            foreach (var type in assembly.GetTypes())
            {
                if (type.IsAbstract || type.IsInterface) continue;

                foreach (var @interface in type.GetInterfaces())
                {
                    if (!@interface.IsGenericType) continue;

                    var definition = @interface.GetGenericTypeDefinition();

                    if (definition == typeof(IRequestHandler<,>))
                    {
                        services.TryAddEnumerable(ServiceDescriptor.Scoped(@interface, type));
                    }
                    else if (definition == typeof(INotificationHandler<>))
                    {
                        services.TryAddEnumerable(ServiceDescriptor.Scoped(@interface, type));
                    }
                }
            }
        }
    }
}