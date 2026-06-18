using System;
using System.Collections.Generic;
using OperaIQ.Domain.Common;
using OperaIQ.Domain.Enums;

namespace OperaIQ.Domain.Entities
{
    public class Project : TenantBaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public ProjectStatus Status { get; set; } = ProjectStatus.Active;
        public DateTime? StartDate { get; set; }
        public DateTime? DueDate { get; set; }

        public Guid CreatedById { get; set; }
        public virtual AppUser CreatedBy { get; set; } = null!;

        // ----- PMO fields -----
        public string? Code { get; set; }
        public string? CustomerName { get; set; }
        public decimal Budget { get; set; }
        public Guid? ProjectManagerId { get; set; }
        public virtual AppUser? ProjectManager { get; set; }
        public int ProgressPercent { get; set; }

        // ----- Approval fields -----
        public ProjectApprovalStatus ApprovalStatus { get; set; } = ProjectApprovalStatus.Approved;
        public string? RejectionReason { get; set; }
        public string? AiProblemInput { get; set; }

        public virtual ICollection<ProjectTask> Tasks { get; set; } = [];
        public virtual ICollection<ProjectMember> Members { get; set; } = [];
        public virtual ICollection<ProjectPhase> Phases { get; set; } = [];
    }
}
