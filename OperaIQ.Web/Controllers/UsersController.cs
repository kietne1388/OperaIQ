using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OperaIQ.Application.DTOs;
using OperaIQ.Application.Services;

namespace OperaIQ.Web.Controllers
{
    [ApiController]
    [Route("api/users")]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly IUserService _userService;

        public UsersController(IUserService userService)
        {
            _userService = userService;
        }

        private Guid GetCurrentUserId()
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (Guid.TryParse(userIdString, out var userId))
            {
                return userId;
            }
            throw new UnauthorizedAccessException("User ID not found in token.");
        }

        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            var userId = GetCurrentUserId();
            var profile = await _userService.GetProfileAsync(userId);
            
            if (profile == null)
            {
                return NotFound(new { error = "Không tìm thấy thông tin người dùng." });
            }

            return Ok(profile);
        }

        [HttpPut("profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto dto)
        {
            var userId = GetCurrentUserId();
            var result = await _userService.UpdateProfileAsync(userId, dto);
            
            if (!result)
            {
                return BadRequest(new { error = "Không thể cập nhật thông tin người dùng." });
            }

            return Ok(new { message = "Cập nhật thông tin thành công." });
        }

        [HttpPut("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            if (dto.NewPassword != dto.ConfirmNewPassword)
            {
                return BadRequest(new { error = "Mật khẩu mới và xác nhận mật khẩu không khớp." });
            }

            var userId = GetCurrentUserId();
            var result = await _userService.ChangePasswordAsync(userId, dto);
            
            if (!result)
            {
                return BadRequest(new { error = "Không thể thay đổi mật khẩu. Vui lòng kiểm tra lại mật khẩu hiện tại." });
            }

            return Ok(new { message = "Thay đổi mật khẩu thành công." });
        }
    }
}
