using System;
using System.Collections.Generic;
using OperaIQ.Domain.Common;

namespace OperaIQ.Domain.Entities
{
    public class ProjectPhase : TenantBaseEntity
    {
        public Guid ProjectId { get; set; }
        public virtual Project Project { get; set; } = null!;

        public string Code { get; set; } = string.Empty;          // G1, G2, G3, G4
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int OrderIndex { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int ProgressPercent { get; set; }

        public virtual ICollection<ProjectTask> Tasks { get; set; } = [];
    }
}
