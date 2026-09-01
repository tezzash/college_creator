import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Radar,
  Shield,
  ShieldCheck,
  Zap,
  Dumbbell,
  Brain,
  Wallet,
  Building2,
  X,
  Swords,
  Flame,
  AlertTriangle,
  RefreshCw,
  Lock
} from 'lucide-react';
import { ScoutReport } from '../types';
import { api } from '../api';

interface ScoutReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defenderId: string | null;
  onAttack: (defenderId: string, action?: any) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ScoutReportModal: React.FC<ScoutReportModalProps> = ({
  isOpen,
  onClose,
  defenderId,
  onAttack,
  showToast,
}) => {
  const [report, setReport] = useState<ScoutReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && defenderId) {
      const fetchReport = async () => {
        setLoading(true);
        try {
          const res = await api.scoutPlayer(defenderId);
          setReport(res.report);
        } catch (err: any) {
          showToast(err.message || 'Failed to scout target.', 'error');
          onClose();
        } finally {
          setLoading(false);
        }
      };
      fetchReport();
    } else {
      setReport(null);
    }
  }, [isOpen, defenderId, showToast, onClose]);

  if (!isOpen || !defenderId) return null;

  const getThreatColor = (rating: string) => {
    switch (rating) {
      case 'EASY PREY':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'EVEN MATCH':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      case 'HIGH RISK':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'APEX BOSS':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/40';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-[#131622] border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="p-5 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-[#131622] border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <Radar className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white tracking-wide flex items-center gap-2">
                  Campus Scout Dossier
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  Confidential Intel & Combat Odds
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[75vh]">
            {loading || !report ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
                <p className="text-xs font-bold uppercase tracking-wider">Infiltrating Dorm Network...</p>
              </div>
            ) : (
              <>
                {/* Target Profile Header */}
                <div className="bg-[#0B0D14] border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="text-base font-black text-white flex items-center gap-2">
                      {report.defender.username}
                      {report.defender.hasSmartLock && (
                        <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Smart Lock
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-rose-400 font-bold">
                        <Dumbbell className="w-3.5 h-3.5" />
                        {report.defender.power} POW
                      </span>
                      <span className="flex items-center gap-1 text-purple-400 font-bold">
                        <Brain className="w-3.5 h-3.5" />
                        {report.defender.smartness} SMRT
                      </span>
                      <span className="flex items-center gap-1 text-amber-400 font-bold">
                        <Flame className="w-3.5 h-3.5" />
                        {report.defender.winStreak}x Streak
                      </span>
                    </div>
                  </div>

                  <div className={`px-3 py-1.5 rounded-xl border text-xs font-black uppercase tracking-wider ${getThreatColor(report.combatAssessment.threatRating)}`}>
                    {report.combatAssessment.threatRating}
                  </div>
                </div>

                {/* Plunder & Cash Intelligence */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#0B0D14] border border-slate-800 p-3.5 rounded-xl">
                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1 mb-1">
                      <Wallet className="w-3 h-3 text-emerald-400" />
                      Pocket Cash (Raidable)
                    </div>
                    <div className="text-lg font-black text-emerald-400">
                      ${report.defender.pocketCash.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Est. Plunder: <strong className="text-white">${report.combatAssessment.estimatedPlunder.toLocaleString()}</strong>
                    </div>
                  </div>

                  <div className="bg-[#0B0D14] border border-slate-800 p-3.5 rounded-xl">
                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1 mb-1">
                      <ShieldCheck className="w-3 h-3 text-cyan-400" />
                      Vault Cash (Protected)
                    </div>
                    <div className="text-lg font-black text-slate-300">
                      ${report.defender.bankProtectedCash.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      100% immune from raids
                    </div>
                  </div>
                </div>

                {/* Win Probability Win Odds */}
                <div className="bg-[#0B0D14] border border-slate-800 p-4 rounded-2xl space-y-3">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    Calculated Combat Win Probabilities
                  </div>

                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-rose-400 flex items-center gap-1">
                          <Dumbbell className="w-3.5 h-3.5" />
                          Punch (Power Duel)
                        </span>
                        <span className="text-white">{report.combatAssessment.punchWinChance}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-rose-600 to-rose-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${report.combatAssessment.punchWinChance}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-purple-400 flex items-center gap-1">
                          <Brain className="w-3.5 h-3.5" />
                          Face-Off (Smartness Duel)
                        </span>
                        <span className="text-white">{report.combatAssessment.faceOffWinChance}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-purple-600 to-purple-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${report.combatAssessment.faceOffWinChance}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dormmate Setup */}
                <div className="bg-[#0B0D14] border border-slate-800 p-4 rounded-2xl space-y-2.5">
                  <div className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-purple-400" />
                      Stationed Dormmates ({report.defender.dormmates.length})
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold">
                      {report.defender.unlockedSuites} Suites Unlocked
                    </span>
                  </div>

                  {report.defender.dormmates.length === 0 ? (
                    <p className="text-xs text-slate-500 py-1">No dormmates stationed. Target has base baseline stats.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {report.defender.dormmates.map((dm, idx) => (
                        <div
                          key={idx}
                          className="bg-[#131622] p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-white leading-tight">{dm.name}</div>
                            <div className="text-[10px] text-amber-400 font-bold">{dm.level}★ Tier</div>
                          </div>
                          <div className="text-right text-[10px] font-bold text-slate-400">
                            {dm.powerBonus > 0 && <div className="text-rose-400">+{dm.powerBonus} Pow</div>}
                            {dm.smartnessBonus > 0 && <div className="text-purple-400">+{dm.smartnessBonus} Smrt</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="pt-2 grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      onClose();
                      onAttack(report.defender.id, 'fight');
                    }}
                    className="py-3 px-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-rose-950 transition-all cursor-pointer"
                  >
                    <Dumbbell className="w-3.5 h-3.5" />
                    <span>Fight (1⚡)</span>
                  </button>

                  <button
                    onClick={() => {
                      onClose();
                      onAttack(report.defender.id, 'prank');
                    }}
                    className="py-3 px-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-950 transition-all cursor-pointer"
                  >
                    <Brain className="w-3.5 h-3.5" />
                    <span>Prank (1⚡)</span>
                  </button>

                  <button
                    onClick={() => {
                      onClose();
                      onAttack(report.defender.id, 'spy');
                    }}
                    className="py-3 px-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-amber-950 transition-all cursor-pointer"
                  >
                    <Radar className="w-3.5 h-3.5" />
                    <span>Spy (1⚡)</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
