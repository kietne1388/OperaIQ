import { api } from './client';

export interface ChatMessageDto {
    role: string;
    content: string;
}

export interface AiChatRequestDto {
    modelProvider: string;
    selectedModel: string;
    chatMode: string;
    messages: ChatMessageDto[];
}

export const aiChatApi = {
    chat: async (request: AiChatRequestDto) => {
        const response = await api.post('/AiChat', request);
        return response.data;
    }
};
