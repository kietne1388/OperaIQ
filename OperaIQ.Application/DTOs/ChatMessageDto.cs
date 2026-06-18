namespace OperaIQ.Application.DTOs
{
    public class ChatMessageDto
    {
        public string Role { get; set; } = string.Empty; // "user" or "model" / "assistant"
        public string Content { get; set; } = string.Empty;
    }
}
