'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { MessageCircle, Search, Send } from 'lucide-react';
import { chatApi, ChatConversation, ChatMessage } from '@/api/chat.api';
import { useAuthStore } from '@/store/authStore';

export default function MessagesPage() {
  const user = useAuthStore((state) => state.user);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    let isMounted = true;
    chatApi
      .getConversations()
      .then((items) => {
        if (!isMounted) return;
        setConversations(items);
        setSelectedConversation(items[0] || null);
      })
      .catch((error) => console.error('Failed to load conversations', error))
      .finally(() => isMounted && setIsLoadingConversations(false));

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    setIsLoadingMessages(true);
    chatApi
      .getMessages(selectedConversation.participantId)
      .then((items) => isMounted && setMessages(items))
      .catch((error) => {
        console.error('Failed to load messages', error);
        if (isMounted) setMessages([]);
      })
      .finally(() => isMounted && setIsLoadingMessages(false));

    return () => {
      isMounted = false;
    };
  }, [selectedConversation]);

  const filteredConversations = useMemo(
    () => conversations.filter((conversation) => conversation.participantName.toLowerCase().includes(search.toLowerCase())),
    [conversations, search]
  );

  const handleSend = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedConversation || !draft.trim() || isSending) return;

    setIsSending(true);
    try {
      const message = await chatApi.sendMessage(selectedConversation.participantId, draft.trim());
      setMessages((currentMessages) => [...currentMessages, message]);
      setDraft('');
    } catch (error) {
      console.error('Failed to send message', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="section animate-fade-in">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold font-display text-dark-900 mb-6 flex items-center gap-3">
          <MessageCircle className="h-7 w-7 text-brand-600" />
          Messages
        </h1>

        <div className="card overflow-hidden" style={{ height: '600px' }}>
          <div className="flex h-full">
            <div className="w-72 border-r border-dark-100 flex flex-col">
              <div className="p-3 border-b border-dark-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400 pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search conversations…"
                    className="form-input pl-9 h-9 text-xs"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {isLoadingConversations ? (
                  <p className="p-6 text-center text-sm text-dark-500">Loading conversations…</p>
                ) : filteredConversations.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-center p-6">
                    <div>
                      <MessageCircle className="h-12 w-12 text-dark-200 mx-auto mb-3" />
                      <p className="text-sm text-dark-500">No conversations yet</p>
                    </div>
                  </div>
                ) : (
                  filteredConversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => setSelectedConversation(conversation)}
                      className={`w-full p-3 text-left border-b border-dark-100 transition-colors ${
                        selectedConversation?.id === conversation.id ? 'bg-brand-50' : 'hover:bg-dark-50'
                      }`}
                    >
                      <p className="text-sm font-semibold text-dark-800 truncate">{conversation.participantName}</p>
                      <p className="mt-0.5 text-xs text-dark-400 truncate">{conversation.lastMessage || 'Start a conversation'}</p>
                    </button>
                  ))
                )}
              </div>
            </div>

            {selectedConversation ? (
              <div className="flex-1 flex flex-col min-w-0">
                <div className="p-4 border-b border-dark-100">
                  <p className="font-semibold text-dark-800">{selectedConversation.participantName}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {isLoadingMessages ? (
                    <p className="text-center text-sm text-dark-500">Loading messages…</p>
                  ) : messages.length === 0 ? (
                    <p className="text-center text-sm text-dark-400">No messages yet. Say hello to start the conversation.</p>
                  ) : (
                    messages.map((message) => {
                      const isOwnMessage = Boolean(user?.id) && message.senderId === user?.id;
                      return (
                        <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                          <p className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${isOwnMessage ? 'bg-brand-600 text-white' : 'bg-dark-100 text-dark-800'}`}>
                            {message.content}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
                <form onSubmit={handleSend} className="p-3 border-t border-dark-100 flex gap-2">
                  <input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    className="form-input h-10 text-sm"
                    placeholder="Write a message…"
                  />
                  <button type="submit" className="btn-primary px-3" disabled={!draft.trim() || isSending} aria-label="Send message">
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center p-6">
                <div>
                  <MessageCircle className="h-16 w-16 text-dark-100 mx-auto mb-4" />
                  <h3 className="font-semibold text-dark-700 mb-1">Select a conversation</h3>
                  <p className="text-sm text-dark-400">Choose a conversation from the left to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
