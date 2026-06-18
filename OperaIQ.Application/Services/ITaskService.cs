using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using OperaIQ.Application.Common;
using OperaIQ.Application.DTOs;
using OperaIQ.Domain.Enums;
using TaskStatus = OperaIQ.Domain.Enums.TaskStatus;

namespace OperaIQ.Application.Services
{
    public interface ITaskService
    {
        // Trả về null nếu user không có quyền xem dự án (không phải thành viên và không canSeeAll).
        Task<IEnumerable<TaskDto>?> GetTasksByProjectAsync(Guid projectId, Guid userId, bool canSeeAll);
        Task<IEnumerable<TaskDto>> GetMyTasksAsync(Guid userId);
        Task<TaskDto?> GetTaskByIdAsync(Guid id);
        Task<Result<Guid>> CreateTaskAsync(CreateTaskDto dto);
        Task<Result> UpdateTaskStatusAsync(Guid id, TaskStatus status);
        Task<Result> AutoAssignTaskWithAiAsync(Guid taskId); // Tự động gán bằng AI Claude
    }
}
