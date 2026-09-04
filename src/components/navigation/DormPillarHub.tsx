import React, { useState } from 'react';
import { Home, User, Sparkles, Building2, Sofa, ChevronLeft } from 'lucide-react';
import { Player } from '../../types';
import { CategoryHubView, CategoryHubItem } from './CategoryHubView';
import { TowerPage } from '../TowerPage';
import { HomePage } from '../HomePage';

interface DormPillarHubProps {
  player: Player;
  onRefresh: () => Promise<void>;
  onSignOut: () => void;
  showToast: (text: string, type?: 'error' | 'success' | 'info') => void;
  onOpenProfile: () => void;
  onOpenBank: () => void;
  onOpenDailyPlanner: () => void;
  onOpenTrophies: () => void;
  onOpenLeaderboards: () => void;
  onOpenFriends: () => void;
  onOpenInbox: () => void;
  onNavigateArena: () => void;
  claimableQuestsCount: number;
  claimableTrophiesCount: number;
  pendingFriendsCount: number;
  unreadInboxCount: number;
}

export const DormPillarHub: React.FC<DormPillarHubProps> = ({
  player,
  onRefresh,
  onSignOut,
  showToast,
  onOpenProfile,
  onOpenBank,
  onOpenDailyPlanner,
  onOpenTrophies,
  onOpenLeaderboards,
  onOpenFriends,
  onOpenInbox,
  onNavigateArena,
  claimableQuestsCount,
  claimableTrophiesCount,
  pendingFriendsCount,
  unreadInboxCount,
}) => {
  const [subView, setSubView] = useState<'hub' | 'tower' | 'overview'>('hub');

  const hubItems: CategoryHubItem[] = [
    {
      id: 'profile-closet',
      title: 'Student Identity & Closet',
      subtitle: 'Equip persona, title, accessories & drip',
      icon: User,
      iconColor: 'text-purple-400',
      iconBgColor: 'bg-purple-500/15 border-purple-500/30',
      badge: player.equippedTitle || 'Student',
      badgeVariant: 'purple',
      onClick: onOpenProfile,
    },
    {
      id: 'dorm-suites',
      title: 'Dorm Suites & Tower',
      subtitle: 'Floor 1 & Floor 2 suites, roommate upgrades',
      icon: Building2,
      iconColor: 'text-amber-400',
      iconBgColor: 'bg-amber-500/15 border-amber-500/30',
      badge: 'Manage Suites',
      badgeVariant: 'amber',
      onClick: () => setSubView('tower'),
    },
    {
      id: 'dorm-overview',
      title: 'Residence Life Overview',
      subtitle: 'Bio, quick status, stats & defense feed',
      icon: Home,
      iconColor: 'text-cyan-400',
      iconBgColor: 'bg-cyan-500/15 border-cyan-500/30',
      onClick: () => setSubView('overview'),
    },
    {
      id: 'furniture-perks',
      title: 'Dorm Furniture & Perks',
      subtitle: 'Passive security, cash yield & stat bonuses',
      icon: Sofa,
      iconColor: 'text-emerald-400',
      iconBgColor: 'bg-emerald-500/15 border-emerald-500/30',
      onClick: () => setSubView('tower'),
    },
  ];

  if (subView === 'tower') {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setSubView('hub')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141824] hover:bg-[#1A2030] border border-slate-750 text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>← Back to Dorm Hub</span>
        </button>
        <TowerPage
          player={player}
          onPlayerUpdated={onRefresh}
          showToast={showToast}
          onNavigate={(t) => {
            if (t === 'home') setSubView('hub');
            else if (t === 'battle') onNavigateArena();
          }}
        />
      </div>
    );
  }

  if (subView === 'overview') {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setSubView('hub')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141824] hover:bg-[#1A2030] border border-slate-750 text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>← Back to Dorm Hub</span>
        </button>
        <HomePage
          player={player}
          onRefresh={onRefresh}
          onSignOut={onSignOut}
          onNavigate={(t) => {
            if (t === 'tower') setSubView('tower');
            else if (t === 'battle') onNavigateArena();
          }}
          claimableQuestsCount={claimableQuestsCount}
          claimableTrophiesCount={claimableTrophiesCount}
          onOpenBank={onOpenBank}
          onOpenDailyPlanner={onOpenDailyPlanner}
          onOpenTrophies={onOpenTrophies}
          onOpenLeaderboards={onOpenLeaderboards}
          onOpenFriends={onOpenFriends}
          onOpenInbox={onOpenInbox}
          pendingFriendsCount={pendingFriendsCount}
          unreadInboxCount={unreadInboxCount}
        />
      </div>
    );
  }

  return (
    <CategoryHubView
      categoryTitle="Dorm Residence & Student Life"
      categorySubtitle="Personal identity, dorm suites, roommates, and residential upgrades"
      categoryIcon={Home}
      categoryThemeColor="text-purple-400"
      items={hubItems}
    >
      {/* Quick Resident Snapshot Card */}
      <div className="bg-[#121624] border border-slate-800/80 p-3.5 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-black text-sm">
            {player.power + player.smartness}
          </div>
          <div>
            <div className="text-xs font-black text-white">
              Combined Campus Power & Smartness
            </div>
            <div className="text-[11px] text-slate-400">
              {player.power} Power • {player.smartness} Smartness
            </div>
          </div>
        </div>
        <button
          onClick={() => setSubView('overview')}
          className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-bold transition-colors cursor-pointer"
        >
          View Overview
        </button>
      </div>
    </CategoryHubView>
  );
};
