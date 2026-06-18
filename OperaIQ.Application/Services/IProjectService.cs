using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using OperaIQ.Application.Common;
using OperaIQ.Application.DTOs;

namespace OperaIQ.Application.Services
{
    public interface IProjectService
    {
        // ── Basic CRUD ──────────────────────────────────────────────
        Task<IEnumerable<ProjectDto>> GetAllProjectsAsync(Guid userId, bool canSeeAll, bool isLeader = false);
        Task<ProjectDto?> GetProjectByIdAsync(Guid id, Guid userId, bool canSeeAll, bool isLeader = false);
        Task<bool> IsMemberAsync(Guid projectId, Guid userId);
        Task<Result<Guid>> CreateProjectAsync(CreateProjectDto dto);
        Task<Result> CompleteProjectAsync(Guid id);

        // ── AI Project Flow ─────────────────────────────────────────
        /// <summary>Leader nhập vấn đề → AI sinh template dự án</summary>
        Task<Result<AiProjectTemplateDto>> AiGenerateProjectTemplateAsync(string problemInput);

        /// <summary>Leader tạo draft dự án từ template AI (ApprovalStatus = DraftAI)</summary>
        Task<Result<Guid>> CreateAiDraftProjectAsync(CreateProjectDto dto, AiProjectTemplateDto template);

        /// <summary>Leader gửi dự án cho Giám đốc duyệt (PendingDirector)</summary>
        Task<Result> SubmitToDirectorAsync(Guid projectId, Guid leaderId);

        // ── Director Approval ────────────────────────────────────────
        /// <summary>Giám đốc duyệt dự án → Approved, thông báo Leader</summary>
        Task<Result> ApproveProjectAsync(Guid projectId, Guid directorId);

        /// <summary>Giám đốc từ chối dự án → Rejected, thông báo Leader với lý do</summary>
        Task<Result> RejectProjectAsync(Guid projectId, Guid directorId, string reason);

        /// <summary>Lấy danh sách dự án chờ duyệt (PendingDirector) - cho Giám đốc</summary>
        Task<IEnumerable<ProjectDto>> GetPendingApprovalProjectsAsync();

        // ── Member Management ────────────────────────────────────────
        Task<Result> AddMemberAsync(Guid projectId, AddProjectMemberDto dto);
        Task<Result> RemoveMemberAsync(Guid projectId, Guid userId);
        Task<IEnumerable<ProjectMemberDto>> GetMembersAsync(Guid projectId);

        Task<Result> UpdateProjectAsync(Guid id, UpdateProjectDto dto);

        // ── Employee: tasks across projects ─────────────────────────
        Task<IEnumerable<MyProjectTaskDto>> GetMyTasksAcrossProjectsAsync(Guid userId);
    }
}
