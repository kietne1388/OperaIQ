using System;
using OperaIQ.Domain.Common;
using OperaIQ.Domain.Enums;

namespace OperaIQ.Domain.Entities
{
    public class WorkloadSnapshot : TenantBaseEntity
    {
        public Guid UserId { get; set; }
        public virtual AppUser User { get; set; } = null!;

        public DateTime SnapshotDate { get; set; }
        public int ActiveTaskCount { get; set; }
        public int LoadPercent { get; set; }                     // 0–100
        public int WeeklyHours { get; set; }
        public WorkloadLevel Level { get; set; } = WorkloadLevel.Medium;
    }
}
