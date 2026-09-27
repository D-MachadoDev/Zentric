using System;
using System.Collections.Concurrent;
using System.Linq;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;

namespace Zentric.Application.Common.Messaging
{
    /// <summary>
    /// Dispatcher propio de mensajes. Q-14 (ratificado por el Owner el
    /// 2026-09-27): sustituye a MediatR 14, cuya licencia es RPL 1.5 / comercial
    /// y obliga a comprar clave o a publicar el codigo derivado. Este dispatcher
    /// no tiene dependencias externas y resuelve handlers por reflexion y cache.
    ///
    /// Conserva la semántica que el proyecto ya usaba: un unico handler por
    /// mensaje y una cadena de comportamientos que envuelve su ejecucion.
    /// </summary>
    public sealed class Mediator : IMediator
    {
        private readonly IServiceProvider _services;
        private readonly ConcurrentDictionary<Type, HandlerInvoker> _cache = new();

        public Mediator(IServiceProvider services)
        {
            _services = services;
        }

        public async Task<TResponse> Send<TResponse>(
            IRequest<TResponse> request,
            CancellationToken cancellationToken = default)
        {
            if (request is null) throw new ArgumentNullException(nameof(request));

            var invoker = _cache.GetOrAdd(request.GetType(), type => HandlerInvoker.Create(type, typeof(TResponse)));

            // Cada paso del pipeline es un Task<TResponse>; el ultimo invoca el handler.
            RequestHandlerDelegate<TResponse> next =
                () => invoker.InvokeHandlerAsync(_services, request, cancellationToken);

            // Se resuelve el comportamiento por el TIPO CONCRETO del mensaje. Pedir
            // IPipelineBehavior<IRequest<TResponse>, TResponse> no funciona: el
            // registro abierto (typeof(IPipelineBehavior<,>)) solo resuelve la
            // interfaz cerrada sobre el tipo real, p. ej.
            // IPipelineBehavior<CreateCartCommand, Result<Guid>>.
            var behaviorInterface = typeof(IPipelineBehavior<,>).MakeGenericType(request.GetType(), typeof(TResponse));
            var behaviors = ResolveBehaviors(behaviorInterface);

            // Se envuelve la cadena para que cada comportamiento se ejecute antes
            // del siguiente; el orden de registro es el orden de ejecucion.
            foreach (var behavior in behaviors)
            {
                var current = next;
                next = () => InvokeBehaviorAsync(behavior, request, current, cancellationToken);
            }

            return await next();
        }

        /// <summary>Devuelve las instancias registradas para la interfaz de comportamiento cerrada.</summary>
        private IEnumerable<object> ResolveBehaviors(Type behaviorInterface)
        {
            // GetServices(Type) no es generico, asi que se resuelve por reflexion.
            var getServices = typeof(ServiceProviderServiceExtensions)
                .GetMethod(nameof(ServiceProviderServiceExtensions.GetServices), new[] { typeof(IServiceProvider), typeof(Type) })!;

            return ((IEnumerable<object>)getServices.Invoke(_services, new object?[] { _services, behaviorInterface })!)
                .ToList();
        }

        private static async Task<TResponse> InvokeBehaviorAsync<TResponse>(
            object behavior,
            IRequest<TResponse> request,
            RequestHandlerDelegate<TResponse> next,
            CancellationToken cancellationToken)
        {
            var behaviorInterface = behavior.GetType().GetInterfaces()
                .First(i => i.IsGenericType && i.GetGenericTypeDefinition() == typeof(IPipelineBehavior<,>));

            var method = behaviorInterface.GetMethod(nameof(IPipelineBehavior<IRequest<object>, object>.Handle))!;
            var task = (Task<TResponse>)method.Invoke(
                behavior, new object?[] { request, next, cancellationToken })!;

            return await task;
        }

        public async Task Publish(object notification, CancellationToken cancellationToken = default)
        {
            if (notification is null) throw new ArgumentNullException(nameof(notification));
            if (notification is not INotification typed)
            {
                throw new ArgumentException(
                    "La notificacion debe implementar INotification.", nameof(notification));
            }

            var handlerType = typeof(INotificationHandler<>).MakeGenericType(notification.GetType());
            var handleMethod = handlerType.GetMethod(nameof(INotificationHandler<INotification>.Handle))!;

            // Se ejecutan TODOS los suscriptores: una notificacion no tiene unico consumidor.
            foreach (var handler in _services.GetServices(handlerType))
            {
                var task = (Task)handleMethod.Invoke(handler, new object[] { typed, cancellationToken })!;
                await task;
            }
        }

        /// <summary>
        /// Adapta un <see cref="IRequestHandler{TRequest,TResponse}"/> concreto a un
        /// invocable que recibe <see cref="IRequest{TResponse}"/>, resolviendo el
        /// handler por su tipo cerrado.
        /// </summary>
        private sealed class HandlerInvoker
        {
            private readonly Type _handlerType;
            private readonly MethodInfo _handleMethod;

            private HandlerInvoker(Type handlerType, MethodInfo handleMethod)
            {
                _handlerType = handlerType;
                _handleMethod = handleMethod;
            }

            public static HandlerInvoker Create(Type requestType, Type responseType)
            {
                var handlerType = typeof(IRequestHandler<,>).MakeGenericType(requestType, responseType);
                var handleMethod = handlerType.GetMethod(nameof(IRequestHandler<IRequest<object>, object>.Handle))!;
                return new HandlerInvoker(handlerType, handleMethod);
            }

            public async Task<TResponse> InvokeHandlerAsync<TResponse>(
                IServiceProvider services,
                IRequest<TResponse> request,
                CancellationToken cancellationToken)
            {
                var handler = services.GetService(_handlerType)
                    ?? throw new InvalidOperationException(
                        $"No hay handler registrado para el mensaje {request.GetType().Name}. " +
                        "Registra el handler en la capa Application o en el Composition Root.");

                var task = (Task<TResponse>)_handleMethod.Invoke(handler, new object[] { request, cancellationToken })!;
                return await task;
            }
        }
    }
}