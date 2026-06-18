using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using OperaIQ.Application.Common;
using OperaIQ.Domain.Entities;
using OperaIQ.Domain.Enums;
using DTaskStatus = OperaIQ.Domain.Enums.TaskStatus;

namespace OperaIQ.Infrastructure.Data
{
    /// <summary>
    /// Seeder code-first cho doanh nghiệp giả lập "Công ty TNHH Thiết Bị Điện Xuân Đạt" (XDE).
    /// Idempotent: tự bỏ qua nếu tenant đã tồn tại.
    /// </summary>
    public static partial class XuanDatSeeder
    {
        public const string TenantSlug = "xuandat";
        public const string TenantName = "Công ty TNHH Thiết Bị Điện Xuân Đạt";
        private const string DefaultPassword = "Password123!";

        // Mốc thời gian dùng để dữ liệu ổn định giữa các lần seed.
        private static readonly DateTime Today = new DateTime(2026, 5, 31);

        public static async Task SeedAsync(
            ApplicationDbContext context,
            UserManager<AppUser> userManager,
            RoleManager<IdentityRole<Guid>> roleManager,
            ITenantService tenantService)
        {
            // 0. Bỏ qua nếu tenant đã có
            var existing = await context.Tenants.IgnoreQueryFilters()
                .FirstOrDefaultAsync(t => t.Slug == TenantSlug);
            if (existing != null) return;

            // Đảm bảo các role hệ thống tồn tại (DbInitializer chính đã chạy trước, nhưng vẫn check).
            foreach (var roleName in new[] {
                nameof(UserSystemRole.SuperAdmin),
                nameof(UserSystemRole.TenantOwner),
                nameof(UserSystemRole.TenantAdmin),
                nameof(UserSystemRole.Employee) })
            {
                if (!await roleManager.RoleExistsAsync(roleName))
                    await roleManager.CreateAsync(new IdentityRole<Guid>(roleName));
            }

            // 1. Tạo Tenant XDE
            var tenant = new Tenant
            {
                Id = Guid.NewGuid(),
                Name = TenantName,
                Slug = TenantSlug,
                Status = TenantStatus.Active,
                LogoUrl = "/logos/xuandat.png"
            };
            context.Tenants.Add(tenant);
            await context.SaveChangesAsync();

            // Đặt tenant context để các SaveChanges sau tự gán TenantId qua DbContext.
            tenantService.SetTenant(tenant.Id, tenant.Slug);

            // 2. Phòng ban (cây 3 cấp)
            var departments = SeedDepartments(context, tenant.Id);
            await context.SaveChangesAsync();

            // 3. Skill catalog
            var skills = SeedSkills(context, tenant.Id);
            await context.SaveChangesAsync();

            // 4. Khách hàng
            var customers = SeedCustomers(context, tenant.Id);
            await context.SaveChangesAsync();

            // 5. RBAC matrix
            SeedRolePermissions(context, tenant.Id);
            await context.SaveChangesAsync();

            // 6. Nhân sự (~100), kèm Skill + Certificate + Workload
            var employees = await SeedEmployeesAsync(
                context, userManager, tenant.Id, departments, skills);

            // 7. Dự án (15) + Phase + Task + Members
            var projects = SeedProjectsAndTasks(context, tenant.Id, employees, customers);
            await context.SaveChangesAsync();

            // 8. KPI snapshots theo phòng + công ty
            SeedKpis(context, tenant.Id, departments);
            await context.SaveChangesAsync();

            // 9. AI Assignment Suggestions (10 tình huống)
            SeedAiSuggestions(context, tenant.Id, employees, projects);
            await context.SaveChangesAsync();

            // 10. Notifications mới nhất
            SeedNotifications(context, tenant.Id, employees);
            await context.SaveChangesAsync();
        }

        // ============================================================
        // 2. DEPARTMENTS
        // ============================================================
        private static Dictionary<string, Department> SeedDepartments(
            ApplicationDbContext ctx, Guid tenantId)
        {
            Department Make(string name, string desc, Guid? parent = null) => new Department
            {
                Id = Guid.NewGuid(),
                Name = name,
                Description = desc,
                ParentDepartmentId = parent,
                TenantId = tenantId
            };

            var bgd = Make("Ban Giám đốc", "Ban điều hành công ty");
            // Khối Kinh doanh
            var kd = Make("Khối Kinh doanh", "Phụ trách doanh thu toàn quốc");
            var kdMN = Make("KD Miền Nam", "Phòng KD Miền Nam", kd.Id);
            var kdMB = Make("KD Miền Bắc", "Phòng KD Miền Bắc", kd.Id);
            var kdDA = Make("KD Dự án", "Project Sales – đấu thầu EPC", kd.Id);
            // Khối Kỹ thuật
            var kt = Make("Khối Kỹ thuật", "Tự động hoá – EPC – Bảo trì");
            var auto = Make("Phòng Tự động hoá", "PLC, SCADA, Drive", kt.Id);
            var epc = Make("Phòng Dự án Kỹ thuật", "Thiết kế và thi công EPC", kt.Id);
            var maint = Make("Phòng Bảo trì – Dịch vụ", "Field service & hotline 24/7", kt.Id);
            // Khối Vận hành
            var ops = Make("Khối Vận hành", "Kho vận và mua hàng");
            var wh = Make("Phòng Kho vận", "Logistics & warehouse", ops.Id);
            var pur = Make("Phòng Mua hàng", "Sourcing & procurement", ops.Id);
            // Tài chính
            var fin = Make("Phòng Tài chính – Kế toán", "Finance & accounting");
            // Khối Hỗ trợ
            var sup = Make("Khối Hỗ trợ", "HR / IT / Marketing / QC");
            var hr = Make("Phòng Nhân sự – Hành chính", "HR & Admin", sup.Id);
            var mkt = Make("Phòng Marketing", "Marketing & truyền thông", sup.Id);
            var it = Make("Phòng IT nội bộ", "Hạ tầng IT nội bộ", sup.Id);
            var qc = Make("Phòng QA/QC", "Quản lý chất lượng", sup.Id);

            ctx.Departments.AddRange(bgd, kd, kdMN, kdMB, kdDA, kt, auto, epc, maint,
                ops, wh, pur, fin, sup, hr, mkt, it, qc);

            return new Dictionary<string, Department>
            {
                ["BGD"] = bgd, ["KD"] = kd, ["KD-MN"] = kdMN, ["KD-MB"] = kdMB, ["KD-DA"] = kdDA,
                ["KT"] = kt, ["AUTO"] = auto, ["EPC"] = epc, ["MAINT"] = maint,
                ["OPS"] = ops, ["WH"] = wh, ["PUR"] = pur,
                ["FIN"] = fin,
                ["SUP"] = sup, ["HR"] = hr, ["MKT"] = mkt, ["IT"] = it, ["QC"] = qc
            };
        }

        // ============================================================
        // 3. SKILLS CATALOG
        // ============================================================
        private static Dictionary<string, Skill> SeedSkills(
            ApplicationDbContext ctx, Guid tenantId)
        {
            string[][] catalog = new[]
            {
                new[] { "PLC Mitsubishi", "PLC" },
                new[] { "PLC Siemens", "PLC" },
                new[] { "PLC Omron", "PLC" },
                new[] { "SCADA WinCC", "SCADA" },
                new[] { "SCADA Wonderware", "SCADA" },
                new[] { "SCADA Citect", "SCADA" },
                new[] { "HMI Design", "SCADA" },
                new[] { "Biến tần ABB", "Drive" },
                new[] { "Biến tần Mitsubishi", "Drive" },
                new[] { "Servo Motion", "Drive" },
                new[] { "Tủ MCC – MSB", "Power" },
                new[] { "AutoCAD Electrical", "Design" },
                new[] { "EPLAN", "Design" },
                new[] { "Revit MEP", "Design" },
                new[] { "ETAP", "Design" },
                new[] { "Quản lý dự án", "PM" },
                new[] { "Đấu thầu EPC", "PM" },
                new[] { "Đào tạo nội bộ", "Soft" },
                new[] { "Đàm phán khách hàng", "Sales" },
                new[] { "Tư vấn giải pháp", "Sales" },
                new[] { "Kế toán quản trị", "Finance" },
                new[] { "Thuế & IFRS", "Finance" },
                new[] { "Quản trị mạng", "IT" },
                new[] { "Microsoft 365 / Azure", "IT" },
                new[] { "Quản lý kho – ERP", "Ops" }
            };

            var dict = new Dictionary<string, Skill>(StringComparer.OrdinalIgnoreCase);
            foreach (var s in catalog)
            {
                var sk = new Skill
                {
                    Id = Guid.NewGuid(),
                    Name = s[0],
                    Category = s[1],
                    TenantId = tenantId
                };
                ctx.Skills.Add(sk);
                dict[s[0]] = sk;
            }
            return dict;
        }

        // ============================================================
        // 4. CUSTOMERS
        // ============================================================
        private static Dictionary<string, Customer> SeedCustomers(
            ApplicationDbContext ctx, Guid tenantId)
        {
            (string code, string name, string industry)[] data = new[]
            {
                ("VNM",   "Công ty CP Sữa Việt Nam – Vinamilk", "FMCG"),
                ("CCV",   "Coca-Cola Việt Nam", "FMCG"),
                ("VSIP",  "BQL KCN VSIP II", "Khu công nghiệp"),
                ("MML",   "Masan MEATLife", "Thực phẩm"),
                ("LZD",   "Lazada Logistics", "Logistics"),
                ("PEPS",  "Suntory PepsiCo VN", "FMCG"),
                ("KCNST", "BQL KCN Sóng Thần", "Khu công nghiệp"),
                ("TNG",   "Công ty CP Đầu tư & TM TNG", "Dệt may"),
                ("SUN",   "Sunwah Group", "Bất động sản"),
                ("SGB",   "Saint-Gobain Việt Nam", "Vật liệu xây dựng"),
                ("VWS",   "CTCP Nước sạch Sông Đà – Viwasupco", "Tiện ích"),
                ("LMP",   "Lee & Man Paper", "Giấy"),
                ("HNK",   "Heineken Việt Nam", "FMCG"),
                ("FXC",   "Foxconn Việt Nam", "Điện tử"),
                ("SCH",   "Schneider Electric VN", "Tự động hoá")
            };

            var dict = new Dictionary<string, Customer>();
            foreach (var d in data)
            {
                var c = new Customer
                {
                    Id = Guid.NewGuid(),
                    Code = d.code,
                    Name = d.name,
                    Industry = d.industry,
                    TenantId = tenantId
                };
                ctx.Customers.Add(c);
                dict[d.code] = c;
            }
            return dict;
        }

        // ============================================================
        // 5. RBAC MATRIX
        // ============================================================
        private static void SeedRolePermissions(ApplicationDbContext ctx, Guid tenantId)
        {
            // Quy ước: V/C/E/D = View/Create/Edit/Delete; S = Scope.
            // r,m,perm,scope
            (string role, string mod, bool v, bool c, bool e, bool d, string scope)[] rows =
            {
                // CEO – toàn quyền
                ("CEO", "Dashboard", true, true, true, true, "All"),
                ("CEO", "AIAssistant", true, true, true, true, "All"),
                ("CEO", "HR", true, true, true, true, "All"),
                ("CEO", "Project", true, true, true, true, "All"),
                ("CEO", "Task", true, true, true, true, "All"),
                ("CEO", "Report", true, true, true, true, "All"),
                ("CEO", "Document", true, true, true, true, "All"),
                ("CEO", "Customer", true, true, true, true, "All"),
                ("CEO", "Config", true, true, true, true, "All"),
                ("CEO", "Permission", true, true, true, true, "All"),
                // Director
                ("Director", "Dashboard", true, false, false, false, "All"),
                ("Director", "AIAssistant", true, true, false, false, "All"),
                ("Director", "HR", true, true, true, false, "Department"),
                ("Director", "Project", true, true, true, false, "All"),
                ("Director", "Task", true, true, true, false, "All"),
                ("Director", "Report", true, true, false, false, "All"),
                ("Director", "Document", true, true, true, false, "All"),
                ("Director", "Customer", true, true, true, false, "All"),
                ("Director", "Config", false, false, false, false, "None"),
                ("Director", "Permission", false, false, false, false, "None"),
                // Manager
                ("Manager", "Dashboard", true, false, false, false, "Department"),
                ("Manager", "AIAssistant", true, true, false, false, "Department"),
                ("Manager", "HR", true, true, true, false, "Department"),
                ("Manager", "Project", true, true, true, false, "Department"),
                ("Manager", "Task", true, true, true, true, "Department"),
                ("Manager", "Report", true, false, false, false, "Department"),
                ("Manager", "Document", true, true, true, false, "Department"),
                ("Manager", "Customer", true, true, false, false, "Department"),
                ("Manager", "Config", false, false, false, false, "None"),
                ("Manager", "Permission", false, false, false, false, "None"),
                // Team Leader
                ("TeamLeader", "Dashboard", true, false, false, false, "Team"),
                ("TeamLeader", "AIAssistant", true, true, false, false, "Team"),
                ("TeamLeader", "HR", true, false, false, false, "Team"),
                ("TeamLeader", "Project", true, false, true, false, "Team"),
                ("TeamLeader", "Task", true, true, true, false, "Team"),
                ("TeamLeader", "Report", true, false, false, false, "Team"),
                ("TeamLeader", "Document", true, true, true, false, "Team"),
                ("TeamLeader", "Customer", true, false, false, false, "Team"),
                ("TeamLeader", "Config", false, false, false, false, "None"),
                ("TeamLeader", "Permission", false, false, false, false, "None"),
                // Senior
                ("Senior", "Dashboard", true, false, false, false, "Self"),
                ("Senior", "AIAssistant", true, true, false, false, "Self"),
                ("Senior", "HR", false, false, false, false, "None"),
                ("Senior", "Project", true, false, false, false, "Team"),
                ("Senior", "Task", true, true, true, false, "Self"),
                ("Senior", "Report", true, false, false, false, "Self"),
                ("Senior", "Document", true, true, true, false, "Self"),
                ("Senior", "Customer", true, false, false, false, "Team"),
                ("Senior", "Config", false, false, false, false, "None"),
                ("Senior", "Permission", false, false, false, false, "None"),
                // Staff
                ("Staff", "Dashboard", true, false, false, false, "Self"),
                ("Staff", "AIAssistant", true, false, false, false, "Self"),
                ("Staff", "HR", false, false, false, false, "None"),
                ("Staff", "Project", true, false, false, false, "Self"),
                ("Staff", "Task", true, false, true, false, "Self"),
                ("Staff", "Report", false, false, false, false, "None"),
                ("Staff", "Document", true, true, false, false, "Self"),
                ("Staff", "Customer", false, false, false, false, "None"),
                ("Staff", "Config", false, false, false, false, "None"),
                ("Staff", "Permission", false, false, false, false, "None"),
                // Intern
                ("Intern", "Dashboard", true, false, false, false, "Self"),
                ("Intern", "AIAssistant", true, false, false, false, "Self"),
                ("Intern", "HR", false, false, false, false, "None"),
                ("Intern", "Project", true, false, false, false, "Self"),
                ("Intern", "Task", true, false, false, false, "Self"),
                ("Intern", "Report", false, false, false, false, "None"),
                ("Intern", "Document", true, false, false, false, "Self"),
                ("Intern", "Customer", false, false, false, false, "None"),
                ("Intern", "Config", false, false, false, false, "None"),
                ("Intern", "Permission", false, false, false, false, "None"),
            };

            foreach (var r in rows)
            {
                ctx.RolePermissions.Add(new RolePermission
                {
                    RoleName = r.role,
                    Module = r.mod,
                    CanView = r.v,
                    CanCreate = r.c,
                    CanEdit = r.e,
                    CanDelete = r.d,
                    Scope = r.scope,
                    TenantId = tenantId
                });
            }
        }
    }
}
