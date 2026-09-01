import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Users,
  UserPlus,
  Coffee,
  Check,
  Trash2,
  Search,
  Dumbbell,
  Brain,
  Sparkles,
  Send,
  Loader2,
  HeartHandshake,
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import { api } from '../api';
import { FriendBuddy, FriendRequestIncoming } from '../types';
import { AvatarDisplay } from './AvatarDisplay';
import { InboxButton } from './InboxButton';

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayerUpdated: () => Promise<void>;
  showToast: (text: string, type?: 'error' | 'success' | 'info') => void;
  onOpenInbox?: (partnerId?: string) => void;
  unreadInboxCount?: number;
}

export const FriendsModal: React.FC<FriendsModalProps> = ({
  isOpen,
  onClose,
  onPlayerUpdated,
  showToast,
  onOpenInbox,
  unreadInboxCount = 0,
}) => {
  const [activeTab, setActiveTab] = useState<'buddies' | 'requests' | 'add'>('buddies');
  const [friends, setFriends] = useState<FriendBuddy[]>([]);
  const [requests, setRequests] = useState<FriendRequestIncoming[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTarget, setSearchTarget] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [suggestedStudents, setSuggestedStudents] = useState<any[]>([]);

  const fetchFriendsData = useCallback(async () => {
    try {
      setLoading(true);
      const [res, realPlayersRes] = await Promise.allSettled([
        api.getFriends(),
        api.getRealPlayers(),
      ]);

      if (res.status === 'fulfilled' && res.value) {
        setFriends(res.value.friends || []);
        setRequests(res.value.requests?.incoming || []);
      }

      if (realPlayersRes.status === 'fulfilled' && realPlayersRes.value) {
        setSuggestedStudents((realPlayersRes.value.players || []).slice(0, 5));
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load study buddies.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (isOpen) {
      fetchFriendsData();
    }
  }, [isOpen, fetchFriendsData]);

  const handleSendRequest = async (targetUsername: string) => {
    if (!targetUsername.trim()) return;

    try {
      setSendingRequest(true);
      const res = await api.sendFriendRequest(targetUsername.trim());
      showToast(res.message, 'success');
      setSearchTarget('');
      await fetchFriendsData();
    } catch (err: any) {
      showToast(err.message || 'Could not send friend request.', 'error');
    } finally {
      setSendingRequest(false);
    }
  };

  const handleRespond = async (friendshipId: string, accept: boolean) => {
    try {
      setActionLoadingId(friendshipId);
      const res = await api.respondFriendRequest(friendshipId, accept);
      showToast(res.message, 'success');
      await fetchFriendsData();
      await onPlayerUpdated();
    } catch (err: any) {
      showToast(err.message || 'Action failed.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSendCarePackage = async (friendshipId: string, username: string) => {
    try {
      setActionLoadingId(friendshipId);
      const res = await api.sendCarePackage(friendshipId);
      showToast(res.message, 'success');
      await fetchFriendsData();
      await onPlayerUpdated();
    } catch (err: any) {
      showToast(err.message || 'Failed to send care package.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemoveFriend = async (friendshipId: string, username: string) => {
    if (!confirm(`Remove ${username} from your Campus Study Buddies?`)) return;

    try {
      setActionLoadingId(friendshipId);
      const res = await api.removeFriend(friendshipId);
      showToast(res.message, 'info');
      await fetchFriendsData();
    } catch (err: any) {
      showToast(err.message || 'Failed to remove buddy.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-[#121624] border border-slate-800 w-full max-w-lg rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-base text-white flex items-center gap-2">
                  Campus Buddies
                  <span className="text-[10px] font-bold bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full">
                    {friends.length} Buddies
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">Socialize, exchange coffee & recruit study allies</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {onOpenInbox && (
                <InboxButton
                  onClick={() => {
                    onOpenInbox();
                    onClose();
                  }}
                  unreadCount={unreadInboxCount}
                  variant="badge-button"
                  label="Inbox"
                />
              )}
              <button
                onClick={fetchFriendsData}
                disabled={loading}
                className="p-2 rounded-xl bg-[#181E2E] hover:bg-[#20273C] text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-[#181E2E] hover:bg-[#20273C] text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#101422] border border-slate-800 rounded-2xl shrink-0">
            <button
              onClick={() => setActiveTab('buddies')}
              className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'buddies'
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-[#181E2E]'
              }`}
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>Buddies ({friends.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('requests')}
              className={`relative py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'requests'
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-[#181E2E]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Requests</span>
              {requests.length > 0 && (
                <span className="min-w-[16px] h-[16px] bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center px-0.5 animate-pulse">
                  {requests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('add')}
              className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'add'
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-[#181E2E]'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Friend</span>
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-[260px]">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-7 h-7 animate-spin text-cyan-400" />
                <span className="text-xs font-bold">Syncing buddies...</span>
              </div>
            ) : (
              <>
                {/* 1. MY BUDDIES */}
                {activeTab === 'buddies' && (
                  <div className="space-y-2.5">
                    {friends.length === 0 ? (
                      <div className="text-center py-10 bg-[#181E2E]/60 rounded-2xl border border-slate-800 p-5 space-y-2.5">
                        <Users className="w-10 h-10 text-slate-600 mx-auto" />
                        <h4 className="text-sm font-black text-white">No Buddies Yet</h4>
                        <p className="text-xs text-slate-400 max-w-xs mx-auto">
                          Search classmates or rivals to exchange daily care packages (+1 Energy/Morale) and earn +$100 Karma Cash!
                        </p>
                        <button
                          onClick={() => setActiveTab('add')}
                          className="mt-1 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black cursor-pointer shadow-md"
                        >
                          Find Friends
                        </button>
                      </div>
                    ) : (
                      friends.map((friend) => (
                        <div
                          key={friend.friendshipId}
                          className="bg-[#181E2E] border border-slate-800 hover:border-cyan-500/40 p-3 rounded-2xl flex items-center justify-between gap-3 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <AvatarDisplay
                              avatarId={friend.avatarId}
                              avatarAura={friend.avatarAura}
                              avatarFrame={friend.avatarFrame}
                              avatarOutfit={friend.avatarOutfit}
                              avatarAccessory={friend.avatarAccessory}
                              size="sm"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-black text-xs text-white truncate">
                                  {friend.username}
                                </h4>
                                <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1 rounded truncate max-w-[100px]">
                                  {friend.equippedTitle}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold mt-0.5">
                                <span className="text-rose-400 flex items-center gap-0.5">
                                  <Dumbbell className="w-3 h-3" /> {friend.power}
                                </span>
                                <span>•</span>
                                <span className="text-purple-400 flex items-center gap-0.5">
                                  <Brain className="w-3 h-3" /> {friend.smartness}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {onOpenInbox && (
                              <button
                                onClick={() => {
                                  onOpenInbox(friend.friendId);
                                  onClose();
                                }}
                                className="p-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 hover:text-white border border-purple-500/30 transition-colors cursor-pointer"
                                title={`Chat with ${friend.username}`}
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={() => handleSendCarePackage(friend.friendshipId, friend.username)}
                              disabled={!friend.canSendGift || actionLoadingId === friend.friendshipId}
                              className={`px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 transition-all cursor-pointer ${
                                friend.canSendGift
                                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md animate-pulse'
                                  : 'bg-[#121624] text-slate-500 cursor-not-allowed border border-slate-800'
                              }`}
                            >
                              <Coffee className="w-3 h-3" />
                              <span>{friend.canSendGift ? 'Send Coffee' : 'Sent Today'}</span>
                            </button>

                            <button
                              onClick={() => handleRemoveFriend(friend.friendshipId, friend.username)}
                              disabled={actionLoadingId === friend.friendshipId}
                              className="p-1.5 rounded-xl bg-[#121624] hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                              title="Remove Buddy"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* 2. REQUESTS TAB */}
                {activeTab === 'requests' && (
                  <div className="space-y-2.5">
                    {requests.length === 0 ? (
                      <div className="text-center py-10 bg-[#181E2E]/60 rounded-2xl border border-slate-800 p-5 space-y-1.5">
                        <Users className="w-8 h-8 text-slate-600 mx-auto" />
                        <h4 className="text-xs font-black text-white">No Incoming Requests</h4>
                        <p className="text-[11px] text-slate-400">
                          Buddy invitations sent to you will appear here for review.
                        </p>
                      </div>
                    ) : (
                      requests.map((req) => (
                        <div
                          key={req.friendshipId}
                          className="bg-[#181E2E] border border-slate-800 p-3 rounded-2xl flex items-center justify-between gap-3 shadow-md"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <AvatarDisplay
                              avatarId={req.avatarId}
                              avatarFrame={req.avatarFrame}
                              size="sm"
                            />
                            <div className="min-w-0">
                              <h4 className="font-black text-xs text-white truncate">
                                {req.username}
                              </h4>
                              <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1 rounded">
                                {req.equippedTitle}
                              </span>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                                <span className="text-rose-400">{req.power} Power</span>
                                <span>•</span>
                                <span className="text-purple-400">{req.smartness} Smart</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleRespond(req.friendshipId, true)}
                              disabled={actionLoadingId === req.friendshipId}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1 transition-all cursor-pointer shadow"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Accept</span>
                            </button>
                            <button
                              onClick={() => handleRespond(req.friendshipId, false)}
                              disabled={actionLoadingId === req.friendshipId}
                              className="p-1.5 rounded-xl bg-[#121624] hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 text-xs transition-colors cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* 3. ADD FRIEND TAB */}
                {activeTab === 'add' && (
                  <div className="space-y-3">
                    {/* Search Bar */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendRequest(searchTarget);
                      }}
                      className="flex gap-2"
                    >
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={searchTarget}
                          onChange={(e) => setSearchTarget(e.target.value)}
                          placeholder="Search username to add..."
                          className="w-full bg-[#0E111C] border border-slate-750 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={sendingRequest || !searchTarget.trim()}
                        className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-black text-xs flex items-center gap-1 transition-all cursor-pointer shrink-0 shadow-md"
                      >
                        {sendingRequest ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Send className="w-3 h-3" />
                            <span>Add</span>
                          </>
                        )}
                      </button>
                    </form>

                    {/* Suggested Students */}
                    {suggestedStudents.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          Suggested Classmates
                        </span>

                        <div className="space-y-1.5">
                          {suggestedStudents.map((s) => {
                            const isAlreadyFriend = friends.some((f) => f.friendId === s.id);
                            return (
                              <div
                                key={s.id}
                                className="bg-[#181E2E] border border-slate-800 p-2.5 rounded-xl flex items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <AvatarDisplay
                                    avatarId={s.avatarId}
                                    avatarFrame={s.avatarFrame}
                                    size="sm"
                                  />
                                  <div className="min-w-0">
                                    <h5 className="font-black text-xs text-white truncate">
                                      {s.username}
                                    </h5>
                                    <span className="text-[9px] text-slate-400 block truncate">
                                      {s.equippedTitle || 'Student'}
                                    </span>
                                  </div>
                                </div>

                                <button
                                  onClick={() => handleSendRequest(s.username)}
                                  disabled={isAlreadyFriend || sendingRequest}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer ${
                                    isAlreadyFriend
                                      ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 cursor-default'
                                      : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow'
                                  }`}
                                >
                                  <UserPlus className="w-2.5 h-2.5" />
                                  <span>{isAlreadyFriend ? 'Buddy' : 'Add'}</span>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
