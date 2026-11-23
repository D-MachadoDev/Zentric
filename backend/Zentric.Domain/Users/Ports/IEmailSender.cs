using System.Threading;
using System.Threading.Tasks;

namespace Zentric.Domain.Users.Ports
{
    /// <summary>
    /// Puerto de dominio para el envío de notificaciones por correo electrónico transaccional.
    /// Desacopla la lógica de negocio del proveedor de mensajería (Resend, SMTP, etc.).
    /// </summary>
    public interface IEmailSender
    {
        Task SendPasswordResetEmailAsync(string toEmail, string resetLink, CancellationToken cancellationToken = default);
    }
}
