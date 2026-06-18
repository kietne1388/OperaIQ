using System;
using OperaIQ.Domain.Common;

namespace OperaIQ.Domain.Entities
{
    public class AiAssignmentSuggestion : TenantBaseEntity
    {
        public Guid? TaskId { get; set; }
        public virtual ProjectTask? Task { get; set; }

        public string TaskTitle { get; set; } = string.Empty;
        public string? TaskDescription { get; set; }

        public Guid SuggestedUserId { get; set; }
        public virtual AppUser SuggestedUser { get; set; } = null!;

        public int Rank { get; set; }                             // 1, 2, 3
        public int MatchScore { get; set; }                       // 0–100
        public string? Reason { get; set; }
        public bool IsAccepted { get; set; }
    }
}
