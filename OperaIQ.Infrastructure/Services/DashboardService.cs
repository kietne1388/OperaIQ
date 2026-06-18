using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using AutoMapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using OperaIQ.Application.Common;
using OperaIQ.Application.DTOs;
using OperaIQ.Application.Services;
using OperaIQ.Infrastructure.Data;
using TaskStatus = OperaIQ.Domain.Enums.TaskStatus;

namespace OperaIQ.Infrastructure.Services
{
    // Tổng hợp số liệu cho Dashboard. Logic trước đây nằm trong DashboardController.Index,
    // chuyển vào service để Controller không chứa business logic (rule.md §2).
    public class DashboardService : IDashboardService
    {
        private readonly IProjectService _projectService;
        private readonly IDocumentService _documentService;
        private readonly ITaskService _taskService;
        private readonly ApplicationDbContext _context;
        private readonly IMapper _mapper;
        private readonly IConfiguration _configuration;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<DashboardService> _logger;

        public DashboardService(
            IProjectService projectService,
            IDocumentService documentService,
            ITaskService taskService,
            ApplicationDbContext context,
            IMapper mapper,
            IConfiguration configuration,
            IHttpClientFactory httpClientFactory,
            ILogger<DashboardService> _log)
        {
            _projectService = projectService;
            _documentService = documentService;
            _taskService = taskService;
            _context = context;
            _mapper = mapper;
            _configuration = configuration;
            _httpClientFactory = httpClientFactory;
            _logger = _log;
        }

        public async Task<DashboardSummaryDto> GetSummaryAsync(Guid userId, bool canSeeAll)
        {
            var projects = await _projectService.GetAllProjectsAsync(userId, canSeeAll);
            var documents = await _documentService.GetAllDocumentsAsync();
            var myTasks = await _taskService.GetMyTasksAsync(userId);

            // 5 task mới nhất trong phạm vi user được phép thấy.
            // canSeeAll → toàn tenant; ngược lại → chỉ task thuộc dự án user tham gia.
            var recentQuery = _context.Tasks
                .AsNoTracking()
                .Include(t => t.Project)
                .Include(t => t.AssignedTo)
                .AsQueryable();

            if (!canSeeAll)
            {
                var projectIds = projects.Select(p => p.Id).ToList();
                recentQuery = recentQuery.Where(t => projectIds.Contains(t.ProjectId));
            }

            var recentTasks = await recentQuery
                .OrderByDescending(t => t.CreatedAt)
                .Take(5)
                .ToListAsync();

            return new DashboardSummaryDto
            {
                ProjectCount = projects.Count(),
                DocumentCount = documents.Count(),
                TaskCount = myTasks.Count(),
                CompletedTaskCount = myTasks.Count(t => t.Status == TaskStatus.Done),
                RecentTasks = _mapper.Map<List<TaskDto>>(recentTasks)
            };
        }

        public async Task<Result<string>> GetAiReportAsync(Guid userId, bool canSeeAll)
        {
            var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
            if (user == null) return Result.Failure<string>("Không tìm thấy người dùng.");

            Guid? tenantId = user.TenantId;
            Guid? departmentId = user.DepartmentId;

            int totalProjectsCount;
            int activeProjectsCount;
            int totalTasksCount;
            int completedTasksCount;
            int inProgressTasksCount;
            int reviewTasksCount;
            int overdueTasksCount;
            int employeeCount;
            double avgWorkload = 0;
            decimal totalBudget = 0;

            var today = DateTime.UtcNow;

            if (canSeeAll)
            {
                totalProjectsCount = await _context.Projects.AsNoTracking().CountAsync(p => p.TenantId == tenantId && !p.IsDeleted);
                activeProjectsCount = await _context.Projects.AsNoTracking().CountAsync(p => p.TenantId == tenantId && !p.IsDeleted && p.Status == Domain.Enums.ProjectStatus.Active);
                
                var tasks = await _context.Tasks.AsNoTracking().Where(t => t.TenantId == tenantId && !t.IsDeleted).ToListAsync();
                totalTasksCount = tasks.Count;
                completedTasksCount = tasks.Count(t => t.Status == Domain.Enums.TaskStatus.Done);
                inProgressTasksCount = tasks.Count(t => t.Status == Domain.Enums.TaskStatus.InProgress);
                reviewTasksCount = tasks.Count(t => t.Status == Domain.Enums.TaskStatus.Review);
                overdueTasksCount = tasks.Count(t => t.Status != Domain.Enums.TaskStatus.Done && t.DueDate < today);

                employeeCount = await _context.Users.AsNoTracking().CountAsync(u => u.TenantId == tenantId && !u.IsDeleted);

                var workloads = await _context.WorkloadSnapshots.AsNoTracking()
                    .Where(w => w.TenantId == tenantId)
                    .GroupBy(w => w.UserId)
                    .Select(g => g.OrderByDescending(w => w.SnapshotDate).FirstOrDefault())
                    .Where(w => w != null)
                    .ToListAsync();
                if (workloads.Any())
                {
                    avgWorkload = workloads.Average(w => w.LoadPercent);
                }

                totalBudget = await _context.Projects.AsNoTracking()
                    .Where(p => p.TenantId == tenantId && !p.IsDeleted)
                    .SumAsync(p => p.Budget);
            }
            else
            {
                var myProjectIds = await _context.ProjectMembers.AsNoTracking().Where(pm => pm.UserId == userId).Select(pm => pm.ProjectId).ToListAsync();
                
                totalProjectsCount = myProjectIds.Count;
                activeProjectsCount = await _context.Projects.AsNoTracking().CountAsync(p => myProjectIds.Contains(p.Id) && p.Status == Domain.Enums.ProjectStatus.Active && !p.IsDeleted);

                var tasks = await _context.Tasks.AsNoTracking().Where(t => t.TenantId == tenantId && !t.IsDeleted && (t.AssignedToId == userId || myProjectIds.Contains(t.ProjectId))).ToListAsync();
                totalTasksCount = tasks.Count;
                completedTasksCount = tasks.Count(t => t.Status == Domain.Enums.TaskStatus.Done);
                inProgressTasksCount = tasks.Count(t => t.Status == Domain.Enums.TaskStatus.InProgress);
                reviewTasksCount = tasks.Count(t => t.Status == Domain.Enums.TaskStatus.Review);
                overdueTasksCount = tasks.Count(t => t.Status != Domain.Enums.TaskStatus.Done && t.DueDate < today);

                employeeCount = await _context.Users.AsNoTracking().CountAsync(u => u.TenantId == tenantId && !u.IsDeleted && u.DepartmentId == departmentId);

                var workloads = await _context.WorkloadSnapshots.AsNoTracking()
                    .Where(w => w.TenantId == tenantId && w.User.DepartmentId == departmentId)
                    .GroupBy(w => w.UserId)
                    .Select(g => g.OrderByDescending(w => w.SnapshotDate).FirstOrDefault())
                    .Where(w => w != null)
                    .ToListAsync();
                if (workloads.Any())
                {
                    avgWorkload = workloads.Average(w => w.LoadPercent);
                }
            }

            var contextBuilder = new StringBuilder();
            contextBuilder.AppendLine("### DỮ LIỆU VẬN HÀNH THỰC TẾ:");
            contextBuilder.AppendLine($"- Phạm vi phân tích: {(canSeeAll ? "Toàn công ty" : "Phòng ban & dự án tham gia")}");
            contextBuilder.AppendLine($"- Tổng số dự án đang chạy: {activeProjectsCount} / {totalProjectsCount}");
            contextBuilder.AppendLine($"- Tổng số công việc: {totalTasksCount}");
            contextBuilder.AppendLine($"- Công việc đã hoàn thành: {completedTasksCount}");
            contextBuilder.AppendLine($"- Công việc đang thực hiện: {inProgressTasksCount}");
            contextBuilder.AppendLine($"- Công việc đang chờ duyệt (Review): {reviewTasksCount}");
            contextBuilder.AppendLine($"- Công việc trễ hạn (Overdue): {overdueTasksCount}");
            contextBuilder.AppendLine($"- Tổng nhân sự quản lý: {employeeCount}");
            contextBuilder.AppendLine($"- Tải lượng trung bình nhân sự: {avgWorkload:F1}%");
            if (canSeeAll)
            {
                contextBuilder.AppendLine($"- Tổng ngân sách dự án: {totalBudget:N0} VND");
            }
            else
            {
                contextBuilder.AppendLine($"- Tổng ngân sách dự án: ẨN (Không có quyền xem)");
            }

            string prompt = $"""
            Bạn là chuyên gia phân tích vận hành doanh nghiệp thông minh của hệ thống OperaIQ.
            Dựa trên dữ liệu thực tế dưới đây, hãy lập một báo cáo phân tích tổng quan hoạt động của công ty.
            Tuyệt đối tránh viết rập khuôn, máy móc. Hãy chỉ ra trực tiếp:
            1. Đánh giá khách quan về tình hình vận hành hiện tại (tỷ lệ hoàn thành công việc, số công việc trễ hạn, tải lượng nhân sự).
            2. Chỉ ra các điểm nghẽn hoặc rủi ro (ví dụ: công việc trễ hạn cao, nhân viên quá tải >80% hoặc thiếu việc làm, dự án chậm tiến độ).
            3. Đưa ra 3 lời khuyên / hành động thực tế và cụ thể cho Ban Giám Đốc hoặc Quản lý để cải thiện hiệu suất.

            NỘI DUNG DỮ LIỆU:
            {contextBuilder}

            YÊU CẦU TRÌNH BÀY:
            - Viết bằng Tiếng Việt.
            - Định dạng Markdown đẹp mắt, sử dụng icon biểu tượng, gạch đầu dòng, tô đậm từ khóa quan trọng.
            - Ngắn gọn, súc tích (khoảng 300-400 từ), đi thẳng vào vấn đề.
            """;

            string apiKey = _configuration["Gemini:ApiKey"] ?? string.Empty;
            if (string.IsNullOrWhiteSpace(apiKey) || apiKey == "YOUR_GEMINI_API_KEY_HERE")
            {
                string mockReport = $"""
                ### 📊 Báo Cáo Phân Tích Vận Hành AI (Chế độ mô phỏng)
                
                #### 1. Đánh giá tình hình hiện tại
                - Công ty đang quản lý **{totalProjectsCount} dự án** (với **{activeProjectsCount}** dự án đang chạy). Tỷ lệ hoàn thành công việc đạt **{(totalTasksCount > 0 ? (completedTasksCount * 100.0 / totalTasksCount) : 0):F1}%** ({completedTasksCount}/{totalTasksCount} công việc).
                - Tải lượng trung bình của nhân sự ở mức **{avgWorkload:F1}%**, thuộc ngưỡng an toàn trung bình nhưng cần kiểm tra phân bổ tải lẻ ở các nhóm.
                
                #### 2. Các điểm nghẽn & Rủi ro phát hiện
                - Có **{overdueTasksCount} công việc trễ hạn**. Đây là điểm nghẽn chính ảnh hưởng tới tiến độ chung của các dự án đang chạy.
                - Số lượng việc đang chờ duyệt (Review) là **{reviewTasksCount}**. Điều này cho thấy khâu kiểm duyệt kết quả công việc đang bị ùn ứ nhẹ, cần đẩy nhanh tiến độ phê duyệt để giải phóng nhân lực.
                
                #### 3. Đề xuất & Lời khuyên hành động
                1. 🔴 **Xử lý trễ hạn**: Tổ chức họp rà soát khẩn cấp đối với **{overdueTasksCount} công việc trễ hạn** để tháo gỡ khó khăn kỹ thuật hoặc tái phân bổ nhân lực.
                2. 🟢 **Đẩy nhanh phê duyệt**: Yêu cầu các Team Lead và Project Manager giải quyết dứt điểm **{reviewTasksCount} công việc đang chờ duyệt** trong vòng 24-48 giờ tới.
                3. 🔵 **Cân bằng tải lượng**: Phân bổ lại tài nguyên từ các nhóm có tải lượng thấp sang các dự án trọng điểm đang bị trễ hạn để tối ưu năng suất.
                """;
                return Result.Success(mockReport);
            }

            try
            {
                var httpClient = _httpClientFactory.CreateClient();
                var contents = new[]
                {
                    new { role = "user", parts = new[] { new { text = prompt } } }
                };

                var requestBody = new { contents = contents };
                string url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={apiKey}";

                var response = await httpClient.PostAsync(url, new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json"));
                if (response.IsSuccessStatusCode)
                {
                    var responseString = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(responseString);
                    var candidates = doc.RootElement.GetProperty("candidates");
                    if (candidates.GetArrayLength() > 0)
                    {
                        var text = candidates[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString();
                        return Result.Success(text ?? "Không nhận được phản hồi từ AI.");
                    }
                }

                _logger.LogWarning($"Gemini API error status: {response.StatusCode}. Return fallback simulation.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi gọi Gemini để phân tích vận hành.");
            }

            return Result.Success($"[Mô phỏng - Lỗi kết nối AI] Hệ thống hiện đang theo dõi {activeProjectsCount} dự án đang chạy với {overdueTasksCount} công việc trễ hạn. Vui lòng kiểm tra lại kết nối mạng hoặc quota API Key.");
        }
    }
}
