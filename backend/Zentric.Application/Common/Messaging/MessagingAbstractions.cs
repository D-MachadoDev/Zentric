using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Zentric.Application.Common.Messaging
{
    /// <summary>
    /// Marcador de un mensaje con una unica respuesta associated.
    /// Q-14: sustituye a <c>MediatR.IRequest&lt;TResponse&gt;</c>.
    /// </summary>
    public interface IRequest<out TResponse>
    {
    }

    /// <summary>
    /// Manejador de un mensaje. Q-14: sustituye a
    /// <c>MediatR.IRequestHandler&lt;TRequest, TResponse&gt;</c>.
    /// </summary>
    public interface IRequestHandler<in TRequest, TResponse>
        where TRequest : IRequest<TResponse>
    {
        Task<TResponse> Handle(TRequest request, CancellationToken cancellationToken);
    }

    /// <summary>
    /// Encadena los pasos de un mensaje (validacion antes del handler).
    /// No recibe argumentos porque el token de cancelacion ya viaja cerrado en
    /// la cadena que arma el dispatcher.
    /// </summary>
    public delegate Task<TResponse> RequestHandlerDelegate<TResponse>();

    /// <summary>
    /// Comportamiento abierto del pipeline. Q-14: sustituye a
    /// <c>MediatR.IPipelineBehavior&lt;TRequest, TResponse&gt;</c>.
    /// </summary>
    public interface IPipelineBehavior<in TRequest, TResponse>
        where TRequest : IRequest<TResponse>
    {
        Task<TResponse> Handle(
            TRequest request,
            RequestHandlerDelegate<TResponse> next,
            CancellationToken cancellationToken);
    }

    /// <summary>Punto de entrada para despachar mensajes a sus handlers.</summary>
    public interface IMediator
    {
        Task<TResponse> Send<TResponse>(IRequest<TResponse> request, CancellationToken cancellationToken = default);

        /// <summary>Publica un evento; lo consumen todos los handlers suscritos.</summary>
        Task Publish(object notification, CancellationToken cancellationToken = default);
    }

    /// <summary>
    /// Evento sin respuesta, con uno o varios consumidores. Q-14: sustituye a
    /// <c>MediatR.INotification</c>.
    /// </summary>
    public interface INotification
    {
    }

    /// <summary>Notificacion tipada. Permite registrar el handler por reflexion.</summary>
    public interface INotification<out TNotification> : INotification
        where TNotification : INotification
    {
    }

    /// <summary>
    /// Manejador de una notificacion. Q-14: sustituye a
    /// <c>MediatR.INotificationHandler&lt;TNotification&gt;</c>.
    /// </summary>
    public interface INotificationHandler<in TNotification>
        where TNotification : INotification
    {
        Task Handle(TNotification notification, CancellationToken cancellationToken);
    }
}