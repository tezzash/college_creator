import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2,
  Users,
  Lock,
  Unlock,
  CheckCircle2,
  Dumbbell,
  Brain,
  Sparkles,
  RefreshCw,
  Coins,
  ShieldAlert,
  Wallet,
  ArrowRight,
  PlusCircle,
  ArrowUpCircle,
  Trash2,
  Star,
  Award,
  Layers,
  Zap,
  Info,
  X
} from 'lucide-react';
import { api } from '../api';
import { TowerRoom, Ally, Player } from '../types';
import { DormFurnitureSection } from './DormFurnitureSection';

interface TowerPageProps {
  player: Player | null;
  onPlayerUpdated: () => Promise<void>;
  showToast: (text: string, type?: 'error' | 'success' | 'info') => void;
  onNavigate?: (tab: 'home' | 'jobs' | 'tower' | 'battle') => void;
}

export const TOWER_UNLOCK_COSTS: Record<number, number> = {
  1: 250,
  2: 500,
  3: 900,
  4: 1500,
  5: 2500,
  6: 4200,
  7: 7000,
  8: 12000,
};

export const LEVEL_NAMES: Record<number, string> = {
  1: 'Freshman',
  2: 'Sophomore',
  3: 'Junior',
  4: 'Senior',
  5: 'Master Scholar',
};

export const LEVEL_MULTIPLIERS: Record<number, number> = {
  1: 1.0,
  2: 1.8,
  3: 2.8,
  4: 4.2,
  5: 6.0,
};

export const UPGRADE_COST_RATIOS: Record<number, number> = {
  2: 1.5,
  3: 2.8,
  4: 4.8,
  5: 8.0,
};

export const TowerPage: React.FC<TowerPageProps> = ({ player, onPlayerUpdated, showToast, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'rooms' | 'allies' | 'furniture'>('rooms');
  const [activeFloor, setActiveFloor] = useState<1 | 2>(1);
  const [rooms, setRooms] = useState<TowerRoom[]>([]);
  const [allies, setAllies] = useState<Ally[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  
  // Eviction Modal State
  const [evictTarget, setEvictTarget] = useState<{
    roomId: string;
    roomNumber: number;
    allyName: string;
    level: number;
    totalInvested: number;
    refundAmount: number;
  } | null>(null);

  const currentCash = player?.cash ?? 0;
  const currentPower = player?.power ?? 0;
  const currentSmartness = player?.smartness ?? 0;

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [towerRes, alliesRes] = await Promise.all([
        api.tower(),
        api.allies(),
      ]);
      setRooms(towerRes.rooms || []);
      setAllies(alliesRes.allies || []);
    } catch (err: any) {
      if (!silent) showToast(err.message || 'Failed to load tower data.', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUnlockRoom = async (roomNumber: number) => {
    if (actionBusy) return;
    setActionBusy(true);
    try {
      await api.unlockTowerRoom(roomNumber);
      showToast(`Unlocked Tower Suite #${roomNumber}!`, 'success');
      await loadData(true);
      await onPlayerUpdated();
    } catch (err: any) {
      showToast(err.message || 'Failed to unlock room.', 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const handleHireAlly = async (ally: Ally) => {
    if (actionBusy) return;

    // Find first available unlocked empty room
    const availableRoom = rooms.find(
      (r) => (r.unlocked !== false) && (!r.occupants || r.occupants.length === 0)
    );

    if (!availableRoom) {
      showToast('Unlock an empty tower suite first.', 'error');
      return;
    }

    setActionBusy(true);
    try {
      await api.hireAlly(ally.id, availableRoom.id);
      showToast(`Hired ${ally.name} into Suite #${availableRoom.roomNumber}! (+${ally.power} Power, +${ally.smartness} Smartness)`, 'success');
      await loadData(true);
      await onPlayerUpdated();
    } catch (err: any) {
      showToast(err.message || 'Failed to hire ally.', 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const handleUpgradeAlly = async (towerRoomId: string, currentLevel: number, ally: Ally) => {
    if (actionBusy) return;
    if (currentLevel >= 5) {
      showToast('This dormmate is already at Maximum Level (Master Scholar)!', 'info');
      return;
    }

    const nextLevel = currentLevel + 1;
    const upgradeCost = Math.round(ally.hireCost * (UPGRADE_COST_RATIOS[nextLevel] || 1.5));
    if (currentCash < upgradeCost) {
      showToast(`Need $${(upgradeCost - currentCash).toLocaleString()} more cash to upgrade ${ally.name}.`, 'error');
      return;
    }

    setActionBusy(true);
    try {
      const res = await api.upgradeAlly(towerRoomId);
      showToast(`Promoted ${ally.name} to Level ${res.newLevel} (${LEVEL_NAMES[res.newLevel]})!`, 'success');
      await loadData(true);
      await onPlayerUpdated();
    } catch (err: any) {
      showToast(err.message || 'Failed to upgrade dormmate.', 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const handleConfirmEvict = async () => {
    if (!evictTarget || actionBusy) return;
    setActionBusy(true);
    try {
      const res = await api.evictAlly(evictTarget.roomId);
      showToast(`Transferred ${res.allyName} out of Suite #${res.roomNumber}. Refunded +$${res.refundAmount.toLocaleString()}!`, 'success');
      setEvictTarget(null);
      await loadData(true);
      await onPlayerUpdated();
    } catch (err: any) {
      showToast(err.message || 'Failed to evict dormmate.', 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier.toLowerCase()) {
      case 'legendary':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'epic':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'rare':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
    }
  };

  const getArchetype = (power: number, smartness: number) => {
    if (power >= smartness * 2) return { label: 'Brawler (Power)', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' };
    if (smartness >= power * 2) return { label: 'Brainiac (Smartness)', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' };
    return { label: 'Campus Hybrid', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' };
  };

  const findRoom = (num: number) => rooms.find((r) => r.roomNumber === num);
  
  const floor1Rooms = [1, 2, 3, 4];
  const floor2Rooms = [5, 6, 7, 8];
  const displayedRoomNumbers = activeFloor === 1 ? floor1Rooms : floor2Rooms;

  const totalUnlockedRooms = rooms.filter((r) => r.unlocked !== false).length;
  const floor1Unlocked = rooms.filter((r) => r.unlocked !== false && r.roomNumber <= 4).length;
  const floor2Unlocked = rooms.filter((r) => r.unlocked !== false && r.roomNumber >= 5 && r.roomNumber <= 8).length;

  const firstEmptyUnlockedRoom = rooms.find(
    (r) => (r.unlocked !== false) && (!r.occupants || r.occupants.length === 0)
  );

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#121624] border border-slate-800/80 p-4 rounded-2xl gap-3 shadow-lg">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-white tracking-wide flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-400" />
            Campus Tower & Dorm Suites
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Unlock suites, hire roommates, and level them up to 5★ Master Scholars.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <span className="text-xs font-bold text-slate-400 bg-[#181E2E] border border-slate-800 px-2.5 py-1.5 rounded-xl">
            {totalUnlockedRooms}/8 Suites Unlocked
          </span>
          <button
            onClick={() => loadData()}
            disabled={loading}
            className="p-2 rounded-xl bg-[#181E2E] hover:bg-[#20273C] border border-slate-750 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Refresh tower"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 bg-[#121624] border border-slate-800/80 rounded-2xl">
        <button
          onClick={() => setActiveTab('rooms')}
          className={`py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'rooms'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Suites ({totalUnlockedRooms}/8)</span>
        </button>
        <button
          onClick={() => setActiveTab('allies')}
          className={`py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'allies'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Roommates ({allies.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('furniture')}
          className={`py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'furniture'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Dorm Upgrades & Perks</span>
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
          <p className="text-xs font-bold tracking-wider uppercase">Loading Campus Tower structure...</p>
        </div>
      ) : activeTab === 'rooms' ? (
        /* ROOMS TAB WITH FLOOR SELECTION */
        <div className="space-y-3">
          {/* Floor Selector Bar */}
          <div className="flex items-center justify-between bg-[#121624] border border-slate-800/80 p-1.5 rounded-2xl gap-2">
            <button
              onClick={() => setActiveFloor(1)}
              className={`flex-1 py-2 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeFloor === 1
                  ? 'bg-purple-600/30 border border-purple-500/50 text-white shadow-sm'
                  : 'bg-[#181E2E]/60 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Floor 1: Undergrad Commons ({floor1Unlocked}/4 Unlocked)</span>
            </button>
            <button
              onClick={() => setActiveFloor(2)}
              className={`flex-1 py-2 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeFloor === 2
                  ? 'bg-purple-600/30 border border-purple-500/50 text-white shadow-sm'
                  : 'bg-[#181E2E]/60 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Award className="w-4 h-4 text-amber-400" />
              <span>Floor 2: High-Honors Wing ({floor2Unlocked}/4 Unlocked)</span>
            </button>
          </div>

          {/* Grid of 4 rooms on active floor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {displayedRoomNumbers.map((num) => {
              const room = findRoom(num);
              const isUnlocked = room?.unlocked ?? false;
              const cost = TOWER_UNLOCK_COSTS[num] || 500;
              const occupant = room?.occupants && room.occupants.length > 0 ? room.occupants[0] : null;
              const ally = occupant?.ally;
              const currentLevel = occupant?.level || 1;
              const multiplier = LEVEL_MULTIPLIERS[currentLevel] || 1.0;
              const currentPowerBonus = ally ? Math.round(ally.power * multiplier) : 0;
              const currentSmartnessBonus = ally ? Math.round(ally.smartness * multiplier) : 0;

              const isMaxLevel = currentLevel >= 5;
              const nextLevel = currentLevel + 1;
              const nextMultiplier = LEVEL_MULTIPLIERS[nextLevel] || 1.0;
              const nextPowerBonus = ally ? Math.round(ally.power * nextMultiplier) : 0;
              const nextSmartnessBonus = ally ? Math.round(ally.smartness * nextMultiplier) : 0;
              const upgradeCost = ally ? Math.round(ally.hireCost * (UPGRADE_COST_RATIOS[nextLevel] || 1.5)) : 0;
              const canAffordUpgrade = currentCash >= upgradeCost;

              const totalInvested = occupant?.totalInvested || ally?.hireCost || 0;
              const refundAmount = Math.floor(totalInvested * 0.5);

              return (
                <div
                  key={num}
                  className={`bg-[#121624] border rounded-2xl p-4 flex flex-col justify-between transition-all relative ${
                    isUnlocked
                      ? occupant
                        ? 'border-purple-500/40 bg-[#151A2C] shadow-lg shadow-purple-950/20'
                        : 'border-emerald-500/40 bg-emerald-950/10'
                      : 'border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div>
                    {/* Suite Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
                            isUnlocked
                              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                              : 'bg-slate-800 text-slate-500 border border-slate-700/50'
                          }`}
                        >
                          #{num}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-white text-sm">
                              Suite {num}
                            </h3>
                            {num >= 5 && (
                              <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded">
                                Honors
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">
                            {isUnlocked
                              ? occupant
                                ? `Housed: ${ally?.name}`
                                : 'Vacant & Ready'
                              : `Unlock for $${cost.toLocaleString()}`}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isUnlocked ? (
                          <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center">
                            <Lock className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Occupant Card */}
                    {occupant && ally ? (
                      <div className="bg-[#0D101C] border border-purple-500/30 rounded-xl p-3.5 mb-3 space-y-2.5">
                        {/* Dormmate Name & Level */}
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-purple-200">
                                {ally.name}
                              </span>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.2 rounded-full border ${getTierBadge(ally.tier)}`}>
                                {ally.tier}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                              <span className="text-amber-400 font-bold">
                                Lv {currentLevel} ({LEVEL_NAMES[currentLevel]})
                              </span>
                              <span>•</span>
                              <span>{multiplier}x stat bonus</span>
                            </div>
                          </div>

                          {/* Star rating */}
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3 h-3 ${
                                  star <= currentLevel
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-slate-700'
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Current Effective Stats */}
                        <div className="flex items-center justify-between bg-[#141828] p-2 rounded-lg text-xs font-bold">
                          <span className="text-slate-400 text-[11px]">Stats:</span>
                          <div className="flex items-center gap-3">
                            {currentPowerBonus > 0 && (
                              <span className="text-rose-400 flex items-center gap-1">
                                <Dumbbell className="w-3 h-3" />
                                <span>+{currentPowerBonus} Power</span>
                              </span>
                            )}
                            {currentSmartnessBonus > 0 && (
                              <span className="text-purple-400 flex items-center gap-1">
                                <Brain className="w-3 h-3" />
                                <span>+{currentSmartnessBonus} Smart</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Level Upgrade Action Preview */}
                        {!isMaxLevel ? (
                          <div className="space-y-2 pt-1 border-t border-slate-800/60">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-400">Next: Lv {nextLevel} ({LEVEL_NAMES[nextLevel]})</span>
                              <span className="text-emerald-400 font-bold flex items-center gap-1">
                                {nextPowerBonus > currentPowerBonus && `+${nextPowerBonus - currentPowerBonus} Pwr `}
                                {nextSmartnessBonus > currentSmartnessBonus && `+${nextSmartnessBonus - currentSmartnessBonus} Smart`}
                              </span>
                            </div>

                            <button
                              onClick={() => room && handleUpgradeAlly(room.id, currentLevel, ally)}
                              disabled={actionBusy}
                              className={`w-full py-2 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                canAffordUpgrade
                                  ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-900/30'
                                  : 'bg-slate-800 text-rose-300 border border-rose-500/30 hover:bg-slate-800/80'
                              }`}
                            >
                              <ArrowUpCircle className="w-3.5 h-3.5 text-amber-300" />
                              <span>
                                {canAffordUpgrade
                                  ? `Upgrade to Lv ${nextLevel} ($${upgradeCost.toLocaleString()})`
                                  : `Need $${(upgradeCost - currentCash).toLocaleString()} more (Upgrade $${upgradeCost.toLocaleString()})`}
                              </span>
                            </button>
                          </div>
                        ) : (
                          <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg text-center text-xs font-bold text-amber-300 flex items-center justify-center gap-1.5">
                            <Award className="w-4 h-4 text-amber-400" />
                            <span>MAX LEVEL (5★ Master Scholar)</span>
                          </div>
                        )}

                        {/* Eviction / Transfer Trigger */}
                        <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500">
                          <span>Invested: ${totalInvested.toLocaleString()}</span>
                          <button
                            onClick={() => {
                              if (room) {
                                setEvictTarget({
                                  roomId: room.id,
                                  roomNumber: room.roomNumber,
                                  allyName: ally.name,
                                  level: currentLevel,
                                  totalInvested,
                                  refundAmount,
                                });
                              }
                            }}
                            className="text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Evict & Refund 50% (${refundAmount.toLocaleString()})</span>
                          </button>
                        </div>
                      </div>
                    ) : isUnlocked ? (
                      <div className="bg-[#0D101C]/60 border border-dashed border-purple-500/30 rounded-xl p-3.5 mb-3 flex items-center justify-between">
                        <div>
                          <div className="text-xs text-slate-300 font-bold">
                            Suite Vacant & Ready!
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Hire a roommate to gain combat stats.
                          </div>
                        </div>
                        <button
                          onClick={() => setActiveTab('allies')}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer transition-colors shadow"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Hire</span>
                        </button>
                      </div>
                    ) : (
                      <div className="bg-[#0D101C]/60 border border-slate-800/80 rounded-xl p-3 mb-3 flex items-center justify-between text-xs">
                        <span className="text-slate-400">Unlock Price</span>
                        <span className={`font-bold flex items-center gap-1 ${currentCash >= cost ? 'text-emerald-400' : 'text-slate-400'}`}>
                          <Coins className="w-3.5 h-3.5" />
                          ${cost.toLocaleString()} Cash
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Unlock Button */}
                  {!isUnlocked && (
                    <button
                      onClick={() => handleUnlockRoom(num)}
                      disabled={actionBusy}
                      className={`w-full py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50 ${
                        currentCash >= cost
                          ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>
                        {currentCash >= cost
                          ? `Unlock Suite #${num} ($${cost.toLocaleString()})`
                          : `Need $${(cost - currentCash).toLocaleString()} more to Unlock ($${cost.toLocaleString()})`}
                      </span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : activeTab === 'allies' ? (
        /* ALLIES TAB */
        <div className="space-y-3">
          {!firstEmptyUnlockedRoom && (
            <div className="bg-[#181E2E] border border-amber-500/30 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 text-amber-200">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  All your unlocked suites are currently full! Unlock another suite or evict an ally to house someone new.
                </span>
              </div>
              <button
                onClick={() => setActiveTab('rooms')}
                className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl font-black transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              >
                <span>View Suites</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {allies.map((ally) => {
              const isAlreadyHired = rooms.some((r) =>
                r.occupants?.some((o) => o.allyId === ally.id)
              );
              const canAfford = currentCash >= ally.hireCost;
              const hasEmptySuite = !!firstEmptyUnlockedRoom;
              const archetype = getArchetype(ally.power, ally.smartness);

              return (
                <div
                  key={ally.id}
                  className={`bg-[#121624] border rounded-2xl p-4 flex flex-col justify-between transition-all ${
                    isAlreadyHired
                      ? 'border-purple-500/20 bg-purple-950/5 opacity-80'
                      : 'border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span
                        className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border ${getTierBadge(
                          ally.tier
                        )}`}
                      >
                        {ally.tier}
                      </span>
                      <div className="text-xs font-black text-emerald-400 flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5" />
                        <span>${ally.hireCost.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-extrabold text-white text-sm">{ally.name}</h3>
                    </div>

                    {/* Archetype badge */}
                    <div className="mb-2.5">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${archetype.bg} ${archetype.color}`}>
                        {archetype.label}
                      </span>
                    </div>

                    {/* Level 1 vs Level 5 Scaling Preview */}
                    <div className="bg-[#0D101C] border border-slate-800/80 rounded-xl p-2.5 mb-3 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Base (Lv 1):</span>
                        <div className="flex items-center gap-2 font-bold">
                          {ally.power > 0 && <span className="text-rose-400">+{ally.power} Pwr</span>}
                          {ally.smartness > 0 && <span className="text-purple-400">+{ally.smartness} Smart</span>}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-amber-300 font-bold border-t border-slate-800/60 pt-1">
                        <span className="flex items-center gap-1 text-[10px] uppercase">
                          <Zap className="w-3 h-3 text-amber-400" />
                          Max (Lv 5 Master):
                        </span>
                        <div className="flex items-center gap-2">
                          {ally.power > 0 && <span className="text-rose-400">+{Math.round(ally.power * 6.0)} Pwr</span>}
                          {ally.smartness > 0 && <span className="text-purple-400">+{Math.round(ally.smartness * 6.0)} Smart</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (isAlreadyHired) return;
                      if (!hasEmptySuite) {
                        setActiveTab('rooms');
                        return;
                      }
                      if (!canAfford) {
                        if (onNavigate) onNavigate('jobs');
                        return;
                      }
                      handleHireAlly(ally);
                    }}
                    disabled={isAlreadyHired || actionBusy}
                    className={`w-full py-2 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isAlreadyHired
                        ? 'bg-slate-800/40 text-slate-500 border border-slate-800 cursor-not-allowed'
                        : !hasEmptySuite
                        ? 'bg-slate-800 text-amber-300 border border-amber-500/30 hover:bg-slate-800/80'
                        : !canAfford
                        ? 'bg-slate-800 text-rose-300 border border-rose-500/30 hover:bg-slate-800/80'
                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-900/30'
                    }`}
                  >
                    {isAlreadyHired ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Housed in Tower Suite</span>
                      </>
                    ) : !hasEmptySuite ? (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>Unlock Suite First</span>
                      </>
                    ) : !canAfford ? (
                      <>
                        <Wallet className="w-3.5 h-3.5" />
                        <span>Need ${(ally.hireCost - currentCash).toLocaleString()} More</span>
                      </>
                    ) : (
                      <>
                        <Users className="w-3.5 h-3.5" />
                        <span>Hire to Suite #{firstEmptyUnlockedRoom?.roomNumber} (${ally.hireCost.toLocaleString()})</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <DormFurnitureSection
          player={player || ({ cash: 0, power: 0, smartness: 0, energy: 0 } as any)}
          onPlayerUpdated={onPlayerUpdated}
          showToast={showToast}
        />
      )}

      {/* Eviction Confirmation Modal */}
      <AnimatePresence>
        {evictTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#121624] border border-slate-800 p-5 rounded-2xl max-w-md w-full shadow-2xl space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-400 font-black text-sm uppercase tracking-wider">
                  <Trash2 className="w-4 h-4" />
                  <span>Transfer / Evict Dormmate</span>
                </div>
                <button
                  onClick={() => setEvictTarget(null)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-slate-300 space-y-2">
                <p>
                  Are you sure you want to transfer <strong>{evictTarget.allyName}</strong> out of <strong>Suite #{evictTarget.roomNumber}</strong>?
                </p>
                <div className="bg-[#0D101C] border border-slate-800 p-3 rounded-xl space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Current Level:</span>
                    <span className="text-white font-bold">Lv {evictTarget.level} ({LEVEL_NAMES[evictTarget.level]})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Invested Cash:</span>
                    <span className="text-slate-200 font-bold">${evictTarget.totalInvested.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-800 pt-1 text-emerald-400 font-bold">
                    <span>50% Cash Refund:</span>
                    <span>+${evictTarget.refundAmount.toLocaleString()}</span>
                  </div>
                </div>
                <p className="text-slate-400 text-[11px]">
                  This will free up Suite #{evictTarget.roomNumber} so you can assign a higher tier dormmate.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setEvictTarget(null)}
                  disabled={actionBusy}
                  className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmEvict}
                  disabled={actionBusy}
                  className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black transition-colors cursor-pointer shadow-lg shadow-rose-900/30 flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirm (+${evictTarget.refundAmount.toLocaleString()})</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
