import React, { useState } from 'react';
import { Building2, Briefcase, Calendar, Trophy, ChevronLeft } from 'lucide-react';
import { Player } from '../../types';
import { CategoryHubView, CategoryHubItem } from './CategoryHubView';
import { JobsPage } from '../JobsPage';

interface CampusPillarHubProps {
  player: Player;
  onPlayerUpdated: () => Promise<void>;
  showToast: (text: string, type?: 'error' | 'success' | 'info') => void;
  onOpenDailyPlanner: () => void;
  onOpenTrophies: () => void;
  claimableQuestsCount: number;
  claimableTrophiesCount: number;
}

export const CampusPillarHub: React.FC<CampusPillarHubProps> = ({
  player,
  onPlayerUpdated,
  showToast,
  onOpenDailyPlanner,
  onOpenTrophies,
  claimableQuestsCount,
  claimableTrophiesCount,
}) => {
  const [subView, setSubView] = useState<'hub' | 'jobs'>('hub');

  const hubItems: CategoryHubItem[] = [
    {
      id: 'jobs-board',
      title: 'Campus Jobs & Gigs Board',
      subtitle: 'Part-time jobs, internships & campus hustle',
      icon: Briefcase,
      iconColor: 'text-purple-400',
      iconBgColor: 'bg-purple-500/15 border-purple-500/30',
      badge: 'Active Gigs',
      badgeVariant: 'purple',
      onClick: () => setSubView('jobs'),
    },
    {
      id: 'daily-planner',
      title: 'Daily Academic Planner',
      subtitle: 'Daily quest checklist, rewards & streak bonus',
      icon: Calendar,
      iconColor: 'text-amber-400',
      iconBgColor: 'bg-amber-500/15 border-amber-500/30',
      badge:
        claimableQuestsCount > 0
          ? `${claimableQuestsCount} Ready`
          : undefined,
      badgeVariant: 'emerald',
      onClick: onOpenDailyPlanner,
    },
    {
      id: 'academic-trophies',
      title: 'Trophies & Milestones',
      subtitle: 'Wealth, combat, tower & academic achievements',
      icon: Trophy,
      iconColor: 'text-amber-400',
      iconBgColor: 'bg-amber-500/15 border-amber-500/30',
      badge:
        claimableTrophiesCount > 0
          ? `${claimableTrophiesCount} Claimable`
          : undefined,
      badgeVariant: 'amber',
      onClick: onOpenTrophies,
    },
  ];

  if (subView === 'jobs') {
    return (
      <div className="space-y-3">
        <button
          onClick={() => setSubView('hub')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141824] hover:bg-[#1A2030] border border-slate-750 text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>← Back to Campus Hub</span>
        </button>
        <JobsPage onPlayerUpdated={onPlayerUpdated} showToast={showToast} />
      </div>
    );
  }

  return (
    <CategoryHubView
      categoryTitle="Campus Academics & Gigs"
      categorySubtitle="Campus career opportunities, daily study planner, and milestone awards"
      categoryIcon={Building2}
      categoryThemeColor="text-purple-400"
      items={hubItems}
    >
      {/* Quick Progress Banner */}
      <div className="bg-[#121624] border border-slate-800/80 p-3.5 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-black text-sm">
            🎓
          </div>
          <div>
            <div className="text-xs font-black text-white">
              Campus Work & Achievement Progress
            </div>
            <div className="text-[11px] text-slate-400">
              Completed Gigs: {player.totalJobsCompleted || 0}
            </div>
          </div>
        </div>
        <button
          onClick={() => setSubView('jobs')}
          className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-bold transition-colors cursor-pointer"
        >
          Open Jobs
        </button>
      </div>
    </CategoryHubView>
  );
};
