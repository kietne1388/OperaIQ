using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OperaIQ.Application.DTOs;
using OperaIQ.Application.Services;
using OperaIQ.Domain.Enums;
using TaskStatus = OperaIQ.Domain.Enums.TaskStatus;

namespace OperaIQ.Web.Controllers
{
    [ApiController]
    [Route("api/tasks")]
    [Authorize(Policy = "TenantMember")]
    public class TasksController : ControllerBase
    {
        private readonly ITaskService _taskService;
        private readonly IProjectService _projectService;

        public TasksController(ITaskService taskService, IProjectService projectService)
        {
            _taskService = taskService;
            _projectService = projectService;
        }

        // GET /api/tasks/my — công việc được giao cho user hiện tại.
        [HttpGet("my")]
        public async Task<IActionResult> My()
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var tasks = await _taskService.GetMyTasksAsync(userId);
            return Ok(tasks);
        }

        private Guid CurrentUserId() =>
            Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        private bool CanSeeAllTasks() =>
            User.IsInRole(nameof(UserSystemRole.TenantOwner)) ||
            User.IsInRole(nameof(UserSystemRole.SuperAdmin));

        private bool IsLeader() =>
            User.IsInRole(nameof(UserSystemRole.TenantAdmin));

        // GET /api/tasks/by-project/{projectId}
        [HttpGet("by-project/{projectId:guid}")]
        public async Task<IActionResult> ByProject(Guid projectId)
        {
            var userId = CurrentUserId();
            var canSeeAll = CanSeeAllTasks();

            if (IsLeader())
            {
                // Leader chỉ xem được dự án bản thân tạo
                var project = await _projectService.GetProjectByIdAsync(projectId, userId, false, true);
                if (project == null || project.CreatedById != userId) return Forbid();
            }

            var tasks = await _taskService.GetTasksByProjectAsync(projectId, userId, canSeeAll);
            if (tasks == null) return Forbid(); // không phải thành viên dự án
            return Ok(tasks);
        }

        // GET /api/tasks/{id}
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var task = await _taskService.GetTaskByIdAsync(id);
            if (task == null) return NotFound();
            return Ok(task);
        }

        // POST /api/tasks
        [HttpPost]
        [Authorize(Policy = "CanCreateTask")]
        public async Task<IActionResult> Create([FromBody] CreateTaskDto dto)
        {
            if (!ModelState.IsValid) return ValidationProblem(ModelState);

            if (IsLeader())
            {
                // Leader chỉ được tạo task trong dự án họ tạo
                var project = await _projectService.GetProjectByIdAsync(dto.ProjectId, CurrentUserId(), false, true);
                if (project == null || project.CreatedById != CurrentUserId()) return Forbid();
            }

            var result = await _taskService.CreateTaskAsync(dto);
            if (!result.IsSuccess)
            {
                return BadRequest(new { error = result.Error });
            }

            var created = await _taskService.GetTaskByIdAsync(result.Value);
            return CreatedAtAction(nameof(GetById), new { id = result.Value }, created);
        }

        // PUT /api/tasks/{id}/status
        [HttpPut("{id:guid}/status")]
        public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateTaskStatusDto dto)
        {
            var result = await _taskService.UpdateTaskStatusAsync(id, dto.Status);
            if (!result.IsSuccess)
            {
                return BadRequest(new { error = result.Error });
            }
            return Ok(new { success = true, status = dto.Status.ToString() });
        }

        // POST /api/tasks/{id}/ai-assign — tự động phân công bằng AI (Claude/mock).
        [HttpPost("{id:guid}/ai-assign")]
        [Authorize(Policy = "CanAssignTask")]
        public async Task<IActionResult> AiAssign(Guid id)
        {
            if (IsLeader())
            {
                var task = await _taskService.GetTaskByIdAsync(id);
                if (task == null) return NotFound();
                var project = await _projectService.GetProjectByIdAsync(task.ProjectId, CurrentUserId(), false, true);
                if (project == null || project.CreatedById != CurrentUserId()) return Forbid();
            }

            var result = await _taskService.AutoAssignTaskWithAiAsync(id);
            if (!result.IsSuccess)
            {
                return BadRequest(new { error = result.Error });
            }

            var taskAfter = await _taskService.GetTaskByIdAsync(id);
            return Ok(new { success = true, assigneeName = taskAfter?.AssignedToName, reason = taskAfter?.AiReason });
        }
    }
}
