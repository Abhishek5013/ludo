import React, { useState } from 'react';
import { ChatMessage } from '../../types/ludo.js';
import { MessageSquare, Send, X } from 'lucide-react';

interface ChatDrawerProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const QUICK_EMOJIS = ['🎲', '🔥', '🏆', '😱', '👏', '🎯', '🚀', '😂'];

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  messages,
  onSendMessage,
  isOpen,
  onToggle,
}) => {
  const [inputText, setInputText] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const handleEmojiClick = (emoji: string) => {
    onSendMessage(emoji);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        type="button"
        onClick={onToggle}
        aria-label="Toggle in-game chat"
        className="fixed bottom-4 right-4 z-40 p-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-100 shadow-xl border border-slate-700 cursor-pointer active:scale-95 transition-transform flex items-center justify-center"
      >
        <MessageSquare className="w-5 h-5 text-amber-400" />
      </button>

      {/* Chat Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xs sm:max-w-sm bg-slate-900/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-slate-100">Game Chat</h3>
            </div>
            <button
              type="button"
              onClick={onToggle}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Reaction Bar */}
          <div className="p-2 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between gap-1 overflow-x-auto">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleEmojiClick(emoji)}
                className="text-lg p-1.5 rounded-lg hover:bg-slate-800 active:scale-125 transition-transform cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 text-center p-4">
                No messages yet. Send a quick reaction or chat with fellow players!
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className="bg-slate-950/60 rounded-xl p-2 border border-slate-800/70 text-xs flex flex-col gap-0.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">{msg.senderName}</span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <span className="text-slate-300 break-words">{msg.text}</span>
                </div>
              ))
            )}
          </div>

          {/* Message Input Form */}
          <form
            onSubmit={handleSend}
            className="p-3 border-t border-slate-800 bg-slate-950/70 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Say something..."
              maxLength={80}
              className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 cursor-pointer transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
