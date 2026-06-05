'use client';

import { useEffect, useRef, useState } from 'react';
import PlatformTabs from '@/components/PlatformTabs';

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function Avatar({ name, size = 'md' }) {
  const initial = (name?.[0] ?? '?').toUpperCase();
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center font-bold text-white flex-shrink-0`}>
      {initial}
    </div>
  );
}

export default function MessagesPage() {
  const [platform, setPlatform] = useState('linkedin');
  const [conversations, setConversations] = useState([]);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [convosError, setConvosError] = useState('');

  const [selectedConvo, setSelectedConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState('');

  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const bottomRef = useRef(null);

  // Reload conversations when platform changes
  useEffect(() => {
    setConversations([]);
    setSelectedConvo(null);
    setMessages([]);
    setConvosError('');
  }, [platform]);

  // Load conversations
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/${platform}/conversations`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load conversations');
        setConversations(data.data ?? []);
      } catch (err) {
        setConvosError(err.message);
      } finally {
        setLoadingConvos(false);
      }
    }
    load();
  }, [platform]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (!selectedConvo) return;
    setLoadingMessages(true);
    setMessagesError('');
    setMessages([]);

    async function load() {
      try {
        const res = await fetch(`/api/${platform}/conversations/${selectedConvo.id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load messages');
        // Messages come newest-first; reverse for chat order
        setMessages((data.data ?? []).slice().reverse());
      } catch (err) {
        setMessagesError(err.message);
      } finally {
        setLoadingMessages(false);
      }
    }
    load();
  }, [selectedConvo]);

  // Scroll to bottom when messages load
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function getOtherParticipant(convo) {
    return convo.participants?.data?.find((p) => p.username) ?? convo.participants?.data?.[0];
  }

  async function sendReply(e) {
    e.preventDefault();
    if (!replyText.trim() || !selectedConvo) return;
    const other = getOtherParticipant(selectedConvo);
    if (!other?.id) return;

    setSending(true);
    setSendError('');
    try {
      const res = await fetch(`/api/${platform}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: other.id, message: replyText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      setMessages((prev) => [
        ...prev,
        {
          id: data.message_id ?? Date.now().toString(),
          text: replyText.trim(),
          from: { username: 'me' },
          timestamp: new Date().toISOString(),
          _optimistic: true,
        },
      ]);
      setReplyText('');
    } catch (err) {
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  }

  const other = selectedConvo ? getOtherParticipant(selectedConvo) : null;

  return (
    <div className="flex flex-col h-full">
      <PlatformTabs platform={platform} onChange={setPlatform} />
    <div className="flex flex-1 min-h-0">
      {/* Conversation list */}
      <div className="w-72 flex-shrink-0 border-r border-gray-100 flex flex-col bg-white">
        <div className="px-5 py-5 border-b border-gray-100">
          <h1 className="text-lg font-bold text-gray-900">Messages</h1>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConvos && (
            <div className="flex items-center justify-center py-16">
              <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {convosError && (
            <div className="flex flex-col items-center gap-3 px-5 py-8 text-center">
              <p className="text-sm text-red-500">
                {convosError.includes('disconnected') || convosError.includes('Disconnected account') ? (
                  <>Your LinkedIn account is disconnected. Please reconnect it to load your messages.</>
                ) : (
                  convosError
                )}
              </p>
              {(convosError.includes('disconnected') || convosError.includes('Disconnected account')) && (
                <a
                  href="/settings"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm text-center"
                >
                  Reconnect LinkedIn
                </a>
              )}
            </div>
          )}
          {!loadingConvos && !convosError && conversations.length === 0 && (
            <p className="text-sm text-gray-400 text-center px-5 py-8">No conversations yet.</p>
          )}
          {conversations.map((convo) => {
            const participant = getOtherParticipant(convo);
            const lastMsg = convo.messages?.data?.[0];
            const isSelected = selectedConvo?.id === convo.id;
            return (
              <button
                key={convo.id}
                onClick={() => setSelectedConvo(convo)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${
                  isSelected ? 'bg-violet-50 border-r-2 border-violet-500' : 'hover:bg-gray-50'
                }`}
              >
                <Avatar name={participant?.username ?? '?'} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {platform === 'instagram' ? '@' : ''}{participant?.username ?? 'Unknown'}
                    </span>
                    {convo.updated_time && (
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {timeAgo(convo.updated_time)}
                      </span>
                    )}
                  </div>
                  {lastMsg?.text && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{lastMsg.text}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Message thread */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50">
        {!selectedConvo ? (
          <div className="flex-1 flex items-center justify-center text-center px-8">
            <div>
              <div className="w-16 h-16 rounded-2xl bg-white border border-gray-200 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500">Select a conversation to read messages</p>
            </div>
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-gray-100">
              <Avatar name={other?.username ?? '?'} size="sm" />
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {platform === 'instagram' ? '@' : ''}{other?.username ?? 'Unknown'}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {loadingMessages && (
                <div className="flex items-center justify-center py-16">
                  <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {messagesError && (
                <p className="text-sm text-red-500 text-center py-8">{messagesError}</p>
              )}
              {!loadingMessages && messages.map((msg) => {
                const isMe = msg.from?.username === 'me' || msg._optimistic;
                return (
                  <div key={msg.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                    {!isMe && <Avatar name={other?.username ?? '?'} size="sm" />}
                    <div className={`max-w-xs lg:max-w-md ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isMe
                          ? 'bg-violet-600 text-white rounded-br-sm'
                          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                      }`}>
                        {msg.text}
                      </div>
                      <span className="text-xs text-gray-400 px-1">{timeAgo(msg.timestamp)}</span>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Reply input */}
            <div className="px-6 py-4 bg-white border-t border-gray-100">
              {sendError && <p className="text-xs text-red-500 mb-2">{sendError}</p>}
              <form onSubmit={sendReply} className="flex gap-3">
                <input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Message @${other?.username ?? ''}…`}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-colors"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !replyText.trim()}
                  className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
    </div>
  );
}
