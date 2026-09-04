import React from 'react';
import { Users, Mail, Trophy, Landmark } from 'lucide-react';
import { Player } from '../../types';
import { CategoryHubView, CategoryHubItem } from './CategoryHubView';

interface CommunityPillarHubProps {
  player: Player;
  onOpenFriends: () => void;
  onOpenInbox: () => void;
  onOpenLeaderboards: () => void;
  onOpenBank: () => void;
  pendingFriendsCount: number;
  unreadInboxCount: number;
}

export const CommunityPillarHub: React.FC<CommunityPillarHubProps> = ({
  player,
  onOpenFriends,
  onOpenInbox,
  onOpenLeaderboards,
  onOpenBank,
  pendingFriendsCount,
  unreadInboxCount,
}) => {
  const hubItems: CategoryHubItem[] = [
    {
      id: 'study-buddies',
      title: 'Study Buddies & Friends',
      subtitle: 'Campus friendships, pending requests & buddy stats',
      icon: Users,
      iconColor: 'text-cyan-400',
      iconBgColor: 'bg-cyan-500/15 border-cyan-500/30',
      badge:
        pendingFriendsCount > 0
          ? `${pendingFriendsCount} New`
          : undefined,
      badgeVariant: 'rose',
      onClick: onOpenFriends,
    },
    {
      id: 'campus-inbox',
      title: 'Campus Private Inbox',
      subtitle: 'Direct messages, private whispers & dorm chat',
      icon: Mail,
      iconColor: 'text-purple-400',
      iconBgColor: 'bg-purple-500/15 border-purple-500/30',
      badge:
        unreadInboxCount > 0
          ? `${unreadInboxCount} Unread`
          : undefined,
      badgeVariant: 'rose',
      onClick: onOpenInbox,
    },
    {
      id: 'leaderboards',
      title: 'Campus Leaderboards',
      subtitle: 'Top ranks across Net Worth, PvP Streaks & Power',
      icon: Trophy,
      iconColor: 'text-amber-400',
      iconBgColor: 'bg-amber-500/15 border-amber-500/30',
      badge: 'View Ranks',
      badgeVariant: 'amber',
      onClick: onOpenLeaderboards,
    },
    {
      id: 'campus-bank',
      title: 'Campus Safe Bank Vault',
      subtitle: 'Safeguard your earnings from arena plunder',
      icon: Landmark,
      iconColor: 'text-emerald-400',
      iconBgColor: 'bg-emerald-500/15 border-emerald-500/30',
      badge: `$${Number(player.bankCash || 0).toLocaleString()}`,
      badgeVariant: 'emerald',
      onClick: onOpenBank,
    },
  ];

  return (
    <CategoryHubView
      categoryTitle="Student Union & Community"
      categorySubtitle="Social connections, direct messaging, campus rankings, and safe banking"
      categoryIcon={Users}
      categoryThemeColor="text-cyan-400"
      items={hubItems}
    >
      {/* Quick Financial Summary Card */}
      <div className="bg-[#121624] border border-slate-800/80 p-3.5 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-sm">
            💰
          </div>
          <div>
            <div className="text-xs font-black text-white">
              Net Financial Balance
            </div>
            <div className="text-[11px] text-slate-400">
              Pocket: ${Number(player.cash || 0).toLocaleString()} • Vault: ${Number(player.bankCash || 0).toLocaleString()}
            </div>
          </div>
        </div>
        <button
          onClick={onOpenBank}
          className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-colors cursor-pointer"
        >
          Manage Vault
        </button>
      </div>
    </CategoryHubView>
  );
};
