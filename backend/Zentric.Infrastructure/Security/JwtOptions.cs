namespace Zentric.Infrastructure.Security
{
    /// <summary>
    /// Configuracion de emision y validacion de tokens JWT.
    ///
    /// Sin valores por defecto: <see cref="SigningKey"/> exige valor explicito
    /// para evitar arrancar la API con un secreto debil o conocido.
    /// </summary>
    public sealed class JwtOptions
    {
        public const string SectionName = "Jwt";

        public string Issuer { get; set; } = string.Empty;
        public string Audience { get; set; } = string.Empty;
        public string SigningKey { get; set; } = string.Empty;
        public int ExpirationMinutes { get; set; } = 60;

        /// <summary>
        /// HS256 necesita al menos 256 bits de clave. Validar aqui evita el
        /// error difcil de diagnosticar que produce firmar con una clave corta.
        /// </summary>
        public void Validate()
        {
            if (string.IsNullOrWhiteSpace(Issuer))
            {
                throw new InvalidOperationException($"{SectionName}:{nameof(Issuer)} is required.");
            }

            if (string.IsNullOrWhiteSpace(Audience))
            {
                throw new InvalidOperationException($"{SectionName}:{nameof(Audience)} is required.");
            }

            if (string.IsNullOrWhiteSpace(SigningKey))
            {
                throw new InvalidOperationException(
                    $"{SectionName}:{nameof(SigningKey)} is required. Do not fall back to a default secret.");
            }

            if (System.Text.Encoding.UTF8.GetByteCount(SigningKey) < 32)
            {
                throw new InvalidOperationException(
                    $"{SectionName}:{nameof(SigningKey)} must be at least 32 bytes for HS256.");
            }

            if (ExpirationMinutes <= 0)
            {
                throw new InvalidOperationException($"{SectionName}:{nameof(ExpirationMinutes)} must be greater than zero.");
            }
        }
    }
}
