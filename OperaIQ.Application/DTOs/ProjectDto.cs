using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using OperaIQ.Domain.Enums;

namespace OperaIQ.Application.DTOs
{
    public class ProjectDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? DueDate { get; set; }
        public ProjectStatus Status { get; set; } = ProjectStatus.Active;

        public Guid CreatedById { get; set; }
        public string? CreatedByName { get; set; }

        // PMO
        public string? Code { get; set; }
        public string? CustomerName { get; set; }
        public decimal Budget { get; set; }
        public int ProgressPercent { get; set; }

        // Approval flow
        public ProjectApprovalStatus ApprovalStatus { get; set; } = ProjectApprovalStatus.Approved;
        public string? RejectionReason { get; set; }
        public string? AiProblemInput { get; set; }

        // Aggregate counts
        public int TaskCount { get; set; }
        public int CompletedTaskCount { get; set; }
    }

    public class CreateProjectDto
    {
        [Required(ErrorMessage = "Tên dự án không được để trống")]
        [StringLength(200, ErrorMessage = "Tên dự án tối đa 200 ký tự")]
        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }
        public DateTime? StartDate { get; set; } = DateTime.Today;
        public DateTime? DueDate { get; set; }
        public decimal Budget { get; set; }
        public string? CustomerName { get; set; }
        public string? Code { get; set; }
        public Guid CreatedById { get; set; }
    }

    public class UpdateProjectDto
    {
        [Required(ErrorMessage = "Tên dự án không được để trống")]
        [StringLength(200, ErrorMessage = "Tên dự án tối đa 200 ký tự")]
        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? DueDate { get; set; }
        public decimal Budget { get; set; }
    }

    // Leader -> AI: nhập vấn đề để AI sinh dự án
    public class AiGenerateProjectRequest
    {
        [Required]
        public string ProblemInput { get; set; } = string.Empty;
    }

    // Kết quả AI trả về (template chờ Leader xem xét)
    public class AiProjectTemplateDto
    {
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public decimal EstimatedBudget { get; set; }
        public int EstimatedDurationDays { get; set; }
        public List<AiPhaseTemplateDto> Phases { get; set; } = new();
    }

    public class AiPhaseTemplateDto
    {
        public string Name { get; set; } = string.Empty;
        public int DurationDays { get; set; }
        public List<string> Tasks { get; set; } = new();
    }

    // Giám đốc từ chối dự án
    public class RejectProjectDto
    {
        [Required]
        public string Reason { get; set; } = string.Empty;
    }

    // Leader thêm nhân viên vào dự án
    public class AddProjectMemberDto
    {
        [Required]
        public Guid UserId { get; set; }
        public string Role { get; set; } = "Member";
    }

    // Danh sách thành viên dự án
    public class ProjectMemberDto
    {
        public Guid UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string? AvatarUrl { get; set; }
    }

    // Employee: task của mình xuyên suốt mọi dự án
    public class MyProjectTaskDto
    {
        public Guid TaskId { get; set; }
        public string TaskTitle { get; set; } = string.Empty;
        public string ProjectName { get; set; } = string.Empty;
        public Guid ProjectId { get; set; }
        public string Status { get; set; } = string.Empty;
        public string Priority { get; set; } = string.Empty;
        public DateTime? DueDate { get; set; }
        public int ProgressPercent { get; set; }
        public bool IsAiAssigned { get; set; }
    }
}

