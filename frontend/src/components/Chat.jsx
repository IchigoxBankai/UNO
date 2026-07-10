import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { Send, Smile } from 'lucide-react';

export const Chat = () => {
  const { chatMessages, sendChat } = useSocket();
  const [text, setText] = useState('');
  const messagesEndRef = useRef(null);

  const emojiShortcuts = ['🔥', '😂', '🎉', '😮', '🃏', '👍', '🤫', '😭'];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendChat(text);
    setText('');
  };

  const handleEmojiClick = (emoji) => {
    sendChat(emoji);
  };

  return (
    <div className="flex flex-col h-full glass-panel rounded-2xl overflow-hidden border border-white/10">
      {/* Header */}
      <div className="px-4 py-3 bg-white/5 border-b border-white/10 flex items-center justify-between">
        <h3 className="font-semibold text-sm tracking-wide text-indigo-200">GAME ROOM CHAT</h3>
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {chatMessages.length === 0 ? (
          <div className="text-center text-xs text-slate-500 mt-8 italic">
            No messages yet. Say hello!
          </div>
        ) : (
          chatMessages.map((msg) => {
            const isSystem = msg.type === 'system';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  isSystem 
                    ? 'items-center text-center my-1' 
                    : 'items-start'
                }`}
              >
                {isSystem ? (
                  <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] sm:text-xs text-indigo-300 font-medium max-w-full truncate">
                    {msg.text}
                  </span>
                ) : (
                  <div className="max-w-[85%] bg-white/5 border border-white/10 rounded-2xl rounded-tl-none px-3 py-1.5 text-xs sm:text-sm">
                    <span className="block text-[10px] font-semibold text-indigo-300 mb-0.5">
                      {msg.sender}
                    </span>
                    <span className="text-slate-200 break-words leading-relaxed">{msg.text}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Reactions Bar */}
      <div className="px-3 py-2 bg-black/10 border-t border-white/5 flex justify-between gap-1 overflow-x-auto">
        {emojiShortcuts.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleEmojiClick(emoji)}
            className="hover:scale-125 transition-transform text-base p-1 active:scale-95"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-3 bg-white/5 border-t border-white/10 flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Send message..."
          className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 text-slate-100 placeholder-slate-500"
        />
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-xl active:scale-95 transition-all shadow-md flex items-center justify-center"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
