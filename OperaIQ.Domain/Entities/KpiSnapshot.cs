using System;
using OperaIQ.Domain.Common;

namespace OperaIQ.Domain.Entities
{
    public class KpiSnapshot : TenantBaseEntity
    {
        public Guid? DepartmentId { get; set; }
        public virtual Department? Department { get; set; }
        public Guid? UserId { get; set; }
        public virtual AppUser? User { get; set; }

        public string Period { get; set; } = string.Empty;        // 2026-Q2
        public string MetricKey { get; set; } = string.Empty;     // KPI / Performance / Revenue
        public decimal Value { get; set; }
        public decimal Target { get; set; }
        public string? Unit { get; set; }
    }
}
