import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Landmark,
  Trophy,
  Calendar,
  Award,
  Shirt,
  LogOut,
  Sparkles,
  Zap,
  Wallet,
  Users,
  MessageSquare
} from 'lucide-react';
import { Player } from '../types';
import { AvatarDisplay } from './AvatarDisplay';

interface CompactQuickMenuProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  onOpenBank: () => void;
  onOpenLeaderboards: () => void;
  onOpenDailyPlanner: () => void;
  onOpenTrophies: () => void;
  onOpenProfile: () => void;
  onOpenFriends?: () => void;
  onOpenInbox?: () => void;
  onSignOut: () => void;
  claimableQuestsCount: number;
  claimableTrophiesCount: number;
  pendingFriendsCount?: number;
  unreadInboxCount?: number;
}

export const CompactQuickMenu: React.FC<CompactQuickMenuProps> = ({
  isOpen,
  onClose,
  player,
  onOpenBank,
  onOpenLeaderboards,
  onOpenDailyPlanner,
  onOpenTrophies,
  onOpenProfile,
  onOpenFriends,
  onOpenInbox,
  onSignOut,
  claimableQuestsCount,
  claimableTrophiesCount,
  pendingFriendsCount = 0,
  unreadInboxCount = 0,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[#121624] border border-slate-800 w-full max-w-sm rounded-3xl p-5 shadow-2xl space-y-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-3">
              <AvatarDisplay
                avatarId={player.avatarId}
                avatarFrame={player.avatarFrame}
                avatarOutfit={player.avatarOutfit}
                avatarAccessory={player.avatarAccessory}
                size="sm"
              />
              <div>
                <h3 className="font-black text-sm text-white">{player.username}</h3>
                <span className="text-[10px] text-amber-400 font-bold">
                  {player.equippedTitle || 'Freshman Novice'}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-[#181E2E] hover:bg-[#20273C] text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Menu Options */}
          <div className="space-y-1.5">
            {/* Campus Buddies / Friends */}
            {onOpenFriends && (
              <button
                onClick={() => {
                  onClose();
                  onOpenFriends();
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#181E2E] hover:bg-[#20273C] border border-cyan-500/30 text-slate-200 transition-colors cursor-pointer text-left group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black block text-white">Campus Study Buddies</span>
                    <span className="text-[10px] text-cyan-400 font-bold">Social friends & care packages</span>
                  </div>
                </div>
                {pendingFriendsCount > 0 && (
                  <span className="min-w-[18px] h-[18px] bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 animate-pulse">
                    {pendingFriendsCount}
                  </span>
                )}
              </button>
            )}

            {/* Campus Direct Messaging / Inbox */}
            {onOpenInbox && (
              <button
                onClick={() => {
                  onClose();
                  onOpenInbox();
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#181E2E] hover:bg-[#20273C] border border-purple-500/30 text-slate-200 transition-colors cursor-pointer text-left group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black block text-white">Private Inbox & DMs</span>
                    <span className="text-[10px] text-purple-400 font-bold">1-on-1 chats with classmates</span>
                  </div>
                </div>
                {unreadInboxCount > 0 && (
                  <span className="min-w-[18px] h-[18px] bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 animate-pulse">
                    {unreadInboxCount}
                  </span>
                )}
              </button>
            )}

            {/* Daily Planner */}
            <button
              onClick={() => {
                onClose();
                onOpenDailyPlanner();
              }}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#181E2E] hover:bg-[#20273C] border border-purple-500/20 text-slate-200 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black block text-white">Daily Campus Quests</span>
                  <span className="text-[10px] text-slate-400">Complete tasks for cash & XP</span>
                </div>
              </div>
              {claimableQuestsCount > 0 && (
                <span className="min-w-[18px] h-[18px] bg-emerald-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 animate-bounce">
                  {claimableQuestsCount}
                </span>
              )}
            </button>

            {/* Trophies & Milestones */}
            <button
              onClick={() => {
                onClose();
                onOpenTrophies();
              }}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#181E2E] hover:bg-[#20273C] border border-amber-500/20 text-slate-200 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black block text-white">Trophies & Milestones</span>
                  <span className="text-[10px] text-slate-400">Claim permanent bonus rewards</span>
                </div>
              </div>
              {claimableTrophiesCount > 0 && (
                <span className="min-w-[18px] h-[18px] bg-amber-500 text-slate-950 text-[9px] font-black rounded-full flex items-center justify-center px-1 animate-bounce">
                  {claimableTrophiesCount}
                </span>
              )}
            </button>

            {/* Campus ATM & Vault */}
            <button
              onClick={() => {
                onClose();
                onOpenBank();
              }}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#181E2E] hover:bg-[#20273C] border border-emerald-500/20 text-slate-200 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black block text-white">Campus ATM & Safe Vault</span>
                  <span className="text-[10px] text-emerald-400 font-bold">
                    Vault: ${Number(player.bankCash || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </button>

            {/* Leaderboards */}
            <button
              onClick={() => {
                onClose();
                onOpenLeaderboards();
              }}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#181E2E] hover:bg-[#20273C] border border-cyan-500/20 text-slate-200 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black block text-white">Leaderboards</span>
                  <span className="text-[10px] text-slate-400">Campus rankings & richest players</span>
                </div>
              </div>
            </button>

            {/* Character Closet & Wardrobe */}
            <button
              onClick={() => {
                onClose();
                onOpenProfile();
              }}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#181E2E] hover:bg-[#20273C] border border-purple-500/20 text-slate-200 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
                  <Shirt className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black block text-white">Character Closet & Bio</span>
                  <span className="text-[10px] text-slate-400">Customize avatar, outfit & bio</span>
                </div>
              </div>
            </button>
          </div>

          {/* Sign Out */}
          <div className="pt-2 border-t border-slate-800/80">
            <button
              onClick={() => {
                onClose();
                onSignOut();
              }}
              className="w-full py-2.5 rounded-2xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 text-xs font-black flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Exit / Sign Out</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

