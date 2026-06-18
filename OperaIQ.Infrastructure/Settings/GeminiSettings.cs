namespace OperaIQ.Infrastructure.Settings
{
    public class GeminiSettings
    {
        public string ApiKey { get; set; } = string.Empty;
        public string Endpoint { get; set; } = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro";
        public int MaxTokens { get; set; } = 4000;
        public int RetryCount { get; set; } = 3;
        public int MaxOutputTokens { get; set; } = 1024;
        public int RetryDelayMs { get; set; } = 500;
        public double TokenWarningThreshold { get; set; } = 0.9;
        public bool EnableHealthCheck { get; set; } = true;
    }
}
