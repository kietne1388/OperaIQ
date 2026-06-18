using System;
using System.Collections.Generic;
using OperaIQ.Domain.Common;
using OperaIQ.Domain.Enums;

namespace OperaIQ.Domain.Entities
{
    public class ProjectTask : TenantBaseEntity
    {
        public Guid ProjectId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public OperaIQ.Domain.Enums.TaskStatus Status { get; set; }
            = OperaIQ.Domain.Enums.TaskStatus.Todo;
        public TaskPriority Priority { get; set; } = TaskPriority.Medium;
        public Guid? AssignedToId { get; set; }
        public DateTime? DueDate { get; set; }
        public bool IsAiAssigned { get; set; } = false;
        public string? AiReason { get; set; }

        // ----- WBS / Kanban fields -----
        public string? Code { get; set; }
        public Guid? PhaseId { get; set; }
        public virtual ProjectPhase? Phase { get; set; }
        public Guid? ParentTaskId { get; set; }
        public virtual ProjectTask? ParentTask { get; set; }
        public virtual ICollection<ProjectTask> SubTasks { get; set; } = [];
        public Guid? AssignedById { get; set; }
        public virtual AppUser? AssignedBy { get; set; }
        public int EstimatedHours { get; set; }
        public int ActualHours { get; set; }
        public int ProgressPercent { get; set; }

        public virtual Project Project { get; set; } = null!;
        public virtual AppUser? AssignedTo { get; set; }
    }
}
