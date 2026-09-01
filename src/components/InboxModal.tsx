import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Send,
  MessageSquare,
  ArrowLeft,
  Search,
  Loader2,
  Users,
  RefreshCw,
  Clock,
  CheckCheck
} from 'lucide-react';
import { api } from '../api';
import { ConversationSummary, ChatMessage, Player } from '../types';
import { AvatarDisplay } from './AvatarDisplay';

interface InboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPartnerId?: string | null;
  showToast: (text: string, type?: 'error' | 'success' | 'info') => void;
  onInboxUpdated?: () => void;
}

export const InboxModal: React.FC<InboxModalProps> = ({
  isOpen,
  onClose,
  initialPartnerId,
  showToast,
  onInboxUpdated,
}) => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [activePartner, setActivePartner] = useState<Player | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeRealPlayers, setActiveRealPlayers] = useState<Player[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchInboxData = useCallback(async () => {
    try {
      setLoading(true);
      const [inboxRes, realPlayersRes] = await Promise.allSettled([
        api.getInbox(),
        api.getRealPlayers(),
      ]);

      if (inboxRes.status === 'fulfilled' && inboxRes.value) {
        setConversations(inboxRes.value.conversations || []);
      }

      if (realPlayersRes.status === 'fulfilled' && realPlayersRes.value) {
        setActiveRealPlayers(realPlayersRes.value.players || []);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load inbox messages.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadConversation = useCallback(
    async (partnerId: string) => {
      try {
        setLoadingChat(true);
        setSelectedPartnerId(partnerId);
        const res = await api.getConversation(partnerId);
        setActivePartner(res.partner);
        setMessages(res.messages || []);
        if (onInboxUpdated) onInboxUpdated();
      } catch (err: any) {
        showToast(err.message || 'Failed to load conversation.', 'error');
      } finally {
        setLoadingChat(false);
      }
    },
    [showToast, onInboxUpdated]
  );

  useEffect(() => {
    if (isOpen) {
      fetchInboxData();
      if (initialPartnerId) {
        loadConversation(initialPartnerId);
      } else {
        setSelectedPartnerId(null);
        setActivePartner(null);
      }
    }
  }, [isOpen, initialPartnerId, fetchInboxData, loadConversation]);

  // Active synchronization polling for open chat conversations
  useEffect(() => {
    if (!isOpen) return;

    const pollInterval = setInterval(async () => {
      if (selectedPartnerId && !sendingMessage) {
        try {
          const res = await api.getConversation(selectedPartnerId);
          setMessages(res.messages || []);
        } catch {
          // Ignore background sync errors
        }
      }
      try {
        const inboxRes = await api.getInbox();
        if (inboxRes && inboxRes.conversations) {
          setConversations(inboxRes.conversations);
        }
      } catch {
        // Ignore background sync errors
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [isOpen, selectedPartnerId, sendingMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedPartnerId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedPartnerId || sendingMessage) return;

    const content = messageInput.trim();
    setMessageInput('');
    setSendingMessage(true);

    try {
      const res = await api.sendMessage(selectedPartnerId, content);
      setMessages((prev) => [...prev, res.data]);
      fetchInboxData();
      if (onInboxUpdated) onInboxUpdated();
    } catch (err: any) {
      showToast(err.message || 'Failed to send message.', 'error');
      setMessageInput(content); // restore input
    } finally {
      setSendingMessage(false);
    }
  };

  if (!isOpen) return null;

  const filteredConversations = conversations.filter((c) =>
    c.partner.username.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-[#121624] border border-slate-800 w-full max-w-lg rounded-3xl p-4 sm:p-5 shadow-2xl space-y-3.5 max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 shrink-0">
            <div className="flex items-center gap-2.5">
              {selectedPartnerId ? (
                <button
                  onClick={() => {
                    setSelectedPartnerId(null);
                    setActivePartner(null);
                    fetchInboxData();
                  }}
                  className="p-1.5 rounded-xl bg-[#181E2E] hover:bg-[#20273C] text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Back to Conversations"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                  <MessageSquare className="w-5 h-5" />
                </div>
              )}

              <div>
                <h3 className="font-black text-base text-white flex items-center gap-2">
                  {selectedPartnerId && activePartner ? (
                    <>
                      <span>{activePartner.username}</span>
                      <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full truncate max-w-[120px]">
                        {activePartner.equippedTitle || 'Student'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>Private Inbox</span>
                      <span className="text-[10px] font-bold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                        {conversations.length} Active Chats
                      </span>
                    </>
                  )}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {selectedPartnerId
                    ? 'Encrypted peer-to-peer campus student direct message'
                    : '1-on-1 private messaging with real campus classmates'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  if (selectedPartnerId) {
                    loadConversation(selectedPartnerId);
                  } else {
                    fetchInboxData();
                  }
                }}
                disabled={loading || loadingChat}
                className="p-2 rounded-xl bg-[#181E2E] hover:bg-[#20273C] text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading || loadingChat ? 'animate-spin text-purple-400' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-[#181E2E] hover:bg-[#20273C] text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* MAIN INBOX VIEW (CONVERSATION THREAD OR LIST) */}
          {selectedPartnerId ? (
            /* CONVERSATION ACTIVE CHAT VIEW */
            <div className="flex-1 flex flex-col min-h-[350px] overflow-hidden">
              {loadingChat ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="w-7 h-7 animate-spin text-purple-400" />
                  <span className="text-xs font-bold">Decrypting conversation...</span>
                </div>
              ) : (
                <>
                  {/* Chat Messages Log */}
                  <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 p-2 bg-[#0E111C] border border-slate-800/80 rounded-2xl">
                    {messages.length === 0 ? (
                      <div className="py-14 text-center space-y-2 text-slate-500">
                        <MessageSquare className="w-8 h-8 mx-auto text-slate-600" />
                        <p className="text-xs">No message history yet.</p>
                        <p className="text-[11px] text-slate-400">
                          Say hi to {activePartner?.username} and start collaborating!
                        </p>
                      </div>
                    ) : (
                      messages.map((m) => (
                        <div
                          key={m.id}
                          className={`flex flex-col ${m.isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-sm break-words ${
                              m.isMe
                                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-br-none'
                                : 'bg-[#181E2E] text-slate-200 border border-slate-800 rounded-bl-none'
                            }`}
                          >
                            <p>{m.content}</p>
                          </div>
                          <div className="flex items-center gap-1 text-[9px] text-slate-500 mt-0.5 px-1">
                            <Clock className="w-2.5 h-2.5" />
                            <span>
                              {new Date(m.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: undefined,
                              })}
                            </span>
                            {m.isMe && (
                              <CheckCheck className={`w-3 h-3 ${m.isRead ? 'text-cyan-400' : 'text-slate-600'}`} />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input Form */}
                  <form onSubmit={handleSendMessage} className="pt-2.5 flex items-center gap-2 shrink-0">
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder={`Message ${activePartner?.username || 'classmate'}...`}
                      maxLength={500}
                      className="flex-1 bg-[#0E111C] border border-slate-750 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!messageInput.trim() || sendingMessage}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                    >
                      {sendingMessage ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-3 h-3" />
                          <span>Send</span>
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          ) : (
            /* CONVERSATIONS LIST & DIRECT DM INITIATION */
            <div className="flex-1 flex flex-col space-y-3 min-h-[350px] overflow-hidden">
              {/* Search Bar */}
              <div className="relative shrink-0">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filter conversations..."
                  className="w-full bg-[#0E111C] border border-slate-750 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Conversations List */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                {loading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Loader2 className="w-7 h-7 animate-spin text-purple-400" />
                    <span className="text-xs font-bold">Syncing inbox...</span>
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="text-center py-10 bg-[#181E2E]/60 rounded-2xl border border-slate-800 p-5 space-y-2">
                    <MessageSquare className="w-10 h-10 text-slate-600 mx-auto" />
                    <h4 className="font-bold text-sm text-slate-300">No active conversations</h4>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      Direct message your classmates and study allies below to start strategizing!
                    </p>
                  </div>
                ) : (
                  filteredConversations.map((conv) => (
                    <button
                      key={conv.partner.id}
                      onClick={() => loadConversation(conv.partner.id)}
                      className="w-full bg-[#181E2E] hover:bg-[#20273C] border border-slate-800 hover:border-purple-500/40 p-3 rounded-2xl flex items-center justify-between gap-3 text-left transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <AvatarDisplay
                          avatarId={conv.partner.avatarId}
                          avatarAura={conv.partner.avatarAura}
                          avatarFrame={conv.partner.avatarFrame}
                          avatarOutfit={conv.partner.avatarOutfit}
                          avatarAccessory={conv.partner.avatarAccessory}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-xs text-white group-hover:text-purple-300 transition-colors truncate">
                              {conv.partner.username}
                            </span>
                            <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1 rounded truncate max-w-[90px]">
                              {conv.partner.equippedTitle || 'Student'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5 max-w-[200px] sm:max-w-[250px]">
                            {conv.lastMessage.isMe ? 'You: ' : ''}
                            {conv.lastMessage.content}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[9px] text-slate-500">
                          {new Date(conv.lastMessage.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        {conv.unreadCount > 0 && (
                          <span className="min-w-[18px] h-[18px] bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 animate-pulse">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Start new DM from real students list */}
              {activeRealPlayers.length > 0 && (
                <div className="pt-2 border-t border-slate-800/80 shrink-0">
                  <span className="text-[11px] font-bold text-slate-400 block mb-2 flex items-center gap-1">
                    <Users className="w-3 h-3 text-purple-400" /> Start Direct Message with Classmates:
                  </span>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {activeRealPlayers.slice(0, 8).map((rp) => (
                      <button
                        key={rp.id}
                        onClick={() => loadConversation(rp.id)}
                        className="flex flex-col items-center gap-1 p-2 rounded-xl bg-[#181E2E] hover:bg-purple-950/40 border border-slate-800 hover:border-purple-500/50 transition-all cursor-pointer shrink-0 min-w-[70px]"
                      >
                        <AvatarDisplay
                          avatarId={rp.avatarId}
                          avatarFrame={rp.avatarFrame}
                          avatarOutfit={rp.avatarOutfit}
                          avatarAccessory={rp.avatarAccessory}
                          size="sm"
                        />
                        <span className="text-[10px] font-black text-slate-300 truncate max-w-[65px]">
                          {rp.username}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
