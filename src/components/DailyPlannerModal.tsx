import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Calendar,
  Flame,
  CheckCircle2,
  Gift,
  Zap,
  DollarSign,
  Briefcase,
  Swords,
  Landmark,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { api } from '../api';
import { DailyPlannerData, DailyQuest, Player } from '../types';

interface DailyPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayerUpdated: () => void;
  showToast: (text: string, type?: 'error' | 'success' | 'info') => void;
}

export function DailyPlannerModal({
  isOpen,
  onClose,
  onPlayerUpdated,
  showToast,
}: DailyPlannerModalProps) {
  const [data, setData] = useState<DailyPlannerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimingBonus, setClaimingBonus] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.getDailyQuests();
      setData(res);
    } catch (err: any) {
      showToast(err.message || 'Failed to load daily quests.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  // Midnight UTC countdown calculation
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const tomorrow = new Date();
      tomorrow.setUTCHours(24, 0, 0, 0);
      const diff = tomorrow.getTime() - now.getTime();

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleClaimQuest = async (quest: DailyQuest) => {
    if (quest.claimed || !quest.completed || claimingId) return;
    try {
      setClaimingId(quest.id);
      const res = await api.claimDailyQuest(quest.id);
      setData(res.dailyData);
      onPlayerUpdated();
      showToast(`Claimed $${quest.rewardCash.toLocaleString()} + ⚡${quest.rewardEnergy} Energy!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to claim daily quest.', 'error');
    } finally {
      setClaimingId(null);
    }
  };

  const handleClaimBonus = async () => {
    if (claimingBonus || !data?.allDailyCompleted || data?.dailyBonusClaimed) return;
    try {
      setClaimingBonus(true);
      const res = await api.claimDailyBonus();
      setData(res.dailyData);
      onPlayerUpdated();
      showToast(`Grand Daily Vault Bonus Unlocked! +$1,500 & Max Energy Refill!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to claim daily bonus.', 'error');
    } finally {
      setClaimingBonus(false);
    }
  };

  if (!isOpen) return null;

  const getQuestIcon = (name: string) => {
    switch (name) {
      case 'Briefcase':
        return Briefcase;
      case 'Swords':
        return Swords;
      case 'Landmark':
      default:
        return Landmark;
    }
  };

  const completedCount = data?.dailyQuests.filter((q) => q.completed).length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-xl bg-[#131622] border border-purple-500/30 rounded-3xl shadow-2xl overflow-hidden my-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/80 bg-gradient-to-r from-purple-950/40 via-indigo-950/20 to-[#131622]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                Daily Campus Planner
                <span className="text-[11px] font-bold text-amber-400 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-400 animate-pulse" />
                  {data?.dailyStreak || 1} Day Streak
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Resets daily in <span className="font-mono text-purple-300 font-bold">{timeRemaining || '...'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Daily Streak & Progress Card */}
          <div className="relative overflow-hidden bg-gradient-to-br from-purple-900/30 via-slate-900 to-indigo-950/40 border border-purple-500/30 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-purple-400">
                  Daily Habit Power
                </span>
                <h3 className="text-lg font-black text-white mt-0.5 flex items-center gap-1.5">
                  <Flame className="w-5 h-5 text-amber-400" />
                  {data?.dailyStreak || 1}-Day Streak Multiplier
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-sm">
                  Complete all 3 planner quests every day to maintain your streak and claim the Grand Vault Bonus!
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-black text-purple-300 font-mono">
                  {completedCount}/3
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Tasks Done
                </div>
              </div>
            </div>

            {/* Overall Progress Bar */}
            <div className="w-full bg-slate-800/80 rounded-full h-2.5 mt-4 overflow-hidden p-0.5 border border-slate-700/50">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 via-indigo-400 to-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: `${(completedCount / 3) * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Quests List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">
                Today's 3 Objectives
              </h4>
              <span className="text-[11px] text-slate-400 font-bold">
                {completedCount === 3 ? '🎉 All tasks done!' : `${3 - completedCount} remaining`}
              </span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-500 text-sm font-bold animate-pulse">
                Loading daily tasks...
              </div>
            ) : (
              data?.dailyQuests.map((quest) => {
                const IconComponent = getQuestIcon(quest.iconName);
                const percent = Math.min(100, Math.round((quest.progress / quest.target) * 100));

                return (
                  <div
                    key={quest.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      quest.claimed
                        ? 'bg-slate-900/40 border-slate-800 text-slate-500'
                        : quest.completed
                        ? 'bg-purple-950/20 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                        : 'bg-slate-900/80 border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            quest.claimed
                              ? 'bg-slate-800 text-slate-600'
                              : quest.completed
                              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                              : 'bg-purple-500/10 border border-purple-500/30 text-purple-400'
                          }`}
                        >
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div>
                          <h5
                            className={`text-sm font-bold ${
                              quest.claimed ? 'text-slate-400 line-through' : 'text-white'
                            }`}
                          >
                            {quest.name}
                          </h5>
                          <p className="text-xs text-slate-400 mt-0.5">{quest.description}</p>
                        </div>
                      </div>

                      {/* Reward Pills */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-lg flex items-center gap-0.5">
                          <DollarSign className="w-3 h-3" />
                          {quest.rewardCash}
                        </span>
                        <span className="text-[11px] font-extrabold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-lg flex items-center gap-0.5">
                          <Zap className="w-3 h-3" />+{quest.rewardEnergy}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar & Claim Button */}
                    <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1">
                          <span>Progress</span>
                          <span className="font-mono text-purple-300">
                            {quest.progress} / {quest.target}
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              quest.completed ? 'bg-emerald-400' : 'bg-purple-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        {quest.claimed ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-800/80 px-3 py-1.5 rounded-xl">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            Claimed
                          </span>
                        ) : quest.completed ? (
                          <button
                            onClick={() => handleClaimQuest(quest)}
                            disabled={claimingId === quest.id}
                            className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-black px-3.5 py-1.5 rounded-xl shadow-lg shadow-emerald-900/30 transition-all transform active:scale-95 cursor-pointer"
                          >
                            <Gift className="w-3.5 h-3.5" />
                            {claimingId === quest.id ? 'Claiming...' : 'Claim Reward'}
                          </button>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-500 bg-slate-800/50 px-2.5 py-1.5 rounded-xl">
                            In Progress
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Grand Daily Bonus Vault Chest */}
          <div className="relative overflow-hidden bg-gradient-to-r from-amber-950/40 via-yellow-950/20 to-slate-900 border border-amber-500/40 rounded-2xl p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <Gift className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Grand Daily Vault Chest
                  </div>
                  <h4 className="text-base font-black text-white mt-0.5">
                    $1,500 Cash + ⚡ MAX Energy Refill
                  </h4>
                  <p className="text-xs text-slate-300 mt-1">
                    Unlocked when all 3 daily campus objectives are completed today.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-amber-500/20 flex items-center justify-between">
              <div className="text-xs font-bold text-slate-400">
                Status:{' '}
                {data?.dailyBonusClaimed ? (
                  <span className="text-emerald-400 font-black">Claimed for Today</span>
                ) : data?.allDailyCompleted ? (
                  <span className="text-amber-300 font-black">Ready to Open!</span>
                ) : (
                  <span className="text-slate-500 font-normal">
                    Complete {3 - completedCount} more tasks
                  </span>
                )}
              </div>

              {data?.dailyBonusClaimed ? (
                <span className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-800/80 px-3 py-1.5 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Chest Opened
                </span>
              ) : (
                <button
                  onClick={handleClaimBonus}
                  disabled={!data?.allDailyCompleted || claimingBonus}
                  className={`flex items-center gap-1.5 text-xs font-black px-4 py-2 rounded-xl transition-all ${
                    data?.allDailyCompleted
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-lg shadow-amber-900/40 cursor-pointer active:scale-95'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  {claimingBonus ? 'Opening Chest...' : 'Open Daily Chest'}
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
