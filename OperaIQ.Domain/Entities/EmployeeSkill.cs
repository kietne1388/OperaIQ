using System;
using OperaIQ.Domain.Common;
using OperaIQ.Domain.Enums;

namespace OperaIQ.Domain.Entities
{
    public class EmployeeSkill : TenantBaseEntity
    {
        public Guid UserId { get; set; }
        public virtual AppUser User { get; set; } = null!;

        public Guid SkillId { get; set; }
        public virtual Skill Skill { get; set; } = null!;

        public SkillLevel Level { get; set; } = SkillLevel.Intermediate;
        public bool IsPrimary { get; set; }
        public int Score { get; set; }                              // 0–100
    }
}
