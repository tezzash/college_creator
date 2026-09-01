import React from 'react';
import { MessageSquare } from 'lucide-react';

interface InboxButtonProps {
  onClick: () => void;
  unreadCount?: number;
  variant?: 'compact' | 'full' | 'icon' | 'badge-button';
  className?: string;
  label?: string;
}

export const InboxButton: React.FC<InboxButtonProps> = ({
  onClick,
  unreadCount = 0,
  variant = 'compact',
  className = '',
  label = 'Private Inbox',
}) => {
  const hasUnread = unreadCount > 0;

  if (variant === 'icon') {
    return (
      <button
        onClick={onClick}
        className={`relative p-1.5 sm:p-2 rounded-xl bg-[#141824] hover:bg-[#1A2030] border ${
          hasUnread ? 'border-rose-500/50 bg-rose-950/20 text-rose-400' : 'border-purple-500/30 text-purple-400'
        } hover:text-white transition-all cursor-pointer flex items-center justify-center ${className}`}
        title={`Campus Private Inbox & DMs ${hasUnread ? `(${unreadCount} unread)` : ''}`}
      >
        <MessageSquare className="w-4 h-4" />
        {hasUnread && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex items-center justify-center rounded-full h-4 min-w-[16px] px-1 bg-rose-600 border border-[#0E111B] text-[8px] font-black text-white shadow-lg shadow-rose-600/50">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </span>
        )}
      </button>
    );
  }

  if (variant === 'badge-button') {
    return (
      <button
        onClick={onClick}
        className={`relative px-2.5 py-1.5 rounded-xl ${
          hasUnread
            ? 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/40 text-rose-300'
            : 'bg-purple-500/15 hover:bg-purple-500/25 border-purple-500/30 text-purple-300'
        } border hover:text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${className}`}
      >
        <div className="relative">
          <MessageSquare className="w-3.5 h-3.5" />
          {hasUnread && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
          )}
        </div>
        <span>{label}</span>
        {hasUnread && (
          <span className="min-w-[16px] h-[16px] bg-rose-600 text-white text-[8px] font-black rounded-full flex items-center justify-center px-1 shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    );
  }

  if (variant === 'full') {
    return (
      <button
        onClick={onClick}
        className={`w-full flex items-center justify-between p-3 rounded-2xl bg-[#181E2E] hover:bg-[#20273C] border ${
          hasUnread ? 'border-rose-500/40 bg-rose-950/10' : 'border-purple-500/30'
        } text-slate-200 transition-colors cursor-pointer text-left group ${className}`}
      >
        <div className="flex items-center gap-2.5">
          <div className={`relative w-8 h-8 rounded-xl ${
            hasUnread ? 'bg-rose-500/20 text-rose-400' : 'bg-purple-500/15 text-purple-400'
          } flex items-center justify-center group-hover:scale-105 transition-transform`}>
            <MessageSquare className="w-4 h-4" />
            {hasUnread && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
            )}
          </div>
          <div>
            <span className="text-xs font-black block text-white flex items-center gap-1.5">
              Private Inbox & Chat
              {hasUnread && (
                <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider">New</span>
              )}
            </span>
            <span className="text-[10px] text-purple-400 font-bold">1-on-1 private messaging with real classmates</span>
          </div>
        </div>
        {hasUnread && (
          <span className="min-w-[18px] h-[18px] bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 shadow-lg shadow-rose-600/40">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-xl ${
        hasUnread
          ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border-rose-500/40'
          : 'bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border-purple-500/30'
      } hover:text-white border text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${className}`}
    >
      <div className="relative">
        <MessageSquare className="w-3.5 h-3.5" />
        {hasUnread && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
        )}
      </div>
      <span>{label}</span>
      {hasUnread && (
        <span className="min-w-[16px] h-[16px] bg-rose-600 text-white text-[8px] font-black rounded-full flex items-center justify-center px-0.5">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};
