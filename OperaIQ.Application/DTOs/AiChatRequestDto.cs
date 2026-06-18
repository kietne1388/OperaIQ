using System.Collections.Generic;

namespace OperaIQ.Application.DTOs
{
    public class AiChatRequestDto
    {
        public string ModelProvider { get; set; } = "gemini"; // "gemini" or "claude"
        public string SelectedModel { get; set; } = "gemini-1.5-flash";
        public string ChatMode { get; set; } = "search"; // "search" or "report"
        public List<ChatMessageDto> Messages { get; set; } = new List<ChatMessageDto>();
    }
}
