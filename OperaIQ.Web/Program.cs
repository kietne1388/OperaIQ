using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Hangfire;
using Microsoft.Extensions.Options;
using OperaIQ.Infrastructure.Settings;
using OperaIQ.Infrastructure.Clients;
using OperaIQ.Infrastructure.Extensions;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Logging;
using Microsoft.OpenApi.Models;
using OperaIQ.Application.Common;
using OperaIQ.Application.Mappings;
using OperaIQ.Application.Services;
using OperaIQ.Domain.Entities;
using OperaIQ.Domain.Enums;
using OperaIQ.Infrastructure.Data;
using OperaIQ.Infrastructure.Hubs;
using OperaIQ.Infrastructure.Repositories;
using OperaIQ.Infrastructure.Services;
using OperaIQ.Web.Middlewares;
using Serilog;

var builder = WebApplication.CreateBuilder(args);
// -------------------------------------------------
// Gemini configuration & client registration
// -------------------------------------------------
builder.Services.Configure<GeminiSettings>(builder.Configuration.GetSection("GeminiSettings"));
builder.Services.AddGeminiClient();

// 1. Serilog ghi log hệ thống
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.File("Logs/operaiq_log-.txt", rollingInterval: RollingInterval.Day)
    .CreateLogger();
builder.Host.UseSerilog();

// 2. Chuỗi kết nối SQL Server (dev) / PostgreSQL (production)
string connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Server=localhost;Database=OperaIQDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True;";

// Helper: chuyển postgresql://user:pass@host/db → Npgsql connection string
static string ParsePostgresUrl(string url)
{
    var uri = new Uri(url);
    var userInfo = uri.UserInfo.Split(':', 2);
    var host = uri.Host;
    var port = uri.Port > 0 ? uri.Port : 5432;
    var database = uri.AbsolutePath.TrimStart('/');
    var username = userInfo[0];
    var password = userInfo.Length > 1 ? userInfo[1] : string.Empty;
    // Render internal URLs không cần SSL; external URLs cần SSL Mode=Require
    var sslMode = host.EndsWith(".render.com") || !host.Contains(".") ? "Prefer" : "Require";
    return $"Host={host};Port={port};Database={database};Username={username};Password={password};SSL Mode={sslMode};Trust Server Certificate=true";
}

string? pgDatabaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
string npgsqlConnectionString = !string.IsNullOrEmpty(pgDatabaseUrl)
    ? ParsePostgresUrl(pgDatabaseUrl)
    : string.Empty;

builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    if (builder.Environment.IsProduction())
    {
        var connStr = !string.IsNullOrEmpty(npgsqlConnectionString)
            ? npgsqlConnectionString
            : connectionString;  // fallback
        options.UseNpgsql(connStr, b => b.MigrationsAssembly("OperaIQ.Infrastructure"));
    }
    else
    {
        options.UseSqlServer(connectionString, b => b.MigrationsAssembly("OperaIQ.Infrastructure"));
    }
});

// 3. ASP.NET Core Identity (AppUser + IdentityRole<Guid>)
builder.Services.AddIdentity<AppUser, IdentityRole<Guid>>(options =>
{
    options.Password.RequireDigit = false;
    options.Password.RequiredLength = 3;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequireUppercase = false;
    options.Password.RequireLowercase = false;
})
.AddEntityFrameworkStores<ApplicationDbContext>()
.AddDefaultTokenProviders();

// 4. Xác thực JWT Bearer (mặc định cho API + SignalR)
string jwtSecret = builder.Configuration["Jwt:Secret"] ?? "OperaIQSuperSecretSecurityKey1234567890!!!";
var jwtKey = Encoding.ASCII.GetBytes(jwtSecret);

builder.Services.AddAuthentication(options =>
{
    // QUAN TRỌNG: AddIdentity đặt DefaultAuthenticateScheme = cookie của Identity,
    // nên phải ghi đè cả 3 scheme về JWT, nếu không [Authorize] sẽ cố xác thực bằng
    // cookie (không tồn tại) → trả 401 dù token JWT hợp lệ.
    options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(JwtBearerDefaults.AuthenticationScheme, options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;

    // Không tự ánh xạ claim type sang URI dài — giữ literal "tenant_id"/"permissions",
    // ClaimTypes.Role, ClaimTypes.NameIdentifier để policy & SignalR hoạt động đúng.
    options.MapInboundClaims = false;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(jwtKey),
        ValidateIssuer = false,
        ValidateAudience = false,
        ClockSkew = TimeSpan.Zero,
        RoleClaimType = ClaimTypes.Role,
        NameClaimType = ClaimTypes.NameIdentifier
    };

    // Cho phép SignalR truyền token qua query string ?access_token=
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/notificationHub"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        },
        OnAuthenticationFailed = context =>
        {
            Log.Warning(context.Exception, "JWT authentication failed: {Message}", context.Exception.Message);
            return Task.CompletedTask;
        }
    };
});

// 5. Phân quyền RBAC Policies (rule.md §6.2)
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("SuperAdminOnly",
        p => p.RequireRole(nameof(UserSystemRole.SuperAdmin)));

    options.AddPolicy("CanCreateTask",
        p => p.RequireClaim("permissions", "task.create"));

    options.AddPolicy("CanAssignTask",
        p => p.RequireClaim("permissions", "task.assign"));

    options.AddPolicy("CanViewReport",
        p => p.RequireClaim("permissions", "report.view"));

    options.AddPolicy("TenantMember",
        p => p.RequireClaim("tenant_id"));
});

// 6. CORS cho React SPA (Vite dev server). SignalR cần origin tường minh + credentials.
builder.Services.AddCors(options =>
{
    options.AddPolicy("spa", policy =>
        policy.WithOrigins(
            "http://localhost:5173", "https://localhost:5173",
            "http://localhost:5174", "https://localhost:5174",
            "https://opera-ai-b0fea.web.app",   // Firebase Hosting
            "https://operaiq.fly.dev"            // Fly.io (nếu cần gọi chéo)
        )
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

// 7. DI cho Application & Infrastructure
builder.Services.AddHttpClient();
builder.Services.AddHttpContextAccessor();
builder.Services.AddAutoMapper(typeof(MappingProfile).Assembly);

builder.Services.AddScoped<ITenantService, TenantService>();
builder.Services.AddScoped(typeof(ITenantRepository<>), typeof(TenantRepository<>));

builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IProjectService, ProjectService>();
builder.Services.AddScoped<ITaskService, TaskService>();
builder.Services.AddScoped<IDocumentService, DocumentService>();
builder.Services.AddScoped<IDepartmentService, DepartmentService>();
builder.Services.AddScoped<IAiTaskService, AiTaskService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IUserService, UserService>();

// 8. SignalR
builder.Services.AddSignalR();

// 9. Hangfire (Background Jobs)
// Dùng PostgreSQL khi Production, SQL Server khi Development
if (builder.Environment.IsProduction())
{
    var hangfireConnStr = !string.IsNullOrEmpty(npgsqlConnectionString)
        ? npgsqlConnectionString
        : connectionString;
    builder.Services.AddHangfire(config =>
        config.UsePostgreSqlStorage(options => options.UseNpgsqlConnection(hangfireConnStr)));
}
else
{
    builder.Services.AddHangfire(config => config.UseSqlServerStorage(connectionString));
}
builder.Services.AddHangfireServer();

// 10. API Controllers — enum serialize dạng string để React dễ dùng.
builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

// 11. Swagger (chỉ Development) với Bearer auth.
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "OperaIQ API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Nhập JWT token (không cần tiền tố 'Bearer ')."
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// JWT handler mặc định vẫn ánh xạ inbound claim — xóa map tĩnh để chắc chắn dùng literal.
JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

var app = builder.Build();

// ----- HTTP pipeline -----
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Bắt exception toàn cục (trả JSON cho request /api)
app.UseMiddleware<GlobalExceptionMiddleware>();

app.UseRouting();

app.UseCors("spa");

app.UseAuthentication();

// QUAN TRỌNG: chạy SAU UseAuthentication để claim tenant_id từ JWT đã sẵn sàng.
app.UseMiddleware<TenantResolutionMiddleware>();

app.UseAuthorization();

// Hangfire Dashboard
app.UseHangfireDashboard("/hangfire");

app.MapControllers();
app.MapHub<NotificationHub>("/notificationHub");

// Seed dữ liệu hệ thống
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<ApplicationDbContext>();
        var userManager = services.GetRequiredService<UserManager<AppUser>>();
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        var tenantSvc = services.GetRequiredService<ITenantService>();
        await DbInitializer.SeedAsync(context, userManager, roleManager);
        await XuanDatSeeder.SeedAsync(context, userManager, roleManager, tenantSvc);
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Đã xảy ra lỗi khi seed dữ liệu.");
    }
}

app.Run();
