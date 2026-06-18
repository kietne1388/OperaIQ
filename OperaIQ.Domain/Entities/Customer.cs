using System;
using System.Collections.Generic;
using OperaIQ.Domain.Common;

namespace OperaIQ.Domain.Entities
{
    public class Customer : TenantBaseEntity
    {
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Industry { get; set; }
        public string? Address { get; set; }
        public string? ContactPerson { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }

        public virtual ICollection<Project> Projects { get; set; } = [];
    }
}
