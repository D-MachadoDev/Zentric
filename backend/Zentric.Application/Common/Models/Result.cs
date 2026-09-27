namespace Zentric.Application.Common.Models
{
    public class Result
    {
        public bool IsSuccess { get; }
        public string Error { get; }
        public bool IsFailure => !IsSuccess;

        protected Result(bool isSuccess, string error)
        {
            if (isSuccess && error != string.Empty)
                throw new InvalidOperationException();
            if (!isSuccess && error == string.Empty)
                throw new InvalidOperationException();

            IsSuccess = isSuccess;
            Error = error;
        }

        public static Result Success() => new Result(true, string.Empty);
        public static Result Failure(string error) => new Result(false, error);
    }

    public class Result<T> : Result
    {
        private readonly T? _value;

        public T Value => IsSuccess ? _value! : throw new InvalidOperationException("Result is failure");

        protected Result(T? value, bool isSuccess, string error)
            : base(isSuccess, error)
        {
            _value = value;
        }

        public static Result<T> Success(T value) => new Result<T>(value, true, string.Empty);
        public static new Result<T> Failure(string error) => new Result<T>(default, false, error);
    }
}
