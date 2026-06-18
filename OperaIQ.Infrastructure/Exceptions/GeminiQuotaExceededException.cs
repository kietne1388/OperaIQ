using System;

namespace OperaIQ.Infrastructure.Exceptions
{
    public class GeminiQuotaExceededException : Exception
    {
        public GeminiQuotaExceededException(string message) : base(message) { }
        public GeminiQuotaExceededException(string message, Exception inner) : base(message, inner) { }
    }
}
