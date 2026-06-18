using System;
using System.Collections.Generic;

namespace OperaIQ.Application.DTOs
{
    // Kết quả trả về sau khi đăng nhập thành công (token + thông tin user + quyền)
    public class AuthResultDto
    {
        public string Token { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
        public UserDto User { get; set; } = null!;
        public List<string> Roles { get; set; } = [];
        public List<string> Permissions { get; set; } = [];
    }

    // Tùy chọn Tenant cho dropdown ở màn hình đăng nhập
    public class TenantOptionDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
    }
}
