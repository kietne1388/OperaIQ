using System;
using System.Collections.Generic;
using OperaIQ.Domain.Common;

namespace OperaIQ.Domain.Entities
{
    public class Skill : TenantBaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;       // PLC, SCADA, Drive, Sales, Finance...
        public string? Description { get; set; }

        public virtual ICollection<EmployeeSkill> EmployeeSkills { get; set; } = [];
    }
}
