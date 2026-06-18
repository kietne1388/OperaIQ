using System;
using System.Threading.Tasks;
using OperaIQ.Application.DTOs;

namespace OperaIQ.Application.Services
{
    public interface IUserService
    {
        Task<UserDto> GetProfileAsync(Guid userId);
        Task<bool> UpdateProfileAsync(Guid userId, UpdateProfileDto dto);
        Task<bool> ChangePasswordAsync(Guid userId, ChangePasswordDto dto);
    }
}
