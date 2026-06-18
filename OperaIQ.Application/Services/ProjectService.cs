using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using Microsoft.AspNetCore.Identity;
using OperaIQ.Application.Common;
using OperaIQ.Application.DTOs;
using OperaIQ.Domain.Entities;
using OperaIQ.Domain.Enums;

namespace OperaIQ.Application.Services
{
    public class ProjectService : IProjectService
    {
        private readonly ITenantRepository<Project> _projectRepo;
        private readonly ITenantRepository<ProjectMember> _memberRepo;
        private readonly ITenantRepository<ProjectPhase> _phaseRepo;
        private readonly ITenantRepository<ProjectTask> _taskRepo;
        private readonly IAiTaskService _aiTaskService;
        private readonly INotificationService _notificationService;
        private readonly UserManager<AppUser> _userManager;
        private readonly IMapper _mapper;

        public ProjectService(
            ITenantRepository<Project> projectRepo,
            ITenantRepository<ProjectMember> memberRepo,
            ITenantRepository<ProjectPhase> phaseRepo,
            ITenantRepository<ProjectTask> taskRepo,
            IAiTaskService aiTaskService,
            INotificationService notificationService,
            UserManager<AppUser> userManager,
            IMapper mapper)
        {
            _projectRepo = projectRepo;
            _memberRepo = memberRepo;
            _phaseRepo = phaseRepo;
            _taskRepo = taskRepo;
            _aiTaskService = aiTaskService;
            _notificationService = notificationService;
            _userManager = userManager;
            _mapper = mapper;
        }

        public async Task<IEnumerable<ProjectDto>> GetAllProjectsAsync(Guid userId, bool canSeeAll, bool isLeader = false)
        {
            // Include CreatedBy + Tasks để map đúng tên người tạo và số liệu task.
            // Ngoài ra cho Giám đốc/Admin có thể xem các dự án ở trạng thái duyệt khác nhau.
            IEnumerable<Project> projects;
            if (canSeeAll)
            {
                projects = await _projectRepo.FindAsync(p => true, p => p.CreatedBy, p => p.Tasks);
            }
            else if (isLeader)
            {
                // Leader chỉ xem dự án họ tạo
                projects = await _projectRepo.FindAsync(p => p.CreatedById == userId, p => p.CreatedBy, p => p.Tasks);
            }
            else
            {
                projects = await GetMemberProjectsAsync(userId);
            }

            return _mapper.Map<IEnumerable<ProjectDto>>(projects);
        }

        public async Task<ProjectDto?> GetProjectByIdAsync(Guid id, Guid userId, bool canSeeAll, bool isLeader = false)
        {
            var project = await _projectRepo.GetByIdAsync(id, p => p.CreatedBy, p => p.Tasks);
            if (project == null) return null;

            if (canSeeAll) return _mapper.Map<ProjectDto>(project);

            if (isLeader)
            {
                // Leader chỉ được xem dự án do họ tạo
                if (project.CreatedById != userId) return null;
            }
            else
            {
                // Nhân viên thường chỉ xem được dự án mình là thành viên hoặc do mình tạo.
                if (project.CreatedById != userId && !await IsMemberAsync(id, userId)) return null;
            }

            return _mapper.Map<ProjectDto>(project);
        }

        public async Task<bool> IsMemberAsync(Guid projectId, Guid userId)
        {
            var members = await _memberRepo.FindAsync(
                m => m.ProjectId == projectId && m.UserId == userId);
            return members.Any();
        }

        private async Task<IEnumerable<Project>> GetMemberProjectsAsync(Guid userId)
        {
            var memberships = await _memberRepo.FindAsync(m => m.UserId == userId);
            var projectIds = memberships.Select(m => m.ProjectId).ToHashSet();
            
            // Cho phép xem cả những dự án do chính user này tạo ra (dù chưa được add vào Members)
            var createdProjects = await _projectRepo.FindAsync(p => p.CreatedById == userId);
            var createdProjectIds = createdProjects.Select(p => p.Id).ToHashSet();
            
            projectIds.UnionWith(createdProjectIds);

            if (projectIds.Count == 0) return Enumerable.Empty<Project>();

            return await _projectRepo.FindAsync(
                p => projectIds.Contains(p.Id), p => p.CreatedBy, p => p.Tasks);
        }

        public async Task<Result<Guid>> CreateProjectAsync(CreateProjectDto dto)
        {
            var project = _mapper.Map<Project>(dto);
            project.Status = ProjectStatus.Active;
            project.ApprovalStatus = ProjectApprovalStatus.Approved; // Tạo trực tiếp mặc định là Approved luôn

            await _projectRepo.AddAsync(project);
            await _projectRepo.SaveChangesAsync();

            // Tự động gán người tạo làm Project Manager
            if (dto.CreatedById != Guid.Empty)
            {
                await _memberRepo.AddAsync(new ProjectMember
                {
                    ProjectId = project.Id,
                    UserId = dto.CreatedById,
                    Role = "Manager"
                });
                await _memberRepo.SaveChangesAsync();
            }

            return Result.Success(project.Id);
        }

        public async Task<Result> CompleteProjectAsync(Guid id)
        {
            var project = await _projectRepo.GetByIdAsync(id);
            if (project == null) return Result.Failure("Không tìm thấy dự án.");

            project.Status = ProjectStatus.Completed;
            project.DueDate = DateTime.UtcNow;

            _projectRepo.Update(project);
            await _projectRepo.SaveChangesAsync();

            return Result.Success();
        }

        // ── AI Project Flow ─────────────────────────────────────────
        
        public async Task<Result<AiProjectTemplateDto>> AiGenerateProjectTemplateAsync(string problemInput)
        {
            return await _aiTaskService.GenerateProjectAsync(problemInput);
        }

        public async Task<Result<Guid>> CreateAiDraftProjectAsync(CreateProjectDto dto, AiProjectTemplateDto template)
        {
            var project = new Project
            {
                Name = dto.Name,
                Description = dto.Description ?? template.Description,
                StartDate = dto.StartDate ?? DateTime.Today,
                DueDate = dto.DueDate ?? DateTime.Today.AddDays(template.EstimatedDurationDays),
                Budget = dto.Budget > 0 ? dto.Budget : template.EstimatedBudget,
                CustomerName = dto.CustomerName,
                Code = dto.Code,
                CreatedById = dto.CreatedById,
                ApprovalStatus = ProjectApprovalStatus.DraftAI,
                AiProblemInput = dto.Description, // Lưu lại vấn đề ban đầu của leader
                Status = ProjectStatus.Active
            };

            await _projectRepo.AddAsync(project);
            await _projectRepo.SaveChangesAsync();

            // Gán người tạo làm Project Manager
            if (dto.CreatedById != Guid.Empty)
            {
                await _memberRepo.AddAsync(new ProjectMember
                {
                    ProjectId = project.Id,
                    UserId = dto.CreatedById,
                    Role = "Manager"
                });
                await _memberRepo.SaveChangesAsync();
            }

            // Tạo các Phase và Task từ Template
            int phaseOrderIndex = 0;
            DateTime currentPhaseStart = project.StartDate ?? DateTime.Today;

            foreach (var phaseTemplate in template.Phases)
            {
                var phase = new ProjectPhase
                {
                    ProjectId = project.Id,
                    Name = phaseTemplate.Name,
                    OrderIndex = phaseOrderIndex++,
                    StartDate = currentPhaseStart,
                    EndDate = currentPhaseStart.AddDays(phaseTemplate.DurationDays),
                    ProgressPercent = 0
                };

                await _phaseRepo.AddAsync(phase);
                await _phaseRepo.SaveChangesAsync();

                // Tạo các Task trong phase này
                int taskOrder = 1;
                foreach (var taskTitle in phaseTemplate.Tasks)
                {
                    var task = new ProjectTask
                    {
                        ProjectId = project.Id,
                        PhaseId = phase.Id,
                        Title = taskTitle,
                        Code = $"{project.Code ?? "PRJ"}-P{phase.OrderIndex + 1}-T{taskOrder++}",
                        Status = Domain.Enums.TaskStatus.Todo,
                        Priority = TaskPriority.Medium,
                        ProgressPercent = 0,
                        EstimatedHours = 8 * phaseTemplate.DurationDays / Math.Max(1, phaseTemplate.Tasks.Count),
                        DueDate = phase.EndDate
                    };

                    await _taskRepo.AddAsync(task);
                }

                await _taskRepo.SaveChangesAsync();
                currentPhaseStart = phase.EndDate ?? currentPhaseStart;
            }

            return Result.Success(project.Id);
        }

        public async Task<Result> SubmitToDirectorAsync(Guid projectId, Guid leaderId)
        {
            var project = await _projectRepo.GetByIdAsync(projectId);
            if (project == null) return Result.Failure("Không tìm thấy dự án.");

            if (project.ApprovalStatus != ProjectApprovalStatus.DraftAI && project.ApprovalStatus != ProjectApprovalStatus.Rejected)
            {
                return Result.Failure("Dự án phải ở trạng thái Nháp AI hoặc Bị từ chối mới có thể gửi duyệt.");
            }

            project.ApprovalStatus = ProjectApprovalStatus.PendingDirector;
            _projectRepo.Update(project);
            await _projectRepo.SaveChangesAsync();

            // Tìm và thông báo cho tất cả Giám đốc (TenantOwner)
            var directors = await _userManager.GetUsersInRoleAsync(nameof(UserSystemRole.TenantOwner));
            foreach (var director in directors)
            {
                if (director.TenantId == project.TenantId)
                {
                    await _notificationService.SendNotificationAsync(
                        director.Id,
                        "Dự án mới chờ duyệt",
                        $"Dự án '{project.Name}' do Leader tạo qua AI đang chờ bạn duyệt.",
                        "info");
                }
            }

            return Result.Success();
        }

        // ── Director Approval ────────────────────────────────────────

        public async Task<Result> ApproveProjectAsync(Guid projectId, Guid directorId)
        {
            var project = await _projectRepo.GetByIdAsync(projectId);
            if (project == null) return Result.Failure("Không tìm thấy dự án.");

            if (project.ApprovalStatus != ProjectApprovalStatus.PendingDirector)
            {
                return Result.Failure("Dự án không ở trạng thái chờ duyệt.");
            }

            project.ApprovalStatus = ProjectApprovalStatus.Approved;
            _projectRepo.Update(project);
            await _projectRepo.SaveChangesAsync();

            // Gửi thông báo cho Leader
            await _notificationService.SendNotificationAsync(
                project.CreatedById,
                "Dự án đã được duyệt",
                $"Dự án '{project.Name}' của bạn đã được Giám đốc duyệt và sẵn sàng triển khai.",
                "success");

            return Result.Success();
        }

        public async Task<Result> RejectProjectAsync(Guid projectId, Guid directorId, string reason)
        {
            var project = await _projectRepo.GetByIdAsync(projectId);
            if (project == null) return Result.Failure("Không tìm thấy dự án.");

            if (project.ApprovalStatus != ProjectApprovalStatus.PendingDirector)
            {
                return Result.Failure("Dự án không ở trạng thái chờ duyệt.");
            }

            project.ApprovalStatus = ProjectApprovalStatus.Rejected;
            project.RejectionReason = reason;
            _projectRepo.Update(project);
            await _projectRepo.SaveChangesAsync();

            // Gửi thông báo cho Leader kèm lý do
            await _notificationService.SendNotificationAsync(
                project.CreatedById,
                "Dự án bị từ chối duyệt",
                $"Dự án '{project.Name}' của bạn đã bị từ chối. Lý do: {reason}",
                "warning");

            return Result.Success();
        }

        public async Task<IEnumerable<ProjectDto>> GetPendingApprovalProjectsAsync()
        {
            var projects = await _projectRepo.FindAsync(
                p => p.ApprovalStatus == ProjectApprovalStatus.PendingDirector,
                p => p.CreatedBy, p => p.Tasks);

            return _mapper.Map<IEnumerable<ProjectDto>>(projects);
        }

        // ── Member Management ────────────────────────────────────────

        public async Task<Result> AddMemberAsync(Guid projectId, AddProjectMemberDto dto)
        {
            if (await IsMemberAsync(projectId, dto.UserId))
            {
                return Result.Failure("Người dùng này đã là thành viên của dự án.");
            }

            var member = new ProjectMember
            {
                ProjectId = projectId,
                UserId = dto.UserId,
                Role = dto.Role
            };

            await _memberRepo.AddAsync(member);
            await _memberRepo.SaveChangesAsync();

            // Gửi thông báo cho nhân viên được thêm
            await _notificationService.SendNotificationAsync(
                dto.UserId,
                "Bạn được thêm vào dự án mới",
                $"Bạn vừa được thêm vào làm thành viên dự án.",
                "info");

            return Result.Success();
        }

        public async Task<Result> RemoveMemberAsync(Guid projectId, Guid userId)
        {
            var members = await _memberRepo.FindAsync(m => m.ProjectId == projectId && m.UserId == userId);
            var member = members.FirstOrDefault();
            if (member == null)
            {
                return Result.Failure("Thành viên không tồn tại trong dự án.");
            }

            _memberRepo.Delete(member);
            await _memberRepo.SaveChangesAsync();
            return Result.Success();
        }

        public async Task<IEnumerable<ProjectMemberDto>> GetMembersAsync(Guid projectId)
        {
            var members = await _memberRepo.FindAsync(
                m => m.ProjectId == projectId,
                m => m.User);

            return members.Select(m => new ProjectMemberDto
            {
                UserId = m.UserId,
                FullName = m.User.FullName,
                Email = m.User.Email ?? string.Empty,
                Role = m.Role,
                AvatarUrl = m.User.AvatarUrl
            });
        }

        public async Task<Result> UpdateProjectAsync(Guid id, UpdateProjectDto dto)
        {
            var project = await _projectRepo.GetByIdAsync(id);
            if (project == null) return Result.Failure("Không tìm thấy dự án.");

            project.Name = dto.Name;
            project.Description = dto.Description;
            project.StartDate = dto.StartDate;
            project.DueDate = dto.DueDate;
            project.Budget = dto.Budget;

            _projectRepo.Update(project);
            await _projectRepo.SaveChangesAsync();
            return Result.Success();
        }

        // ── Employee: tasks across projects ─────────────────────────

        public async Task<IEnumerable<MyProjectTaskDto>> GetMyTasksAcrossProjectsAsync(Guid userId)
        {
            var tasks = await _taskRepo.FindAsync(
                t => t.AssignedToId == userId,
                t => t.Project);

            return tasks.Select(t => new MyProjectTaskDto
            {
                TaskId = t.Id,
                TaskTitle = t.Title,
                ProjectId = t.ProjectId,
                ProjectName = t.Project.Name,
                Status = t.Status.ToString(),
                Priority = t.Priority.ToString(),
                DueDate = t.DueDate,
                ProgressPercent = t.ProgressPercent,
                IsAiAssigned = t.IsAiAssigned
            });
        }
    }
}
