using System;
using OperaIQ.Domain.Common;

namespace OperaIQ.Domain.Entities
{
    public class EmployeeCertificate : TenantBaseEntity
    {
        public Guid UserId { get; set; }
        public virtual AppUser User { get; set; } = null!;

        public string Name { get; set; } = string.Empty;          // PMP, CCNA, Mitsubishi MELSEC
        public string? Issuer { get; set; }
        public DateTime? IssueDate { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public string? Code { get; set; }
    }
}
