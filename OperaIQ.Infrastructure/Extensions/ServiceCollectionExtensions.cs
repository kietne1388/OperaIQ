using Microsoft.Extensions.DependencyInjection;
using OperaIQ.Infrastructure.Clients;

namespace OperaIQ.Infrastructure.Extensions
{
    public static class ServiceCollectionExtensions
    {
        /// <summary>
        /// Registers the Gemini client and its dependencies.
        /// </summary>
        /// <param name="services">The IServiceCollection to add registrations to.</param>
        /// <returns>The same IServiceCollection for chaining.</returns>
        public static IServiceCollection AddGeminiClient(this IServiceCollection services)
        {
            // Register the HttpClient used by GeminiClient and the client itself.
            services.AddHttpClient<IGeminiClient, GeminiClient>(client =>
            {
                // BaseAddress will be set from GeminiSettings in GeminiClient constructor.
                // No additional default configuration needed here.
            });
            return services;
        }
    }
}
