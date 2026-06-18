using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
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
    [Route("api/employees")]
    [Authorize]
    public class EmployeesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<AppUser> _userManager;

        public EmployeesController(ApplicationDbContext context, UserManager<AppUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        private Guid? GetCurrentTenantId()
        {
            var tenantIdStr = User.FindFirst("tenant_id")?.Value;
            return Guid.TryParse(tenantIdStr, out var tid) ? tid : null;
        }

        // GET /api/employees — Danh sách tất cả nhân viên theo phòng ban
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var tenantId = GetCurrentTenantId();
            if (tenantId == null) return Unauthorized();

            var users = await _userManager.Users
                .Where(u => u.TenantId == tenantId && !u.IsDeleted)
                .Include(u => u.Department)
                .Include(u => u.Skills).ThenInclude(s => s.Skill)
                .Include(u => u.Certificates)
                .Include(u => u.Manager)
                .OrderBy(u => u.Department != null ? u.Department.Name : "")
                .ThenBy(u => u.FullName)
                .ToListAsync();

            var result = new List<object>();
            foreach (var u in users)
            {
                var roles = await _userManager.GetRolesAsync(u);
                
                // Lấy workload snapshot mới nhất
                var workload = await _context.WorkloadSnapshots
                    .IgnoreQueryFilters()
                    .Where(w => w.UserId == u.Id)
                    .OrderByDescending(w => w.SnapshotDate)
                    .FirstOrDefaultAsync();

                result.Add(new
                {
                    id = u.Id,
                    employeeCode = u.EmployeeCode,
                    fullName = u.FullName,
                    email = u.Email,
                    phone = u.PhoneNumber,
                    avatarUrl = u.AvatarUrl,
                    jobTitle = u.JobTitle,
                    departmentId = u.DepartmentId,
                    departmentName = u.Department?.Name,
                    managerId = u.ManagerId,
                    managerName = u.Manager?.FullName,
                    hireDate = u.HireDate,
                    yearsOfExperience = u.YearsOfExperience,
                    competencyScore = u.CompetencyScore,
                    employmentStatus = u.EmploymentStatus.ToString(),
                    roles = roles,
                    skills = u.Skills.Select(s => new
                    {
                        name = s.Skill.Name,
                        level = s.Level.ToString(),
                        score = s.Score,
                        isPrimary = s.IsPrimary
                    }),
                    certificates = u.Certificates.Select(c => new
                    {
                        name = c.Name,
                        issuer = c.Issuer,
                        issueDate = c.IssueDate
                    }),
                    workload = workload == null ? null : new
                    {
                        activeTaskCount = workload.ActiveTaskCount,
                        loadPercent = workload.LoadPercent,
                        weeklyHours = workload.WeeklyHours,
                        level = workload.Level.ToString()
                    }
                });
            }

            return Ok(result);
        }

        // GET /api/employees/{id} — Chi tiết hồ sơ một nhân viên
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var tenantId = GetCurrentTenantId();
            if (tenantId == null) return Unauthorized();

            var u = await _userManager.Users
                .Where(x => x.Id == id && x.TenantId == tenantId && !x.IsDeleted)
                .Include(x => x.Department)
                .Include(x => x.Skills).ThenInclude(s => s.Skill)
                .Include(x => x.Certificates)
                .Include(x => x.Manager)
                .FirstOrDefaultAsync();

            if (u == null) return NotFound();

            var roles = await _userManager.GetRolesAsync(u);
            var workload = await _context.WorkloadSnapshots
                .IgnoreQueryFilters()
                .Where(w => w.UserId == u.Id)
                .OrderByDescending(w => w.SnapshotDate)
                .FirstOrDefaultAsync();

            // Lấy các task đã hoàn thành (mô phỏng dự án cũ)
            var completedTasks = await _context.Tasks
                .IgnoreQueryFilters()
                .Where(t => t.AssignedToId == u.Id && t.Status == Domain.Enums.TaskStatus.Done)
                .Include(t => t.Project)
                .OrderByDescending(t => t.UpdatedAt)
                .Take(10)
                .ToListAsync();

            return Ok(new
            {
                id = u.Id,
                employeeCode = u.EmployeeCode,
                fullName = u.FullName,
                email = u.Email,
                phone = u.PhoneNumber,
                avatarUrl = u.AvatarUrl,
                jobTitle = u.JobTitle,
                departmentId = u.DepartmentId,
                departmentName = u.Department?.Name,
                managerId = u.ManagerId,
                managerName = u.Manager?.FullName,
                hireDate = u.HireDate,
                yearsOfExperience = u.YearsOfExperience,
                competencyScore = u.CompetencyScore,
                employmentStatus = u.EmploymentStatus.ToString(),
                roles = roles,
                skills = u.Skills.Select(s => new
                {
                    name = s.Skill.Name,
                    level = s.Level.ToString(),
                    score = s.Score,
                    isPrimary = s.IsPrimary
                }),
                certificates = u.Certificates.Select(c => new
                {
                    name = c.Name,
                    issuer = c.Issuer,
                    issueDate = c.IssueDate
                }),
                workload = workload == null ? null : new
                {
                    activeTaskCount = workload.ActiveTaskCount,
                    loadPercent = workload.LoadPercent,
                    weeklyHours = workload.WeeklyHours,
                    level = workload.Level.ToString()
                },
                recentProjects = completedTasks.Select(t => new
                {
                    taskTitle = t.Title,
                    projectName = t.Project?.Name,
                    completedAt = t.UpdatedAt
                })
            });
        }

        // GET /api/employees/departments — Danh sách phòng ban
        [HttpGet("departments")]
        public async Task<IActionResult> GetDepartments()
        {
            var tenantId = GetCurrentTenantId();
            if (tenantId == null) return Unauthorized();

            var depts = await _context.Departments
                .IgnoreQueryFilters()
                .Where(d => d.TenantId == tenantId && !d.IsDeleted)
                .Select(d => new { id = d.Id, name = d.Name })
                .ToListAsync();

            return Ok(depts);
        }
    }
}
