using System;
using OperaIQ.Domain.Common;

namespace OperaIQ.Domain.Entities
{
    public class RolePermission : TenantBaseEntity
    {
        public string RoleName { get; set; } = string.Empty;      // CEO, Director, Manager, TeamLeader, Senior, Staff, Intern
        public string Module { get; set; } = string.Empty;        // Dashboard, AIAssistant, HR, Project, Task, Report, Document, Customer, Config, Permission
        public bool CanView { get; set; }
        public bool CanCreate { get; set; }
        public bool CanEdit { get; set; }
        public bool CanDelete { get; set; }
        public string? Scope { get; set; }                        // All, Department, Team, Self
    }
}
