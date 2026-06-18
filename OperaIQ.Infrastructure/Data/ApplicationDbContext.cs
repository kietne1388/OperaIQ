using System;
using System.Linq;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using OperaIQ.Application.Common;
using OperaIQ.Domain.Common;
using OperaIQ.Domain.Entities;

namespace OperaIQ.Infrastructure.Data
{
    public class ApplicationDbContext : IdentityDbContext<AppUser, IdentityRole<Guid>, Guid, 
        IdentityUserClaim<Guid>, UserRole, IdentityUserLogin<Guid>, 
        IdentityRoleClaim<Guid>, IdentityUserToken<Guid>>
    {
        private readonly ITenantService _tenantService;

        public ApplicationDbContext(
            DbContextOptions<ApplicationDbContext> options, 
            ITenantService tenantService)
            : base(options)
        {
            _tenantService = tenantService;
        }

        public DbSet<Tenant> Tenants => Set<Tenant>();
        public DbSet<Department> Departments => Set<Department>();
        public DbSet<Project> Projects => Set<Project>();
        public DbSet<ProjectTask> Tasks => Set<ProjectTask>();
        public DbSet<Document> Documents => Set<Document>();
        public DbSet<DocumentPermission> DocumentPermissions => Set<DocumentPermission>();
        public DbSet<ProjectMember> ProjectMembers => Set<ProjectMember>();
        public DbSet<Notification> Notifications => Set<Notification>();
        public DbSet<Skill> Skills => Set<Skill>();
        public DbSet<EmployeeSkill> EmployeeSkills => Set<EmployeeSkill>();
        public DbSet<EmployeeCertificate> EmployeeCertificates => Set<EmployeeCertificate>();
        public DbSet<Customer> Customers => Set<Customer>();
        public DbSet<ProjectPhase> ProjectPhases => Set<ProjectPhase>();
        public DbSet<WorkloadSnapshot> WorkloadSnapshots => Set<WorkloadSnapshot>();
        public DbSet<KpiSnapshot> KpiSnapshots => Set<KpiSnapshot>();
        public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
        public DbSet<AiAssignmentSuggestion> AiAssignmentSuggestions => Set<AiAssignmentSuggestion>();

        public Guid CurrentTenantId => _tenantService.TenantId ?? Guid.Empty;

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // Cấu hình bảng Identity
            builder.Entity<AppUser>(b =>
            {
                b.ToTable("Users");
                b.HasMany(e => e.UserRoles)
                 .WithOne(e => e.User)
                 .HasForeignKey(ur => ur.UserId)
                 .IsRequired();
            });

            builder.Entity<IdentityRole<Guid>>(b => b.ToTable("Roles"));
            builder.Entity<UserRole>(b =>
            {
                b.ToTable("UserRoles");
                b.HasOne(ur => ur.Role)
                 .WithMany()
                 .HasForeignKey(ur => ur.RoleId)
                 .IsRequired();
            });
            builder.Entity<IdentityUserClaim<Guid>>(b => b.ToTable("UserClaims"));
            builder.Entity<IdentityUserLogin<Guid>>(b => b.ToTable("UserLogins"));
            builder.Entity<IdentityRoleClaim<Guid>>(b => b.ToTable("RoleClaims"));
            builder.Entity<IdentityUserToken<Guid>>(b => b.ToTable("UserTokens"));

            // Cấu hình Department: Tự tham chiếu (Self-referencing tree)
            builder.Entity<Department>(entity =>
            {
                entity.ToTable("Departments");
                entity.HasOne(d => d.ParentDepartment)
                    .WithMany(d => d.Children)
                    .HasForeignKey(d => d.ParentDepartmentId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Cấu hình Project
            builder.Entity<Project>(entity =>
            {
                entity.ToTable("Projects");
                entity.HasOne(p => p.CreatedBy)
                    .WithMany()
                    .HasForeignKey(p => p.CreatedById)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Cấu hình ProjectMember
            builder.Entity<ProjectMember>(entity =>
            {
                entity.ToTable("ProjectMembers");
                entity.HasKey(pm => new { pm.ProjectId, pm.UserId });
                
                entity.HasOne(pm => pm.Project)
                    .WithMany(p => p.Members)
                    .HasForeignKey(pm => pm.ProjectId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(pm => pm.User)
                    .WithMany()
                    .HasForeignKey(pm => pm.UserId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Cấu hình ProjectTask
            builder.Entity<ProjectTask>(entity =>
            {
                entity.ToTable("Tasks");
                entity.HasOne(t => t.Project)
                    .WithMany(p => p.Tasks)
                    .HasForeignKey(t => t.ProjectId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(t => t.AssignedTo)
                    .WithMany()
                    .HasForeignKey(t => t.AssignedToId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Cấu hình Document
            builder.Entity<Document>(entity =>
            {
                entity.ToTable("Documents");
                entity.HasOne(d => d.UploadedBy)
                    .WithMany()
                    .HasForeignKey(d => d.UploadedById)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Cấu hình DocumentPermission
            builder.Entity<DocumentPermission>(entity =>
            {
                entity.ToTable("DocumentPermissions");
                entity.HasOne(dp => dp.Document)
                    .WithMany(d => d.Permissions)
                    .HasForeignKey(dp => dp.DocumentId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(dp => dp.User)
                    .WithMany()
                    .HasForeignKey(dp => dp.UserId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Cấu hình Notification
            builder.Entity<Notification>(entity =>
            {
                entity.ToTable("Notifications");
                entity.HasOne(n => n.User)
                    .WithMany()
                    .HasForeignKey(n => n.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Cấu hình Tenant
            builder.Entity<Tenant>(entity =>
            {
                entity.ToTable("Tenants");
                entity.HasIndex(t => t.Slug)
                    .IsUnique();
            });

            // Cấu hình AppUser self-reference (Manager) và quan hệ với Department
            builder.Entity<AppUser>(b =>
            {
                b.HasOne(u => u.Manager)
                 .WithMany()
                 .HasForeignKey(u => u.ManagerId)
                 .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(u => u.Department)
                 .WithMany(d => d.Members)
                 .HasForeignKey(u => u.DepartmentId)
                 .OnDelete(DeleteBehavior.Restrict);

                b.HasIndex(u => u.EmployeeCode);
            });

            // Cấu hình Project: PM relation
            builder.Entity<Project>(entity =>
            {
                entity.HasOne(p => p.ProjectManager)
                    .WithMany()
                    .HasForeignKey(p => p.ProjectManagerId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.Property(p => p.Budget).HasPrecision(18, 2);
                entity.HasIndex(p => p.Code);
            });

            // ProjectPhase
            builder.Entity<ProjectPhase>(entity =>
            {
                entity.ToTable("ProjectPhases");
                entity.HasOne(ph => ph.Project)
                    .WithMany(p => p.Phases)
                    .HasForeignKey(ph => ph.ProjectId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // ProjectTask: phase + parent + assigned-by
            builder.Entity<ProjectTask>(entity =>
            {
                entity.HasOne(t => t.Phase)
                    .WithMany(ph => ph.Tasks)
                    .HasForeignKey(t => t.PhaseId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(t => t.ParentTask)
                    .WithMany(t => t.SubTasks)
                    .HasForeignKey(t => t.ParentTaskId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(t => t.AssignedBy)
                    .WithMany()
                    .HasForeignKey(t => t.AssignedById)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(t => t.Code);
            });

            // Skill / EmployeeSkill / EmployeeCertificate
            builder.Entity<Skill>(e =>
            {
                e.ToTable("Skills");
                e.HasIndex(s => new { s.TenantId, s.Name });
            });

            builder.Entity<EmployeeSkill>(e =>
            {
                e.ToTable("EmployeeSkills");
                e.HasOne(es => es.User)
                 .WithMany(u => u.Skills)
                 .HasForeignKey(es => es.UserId)
                 .OnDelete(DeleteBehavior.Cascade);
                e.HasOne(es => es.Skill)
                 .WithMany(s => s.EmployeeSkills)
                 .HasForeignKey(es => es.SkillId)
                 .OnDelete(DeleteBehavior.Restrict);
            });

            builder.Entity<EmployeeCertificate>(e =>
            {
                e.ToTable("EmployeeCertificates");
                e.HasOne(c => c.User)
                 .WithMany(u => u.Certificates)
                 .HasForeignKey(c => c.UserId)
                 .OnDelete(DeleteBehavior.Cascade);
            });

            // Customer
            builder.Entity<Customer>(e =>
            {
                e.ToTable("Customers");
                e.HasIndex(c => new { c.TenantId, c.Code });
            });

            // WorkloadSnapshot / KpiSnapshot
            builder.Entity<WorkloadSnapshot>(e =>
            {
                e.ToTable("WorkloadSnapshots");
                e.HasOne(w => w.User)
                 .WithMany()
                 .HasForeignKey(w => w.UserId)
                 .OnDelete(DeleteBehavior.Cascade);
            });

            builder.Entity<KpiSnapshot>(e =>
            {
                e.ToTable("KpiSnapshots");
                e.Property(k => k.Value).HasPrecision(18, 2);
                e.Property(k => k.Target).HasPrecision(18, 2);
                e.HasOne(k => k.Department)
                 .WithMany()
                 .HasForeignKey(k => k.DepartmentId)
                 .OnDelete(DeleteBehavior.Restrict);
                e.HasOne(k => k.User)
                 .WithMany()
                 .HasForeignKey(k => k.UserId)
                 .OnDelete(DeleteBehavior.Restrict);
            });

            // RolePermission / AiAssignmentSuggestion
            builder.Entity<RolePermission>(e =>
            {
                e.ToTable("RolePermissions");
                e.HasIndex(r => new { r.TenantId, r.RoleName, r.Module }).IsUnique();
            });

            builder.Entity<AiAssignmentSuggestion>(e =>
            {
                e.ToTable("AiAssignmentSuggestions");
                e.HasOne(a => a.SuggestedUser)
                 .WithMany()
                 .HasForeignKey(a => a.SuggestedUserId)
                 .OnDelete(DeleteBehavior.Restrict);
                e.HasOne(a => a.Task)
                 .WithMany()
                 .HasForeignKey(a => a.TaskId)
                 .OnDelete(DeleteBehavior.SetNull);
            });

            // Thiết lập Global Query Filters cho Soft Delete và Tenant Isolation
            foreach (var entityType in builder.Model.GetEntityTypes())
            {
                // Bộ lọc Soft Delete cho BaseEntity
                if (typeof(BaseEntity).IsAssignableFrom(entityType.ClrType))
                {
                    var parameter = Expression.Parameter(entityType.ClrType, "e");
                    var isDeletedProperty = Expression.Property(parameter, nameof(BaseEntity.IsDeleted));
                    var compareDeleted = Expression.Equal(isDeletedProperty, Expression.Constant(false));

                    // Bộ lọc Tenant Isolation cho TenantBaseEntity
                    if (typeof(TenantBaseEntity).IsAssignableFrom(entityType.ClrType))
                    {
                        var tenantIdProperty = Expression.Property(parameter, nameof(TenantBaseEntity.TenantId));
                        var compareTenant = Expression.Equal(
                            tenantIdProperty,
                            Expression.Property(Expression.Constant(this), nameof(CurrentTenantId))
                        );

                        var combinedExpression = Expression.AndAlso(compareDeleted, compareTenant);
                        var lambda = Expression.Lambda(combinedExpression, parameter);
                        builder.Entity(entityType.ClrType).HasQueryFilter(lambda);
                    }
                    else
                    {
                        var lambda = Expression.Lambda(compareDeleted, parameter);
                        builder.Entity(entityType.ClrType).HasQueryFilter(lambda);
                    }
                }
                
                // Soft Delete filter cho AppUser
                if (entityType.ClrType == typeof(AppUser))
                {
                    var parameter = Expression.Parameter(typeof(AppUser), "u");
                    var isDeletedProperty = Expression.Property(parameter, nameof(AppUser.IsDeleted));
                    var compareDeleted = Expression.Equal(isDeletedProperty, Expression.Constant(false));
                    
                    var lambda = Expression.Lambda(compareDeleted, parameter);
                    builder.Entity(typeof(AppUser)).HasQueryFilter(lambda);
                }
            }

            // Tránh lỗi Multiple Cascade Paths trong SQL Server cho tất cả các mối quan hệ trỏ tới Tenant
            foreach (var entityType in builder.Model.GetEntityTypes())
            {
                var tenantForeignKeys = entityType.GetForeignKeys()
                    .Where(fk => fk.PrincipalEntityType.ClrType == typeof(Tenant))
                    .ToList();
                foreach (var fk in tenantForeignKeys)
                {
                    fk.DeleteBehavior = DeleteBehavior.Restrict;
                }
            }
        }

        public override Task<int> SaveChangesAsync(CancellationToken ct = default)
        {
            var entries = ChangeTracker.Entries()
                .Where(e => (e.Entity is BaseEntity || e.Entity is AppUser) && 
                            (e.State == EntityState.Added || e.State == EntityState.Modified || e.State == EntityState.Deleted));

            foreach (var entry in entries)
            {
                var now = DateTime.UtcNow;

                if (entry.Entity is BaseEntity baseEntity)
                {
                    if (entry.State == EntityState.Added)
                    {
                        baseEntity.CreatedAt = now;
                        baseEntity.UpdatedAt = now;
                        baseEntity.IsDeleted = false;

                        // Tự động gán TenantId cho TenantBaseEntity nếu trống
                        if (baseEntity is TenantBaseEntity tenantBaseEntity && tenantBaseEntity.TenantId == Guid.Empty)
                        {
                            tenantBaseEntity.TenantId = CurrentTenantId;
                        }
                    }
                    else if (entry.State == EntityState.Modified)
                    {
                        baseEntity.UpdatedAt = now;
                    }
                    else if (entry.State == EntityState.Deleted)
                    {
                        // Thay đổi hành vi xóa thành soft delete
                        entry.State = EntityState.Modified;
                        baseEntity.IsDeleted = true;
                        baseEntity.DeletedAt = now;
                        baseEntity.UpdatedAt = now;
                    }
                }
                else if (entry.Entity is AppUser user)
                {
                    if (entry.State == EntityState.Added)
                    {
                        user.CreatedAt = now;
                        user.UpdatedAt = now;
                        user.IsDeleted = false;
                        
                        if (user.TenantId == null || user.TenantId == Guid.Empty)
                        {
                            user.TenantId = CurrentTenantId == Guid.Empty ? null : CurrentTenantId;
                        }
                    }
                    else if (entry.State == EntityState.Modified)
                    {
                        user.UpdatedAt = now;
                    }
                    else if (entry.State == EntityState.Deleted)
                    {
                        entry.State = EntityState.Modified;
                        user.IsDeleted = true;
                        user.UpdatedAt = now;
                    }
                }
            }

            return base.SaveChangesAsync(ct);
        }
    }
}
