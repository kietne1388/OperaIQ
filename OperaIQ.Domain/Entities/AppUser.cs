using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Identity;
using OperaIQ.Domain.Enums;

namespace OperaIQ.Domain.Entities
{
    public class AppUser : IdentityUser<Guid>
    {
        public string FullName { get; set; } = string.Empty;
        public string? AvatarUrl { get; set; }
        public Guid? TenantId { get; set; }
        public virtual Tenant? Tenant { get; set; }
        public virtual ICollection<UserRole> UserRoles { get; set; } = [];

        public bool IsDeleted { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public Guid? DepartmentId { get; set; }
        public virtual Department? Department { get; set; }

        // ----- HR profile -----
        public string? EmployeeCode { get; set; }
        public string? JobTitle { get; set; }
        public Guid? ManagerId { get; set; }
        public virtual AppUser? Manager { get; set; }
        public DateTime? HireDate { get; set; }
        public EmploymentStatus EmploymentStatus { get; set; } = EmploymentStatus.Active;
        public int YearsOfExperience { get; set; }
        public int CompetencyScore { get; set; }                  // 0–100

        public virtual ICollection<EmployeeSkill> Skills { get; set; } = [];
        public virtual ICollection<EmployeeCertificate> Certificates { get; set; } = [];
    }
}
