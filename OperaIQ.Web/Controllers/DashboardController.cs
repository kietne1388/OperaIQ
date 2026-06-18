using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OperaIQ.Application.Services;
using OperaIQ.Domain.Enums;

namespace OperaIQ.Web.Controllers
{
    [ApiController]
    [Route("api/dashboard")]
    [Authorize]
    public class DashboardController : ControllerBase
    {
        private readonly IDashboardService _dashboardService;

        public DashboardController(IDashboardService dashboardService)
        {
            _dashboardService = dashboardService;
        }

        // GET /api/dashboard/summary
        [HttpGet("summary")]
        public async Task<IActionResult> Summary()
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var canSeeAll =
                User.IsInRole(nameof(UserSystemRole.TenantOwner)) ||
                User.IsInRole(nameof(UserSystemRole.TenantAdmin)) ||
                User.IsInRole(nameof(UserSystemRole.SuperAdmin));

            var summary = await _dashboardService.GetSummaryAsync(userId, canSeeAll);
            return Ok(summary);
        }

        // GET /api/dashboard/ai-report
        [HttpGet("ai-report")]
        public async Task<IActionResult> GetAiReport()
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var canSeeAll =
                User.IsInRole(nameof(UserSystemRole.TenantOwner)) ||
                User.IsInRole(nameof(UserSystemRole.TenantAdmin)) ||
                User.IsInRole(nameof(UserSystemRole.SuperAdmin));

            var result = await _dashboardService.GetAiReportAsync(userId, canSeeAll);
            if (result.IsSuccess)
            {
                return Ok(new { Report = result.Value });
            }
            return StatusCode(500, result.Error);
        }
    }
}
