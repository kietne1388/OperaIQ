using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json;

namespace OperaIQ.Infrastructure.Services
{
    /// <summary>
    /// Helper service that stores the conversation with Gemini and trims it when the token budget is near the limit.
    /// It also keeps a short summary of older messages so the model can retain the context without blowing up the token count.
    /// </summary>
    public class ChatHistoryService
    {
        private const int MaxTokens = 3000; // adjust to your model's window (e.g., 4k tokens)
        private const int ApproxCharsPerToken = 4; // rough estimate
        private readonly string _historyFilePath;
        private readonly string _summaryFilePath;

        private List<Message> _messages = new();
        private string _summary = string.Empty;

        public ChatHistoryService(string storageDirectory)
        {
            Directory.CreateDirectory(storageDirectory);
            _historyFilePath = Path.Combine(storageDirectory, "chat_history.json");
            _summaryFilePath = Path.Combine(storageDirectory, "chat_summary.txt");
            Load();
        }

        // Simple message model compatible with Gemini (role + content)
        private class Message
        {
            public string Role { get; set; } = string.Empty;
            public string Content { get; set; } = string.Empty;
        }

        /// <summary>
        /// Adds a new message (either user or assistant) and automatically trims the history.
        /// </summary>
        public void AddMessage(string role, string content)
        {
            _messages.Add(new Message { Role = role, Content = content });
            TrimIfNecessary();
            Save();
        }

        /// <summary>
        /// Returns the list of messages that should be sent to the model.
        /// It includes the stored summary (as a system message) followed by the recent messages.
        /// </summary>
        public IEnumerable<(string role, string content)> GetPayload()
        {
            var payload = new List<(string, string)>();
            if (!string.IsNullOrWhiteSpace(_summary))
            {
                payload.Add(("system", $"Summary of earlier conversation: {_summary}"));
            }
            payload.AddRange(_messages.Select(m => (m.Role, m.Content)));
            return payload;
        }

        // Rough token count based on character length.
        private int ApproxTokenCount()
        {
            int chars = _messages.Sum(m => m.Content.Length) + _summary.Length;
            return chars / ApproxCharsPerToken;
        }

        // If we exceed the budget, collapse the oldest messages into a summary.
        private void TrimIfNecessary()
        {
            if (ApproxTokenCount() <= MaxTokens) return;

            // Take the earliest 5 messages (or whatever makes sense) and summarize them.
            var toSummarize = _messages.Take(5).ToList();
            var summaryText = string.Join(" ", toSummarize.Select(m => m.Content));
            // Very naive summary – replace with an actual model call for a proper summary.
            _summary = string.IsNullOrWhiteSpace(_summary) ? summaryText : _summary + " " + summaryText;

            // Remove summarized messages.
            _messages = _messages.Skip(5).ToList();
        }

        private void Save()
        {
            File.WriteAllText(_historyFilePath, JsonConvert.SerializeObject(_messages, Formatting.Indented));
            File.WriteAllText(_summaryFilePath, _summary);
        }

        private void Load()
        {
            if (File.Exists(_historyFilePath))
            {
                var json = File.ReadAllText(_historyFilePath);
                _messages = JsonConvert.DeserializeObject<List<Message>>(json) ?? new List<Message>();
            }
            if (File.Exists(_summaryFilePath))
            {
                _summary = File.ReadAllText(_summaryFilePath);
            }
        }
    }
}
