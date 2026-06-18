using System;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OperaIQ.Infrastructure.Settings;
using OperaIQ.Infrastructure.Exceptions;

namespace OperaIQ.Infrastructure.Clients
{
    public interface IGeminiClient
    {
        Task<string> PromptAsync(string prompt);
        Task<string> SimulateTooManyRequestsAsync();
    }

    public class GeminiClient : IGeminiClient
    {
        private readonly HttpClient _http;
        private readonly GeminiSettings _settings;
        private readonly ILogger<GeminiClient> _log;

        public GeminiClient(HttpClient http, IOptions<GeminiSettings> opts, ILogger<GeminiClient> log)
        {
            _http = http;
            _settings = opts.Value;
            _log = log;
            _http.BaseAddress = new Uri(_settings.Endpoint);
        }

        public async Task<string> PromptAsync(string prompt)
        {
            var payload = new
            {
                contents = new[] { new { role = "user", parts = new[] { new { text = prompt } } } }
            };

            var json = JsonSerializer.Serialize(payload);
            var request = new HttpRequestMessage(HttpMethod.Post, $"?key={_settings.ApiKey}")
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json")
            };

            int attempt = 0;
            while (true)
            {
                attempt++;
                var response = await _http.SendAsync(request);
                if (response.StatusCode == HttpStatusCode.OK)
                {
                    return await response.Content.ReadAsStringAsync();
                }
                if (response.StatusCode == (HttpStatusCode)429)
                {
                    _log.LogWarning("Gemini quota exceeded – attempt {Attempt}/{Max}", attempt, _settings.RetryCount);
                    if (attempt > _settings.RetryCount)
                        throw new GeminiQuotaExceededException("Gemini API returned 429 TooManyRequests after retries.");
                    var delay = TimeSpan.FromMilliseconds(_settings.RetryDelayMs * Math.Pow(2, attempt - 1));
                    await Task.Delay(delay);
                    continue;
                }
                // other errors
                response.EnsureSuccessStatusCode();
            }
        }

        public Task<string> SimulateTooManyRequestsAsync()
        {
            // Directly throw to trigger quota handling logic
            throw new GeminiQuotaExceededException("Simulated Gemini TooManyRequests error.");
        }
    }
}
