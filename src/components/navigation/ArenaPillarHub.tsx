import React, { useState } from 'react';
import { Swords, Eye, ShieldAlert, Flame, ChevronLeft } from 'lucide-react';
import { Player } from '../../types';
import { CategoryHubView, CategoryHubItem } from './CategoryHubView';
import { BattlePage } from '../BattlePage';

interface ArenaPillarHubProps {
  player: Player;
  onPlayerUpdated: () => Promise<void>;
  showToast: (text: string, type?: 'error' | 'success' | 'info') => void;
  onOpenLeaderboards: () => void;
}

export const ArenaPillarHub: React.FC<ArenaPillarHubProps> = ({
  player,
  onPlayerUpdated,
  showToast,
  onOpenLeaderboards,
}) => {
  const [subView, setSubView] = useState<'hub' | 'battle'>('hub');

  const winStreak = player.winStreak || 0;
  const streakBonus = Math.min(50, winStreak * 10);

  const hubItems: CategoryHubItem[] = [
    {
      id: 'rival-arena',
      title: 'PvP Rival Arena',
      subtitle: 'Fight, Prank, and Spy on campus rivals',
      icon: Swords,
      iconColor: 'text-rose-400',
      iconBgColor: 'bg-rose-500/15 border-rose-500/30',
      badge: 'Enter Arena',
      badgeVariant: 'rose',
      onClick: () => setSubView('battle'),
    },
    {
      id: 'win-streak',
      title: 'Current Win Streak',
      subtitle: `${winStreak}x Streak (+${streakBonus}% bonus cash)`,
      icon: Flame,
      iconColor: 'text-amber-400',
      iconBgColor: 'bg-amber-500/15 border-amber-500/30',
      badge: `${winStreak} Wins`,
      badgeVariant: winStreak > 0 ? 'amber' : 'purple',
      onClick: () => setSubView('battle'),
    },
    {
      id: 'arena-rankings',
      title: 'Campus Arena Rankings',
      subtitle: 'View top fighters, pranksters & highest streaks',
      icon: ShieldAlert,
      iconColor: 'text-purple-400',
      iconBgColor: 'bg-purple-500/15 border-purple-500/30',
      onClick: onOpenLeaderboards,
    },
    {
      id: 'battle-feed',
      title: 'Defense Log & Revenge',
      subtitle: 'Review recent incoming attacks and retaliate',
      icon: Eye,
      iconColor: 'text-cyan-400',
      iconBgColor: 'bg-cyan-500/15 border-cyan-500/30',
      onClick: () => setSubView('battle'),
    },
  ];

  if (subView === 'battle') {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setSubView('hub')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141824] hover:bg-[#1A2030] border border-slate-750 text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>← Back to Arena Hub</span>
        </button>
        <BattlePage player={player} onPlayerUpdated={onPlayerUpdated} showToast={showToast} />
      </div>
    );
  }

  return (
    <CategoryHubView
      categoryTitle="Campus Arena & Rivalries"
      categorySubtitle="Competitive PvP duels, rival surveillance, win streaks, and retaliation"
      categoryIcon={Swords}
      categoryThemeColor="text-rose-400"
      items={hubItems}
      banner={
        player.isPinned ? (
          <div className="bg-rose-950/80 border border-rose-500/80 p-3 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-lg">🏥</span>
              <div>
                <span className="font-black text-white uppercase text-[11px]">
                  Infirmary Medical Protection Active
                </span>
                <p className="text-[10px] text-rose-200">
                  {player.pinnedSecondsRemaining
                    ? `${player.pinnedSecondsRemaining}s recovery remaining until you can duel again`
                    : 'Recovering from defeat'}
                </p>
              </div>
            </div>
          </div>
        ) : undefined
      }
    >
      {/* Quick Arena Action Banner */}
      <div className="bg-[#121624] border border-slate-800/80 p-3.5 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 font-black text-sm">
            ⚡{player.energy ?? 0}
          </div>
          <div>
            <div className="text-xs font-black text-white">
              Available PvP Combat Energy
            </div>
            <div className="text-[11px] text-slate-400">
              Total PvP Wins: {player.totalPvPWins || 0} • Losses: {player.totalPvPLosses || 0}
            </div>
          </div>
        </div>
        <button
          onClick={() => setSubView('battle')}
          className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-bold transition-colors cursor-pointer"
        >
          Open Arena
        </button>
      </div>
    </CategoryHubView>
  );
};
