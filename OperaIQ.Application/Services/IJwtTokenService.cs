using System.Collections.Generic;
using System.Threading.Tasks;
using OperaIQ.Application.DTOs;
using OperaIQ.Domain.Entities;

namespace OperaIQ.Application.Services
{
    // Sinh JWT token cho user kèm claims (tenant, role, permissions).
    // Interface đặt ở Application; implement ở Infrastructure (nơi có package JwtBearer).
    public interface IJwtTokenService
    {
        Task<AuthResultDto> GenerateTokenAsync(AppUser user, System.Guid? tenantId = null);
        Task<AuthResultDto> GenerateTokenWithRolesAsync(AppUser user, IEnumerable<string> roles, System.Guid? tenantId = null);
    }
}
