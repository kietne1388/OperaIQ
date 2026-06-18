using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using OperaIQ.Application.DTOs;
using OperaIQ.Application.Services;
using OperaIQ.Domain.Entities;
using OperaIQ.Domain.Enums;
using OperaIQ.Infrastructure.Data;

namespace OperaIQ.Infrastructure.Services
{
    // Sinh JWT token + claims. Tái hiện chính xác bộ claims trước đây dựng trong
    // AccountController.Login (cookie) để các Authorization Policy giữ nguyên hành vi.
    public class JwtTokenService : IJwtTokenService
    {
        private readonly UserManager<AppUser> _userManager;
        private readonly IConfiguration _configuration;
        private readonly ApplicationDbContext _context;

        public JwtTokenService(
            UserManager<AppUser> userManager,
            IConfiguration configuration,
            ApplicationDbContext context)
        {
            _userManager = userManager;
            _configuration = configuration;
            _context = context;
        }

        public async Task<AuthResultDto> GenerateTokenAsync(AppUser user, Guid? tenantId = null)
        {
            var roles = await _userManager.GetRolesAsync(user);
            return await GenerateTokenWithRolesAsync(user, roles, tenantId);
        }

        public async Task<AuthResultDto> GenerateTokenWithRolesAsync(AppUser user, IEnumerable<string> roles, Guid? tenantId = null)
        {
            // Bộ claims cơ bản. Dùng literal claim-type vì JwtBearer được cấu hình
            // MapInboundClaims=false nên không tự ánh xạ sang URI dài.
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.FullName),
                new Claim(ClaimTypes.Email, user.Email ?? string.Empty),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var targetTenantId = user.TenantId ?? tenantId;
            string? tenantSlug = null;
            if (targetTenantId.HasValue)
            {
                claims.Add(new Claim("tenant_id", targetTenantId.Value.ToString()));

                var tenant = await _context.Tenants
                    .IgnoreQueryFilters()
                    .FirstOrDefaultAsync(t => t.Id == targetTenantId.Value);
                if (tenant != null)
                {
                    tenantSlug = tenant.Slug;
                    claims.Add(new Claim("tenant_slug", tenant.Slug));
                }
            }

            foreach (var role in roles)
            {
                claims.Add(new Claim(ClaimTypes.Role, role));
            }

            // Gán quyền cụ thể theo Role (rule.md §6.1 / §6.2) — giữ nguyên mapping cũ.
            var permissions = BuildPermissions(roles);
            foreach (var permission in permissions)
            {
                claims.Add(new Claim("permissions", permission));
            }

            // Ký token bằng Jwt:Secret. Dùng Encoding.ASCII đồng nhất với cấu hình
            // validation trong Program.cs, nếu không chữ ký sẽ không khớp.
            string jwtSecret = _configuration["Jwt:Secret"] ?? "OperaIQSuperSecretSecurityKey1234567890!!!";
            var key = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(jwtSecret));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var expiresAt = DateTime.UtcNow.AddDays(7);

            var token = new JwtSecurityToken(
                claims: claims,
                expires: expiresAt,
                signingCredentials: creds);

            // Xóa OutboundClaimTypeMap để claim được ghi đúng literal type
            // (ClaimTypes.NameIdentifier/Role giữ nguyên URI, không bị rút gọn thành
            // "nameid"/"role"). Khớp với MapInboundClaims=false + NameClaimType/RoleClaimType
            // ở Program.cs — nếu không, FindFirst(NameIdentifier) và RequireRole sẽ fail.
            var handler = new JwtSecurityTokenHandler();
            handler.OutboundClaimTypeMap.Clear();
            string tokenString = handler.WriteToken(token);

            return new AuthResultDto
            {
                Token = tokenString,
                ExpiresAt = expiresAt,
                User = new UserDto
                {
                    Id = user.Id,
                    UserName = user.UserName ?? string.Empty,
                    Email = user.Email ?? string.Empty,
                    FullName = user.FullName,
                    AvatarUrl = user.AvatarUrl,
                    TenantId = user.TenantId,
                    DepartmentId = user.DepartmentId,
                    IsActive = !user.IsDeleted,
                    Role = roles.FirstOrDefault()
                },
                Roles = roles.ToList(),
                Permissions = permissions
            };
        }

        private static List<string> BuildPermissions(IEnumerable<string> roles)
        {
            var permissions = new List<string>();
            var roleSet = roles.ToHashSet();

            if (roleSet.Contains(nameof(UserSystemRole.SuperAdmin)))
            {
                permissions.Add("tenant.manage");
                permissions.Add("billing.configure");
                permissions.Add("orgchart.draw");
                permissions.Add("employee.manage");
                permissions.Add("document.share");
                permissions.Add("task.create");
                permissions.Add("task.assign");
                permissions.Add("project.manage");
                permissions.Add("report.view");
                permissions.Add("task.execute");
                permissions.Add("document.view");
            }
            if (roleSet.Contains(nameof(UserSystemRole.TenantOwner)))
            {
                permissions.Add("orgchart.draw");
                permissions.Add("employee.manage");
                permissions.Add("document.share");
                permissions.Add("task.create");
                permissions.Add("task.assign");
                permissions.Add("project.manage");
                permissions.Add("report.view");
            }
            if (roleSet.Contains(nameof(UserSystemRole.TenantAdmin)))
            {
                permissions.Add("document.share");
                permissions.Add("task.create");
                permissions.Add("task.assign");
                permissions.Add("project.manage");
                permissions.Add("report.view");
            }
            if (roleSet.Contains(nameof(UserSystemRole.Employee)))
            {
                permissions.Add("task.execute");
                permissions.Add("document.view");
            }

            return permissions;
        }
    }
}
