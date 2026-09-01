import React, { useState, useEffect, useCallback } from 'react';
import {
  Dumbbell,
  Brain,
  Swords,
  RefreshCw,
  Sparkles,
  Shirt,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  Flame,
  Landmark,
  Trophy,
  Calendar,
  Zap,
  Clock,
  Award,
  Users,
  MessageSquare
} from 'lucide-react';
import { Player, BattleLogItem, DailyPlannerData } from '../types';
import { api } from '../api';
import { ProfileClosetModal } from './ProfileClosetModal';
import { AvatarDisplay } from './AvatarDisplay';
import { DripInspectModal } from './DripInspectModal';
import { getCosmeticItem, TIER_MULTIPLIER_MAP } from '../data/cosmeticsCatalog';

interface HomePageProps {
  player: Player | null;
  onRefresh: () => Promise<void>;
  onSignOut: () => void;
  onNavigate: (tab: 'home' | 'jobs' | 'tower' | 'battle') => void;
  claimableQuestsCount: number;
  claimableTrophiesCount: number;
  onOpenBank: () => void;
  onOpenDailyPlanner: () => void;
  onOpenTrophies: () => void;
  onOpenLeaderboards: () => void;
  onOpenFriends?: () => void;
  onOpenInbox?: () => void;
  pendingFriendsCount?: number;
  unreadInboxCount?: number;
}

export const HomePage: React.FC<HomePageProps> = ({
  player,
  onRefresh,
  onNavigate,
  claimableQuestsCount,
  claimableTrophiesCount,
  onOpenBank,
  onOpenDailyPlanner,
  onOpenTrophies,
  onOpenLeaderboards,
  onOpenFriends,
  onOpenInbox,
  pendingFriendsCount = 0,
  unreadInboxCount = 0,
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [recentBattles, setRecentBattles] = useState<BattleLogItem[]>([]);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isDripInspectOpen, setIsDripInspectOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [dailyData, setDailyData] = useState<DailyPlannerData | null>(null);

  const p = player || {
    id: '',
    username: 'Geek',
    email: '',
    cash: 0,
    bankCash: 0,
    energy: 0,
    maxEnergy: 10,
    morale: 0,
    power: 0,
    smartness: 0,
    winStreak: 0,
    highestStreak: 0,
    equippedTitle: 'Freshman Novice',
    avatarId: 'avatar-coder',
    avatarAura: 'aura-none',
    avatarFrame: 'frame-neon',
    avatarOutfit: 'outfit-hoodie',
    avatarHeadwear: 'headwear-none',
    avatarAccessory: 'acc-laptop',
    ownedCosmetics: ['avatar-coder'],
    customBio: 'Ready to conquer the campus empire! 💻💸',
    lastEnergyUpdate: new Date().toISOString(),
  };

  const maxEnergy = p.maxEnergy ?? 10;
  const energy = p.energy ?? 0;

  const fetchRecentBattles = useCallback(async () => {
    try {
      const res = await api.battleFeed();
      setRecentBattles((res.feed || []).slice(0, 3));
    } catch {
      // Non-blocking
    }
  }, []);

  const fetchDailySummary = useCallback(async () => {
    try {
      const res = await api.getDailyQuests();
      setDailyData(res);
    } catch {
      // Non-blocking
    }
  }, []);

  useEffect(() => {
    fetchRecentBattles();
    fetchDailySummary();
  }, [fetchRecentBattles, fetchDailySummary]);

  const isRegenTriggeredRef = React.useRef(false);

  useEffect(() => {
    const updateCountdown = () => {
      const REGEN_SECONDS = 420; // 7 minutes (authoritative server interval)

      if (energy >= maxEnergy) {
        setTimeLeft('');
      } else {
        const last = p.lastEnergyUpdate ? new Date(p.lastEnergyUpdate).getTime() : Date.now();
        const now = Date.now();
        const elapsedSecs = Math.max(0, Math.floor((now - last) / 1000));
        const remainingSecs = Math.max(0, REGEN_SECONDS - (elapsedSecs % REGEN_SECONDS));

        if (remainingSecs === 0 && !isRegenTriggeredRef.current) {
          isRegenTriggeredRef.current = true;
          onRefresh().finally(() => {
            isRegenTriggeredRef.current = false;
          });
        }

        const mins = Math.floor(remainingSecs / 60);
        const secs = remainingSecs % 60;
        setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [energy, p.lastEnergyUpdate, maxEnergy, onRefresh]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([onRefresh(), fetchRecentBattles(), fetchDailySummary()]);
    } finally {
      setRefreshing(false);
    }
  };

  const persona = getCosmeticItem(p.avatarId || 'avatar-coder');
  const rarity = persona?.rarity || 'COMMON';
  const tier = TIER_MULTIPLIER_MAP[rarity] || TIER_MULTIPLIER_MAP.COMMON;
  const completedDailyCount = (dailyData?.dailyQuests || []).filter((q) => q.completed).length;

  return (
    <div className="space-y-3 max-w-lg mx-auto">
      {/* Student Identity Card */}
      <div className="bg-[#121624] border border-slate-800/80 p-3.5 rounded-2xl shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              onClick={() => setIsProfileOpen(true)}
              className="cursor-pointer group relative shrink-0"
              title="Open Character Closet & Profile"
            >
              <AvatarDisplay
                avatarId={p.avatarId}
                avatarAura={p.avatarAura}
                avatarFrame={p.avatarFrame}
                avatarOutfit={p.avatarOutfit}
                avatarHeadwear={p.avatarHeadwear}
                avatarAccessory={p.avatarAccessory}
                size="md"
              />
              <div className="absolute -bottom-1 -right-1 bg-purple-600 text-white rounded-full p-0.5 shadow-md">
                <Shirt className="w-2.5 h-2.5" />
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 rounded-md truncate max-w-[120px]">
                  {p.equippedTitle || 'Freshman Novice'}
                </span>
                <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md border ${tier.badgeClass}`}>
                  {tier.label}
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-black text-white tracking-wide truncate mt-0.5">
                {p.username}
              </h1>
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-300">
                <span className="text-rose-400 flex items-center gap-0.5">
                  <Dumbbell className="w-3 h-3" /> {p.power || 0} Power
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-purple-400 flex items-center gap-0.5">
                  <Brain className="w-3 h-3" /> {p.smartness || 0} Smart
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions (Closet & Refresh) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setIsDripInspectOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-[#181E2E] hover:bg-[#20273C] border border-cyan-500/30 text-cyan-300 text-xs font-bold transition-colors cursor-pointer"
              title="Inspect Avatar Drip"
            >
              Closet
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-xl bg-[#181E2E] hover:bg-[#20273C] border border-slate-750 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Refresh state"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-purple-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Player Custom Bio / Motto */}
        {p.customBio && (
          <div
            onClick={() => setIsProfileOpen(true)}
            className="mt-2.5 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400 italic truncate cursor-pointer hover:text-purple-300 transition-colors flex items-center justify-between"
          >
            <span>"{p.customBio}"</span>
            <span className="text-[9px] text-purple-400 font-bold not-italic shrink-0 ml-2">Edit</span>
          </div>
        )}
      </div>

      {/* Row 1: Daily Quests & Trophies Hub */}
      <div className="grid grid-cols-2 gap-2">
        {/* Daily Quests Hub Card */}
        <button
          onClick={onOpenDailyPlanner}
          className="bg-[#121624] hover:bg-[#181E2E] active:scale-98 border border-purple-500/30 p-2.5 rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer shadow-md group"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-slate-400 font-bold uppercase truncate">Daily Quests</div>
              <div className="text-xs font-black text-purple-300 truncate">
                {completedDailyCount}/3 Done
              </div>
            </div>
          </div>
          {claimableQuestsCount > 0 ? (
            <span className="min-w-[18px] h-[18px] bg-emerald-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 animate-bounce shrink-0">
              {claimableQuestsCount}
            </span>
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-300 shrink-0" />
          )}
        </button>

        {/* Trophies & Milestones Card */}
        <button
          onClick={onOpenTrophies}
          className="bg-[#121624] hover:bg-[#181E2E] active:scale-98 border border-amber-500/30 p-2.5 rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer shadow-md group"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform shrink-0">
              <Trophy className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-slate-400 font-bold uppercase truncate">Trophies</div>
              <div className="text-xs font-black text-amber-300 truncate">Milestones</div>
            </div>
          </div>
          {claimableTrophiesCount > 0 ? (
            <span className="min-w-[18px] h-[18px] bg-amber-500 text-slate-950 text-[9px] font-black rounded-full flex items-center justify-center px-1 animate-bounce shrink-0">
              {claimableTrophiesCount}
            </span>
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-300 shrink-0" />
          )}
        </button>
      </div>

      {/* Row 2: Campus ATM Vault & PvP Streak Hub */}
      <div className="grid grid-cols-2 gap-2">
        {/* Bank Safe Vault */}
        <button
          onClick={onOpenBank}
          className="bg-[#121624] hover:bg-[#181E2E] active:scale-98 border border-emerald-500/30 p-2.5 rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer shadow-md group"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
              <Landmark className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-slate-400 font-bold uppercase truncate">Safe Vault</div>
              <div className="text-xs font-black text-emerald-300 truncate">
                ${Number(p.bankCash || 0).toLocaleString()}
              </div>
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </button>

        {/* Win Streak & Bonus Card */}
        <button
          onClick={() => onNavigate('battle')}
          className="bg-[#121624] hover:bg-[#181E2E] active:scale-98 border border-rose-500/30 p-2.5 rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer shadow-md group"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform shrink-0">
              <Flame className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-slate-400 font-bold uppercase truncate">Win Streak</div>
              <div className="text-xs font-black text-rose-300 truncate">
                {p.winStreak || 0}x (+{Math.min(50, (p.winStreak || 0) * 10)}%)
              </div>
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-rose-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </button>
      </div>

      {/* Universal Campus Energy Card with Authoritative Reverse Countdown */}
      <div className="bg-[#121624] border border-amber-500/30 p-4 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Zap className="w-4 h-4 fill-amber-400/30" />
            </div>
            <div>
              <div className="text-[11px] font-black text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <span>Campus Energy</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black">
                  Universal PvP
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                Used for Fight • Prank • Spy (1⚡ each)
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-base sm:text-lg font-black text-amber-300 font-mono flex items-center justify-end gap-1">
              <span>{energy}</span>
              <span className="text-slate-500 text-xs font-bold">/ {maxEnergy}</span>
            </div>
            <div className="text-[10px] font-bold">
              {energy >= maxEnergy ? (
                <span className="text-emerald-400">⚡ Max Capacity</span>
              ) : (
                <span className="text-amber-400 font-mono">
                  Next +1 in <span className="text-white font-bold">{timeLeft || '--:--'}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Energy Segmented Gauge */}
        <div className="grid grid-cols-10 gap-1.5 my-2.5">
          {Array.from({ length: maxEnergy }).map((_, idx) => {
            const isFilled = idx < energy;
            const isNext = idx === energy;
            return (
              <div
                key={idx}
                className={`h-2.5 rounded-sm transition-all duration-300 ${
                  isFilled
                    ? 'bg-gradient-to-t from-amber-500 to-amber-300 shadow-sm shadow-amber-500/50'
                    : isNext
                    ? 'bg-amber-950/40 border border-amber-500/40 animate-pulse'
                    : 'bg-slate-800/80 border border-slate-700/40'
                }`}
              />
            );
          })}
        </div>

        {/* Countdown & Strategic Mission Summary */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-purple-400 shrink-0" />
            <span className="text-[10px] font-medium text-slate-300">
              {energy >= maxEnergy
                ? 'Ready for campus action!'
                : `Regenerates +1 Energy every 7m (420s)`}
            </span>
          </div>

          <div className="font-mono text-[10px] font-black">
            {energy >= maxEnergy ? (
              <span className="text-emerald-400 font-bold">FULL</span>
            ) : (
              <span className="text-amber-300 font-bold flex items-center gap-1">
                <Zap className="w-2.5 h-2.5 text-amber-400" /> +1 in {timeLeft}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Campus Leaderboard, Buddies & Inbox Grid */}
      <div className={`grid ${onOpenInbox ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
        <button
          onClick={onOpenLeaderboards}
          className="bg-[#121624] hover:bg-[#181E2E] active:scale-98 border border-slate-800/80 p-2.5 rounded-2xl flex items-center justify-between text-xs transition-colors cursor-pointer shadow-md group"
        >
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400 group-hover:scale-105 transition-transform" />
            <span className="font-black text-slate-200 text-left">Leaderboards</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-300 transition-transform" />
        </button>

        {onOpenFriends && (
          <button
            onClick={onOpenFriends}
            className="bg-[#121624] hover:bg-[#181E2E] active:scale-98 border border-cyan-500/30 p-2.5 rounded-2xl flex items-center justify-between text-xs transition-colors cursor-pointer shadow-md group"
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400 group-hover:scale-105 transition-transform" />
              <span className="font-black text-white text-left">Study Buddies</span>
            </div>
            {pendingFriendsCount > 0 ? (
              <span className="min-w-[16px] h-[16px] bg-rose-500 text-white text-[8px] font-black rounded-full flex items-center justify-center px-1 animate-pulse">
                {pendingFriendsCount}
              </span>
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-x-0.5 transition-transform" />
            )}
          </button>
        )}

        {onOpenInbox && (
          <button
            onClick={onOpenInbox}
            className={`${
              unreadInboxCount > 0
                ? 'bg-rose-950/20 hover:bg-rose-950/35 border-rose-500/50 shadow-rose-900/20'
                : 'bg-[#121624] hover:bg-[#181E2E] border-purple-500/30'
            } active:scale-98 border p-2.5 rounded-2xl flex items-center justify-between text-xs transition-all cursor-pointer shadow-md group`}
          >
            <div className="flex items-center gap-2">
              <div className="relative">
                <MessageSquare className={`w-4 h-4 ${unreadInboxCount > 0 ? 'text-rose-400' : 'text-purple-400'} group-hover:scale-105 transition-transform`} />
                {unreadInboxCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                )}
              </div>
              <span className="font-black text-white text-left">Inbox</span>
            </div>
            {unreadInboxCount > 0 ? (
              <span className="min-w-[18px] h-[18px] bg-rose-600 text-white text-[8px] font-black rounded-full flex items-center justify-center px-1 shadow-lg shadow-rose-600/40">
                {unreadInboxCount > 99 ? '99+' : unreadInboxCount}
              </span>
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-purple-400 group-hover:translate-x-0.5 transition-transform" />
            )}
          </button>
        )}
      </div>

      {/* Recent Defense & Battle Feed Preview */}
      {recentBattles.length > 0 && (
        <div className="bg-[#121624] border border-slate-800/80 p-3 rounded-2xl space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-xs">
            <span className="font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              Latest Campus Activity
            </span>
            <button
              onClick={() => onNavigate('battle')}
              className="text-purple-400 font-bold hover:text-purple-300 text-[11px] flex items-center gap-0.5 cursor-pointer"
            >
              <span>Arena</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-800/60">
            {recentBattles.map((b) => (
              <div
                key={b.id}
                onClick={() => onNavigate('battle')}
                className="py-1.5 flex items-center justify-between gap-2 text-xs cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {b.isDefense ? (
                    b.won ? (
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    )
                  ) : (
                    <Swords className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  )}
                  <span className="text-slate-300 text-[11px] truncate">
                    {b.isDefense ? (
                      <span>
                        <strong className="text-rose-400">{b.opponent?.username || 'Rival'}</strong>{' '}
                        {b.won ? 'repelled' : 'raided you'}
                      </span>
                    ) : (
                      <span>
                        Duel vs <strong className="text-purple-300">{b.opponent?.username || 'Rival'}</strong>
                      </span>
                    )}
                  </span>
                </div>

                <span
                  className={`text-[11px] font-black shrink-0 ${
                    b.cashStolen > 0
                      ? b.isDefense && !b.won
                        ? 'text-rose-400'
                        : 'text-emerald-400'
                      : 'text-slate-500'
                  }`}
                >
                  {b.cashStolen > 0 ? `${b.isDefense && !b.won ? '-' : '+'}$${b.cashStolen}` : '$0'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Student Profile & Closet Modal */}
      {player && (
        <ProfileClosetModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          player={player}
          onPlayerUpdated={handleRefresh}
          showToast={() => {}}
        />
      )}

      {/* Drip Showcase & Player Inspect Modal */}
      {player && isDripInspectOpen && (
        <DripInspectModal
          isOpen={isDripInspectOpen}
          onClose={() => setIsDripInspectOpen(false)}
          player={player}
        />
      )}
    </div>
  );
};
