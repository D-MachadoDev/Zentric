namespace Zentric.Application.Common.Models
{
    /// <summary>
    /// Clasifica el fallo para que la capa HTTP el traduzca sin adivinar.
    ///
    /// Q-21b (dictamen del Owner 2026-09-29): un recurso que es de otro tiene que
    /// responder igual que uno que no existe, tanto en el codigo como en el mensaje,
    /// para que nadie pueda enumerar GUID ajenos. Como las escrituras tambien filtran
    /// por dueno, el "no encontrado" tiene que ser distinguible del error de
    /// validacion: si no, el unico modo de responder 404 seria leer el texto del
    /// mensaje, que es brittle y mezcla las dos cosas.
    /// </summary>
    public enum ErrorKind
    {
        /// <summary>Regla de negocio o dato invalido. Se responde 400.</summary>
        Validation = 0,

        /// <summary>
        /// El recurso no existe, o existe pero no es del llamante. Se responde 404.
        /// Los dos casos comparten mensaje a proposito: la diferencia no se le
        /// revela a quien pregunta (ADR-0013).
        /// </summary>
        NotFound = 1
    }

    public class Result
    {
        public bool IsSuccess { get; }
        public string Error { get; }

        /// <summary>Como se traduce <see cref="Error"/> a una respuesta HTTP.</summary>
        public ErrorKind ErrorKind { get; }

        public bool IsFailure => !IsSuccess;

        protected Result(bool isSuccess, string error, ErrorKind errorKind)
        {
            if (isSuccess && error != string.Empty)
                throw new InvalidOperationException();
            if (!isSuccess && error == string.Empty)
                throw new InvalidOperationException();

            IsSuccess = isSuccess;
            Error = error;
            ErrorKind = errorKind;
        }

        public static Result Success() => new Result(true, string.Empty, ErrorKind.Validation);

        public static Result Failure(string error) => new Result(false, error, ErrorKind.Validation);

        /// <summary>
        /// Fallo de recurso ausente o ajeno. El mensaje es el mismo en los dos
        /// casos: el llamante no puede deducir la existencia del recurso.
        /// </summary>
        public static Result NotFound(string error) => new Result(false, error, ErrorKind.NotFound);
    }

    public class Result<T> : Result
    {
        private readonly T? _value;

        public T Value => IsSuccess ? _value! : throw new InvalidOperationException("Result is failure");

        protected Result(T? value, bool isSuccess, string error, ErrorKind errorKind)
            : base(isSuccess, error, errorKind)
        {
            _value = value;
        }

        public static Result<T> Success(T value) => new Result<T>(value, true, string.Empty, ErrorKind.Validation);
        public static new Result<T> Failure(string error) => new Result<T>(default, false, error, ErrorKind.Validation);
        public static new Result<T> NotFound(string error) => new Result<T>(default, false, error, ErrorKind.NotFound);
    }
}
