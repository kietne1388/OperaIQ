using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OperaIQ.Domain.Entities;
using OperaIQ.Infrastructure.Data;

namespace OperaIQ.Web.Controllers
{
    [ApiController]
    [Route("api/reports")]
    [Authorize]
    public class ReportsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<AppUser> _userManager;

        public ReportsController(ApplicationDbContext context, UserManager<AppUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        private Guid? GetCurrentTenantId()
        {
            var tenantIdStr = User.FindFirst("tenant_id")?.Value;
            return Guid.TryParse(tenantIdStr, out var tid) ? tid : null;
        }

        private Guid GetCurrentUserId()
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(userIdStr, out var uid) ? uid : Guid.Empty;
        }

        private bool CanSeeAll()
        {
            return User.IsInRole("SuperAdmin") || User.IsInRole("TenantOwner") || User.IsInRole("TenantAdmin");
        }

        private async Task<Guid?> GetUserDepartmentIdAsync(Guid userId)
        {
            var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
            return user?.DepartmentId;
        }

        [HttpGet("export-excel")]
        public async Task<IActionResult> ExportExcel([FromQuery] string type)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var isSudo = CanSeeAll();

            if (tenantId == null && !User.IsInRole("SuperAdmin")) return Unauthorized("Không xác định được Tenant.");

            var csvBuilder = new StringBuilder();

            if (string.Equals(type, "projects", StringComparison.OrdinalIgnoreCase))
            {
                if (!isSudo)
                {
                    return StatusCode(403, "Bạn không có quyền xuất báo cáo ngân sách/dự án.");
                }

                var projects = await _context.Projects.AsNoTracking()
                    .Where(p => p.TenantId == tenantId && !p.IsDeleted)
                    .ToListAsync();

                csvBuilder.AppendLine("Mã dự án,Tên dự án,Ngân sách (VND),Trạng thái");
                foreach (var p in projects)
                {
                    csvBuilder.AppendLine($"\"{p.Code}\",\"{p.Name}\",\"{p.Budget:N0}\",\"{p.Status}\"");
                }

                return File(GenerateCsvBytes(csvBuilder.ToString()), "text/csv", "Bao_cao_ngan_sach_du_an.csv");
            }
            else if (string.Equals(type, "employees", StringComparison.OrdinalIgnoreCase))
            {
                List<AppUser> employees;
                if (isSudo)
                {
                    employees = await _context.Users.AsNoTracking()
                        .Where(u => u.TenantId == tenantId && !u.IsDeleted)
                        .Include(u => u.Department)
                        .ToListAsync();
                }
                else
                {
                    var deptId = await GetUserDepartmentIdAsync(userId);
                    employees = await _context.Users.AsNoTracking()
                        .Where(u => u.TenantId == tenantId && !u.IsDeleted && u.DepartmentId == deptId)
                        .Include(u => u.Department)
                        .ToListAsync();
                }

                csvBuilder.AppendLine("Mã NV,Họ và tên,Chức danh,Phòng ban,Email,Số điện thoại,Trạng thái");
                foreach (var emp in employees)
                {
                    csvBuilder.AppendLine($"\"{emp.EmployeeCode}\",\"{emp.FullName}\",\"{emp.JobTitle}\",\"{emp.Department?.Name ?? "N/A"}\",\"{emp.Email}\",\"{emp.PhoneNumber}\",\"{emp.EmploymentStatus}\"");
                }

                return File(GenerateCsvBytes(csvBuilder.ToString()), "text/csv", "Bao_cao_nhan_vien.csv");
            }
            else if (string.Equals(type, "tasks", StringComparison.OrdinalIgnoreCase))
            {
                List<ProjectTask> tasks;
                if (isSudo)
                {
                    tasks = await _context.Tasks.AsNoTracking()
                        .Where(t => t.TenantId == tenantId && !t.IsDeleted)
                        .Include(t => t.AssignedTo)
                        .Include(t => t.Project)
                        .ToListAsync();
                }
                else
                {
                    var myProjectIds = await _context.ProjectMembers.AsNoTracking()
                        .Where(pm => pm.UserId == userId)
                        .Select(pm => pm.ProjectId)
                        .ToListAsync();

                    tasks = await _context.Tasks.AsNoTracking()
                        .Where(t => t.TenantId == tenantId && !t.IsDeleted && (t.AssignedToId == userId || myProjectIds.Contains(t.ProjectId)))
                        .Include(t => t.AssignedTo)
                        .Include(t => t.Project)
                        .ToListAsync();
                }

                csvBuilder.AppendLine("Mã công việc,Tên công việc,Dự án,Người thực hiện,Trạng thái,Độ ưu tiên,Hạn chót");
                foreach (var t in tasks)
                {
                    csvBuilder.AppendLine($"\"{t.Code}\",\"{t.Title}\",\"{t.Project?.Name ?? "N/A"}\",\"{t.AssignedTo?.FullName ?? "Chưa giao"}\",\"{t.Status}\",\"{t.Priority}\",\"{t.DueDate:dd/MM/yyyy}\"");
                }

                return File(GenerateCsvBytes(csvBuilder.ToString()), "text/csv", "Bao_cao_cong_viec.csv");
            }

            return BadRequest("Loại báo cáo không hợp lệ.");
        }

        [HttpGet("export-docx")]
        public async Task<IActionResult> ExportDocx([FromQuery] string type)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var isSudo = CanSeeAll();

            if (tenantId == null && !User.IsInRole("SuperAdmin")) return Unauthorized("Không xác định được Tenant.");

            var htmlBuilder = new StringBuilder();
            htmlBuilder.Append(@"<html>
<head>
<meta http-equiv=""Content-Type"" content=""text/html; charset=utf-8"">
<style>
    body { font-family: Arial, sans-serif; line-height: 1.6; }
    h2 { color: #3D5A45; text-align: center; }
    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
    th, td { border: 1px solid #cccccc; text-align: left; padding: 10px; font-size: 13px; }
    th { background-color: #3D5A45; color: white; }
    tr:nth-child(even) { background-color: #f9f9f9; }
</style>
</head>
<body>");

            if (string.Equals(type, "projects", StringComparison.OrdinalIgnoreCase))
            {
                if (!isSudo)
                {
                    return StatusCode(403, "Bạn không có quyền xuất báo cáo ngân sách/dự án.");
                }

                var projects = await _context.Projects.AsNoTracking()
                    .Where(p => p.TenantId == tenantId && !p.IsDeleted)
                    .ToListAsync();

                htmlBuilder.Append("<h2>BÁO CÁO NGÂN SÁCH & DỰ ÁN</h2>");
                htmlBuilder.Append("<table><tr><th>Mã dự án</th><th>Tên dự án</th><th>Ngân sách (VND)</th><th>Trạng thái</th></tr>");
                foreach (var p in projects)
                {
                    htmlBuilder.Append($"<tr><td>{p.Code}</td><td>{p.Name}</td><td>{p.Budget:N0}</td><td>{p.Status}</td></tr>");
                }
                htmlBuilder.Append("</table></body></html>");

                return File(Encoding.UTF8.GetBytes(htmlBuilder.ToString()), "application/msword", "Bao_cao_ngan_sach_du_an.doc");
            }
            else if (string.Equals(type, "employees", StringComparison.OrdinalIgnoreCase))
            {
                List<AppUser> employees;
                if (isSudo)
                {
                    employees = await _context.Users.AsNoTracking()
                        .Where(u => u.TenantId == tenantId && !u.IsDeleted)
                        .Include(u => u.Department)
                        .ToListAsync();
                }
                else
                {
                    var deptId = await GetUserDepartmentIdAsync(userId);
                    employees = await _context.Users.AsNoTracking()
                        .Where(u => u.TenantId == tenantId && !u.IsDeleted && u.DepartmentId == deptId)
                        .Include(u => u.Department)
                        .ToListAsync();
                }

                htmlBuilder.Append("<h2>BÁO CÁO NHÂN VIÊN HỆ THỐNG</h2>");
                htmlBuilder.Append("<table><tr><th>Mã NV</th><th>Họ và tên</th><th>Chức danh</th><th>Phòng ban</th><th>Email</th><th>Số điện thoại</th><th>Trạng thái</th></tr>");
                foreach (var emp in employees)
                {
                    htmlBuilder.Append($"<tr><td>{emp.EmployeeCode}</td><td>{emp.FullName}</td><td>{emp.JobTitle}</td><td>{emp.Department?.Name ?? "N/A"}</td><td>{emp.Email}</td><td>{emp.PhoneNumber}</td><td>{emp.EmploymentStatus}</td></tr>");
                }
                htmlBuilder.Append("</table></body></html>");

                return File(Encoding.UTF8.GetBytes(htmlBuilder.ToString()), "application/msword", "Bao_cao_nhan_vien.doc");
            }
            else if (string.Equals(type, "tasks", StringComparison.OrdinalIgnoreCase))
            {
                List<ProjectTask> tasks;
                if (isSudo)
                {
                    tasks = await _context.Tasks.AsNoTracking()
                        .Where(t => t.TenantId == tenantId && !t.IsDeleted)
                        .Include(t => t.AssignedTo)
                        .Include(t => t.Project)
                        .ToListAsync();
                }
                else
                {
                    var myProjectIds = await _context.ProjectMembers.AsNoTracking()
                        .Where(pm => pm.UserId == userId)
                        .Select(pm => pm.ProjectId)
                        .ToListAsync();

                    tasks = await _context.Tasks.AsNoTracking()
                        .Where(t => t.TenantId == tenantId && !t.IsDeleted && (t.AssignedToId == userId || myProjectIds.Contains(t.ProjectId)))
                        .Include(t => t.AssignedTo)
                        .Include(t => t.Project)
                        .ToListAsync();
                }

                htmlBuilder.Append("<h2>BÁO CÁO TIẾN ĐỘ CÔNG VIỆC</h2>");
                htmlBuilder.Append("<table><tr><th>Mã công việc</th><th>Tên công việc</th><th>Dự án</th><th>Người thực hiện</th><th>Trạng thái</th><th>Độ ưu tiên</th><th>Hạn chót</th></tr>");
                foreach (var t in tasks)
                {
                    htmlBuilder.Append($"<tr><td>{t.Code}</td><td>{t.Title}</td><td>{t.Project?.Name ?? "N/A"}</td><td>{t.AssignedTo?.FullName ?? "Chưa giao"}</td><td>{t.Status}</td><td>{t.Priority}</td><td>{t.DueDate:dd/MM/yyyy}</td></tr>");
                }
                htmlBuilder.Append("</table></body></html>");

                return File(Encoding.UTF8.GetBytes(htmlBuilder.ToString()), "application/msword", "Bao_cao_cong_viec.doc");
            }

            return BadRequest("Loại báo cáo không hợp lệ.");
        }

        private byte[] GenerateCsvBytes(string csvContent)
        {
            var bytes = Encoding.UTF8.GetBytes(csvContent);
            var fileBytes = new byte[bytes.Length + 3];
            fileBytes[0] = 0xEF;
            fileBytes[1] = 0xBB;
            fileBytes[2] = 0xBF; // UTF-8 BOM
            Buffer.BlockCopy(bytes, 0, fileBytes, 3, bytes.Length);
            return fileBytes;
        }
    }
}
