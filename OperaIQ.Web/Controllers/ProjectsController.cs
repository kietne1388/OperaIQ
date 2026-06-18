using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OperaIQ.Application.DTOs;
using OperaIQ.Application.Services;
using OperaIQ.Domain.Enums;

namespace OperaIQ.Web.Controllers
{
    [ApiController]
    [Route("api/projects")]
    [Authorize(Policy = "TenantMember")]
    public class ProjectsController : ControllerBase
    {
        private readonly IProjectService _projectService;

        public ProjectsController(IProjectService projectService)
        {
            _projectService = projectService;
        }

        // Owner/Admin/SuperAdmin xem được mọi dự án; nhân viên chỉ thấy dự án mình tham gia.
        private bool CanSeeAllProjects() =>
            User.IsInRole(nameof(UserSystemRole.TenantOwner)) ||
            User.IsInRole(nameof(UserSystemRole.SuperAdmin));

        private bool IsLeader() =>
            User.IsInRole(nameof(UserSystemRole.TenantAdmin));

        private Guid CurrentUserId() =>
            Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        // GET /api/projects
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var projects = await _projectService.GetAllProjectsAsync(CurrentUserId(), CanSeeAllProjects(), IsLeader());
            return Ok(projects);
        }

        // GET /api/projects/{id}
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var project = await _projectService.GetProjectByIdAsync(id, CurrentUserId(), CanSeeAllProjects(), IsLeader());
            if (project == null) return NotFound();
            return Ok(project);
        }

        // POST /api/projects — chỉ Owner/Admin được tạo dự án.
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateProjectDto dto)
        {
            if (!User.IsInRole(nameof(UserSystemRole.TenantOwner)) &&
                !User.IsInRole(nameof(UserSystemRole.TenantAdmin)) &&
                !User.IsInRole(nameof(UserSystemRole.SuperAdmin)))
            {
                return Forbid();
            }

            if (!ModelState.IsValid) return ValidationProblem(ModelState);

            dto.CreatedById = CurrentUserId();

            var result = await _projectService.CreateProjectAsync(dto);
            if (!result.IsSuccess)
            {
                return BadRequest(new { error = result.Error });
            }

            var created = await _projectService.GetProjectByIdAsync(result.Value, CurrentUserId(), CanSeeAllProjects(), IsLeader());
            return CreatedAtAction(nameof(GetById), new { id = result.Value }, created);
        }

        // POST /api/projects/ai-generate — Leader nhập vấn đề, AI sinh template
        [HttpPost("ai-generate")]
        public async Task<IActionResult> AiGenerate([FromBody] AiGenerateProjectRequest request)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            var result = await _projectService.AiGenerateProjectTemplateAsync(request.ProblemInput);
            if (!result.IsSuccess) return BadRequest(new { error = result.Error });
            return Ok(result.Value);
        }

        // POST /api/projects/from-ai — Leader tạo draft từ template AI
        [HttpPost("from-ai")]
        public async Task<IActionResult> CreateFromAi([FromBody] CreateProjectFromAiRequest request)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);
            request.Project.CreatedById = CurrentUserId();
            var result = await _projectService.CreateAiDraftProjectAsync(request.Project, request.Template);
            if (!result.IsSuccess) return BadRequest(new { error = result.Error });
            return Ok(new { projectId = result.Value });
        }

        // POST /api/projects/{id}/submit-director — Leader gửi dự án cho Giám đốc duyệt
        [HttpPost("{id:guid}/submit-director")]
        public async Task<IActionResult> SubmitToDirector(Guid id)
        {
            var result = await _projectService.SubmitToDirectorAsync(id, CurrentUserId());
            if (!result.IsSuccess) return BadRequest(new { error = result.Error });
            return Ok();
        }

        // POST /api/projects/{id}/approve — Giám đốc duyệt dự án
        [HttpPost("{id:guid}/approve")]
        public async Task<IActionResult> Approve(Guid id)
        {
            if (!User.IsInRole(nameof(UserSystemRole.TenantOwner)) && !User.IsInRole(nameof(UserSystemRole.SuperAdmin)))
            {
                return Forbid();
            }
            var result = await _projectService.ApproveProjectAsync(id, CurrentUserId());
            if (!result.IsSuccess) return BadRequest(new { error = result.Error });
            return Ok();
        }

        // POST /api/projects/{id}/reject — Giám đốc từ chối dự án + lý do
        [HttpPost("{id:guid}/reject")]
        public async Task<IActionResult> Reject(Guid id, [FromBody] RejectProjectDto dto)
        {
            if (!User.IsInRole(nameof(UserSystemRole.TenantOwner)) && !User.IsInRole(nameof(UserSystemRole.SuperAdmin)))
            {
                return Forbid();
            }
            var result = await _projectService.RejectProjectAsync(id, CurrentUserId(), dto.Reason);
            if (!result.IsSuccess) return BadRequest(new { error = result.Error });
            return Ok();
        }

        // GET /api/projects/pending-approval — Lấy danh sách dự án chờ duyệt (cho Giám đốc)
        [HttpGet("pending-approval")]
        public async Task<IActionResult> GetPendingApproval()
        {
            if (!User.IsInRole(nameof(UserSystemRole.TenantOwner)) && !User.IsInRole(nameof(UserSystemRole.SuperAdmin)))
            {
                return Forbid();
            }
            var projects = await _projectService.GetPendingApprovalProjectsAsync();
            return Ok(projects);
        }

        // GET /api/projects/{id}/members — Xem thành viên dự án
        [HttpGet("{id:guid}/members")]
        public async Task<IActionResult> GetMembers(Guid id)
        {
            var members = await _projectService.GetMembersAsync(id);
            return Ok(members);
        }

        // POST /api/projects/{id}/members — Leader thêm nhân viên
        [HttpPost("{id:guid}/members")]
        public async Task<IActionResult> AddMember(Guid id, [FromBody] AddProjectMemberDto dto)
        {
            var project = await _projectService.GetProjectByIdAsync(id, CurrentUserId(), CanSeeAllProjects(), IsLeader());
            if (project == null) return NotFound();

            if (!User.IsInRole(nameof(UserSystemRole.SuperAdmin)) &&
                !User.IsInRole(nameof(UserSystemRole.TenantOwner)) &&
                project.CreatedById != CurrentUserId())
            {
                return Forbid();
            }

            var result = await _projectService.AddMemberAsync(id, dto);
            if (!result.IsSuccess) return BadRequest(new { error = result.Error });
            return Ok();
        }

        // DELETE /api/projects/{id}/members/{userId} — Xóa thành viên khỏi dự án
        [HttpDelete("{id:guid}/members/{userId:guid}")]
        public async Task<IActionResult> RemoveMember(Guid id, Guid userId)
        {
            var project = await _projectService.GetProjectByIdAsync(id, CurrentUserId(), CanSeeAllProjects(), IsLeader());
            if (project == null) return NotFound();

            if (!User.IsInRole(nameof(UserSystemRole.SuperAdmin)) &&
                !User.IsInRole(nameof(UserSystemRole.TenantOwner)) &&
                project.CreatedById != CurrentUserId())
            {
                return Forbid();
            }

            var result = await _projectService.RemoveMemberAsync(id, userId);
            if (!result.IsSuccess) return BadRequest(new { error = result.Error });
            return Ok();
        }

        // PUT /api/projects/{id} — Cập nhật giờ giấc, ngân sách dự án
        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateProjectDto dto)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);

            var project = await _projectService.GetProjectByIdAsync(id, CurrentUserId(), CanSeeAllProjects(), IsLeader());
            if (project == null) return NotFound();

            if (!User.IsInRole(nameof(UserSystemRole.SuperAdmin)) &&
                !User.IsInRole(nameof(UserSystemRole.TenantOwner)) &&
                project.CreatedById != CurrentUserId())
            {
                return Forbid();
            }

            var result = await _projectService.UpdateProjectAsync(id, dto);
            if (!result.IsSuccess) return BadRequest(new { error = result.Error });
            return Ok();
        }

        // GET /api/projects/my-tasks — Employee xem tasks của mình ở tất cả dự án
        [HttpGet("my-tasks")]
        public async Task<IActionResult> GetMyTasks()
        {
            var tasks = await _projectService.GetMyTasksAcrossProjectsAsync(CurrentUserId());
            return Ok(tasks);
        }
    }

    public class CreateProjectFromAiRequest
    {
        public CreateProjectDto Project { get; set; } = null!;
        public AiProjectTemplateDto Template { get; set; } = null!;
    }
}
