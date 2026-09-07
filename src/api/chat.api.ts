import apiClient from './client';

export interface ChatConversation {
  id: string;
  participantId: string;
  participantName: string;
  lastMessage?: string;
  updatedAt?: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
}

function listFromResponse(data: unknown, key: string): any[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const payload = data as Record<string, unknown>;
    if (Array.isArray(payload[key])) return payload[key] as any[];
    if (Array.isArray(payload.content)) return payload.content as any[];
    if (Array.isArray(payload.data)) return payload.data as any[];
  }
  return [];
}

export const chatApi = {
  getConversations: async (): Promise<ChatConversation[]> => {
    try {
      const response = await apiClient.get('/api/chats');
      return listFromResponse(response.data, 'conversations').map((conversation) => ({
        id: String(conversation.id || conversation.participantId),
        participantId: String(conversation.participantId || conversation.userId || conversation.id),
        participantName: conversation.participantName || conversation.name || conversation.userName || 'Karthikeya Farmer Producer Company Limited member',
        lastMessage: conversation.lastMessage || conversation.lastMessageContent,
        updatedAt: conversation.updatedAt || conversation.lastMessageAt,
      }));
    } catch {
      return [];
    }
  },

  getMessages: async (participantId: string): Promise<ChatMessage[]> => {
    try {
      const response = await apiClient.get(`/api/chats/${participantId}/messages`);
      return listFromResponse(response.data, 'messages').map((message) => ({
        id: String(message.id || message.messageId),
        content: message.content || '',
        senderId: String(message.senderId || message.sender?.id || ''),
        createdAt: message.createdAt || new Date().toISOString(),
      }));
    } catch {
      return [];
    }
  },

  sendMessage: async (participantId: string, content: string): Promise<ChatMessage> => {
    try {
      const response = await apiClient.post(`/api/chats/${participantId}/messages`, { content });
      const message = (response.data as any)?.data || response.data;
      return {
        id: String(message?.id || message?.messageId || `${Date.now()}`),
        content: message?.content || content,
        senderId: String(message?.senderId || message?.sender?.id || ''),
        createdAt: message?.createdAt || new Date().toISOString(),
      };
    } catch {
      return {
        id: `local-msg-${Date.now()}`,
        content,
        senderId: 'me',
        createdAt: new Date().toISOString(),
      };
    }
  },
};
