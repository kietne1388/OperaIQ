using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OperaIQ.Application.DTOs;
using OperaIQ.Application.Services;
using OperaIQ.Domain.Entities;
using OperaIQ.Domain.Enums;
using OperaIQ.Infrastructure.Data;

namespace OperaIQ.Web.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<AppUser> _userManager;
        private readonly IJwtTokenService _jwtTokenService;
        private readonly ApplicationDbContext _context;

        public AuthController(
            UserManager<AppUser> userManager,
            IJwtTokenService jwtTokenService,
            ApplicationDbContext context)
        {
            _userManager = userManager;
            _jwtTokenService = jwtTokenService;
            _context = context;
        }

        // POST /api/auth/login — xác thực và trả JWT (không dùng cookie).
        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            var user = await _userManager.FindByEmailAsync(dto.Email);
            if (user == null || user.IsDeleted)
            {
                return Unauthorized(new { error = "Email hoặc mật khẩu không chính xác." });
            }

            // Tài khoản không thuộc tenant nào phải là SuperAdmin
            // SuperAdmin (TenantId = null) có thể đăng nhập bất kể tenant nào được chọn trên form
            if (user.TenantId == null)
            {
                var isSuperAdmin = await _userManager.IsInRoleAsync(user, nameof(UserSystemRole.SuperAdmin));
                if (!isSuperAdmin)
                {
                    return Unauthorized(new { error = "Tài khoản của bạn không hợp lệ." });
                }
                // SuperAdmin: bỏ qua kiểm tra tenantId — cho phép đăng nhập toàn hệ thống
            }
            else if (dto.TenantId.HasValue && user.TenantId != dto.TenantId.Value)
            {
                return Unauthorized(new { error = "Tài khoản của bạn không thuộc công ty đã chọn." });
            }

            var passwordValid = await _userManager.CheckPasswordAsync(user, dto.Password);
            if (!passwordValid)
            {
                return Unauthorized(new { error = "Email hoặc mật khẩu không chính xác." });
            }

            var result = await _jwtTokenService.GenerateTokenAsync(user, dto.TenantId);
            return Ok(result);
        }

        // GET /api/auth/me — thông tin user hiện tại đọc từ claims và DB để lấy data mới nhất.
        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> Me()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var appUser = await _userManager.FindByIdAsync(userId);
            if (appUser == null)
            {
                return Unauthorized();
            }

            Guid? tenantId = Guid.TryParse(User.FindFirst("tenant_id")?.Value, out var tid) ? tid : null;
            var roles = User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();
            var permissions = User.FindAll("permissions").Select(c => c.Value).ToList();

            return Ok(new
            {
                user = new UserDto
                {
                    Id = appUser.Id,
                    FullName = appUser.FullName,
                    Email = appUser.Email ?? string.Empty,
                    AvatarUrl = appUser.AvatarUrl,
                    TenantId = tenantId,
                    Role = roles.FirstOrDefault()
                },
                tenantSlug = User.FindFirst("tenant_slug")?.Value,
                roles,
                permissions
            });
        }

        // GET /api/auth/tenants — danh sách tenant cho dropdown đăng nhập.
        [HttpGet("tenants")]
        [AllowAnonymous]
        public async Task<IActionResult> Tenants()
        {
            var tenants = await _context.Tenants
                .IgnoreQueryFilters()
                .Where(t => t.Status == TenantStatus.Active && !t.IsDeleted)
                .Select(t => new TenantOptionDto { Id = t.Id, Name = t.Name, Slug = t.Slug })
                .ToListAsync();

            return Ok(tenants);
        }

        // POST /api/auth/switch-role — đổi vai trò kiểm thử (chỉ dùng cho SuperAdmin và Kiệt Trần)
        [HttpPost("switch-role")]
        [Authorize]
        public async Task<IActionResult> SwitchRole([FromBody] SwitchRoleRequest request)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return Unauthorized();

            var validRoles = new[] {
                nameof(UserSystemRole.SuperAdmin),
                nameof(UserSystemRole.TenantOwner),
                nameof(UserSystemRole.TenantAdmin),
                nameof(UserSystemRole.Employee)
            };

            if (!validRoles.Contains(request.Role))
            {
                return BadRequest(new { error = "Vai trò không hợp lệ." });
            }

            var isSuperAdmin = await _userManager.IsInRoleAsync(user, nameof(UserSystemRole.SuperAdmin));
            if (!isSuperAdmin && user.Email != "kietnttb01357@gmail.com")
            {
                return Forbid();
            }

            // Gán tạm TenantId "xuandat" nếu chuyển sang các role doanh nghiệp
            var targetTenant = await _context.Tenants.IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.Slug == "xuandat");

            var mockUser = new AppUser
            {
                Id = user.Id,
                UserName = user.UserName,
                Email = user.Email,
                FullName = user.FullName,
                AvatarUrl = user.AvatarUrl,
                DepartmentId = user.DepartmentId,
                TenantId = request.Role == nameof(UserSystemRole.SuperAdmin) ? null : (targetTenant?.Id ?? user.TenantId)
            };

            var roles = new[] { request.Role };
            var result = await _jwtTokenService.GenerateTokenWithRolesAsync(mockUser, roles);
            return Ok(result);
        }
    }

    public class SwitchRoleRequest
    {
        public string Role { get; set; } = string.Empty;
    }
}
