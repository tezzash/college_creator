import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Swords,
  Dumbbell,
  Brain,
  Search,
  Zap,
  Trophy,
  Coins,
  RefreshCw,
  Sparkles,
  Shield,
  Skull,
  Flame,
  Users,
  ShieldAlert,
  Radar,
  Landmark,
  ShieldCheck,
  Lock,
  X,
  Crosshair
} from 'lucide-react';
import { api } from '../api';
import { RivalPlayer, BattleResult, BattleLogItem, Player } from '../types';
import { BattleFeed } from './BattleFeed';
import { ScoutReportModal } from './ScoutReportModal';
import { LeaderboardsModal } from './LeaderboardsModal';
import { BankModal } from './BankModal';
import { AvatarDisplay } from './AvatarDisplay';
import { DripInspectModal } from './DripInspectModal';

interface BattlePageProps {
  player: Player;
  onPlayerUpdated: () => Promise<void>;
  showToast: (text: string, type?: 'error' | 'success' | 'info') => void;
}

export const BattlePage: React.FC<BattlePageProps> = ({ player, onPlayerUpdated, showToast }) => {
  const [activeSubTab, setActiveSubTab] = useState<'arena' | 'feed'>('arena');
  const [mode, setMode] = useState<'fight' | 'prank' | 'spy'>('fight');
  const [query, setQuery] = useState('');
  const [players, setPlayers] = useState<RivalPlayer[]>([]);
  const [logs, setLogs] = useState<BattleLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedLoading, setFeedLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BattleResult | null>(null);
  const [activeSpyIntel, setActiveSpyIntel] = useState<{ username: string; intel: any } | null>(null);

  // Impact & Screen Shake state
  const [shakeKey, setShakeKey] = useState(0);
  const [lastCombatImpact, setLastCombatImpact] = useState<{
    success: boolean;
    cashTransferred: number;
    action: string;
    crit: boolean;
    streakBonus: number;
    isKnockout?: boolean;
    knockoutBonus?: number;
  } | null>(null);
  const [showImpactOverlay, setShowImpactOverlay] = useState(false);

  // Modals
  const [scoutingDefenderId, setScoutingDefenderId] = useState<string | null>(null);
  const [inspectRivalId, setInspectRivalId] = useState<string | null>(null);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isBankOpen, setIsBankOpen] = useState(false);

  const loadPlayers = useCallback(async (q = '', silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.players(q);
      setPlayers(res.players || []);
    } catch (err: any) {
      if (!silent) showToast(err.message || 'Failed to search players.', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [showToast]);

  const loadFeed = useCallback(async (silent = false) => {
    if (!silent) setFeedLoading(true);
    try {
      const res = await api.battleFeed();
      setLogs(res.feed || []);
    } catch (err: any) {
      if (!silent) showToast(err.message || 'Failed to load battle logs.', 'error');
    } finally {
      if (!silent) setFeedLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadPlayers('');
    loadFeed(true);
  }, [loadPlayers, loadFeed]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadPlayers(query);
  };

  const handleAction = async (defenderId: string, customAction?: 'fight' | 'prank' | 'spy', targetUsername?: string) => {
    if (busy) return;
    const actionType = customAction || mode;

    if ((player.energy ?? 0) < 1) {
      showToast('Not enough Energy! Fight, Prank, and Spy cost 1 Energy.', 'info');
      return;
    }

    setBusy(true);
    setResult(null);
    setShowImpactOverlay(false);
    try {
      const battleRes = await api.battle(defenderId, actionType);
      setResult(battleRes);

      const isSuccess = Boolean(battleRes.combat.success);
      const isCrit = (battleRes.streakBonusMultiplier || 1) > 1 || (battleRes.cashTransferred || 0) > 300;
      
      setLastCombatImpact({
        success: isSuccess,
        cashTransferred: battleRes.cashTransferred || 0,
        action: battleRes.actionType || actionType,
        crit: isCrit,
        streakBonus: battleRes.streakBonusMultiplier ? Math.round((battleRes.streakBonusMultiplier - 1) * 100) : 0,
        isKnockout: battleRes.isKnockout,
        knockoutBonus: battleRes.knockoutBonus,
      });

      // Trigger screen shake
      setShakeKey((prev) => prev + 1);
      setShowImpactOverlay(true);

      setTimeout(() => {
        setShowImpactOverlay(false);
      }, 2800);

      if (actionType === 'spy') {
        if (isSuccess && battleRes.spyIntel) {
          setActiveSpyIntel({
            username: targetUsername || 'Rival Target',
            intel: battleRes.spyIntel,
          });
          showToast(`Infiltration Success! Intercepted confidential dossier and looted $${(battleRes.cashTransferred || 0).toLocaleString()}!`, 'success');
        } else {
          showToast('Infiltration compromised! Defender detected and repelled your spy.', 'info');
        }
      } else if (actionType === 'prank') {
        if (isSuccess) {
          const koText = battleRes.isKnockout ? ' 💥 KNOCKOUT PIN!' : '';
          showToast(`Prank Pulled! Looted $${battleRes.cashTransferred.toLocaleString()} (+25% Prank Bonus)!${koText}`, 'success');
        } else {
          showToast('Prank backfired! Defender saw through your trick.', 'info');
        }
      } else {
        if (isSuccess) {
          const koText = battleRes.isKnockout ? ' 💥 KNOCKOUT PIN!' : '';
          showToast(`Fight Victory! Stole $${battleRes.cashTransferred.toLocaleString()} from rival!${koText}`, 'success');
        } else {
          showToast('Defeated! Your attack failed.', 'info');
        }
      }

      await onPlayerUpdated();
      await loadFeed(true);
      await loadPlayers(query, true);
    } catch (err: any) {
      showToast(err.message || 'Battle failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleFight = async (defenderId: string, customMode?: 'punch' | 'face_off') => {
    const action = customMode === 'face_off' ? 'prank' : 'fight';
    await handleAction(defenderId, action);
  };

  const handleRevenge = async (targetId: string, targetUsername: string) => {
    const bestAction = (player.power ?? 0) >= (player.smartness ?? 0) ? 'fight' : 'prank';
    showToast(`Launching revenge counter-strike on ${targetUsername}...`, 'info');
    await handleAction(targetId, bestAction, targetUsername);
  };

  const unreadDefenses = logs.filter((l) => l.isDefense && !l.won).length;
  const currentStreak = player.winStreak || 0;
  const streakBonusPct = Math.min(50, currentStreak * 10);

  return (
    <div className="space-y-4 pb-12 relative">
      {/* Visual Impact Flash Ring */}
      <AnimatePresence>
        {showImpactOverlay && lastCombatImpact && (
          <motion.div
            initial={{ opacity: 0.8, scale: 0.95 }}
            animate={{ opacity: 0, scale: 1.05 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className={`fixed inset-0 pointer-events-none z-40 ${
              lastCombatImpact.success
                ? 'bg-radial from-emerald-500/25 via-emerald-500/5 to-transparent'
                : 'bg-radial from-rose-500/25 via-rose-500/5 to-transparent'
            }`}
          />
        )}
      </AnimatePresence>

      {/* Floating Combat Impact Particle Badge */}
      <AnimatePresence>
        {showImpactOverlay && lastCombatImpact && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{ type: 'spring', damping: 14, stiffness: 350 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div
              className={`px-4 py-2.5 rounded-2xl border shadow-2xl backdrop-blur-md flex items-center gap-2.5 ${
                lastCombatImpact.success
                  ? 'bg-[#0B1A14]/95 border-emerald-400 text-emerald-300 shadow-emerald-500/40'
                  : 'bg-[#1A0B0F]/95 border-rose-500 text-rose-300 shadow-rose-500/40'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  lastCombatImpact.success ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {lastCombatImpact.success ? <Trophy className="w-4 h-4" /> : <Skull className="w-4 h-4" />}
              </div>
              <div>
                <div className="text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <span>{lastCombatImpact.success ? 'IMPACT VICTORY!' : 'DEFENSE BLOCKED!'}</span>
                  {lastCombatImpact.crit && (
                    <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 text-[9px] font-black">
                      CRIT!
                    </span>
                  )}
                </div>
                <div className="text-xs font-black flex items-center gap-1">
                  {lastCombatImpact.success ? (
                    <span className="text-emerald-400">
                      +${lastCombatImpact.cashTransferred.toLocaleString()} Looted
                    </span>
                  ) : (
                    <span className="text-rose-400">Attack Absorbed</span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Combat Clash Loading Overlay during battle execution */}
      <AnimatePresence>
        {busy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-[#121624] border border-purple-500/50 p-5 rounded-3xl shadow-2xl flex flex-col items-center gap-2.5 text-center max-w-xs">
              <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
                <Swords className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Clashing in Arena...</h3>
                <p className="text-xs text-slate-400 mt-0.5">Calculating power, tactics & dorm boosts</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#121624] border border-slate-800/80 p-4 rounded-2xl gap-3 shadow-lg">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-white tracking-wide flex items-center gap-2">
            <Swords className="w-5 h-5 text-rose-400" />
            PvP Arena & Defenses
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Scout rivals, build win streaks, plunder cash, and climb the Campus Leaderboard.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            onClick={() => setIsLeaderboardOpen(true)}
            className="flex items-center gap-1.5 bg-[#181E2E] hover:bg-[#20273C] border border-amber-500/30 px-3 py-1.5 rounded-xl text-xs font-black text-amber-300 transition-colors cursor-pointer"
            title="Campus Leaderboards"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Ranks</span>
          </button>
          <button
            onClick={() => {
              loadPlayers(query);
              loadFeed();
            }}
            disabled={loading || feedLoading}
            className="p-2 rounded-xl bg-[#181E2E] hover:bg-[#20273C] border border-slate-750 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Refresh arena"
          >
            <RefreshCw className={`w-4 h-4 ${loading || feedLoading ? 'animate-spin text-purple-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Win Streak & Combat Perk Bar */}
      <div className="bg-[#121624] border border-slate-800/80 p-3.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
            <Flame className="w-4 h-4 fill-rose-500" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
              <span>PvP Win Streak:</span>
              <span className="text-rose-400 font-black">{currentStreak}x</span>
              {currentStreak > 0 && (
                <span className="px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-black uppercase">
                  +{streakBonusPct}% Plunder Boost
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              {currentStreak === 0
                ? 'Win consecutive arena duels to earn up to +50% bonus plunder cash on every victory!'
                : `Active Plunder Multiplier: +${streakBonusPct}% cash stolen. Peak Streak: ${player.highestStreak || currentStreak}x`}
            </p>
          </div>
        </div>

        <div className="text-right text-xs self-stretch sm:self-auto flex sm:flex-col justify-between sm:justify-center">
          <span className="text-slate-400 block text-[10px] uppercase font-bold">Total PvP Wins</span>
          <span className="font-black text-emerald-400">{player.totalPvPWins || 0} Victories</span>
        </div>
      </div>

      {/* Subtabs: Campus Rivals vs Defense Activity */}
      <div className="grid grid-cols-2 bg-[#121624] p-1.5 rounded-2xl border border-slate-800/80 gap-1.5">
        <button
          onClick={() => setActiveSubTab('arena')}
          className={`py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'arena'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Campus Challengers ({players.length})</span>
        </button>
        <button
          onClick={() => {
            setActiveSubTab('feed');
            loadFeed();
          }}
          className={`py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer relative ${
            activeSubTab === 'feed'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Flame className="w-4 h-4 text-amber-400" />
          <span>Defense & Battle Log</span>
          {unreadDefenses > 0 && (
            <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full ml-1">
              {unreadDefenses}
            </span>
          )}
        </button>
      </div>

      {/* Combat Tactics Mode Switch */}
      <div className="bg-[#121624] border border-slate-800/80 p-4 rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800/60">
          <div>
            <div className="text-xs font-black text-slate-300 uppercase tracking-wider">
              Combat Stats & Tactics
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Enhanced by dormmates & equipped furniture in your Campus Tower
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#181E2E] border border-rose-500/30 px-2.5 py-1 rounded-xl">
              <Dumbbell className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-xs font-black text-rose-300">
                {player.power ?? 0} Power
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#181E2E] border border-purple-500/30 px-2.5 py-1 rounded-xl">
              <Brain className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs font-black text-purple-300">
                {player.smartness ?? 0} Smart
              </span>
            </div>
          </div>
        </div>

        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Select Action Tactic</span>
            <span className="text-[10px] text-slate-500 font-normal">PIMD Style Combat Matrix</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Fight */}
            <button
              onClick={() => setMode('fight')}
              className={`py-2.5 px-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                mode === 'fight'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/70 shadow-sm ring-1 ring-rose-500/50'
                  : 'bg-[#181E2E] text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              <Swords className="w-4 h-4 text-rose-400" />
              <div className="text-left">
                <div className="font-black text-xs">Fight (1 Energy)</div>
                <div className="text-[10px] text-rose-400/80 font-medium normal-case">Power Brawl • Knockouts</div>
              </div>
            </button>

            {/* Prank */}
            <button
              onClick={() => setMode('prank')}
              className={`py-2.5 px-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                mode === 'prank'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/70 shadow-sm ring-1 ring-cyan-500/50'
                  : 'bg-[#181E2E] text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <div className="text-left">
                <div className="font-black text-xs">Prank (1 Energy)</div>
                <div className="text-[10px] text-cyan-400/80 font-medium normal-case">Smartness • +25% Loot</div>
              </div>
            </button>

            {/* Spy */}
            <button
              onClick={() => setMode('spy')}
              className={`py-2.5 px-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                mode === 'spy'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/70 shadow-sm ring-1 ring-amber-500/50'
                  : 'bg-[#181E2E] text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              <Radar className="w-4 h-4 text-amber-400" />
              <div className="text-left">
                <div className="font-black text-xs">Spy (1 Energy)</div>
                <div className="text-[10px] text-amber-400/80 font-medium normal-case">Infiltration • Secret Dossier</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Battle Report Banner */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            className={`border rounded-2xl p-4 shadow-xl overflow-hidden relative ${
              result.combat.success
                ? 'bg-gradient-to-br from-emerald-950/60 to-[#121624] border-emerald-500/60 shadow-emerald-950/40'
                : 'bg-gradient-to-br from-rose-950/60 to-[#121624] border-rose-500/60 shadow-rose-950/40'
            }`}
          >
            <div className="flex items-start sm:items-center justify-between mb-3 relative z-10 gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                    result.combat.success
                      ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50'
                      : 'bg-rose-500/25 text-rose-300 border border-rose-500/50'
                  }`}
                >
                  {result.combat.success ? (
                    <Trophy className="w-5 h-5" />
                  ) : (
                    <Skull className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-white flex flex-wrap items-center gap-2">
                    <span>
                      {result.combat.success
                        ? result.actionType === 'spy'
                          ? 'Infiltration Success!'
                          : result.actionType === 'prank'
                          ? 'Prank Pulled!'
                          : 'Fight Victory!'
                        : 'Action Repelled!'}
                    </span>
                    {result.isKnockout && (
                      <span className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded-full font-black flex items-center gap-1 shadow-md">
                        🏥 KNOCKOUT / PIN!
                      </span>
                    )}
                    {result.combat.success && result.streakBonusMultiplier && result.streakBonusMultiplier > 1 && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        +{Math.round((result.streakBonusMultiplier - 1) * 100)}% Streak Bonus!
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {result.combat.success
                      ? result.isKnockout
                        ? 'Target knocked out cold and hospitalized! Pinned for 5 minutes!'
                        : result.actionType === 'spy'
                        ? 'Confidential intelligence intercepted from rival dorm!'
                        : result.actionType === 'prank'
                        ? 'Prank succeeded brilliantly! Looted bonus cash from their pocket.'
                        : 'Your power attack overpowered the rival geek.'
                      : 'The rival geek successfully defended their territory.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Win Odds</span>
                  <span className="text-xs font-black text-white font-mono">
                    {Math.round(result.combat.winProbability * 100)}%
                  </span>
                </div>
                <button
                  onClick={() => setResult(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Dismiss report"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 border-t border-slate-800/80 text-xs relative z-10">
              <div className="bg-[#0D101C]/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Action Type</span>
                <span className="font-bold text-white uppercase mt-0.5 block text-xs">
                  {result.actionType || result.combat.action}
                </span>
              </div>
              <div className="bg-[#0D101C]/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Cost</span>
                <span className="font-bold text-amber-400 flex items-center gap-1 mt-0.5 text-xs">
                  {(result.actionType === 'prank' || result.actionType === 'spy') ? (
                    <>
                      <Sparkles className="w-3 h-3 text-cyan-400" />
                      <span className="text-cyan-300">-1 Morale</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3 h-3 text-amber-400" />
                      <span className="text-amber-300">-{result.energySpent || 1} Energy</span>
                    </>
                  )}
                </span>
              </div>
              <div className="bg-[#0D101C]/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Cash Looted</span>
                <span className="font-black text-emerald-400 flex items-center gap-1 mt-0.5 text-xs">
                  <Coins className="w-3 h-3" /> +${result.cashTransferred.toLocaleString()}
                </span>
              </div>
              <div className="bg-[#0D101C]/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Status</span>
                <span className="font-bold text-slate-200 mt-0.5 block text-xs">
                  {result.isKnockout ? '🏥 Knockout Pin' : result.combat.success ? '🏆 Clean Hit' : '🛡️ Defended'}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Spy Intel Modal */}
      <AnimatePresence>
        {activeSpyIntel && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.92, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 15 }}
              className="bg-[#121624] border border-cyan-500/50 max-w-lg w-full rounded-2xl p-5 space-y-3 shadow-2xl shadow-cyan-950/80"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2 text-cyan-400">
                  <Radar className="w-4 h-4 animate-spin" />
                  <h3 className="font-black text-white text-base">
                    Spy Dossier: {activeSpyIntel.username}
                  </h3>
                </div>
                <button
                  onClick={() => setActiveSpyIntel(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[#0D101C] border border-slate-800 p-2.5 rounded-xl">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Pocket Cash</span>
                    <span className="text-emerald-300 font-mono font-black text-xs">
                      ${Number(activeSpyIntel.intel.targetCash || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-[#0D101C] border border-slate-800 p-2.5 rounded-xl">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Vault (Protected)</span>
                    <span className="text-cyan-300 font-mono font-black text-xs">
                      ${Number(activeSpyIntel.intel.targetBankCash || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[#0D101C] border border-slate-800 p-2.5 rounded-xl">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Target Power</span>
                    <span className="text-rose-400 font-black text-xs">{activeSpyIntel.intel.targetPower}</span>
                  </div>
                  <div className="bg-[#0D101C] border border-slate-800 p-2.5 rounded-xl">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Target Smartness</span>
                    <span className="text-purple-400 font-black text-xs">{activeSpyIntel.intel.targetSmartness}</span>
                  </div>
                </div>

                <div className="bg-[#0D101C] border border-slate-800 p-2.5 rounded-xl">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Combat Simulation Odds</span>
                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <div className="flex items-center justify-between bg-[#141828] p-1.5 rounded-lg text-[11px]">
                      <span>Fight Win Odds:</span>
                      <span className="font-bold text-rose-400">{Math.round((activeSpyIntel.intel.winOddsPower || 0) * 100)}%</span>
                    </div>
                    <div className="flex items-center justify-between bg-[#141828] p-1.5 rounded-lg text-[11px]">
                      <span>Prank Win Odds:</span>
                      <span className="font-bold text-cyan-400">{Math.round((activeSpyIntel.intel.winOddsSmartness || 0) * 100)}%</span>
                    </div>
                  </div>
                </div>

                {activeSpyIntel.intel.dormmates && activeSpyIntel.intel.dormmates.length > 0 && (
                  <div className="bg-[#0D101C] border border-slate-800 p-2.5 rounded-xl">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                      Hired Roommates ({activeSpyIntel.intel.dormmates.length})
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {activeSpyIntel.intel.dormmates.map((d: string, idx: number) => (
                        <span key={idx} className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px]">
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={() => setActiveSpyIntel(null)}
                  className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer"
                >
                  Close Dossier
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Tab Content */}
      {activeSubTab === 'feed' ? (
        <BattleFeed
          logs={logs}
          loading={feedLoading}
          onRefresh={loadFeed}
          onRevenge={handleRevenge}
          busy={busy}
          currentEnergy={player.energy}
        />
      ) : (
        <div className="space-y-3">
          {/* Rival Search Input */}
          <form onSubmit={handleSearch} className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search rival students by username..."
              className="w-full bg-[#121624] border border-slate-800/80 rounded-2xl pl-10 pr-24 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            >
              Search
            </button>
          </form>

          {/* Rival List */}
          <div className="space-y-2.5">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider">
              Campus Challengers ({players.length})
            </h2>

            {loading ? (
              <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
                <p className="text-xs font-bold tracking-wider uppercase">Scanning campus arena for rivals...</p>
              </div>
            ) : players.length === 0 ? (
              <div className="bg-[#121624] border border-slate-800 rounded-2xl p-6 text-center text-slate-500">
                <Shield className="w-7 h-7 mx-auto mb-1.5 opacity-50" />
                <p className="text-xs font-medium">No rival geeks found matching query.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {players.map((rival) => (
                  <div
                    key={rival.id}
                    className={`border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                      rival.isPinned
                        ? 'bg-[#181119] border-rose-900/60 opacity-80'
                        : 'bg-[#121624] border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        onClick={() => setInspectRivalId(rival.id)}
                        className="cursor-pointer group hover:scale-105 transition-transform shrink-0"
                        title="Click to Inspect Campus Drip"
                      >
                        <AvatarDisplay
                          avatarId={(rival as any).avatarId || 'avatar-coder'}
                          avatarAura={(rival as any).avatarAura || 'aura-none'}
                          avatarFrame={(rival as any).avatarFrame || 'frame-neon'}
                          avatarOutfit={(rival as any).avatarOutfit || 'outfit-hoodie'}
                          avatarHeadwear={(rival as any).avatarHeadwear || 'headwear-none'}
                          avatarAccessory={(rival as any).avatarAccessory || 'acc-laptop'}
                          size="md"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3
                            onClick={() => setInspectRivalId(rival.id)}
                            className="font-extrabold text-white text-sm truncate cursor-pointer hover:text-cyan-300 transition-colors"
                            title="Inspect Player Drip"
                          >
                            {rival.username}
                          </h3>
                          {rival.isPinned ? (
                            <span className="text-[9px] font-black text-rose-300 bg-rose-500/20 border border-rose-500/40 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                              🏥 Pinned ({rival.pinnedSecondsRemaining ? `${rival.pinnedSecondsRemaining}s` : 'Infirmary'})
                            </span>
                          ) : (rival as any).equippedTitle ? (
                            <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded truncate max-w-[90px]">
                              {(rival as any).equippedTitle}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs font-semibold">
                          <span className="text-rose-400 flex items-center gap-1">
                            <Dumbbell className="w-3 h-3" /> {rival.power} Pow
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="text-purple-400 flex items-center gap-1">
                            <Brain className="w-3 h-3" /> {rival.smartness} Smart
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      {/* Scout / Spy Button */}
                      <button
                        onClick={() => handleAction(rival.id, 'spy', rival.username)}
                        disabled={busy || (player.energy ?? 0) < 1}
                        className="p-2 rounded-xl bg-[#181E2E] hover:bg-[#20273C] text-amber-400 border border-amber-500/30 transition-colors cursor-pointer disabled:opacity-40"
                        title="Spy: Infiltrate & reveal secret dossier (1 Energy)"
                      >
                        <Radar className="w-3.5 h-3.5" />
                      </button>

                      {/* Prank Button */}
                      <button
                        onClick={() => handleAction(rival.id, 'prank', rival.username)}
                        disabled={busy || (player.energy ?? 0) < 1 || rival.isPinned}
                        className="py-2 px-2.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 font-black text-xs uppercase tracking-wider flex items-center gap-1 cursor-pointer disabled:opacity-40"
                        title={rival.isPinned ? 'Rival is hospitalized' : 'Prank: Smartness duel + 25% plunder bonus (1 Energy)'}
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Prank</span>
                      </button>

                      {/* Fight Button */}
                      <button
                        onClick={() => handleAction(rival.id, 'fight', rival.username)}
                        disabled={busy || (player.energy ?? 0) < 1 || rival.isPinned}
                        className="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1 shadow-md shadow-rose-900/30 cursor-pointer disabled:opacity-40"
                        title={rival.isPinned ? 'Rival is hospitalized' : 'Fight: Power brawl duel (1 Energy)'}
                      >
                        <Swords className="w-3 h-3" />
                        <span>Fight</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scouting Dossier Modal */}
      <ScoutReportModal
        isOpen={!!scoutingDefenderId}
        onClose={() => setScoutingDefenderId(null)}
        defenderId={scoutingDefenderId}
        onAttack={handleFight}
        showToast={showToast}
      />

      {/* Leaderboards Modal */}
      <LeaderboardsModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        currentPlayerId={player.id}
      />

      {/* Campus Bank Modal */}
      <BankModal
        isOpen={isBankOpen}
        onClose={() => setIsBankOpen(false)}
        player={player}
        onPlayerUpdated={onPlayerUpdated}
        showToast={showToast}
      />

      {/* Drip Inspect Modal */}
      {inspectRivalId && (
        <DripInspectModal
          isOpen={!!inspectRivalId}
          onClose={() => setInspectRivalId(null)}
          playerId={inspectRivalId}
        />
      )}
    </div>
  );
};
