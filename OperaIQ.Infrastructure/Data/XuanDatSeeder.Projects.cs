using System;
using System.Collections.Generic;
using System.Linq;
using OperaIQ.Domain.Entities;
using OperaIQ.Domain.Enums;
using DTaskStatus = OperaIQ.Domain.Enums.TaskStatus;

namespace OperaIQ.Infrastructure.Data
{
    public static partial class XuanDatSeeder
    {
        // ============================================================
        // 7. PROJECTS (15) + PHASES (4 / project) + TASKS (~20 / project)
        // ============================================================
        private record ProjectSpec(
            string Code, string Name, string CustomerCode,
            decimal BudgetBillion, string Start, string End,
            string PmCode, string[] MemberCodes, int Progress);

        // Template 4 giai đoạn dùng chung cho mọi dự án (BA: WBS chuẩn EPC).
        private static readonly (string code, string name)[] StdPhases = new[]
        {
            ("G1", "Khảo sát & Thiết kế"),
            ("G2", "Cung ứng & Sản xuất tủ"),
            ("G3", "Thi công & Lắp đặt"),
            ("G4", "Nghiệm thu & Bàn giao"),
        };

        // Tên task chuẩn theo từng giai đoạn — sẽ tuỳ biến tiền tố theo dự án.
        private static readonly string[][] StdTasksByPhase = new[]
        {
            new[] {
                "Khảo sát hiện trạng",
                "Thiết kế single-line diagram",
                "Tính toán phụ tải, lựa chọn MBA",
                "Thiết kế tủ MSB / DB",
                "Thiết kế hệ thống chiếu sáng",
                "Thiết kế chống sét & nối đất",
                "Trình duyệt thiết kế chủ đầu tư"
            },
            new[] {
                "Đặt hàng MCCB/ACB Schneider",
                "Đặt hàng cáp LS Vina",
                "Sản xuất tủ MSB tại xưởng XDE",
                "FAT (Factory Acceptance Test)",
                "Vận chuyển vật tư tới site",
                "Kiểm kê đầu vào tại công trường"
            },
            new[] {
                "Thi công hệ thống tiếp địa",
                "Đi máng cáp & ống luồn",
                "Kéo rải cáp động lực",
                "Lắp đặt tủ MSB / DB",
                "Đấu nối thiết bị",
                "Lắp hệ thống chiếu sáng",
                "Quản lý an toàn lao động"
            },
            new[] {
                "Đo cách điện, đo nối đất",
                "Test no-load",
                "Test có tải",
                "Hiệu chỉnh relay bảo vệ",
                "Đào tạo vận hành cho khách hàng",
                "Bàn giao hồ sơ as-built",
                "Bảo hành 12 tháng"
            }
        };

        private static readonly ProjectSpec[] ProjectsData = new[]
        {
            new ProjectSpec("XD-PRJ-001", "Triển khai hệ thống điện nhà máy Vinamilk Bình Dương",
                "VNM", 18.5m, "12/01/2026", "30/09/2026", "XD-0011",
                new[]{"XD-0026","XD-0027","XD-0042","XD-0048","XD-0049","XD-0050","XD-0023","XD-0031","XD-0036","XD-0060","XD-0061"}, 35),
            new ProjectSpec("XD-PRJ-002", "Nâng cấp PLC dây chuyền sản xuất Coca-Cola Long An",
                "CCV", 6.2m, "03/02/2026", "25/06/2026", "XD-0023",
                new[]{"XD-0031","XD-0032","XD-0033","XD-0034","XD-0024","XD-0036","XD-0062"}, 60),
            new ProjectSpec("XD-PRJ-003", "Xây dựng hệ thống SCADA KCN VSIP II",
                "VSIP", 12.0m, "18/11/2025", "28/08/2026", "XD-0024",
                new[]{"XD-0036","XD-0037","XD-0038","XD-0039","XD-0023","XD-0042","XD-0078","XD-0021"}, 45),
            new ProjectSpec("XD-PRJ-004", "Lắp đặt tủ điện điều khiển nhà máy Masan Nghệ An",
                "MML", 9.4m, "05/03/2026", "30/10/2026", "XD-0011",
                new[]{"XD-0026","XD-0027","XD-0042","XD-0043","XD-0048","XD-0049","XD-0070","XD-0071"}, 20),
            new ProjectSpec("XD-PRJ-005", "Tự động hoá kho thông minh Lazada Tân Thuận",
                "LZD", 7.8m, "02/04/2026", "15/12/2026", "XD-0010",
                new[]{"XD-0023","XD-0024","XD-0036","XD-0037","XD-0040","XD-0026","XD-0084"}, 12),
            new ProjectSpec("XD-PRJ-006", "Hệ thống điện trung thế nhà máy Pepsi Cần Thơ",
                "PEPS", 14.1m, "20/01/2026", "31/08/2026", "XD-0047",
                new[]{"XD-0042","XD-0043","XD-0048","XD-0049","XD-0050","XD-0051","XD-0026","XD-0027","XD-0060"}, 50),
            new ProjectSpec("XD-PRJ-007", "Cải tạo trạm biến áp 22kV KCN Sóng Thần",
                "KCNST", 5.6m, "10/12/2025", "30/05/2026", "XD-0042",
                new[]{"XD-0026","XD-0048","XD-0049","XD-0050","XD-0066"}, 75),
            new ProjectSpec("XD-PRJ-008", "Triển khai biến tần dây chuyền dệt may TNG Thái Nguyên",
                "TNG", 4.3m, "01/02/2026", "15/07/2026", "XD-0025",
                new[]{"XD-0040","XD-0041","XD-0023","XD-0031","XD-0070"}, 55),
            new ProjectSpec("XD-PRJ-009", "Hệ thống BMS toà nhà Sunwah Tower Q1",
                "SUN", 11.7m, "15/03/2026", "30/11/2026", "XD-0026",
                new[]{"XD-0042","XD-0043","XD-0044","XD-0046","XD-0048","XD-0024","XD-0036","XD-0060"}, 18),
            new ProjectSpec("XD-PRJ-010", "Lắp đặt Solar Rooftop nhà máy Vĩnh Tường",
                "SGB", 8.0m, "02/02/2026", "15/08/2026", "XD-0011",
                new[]{"XD-0026","XD-0042","XD-0048","XD-0049","XD-0061","XD-0050"}, 40),
            new ProjectSpec("XD-PRJ-011", "SCADA trạm bơm nước sạch Sông Đà",
                "VWS", 6.9m, "10/01/2026", "30/06/2026", "XD-0024",
                new[]{"XD-0036","XD-0037","XD-0023","XD-0031","XD-0070"}, 65),
            new ProjectSpec("XD-PRJ-012", "Tủ MCC nhà máy giấy Lee & Man Hậu Giang",
                "LMP", 10.5m, "25/02/2026", "15/10/2026", "XD-0042",
                new[]{"XD-0026","XD-0043","XD-0044","XD-0048","XD-0050","XD-0027","XD-0060"}, 28),
            new ProjectSpec("XD-PRJ-013", "Bảo trì PLC dây chuyền Heineken Vũng Tàu",
                "HNK", 2.1m, "02/03/2026", "30/12/2026", "XD-0028",
                new[]{"XD-0052","XD-0053","XD-0054","XD-0055"}, 30),
            new ProjectSpec("XD-PRJ-014", "Thiết kế hệ thống điện nhà xưởng Foxconn Bắc Giang",
                "FXC", 22.0m, "10/04/2026", "30/03/2027", "XD-0011",
                new[]{"XD-0026","XD-0027","XD-0042","XD-0043","XD-0044","XD-0046","XD-0048","XD-0049","XD-0050","XD-0070","XD-0071"}, 8),
            new ProjectSpec("XD-PRJ-015", "Tích hợp SCADA-IoT nhà máy thông minh Schneider",
                "SCH", 16.3m, "05/05/2026", "30/12/2026", "XD-0010",
                new[]{"XD-0023","XD-0024","XD-0036","XD-0037","XD-0040","XD-0042","XD-0078","XD-0079"}, 5),
        };

        private static List<Project> SeedProjectsAndTasks(
            ApplicationDbContext ctx,
            Guid tenantId,
            Dictionary<string, AppUser> users,
            Dictionary<string, Customer> customers)
        {
            var rng = new Random(20260601);
            var projects = new List<Project>();

            // Phân bổ trạng thái Kanban cho 300 task: 60 Backlog | 75 Todo | 90 InProgress | 30 Review | 45 Done
            var statusBag = BuildStatusBag();
            int statusIdx = 0;

            foreach (var spec in ProjectsData)
            {
                var pm = users[spec.PmCode];
                var customer = customers[spec.CustomerCode];

                var projectStatus = ProjectStatus.Active;
                var approvalStatus = ProjectApprovalStatus.Approved;
                var progressPercent = spec.Progress;

                if (spec.Code == "XD-PRJ-002") // Mẫu 1: Hoàn thành (Approved)
                {
                    projectStatus = ProjectStatus.Completed;
                    progressPercent = 100;
                }
                else if (spec.Code == "XD-PRJ-003") // Mẫu 2: Đang duyệt (PendingDirector)
                {
                    approvalStatus = ProjectApprovalStatus.PendingDirector;
                }
                else if (spec.Code == "XD-PRJ-004") // Rejected
                {
                    approvalStatus = ProjectApprovalStatus.Rejected;
                }

                var project = new Project
                {
                    Id = Guid.NewGuid(),
                    Code = spec.Code,
                    Name = spec.Name,
                    Description = $"Khách hàng: {customer.Name}. Ngân sách: {spec.BudgetBillion} tỷ VND.",
                    CustomerName = customer.Name,
                    Budget = spec.BudgetBillion * 1_000_000_000m,
                    StartDate = ParseDate(spec.Start),
                    DueDate = ParseDate(spec.End),
                    ProgressPercent = progressPercent,
                    Status = projectStatus,
                    ApprovalStatus = approvalStatus,
                    ProjectManagerId = pm.Id,
                    CreatedById = pm.Id,
                    TenantId = tenantId
                };
                ctx.Projects.Add(project);
                projects.Add(project);

                // ProjectMembers
                var memberSet = new HashSet<Guid> { pm.Id };
                ctx.ProjectMembers.Add(new ProjectMember
                {
                    ProjectId = project.Id,
                    UserId = pm.Id,
                    Role = "ProjectManager",
                    TenantId = tenantId
                });
                foreach (var mc in spec.MemberCodes)
                {
                    if (!users.TryGetValue(mc, out var mu)) continue;
                    if (!memberSet.Add(mu.Id)) continue;
                    ctx.ProjectMembers.Add(new ProjectMember
                    {
                        ProjectId = project.Id,
                        UserId = mu.Id,
                        Role = "Member",
                        TenantId = tenantId
                    });
                }

                // Phases (4) + Tasks
                var phaseStart = project.StartDate!.Value;
                var totalDays = (int)((project.DueDate!.Value - phaseStart).TotalDays);
                var phaseLen = Math.Max(7, totalDays / 4);

                for (int pi = 0; pi < StdPhases.Length; pi++)
                {
                    var ph = StdPhases[pi];
                    var phaseStartDate = phaseStart.AddDays(pi * phaseLen);
                    var phaseEndDate = pi == StdPhases.Length - 1
                        ? project.DueDate!.Value
                        : phaseStartDate.AddDays(phaseLen - 1);

                    var phase = new ProjectPhase
                    {
                        Id = Guid.NewGuid(),
                        ProjectId = project.Id,
                        Code = ph.code,
                        Name = ph.name,
                        OrderIndex = pi + 1,
                        StartDate = phaseStartDate,
                        EndDate = phaseEndDate,
                        ProgressPercent = pi * 25 + (spec.Progress / 4),
                        TenantId = tenantId
                    };
                    ctx.ProjectPhases.Add(phase);

                    var tplTasks = StdTasksByPhase[pi];
                    for (int ti = 0; ti < tplTasks.Length; ti++)
                    {
                        var status = statusBag[statusIdx++ % statusBag.Length];
                        if (projectStatus == ProjectStatus.Completed)
                        {
                            status = DTaskStatus.Done;
                        }
                        var memberId = spec.MemberCodes.Length > 0
                            ? users[spec.MemberCodes[ti % spec.MemberCodes.Length]].Id
                            : pm.Id;

                        var task = new ProjectTask
                        {
                            Id = Guid.NewGuid(),
                            ProjectId = project.Id,
                            PhaseId = phase.Id,
                            Code = $"{spec.Code}-{ph.code}-T{ti + 1:D2}",
                            Title = $"[{spec.Code}] {tplTasks[ti]}",
                            Description = $"{tplTasks[ti]} thuộc giai đoạn {ph.name} của dự án {spec.Name}.",
                            Status = status,
                            Priority = ChoosePriority(rng, status),
                            AssignedToId = memberId,
                            AssignedById = pm.Id,
                            DueDate = phaseStartDate.AddDays(ti * 3 + 5),
                            EstimatedHours = 8 + rng.Next(0, 32),
                            ActualHours = status == DTaskStatus.Done ? 8 + rng.Next(0, 32) : rng.Next(0, 16),
                            ProgressPercent = status switch
                            {
                                DTaskStatus.Done => 100,
                                DTaskStatus.Review => 90,
                                DTaskStatus.InProgress => 30 + rng.Next(0, 50),
                                DTaskStatus.Todo => 0,
                                DTaskStatus.Backlog => 0,
                                _ => 0
                            },
                            IsAiAssigned = ti % 6 == 0,
                            AiReason = ti % 6 == 0
                                ? "[AI] Phù hợp kỹ năng + tải công việc đang dưới 70%."
                                : null,
                            TenantId = tenantId
                        };
                        ctx.Tasks.Add(task);
                    }
                }
            }

            return projects;
        }

        private static DTaskStatus[] BuildStatusBag()
        {
            // 60 Backlog | 75 Todo | 90 InProgress | 30 Review | 45 Done = 300
            var list = new List<DTaskStatus>(300);
            list.AddRange(Enumerable.Repeat(DTaskStatus.Backlog, 60));
            list.AddRange(Enumerable.Repeat(DTaskStatus.Todo, 75));
            list.AddRange(Enumerable.Repeat(DTaskStatus.InProgress, 90));
            list.AddRange(Enumerable.Repeat(DTaskStatus.Review, 30));
            list.AddRange(Enumerable.Repeat(DTaskStatus.Done, 45));
            // Trộn deterministically theo Fisher-Yates với seed cố định
            var rng = new Random(42);
            for (int i = list.Count - 1; i > 0; i--)
            {
                int j = rng.Next(i + 1);
                (list[i], list[j]) = (list[j], list[i]);
            }
            return list.ToArray();
        }

        private static TaskPriority ChoosePriority(Random rng, DTaskStatus status)
        {
            int r = rng.Next(0, 100);
            if (status == DTaskStatus.Done) return TaskPriority.Medium;
            if (r < 10) return TaskPriority.Critical;
            if (r < 40) return TaskPriority.High;
            if (r < 80) return TaskPriority.Medium;
            return TaskPriority.Low;
        }

        // ============================================================
        // 8. KPI SNAPSHOTS
        // ============================================================
        private static void SeedKpis(
            ApplicationDbContext ctx, Guid tenantId, Dictionary<string, Department> depts)
        {
            (string deptKey, decimal kpi)[] data =
            {
                ("AUTO", 91), ("EPC", 86), ("MAINT", 89),
                ("KD-MN", 93), ("KD-MB", 84), ("KD-DA", 80),
                ("WH", 78), ("PUR", 82), ("FIN", 90),
                ("HR", 85), ("MKT", 81), ("IT", 88), ("QC", 83)
            };

            foreach (var d in data)
            {
                ctx.KpiSnapshots.Add(new KpiSnapshot
                {
                    DepartmentId = depts[d.deptKey].Id,
                    Period = "2026-Q2",
                    MetricKey = "KPI",
                    Value = d.kpi,
                    Target = 85,
                    Unit = "%",
                    TenantId = tenantId
                });
            }

            // KPI tổng công ty
            ctx.KpiSnapshots.Add(new KpiSnapshot
            {
                Period = "2026-Q2",
                MetricKey = "CompanyKPI",
                Value = 87,
                Target = 85,
                Unit = "%",
                TenantId = tenantId
            });
            ctx.KpiSnapshots.Add(new KpiSnapshot
            {
                Period = "2026-Q2",
                MetricKey = "RevenueYTD",
                Value = 218,
                Target = 520,
                Unit = "tỷ VND",
                TenantId = tenantId
            });
            ctx.KpiSnapshots.Add(new KpiSnapshot
            {
                Period = "2026-Q2",
                MetricKey = "CustomerSatisfaction",
                Value = 92,
                Target = 90,
                Unit = "%",
                TenantId = tenantId
            });
        }

        // ============================================================
        // 9. AI ASSIGNMENT SUGGESTIONS — 10 tình huống
        // ============================================================
        private static void SeedAiSuggestions(
            ApplicationDbContext ctx, Guid tenantId,
            Dictionary<string, AppUser> users, List<Project> projects)
        {
            (string title, string desc, string[] users, string reason)[] data =
            {
                ("Lập trình PLC Mitsubishi cho dây chuyền đóng gói Vinamilk",
                 "Dùng GX Works3, tích hợp với SCADA WinCC.",
                 new[]{"XD-0031","XD-0032"},
                 "Có chứng chỉ MELSEC, điểm kỹ năng > 85, đang còn 40% tải công việc."),
                ("Cấu hình WinCC SCADA cho trạm bơm Sông Đà",
                 "Xây dựng giao diện WinCC kết nối PLC S7-1500.",
                 new[]{"XD-0036","XD-0024"},
                 "Senior WinCC, tải công việc dưới 65%, đã có kinh nghiệm dự án nước sạch."),
                ("Hiệu chỉnh biến tần ABB ACS580 dây chuyền dệt TNG",
                 "Hiệu chỉnh tham số driver, phối hợp với PLC chính.",
                 new[]{"XD-0040","XD-0041"},
                 "Có cert ABB Drive Specialist, gần site Thái Nguyên, không trùng lịch."),
                ("Vẽ single-line diagram nhà máy Foxconn",
                 "Dùng AutoCAD Electrical + EPLAN.",
                 new[]{"XD-0042","XD-0043"},
                 "EPLAN cert, kinh nghiệm dự án ≥10 tỷ, tải hiện 35%."),
                ("Khảo sát hiện trạng KCN Sóng Thần",
                 "Đo đạc và lập biên bản hiện trạng.",
                 new[]{"XD-0048","XD-0049"},
                 "Site Engineer ở khu vực Bình Dương, sẵn xe và thiết bị đo."),
                ("Bảo trì khẩn PLC Heineken Vũng Tàu (sự cố)",
                 "Sự cố dừng line — cần xử lý trong 4h.",
                 new[]{"XD-0053","XD-0028"},
                 "Senior Service từng hỗ trợ KH này 3 lần, sẵn sàng 24/7."),
                ("Soạn báo giá EPC nhà máy Masan Nghệ An",
                 "Lập BOQ và báo giá thiết bị + thi công.",
                 new[]{"XD-0080","XD-0078"},
                 "Bidding Specialist + PM Senior, đang free, kinh nghiệm dự án 9 tỷ+"),
                ("Đào tạo vận hành cho khách hàng Vinamilk",
                 "Đào tạo onsite 3 ngày cho 12 vận hành viên.",
                 new[]{"XD-0023","XD-0052"},
                 "Có kỹ năng Đào tạo & Customer-facing, KPI cao."),
                ("Test FAT tủ MSB XD-PRJ-001",
                 "Kiểm tra chức năng tủ MSB tại xưởng XDE.",
                 new[]{"XD-0050","XD-0048"},
                 "Commissioning Engineer + Site Engineer, không trùng lịch tuần này."),
                ("Thiết kế hệ thống BMS toà Sunwah Tower",
                 "Thiết kế kiến trúc BMS, tích hợp Modbus / BACnet.",
                 new[]{"XD-0026","XD-0046"},
                 "TL Thiết kế + BIM Coordinator, có Revit MEP, đã làm BMS toà nhà 9 tầng."),
            };

            // Map mỗi tình huống vào 1 task tồn tại của dự án phù hợp (best-effort).
            foreach (var s in data)
            {
                var task = ctx.Tasks.AsEnumerable().FirstOrDefault(t =>
                    t.TenantId == tenantId && t.Title.Contains(s.title.Split(' ')[0]));

                int rank = 1;
                int score = 95;
                foreach (var uc in s.users)
                {
                    if (!users.TryGetValue(uc, out var u)) continue;
                    ctx.AiAssignmentSuggestions.Add(new AiAssignmentSuggestion
                    {
                        TaskId = task?.Id,
                        TaskTitle = s.title,
                        TaskDescription = s.desc,
                        SuggestedUserId = u.Id,
                        Rank = rank++,
                        MatchScore = score,
                        Reason = s.reason,
                        IsAccepted = false,
                        TenantId = tenantId
                    });
                    score -= 7;
                }
            }
        }

        // ============================================================
        // 10. NOTIFICATIONS — 10 thông báo gần nhất
        // ============================================================
        private static void SeedNotifications(
            ApplicationDbContext ctx, Guid tenantId,
            Dictionary<string, AppUser> users)
        {
            (string code, string title, string msg, string type)[] data =
            {
                ("XD-0011", "Task mới được giao",
                 "Phê duyệt thiết kế Foxconn — hạn 12/06/2026.", "TaskAssigned"),
                ("XD-0010", "AI Assistant gợi ý",
                 "AI vừa đề xuất 3 ứng viên cho task trong XD-PRJ-005.", "AISuggestion"),
                ("XD-0007", "Phản hồi khách hàng",
                 "Heineken phản hồi báo giá bảo trì XD-PRJ-013.", "Customer"),
                ("XD-0027", "Task hoàn thành",
                 "Bùi Tấn Lực hoàn thành 'Test FAT tủ MSB XD-PRJ-001'.", "TaskUpdate"),
                ("XD-0016", "Yêu cầu nghỉ phép",
                 "XD-0042 yêu cầu nghỉ phép 02–03/06/2026.", "HR"),
                ("XD-0001", "Tài liệu mới",
                 "'Quy trình ATLĐ 2026 v2' vừa được tải lên.", "Document"),
                ("XD-0006", "KPI cập nhật",
                 "KPI Q2/2026 vừa cập nhật cho 9 phòng ban.", "Report"),
                ("XD-0011", "Tiến độ dự án",
                 "XD-PRJ-007 đạt tiến độ 75%.", "ProjectUpdate"),
                ("XD-0016", "Đào tạo nội bộ",
                 "Buổi đào tạo Mitsubishi GX Works3 — 10/06/2026.", "Training"),
                ("XD-0018", "Bảo trì hệ thống",
                 "Hệ thống bảo trì 02:00–03:00 ngày 02/06/2026.", "System"),
            };

            foreach (var n in data)
            {
                if (!users.TryGetValue(n.code, out var u)) continue;
                ctx.Notifications.Add(new Notification
                {
                    UserId = u.Id,
                    Title = n.title,
                    Message = n.msg,
                    Type = n.type,
                    IsRead = false,
                    TenantId = tenantId
                });
            }
        }
    }
}
