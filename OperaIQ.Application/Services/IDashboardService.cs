using System;
using System.Threading.Tasks;
using OperaIQ.Application.Common;
using OperaIQ.Application.DTOs;

namespace OperaIQ.Application.Services
{
    public interface IDashboardService
    {
        Task<DashboardSummaryDto> GetSummaryAsync(Guid userId, bool canSeeAll);
        Task<Result<string>> GetAiReportAsync(Guid userId, bool canSeeAll);
    }
}
