import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Trophy,
  Award,
  DollarSign,
  Zap,
  CheckCircle2,
  Lock,
  Crown,
  Swords,
  Building,
  GraduationCap,
  Sparkles,
  Shield,
  Coins,
  Briefcase,
  Flame,
  Skull,
  Key,
  Users,
  Star,
  Cpu,
  Dumbbell
} from 'lucide-react';
import { api } from '../api';
import { AchievementMilestone, TrophiesData } from '../types';

interface TrophiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayerUpdated: () => void;
  showToast: (text: string, type?: 'error' | 'success' | 'info') => void;
}

export function TrophiesModal({
  isOpen,
  onClose,
  onPlayerUpdated,
  showToast,
}: TrophiesModalProps) {
  const [data, setData] = useState<TrophiesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'WEALTH' | 'COMBAT' | 'TOWER' | 'ACADEMIC'>('ALL');
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.getTrophies();
      setData(res);
    } catch (err: any) {
      showToast(err.message || 'Failed to load campus trophies.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const handleClaim = async (milestone: AchievementMilestone) => {
    if (milestone.claimed || !milestone.completed || claimingId) return;
    try {
      setClaimingId(milestone.id);
      const res = await api.claimMilestone(milestone.id);
      setData(res.trophiesData);
      onPlayerUpdated();
      showToast(`🏆 Milestone Unlocked: "${milestone.title}"! Title "${milestone.rewardTitle}" awarded!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to claim trophy reward.', 'error');
    } finally {
      setClaimingId(null);
    }
  };

  if (!isOpen) return null;

  const getMilestoneIcon = (iconName: string) => {
    switch (iconName) {
      case 'Coins':
        return Coins;
      case 'Briefcase':
        return Briefcase;
      case 'Crown':
        return Crown;
      case 'Shield':
        return Shield;
      case 'Landmark':
        return Building;
      case 'Swords':
        return Swords;
      case 'Flame':
        return Flame;
      case 'Skull':
        return Skull;
      case 'Zap':
        return Zap;
      case 'Building':
        return Building;
      case 'Key':
        return Key;
      case 'Users':
        return Users;
      case 'Star':
        return Star;
      case 'Cpu':
        return Cpu;
      case 'Dumbbell':
        return Dumbbell;
      case 'GraduationCap':
        return GraduationCap;
      case 'Award':
      default:
        return Award;
    }
  };

  const filteredMilestones = (data?.milestones || []).filter((m) => {
    if (categoryFilter === 'ALL') return true;
    return m.category === categoryFilter;
  });

  const completedCount = (data?.milestones || []).filter((m) => m.completed).length;
  const claimedCount = data?.claimedCount || 0;
  const totalCount = data?.totalCount || (data?.milestones || []).length;
  const claimableCount = (data?.milestones || []).filter((m) => m.completed && !m.claimed).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-3xl bg-[#131622] border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden my-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/80 bg-gradient-to-r from-amber-950/40 via-yellow-950/20 to-[#131622]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                Campus Trophies & Milestones
                {claimableCount > 0 && (
                  <span className="text-[11px] font-black text-amber-900 bg-amber-400 px-2 py-0.5 rounded-full animate-pulse">
                    {claimableCount} Claimable
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Unlock prestigious campus honors and equip custom titles on your profile
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

        {/* Overview Stats Bar */}
        <div className="px-6 py-4 bg-slate-900/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Trophies Completed
              </div>
              <div className="text-lg font-black text-amber-300">
                {completedCount} / {totalCount}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Rewards Claimed
              </div>
              <div className="text-lg font-black text-emerald-300">
                {claimedCount} / {totalCount}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Titles Unlocked
              </div>
              <div className="text-lg font-black text-purple-300">
                {data?.unlockedTitles.length || 0} Titles
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="flex items-center gap-1.5 bg-[#0B0D14] p-1 rounded-xl border border-slate-800">
            {(['ALL', 'WEALTH', 'COMBAT', 'TOWER', 'ACADEMIC'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`text-[11px] font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wider transition-colors cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="py-16 text-center text-slate-500 text-sm font-bold animate-pulse">
              Loading campus milestones...
            </div>
          ) : filteredMilestones.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm font-bold">
              No milestones found for this category.
            </div>
          ) : (
            filteredMilestones.map((m) => {
              const IconComponent = getMilestoneIcon(m.iconName);
              const percent = Math.min(100, Math.round((m.progress / m.target) * 100));

              return (
                <div
                  key={m.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    m.claimed
                      ? 'bg-slate-900/40 border-slate-800'
                      : m.completed
                      ? 'bg-amber-950/20 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                      : 'bg-slate-900/80 border-slate-800/80'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                          m.claimed
                            ? 'bg-slate-800 text-slate-500'
                            : m.completed
                            ? 'bg-amber-500/20 border border-amber-500/50 text-amber-400 shadow-md'
                            : 'bg-slate-800/80 text-slate-400'
                        }`}
                      >
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-white">{m.title}</h4>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                            {m.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 max-w-md">{m.description}</p>

                        {/* Title Reward Tag */}
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-[11px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-purple-400" />
                            Title Reward: <span className="font-extrabold text-purple-300">"{m.rewardTitle}"</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Rewards and Actions */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-lg flex items-center gap-0.5">
                          <DollarSign className="w-3 h-3" />
                          {m.rewardCash.toLocaleString()}
                        </span>
                        <span className="text-[11px] font-extrabold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-lg flex items-center gap-0.5">
                          <Zap className="w-3 h-3" />+{m.rewardEnergy}
                        </span>
                      </div>

                      <div>
                        {m.claimed ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-800/60 px-3 py-1 rounded-xl">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            Claimed
                          </span>
                        ) : m.completed ? (
                          <button
                            onClick={() => handleClaim(m)}
                            disabled={claimingId === m.id}
                            className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 text-xs font-black px-3.5 py-1.5 rounded-xl shadow-lg shadow-amber-900/30 transition-all transform active:scale-95 cursor-pointer"
                          >
                            <Trophy className="w-3.5 h-3.5" />
                            {claimingId === m.id ? 'Claiming...' : 'Claim Trophy'}
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-800/40 px-2.5 py-1 rounded-lg">
                            <Lock className="w-3 h-3 text-slate-600" />
                            Locked
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800/60">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1">
                      <span>Requirement Progress</span>
                      <span className="font-mono text-amber-300">
                        {m.progress.toLocaleString()} / {m.target.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          m.completed ? 'bg-amber-400' : 'bg-slate-600'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
}
