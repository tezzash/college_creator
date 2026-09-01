import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy,
  Flame,
  Wallet,
  Zap,
  X,
  Medal,
  RefreshCw,
  Crown,
  Eye,
  Sparkles,
} from 'lucide-react';
import { LeaderboardsData } from '../types';
import { api } from '../api';
import { AvatarDisplay } from './AvatarDisplay';
import { DripInspectModal } from './DripInspectModal';
import { getCosmeticItem, TIER_MULTIPLIER_MAP } from '../data/cosmeticsCatalog';

interface LeaderboardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlayerId: string;
}

export const LeaderboardsModal: React.FC<LeaderboardsModalProps> = ({
  isOpen,
  onClose,
  currentPlayerId,
}) => {
  const [data, setData] = useState<LeaderboardsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'plunder' | 'netWorth' | 'streaks' | 'titans'>('plunder');
  const [inspectTarget, setInspectTarget] = useState<any>(null);

  const fetchLeaderboards = async () => {
    setLoading(true);
    try {
      const res = await api.leaderboards();
      setData(res);
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboards();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 font-black text-xs shrink-0">
          <Crown className="w-3.5 h-3.5" />
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="w-6 h-6 rounded-lg bg-slate-300/20 border border-slate-300/50 flex items-center justify-center text-slate-300 font-black text-xs shrink-0">
          <Medal className="w-3.5 h-3.5" />
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="w-6 h-6 rounded-lg bg-amber-700/20 border border-amber-700/50 flex items-center justify-center text-amber-600 font-black text-xs shrink-0">
          <Medal className="w-3.5 h-3.5" />
        </div>
      );
    }
    return (
      <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 font-black text-xs shrink-0">
        #{rank}
      </div>
    );
  };

  const renderLeaderboardRow = (item: any, statDisplay: React.ReactNode) => {
    const isMe = item.id === currentPlayerId;
    const persona = getCosmeticItem(item.avatarId || 'avatar-coder');
    const rarity = persona?.rarity || 'COMMON';
    const tier = TIER_MULTIPLIER_MAP[rarity] || TIER_MULTIPLIER_MAP.COMMON;

    return (
      <div
        key={item.id}
        className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
          isMe
            ? 'bg-amber-950/20 border-amber-500/50 shadow-lg shadow-amber-950/30'
            : 'bg-[#0B0D14] border-slate-800/80 hover:border-slate-700'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {getRankBadge(item.rank)}

          <div
            onClick={() => setInspectTarget(item)}
            className="cursor-pointer group relative"
            title="Click to Inspect Drip"
          >
            <AvatarDisplay
              avatarId={item.avatarId || 'avatar-coder'}
              avatarOutfit={item.avatarOutfit || 'outfit-hoodie'}
              avatarHeadwear={item.avatarHeadwear || 'headwear-none'}
              avatarAccessory={item.avatarAccessory || 'acc-laptop'}
              avatarAura={item.avatarAura || 'aura-none'}
              avatarFrame={item.avatarFrame || 'frame-neon'}
              size="sm"
            />
            <div className="absolute -bottom-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-purple-600 text-white rounded-full p-0.5 shadow-md">
              <Eye className="w-2.5 h-2.5" />
            </div>
          </div>

          <div className="min-w-0">
            <div className="text-sm font-bold text-white truncate flex items-center gap-1.5">
              <span className="truncate">{item.username}</span>
              {isMe && (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[9px] font-black uppercase">
                  YOU
                </span>
              )}
              <span className={`text-[8px] font-black px-1.5 py-0.2 rounded-full border hidden sm:inline-block ${tier.badgeClass}`}>
                {tier.percentText}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium truncate flex items-center gap-1">
              <span className="text-amber-400 font-semibold">{item.equippedTitle || 'Freshman Contender'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {statDisplay}
          <button
            onClick={() => setInspectTarget(item)}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-purple-600/30 border border-slate-700/60 text-slate-400 hover:text-purple-300 transition-colors"
            title="Inspect Avatar & Wardrobe"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-[#131622] border border-slate-800 rounded-3xl w-full max-w-xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-amber-950/40 via-slate-900 to-[#131622] border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white tracking-wide flex items-center gap-2">
                    Campus Leaderboards
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">
                    Top college hustlers, plunderers, and combat titans
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchLeaderboards}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Sub-tabs */}
            <div className="p-4 border-b border-slate-800/60 bg-[#0E101A]">
              <div className="grid grid-cols-4 gap-1 bg-[#0B0D14] p-1 rounded-xl border border-slate-800 text-[11px] font-black uppercase tracking-wider">
                <button
                  onClick={() => setActiveTab('plunder')}
                  className={`py-2 px-1 rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
                    activeTab === 'plunder'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Plunder</span>
                </button>
                <button
                  onClick={() => setActiveTab('netWorth')}
                  className={`py-2 px-1 rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
                    activeTab === 'netWorth'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Tycoons</span>
                </button>
                <button
                  onClick={() => setActiveTab('streaks')}
                  className={`py-2 px-1 rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
                    activeTab === 'streaks'
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Streaks</span>
                </button>
                <button
                  onClick={() => setActiveTab('titans')}
                  className={`py-2 px-1 rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer ${
                    activeTab === 'titans'
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Titans</span>
                </button>
              </div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                  <p className="text-xs font-bold uppercase tracking-wider">Syncing Campus Standings...</p>
                </div>
              ) : !data ? (
                <p className="text-center text-xs text-slate-500 py-8 font-bold">No ranking data found.</p>
              ) : (
                <>
                  {activeTab === 'plunder' && (
                    <div className="space-y-2">
                      {data.topPlunderers.map((item) =>
                        renderLeaderboardRow(
                          item,
                          <div className="text-right">
                            <div className="text-sm font-black text-amber-400">
                              ${item.totalPlundered.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase">
                              {item.wins} Wins
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {activeTab === 'netWorth' && (
                    <div className="space-y-2">
                      {data.topNetWorth.map((item) =>
                        renderLeaderboardRow(
                          item,
                          <div className="text-right">
                            <div className="text-sm font-black text-emerald-400">
                              ${item.netWorth.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase">
                              Net Worth
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {activeTab === 'streaks' && (
                    <div className="space-y-2">
                      {data.topStreaks.map((item) =>
                        renderLeaderboardRow(
                          item,
                          <div className="text-right">
                            <div className="text-sm font-black text-rose-400 flex items-center gap-1 justify-end">
                              <Flame className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
                              {item.highestStreak}x
                            </div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase">
                              {item.currentStreak}x Active
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {activeTab === 'titans' && (
                    <div className="space-y-2">
                      {data.topTitans.map((item) =>
                        renderLeaderboardRow(
                          item,
                          <div className="text-right">
                            <div className="text-sm font-black text-purple-400">
                              {item.totalStats} PTS
                            </div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase">
                              P: {item.power} | S: {item.smartness}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Drip Inspect Modal */}
      {inspectTarget && (
        <DripInspectModal
          isOpen={Boolean(inspectTarget)}
          onClose={() => setInspectTarget(null)}
          player={inspectTarget}
        />
      )}
    </>
  );
};

