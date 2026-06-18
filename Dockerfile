# =====================================================
# Stage 1: Build
# =====================================================
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy solution and restore dependencies first (layer cache)
COPY OperaIQ.slnx ./
COPY OperaIQ.Domain/OperaIQ.Domain.csproj         OperaIQ.Domain/
COPY OperaIQ.Application/OperaIQ.Application.csproj OperaIQ.Application/
COPY OperaIQ.Infrastructure/OperaIQ.Infrastructure.csproj OperaIQ.Infrastructure/
COPY OperaIQ.Web/OperaIQ.Web.csproj               OperaIQ.Web/

RUN dotnet restore OperaIQ.Web/OperaIQ.Web.csproj

# Copy the full source
COPY OperaIQ.Domain/         OperaIQ.Domain/
COPY OperaIQ.Application/    OperaIQ.Application/
COPY OperaIQ.Infrastructure/ OperaIQ.Infrastructure/
COPY OperaIQ.Web/            OperaIQ.Web/

# Publish
RUN dotnet publish OperaIQ.Web/OperaIQ.Web.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

# =====================================================
# Stage 2: Runtime (nhẹ hơn nhiều)
# =====================================================
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

# Tạo user non-root để bảo mật
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

# Copy published output
COPY --from=build /app/publish .

# Đổi ownership
RUN chown -R appuser:appgroup /app
USER appuser

# Render inject PORT động; fallback 8080 cho Fly.io/local
ENV ASPNETCORE_URLS=http://+:${PORT:-8080}
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080

ENTRYPOINT ["dotnet", "OperaIQ.Web.dll"]
