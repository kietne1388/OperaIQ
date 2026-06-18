namespace OperaIQ.Domain.Enums
{
    public enum TenantStatus { Active, Suspended, Expired }
    public enum ProjectStatus { Active, Completed, Archived, OnHold }
    public enum ProjectApprovalStatus { Approved, DraftAI, PendingDirector, Rejected }
    public enum TaskStatus { Backlog, Todo, InProgress, Review, Done, Cancelled }
    public enum TaskPriority { Low, Medium, High, Critical }
    public enum PermissionLevel { View, Download, Edit }
    public enum UserSystemRole { SuperAdmin, TenantOwner, TenantAdmin, Employee }
    public enum EmploymentStatus { Active, Probation, Maternity, Suspended, Resigned }
    public enum SkillLevel { Beginner, Intermediate, Advanced, Expert }
    public enum WorkloadLevel { Low, Medium, High, VeryHigh }
}
