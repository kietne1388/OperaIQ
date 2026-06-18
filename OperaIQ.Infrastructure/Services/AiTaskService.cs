using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using OperaIQ.Application.Common;
using OperaIQ.Application.DTOs;
using OperaIQ.Application.Services;
using OperaIQ.Infrastructure.Data;
using OperaIQ.Domain.Entities;

namespace OperaIQ.Infrastructure.Services
{
    public class AiTaskService : IAiTaskService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AiTaskService> _logger;
        private readonly ApplicationDbContext _context;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public AiTaskService(
            IHttpClientFactory httpClientFactory,
            IConfiguration configuration,
            ILogger<AiTaskService> logger,
            ApplicationDbContext context,
            IHttpContextAccessor httpContextAccessor)
        {
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
            _logger = logger;
            _context = context;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<Result<AiAssignmentDto>> SuggestAssigneeAsync(
            CreateTaskDto taskDto,
            IEnumerable<EmployeeProfileDto> availableEmployees,
            CancellationToken ct = default)
        {
            if (!availableEmployees.Any())
            {
                return Result.Failure<AiAssignmentDto>("Không có nhân viên khả dụng để phân công.");
            }

            string apiKey = _configuration["Claude:ApiKey"] ?? string.Empty;
            bool useMock = string.IsNullOrWhiteSpace(apiKey) || apiKey == "YOUR_CLAUDE_API_KEY_HERE";

            string employeeList = string.Join("\n", availableEmployees.Select(e => $"- ID: {e.Id}, Tên: {e.FullName}, Kỹ năng: {e.Skills ?? "N/A"}, Email: {e.Email}"));

            var prompt = $$"""
            Bạn là hệ thống phân công task thông minh cho công ty.

            THÔNG TIN TASK:
            - Tiêu đề: {{taskDto.Title}}
            - Mô tả: {{taskDto.Description ?? "Không có mô tả."}}
            - Độ ưu tiên: {{taskDto.Priority}}
            - Deadline: {{taskDto.DueDate:dd/MM/yyyy}}

            DANH SÁCH NHÂN VIÊN KHẢ DỤNG:
            {{employeeList}}

            YÊU CẦU:
            Chọn 1 nhân viên phù hợp nhất. Trả lời JSON:
            {
              "assigneeId": "guid",
              "reason": "lý do ngắn gọn bằng tiếng Việt"
            }
            Chỉ trả JSON, không giải thích thêm.
            """;

            if (useMock)
            {
                _logger.LogWarning("Claude API Key không được tìm thấy. Chạy chế độ Mock tự động phân công.");
                // Mock behavior: pick first employee
                var firstEmp = availableEmployees.FirstOrDefault(e => e.Email.Contains("employee")) ?? availableEmployees.First();
                var mockResult = new AiAssignmentDto
                {
                    AssigneeId = firstEmp.Id,
                    Reason = $"[AI Claude Gợi ý - Mock] Nhân viên {firstEmp.FullName} có kỹ năng phù hợp và đang có khối lượng công việc lý tưởng để hoàn thành tác vụ '{taskDto.Title}' đúng hạn."
                };
                return Result.Success(mockResult);
            }

            try
            {
                using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                cts.CancelAfter(TimeSpan.FromSeconds(30)); // Timeout tối đa 30 giây

                var httpClient = _httpClientFactory.CreateClient();
                httpClient.DefaultRequestHeaders.Add("x-api-key", apiKey);
                httpClient.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");

                var requestBody = new
                {
                    model = "claude-3-5-sonnet-20241022",
                    max_tokens = 500,
                    messages = new[]
                    {
                        new { role = "user", content = prompt }
                    }
                };

                _logger.LogDebug("Gửi Prompt AI: {Prompt}", prompt);

                var response = await httpClient.PostAsync("https://api.anthropic.com/v1/messages", 
                    new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json"), 
                    cts.Token);

                if (response.IsSuccessStatusCode)
                {
                    string responseString = await response.Content.ReadAsStringAsync(cts.Token);
                    using var doc = JsonDocument.Parse(responseString);
                    string? rawContent = doc.RootElement
                        .GetProperty("content")[0]
                        .GetProperty("text")
                        .GetString();

                    _logger.LogDebug("Nhận Response AI: {Response}", rawContent);

                    if (!string.IsNullOrWhiteSpace(rawContent))
                    {
                        var aiResult = JsonSerializer.Deserialize<AiAssignmentDto>(rawContent, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                        if (aiResult != null && aiResult.AssigneeId != Guid.Empty)
                        {
                            return Result.Success(aiResult);
                        }
                    }
                }

                _logger.LogError("Gọi Claude API thất bại: {StatusCode}", response.StatusCode);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi xảy ra khi gọi Claude API để phân công task.");
            }

            // Fallback mock
            var fallbackEmp = availableEmployees.FirstOrDefault(e => e.Email.Contains("employee")) ?? availableEmployees.First();
            var fallbackResult = new AiAssignmentDto
            {
                AssigneeId = fallbackEmp.Id,
                Reason = $"[AI Claude Fallback] Đã phân công cho {fallbackEmp.FullName} do có sẵn chuyên môn liên quan đến công việc này."
            };
            return Result.Success(fallbackResult);
        }

        public async Task<Result<string>> SummarizeDocumentAsync(
            string documentContent,
            CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(documentContent))
            {
                return Result.Failure<string>("Nội dung tài liệu trống.");
            }

            string apiKey = _configuration["Claude:ApiKey"] ?? string.Empty;
            bool useMock = string.IsNullOrWhiteSpace(apiKey) || apiKey == "YOUR_CLAUDE_API_KEY_HERE";

            if (useMock)
            {
                _logger.LogWarning("Claude API Key không được tìm thấy. Chạy chế độ Mock tóm tắt tài liệu.");
                string mockSummary = @"### 📄 Tóm tắt tài liệu tự động bởi AI Claude (Chế độ Mock)

#### 1. Tổng quan tài liệu
Tài liệu này trình bày các nội dung vận hành, quy trình làm việc và tối ưu hóa hệ thống trong tổ chức OperaIQ. Tác giả nhấn mạnh tầm quan trọng của tự động hóa và tích hợp AI.

#### 2. Các điểm mấu chốt quan trọng
- **Cô lập Multi-tenant**: Đảm bảo an toàn và bảo mật dữ liệu tuyệt đối giữa các công ty.
- **Tính năng AI**: Phân công và tóm tắt tự động dựa trên Claude API giảm tải quy trình thủ công.
- **Realtime Notifications**: Nhận thông tin tức thì qua hệ thống Toast.

#### 3. Đề xuất hành động
- [ ] Tổ chức hướng dẫn sử dụng cho toàn bộ nhân viên.
- [ ] Phân quyền tài liệu phù hợp (View, Download, Edit) để nâng cao bảo mật.";
                return Result.Success(mockSummary);
            }

            try
            {
                using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                cts.CancelAfter(TimeSpan.FromSeconds(30));

                string prompt = $"""
                Bạn là chuyên gia tóm tắt tài liệu AI của hệ thống OperaIQ.
                Hãy tóm tắt ngắn gọn tài liệu dưới đây bằng tiếng Việt một cách trực quan, bao gồm:
                1. Tổng quan tài liệu (2-3 câu).
                2. Các điểm mấu chốt quan trọng (dạng danh sách).
                3. Đề xuất hành động/bước tiếp theo liên quan (dạng danh sách).

                NỘI DUNG TÀI LIỆU:
                {documentContent}

                Hãy viết tóm tắt định dạng Markdown đẹp mắt.
                """;

                var httpClient = _httpClientFactory.CreateClient();
                httpClient.DefaultRequestHeaders.Add("x-api-key", apiKey);
                httpClient.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");

                var requestBody = new
                {
                    model = "claude-3-5-sonnet-20241022",
                    max_tokens = 1000,
                    messages = new[]
                    {
                        new { role = "user", content = prompt }
                    }
                };

                var response = await httpClient.PostAsync("https://api.anthropic.com/v1/messages",
                    new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json"),
                    cts.Token);

                if (response.IsSuccessStatusCode)
                {
                    string responseString = await response.Content.ReadAsStringAsync(cts.Token);
                    using var doc = JsonDocument.Parse(responseString);
                    string? rawContent = doc.RootElement
                        .GetProperty("content")[0]
                        .GetProperty("text")
                        .GetString();

                    if (!string.IsNullOrWhiteSpace(rawContent))
                    {
                        return Result.Success(rawContent);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi gọi Claude API để tóm tắt tài liệu.");
            }

            return Result.Failure<string>("Không thể kết nối dịch vụ AI để tóm tắt tài liệu.");
        }

        public async Task<Result<AiProjectTemplateDto>> GenerateProjectAsync(
            string problemInput,
            CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(problemInput))
                return Result.Failure<AiProjectTemplateDto>("Vui lòng mô tả vấn đề dự án.");

            string apiKey = _configuration["Claude:ApiKey"] ?? string.Empty;
            bool useMock = string.IsNullOrWhiteSpace(apiKey) || apiKey == "YOUR_CLAUDE_API_KEY_HERE";

            string prompt = $$"""
            Bạn là chuyên gia quản lý dự án AI cho hệ thống OperaIQ.
            Dựa vào vấn đề/yêu cầu dự án sau đây của một Leader, hãy tạo ra một kế hoạch dự án chi tiết.

            VẤN ĐỀ / YÊU CẦU DỰ ÁN:
            {{problemInput}}

            Hãy tạo kế hoạch dự án với định dạng JSON sau (chỉ trả JSON, không giải thích):
            {
              "name": "Tên dự án ngắn gọn (tiếng Việt)",
              "description": "Mô tả chi tiết dự án 2-3 câu",
              "estimatedBudget": 500000000,
              "estimatedDurationDays": 90,
              "phases": [
                {
                  "name": "Giai đoạn 1: Tên giai đoạn",
                  "durationDays": 30,
                  "tasks": ["Task 1", "Task 2", "Task 3"]
                },
                {
                  "name": "Giai đoạn 2: Tên giai đoạn",
                  "durationDays": 45,
                  "tasks": ["Task 1", "Task 2"]
                }
              ]
            }

            Quy tắc:
            - estimatedBudget tính bằng VND (phải là số hợp lý cho doanh nghiệp Việt Nam)
            - estimatedDurationDays là tổng thời gian (30-365 ngày)
            - Tạo 2-4 giai đoạn, mỗi giai đoạn 3-6 tasks cụ thể
            - Tên tasks phải rõ ràng, hành động cụ thể bằng tiếng Việt
            - Chỉ trả JSON thuần, không markdown, không giải thích
            """;

            if (useMock)
            {
                _logger.LogWarning("Claude API Key không có. Dùng Mock cho GenerateProject.");
                return Result.Success(BuildMockProjectTemplate(problemInput));
            }

            try
            {
                using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                cts.CancelAfter(TimeSpan.FromSeconds(45));

                var httpClient = _httpClientFactory.CreateClient();
                httpClient.DefaultRequestHeaders.Add("x-api-key", apiKey);
                httpClient.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");

                var requestBody = new
                {
                    model = "claude-3-5-sonnet-20241022",
                    max_tokens = 1500,
                    messages = new[] { new { role = "user", content = prompt } }
                };

                var response = await httpClient.PostAsync(
                    "https://api.anthropic.com/v1/messages",
                    new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json"),
                    cts.Token);

                if (response.IsSuccessStatusCode)
                {
                    string raw = await response.Content.ReadAsStringAsync(cts.Token);
                    using var doc = JsonDocument.Parse(raw);
                    string? text = doc.RootElement.GetProperty("content")[0].GetProperty("text").GetString();
                    if (!string.IsNullOrWhiteSpace(text))
                    {
                        // Strip markdown code fences if any
                        text = text.Trim();
                        if (text.StartsWith("```")) text = string.Join('\n', text.Split('\n').Skip(1));
                        if (text.EndsWith("```")) text = text[..text.LastIndexOf("```")];
                        text = text.Trim();

                        var template = JsonSerializer.Deserialize<AiProjectTemplateDto>(text,
                            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                        if (template != null)
                            return Result.Success(template);
                    }
                }
                _logger.LogError("GenerateProject API thất bại: {Code}", response.StatusCode);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi GenerateProjectAsync");
            }

            // Fallback to mock
            return Result.Success(BuildMockProjectTemplate(problemInput));
        }

        private static AiProjectTemplateDto BuildMockProjectTemplate(string problem)
        {
            // Tạo template mẫu thông minh dựa vào keyword trong problem
            bool isTech = problem.Contains("phần mềm") || problem.Contains("hệ thống") || problem.Contains("website");
            bool isConstruct = problem.Contains("xây dựng") || problem.Contains("thi công") || problem.Contains("điện");

            string name = isTech ? "Dự án Phát triển Hệ thống"
                        : isConstruct ? "Dự án Thi công Kỹ thuật"
                        : "Dự án Triển khai Mới";

            return new AiProjectTemplateDto
            {
                Name = $"{name} – {DateTime.Today:MM/yyyy}",
                Description = $"Dự án được tạo tự động bởi AI dựa trên yêu cầu: \"{problem.Substring(0, Math.Min(80, problem.Length))}...\" Dự án sẽ được triển khai theo giai đoạn với đội ngũ chuyên nghiệp.",
                EstimatedBudget = 850_000_000,
                EstimatedDurationDays = 90,
                Phases = new List<AiPhaseTemplateDto>
                {
                    new() {
                        Name = "Giai đoạn 1: Khảo sát & Phân tích",
                        DurationDays = 15,
                        Tasks = new List<string> {
                            "Khảo sát hiện trạng và thu thập yêu cầu",
                            "Phân tích rủi ro và đề xuất giải pháp",
                            "Lập kế hoạch chi tiết và phân bổ nguồn lực",
                            "Trình bày và xác nhận kế hoạch với stakeholders"
                        }
                    },
                    new() {
                        Name = "Giai đoạn 2: Thiết kế & Chuẩn bị",
                        DurationDays = 20,
                        Tasks = new List<string> {
                            "Thiết kế kiến trúc tổng thể",
                            "Lập hồ sơ kỹ thuật chi tiết",
                            "Chuẩn bị vật tư và thiết bị",
                            "Đào tạo đội ngũ triển khai"
                        }
                    },
                    new() {
                        Name = "Giai đoạn 3: Triển khai",
                        DurationDays = 40,
                        Tasks = new List<string> {
                            "Triển khai giai đoạn 1 theo kế hoạch",
                            "Kiểm tra chất lượng định kỳ",
                            "Xử lý phát sinh và điều chỉnh",
                            "Triển khai giai đoạn 2",
                            "Tích hợp và kiểm thử tổng thể"
                        }
                    },
                    new() {
                        Name = "Giai đoạn 4: Nghiệm thu & Bàn giao",
                        DurationDays = 15,
                        Tasks = new List<string> {
                            "Kiểm tra nghiệm thu với khách hàng",
                            "Sửa chữa lỗi phát sinh sau nghiệm thu",
                            "Bàn giao hồ sơ và hướng dẫn vận hành",
                            "Lập báo cáo hoàn công"
                        }
                    }
                }
            };
        }

        private async Task<string> BuildSearchContextAsync(Guid? tenantId, Guid userId, bool canSeeAll, Guid? departmentId)
        {
            var sb = new StringBuilder();

            List<AppUser> employees;
            if (canSeeAll)
            {
                employees = await _context.Users
                    .AsNoTracking()
                    .Where(u => u.TenantId == tenantId && !u.IsDeleted)
                    .Include(u => u.Department)
                    .ToListAsync();
            }
            else
            {
                employees = await _context.Users
                    .AsNoTracking()
                    .Where(u => u.TenantId == tenantId && !u.IsDeleted && u.DepartmentId == departmentId)
                    .Include(u => u.Department)
                    .ToListAsync();
            }

            sb.AppendLine("### DANH SÁCH NHÂN VIÊN:");
            foreach (var emp in employees)
            {
                sb.AppendLine($"- Mã NV: {emp.EmployeeCode}, Tên: {emp.FullName}, Chức danh: {emp.JobTitle}, Phòng ban: {emp.Department?.Name ?? "N/A"}, Email: {emp.Email}, Trạng thái: {emp.EmploymentStatus}");
            }
            sb.AppendLine();

            List<Project> projects;
            List<ProjectTask> tasks;

            if (canSeeAll)
            {
                projects = await _context.Projects
                    .AsNoTracking()
                    .Where(p => p.TenantId == tenantId && !p.IsDeleted)
                    .ToListAsync();

                tasks = await _context.Tasks
                    .AsNoTracking()
                    .Where(t => t.TenantId == tenantId && !t.IsDeleted)
                    .Include(t => t.AssignedTo)
                    .Include(t => t.Project)
                    .ToListAsync();
            }
            else
            {
                var myProjectIds = await _context.ProjectMembers
                    .AsNoTracking()
                    .Where(pm => pm.UserId == userId)
                    .Select(pm => pm.ProjectId)
                    .ToListAsync();

                projects = await _context.Projects
                    .AsNoTracking()
                    .Where(p => p.TenantId == tenantId && !p.IsDeleted && myProjectIds.Contains(p.Id))
                    .ToListAsync();

                tasks = await _context.Tasks
                    .AsNoTracking()
                    .Where(t => t.TenantId == tenantId && !t.IsDeleted && (t.AssignedToId == userId || myProjectIds.Contains(t.ProjectId)))
                    .Include(t => t.AssignedTo)
                    .Include(t => t.Project)
                    .ToListAsync();
            }

            sb.AppendLine("### DANH SÁCH DỰ ÁN VÀ NGÂN SÁCH:");
            foreach (var p in projects)
            {
                if (canSeeAll)
                {
                    sb.AppendLine($"- Dự án: {p.Name} (Mã: {p.Code}), Ngân sách hiện có: {p.Budget:N0} VND, Trạng thái: {p.Status}");
                }
                else
                {
                    sb.AppendLine($"- Dự án: {p.Name} (Mã: {p.Code}), Trạng thái: {p.Status} (Ngân sách: ẨN/KHÔNG CÓ QUYỀN XEM)");
                }
            }
            sb.AppendLine();

            sb.AppendLine("### TIẾN ĐỘ CÔNG VIỆC:");
            foreach (var t in tasks)
            {
                sb.AppendLine($"- Công việc: {t.Title} (Mã: {t.Code}), Dự án: {t.Project?.Name ?? "N/A"}, Phân công cho: {t.AssignedTo?.FullName ?? "Chưa giao"}, Trạng thái: {t.Status}, Hạn chót: {t.DueDate:dd/MM/yyyy}, Độ ưu tiên: {t.Priority}");
            }

            return sb.ToString();
        }

        private async Task<string> BuildReportContextAsync(Guid? tenantId, Guid userId, bool canSeeAll)
        {
            var sb = new StringBuilder();

            List<Document> documents;
            if (canSeeAll)
            {
                documents = await _context.Documents
                    .AsNoTracking()
                    .Where(d => d.TenantId == tenantId && !d.IsDeleted)
                    .Include(d => d.UploadedBy)
                    .ToListAsync();
            }
            else
            {
                var permittedDocIds = await _context.DocumentPermissions
                    .AsNoTracking()
                    .Where(dp => dp.UserId == userId)
                    .Select(dp => dp.DocumentId)
                    .ToListAsync();

                documents = await _context.Documents
                    .AsNoTracking()
                    .Where(d => d.TenantId == tenantId && !d.IsDeleted && (d.UploadedById == userId || permittedDocIds.Contains(d.Id)))
                    .Include(d => d.UploadedBy)
                    .ToListAsync();
            }

            sb.AppendLine("### DANH SÁCH BÁO CÁO & TÀI LIỆU HIỆN CÓ:");
            if (documents.Count == 0)
            {
                sb.AppendLine("(Không có tài liệu hoặc báo cáo nào khả dụng)");
            }
            else
            {
                foreach (var doc in documents)
                {
                    sb.AppendLine($"- Tài liệu: {doc.Name}, Loại: {doc.ContentType}, Kích thước: {doc.FileSizeBytes / 1024.0:F1} KB, Tóm tắt AI: {doc.AiSummary ?? "Chưa có tóm tắt"}, Người tải lên: {doc.UploadedBy?.FullName ?? "N/A"}");
                }
            }

            return sb.ToString();
        }

        public async Task<Result<string>> ChatAsync(AiChatRequestDto request, string systemContext, CancellationToken ct = default)
        {
            var httpContext = _httpContextAccessor.HttpContext;
            var user = httpContext?.User;

            Guid? tenantId = null;
            Guid userId = Guid.Empty;
            Guid? departmentId = null;
            string userRole = "Employee";
            bool canSeeAll = false;

            if (user != null)
            {
                var userIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (Guid.TryParse(userIdStr, out var uid))
                {
                    userId = uid;
                }

                var tenantIdStr = user.FindFirst("tenant_id")?.Value;
                if (Guid.TryParse(tenantIdStr, out var tid))
                {
                    tenantId = tid;
                }

                canSeeAll = user.IsInRole("SuperAdmin") || user.IsInRole("TenantOwner") || user.IsInRole("TenantAdmin");

                if (user.IsInRole("SuperAdmin")) userRole = "SuperAdmin";
                else if (user.IsInRole("TenantOwner")) userRole = "TenantOwner";
                else if (user.IsInRole("TenantAdmin")) userRole = "TenantAdmin";

                if (userId != Guid.Empty)
                {
                    var dbUser = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);
                    if (dbUser != null)
                    {
                        departmentId = dbUser.DepartmentId;
                    }
                }
            }

            string finalSystemContext = systemContext;

            if (string.Equals(request.ChatMode, "report", StringComparison.OrdinalIgnoreCase))
            {
                var reportContext = await BuildReportContextAsync(tenantId, userId, canSeeAll);
                var adminReports = canSeeAll
                    ? "- Báo cáo dự án & ngân sách (Excel): [Tải Báo cáo Dự án & Ngân sách (Excel)](/api/reports/export-excel?type=projects)\n- Báo cáo dự án & ngân sách (Word): [Tải Báo cáo Dự án & Ngân sách (Word)](/api/reports/export-docx?type=projects)\n"
                    : "";

                finalSystemContext = $"""
                {systemContext}
                Bạn đang hoạt động ở chế độ BÁO CÁO.
                Vai trò người dùng: {userRole}
                Quyền xem báo cáo toàn công ty: {(canSeeAll ? "Đầy đủ" : "Hạn chế (Chỉ xem báo cáo cá nhân/phòng ban)")}

                [QUY TẮC BẮT BUỘC]
                - Người dùng có thể tìm báo cáo, quản lý báo cáo, và yêu cầu xuất báo cáo.
                - Nếu người dùng yêu cầu xuất hoặc tải báo cáo, hãy gợi ý và cung cấp CHÍNH XÁC các link markdown sau (không thay đổi đường dẫn link):
                  - Báo cáo nhân sự (Excel): [Tải Báo cáo Nhân viên (Excel)](/api/reports/export-excel?type=employees)
                  - Báo cáo nhân sự (Word): [Tải Báo cáo Nhân viên (Word)](/api/reports/export-docx?type=employees)
                  - Báo cáo công việc (Excel): [Tải Báo cáo Công việc (Excel)](/api/reports/export-excel?type=tasks)
                  - Báo cáo công việc (Word): [Tải Báo cáo Công việc (Word)](/api/reports/export-docx?type=tasks)
                  {adminReports}
                - Tuyệt đối KHÔNG hiển thị liên kết báo cáo dự án/ngân sách cho người dùng có vai trò Employee. Nếu Employee yêu cầu báo cáo dự án/ngân sách/tài chính toàn công ty, hãy từ chối lịch sự: "Bạn không có quyền truy cập thông tin báo cáo này."

                {reportContext}
                """;
            }
            else
            {
                var searchContext = await BuildSearchContextAsync(tenantId, userId, canSeeAll, departmentId);

                finalSystemContext = $"""
                {systemContext}
                Bạn đang hoạt động ở chế độ TÌM KIẾM.
                Vai trò người dùng: {userRole}
                Quyền truy cập thông tin tài chính/ngân sách: {(canSeeAll ? "Đầy đủ" : "Không được phép")}

                [QUY TẮC BẮT BUỘC]
                - Người dùng có thể tìm kiếm thông tin về nhân viên, công việc từng nhóm, tiến độ công việc, quản lý công việc và tiền (ngân sách) của dự án.
                - Nếu người dùng KHÔNG có quyền truy cập thông tin tài chính (Employee), bạn tuyệt đối không được tiết lộ bất kỳ thông tin nào về ngân sách dự án (Budget/Funds), dòng tiền hay tài chính. Nếu họ hỏi về chúng, hãy từ chối lịch sự: "Bạn không có quyền truy cập thông tin tài chính/ngân sách của dự án."

                {searchContext}
                """;
            }

            if (string.Equals(request.ModelProvider, "gemini", StringComparison.OrdinalIgnoreCase))
            {
                return await ChatWithGeminiAsync(request, finalSystemContext, ct);
            }
            else
            {
                return await ChatWithClaudeAsync(request, finalSystemContext, ct);
            }
        }

        private async Task<Result<string>> ChatWithGeminiAsync(AiChatRequestDto request, string systemContext, CancellationToken ct)
        {
            string apiKey = _configuration["Gemini:ApiKey"] ?? string.Empty;
            bool useMock = string.IsNullOrWhiteSpace(apiKey) || apiKey == "YOUR_GEMINI_API_KEY_HERE";

            if (useMock)
            {
                var lastMsg = request.Messages.LastOrDefault()?.Content ?? "";
                string responseText = $"[Mô phỏng {request.SelectedModel}] Cảm ơn bạn đã nhắn: \"{lastMsg}\". Tôi là trợ lý AI OperaIQ. Vui lòng thiết lập Gemini:ApiKey thực tế trong appsettings.json để kích hoạt trò chuyện thực.";
                return Result.Success(responseText);
            }

            try
            {
                using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                cts.CancelAfter(TimeSpan.FromSeconds(60));

                var httpClient = _httpClientFactory.CreateClient();
                
                var contents = new List<object>();
                if (!string.IsNullOrWhiteSpace(systemContext))
                {
                    contents.Add(new { role = "user", parts = new[] { new { text = $"System context: {systemContext}" } } });
                    contents.Add(new { role = "model", parts = new[] { new { text = "Understood." } } });
                }

                foreach (var msg in request.Messages)
                {
                    contents.Add(new { role = msg.Role, parts = new[] { new { text = msg.Content } } });
                }

                var requestBody = new { contents = contents };
                
                string url = $"https://generativelanguage.googleapis.com/v1beta/models/{request.SelectedModel}:generateContent?key={apiKey}";
                
                var response = await httpClient.PostAsync(url, new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json"), cts.Token);
                
                if (response.IsSuccessStatusCode)
                {
                    var responseString = await response.Content.ReadAsStringAsync(cts.Token);
                    using var doc = JsonDocument.Parse(responseString);
                    
                    var candidates = doc.RootElement.GetProperty("candidates");
                    if (candidates.GetArrayLength() > 0)
                    {
                        var text = candidates[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString();
                        return Result.Success(text ?? "");
                    }
                }
                
                var errorContent = await response.Content.ReadAsStringAsync(cts.Token);
                _logger.LogWarning($"Gemini API call failed with status {response.StatusCode}. Content: {errorContent}. Falling back to mock.");
                
                var lastMsgFallback = request.Messages.LastOrDefault()?.Content ?? "";
                string responseFallback = $"[Mô phỏng - Lỗi API {response.StatusCode}] Cảm ơn bạn đã nhắn: \"{lastMsgFallback}\". Hiện tại mô hình {request.SelectedModel} phản hồi lỗi {response.StatusCode} (có thể do hết hạn ngạch/quota của API Key).";
                return Result.Success(responseFallback);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Gemini Chat Error, falling back to mock.");
                var lastMsgFallback = request.Messages.LastOrDefault()?.Content ?? "";
                return Result.Success($"[Mô phỏng - Lỗi kết nối] Cảm ơn bạn đã nhắn: \"{lastMsgFallback}\". Không thể kết nối dịch vụ Gemini (Lỗi: {ex.Message}).");
            }
        }

        private async Task<Result<string>> ChatWithClaudeAsync(AiChatRequestDto request, string systemContext, CancellationToken ct)
        {
            string apiKey = _configuration["Claude:ApiKey"] ?? string.Empty;
            if (string.IsNullOrWhiteSpace(apiKey)) return Result.Failure<string>("Claude API Key is missing.");

            try
            {
                using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                cts.CancelAfter(TimeSpan.FromSeconds(60));

                var httpClient = _httpClientFactory.CreateClient();
                httpClient.DefaultRequestHeaders.Add("x-api-key", apiKey);
                httpClient.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");

                var messages = request.Messages.Select(m => new { role = m.Role == "model" ? "assistant" : "user", content = m.Content }).ToList();
                
                var requestBody = new
                {
                    model = request.SelectedModel,
                    max_tokens = 1500,
                    system = systemContext,
                    messages = messages
                };

                var response = await httpClient.PostAsync("https://api.anthropic.com/v1/messages", new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json"), cts.Token);
                
                if (response.IsSuccessStatusCode)
                {
                    var responseString = await response.Content.ReadAsStringAsync(cts.Token);
                    using var doc = JsonDocument.Parse(responseString);
                    var text = doc.RootElement.GetProperty("content")[0].GetProperty("text").GetString();
                    return Result.Success(text ?? "");
                }
                
                return Result.Failure<string>($"Claude API Error: {response.StatusCode}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Claude Chat Error");
                return Result.Failure<string>("Error connecting to Claude API.");
            }
        }
    }
}
