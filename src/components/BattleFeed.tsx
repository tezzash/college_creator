import React from 'react';
import { motion } from 'motion/react';
import {
  ShieldAlert,
  ShieldCheck,
  Swords,
  Flame,
  Clock,
  Dumbbell,
  Brain,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Zap
} from 'lucide-react';
import { BattleLogItem } from '../types';

interface BattleFeedProps {
  logs: BattleLogItem[];
  loading: boolean;
  onRefresh: () => void;
  onRevenge: (targetId: string, username: string) => void;
  busy: boolean;
  currentEnergy: number;
}

export const BattleFeed: React.FC<BattleFeedProps> = ({
  logs,
  loading,
  onRefresh,
  onRevenge,
  busy,
  currentEnergy,
}) => {
  const formatTimeAgo = (dateStr: string) => {
    const d = new Date(dateStr);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const defenseCount = logs.filter((l) => l.isDefense).length;
  const attackCount = logs.filter((l) => l.isAttacker).length;

  return (
    <div className="space-y-4">
      {/* Subheader & Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#131622] border border-slate-800/80 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Battle Defense & Attack Logs
            </h3>
            <p className="text-xs text-slate-400">
              Track who attacked your dorm and launch immediate counter-strikes.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-[#0B0D14] px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-rose-400">{defenseCount} Invasions</span>
            <span>•</span>
            <span className="text-emerald-400">{attackCount} Attacks</span>
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Refresh logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Feed List */}
      {loading ? (
        <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2 bg-[#131622]/50 border border-slate-800 rounded-2xl">
          <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
          <p className="text-xs">Loading battle activity...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-[#131622] border border-slate-800 rounded-2xl p-10 text-center text-slate-500">
          <ShieldCheck className="w-10 h-10 mx-auto mb-2 text-emerald-400/60" />
          <h4 className="text-white font-bold text-sm mb-1">Your Dorm is Peaceful</h4>
          <p className="text-xs max-w-sm mx-auto">
            No one has attacked your campus tower recently, and you haven't engaged in battles yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const isDefense = log.isDefense;
            const opponentName = log.opponent?.username || 'Unknown Rival';
            const actionText = log.action === 'PUNCH' ? 'Punch' : 'Face-Off';
            const actionIcon = log.action === 'PUNCH' ? Dumbbell : Brain;
            const ActionIconComp = actionIcon;

            // Defense outcome:
            // if isDefense: log.won = true means defender repelled the attacker (attacker failed).
            // if isDefense: log.won = false means attacker won and looted cash.
            const defenseLooted = isDefense && !log.won && log.cashStolen > 0;
            const attackLooted = !isDefense && log.won && log.cashStolen > 0;

            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-[#131622] border rounded-2xl p-4 sm:p-5 transition-all ${
                  isDefense
                    ? log.won
                      ? 'border-emerald-500/30 bg-emerald-950/10'
                      : 'border-rose-500/40 bg-rose-950/10'
                    : log.won
                    ? 'border-purple-500/30'
                    : 'border-slate-800/80'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: Direction Icon & Event Summary */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                        isDefense
                          ? log.won
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                          : log.won
                          ? 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {isDefense ? (
                        log.won ? (
                          <ShieldCheck className="w-5 h-5" />
                        ) : (
                          <ShieldAlert className="w-5 h-5" />
                        )
                      ) : (
                        <Swords className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                            isDefense
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                          }`}
                        >
                          {isDefense ? 'Incoming Defense' : 'Your Attack'}
                        </span>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                            log.won
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {isDefense
                            ? log.won
                              ? 'Defended'
                              : 'Breached'
                            : log.won
                            ? 'Victory'
                            : 'Defeated'}
                        </span>
                        <span className="text-[11px] text-slate-500 flex items-center gap-1 ml-auto sm:ml-0 font-medium">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(log.createdAt)}
                        </span>
                      </div>

                      <div className="mt-1 text-sm font-semibold text-white truncate">
                        {isDefense ? (
                          <span>
                            <span className="text-rose-400 font-bold">{opponentName}</span> raided your dorm via{' '}
                            <span className="text-purple-300">{actionText}</span>
                          </span>
                        ) : (
                          <span>
                            You challenged{' '}
                            <span className="text-purple-300 font-bold">{opponentName}</span> via{' '}
                            <span className="text-purple-300">{actionText}</span>
                          </span>
                        )}
                      </div>

                      {/* Opponent stats info */}
                      {log.opponent && (
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1 text-rose-300">
                            <Dumbbell className="w-3 h-3" /> {log.opponent.power} Power
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-purple-300">
                            <Brain className="w-3 h-3" /> {log.opponent.smartness} Smartness
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Cash Result & Revenge Button */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80 shrink-0">
                    <div>
                      {defenseLooted ? (
                        <div className="text-right">
                          <span className="text-[10px] text-rose-400 font-bold block uppercase tracking-wider">
                            Cash Lost
                          </span>
                          <span className="text-xs font-black text-rose-400 flex items-center justify-end gap-1">
                            <Coins className="w-3.5 h-3.5" /> -${log.cashStolen.toLocaleString()}
                          </span>
                        </div>
                      ) : attackLooted ? (
                        <div className="text-right">
                          <span className="text-[10px] text-emerald-400 font-bold block uppercase tracking-wider">
                            Cash Looted
                          </span>
                          <span className="text-xs font-black text-emerald-400 flex items-center justify-end gap-1">
                            <Coins className="w-3.5 h-3.5" /> +${log.cashStolen.toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">
                            Outcome
                          </span>
                          <span className="text-xs font-bold text-slate-400">No Cash Lost</span>
                        </div>
                      )}
                    </div>

                    {/* Revenge / Re-challenge Button */}
                    {log.opponent && (
                      <button
                        onClick={() => onRevenge(log.opponent!.id, opponentName)}
                        disabled={busy || currentEnergy < 1}
                        className={`px-3.5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50 ${
                          isDefense && !log.won
                            ? 'bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-rose-950/40 animate-pulse'
                            : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                        }`}
                        title={currentEnergy < 1 ? 'Need 1 Energy to strike' : 'Launch counter attack'}
                      >
                        <Swords className="w-3.5 h-3.5" />
                        <span>{isDefense ? 'Revenge' : 'Re-Attack'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
