using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OperaIQ.Infrastructure.Data;
using System.Collections.Generic;
using System.Threading.Tasks;
using OperaIQ.Infrastructure.Clients;
using OperaIQ.Infrastructure.Exceptions;

namespace OperaIQ.Web.Controllers
{
    [ApiController]
    [Route("api/admin")]
    [Authorize(Roles = "SuperAdmin")]
    public class AdminController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IGeminiClient _gemini;

        public AdminController(ApplicationDbContext context, IGeminiClient gemini)
        {
            _context = context;
            _gemini = gemini;
        }

        // GET api/admin/all
        // Returns a snapshot of the most important data for debugging / admin purposes.
        // -------------------------------
        // Simulation endpoint – accepts model name (e.g., "gemini-2.0-flash")
        // -------------------------------
        [HttpPost("gemini-simulate-429/{model}")]
        public async Task<IActionResult> SimulateTooManyRequests([FromRoute] string model)
        {
            try
            {
                // The model parameter is just for logging / client clarity.
                var _ = await _gemini.SimulateTooManyRequestsAsync();
                // This line is never reached because the method throws.
                return Ok();
            }
            catch (GeminiQuotaExceededException ex)
            {
                return StatusCode(503, new
                {
                    model = model,
                    error = "Gemini quota exceeded (simulated)",
                    detail = ex.Message,
                    suggestion = "Kiểm tra quota API Key hoặc chờ vài phút trước khi thử lại."
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Internal error", detail = ex.Message });
            }
        }

        [HttpGet("all")]
        public async Task<IActionResult> GetAll()
        {
            var result = new Dictionary<string, object>
            {
                ["users"]       = await _context.Users.ToListAsync(),
                ["tenants"]     = await _context.Tenants.ToListAsync(),
                ["projects"]    = await _context.Projects.ToListAsync(),
                ["tasks"]       = await _context.Tasks.ToListAsync(),
                ["documents"]   = await _context.Documents.ToListAsync(),
                ["departments"] = await _context.Departments.ToListAsync()
                // Add more DbSet entries here if needed.
            };

            return Ok(result);
        }
    }
}
