using System.Collections.Generic;

namespace OperaIQ.Application.DTOs
{
    // Tổng hợp số liệu hiển thị trên Dashboard
    public class DashboardSummaryDto
    {
        public int ProjectCount { get; set; }
        public int DocumentCount { get; set; }
        public int TaskCount { get; set; }
        public int CompletedTaskCount { get; set; }
        public List<TaskDto> RecentTasks { get; set; } = [];
    }
}
