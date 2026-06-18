using Microsoft.AspNetCore.Mvc;

namespace OperaIQ.Web.Controllers;

/// <summary>
/// Health check endpoint cho Fly.io và monitoring
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new
        {
            status = "healthy",
            timestamp = DateTime.UtcNow,
            version = "1.0.0",
            service = "OperaIQ API"
        });
    }
}
