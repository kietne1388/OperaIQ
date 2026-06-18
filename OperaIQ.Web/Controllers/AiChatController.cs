using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OperaIQ.Application.DTOs;
using OperaIQ.Application.Services;

namespace OperaIQ.Web.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AiChatController : ControllerBase
    {
        private readonly IAiTaskService _aiTaskService;

        public AiChatController(IAiTaskService aiTaskService)
        {
            _aiTaskService = aiTaskService;
        }

        [HttpPost]
        public async Task<IActionResult> Chat([FromBody] AiChatRequestDto request)
        {
            if (request == null || request.Messages == null || request.Messages.Count == 0)
            {
                return BadRequest("Invalid request.");
            }

            string systemContext = "Bạn là trợ lý AI thông minh của hệ thống OperaIQ. Hãy hỗ trợ quản lý nhân sự, dự án, tài liệu. QUY TẮC BẮT BUỘC: Trả lời cực kỳ ngắn gọn, súc tích, đi thẳng vào vấn đề, sử dụng gạch đầu dòng hoặc bảng biểu để tối giản thông tin. Tuyệt đối tránh viết lời mở đầu, giới thiệu, hoặc lời kết rườm rà. Nói tiếng Việt.";

            var result = await _aiTaskService.ChatAsync(request, systemContext);

            if (result.IsSuccess)
            {
                return Ok(new { Response = result.Value });
            }
            
            return StatusCode(500, result.Error);
        }
    }
}
