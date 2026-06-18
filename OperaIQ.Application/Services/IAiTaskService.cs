using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using OperaIQ.Application.Common;
using OperaIQ.Application.DTOs;

namespace OperaIQ.Application.Services
{
    public interface IAiTaskService
    {
        Task<Result<AiAssignmentDto>> SuggestAssigneeAsync(
            CreateTaskDto taskDto,
            IEnumerable<EmployeeProfileDto> availableEmployees,
            CancellationToken ct = default);

        Task<Result<string>> SummarizeDocumentAsync(
            string documentContent,
            CancellationToken ct = default);

        /// <summary>
        /// Leader nhập vấn đề → AI sinh template dự án hoàn chỉnh
        /// (tên, mô tả, ngân sách, thời gian, giai đoạn, tasks)
        /// </summary>
        Task<Result<AiProjectTemplateDto>> GenerateProjectAsync(
            string problemInput,
            CancellationToken ct = default);

        /// <summary>
        /// Giao tiếp trực tiếp với AI (Gemini hoặc Claude)
        /// </summary>
        Task<Result<string>> ChatAsync(
            AiChatRequestDto request,
            string systemContext,
            CancellationToken ct = default);
    }
}
