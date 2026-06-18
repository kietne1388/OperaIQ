using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using OperaIQ.Domain.Entities;
using OperaIQ.Domain.Enums;

namespace OperaIQ.Infrastructure.Data
{
    public static class DbInitializer
    {
        public static async Task SeedAsync(
            ApplicationDbContext context,
            UserManager<AppUser> userManager,
            RoleManager<IdentityRole<Guid>> roleManager)
        {
            // Đảm bảo database đã được tạo
            await context.Database.MigrateAsync();

            // 1. Seed Roles hệ thống
            string[] roleNames = { 
                nameof(UserSystemRole.SuperAdmin), 
                nameof(UserSystemRole.TenantOwner), 
                nameof(UserSystemRole.TenantAdmin), 
                nameof(UserSystemRole.Employee) 
            };

            foreach (var roleName in roleNames)
            {
                if (!await roleManager.RoleExistsAsync(roleName))
                {
                    await roleManager.CreateAsync(new IdentityRole<Guid>(roleName));
                }
            }

            // 2. Seed SuperAdmin (Không thuộc Tenant nào)
            string superAdminEmail = "superadmin@operaiq.vn";
            var superAdmin = await userManager.FindByEmailAsync(superAdminEmail);
            if (superAdmin == null)
            {
                superAdmin = new AppUser
                {
                    UserName = superAdminEmail,
                    Email = superAdminEmail,
                    FullName = "Hệ thống SuperAdmin",
                    EmailConfirmed = true,
                    TenantId = null
                };
                
                var result = await userManager.CreateAsync(superAdmin, "Password123!");
                if (result.Succeeded)
                {
                    await userManager.AddToRoleAsync(superAdmin, nameof(UserSystemRole.SuperAdmin));
                }
            }

            // 2b. Seed tài khoản Admin cá nhân (kietnttb01357@gmail.com / 123)
            string kietEmail = "kietnttb01357@gmail.com";
            var kietUser = await userManager.FindByEmailAsync(kietEmail);
            if (kietUser == null)
            {
                kietUser = new AppUser
                {
                    UserName = kietEmail,
                    Email = kietEmail,
                    FullName = "Kiệt Trần – Admin",
                    EmailConfirmed = true,
                    TenantId = null // SuperAdmin không thuộc tenant, có thể truy cập mọi tenant
                };

                var kietResult = await userManager.CreateAsync(kietUser, "123");
                if (kietResult.Succeeded)
                {
                    await userManager.AddToRoleAsync(kietUser, nameof(UserSystemRole.SuperAdmin));
                }
            }

            // 3. Seed tenant OperaIQ Tech (không tạo tenant 'xuandat' — để XuanDatSeeder xử lý đầy đủ)
            var hasOperaIqTenant = await context.Tenants.IgnoreQueryFilters()
                .AnyAsync(t => t.Slug == "operaiq");
            if (!hasOperaIqTenant)
            {
                // ── Tenant: OperaIQ Tech ──
                var tenant1 = new Tenant
                {
                    Id = Guid.NewGuid(),
                    Name = "Công ty Cổ phần Công nghệ OperaIQ",
                    Slug = "operaiq",
                    Status = TenantStatus.Active
                };

                await context.Tenants.AddRangeAsync(tenant1);
                await context.SaveChangesAsync();

                var deptTech = new Department
                {
                    Id = Guid.NewGuid(),
                    Name = "Phòng Công nghệ & Phát triển",
                    Description = "Nghiên cứu phát triển sản phẩm công nghệ",
                    TenantId = tenant1.Id
                };

                await context.Departments.AddAsync(deptTech);
                await context.SaveChangesAsync();

                var owner = new AppUser
                {
                    UserName = "owner@operaiq.vn",
                    Email = "owner@operaiq.vn",
                    FullName = "Nguyễn Văn Chủ",
                    EmailConfirmed = true,
                    TenantId = tenant1.Id,
                    DepartmentId = null
                };
                if ((await userManager.CreateAsync(owner, "Password123!")).Succeeded)
                {
                    await userManager.AddToRoleAsync(owner, nameof(UserSystemRole.TenantOwner));
                }

                var dev = new AppUser
                {
                    UserName = "dev1@operaiq.vn",
                    Email = "dev1@operaiq.vn",
                    FullName = "Phạm Văn Lập Trình",
                    EmailConfirmed = true,
                    TenantId = tenant1.Id,
                    DepartmentId = deptTech.Id
                };
                if ((await userManager.CreateAsync(dev, "Password123!")).Succeeded)
                {
                    await userManager.AddToRoleAsync(dev, nameof(UserSystemRole.Employee));
                }
            }
        }
    }
}
