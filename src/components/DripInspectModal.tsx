import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Shield,
  Zap,
  Brain,
  Dumbbell,
  Swords,
  Flame,
  Crown,
  Eye,
  Wallet,
  Sparkles,
  Trophy,
  Award,
  Shirt,
  Glasses,
  Smile,
  CheckCircle2,
} from 'lucide-react';
import { Player, RivalPlayer } from '../types';
import { AvatarDisplay } from './AvatarDisplay';
import {
  TIER_MULTIPLIER_MAP,
  getCosmeticItem,
  calculateTotalDripBonus,
} from '../data/cosmeticsCatalog';
import { api } from '../api';

export interface DripInspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  player?: Player | RivalPlayer | null;
  playerId?: string | null;
  onFight?: (target: RivalPlayer) => void;
  onPrank?: (target: RivalPlayer) => void;
  onSpy?: (target: RivalPlayer) => void;
}

export const DripInspectModal: React.FC<DripInspectModalProps> = ({
  isOpen,
  onClose,
  player,
  playerId,
  onFight,
  onPrank,
  onSpy,
}) => {
  const [fullPlayer, setFullPlayer] = useState<any>(player || null);
  const [loading, setLoading] = useState(false);

  const targetId = player?.id || playerId;

  useEffect(() => {
    if (isOpen && targetId) {
      // Fetch full profile
      setLoading(true);
      api
        .inspectPlayer(targetId)
        .then((res) => {
          if (res.player) {
            setFullPlayer(res.player);
          }
        })
        .catch(() => {
          if (player) setFullPlayer(player);
        })
        .finally(() => setLoading(false));
    } else {
      setFullPlayer(player || null);
    }
  }, [isOpen, targetId, player]);

  if (!isOpen || (!player && !playerId)) return null;

  const p = fullPlayer || player;
  const avatarId = p.avatarId || 'avatar-coder';
  const outfitId = p.avatarOutfit || 'outfit-hoodie';
  const headwearId = p.avatarHeadwear || 'headwear-none';
  const accessoryId = p.avatarAccessory || 'acc-laptop';
  const auraId = p.avatarAura || 'aura-none';
  const frameId = p.avatarFrame || 'frame-neon';
  const title = p.equippedTitle || 'Freshman Contender';

  const personaItem = getCosmeticItem(avatarId);
  const rarity = personaItem?.rarity || 'COMMON';
  const tierConfig = TIER_MULTIPLIER_MAP[rarity] || TIER_MULTIPLIER_MAP.COMMON;

  const dripBonus = calculateTotalDripBonus(
    avatarId,
    outfitId,
    headwearId,
    accessoryId,
    auraId,
    frameId
  );

  const outfitItem = getCosmeticItem(outfitId);
  const headwearItem = getCosmeticItem(headwearId);
  const accessoryItem = getCosmeticItem(accessoryId);
  const auraItem = getCosmeticItem(auraId);
  const frameItem = getCosmeticItem(frameId);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-[#111422] border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col my-auto max-h-[92vh]"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-950/60 via-slate-900 to-[#111422] border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-white tracking-wide flex items-center gap-2">
                  Campus Drip Showcase
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  Player Wardrobe, Stat Multipliers & Combat Gear
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 sm:space-y-5">
            {/* Top Showcase Banner: Full-Body Fashion Model + Persona Card */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
              {/* Full-Body Fashion Model */}
              <div className="sm:col-span-5 flex flex-col items-center justify-center">
                <AvatarDisplay
                  avatarId={avatarId}
                  avatarOutfit={outfitId}
                  avatarHeadwear={headwearId}
                  avatarAccessory={accessoryId}
                  avatarAura={auraId}
                  avatarFrame={frameId}
                  viewMode="fullbody"
                  size="2xl"
                  showTierRibbon
                  className="w-full max-w-[200px]"
                />
              </div>

              {/* Player Profile & Multipliers */}
              <div className="sm:col-span-7 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${tierConfig.badgeClass}`}>
                      {tierConfig.label}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                      <Crown className="w-3 h-3" />
                      {title}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-white mt-1">
                    {p.username}
                  </h3>

                  {p.customBio && (
                    <p className="text-xs text-slate-300 italic mt-1 bg-slate-950/60 border border-slate-800 rounded-lg p-2">
                      &quot;{p.customBio}&quot;
                    </p>
                  )}
                </div>

                {/* Stat Multiplier Banner */}
                <div className="bg-gradient-to-r from-amber-950/40 via-purple-950/40 to-slate-950 border border-amber-500/30 rounded-xl p-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-400" />
                      Avatar Stat Multiplier
                    </span>
                    <span className="font-black text-amber-400 text-sm">
                      {tierConfig.percentText}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Boosts Power & Smartness in all Campus Duels & Pranks
                  </p>
                </div>

                {/* Core Stats Overview */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2 flex items-center gap-2">
                    <Dumbbell className="w-4 h-4 text-rose-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold">Power</div>
                      <div className="text-sm font-black text-white">{p.power ?? 0}</div>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-sky-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold">Smartness</div>
                      <div className="text-sm font-black text-white">{p.smartness ?? 0}</div>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold">Win Streak</div>
                      <div className="text-sm font-black text-amber-400">{p.winStreak ?? 0}x</div>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2 flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-[10px] text-slate-400 font-semibold">Pocket Cash</div>
                      <div className="text-sm font-black text-emerald-400">${(p.cash ?? 0).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Set Synergy if any */}
            {dripBonus.activeSynergies.length > 0 && (
              <div className="bg-gradient-to-r from-emerald-950/40 via-cyan-950/40 to-slate-950 border border-emerald-500/40 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-black text-emerald-300 uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Active Set Synergy Bonus
                </div>
                {dripBonus.activeSynergies.map((synergy) => (
                  <div key={synergy.id} className="text-xs text-slate-200">
                    <span className="font-bold text-white">{synergy.name}: </span>
                    <span className="text-emerald-400 font-semibold">{synergy.bonusText}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Equipped 6-Slot Gear Inspector */}
            <div>
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Shirt className="w-3.5 h-3.5 text-purple-400" />
                Equipped Drip Slots
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {/* 1. Persona */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5">
                  <div className="text-[10px] text-purple-400 font-bold uppercase">Persona</div>
                  <div className="text-xs font-black text-white truncate mt-0.5">{personaItem?.name || 'Hacker Geek'}</div>
                  <div className="text-[10px] text-slate-400 truncate">{tierConfig.label}</div>
                </div>

                {/* 2. Outfit */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5">
                  <div className="text-[10px] text-cyan-400 font-bold uppercase">Outfit</div>
                  <div className="text-xs font-black text-white truncate mt-0.5">{outfitItem?.name || 'Tech Hoodie'}</div>
                  <div className="text-[10px] text-slate-400 truncate">{outfitItem?.tag || 'Apparel'}</div>
                </div>

                {/* 3. Headwear */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5">
                  <div className="text-[10px] text-amber-400 font-bold uppercase">Headwear</div>
                  <div className="text-xs font-black text-white truncate mt-0.5">{headwearItem?.name || 'Natural Hair'}</div>
                  <div className="text-[10px] text-slate-400 truncate">{headwearItem?.tag || 'Headwear'}</div>
                </div>

                {/* 4. Handheld Relic */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5">
                  <div className="text-[10px] text-emerald-400 font-bold uppercase">Handheld Gear</div>
                  <div className="text-xs font-black text-white truncate mt-0.5">{accessoryItem?.name || 'Hacker Laptop'}</div>
                  <div className="text-[10px] text-slate-400 truncate">{accessoryItem?.tag || 'Gear'}</div>
                </div>

                {/* 5. Aura FX */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5">
                  <div className="text-[10px] text-rose-400 font-bold uppercase">Aura & Sparkle</div>
                  <div className="text-xs font-black text-white truncate mt-0.5">{auraItem?.name || 'No Aura'}</div>
                  <div className="text-[10px] text-slate-400 truncate">{auraItem?.tag || 'Visual FX'}</div>
                </div>

                {/* 6. Border Frame */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5">
                  <div className="text-[10px] text-sky-400 font-bold uppercase">Avatar Frame</div>
                  <div className="text-xs font-black text-white truncate mt-0.5">{frameItem?.name || 'Neon Glow'}</div>
                  <div className="text-[10px] text-slate-400 truncate">{frameItem?.tag || 'Frame'}</div>
                </div>
              </div>
            </div>

            {/* Quick Actions (Fight, Prank, Spy) if target is another player */}
            {(onFight || onPrank || onSpy) && (
              <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                {onFight && (
                  <button
                    onClick={() => {
                      onClose();
                      onFight(p as RivalPlayer);
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs shadow-lg shadow-rose-950/50 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Swords className="w-3.5 h-3.5" />
                    Challenge Arena Duel
                  </button>
                )}

                {onPrank && (
                  <button
                    onClick={() => {
                      onClose();
                      onPrank(p as RivalPlayer);
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-950/50 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Flame className="w-3.5 h-3.5" />
                    Launch Prank
                  </button>
                )}

                {onSpy && (
                  <button
                    onClick={() => {
                      onClose();
                      onSpy(p as RivalPlayer);
                    }}
                    className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Spy Intel
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
