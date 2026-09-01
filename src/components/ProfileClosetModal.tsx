import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sparkles,
  User,
  Shield,
  Check,
  Lock,
  Flame,
  Award,
  Crown,
  Shirt,
  Glasses,
  Zap,
  DollarSign,
  Briefcase,
  Dumbbell,
  Brain,
  Save,
  MessageSquare,
  ShoppingBag,
  ShoppingBag as StoreIcon,
  RotateCcw,
  Dice5,
  Coins,
  ArrowRight,
  TrendingUp,
  Target,
  Trophy
} from 'lucide-react';
import { api } from '../api';
import { Player, CosmeticItem, CosmeticCategory, CosmeticRarity } from '../types';
import { AvatarDisplay } from './AvatarDisplay';
import { COSMETICS_MASTER_CATALOG, SET_SYNERGIES, SetSynergy } from '../data/cosmeticsCatalog';

interface ProfileClosetModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  onPlayerUpdated: () => void;
  showToast: (text: string, type?: 'error' | 'success' | 'info') => void;
}

export function ProfileClosetModal({
  isOpen,
  onClose,
  player,
  onPlayerUpdated,
  showToast,
}: ProfileClosetModalProps) {
  // Top-level modal view: DRESSING_ROOM vs QUAD_BOUTIQUE vs FEATS
  const [activeView, setActiveView] = useState<'DRESSING_ROOM' | 'QUAD_BOUTIQUE' | 'FEATS'>('DRESSING_ROOM');

  // Dressing room category filter
  const [activeCategory, setActiveCategory] = useState<'PERSONA' | 'AURA' | 'OUTFIT' | 'HEADWEAR' | 'GEAR' | 'FRAME' | 'TITLES' | 'BIO'>('PERSONA');

  // Boutique category filter & rarity filter
  const [boutiqueCategory, setBoutiqueCategory] = useState<'ALL' | CosmeticCategory>('ALL');
  const [boutiqueRarity, setBoutiqueRarity] = useState<'ALL' | CosmeticRarity>('ALL');

  const [availableTitles, setAvailableTitles] = useState<Array<{ id: string; title: string; unlocked: boolean; requirement: string }>>([]);
  const [loadingTitles, setLoadingTitles] = useState(true);
  const [saving, setSaving] = useState(false);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  // Local Try-On / Wardrobe State
  const [selectedTitle, setSelectedTitle] = useState(player.equippedTitle || 'Freshman Novice');
  const [selectedAvatar, setSelectedAvatar] = useState(player.avatarId || 'avatar-coder');
  const [selectedAura, setSelectedAura] = useState(player.avatarAura || 'aura-none');
  const [selectedFrame, setSelectedFrame] = useState(player.avatarFrame || 'frame-neon');
  const [selectedOutfit, setSelectedOutfit] = useState(player.avatarOutfit || 'outfit-hoodie');
  const [selectedHeadwear, setSelectedHeadwear] = useState(player.avatarHeadwear || 'headwear-none');
  const [selectedAccessory, setSelectedAccessory] = useState(player.avatarAccessory || 'acc-laptop');
  const [customBio, setCustomBio] = useState(player.customBio || 'Ready to conquer the campus empire! 💻💸');

  // Owned cosmetics list
  const ownedSet = useMemo(() => {
    const defaultStarter = ['avatar-coder', 'avatar-varsity', 'avatar-scholar', 'avatar-freshman', 'aura-none', 'outfit-hoodie', 'headwear-none', 'acc-laptop', 'frame-neon'];
    const current = Array.isArray(player.ownedCosmetics) ? player.ownedCosmetics : [];
    return new Set([...defaultStarter, ...current]);
  }, [player.ownedCosmetics]);

  useEffect(() => {
    if (isOpen) {
      setSelectedTitle(player.equippedTitle || 'Freshman Novice');
      setSelectedAvatar(player.avatarId || 'avatar-coder');
      setSelectedAura(player.avatarAura || 'aura-none');
      setSelectedFrame(player.avatarFrame || 'frame-neon');
      setSelectedOutfit(player.avatarOutfit || 'outfit-hoodie');
      setSelectedHeadwear(player.avatarHeadwear || 'headwear-none');
      setSelectedAccessory(player.avatarAccessory || 'acc-laptop');
      setCustomBio(player.customBio || 'Ready to conquer the campus empire! 💻💸');

      const fetchTitles = async () => {
        try {
          setLoadingTitles(true);
          const res = await api.getProfile();
          setAvailableTitles(res.availableTitles || []);
        } catch {
          // fallback
        } finally {
          setLoadingTitles(false);
        }
      };
      fetchTitles();
    }
  }, [isOpen, player]);

  // Check Set Synergies
  const activeSynergies = useMemo(() => {
    const currentEquipped = [selectedAvatar, selectedAura, selectedOutfit, selectedHeadwear, selectedAccessory, selectedFrame];
    return SET_SYNERGIES.map((synergy) => {
      const matchCount = synergy.requiredItemIds.filter(id => currentEquipped.includes(id)).length;
      const isComplete = matchCount >= synergy.requiredItemIds.length;
      return {
        ...synergy,
        matchCount,
        totalRequired: synergy.requiredItemIds.length,
        isComplete,
      };
    });
  }, [selectedAvatar, selectedAura, selectedOutfit, selectedHeadwear, selectedAccessory, selectedFrame]);

  const hasUnsavedChanges = useMemo(() => {
    return (
      selectedTitle !== (player.equippedTitle || 'Freshman Novice') ||
      selectedAvatar !== (player.avatarId || 'avatar-coder') ||
      selectedAura !== (player.avatarAura || 'aura-none') ||
      selectedFrame !== (player.avatarFrame || 'frame-neon') ||
      selectedOutfit !== (player.avatarOutfit || 'outfit-hoodie') ||
      selectedHeadwear !== (player.avatarHeadwear || 'headwear-none') ||
      selectedAccessory !== (player.avatarAccessory || 'acc-laptop') ||
      customBio !== (player.customBio || 'Ready to conquer the campus empire! 💻💸')
    );
  }, [selectedTitle, selectedAvatar, selectedAura, selectedFrame, selectedOutfit, selectedHeadwear, selectedAccessory, customBio, player]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.updateProfile({
        equippedTitle: selectedTitle,
        avatarId: selectedAvatar,
        avatarAura: selectedAura,
        avatarFrame: selectedFrame,
        avatarOutfit: selectedOutfit,
        avatarHeadwear: selectedHeadwear,
        avatarAccessory: selectedAccessory,
        customBio,
      });
      onPlayerUpdated();
      showToast('Avatar drip & wardrobe saved successfully!', 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to update wardrobe.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRevert = () => {
    setSelectedTitle(player.equippedTitle || 'Freshman Novice');
    setSelectedAvatar(player.avatarId || 'avatar-coder');
    setSelectedAura(player.avatarAura || 'aura-none');
    setSelectedFrame(player.avatarFrame || 'frame-neon');
    setSelectedOutfit(player.avatarOutfit || 'outfit-hoodie');
    setSelectedHeadwear(player.avatarHeadwear || 'headwear-none');
    setSelectedAccessory(player.avatarAccessory || 'acc-laptop');
    setCustomBio(player.customBio || 'Ready to conquer the campus empire! 💻💸');
    showToast('Reverted to currently equipped wardrobe.', 'info');
  };

  const handleRandomize = () => {
    const personas = COSMETICS_MASTER_CATALOG.filter(c => c.category === 'PERSONA' && ownedSet.has(c.id));
    const auras = COSMETICS_MASTER_CATALOG.filter(c => c.category === 'AURA' && ownedSet.has(c.id));
    const frames = COSMETICS_MASTER_CATALOG.filter(c => c.category === 'FRAME' && ownedSet.has(c.id));
    const outfits = COSMETICS_MASTER_CATALOG.filter(c => c.category === 'OUTFIT' && ownedSet.has(c.id));
    const headwears = COSMETICS_MASTER_CATALOG.filter(c => c.category === 'HEADWEAR' && ownedSet.has(c.id));
    const gears = COSMETICS_MASTER_CATALOG.filter(c => c.category === 'GEAR' && ownedSet.has(c.id));

    if (personas.length) setSelectedAvatar(personas[Math.floor(Math.random() * personas.length)].id);
    if (auras.length) setSelectedAura(auras[Math.floor(Math.random() * auras.length)].id);
    if (frames.length) setSelectedFrame(frames[Math.floor(Math.random() * frames.length)].id);
    if (outfits.length) setSelectedOutfit(outfits[Math.floor(Math.random() * outfits.length)].id);
    if (headwears.length) setSelectedHeadwear(headwears[Math.floor(Math.random() * headwears.length)].id);
    if (gears.length) setSelectedAccessory(gears[Math.floor(Math.random() * gears.length)].id);

    showToast('Randomized your owned wardrobe items!', 'info');
  };

  const handleEquipSynergySet = (synergy: SetSynergy) => {
    const items = COSMETICS_MASTER_CATALOG.filter(c => synergy.requiredItemIds.includes(c.id));
    items.forEach((item) => {
      if (item.category === 'PERSONA') setSelectedAvatar(item.id);
      if (item.category === 'AURA') setSelectedAura(item.id);
      if (item.category === 'OUTFIT') setSelectedOutfit(item.id);
      if (item.category === 'HEADWEAR') setSelectedHeadwear(item.id);
      if (item.category === 'GEAR') setSelectedAccessory(item.id);
    });
    showToast(`Equipped ${synergy.name} components!`, 'info');
  };

  const handleBuyCosmetic = async (item: CosmeticItem) => {
    if (player.cash < item.cost) {
      showToast(`Insufficient cash! Required: $${item.cost.toLocaleString()}`, 'error');
      return;
    }

    try {
      setPurchasingId(item.id);
      await api.buyCosmetic(item.id, item.cost);
      // Auto-equip the newly purchased item
      if (item.category === 'PERSONA') setSelectedAvatar(item.id);
      if (item.category === 'AURA') setSelectedAura(item.id);
      if (item.category === 'FRAME') setSelectedFrame(item.id);
      if (item.category === 'OUTFIT') setSelectedOutfit(item.id);
      if (item.category === 'HEADWEAR') setSelectedHeadwear(item.id);
      if (item.category === 'GEAR') setSelectedAccessory(item.id);

      onPlayerUpdated();
      showToast(`Unlocked & equipped ${item.name}!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to purchase cosmetic.', 'error');
    } finally {
      setPurchasingId(null);
    }
  };

  const handleClaimFeat = async (item: CosmeticItem) => {
    try {
      setClaimingId(item.id);
      await api.claimCosmeticFeat(item.id);
      if (item.category === 'PERSONA') setSelectedAvatar(item.id);
      if (item.category === 'AURA') setSelectedAura(item.id);
      if (item.category === 'FRAME') setSelectedFrame(item.id);
      if (item.category === 'OUTFIT') setSelectedOutfit(item.id);
      if (item.category === 'HEADWEAR') setSelectedHeadwear(item.id);
      if (item.category === 'GEAR') setSelectedAccessory(item.id);

      onPlayerUpdated();
      showToast(`Claimed Feat Reward: ${item.name}!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to claim feat item.', 'error');
    } finally {
      setClaimingId(null);
    }
  };

  const checkFeatEligibility = (item: CosmeticItem) => {
    if (!item.unlockCondition) return { isEligible: true, progressText: 'Unlocked' };
    const cond = item.unlockCondition;
    const netWorth = Number(player.cash) + Number(player.bankCash || 0);

    switch (cond.type) {
      case 'WIN_STREAK': {
        const cur = player.highestStreak || player.winStreak || 0;
        const target = cond.threshold || 1;
        return { isEligible: cur >= target, progressText: `${cur} / ${target} Win Streak` };
      }
      case 'NET_WORTH': {
        const cur = netWorth;
        const target = cond.threshold || 1;
        return { isEligible: cur >= target, progressText: `$${cur.toLocaleString()} / $${target.toLocaleString()} Net Worth` };
      }
      case 'JOBS_COUNT': {
        const cur = player.totalJobsCompleted || 0;
        const target = cond.threshold || 1;
        return { isEligible: cur >= target, progressText: `${cur} / ${target} Jobs Done` };
      }
      case 'PVP_WINS': {
        const cur = player.totalPvPWins || 0;
        const target = cond.threshold || 1;
        return { isEligible: cur >= target, progressText: `${cur} / ${target} PvP Wins` };
      }
      case 'HOSPITALIZATIONS': {
        const cur = player.totalPvPWins || 0; // mapped to arena mastery
        const target = cond.threshold || 1;
        return { isEligible: cur >= target, progressText: `${cur} / ${target} Rivals Pinned` };
      }
      default:
        return { isEligible: true, progressText: 'Unlocked' };
    }
  };

  const getRarityBadge = (rarity: CosmeticRarity) => {
    switch (rarity) {
      case 'COMMON':
        return <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">Common</span>;
      case 'RARE':
        return <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50">Rare</span>;
      case 'EPIC':
        return <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-700/50">Epic</span>;
      case 'LEGENDARY':
        return <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700/60 shadow-[0_0_8px_rgba(251,191,36,0.3)]">Legendary</span>;
      case 'MYTHIC':
        return <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700/60 shadow-[0_0_10px_rgba(244,63,94,0.4)]">Mythic Feat</span>;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="relative w-full max-w-5xl bg-[#111420] border border-purple-500/30 rounded-3xl shadow-2xl overflow-hidden my-4 sm:my-6 flex flex-col max-h-[92vh]"
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-purple-950/40 via-indigo-950/20 to-[#111420] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white uppercase tracking-wider">
                  Campus Wardrobe Studio & Quad Boutique
                </h2>
                <span className="hidden sm:inline-block text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded-full">
                  Flex Cosmetics Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Layer animated auras, custom headwear, designer streetwear, and synergy sets to out-drip campus rivals
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-black text-emerald-400">
              <Coins className="w-3.5 h-3.5" />
              ${Number(player.cash).toLocaleString()} Cash
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Mode Navigation Switcher */}
        <div className="px-6 pt-3 pb-2 border-b border-slate-800/70 bg-[#0E101A] flex items-center justify-between gap-4 shrink-0 flex-wrap">
          <div className="flex items-center gap-2">
            {[
              { key: 'DRESSING_ROOM', label: 'Interactive Wardrobe', icon: User },
              { key: 'QUAD_BOUTIQUE', label: 'Quad Fashion Boutique', icon: StoreIcon },
              { key: 'FEATS', label: 'Feats & Mythic Unlocks', icon: Award },
            ].map((mode) => {
              const Icon = mode.icon;
              const isActive = activeView === mode.key;
              return (
                <button
                  key={mode.key}
                  onClick={() => setActiveView(mode.key as any)}
                  className={`flex items-center gap-2 text-xs font-black px-4 py-2 rounded-xl uppercase tracking-wider transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-950/50'
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {mode.label}
                </button>
              );
            })}
          </div>

          {/* Quick Actions in Dressing Room */}
          {activeView === 'DRESSING_ROOM' && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleRandomize}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
                title="Randomize Owned Drip"
              >
                <Dice5 className="w-3.5 h-3.5 text-purple-400" />
                Randomize
              </button>
              {hasUnsavedChanges && (
                <button
                  onClick={handleRevert}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-rose-300 hover:text-rose-200 hover:border-rose-700 transition-all cursor-pointer"
                  title="Revert Unsaved Changes"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Revert
                </button>
              )}
            </div>
          )}
        </div>

        {/* Modal Main Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Live 2XL Studio Mannequin & Student ID Hologram Card (Sticky) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Live Studio Mannequin Preview
              </h3>
              {hasUnsavedChanges && (
                <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full animate-pulse">
                  Try-On Preview Active
                </span>
              )}
            </div>

            {/* High-Impact Student ID / Mannequin Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-[#151827] to-purple-950/40 border-2 border-purple-500/30 rounded-3xl p-5 shadow-2xl">
              {/* Card Hologram Banner */}
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 text-xs font-black">
                    CG
                  </div>
                  <span className="text-[11px] font-black tracking-widest text-slate-300 uppercase">
                    COLLEGE OF GEEKS
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                  ID #{player.id.slice(0, 6).toUpperCase()}
                </span>
              </div>

              {/* Central Large Studio Mannequin */}
              <div className="mt-4 flex flex-col items-center justify-center py-2">
                <AvatarDisplay
                  avatarId={selectedAvatar}
                  avatarAura={selectedAura}
                  avatarFrame={selectedFrame}
                  avatarOutfit={selectedOutfit}
                  avatarHeadwear={selectedHeadwear}
                  avatarAccessory={selectedAccessory}
                  size="2xl"
                  className="transition-transform duration-300 hover:scale-105"
                />

                <div className="mt-3 text-center">
                  <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-black text-amber-400">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    {selectedTitle}
                  </div>
                  <h4 className="text-lg font-black text-white mt-1">
                    {player.username}
                  </h4>
                  <div className="text-[11px] font-bold text-emerald-400 flex items-center justify-center gap-1 mt-0.5">
                    <DollarSign className="w-3 h-3" />
                    ${(Number(player.cash) + Number(player.bankCash || 0)).toLocaleString()} Net Worth
                  </div>
                </div>
              </div>

              {/* Student Motto / Bio */}
              <div className="mt-3 bg-[#0B0D14]/90 border border-slate-800 rounded-2xl p-3 text-xs text-slate-300 italic text-center">
                "{customBio || 'No student motto set yet.'}"
              </div>

              {/* Active Equipped Gear Slots Loadout */}
              <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Equipped Drip Slots</span>
                  <span className="text-purple-400 text-[10px] font-bold">Live Loadout</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => { setActiveView('DRESSING_ROOM'); setActiveCategory('OUTFIT'); }}
                    className="p-1.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-purple-500/50 text-left transition-all cursor-pointer"
                  >
                    <div className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1">
                      <Shirt className="w-2.5 h-2.5 text-indigo-400" /> Outfit
                    </div>
                    <div className="text-[10px] font-bold text-white truncate mt-0.5">
                      {COSMETICS_MASTER_CATALOG.find(c => c.id === selectedOutfit)?.name || 'Default'}
                    </div>
                  </button>
                  <button
                    onClick={() => { setActiveView('DRESSING_ROOM'); setActiveCategory('HEADWEAR'); }}
                    className="p-1.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-purple-500/50 text-left transition-all cursor-pointer"
                  >
                    <div className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1">
                      <Glasses className="w-2.5 h-2.5 text-cyan-400" /> Headwear
                    </div>
                    <div className="text-[10px] font-bold text-white truncate mt-0.5">
                      {selectedHeadwear === 'headwear-none' ? 'None' : COSMETICS_MASTER_CATALOG.find(c => c.id === selectedHeadwear)?.name || 'None'}
                    </div>
                  </button>
                  <button
                    onClick={() => { setActiveView('DRESSING_ROOM'); setActiveCategory('GEAR'); }}
                    className="p-1.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-purple-500/50 text-left transition-all cursor-pointer"
                  >
                    <div className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1">
                      <Zap className="w-2.5 h-2.5 text-amber-400" /> Hand Gear
                    </div>
                    <div className="text-[10px] font-bold text-white truncate mt-0.5">
                      {COSMETICS_MASTER_CATALOG.find(c => c.id === selectedAccessory)?.name || 'None'}
                    </div>
                  </button>
                  <button
                    onClick={() => { setActiveView('DRESSING_ROOM'); setActiveCategory('AURA'); }}
                    className="p-1.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-purple-500/50 text-left transition-all cursor-pointer"
                  >
                    <div className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-fuchsia-400" /> Aura FX
                    </div>
                    <div className="text-[10px] font-bold text-white truncate mt-0.5">
                      {selectedAura === 'aura-none' ? 'None' : COSMETICS_MASTER_CATALOG.find(c => c.id === selectedAura)?.name || 'None'}
                    </div>
                  </button>
                  <button
                    onClick={() => { setActiveView('DRESSING_ROOM'); setActiveCategory('PERSONA'); }}
                    className="p-1.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-purple-500/50 text-left transition-all cursor-pointer"
                  >
                    <div className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1">
                      <User className="w-2.5 h-2.5 text-emerald-400" /> Persona
                    </div>
                    <div className="text-[10px] font-bold text-white truncate mt-0.5">
                      {COSMETICS_MASTER_CATALOG.find(c => c.id === selectedAvatar)?.name || 'Default'}
                    </div>
                  </button>
                  <button
                    onClick={() => { setActiveView('DRESSING_ROOM'); setActiveCategory('FRAME'); }}
                    className="p-1.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-purple-500/50 text-left transition-all cursor-pointer"
                  >
                    <div className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1">
                      <Shield className="w-2.5 h-2.5 text-rose-400" /> Frame
                    </div>
                    <div className="text-[10px] font-bold text-white truncate mt-0.5">
                      {COSMETICS_MASTER_CATALOG.find(c => c.id === selectedFrame)?.name || 'Default'}
                    </div>
                  </button>
                </div>
              </div>

              {/* Active Set Synergy Tracker */}
              <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Active Set Synergy</span>
                  <span className="text-cyan-400">
                    {activeSynergies.find(s => s.isComplete)?.name || 'Partial Synergy'}
                  </span>
                </div>
                {activeSynergies.map((synergy) => {
                  const percent = Math.round((synergy.matchCount / synergy.totalRequired) * 100);
                  return (
                    <div key={synergy.id} className="bg-slate-950/70 border border-slate-800 rounded-xl p-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className={`font-black ${synergy.isComplete ? 'text-amber-300' : 'text-slate-300'}`}>
                          {synergy.name}
                        </span>
                        <span className={`text-[10px] font-mono font-bold ${synergy.isComplete ? 'text-amber-400' : 'text-slate-500'}`}>
                          {synergy.matchCount} / {synergy.totalRequired}
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${synergy.isComplete ? 'bg-gradient-to-r from-amber-400 to-yellow-500' : 'bg-cyan-500'}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                        {synergy.bonusText}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges}
              className={`w-full flex items-center justify-center gap-2 text-white font-black text-sm py-3.5 px-4 rounded-2xl shadow-xl transition-all transform active:scale-95 cursor-pointer ${
                hasUnsavedChanges
                  ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 shadow-purple-950/60'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-75'
              }`}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving Attire...' : hasUnsavedChanges ? 'Equip & Save Wardrobe Drip' : 'Wardrobe Equipped & Synced'}
            </button>
          </div>

          {/* Right Column: Dynamic Sub-views */}
          <div className="lg:col-span-7 space-y-4">
            {/* VIEW 1: DRESSING ROOM */}
            {activeView === 'DRESSING_ROOM' && (
              <div className="space-y-4">
                {/* Category Pills Navigation */}
                <div className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto">
                  {[
                    { key: 'PERSONA', label: 'Personas', icon: User },
                    { key: 'AURA', label: 'Auras & FX', icon: Sparkles },
                    { key: 'OUTFIT', label: 'Outfits', icon: Shirt },
                    { key: 'HEADWEAR', label: 'Headwear', icon: Glasses },
                    { key: 'GEAR', label: 'Handheld Gear', icon: Zap },
                    { key: 'FRAME', label: 'Frames', icon: Shield },
                    { key: 'TITLES', label: 'Titles', icon: Award },
                    { key: 'BIO', label: 'Motto', icon: MessageSquare },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeCategory === tab.key;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActiveCategory(tab.key as any)}
                        className={`flex items-center gap-1.5 text-xs font-black px-3 py-2 rounded-xl uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                          isActive
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Subtab Content: PERSONA / AURA / OUTFIT / HEADWEAR / GEAR / FRAME */}
                {activeCategory !== 'TITLES' && activeCategory !== 'BIO' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">
                        Select {activeCategory}
                      </h4>
                      <span className="text-[11px] text-slate-400 font-bold">
                        {COSMETICS_MASTER_CATALOG.filter(c => c.category === activeCategory && ownedSet.has(c.id)).length} Owned
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
                      {COSMETICS_MASTER_CATALOG.filter(c => c.category === activeCategory).map((item) => {
                        const isOwned = ownedSet.has(item.id);
                        let isSelected = false;
                        if (activeCategory === 'PERSONA') isSelected = selectedAvatar === item.id;
                        if (activeCategory === 'AURA') isSelected = selectedAura === item.id;
                        if (activeCategory === 'OUTFIT') isSelected = selectedOutfit === item.id;
                        if (activeCategory === 'HEADWEAR') isSelected = selectedHeadwear === item.id;
                        if (activeCategory === 'GEAR') isSelected = selectedAccessory === item.id;
                        if (activeCategory === 'FRAME') isSelected = selectedFrame === item.id;

                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              if (isOwned) {
                                if (activeCategory === 'PERSONA') setSelectedAvatar(item.id);
                                if (activeCategory === 'AURA') setSelectedAura(item.id);
                                if (activeCategory === 'OUTFIT') setSelectedOutfit(item.id);
                                if (activeCategory === 'HEADWEAR') setSelectedHeadwear(item.id);
                                if (activeCategory === 'GEAR') setSelectedAccessory(item.id);
                                if (activeCategory === 'FRAME') setSelectedFrame(item.id);
                              } else {
                                // Switch to Boutique or Feats tab to acquire
                                if (item.unlockCondition?.type === 'CASH') {
                                  setActiveView('QUAD_BOUTIQUE');
                                  setBoutiqueCategory(item.category);
                                } else {
                                  setActiveView('FEATS');
                                }
                              }
                            }}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                              isSelected
                                ? 'bg-purple-600/20 border-purple-400 shadow-lg ring-1 ring-purple-400'
                                : isOwned
                                ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                                : 'bg-slate-950/60 border-slate-800/60 opacity-60 hover:opacity-90'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                {activeCategory === 'PERSONA' ? (
                                  <AvatarDisplay avatarId={item.id} avatarFrame={selectedFrame} size="sm" />
                                ) : activeCategory === 'AURA' ? (
                                  <AvatarDisplay avatarId={selectedAvatar} avatarAura={item.id} size="sm" />
                                ) : activeCategory === 'FRAME' ? (
                                  <AvatarDisplay avatarId={selectedAvatar} avatarFrame={item.id} size="sm" />
                                ) : (
                                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-300">
                                    <Sparkles className="w-4 h-4" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="text-xs font-black text-white truncate">{item.name}</div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    {getRarityBadge(item.rarity)}
                                    {item.tag && (
                                      <span className="text-[9px] font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                                        {item.tag}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="shrink-0 flex items-center gap-1">
                                {isSelected ? (
                                  <Check className="w-4 h-4 text-purple-400" />
                                ) : isOwned ? (
                                  <span className="text-[10px] font-bold text-slate-400">Owned</span>
                                ) : (
                                  <div className="flex items-center gap-1 text-[10px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                                    <Lock className="w-3 h-3" />
                                    {item.cost > 0 ? `$${item.cost.toLocaleString()}` : 'Feat'}
                                  </div>
                                )}
                              </div>
                            </div>

                            <p className="text-[10px] text-slate-400 mt-2 line-clamp-1">
                              {item.description}
                            </p>
                            {item.perkText && (
                              <div className="text-[9px] font-bold text-cyan-300 mt-1 flex items-center gap-1">
                                <Zap className="w-2.5 h-2.5" />
                                {item.perkText}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Subtab: TITLES */}
                {activeCategory === 'TITLES' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">
                        Equippable Campus Titles
                      </h4>
                      <span className="text-[11px] text-slate-400 font-bold">
                        {availableTitles.filter(t => t.unlocked).length} Unlocked
                      </span>
                    </div>

                    {loadingTitles ? (
                      <div className="py-12 text-center text-slate-500 text-xs font-bold animate-pulse">
                        Loading campus titles...
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
                        {availableTitles.map((t) => {
                          const isSelected = selectedTitle === t.title;
                          return (
                            <div
                              key={t.id}
                              onClick={() => {
                                if (t.unlocked) setSelectedTitle(t.title);
                              }}
                              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-500/20 border-amber-400 shadow-md'
                                  : t.unlocked
                                  ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                                  : 'bg-slate-950/60 border-slate-800/60 opacity-60 cursor-not-allowed'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`text-xs font-black ${isSelected ? 'text-amber-300' : 'text-white'}`}>
                                  {t.title}
                                </span>
                                {isSelected ? (
                                  <Check className="w-4 h-4 text-amber-400" />
                                ) : !t.unlocked ? (
                                  <Lock className="w-3.5 h-3.5 text-slate-600" />
                                ) : null}
                              </div>
                              <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                                {t.requirement}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Subtab: MOTTO & BIO */}
                {activeCategory === 'BIO' && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">
                      Personal Campus Slogan & Battle Bio
                    </h4>
                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <p className="text-xs text-slate-400">
                        This statement appears on your student ID card, PvP arena victory cards, and campus threat scout reports.
                      </p>

                      <textarea
                        value={customBio}
                        onChange={(e) => setCustomBio(e.target.value.slice(0, 100))}
                        placeholder="Enter your campus empire statement..."
                        className="w-full bg-[#0B0D14] border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors resize-none h-24"
                      />

                      <div className="flex justify-end text-[10px] text-slate-500 font-mono">
                        {customBio.length} / 100 characters
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VIEW 2: QUAD BOUTIQUE (Fashion Store) */}
            {activeView === 'QUAD_BOUTIQUE' && (
              <div className="space-y-4">
                {/* Category and Rarity Filters */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    {[
                      { key: 'ALL', label: 'All Catalog' },
                      { key: 'PERSONA', label: 'Personas' },
                      { key: 'AURA', label: 'Auras' },
                      { key: 'OUTFIT', label: 'Outfits' },
                      { key: 'HEADWEAR', label: 'Headwear' },
                      { key: 'GEAR', label: 'Gear' },
                      { key: 'FRAME', label: 'Frames' },
                    ].map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setBoutiqueCategory(f.key as any)}
                        className={`text-xs font-black px-3 py-1.5 rounded-xl uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                          boutiqueCategory === f.key
                            ? 'bg-purple-600 text-white'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Rarity:</span>
                    <select
                      value={boutiqueRarity}
                      onChange={(e) => setBoutiqueRarity(e.target.value as any)}
                      className="bg-slate-950 border border-slate-700 text-xs font-bold text-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-purple-500"
                    >
                      <option value="ALL">All Rarities</option>
                      <option value="COMMON">Common</option>
                      <option value="RARE">Rare</option>
                      <option value="EPIC">Epic</option>
                      <option value="LEGENDARY">Legendary</option>
                    </select>
                  </div>
                </div>

                {/* Boutique Store Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[55vh] overflow-y-auto pr-1">
                  {COSMETICS_MASTER_CATALOG.filter(c => c.unlockCondition?.type === 'CASH' || c.cost > 0)
                    .filter(c => boutiqueCategory === 'ALL' || c.category === boutiqueCategory)
                    .filter(c => boutiqueRarity === 'ALL' || c.rarity === boutiqueRarity)
                    .map((item) => {
                      const isOwned = ownedSet.has(item.id);
                      const canAfford = player.cash >= item.cost;
                      const isPurchasing = purchasingId === item.id;

                      return (
                        <div
                          key={item.id}
                          className={`p-4 rounded-2xl border transition-all flex flex-col justify-between relative overflow-hidden ${
                            isOwned
                              ? 'bg-slate-900/60 border-slate-800 opacity-80'
                              : 'bg-gradient-to-br from-slate-900 via-[#151825] to-slate-950 border-slate-700/80 hover:border-purple-500/60 shadow-lg'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
                                  {item.category === 'AURA' ? <Sparkles className="w-5 h-5" /> :
                                   item.category === 'PERSONA' ? <User className="w-5 h-5" /> :
                                   item.category === 'OUTFIT' ? <Shirt className="w-5 h-5" /> :
                                   item.category === 'HEADWEAR' ? <Glasses className="w-5 h-5" /> :
                                   item.category === 'GEAR' ? <Zap className="w-5 h-5" /> :
                                   <Shield className="w-5 h-5" />}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-xs font-black text-white truncate">{item.name}</h4>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    {getRarityBadge(item.rarity)}
                                    <span className="text-[9px] font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                                      {item.category}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <div className="text-xs font-black text-emerald-400 flex items-center justify-end gap-0.5">
                                  <Coins className="w-3.5 h-3.5" />
                                  ${item.cost.toLocaleString()}
                                </div>
                              </div>
                            </div>

                            <p className="text-[11px] text-slate-300 mt-2.5">
                              {item.description}
                            </p>

                            {item.perkText && (
                              <div className="mt-2 text-[10px] font-bold text-cyan-300 bg-cyan-950/40 border border-cyan-800/40 px-2.5 py-1 rounded-lg flex items-center gap-1">
                                <Zap className="w-3 h-3 text-cyan-400" />
                                {item.perkText}
                              </div>
                            )}
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                            {/* Try on button */}
                            <button
                              onClick={() => {
                                if (item.category === 'PERSONA') setSelectedAvatar(item.id);
                                if (item.category === 'AURA') setSelectedAura(item.id);
                                if (item.category === 'FRAME') setSelectedFrame(item.id);
                                if (item.category === 'OUTFIT') setSelectedOutfit(item.id);
                                if (item.category === 'HEADWEAR') setSelectedHeadwear(item.id);
                                if (item.category === 'GEAR') setSelectedAccessory(item.id);
                                showToast(`Previewing ${item.name} on your mannequin!`, 'info');
                              }}
                              className="text-xs font-bold text-slate-400 hover:text-white px-2.5 py-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                              Try On
                            </button>

                            {/* Buy Button */}
                            {isOwned ? (
                              <div className="flex items-center gap-1 text-xs font-black text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded-xl">
                                <Check className="w-3.5 h-3.5" /> Owned
                              </div>
                            ) : (
                              <button
                                onClick={() => handleBuyCosmetic(item)}
                                disabled={!canAfford || isPurchasing}
                                className={`flex items-center gap-1.5 text-xs font-black px-4 py-1.5 rounded-xl shadow-md transition-all cursor-pointer ${
                                  canAfford
                                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
                                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                }`}
                              >
                                <StoreIcon className="w-3.5 h-3.5" />
                                {isPurchasing ? 'Buying...' : canAfford ? 'Buy & Equip' : 'Need Cash'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* VIEW 3: FEATS & MYTHIC UNLOCKS */}
            {activeView === 'FEATS' && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-rose-950/40 via-purple-950/30 to-slate-900 border border-rose-500/30 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-wider">
                        Prestige Feats & Free Cosmetic Milestones
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Achieve combat supremacy, massive net worth, and arena hospitalizations to claim exclusive mythic gear
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                  {COSMETICS_MASTER_CATALOG.filter(c => c.unlockCondition?.type && c.unlockCondition.type !== 'DEFAULT' && c.unlockCondition.type !== 'CASH').map((item) => {
                    const isOwned = ownedSet.has(item.id);
                    const { isEligible, progressText } = checkFeatEligibility(item);
                    const isClaiming = claimingId === item.id;

                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isOwned
                            ? 'bg-slate-900/60 border-slate-800 opacity-80'
                            : isEligible
                            ? 'bg-gradient-to-r from-amber-950/40 to-purple-950/40 border-amber-400/60 shadow-lg ring-1 ring-amber-400/40'
                            : 'bg-slate-900/80 border-slate-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-11 h-11 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
                              {item.category === 'PERSONA' ? <User className="w-6 h-6" /> :
                               item.category === 'AURA' ? <Sparkles className="w-6 h-6" /> :
                               item.category === 'OUTFIT' ? <Shirt className="w-6 h-6" /> :
                               <Glasses className="w-6 h-6" />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-black text-white">{item.name}</h4>
                                {getRarityBadge(item.rarity)}
                              </div>
                              <p className="text-[11px] text-slate-300 mt-1">{item.description}</p>
                              {item.perkText && (
                                <div className="text-[10px] font-bold text-cyan-300 mt-1 flex items-center gap-1">
                                  <Zap className="w-3 h-3" /> {item.perkText}
                                </div>
                              )}
                              <div className="mt-2 text-[10px] font-bold text-amber-400 flex items-center gap-1.5">
                                <Target className="w-3 h-3" /> Requirement: {item.unlockCondition?.requirementText}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 flex flex-col items-end gap-2">
                            <div className="text-[10px] font-mono font-bold text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                              {progressText}
                            </div>

                            {isOwned ? (
                              <span className="text-xs font-black text-emerald-400 flex items-center gap-1 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1 rounded-xl">
                                <Check className="w-3.5 h-3.5" /> Claimed
                              </span>
                            ) : isEligible ? (
                              <button
                                onClick={() => handleClaimFeat(item)}
                                disabled={isClaiming}
                                className="flex items-center gap-1.5 text-xs font-black text-black bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 px-3.5 py-1.5 rounded-xl shadow-lg shadow-amber-950/50 transition-all cursor-pointer animate-pulse"
                              >
                                <Award className="w-3.5 h-3.5" />
                                {isClaiming ? 'Claiming...' : 'Claim Feat Reward'}
                              </button>
                            ) : (
                              <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                <Lock className="w-3.5 h-3.5" /> Locked
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
