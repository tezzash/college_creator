import React from 'react';
import {
  Code,
  Dumbbell,
  GraduationCap,
  Flame,
  Zap,
  Music,
  BookOpen,
  Gamepad2,
  Sparkles,
  Shield,
  Laptop,
  Headphones,
  Glasses,
  Briefcase,
  Trophy,
  Crown,
  Eye,
  TrendingUp,
  Award,
  ShieldAlert,
} from 'lucide-react';
import { AvatarPoseStyle, AvatarViewMode } from '../types';
import {
  COSMETICS_MASTER_CATALOG,
  TIER_MULTIPLIER_MAP,
  getCosmeticItem,
  getAvatarTierMultiplier,
} from '../data/cosmeticsCatalog';

export interface AvatarDisplayProps {
  avatarId?: string;
  avatarAura?: string;
  avatarFrame?: string;
  avatarOutfit?: string;
  avatarHeadwear?: string;
  avatarAccessory?: string;
  avatarPose?: AvatarPoseStyle | string;
  viewMode?: AvatarViewMode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  showAccessoryBadge?: boolean;
  showHeadwearBadge?: boolean;
  showTierRibbon?: boolean;
  showStatBadge?: boolean;
  className?: string;
  interactive?: boolean;
  onClick?: () => void;
}

/**
 * PIMD-Standard High-Definition Layered SVG Character Doll Engine.
 * Supports:
 * - Headshot & Torso Portrait Modes (for dense lists & chats)
 * - Full-Body Runway Fashion Doll Mode (with stylized poses, designer pants & sneakers)
 * - PIMD Tier Status Ribbons & Live Stat Multipliers (+1% to +15%)
 */
export function AvatarDisplay({
  avatarId = 'avatar-coder',
  avatarAura = 'aura-none',
  avatarFrame = 'frame-neon',
  avatarOutfit = 'outfit-hoodie',
  avatarHeadwear = 'headwear-none',
  avatarAccessory = 'acc-laptop',
  avatarPose = 'relaxed',
  viewMode = 'portrait',
  size = 'md',
  showAccessoryBadge = false,
  showHeadwearBadge = false,
  showTierRibbon = false,
  showStatBadge = false,
  className = '',
  interactive = false,
  onClick,
}: AvatarDisplayProps) {
  // 1. DIMENSION SPECS & VIEWPORT
  const isFullBody = viewMode === 'fullbody' || viewMode === 'card';

  const sizeMap = {
    sm: { box: 'w-9 h-9', px: 36, rounded: 'rounded-xl', text: 'text-[9px]' },
    md: { box: 'w-12 h-12', px: 48, rounded: 'rounded-2xl', text: 'text-[10px]' },
    lg: { box: 'w-16 h-16', px: 64, rounded: 'rounded-2xl', text: 'text-xs' },
    xl: { box: 'w-28 h-28', px: 112, rounded: 'rounded-3xl', text: 'text-sm' },
    '2xl': { box: 'w-44 h-44 sm:w-52 sm:h-52', px: 208, rounded: 'rounded-3xl', text: 'text-base' },
    full: { box: 'w-full h-80 sm:h-96', px: 384, rounded: 'rounded-3xl', text: 'text-lg' },
  }[size];

  // 2. PERSONA ITEM & TIER METADATA
  const personaItem = getCosmeticItem(avatarId);
  const rarity = personaItem?.rarity || 'COMMON';
  const tierConfig = TIER_MULTIPLIER_MAP[rarity] || TIER_MULTIPLIER_MAP.COMMON;
  const statMultiplier = getAvatarTierMultiplier(avatarId);

  // 3. PERSONA AESTHETICS (Skin, Hair, Eyes, Face Tone, Silhouette)
  const getPersonaPalette = (id: string) => {
    switch (id) {
      case 'avatar-varsity':
        return {
          skin: '#f5c6a5',
          skinShadow: '#dfa680',
          hair: '#78350f',
          hairStyle: 'varsity',
          eyes: '#451a03',
          expression: 'smirk',
          silhouette: 'athletic',
          bgGradient: 'from-amber-900/70 via-slate-900 to-rose-950/80',
          accent: '#f59e0b',
        };
      case 'avatar-scholar':
        return {
          skin: '#fde68a',
          skinShadow: '#fcd34d',
          hair: '#1e293b',
          hairStyle: 'scholar',
          eyes: '#0284c7',
          expression: 'focused',
          silhouette: 'prodigy',
          bgGradient: 'from-blue-900/70 via-slate-900 to-indigo-950/80',
          accent: '#38bdf8',
        };
      case 'avatar-cyber':
        return {
          skin: '#e0e7ff',
          skinShadow: '#c7d2fe',
          hair: '#06b6d4',
          hairStyle: 'cyber',
          eyes: '#22d3ee',
          expression: 'cybernetic',
          silhouette: 'rebel',
          bgGradient: 'from-cyan-950/80 via-indigo-950/90 to-fuchsia-950/70',
          accent: '#22d3ee',
        };
      case 'avatar-dj':
        return {
          skin: '#d4a373',
          skinShadow: '#bc8a5f',
          hair: '#ec4899',
          hairStyle: 'wavy',
          eyes: '#db2777',
          expression: 'vibing',
          silhouette: 'chic',
          bgGradient: 'from-pink-950/80 via-purple-950/90 to-slate-950',
          accent: '#f472b6',
        };
      case 'avatar-freshman':
        return {
          skin: '#fed7aa',
          skinShadow: '#fdba74',
          hair: '#92400e',
          hairStyle: 'messy',
          eyes: '#15803d',
          expression: 'eager',
          silhouette: 'relaxed',
          bgGradient: 'from-emerald-950/70 via-slate-900 to-teal-950/80',
          accent: '#34d399',
        };
      case 'avatar-gamer':
        return {
          skin: '#fae8ff',
          skinShadow: '#f0abfc',
          hair: '#a855f7',
          hairStyle: 'anime',
          eyes: '#9333ea',
          expression: 'gaming',
          silhouette: 'prodigy',
          bgGradient: 'from-purple-950/80 via-slate-900 to-rose-950/70',
          accent: '#c084fc',
        };
      case 'avatar-wallstreet':
        return {
          skin: '#fef08a',
          skinShadow: '#facc15',
          hair: '#0f172a',
          hairStyle: 'slick',
          eyes: '#059669',
          expression: 'smug',
          silhouette: 'athletic',
          bgGradient: 'from-emerald-950/90 via-slate-900 to-slate-950',
          accent: '#10b981',
        };
      case 'avatar-goth':
        return {
          skin: '#f1f5f9',
          skinShadow: '#cbd5e1',
          hair: '#020617',
          hairStyle: 'goth',
          eyes: '#9333ea',
          expression: 'mystic',
          silhouette: 'chic',
          bgGradient: 'from-purple-950 via-slate-950 to-rose-950/90',
          accent: '#e879f9',
        };
      case 'avatar-sorority':
        return {
          skin: '#fed7aa',
          skinShadow: '#fdba74',
          hair: '#f59e0b',
          hairStyle: 'sorority',
          eyes: '#0ea5e9',
          expression: 'chic',
          silhouette: 'chic',
          bgGradient: 'from-fuchsia-950/80 via-purple-950 to-rose-950/90',
          accent: '#ec4899',
        };
      case 'avatar-streetwear':
        return {
          skin: '#d4a373',
          skinShadow: '#bc8a5f',
          hair: '#1e293b',
          hairStyle: 'fade',
          eyes: '#e11d48',
          expression: 'smirk',
          silhouette: 'rebel',
          bgGradient: 'from-orange-950/80 via-slate-900 to-red-950/90',
          accent: '#f97316',
        };
      case 'avatar-grandmaster':
        return {
          skin: '#f8fafc',
          skinShadow: '#cbd5e1',
          hair: '#475569',
          hairStyle: 'scholar',
          eyes: '#6366f1',
          expression: 'focused',
          silhouette: 'prodigy',
          bgGradient: 'from-indigo-950/90 via-slate-900 to-cyan-950/80',
          accent: '#818cf8',
        };
      case 'avatar-royal':
        return {
          skin: '#fef3c7',
          skinShadow: '#fde68a',
          hair: '#fbbf24',
          hairStyle: 'royal',
          eyes: '#d97706',
          expression: 'majestic',
          silhouette: 'royalty',
          bgGradient: 'from-amber-950/90 via-purple-950 to-slate-950',
          accent: '#fbbf24',
        };
      case 'avatar-shadow-shinobi':
        return {
          skin: '#e2e8f0',
          skinShadow: '#94a3b8',
          hair: '#0f172a',
          hairStyle: 'shinobi',
          eyes: '#6366f1',
          expression: 'stealth',
          silhouette: 'rebel',
          bgGradient: 'from-slate-950 via-indigo-950 to-black',
          accent: '#818cf8',
        };
      case 'avatar-titan-overlord':
        return {
          skin: '#fecdd3',
          skinShadow: '#fda4af',
          hair: '#e11d48',
          hairStyle: 'titan',
          eyes: '#ffe4e6',
          expression: 'overlord',
          silhouette: 'royalty',
          bgGradient: 'from-rose-950 via-red-950 to-amber-950',
          accent: '#f43f5e',
        };
      case 'avatar-coder':
      default:
        return {
          skin: '#fed7aa',
          skinShadow: '#fdba74',
          hair: '#334155',
          hairStyle: 'coder',
          eyes: '#06b6d4',
          expression: 'coder',
          silhouette: 'relaxed',
          bgGradient: 'from-indigo-950/80 via-slate-900 to-purple-950/80',
          accent: '#22d3ee',
        };
    }
  };

  // 4. FRAME BORDER STYLING
  const getFrameConfig = (frameId: string) => {
    switch (frameId) {
      case 'frame-gold':
        return {
          border: 'border-2 border-amber-400',
          glow: 'shadow-[0_0_24px_rgba(251,191,36,0.6)]',
          badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        };
      case 'frame-crimson':
        return {
          border: 'border-2 border-rose-500',
          glow: 'shadow-[0_0_24px_rgba(244,63,94,0.6)]',
          badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        };
      case 'frame-violet':
        return {
          border: 'border-2 border-purple-400',
          glow: 'shadow-[0_0_24px_rgba(168,85,247,0.6)]',
          badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        };
      case 'frame-emerald':
        return {
          border: 'border-2 border-emerald-400',
          glow: 'shadow-[0_0_24px_rgba(52,211,153,0.6)]',
          badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        };
      case 'frame-slate':
        return {
          border: 'border-2 border-slate-600',
          glow: 'shadow-[0_0_12px_rgba(148,163,184,0.2)]',
          badgeBg: 'bg-slate-800 text-slate-300 border-slate-700',
        };
      case 'frame-holographic':
        return {
          border: 'border-2 border-transparent bg-gradient-to-r from-pink-500 via-cyan-400 to-amber-300 bg-origin-border',
          glow: 'shadow-[0_0_30px_rgba(217,70,239,0.7)] ring-2 ring-cyan-300/60',
          badgeBg: 'bg-fuchsia-500/20 text-cyan-300 border-cyan-400/40',
        };
      case 'frame-neon':
      default:
        return {
          border: 'border-2 border-cyan-400',
          glow: 'shadow-[0_0_20px_rgba(34,211,238,0.5)]',
          badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        };
    }
  };

  // 5. AURA AMBIENT VISUALS
  const getAuraConfig = (auraId: string) => {
    switch (auraId) {
      case 'aura-neon-pulse':
        return {
          glowRing: 'ring-4 ring-cyan-400/50 shadow-[0_0_30px_rgba(34,211,238,0.6)] animate-pulse',
          haloBg: 'bg-cyan-500/25 blur-lg',
          renderSvg: () => (
            <g className="animate-spin" style={{ transformOrigin: '100px 100px', animationDuration: '12s' }}>
              <circle cx="100" cy="100" r="88" fill="none" stroke="#22d3ee" strokeWidth="2" strokeDasharray="10 15" opacity="0.6" />
              <circle cx="100" cy="100" r="94" fill="none" stroke="#06b6d4" strokeWidth="1" strokeDasharray="6 20" opacity="0.4" />
            </g>
          ),
        };
      case 'aura-crimson-flame':
        return {
          glowRing: 'ring-4 ring-rose-500/60 shadow-[0_0_35px_rgba(244,63,94,0.7)] animate-pulse',
          haloBg: 'bg-rose-600/35 blur-xl',
          renderSvg: () => (
            <g className="animate-pulse">
              <path d="M40,160 Q70,40 100,20 Q130,40 160,160 Z" fill="url(#crimsonFlameGrad)" opacity="0.45" />
              <path d="M60,170 Q90,70 100,50 Q110,70 140,170 Z" fill="url(#crimsonFlameGradInner)" opacity="0.6" />
            </g>
          ),
        };
      case 'aura-matrix-glitch':
        return {
          glowRing: 'ring-4 ring-emerald-400/60 shadow-[0_0_30px_rgba(52,211,153,0.6)]',
          haloBg: 'bg-emerald-500/25 blur-lg',
          renderSvg: () => (
            <g opacity="0.55">
              <line x1="20" y1="40" x2="180" y2="40" stroke="#34d399" strokeWidth="1" strokeDasharray="4 6" />
              <line x1="10" y1="90" x2="190" y2="90" stroke="#10b981" strokeWidth="1.5" strokeDasharray="8 4" />
              <line x1="30" y1="140" x2="170" y2="140" stroke="#34d399" strokeWidth="1" strokeDasharray="5 8" />
              <text x="30" y="35" fill="#34d399" fontSize="10" fontFamily="monospace">01101001</text>
              <text x="130" y="165" fill="#10b981" fontSize="10" fontFamily="monospace">101101</text>
            </g>
          ),
        };
      case 'aura-gold-sparkle':
        return {
          glowRing: 'ring-4 ring-amber-400/70 shadow-[0_0_35px_rgba(251,191,36,0.75)] animate-pulse',
          haloBg: 'bg-amber-400/35 blur-xl',
          renderSvg: () => (
            <g className="animate-pulse">
              <polygon points="100,10 105,30 125,35 105,40 100,60 95,40 75,35 95,30" fill="#fbbf24" opacity="0.8" />
              <polygon points="35,70 38,82 50,85 38,88 35,100 32,88 20,85 32,82" fill="#f59e0b" opacity="0.7" />
              <polygon points="165,75 168,87 180,90 168,93 165,105 162,93 150,90 162,87" fill="#fbbf24" opacity="0.75" />
            </g>
          ),
        };
      case 'aura-emerald-cash':
        return {
          glowRing: 'ring-4 ring-emerald-400/70 shadow-[0_0_40px_rgba(16,185,129,0.75)]',
          haloBg: 'bg-emerald-500/35 blur-xl',
          renderSvg: () => (
            <g opacity="0.65">
              <text x="25" y="45" fill="#34d399" fontSize="18" fontWeight="bold" fontFamily="sans-serif">$</text>
              <text x="160" y="55" fill="#10b981" fontSize="22" fontWeight="bold" fontFamily="sans-serif">$</text>
              <text x="150" y="155" fill="#34d399" fontSize="16" fontWeight="bold" fontFamily="sans-serif">$</text>
              <text x="20" y="145" fill="#6ee7b7" fontSize="15" fontWeight="bold" fontFamily="sans-serif">$</text>
            </g>
          ),
        };
      case 'aura-nebula-violet':
        return {
          glowRing: 'ring-4 ring-purple-500/80 shadow-[0_0_45px_rgba(168,85,247,0.8)] animate-pulse',
          haloBg: 'bg-purple-600/40 blur-2xl',
          renderSvg: () => (
            <g className="animate-spin" style={{ transformOrigin: '100px 100px', animationDuration: '18s' }}>
              <ellipse cx="100" cy="100" rx="90" ry="40" fill="none" stroke="#c084fc" strokeWidth="2" strokeDasharray="15 20" transform="rotate(-30 100 100)" opacity="0.6" />
              <ellipse cx="100" cy="100" rx="90" ry="40" fill="none" stroke="#f472b6" strokeWidth="1.5" strokeDasharray="8 12" transform="rotate(45 100 100)" opacity="0.5" />
            </g>
          ),
        };
      case 'aura-none':
      default:
        return {
          glowRing: '',
          haloBg: '',
          renderSvg: () => null,
        };
    }
  };

  const persona = getPersonaPalette(avatarId);
  const frame = getFrameConfig(avatarFrame);
  const aura = getAuraConfig(avatarAura);

  // SVG viewBox:
  // Portrait: 0 0 200 200 (Focuses on Torso, Head, Face, Outfit top & Handheld)
  // Full-body: 0 0 200 320 (Full-length standing fashion model)
  const viewBox = isFullBody ? '0 0 200 320' : '0 0 200 200';

  return (
    <div
      className={`relative inline-flex flex-col items-center justify-center shrink-0 ${interactive ? 'cursor-pointer hover:scale-105 transition-transform' : ''} ${className}`}
      onClick={onClick}
    >
      {/* Ambient Halo Glow */}
      {aura.haloBg && (
        <div className={`absolute -inset-2 rounded-full ${aura.haloBg} pointer-events-none -z-10`} />
      )}

      {/* Main Avatar Card Frame */}
      <div
        className={`${isFullBody ? 'w-full aspect-[2/3] max-w-[280px]' : sizeMap.box} ${sizeMap.rounded} ${frame.border} ${frame.glow} ${aura.glowRing} bg-gradient-to-br ${persona.bgGradient} relative overflow-hidden flex flex-col items-center justify-center shadow-2xl select-none`}
      >
        {/* PIMD Tier Top Ribbon Header (for Card/FullBody mode or when requested) */}
        {(showTierRibbon || isFullBody) && (
          <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-2.5 py-1 bg-black/60 backdrop-blur-md border-b border-white/10">
            <span className="text-[10px] font-black tracking-wider uppercase flex items-center gap-1" style={{ color: tierConfig.color }}>
              <Crown className="w-3 h-3" />
              {tierConfig.label}
            </span>
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${tierConfig.badgeClass}`}>
              {tierConfig.percentText} STATS
            </span>
          </div>
        )}

        {/* Layered SVG Vector Character Doll */}
        <svg
          viewBox={viewBox}
          className="w-full h-full object-contain filter drop-shadow-md"
        >
          <defs>
            <linearGradient id="crimsonFlameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#e11d48" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#facc15" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="crimsonFlameGradInner" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#fef08a" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="goldSilkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <linearGradient id="cyberTrenchGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>
            <linearGradient id="denimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
          </defs>

          {/* 1. AURA BACKING LAYER */}
          {aura.renderSvg()}

          {/* ======================================================== */}
          {/* 2. FULL-BODY LEGS, PANTS & FOOTWEAR (Rendered when fullbody) */}
          {/* ======================================================== */}
          {isFullBody && (
            <g id="fullbody-lower-doll">
              {/* Shadow on Floor */}
              <ellipse cx="100" cy="305" rx="55" ry="8" fill="#000000" opacity="0.5" />

              {/* Legs / Trousers Layer */}
              {avatarOutfit === 'outfit-varsity' && (
                <g id="legs-varsity-joggers">
                  {/* Navy Athletic Joggers with Gold Side Stripe */}
                  <path d="M68,185 L62,280 L86,280 L96,190 Z" fill="#1e3a8a" />
                  <path d="M132,185 L138,280 L114,280 L104,190 Z" fill="#1e3a8a" />
                  {/* Gold Stripes */}
                  <line x1="64" y1="190" x2="60" y2="278" stroke="#f59e0b" strokeWidth="2.5" />
                  <line x1="136" y1="190" x2="140" y2="278" stroke="#f59e0b" strokeWidth="2.5" />
                </g>
              )}

              {avatarOutfit === 'outfit-suit' && (
                <g id="legs-pinstripe-slacks">
                  {/* Charcoal Tailored Pinstripe Slacks */}
                  <path d="M66,185 L60,282 L88,282 L97,190 Z" fill="#0f172a" />
                  <path d="M134,185 L140,282 L112,282 L103,190 Z" fill="#0f172a" />
                  <line x1="74" y1="188" x2="74" y2="280" stroke="#334155" strokeWidth="1" />
                  <line x1="126" y1="188" x2="126" y2="280" stroke="#334155" strokeWidth="1" />
                </g>
              )}

              {avatarOutfit === 'outfit-cyber-trench' && (
                <g id="legs-cyber-cargo">
                  {/* High-Tech Techwear Cargo with Neon Straps */}
                  <path d="M65,185 L58,280 L88,280 L96,190 Z" fill="#0f172a" />
                  <path d="M135,185 L142,280 L112,280 L104,190 Z" fill="#0f172a" />
                  {/* Cyber Knee Holster & Straps */}
                  <rect x="56" y="225" width="28" height="18" rx="2" fill="#1e1b4b" stroke="#06b6d4" strokeWidth="1" />
                  <line x1="56" y1="234" x2="84" y2="234" stroke="#22d3ee" strokeWidth="1.5" />
                  <line x1="116" y1="225" x2="142" y2="235" stroke="#a855f7" strokeWidth="2" strokeDasharray="3 3" />
                </g>
              )}

              {avatarOutfit === 'outfit-leather-moto' && (
                <g id="legs-ripped-leather-denim">
                  {/* Jet Black Distressed Denim with Rips */}
                  <path d="M66,185 L60,280 L86,280 L96,190 Z" fill="#18181b" />
                  <path d="M134,185 L140,280 L114,280 L104,190 Z" fill="#18181b" />
                  {/* Silver Knee Chains & Rips */}
                  <line x1="64" y1="230" x2="80" y2="232" stroke="#e4e4e7" strokeWidth="1.5" strokeDasharray="3 2" />
                  <line x1="120" y1="235" x2="136" y2="237" stroke="#e4e4e7" strokeWidth="1.5" strokeDasharray="3 2" />
                </g>
              )}

              {avatarOutfit === 'outfit-royal-kimono' && (
                <g id="legs-imperial-flowing-robe">
                  {/* Royal Flowing Lower Skirt/Hakama */}
                  <polygon points="62,185 45,290 155,290 138,185" fill="#4c1d95" />
                  <polygon points="75,185 65,290 85,290 90,185" fill="url(#goldSilkGrad)" />
                  <polygon points="125,185 135,290 115,290 110,185" fill="url(#goldSilkGrad)" />
                </g>
              )}

              {avatarOutfit !== 'outfit-varsity' &&
                avatarOutfit !== 'outfit-suit' &&
                avatarOutfit !== 'outfit-cyber-trench' &&
                avatarOutfit !== 'outfit-leather-moto' &&
                avatarOutfit !== 'outfit-royal-kimono' && (
                  <g id="legs-classic-street-jeans">
                    {/* Dark Washed Streetwear Jeans */}
                    <path d="M66,185 L60,280 L88,280 L97,190 Z" fill="url(#denimGrad)" />
                    <path d="M134,185 L140,280 L112,280 L103,190 Z" fill="url(#denimGrad)" />
                  </g>
                )}

              {/* Shoes / Footwear */}
              <g id="footwear-sneakers">
                {/* Left Shoe */}
                <path d="M55,280 L88,280 L90,296 L45,296 Z" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
                <path d="M45,292 L90,292 L90,298 L45,298 Z" fill="#0284c7" />
                {/* Right Shoe */}
                <path d="M112,280 L145,280 L155,296 L110,296 Z" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
                <path d="M110,292 L155,292 L155,298 L110,298 Z" fill="#0284c7" />
              </g>
            </g>
          )}

          {/* 3. BODY BASE, TORSO & NECK */}
          <rect x="91" y="96" width="18" height="24" rx="4" fill={persona.skinShadow} />
          <path d="M55,130 Q100,118 145,130 L155,200 L45,200 Z" fill="#1e293b" />

          {/* 4. OUTFIT / CLOTHING LAYER */}
          {avatarOutfit === 'outfit-varsity' && (
            <g id="outfit-varsity-jacket">
              <path d="M52,130 Q100,118 148,130 L158,200 L42,200 Z" fill="#1e3a8a" />
              <path d="M52,130 L40,200 L62,200 L70,140 Z" fill="#d97706" />
              <path d="M148,130 L160,200 L138,200 L130,140 Z" fill="#d97706" />
              <path d="M78,124 Q100,140 122,124 Q100,132 78,124 Z" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
              <rect x="74" y="146" width="14" height="18" rx="2" fill="#fbbf24" stroke="#ffffff" strokeWidth="1" />
              <text x="77" y="160" fill="#1e3a8a" fontSize="12" fontWeight="900" fontFamily="sans-serif">G</text>
              <circle cx="100" cy="148" r="2" fill="#facc15" />
              <circle cx="100" cy="164" r="2" fill="#facc15" />
              <circle cx="100" cy="180" r="2" fill="#facc15" />
            </g>
          )}

          {avatarOutfit === 'outfit-cyber-trench' && (
            <g id="outfit-cyber-trench">
              <path d="M50,126 Q100,116 150,126 L164,200 L36,200 Z" fill="url(#cyberTrenchGrad)" />
              <polygon points="70,124 64,106 85,116 100,132" fill="#312e81" stroke="#06b6d4" strokeWidth="1" />
              <polygon points="130,124 136,106 115,116 100,132" fill="#312e81" stroke="#06b6d4" strokeWidth="1" />
              <path d="M65,134 L52,200" stroke="#22d3ee" strokeWidth="2.5" strokeDasharray="10 4" />
              <path d="M135,134 L148,200" stroke="#22d3ee" strokeWidth="2.5" strokeDasharray="10 4" />
              <line x1="100" y1="135" x2="100" y2="200" stroke="#a855f7" strokeWidth="2" />
              <circle cx="100" cy="155" r="4" fill="#22d3ee" className="animate-pulse" />
            </g>
          )}

          {avatarOutfit === 'outfit-suit' && (
            <g id="outfit-pinstripe-suit">
              <path d="M50,128 Q100,118 150,128 L160,200 L40,200 Z" fill="#0f172a" />
              <line x1="65" y1="130" x2="60" y2="200" stroke="#334155" strokeWidth="1" />
              <line x1="80" y1="130" x2="78" y2="200" stroke="#334155" strokeWidth="1" />
              <line x1="120" y1="130" x2="122" y2="200" stroke="#334155" strokeWidth="1" />
              <line x1="135" y1="130" x2="140" y2="200" stroke="#334155" strokeWidth="1" />
              <polygon points="85,124 115,124 100,165" fill="#f8fafc" />
              <polygon points="97,130 103,130 104,180 100,188 96,180" fill="#059669" />
              <line x1="96" y1="150" x2="104" y2="150" stroke="#fbbf24" strokeWidth="1.5" />
              <polygon points="80,126 100,165 72,168" fill="#1e293b" />
              <polygon points="120,126 100,165 128,168" fill="#1e293b" />
            </g>
          )}

          {avatarOutfit === 'outfit-lab' && (
            <g id="outfit-quantum-lab-coat">
              <path d="M50,128 Q100,118 150,128 L162,200 L38,200 Z" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
              <polygon points="84,122 116,122 100,146" fill="#0284c7" />
              <rect x="68" y="152" width="16" height="18" rx="2" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
              <line x1="72" y1="146" x2="72" y2="156" stroke="#06b6d4" strokeWidth="2" />
              <line x1="76" y1="144" x2="76" y2="156" stroke="#ec4899" strokeWidth="2" />
              <line x1="80" y1="147" x2="80" y2="156" stroke="#10b981" strokeWidth="2" />
              <circle cx="106" cy="154" r="2.5" fill="#64748b" />
              <circle cx="106" cy="172" r="2.5" fill="#64748b" />
            </g>
          )}

          {avatarOutfit === 'outfit-leather-moto' && (
            <g id="outfit-spiked-moto-jacket">
              <path d="M50,128 Q100,118 150,128 L160,200 L40,200 Z" fill="#18181b" />
              <line x1="88" y1="126" x2="114" y2="200" stroke="#e4e4e7" strokeWidth="2" strokeDasharray="3 2" />
              <polygon points="76,126 100,158 68,160" fill="#27272a" stroke="#3f3f46" strokeWidth="1" />
              <polygon points="124,126 96,158 132,160" fill="#27272a" stroke="#3f3f46" strokeWidth="1" />
              <polygon points="56,128 50,118 62,126" fill="#e4e4e7" />
              <polygon points="66,126 62,116 72,124" fill="#e4e4e7" />
              <polygon points="144,128 150,118 138,126" fill="#e4e4e7" />
              <polygon points="134,126 138,116 128,124" fill="#e4e4e7" />
            </g>
          )}

          {avatarOutfit === 'outfit-royal-kimono' && (
            <g id="outfit-royal-kimono">
              <path d="M48,126 Q100,116 152,126 L164,200 L36,200 Z" fill="#581c87" />
              <polygon points="80,124 100,165 110,165 85,124" fill="url(#goldSilkGrad)" />
              <polygon points="120,124 100,165 90,165 115,124" fill="url(#goldSilkGrad)" />
              <rect x="70" y="166" width="60" height="18" fill="#d97706" stroke="#fbbf24" strokeWidth="1" />
              <circle cx="100" cy="175" r="4" fill="#fef08a" />
            </g>
          )}

          {avatarOutfit === 'outfit-shadow-suit' && (
            <g id="outfit-shinobi-stealth">
              <path d="M50,128 Q100,118 150,128 L160,200 L40,200 Z" fill="#09090b" />
              <polygon points="68,136 94,146 88,186 64,178" fill="#1e1b4b" stroke="#4338ca" strokeWidth="1" />
              <polygon points="132,136 106,146 112,186 136,178" fill="#1e1b4b" stroke="#4338ca" strokeWidth="1" />
              <line x1="62" y1="130" x2="138" y2="190" stroke="#6366f1" strokeWidth="2" />
              <line x1="138" y1="130" x2="62" y2="190" stroke="#6366f1" strokeWidth="2" />
            </g>
          )}

          {(avatarOutfit === 'outfit-hoodie' || !avatarOutfit) && (
            <g id="outfit-tech-hoodie">
              <path d="M50,130 Q100,118 150,130 L160,200 L40,200 Z" fill="#334155" />
              <path d="M74,122 Q100,146 126,122 Q100,134 74,122 Z" fill="#1e293b" />
              <path d="M72,166 L128,166 L124,196 L76,196 Z" fill="#1e293b" stroke="#475569" strokeWidth="1" />
              <line x1="88" y1="132" x2="88" y2="156" stroke="#94a3b8" strokeWidth="1.5" />
              <circle cx="88" cy="156" r="1.5" fill="#f8fafc" />
              <line x1="112" y1="132" x2="112" y2="156" stroke="#94a3b8" strokeWidth="1.5" />
              <circle cx="112" cy="156" r="1.5" fill="#f8fafc" />
            </g>
          )}

          {/* 5. HEAD, FACE & EXPRESSION */}
          {/* Ears */}
          <circle cx="68" cy="74" r="8" fill={persona.skinShadow} />
          <circle cx="132" cy="74" r="8" fill={persona.skinShadow} />
          <circle cx="68" cy="74" r="5" fill={persona.skin} />
          <circle cx="132" cy="74" r="5" fill={persona.skin} />

          {/* Face Oval */}
          <path d="M70,60 C70,35 130,35 130,60 C130,92 118,104 100,104 C82,104 70,92 70,60 Z" fill={persona.skin} />

          {/* Expressions */}
          {persona.expression === 'smirk' && (
            <g>
              <line x1="78" y1="62" x2="92" y2="60" stroke="#451a03" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="108" y1="58" x2="122" y2="64" stroke="#451a03" strokeWidth="2.5" strokeLinecap="round" />
              <ellipse cx="85" cy="68" rx="4" ry="4.5" fill={persona.eyes} />
              <ellipse cx="115" cy="68" rx="4" ry="4.5" fill={persona.eyes} />
              <circle cx="86" cy="67" r="1.5" fill="#ffffff" />
              <circle cx="116" cy="67" r="1.5" fill="#ffffff" />
              <path d="M92,86 Q106,94 112,86" fill="none" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
            </g>
          )}

          {persona.expression === 'cybernetic' && (
            <g>
              <line x1="78" y1="60" x2="92" y2="60" stroke="#06b6d4" strokeWidth="2" />
              <line x1="108" y1="60" x2="122" y2="60" stroke="#06b6d4" strokeWidth="2" />
              <rect x="80" y="65" width="10" height="5" rx="1" fill="#06b6d4" />
              <rect x="110" y="65" width="10" height="5" rx="1" fill="#22d3ee" className="animate-pulse" />
              <path d="M74,74 L84,78 L84,84" fill="none" stroke="#22d3ee" strokeWidth="1.5" />
              <line x1="94" y1="88" x2="106" y2="88" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
            </g>
          )}

          {persona.expression === 'chic' && (
            <g>
              <line x1="78" y1="60" x2="92" y2="58" stroke="#9d174d" strokeWidth="2" />
              <line x1="108" y1="58" x2="122" y2="60" stroke="#9d174d" strokeWidth="2" />
              <ellipse cx="85" cy="68" rx="4.5" ry="5" fill="#0284c7" />
              <ellipse cx="115" cy="68" rx="4.5" ry="5" fill="#0284c7" />
              <circle cx="86" cy="66" r="1.8" fill="#ffffff" />
              <circle cx="116" cy="66" r="1.8" fill="#ffffff" />
              <path d="M82,63 L92,62" stroke="#be185d" strokeWidth="1.5" />
              <path d="M108,62 L118,63" stroke="#be185d" strokeWidth="1.5" />
              <path d="M94,88 Q100,92 106,88" fill="#f43f5e" stroke="#e11d48" strokeWidth="1" />
            </g>
          )}

          {persona.expression === 'majestic' && (
            <g>
              <line x1="78" y1="58" x2="92" y2="62" stroke="#78350f" strokeWidth="2" />
              <line x1="108" y1="62" x2="122" y2="58" stroke="#78350f" strokeWidth="2" />
              <ellipse cx="85" cy="68" rx="4.5" ry="5" fill="#d97706" />
              <ellipse cx="115" cy="68" rx="4.5" ry="5" fill="#d97706" />
              <circle cx="86" cy="66" r="1.8" fill="#fef08a" />
              <circle cx="116" cy="66" r="1.8" fill="#fef08a" />
              <path d="M94,87 Q100,90 106,87" fill="none" stroke="#92400e" strokeWidth="2" strokeLinecap="round" />
            </g>
          )}

          {persona.expression !== 'smirk' &&
            persona.expression !== 'cybernetic' &&
            persona.expression !== 'chic' &&
            persona.expression !== 'majestic' && (
              <g>
                <line x1="78" y1="60" x2="92" y2="62" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
                <line x1="108" y1="62" x2="122" y2="60" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" />
                <ellipse cx="85" cy="68" rx="4.5" ry="5" fill={persona.eyes} />
                <ellipse cx="115" cy="68" rx="4.5" ry="5" fill={persona.eyes} />
                <circle cx="86.5" cy="66.5" r="1.5" fill="#ffffff" />
                <circle cx="116.5" cy="66.5" r="1.5" fill="#ffffff" />
                <path d="M98,74 L100,79 L97,80" fill="none" stroke={persona.skinShadow} strokeWidth="1.5" strokeLinecap="round" />
                <path d="M93,88 Q100,92 107,88" fill="none" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
              </g>
            )}

          {/* 6. HAIRSTYLE */}
          {avatarHeadwear !== 'headwear-hacker-hood' && (
            <g id="persona-hair">
              {persona.hairStyle === 'cyber' && (
                <g fill={persona.hair}>
                  <polygon points="68,54 54,34 76,42" />
                  <polygon points="76,42 70,18 90,32" />
                  <polygon points="90,32 100,12 110,32" />
                  <polygon points="110,32 130,18 124,42" />
                  <polygon points="124,42 146,34 132,54" />
                  <path d="M68,50 Q100,28 132,50 Q100,38 68,50 Z" />
                </g>
              )}

              {persona.hairStyle === 'sorority' && (
                <g fill={persona.hair}>
                  {/* Chic Layered Blowout */}
                  <path d="M60,56 C60,20 140,20 140,56 C148,82 146,120 138,136 C130,110 132,70 126,52 C110,38 90,38 74,52 C68,70 70,110 62,136 C54,120 52,82 60,56 Z" />
                </g>
              )}

              {persona.hairStyle === 'varsity' && (
                <g fill={persona.hair}>
                  <path d="M66,54 C66,32 134,32 134,54 C134,44 126,38 100,38 C74,38 66,44 66,54 Z" />
                  <path d="M66,54 L68,64 L74,54 Z" />
                  <path d="M134,54 L132,64 L126,54 Z" />
                </g>
              )}

              {persona.hairStyle === 'royal' && (
                <g fill={persona.hair}>
                  <path d="M64,56 C64,26 136,26 136,56 C144,78 140,105 136,118 C132,102 132,80 132,56 C124,40 76,40 68,56 C68,80 68,102 64,118 C60,105 56,78 64,56 Z" />
                </g>
              )}

              {persona.hairStyle === 'slick' && (
                <g fill={persona.hair}>
                  <path d="M68,54 C68,30 132,30 132,54 C130,40 120,34 100,34 C80,34 70,40 68,54 Z" />
                  <path d="M70,45 Q100,38 130,45" stroke="#475569" strokeWidth="1" fill="none" />
                </g>
              )}

              {persona.hairStyle !== 'cyber' &&
                persona.hairStyle !== 'sorority' &&
                persona.hairStyle !== 'varsity' &&
                persona.hairStyle !== 'royal' &&
                persona.hairStyle !== 'slick' && (
                  <g fill={persona.hair}>
                    <path d="M66,54 C66,30 134,30 134,54 C130,42 120,36 100,36 C80,36 70,42 66,54 Z" />
                    <polygon points="72,50 82,60 88,48" />
                    <polygon points="86,48 96,62 104,48" />
                    <polygon points="102,48 112,60 122,48" />
                  </g>
                )}
            </g>
          )}

          {/* 7. HEADWEAR & EYEWEAR */}
          {avatarHeadwear === 'headwear-vr-visor' && (
            <g id="headwear-vr-visor" className="animate-pulse">
              <path d="M66,60 L134,60 L130,76 L70,76 Z" fill="#0f172a" stroke="#06b6d4" strokeWidth="2" />
              <rect x="72" y="63" width="56" height="10" rx="2" fill="#22d3ee" opacity="0.9" />
              <line x1="74" y1="68" x2="126" y2="68" stroke="#ffffff" strokeWidth="1.5" />
              <line x1="66" y1="66" x2="58" y2="68" stroke="#0891b2" strokeWidth="3" />
              <line x1="134" y1="66" x2="142" y2="68" stroke="#0891b2" strokeWidth="3" />
            </g>
          )}

          {avatarHeadwear === 'headwear-aviator-gold' && (
            <g id="headwear-aviator-gold">
              <line x1="72" y1="64" x2="128" y2="64" stroke="#f59e0b" strokeWidth="1.5" />
              <path d="M74,65 Q87,63 94,65 Q95,78 84,80 Q73,78 74,65 Z" fill="#451a03" stroke="#fbbf24" strokeWidth="1.5" opacity="0.9" />
              <path d="M106,65 Q113,63 126,65 Q127,78 116,80 Q105,78 106,65 Z" fill="#451a03" stroke="#fbbf24" strokeWidth="1.5" opacity="0.9" />
              <line x1="78" y1="68" x2="88" y2="76" stroke="#fde047" strokeWidth="1.5" />
              <line x1="110" y1="68" x2="120" y2="76" stroke="#fde047" strokeWidth="1.5" />
            </g>
          )}

          {avatarHeadwear === 'headwear-diamond-crown' && (
            <g id="headwear-diamond-crown">
              <polygon points="70,44 76,22 88,34 100,16 112,34 124,22 130,44" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1.5" />
              <circle cx="76" cy="24" r="2.5" fill="#38bdf8" stroke="#ffffff" strokeWidth="0.8" />
              <circle cx="100" cy="18" r="3.5" fill="#e11d48" stroke="#ffffff" strokeWidth="1" />
              <circle cx="124" cy="24" r="2.5" fill="#38bdf8" stroke="#ffffff" strokeWidth="0.8" />
              <rect x="70" y="40" width="60" height="6" rx="2" fill="#d97706" />
            </g>
          )}

          {avatarHeadwear === 'headwear-gold-laurels' && (
            <g id="headwear-gold-laurels">
              <path d="M68,52 Q76,38 92,38" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M132,52 Q124,38 108,38" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
              <ellipse cx="74" cy="46" rx="4" ry="2" fill="#fbbf24" transform="rotate(-30 74 46)" />
              <ellipse cx="84" cy="40" rx="4" ry="2" fill="#fde047" transform="rotate(-15 84 40)" />
              <ellipse cx="126" cy="46" rx="4" ry="2" fill="#fbbf24" transform="rotate(30 126 46)" />
              <ellipse cx="116" cy="40" rx="4" ry="2" fill="#fde047" transform="rotate(15 116 40)" />
            </g>
          )}

          {avatarHeadwear === 'headwear-snapback' && (
            <g id="headwear-snapback">
              <path d="M66,48 C66,28 134,28 134,48 L130,52 L70,52 Z" fill="#e11d48" stroke="#9f1239" strokeWidth="1" />
              <polygon points="56,48 144,48 138,42 62,42" fill="#be123c" />
              <circle cx="100" cy="38" r="4" fill="#ffffff" />
              <text x="98" y="41" fill="#be123c" fontSize="6" fontWeight="bold">G</text>
            </g>
          )}

          {avatarHeadwear === 'headwear-hacker-hood' && (
            <g id="headwear-hacker-hood">
              <path d="M60,65 C60,20 140,20 140,65 C140,110 134,130 134,130 Q100,145 66,130 C66,130 60,110 60,65 Z" fill="#09090b" stroke="#312e81" strokeWidth="1.5" />
              <path d="M72,56 C72,40 128,40 128,56 C128,88 116,98 100,98 C84,98 72,88 72,56 Z" fill="#020617" />
              <ellipse cx="86" cy="68" rx="4" ry="2" fill="#c084fc" className="animate-pulse" />
              <ellipse cx="114" cy="68" rx="4" ry="2" fill="#c084fc" className="animate-pulse" />
            </g>
          )}

          {/* 8. HANDHELD RELIC / GEAR LAYER */}
          {avatarAccessory === 'acc-laptop' && (
            <g id="gear-laptop" transform="translate(112, 140)">
              <polygon points="0,20 42,12 48,46 6,54" fill="#0f172a" stroke="#06b6d4" strokeWidth="1.5" />
              <polygon points="4,22 40,15 44,42 8,49" fill="#164e63" />
              <line x1="8" y1="26" x2="36" y2="20" stroke="#22d3ee" strokeWidth="1.5" />
              <line x1="10" y1="32" x2="32" y2="28" stroke="#34d399" strokeWidth="1.5" />
              <circle cx="24" cy="32" r="3" fill="#22d3ee" />
            </g>
          )}

          {avatarAccessory === 'acc-laser-blade' && (
            <g id="gear-laser-blade" transform="translate(132, 85) rotate(-25)">
              <line x1="0" y1="80" x2="0" y2="0" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
              <line x1="0" y1="80" x2="0" y2="0" stroke="#06b6d4" strokeWidth="8" opacity="0.7" strokeLinecap="round" />
              <line x1="0" y1="80" x2="0" y2="0" stroke="#ec4899" strokeWidth="12" opacity="0.3" strokeLinecap="round" />
              <rect x="-4" y="75" width="8" height="25" rx="2" fill="#0f172a" stroke="#475569" strokeWidth="1" />
            </g>
          )}

          {avatarAccessory === 'acc-trophy-cup' && (
            <g id="gear-trophy" transform="translate(125, 136)">
              <path d="M10,10 L30,10 L28,28 Q20,36 12,28 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5" />
              <path d="M10,14 C2,14 2,24 11,26" fill="none" stroke="#f59e0b" strokeWidth="2" />
              <path d="M30,14 C38,14 38,24 29,26" fill="none" stroke="#f59e0b" strokeWidth="2" />
              <rect x="18" y="32" width="4" height="10" fill="#d97706" />
              <rect x="12" y="42" width="16" height="8" rx="1" fill="#1e293b" stroke="#fbbf24" strokeWidth="1" />
            </g>
          )}

          {avatarAccessory === 'acc-briefcase' && (
            <g id="gear-briefcase" transform="translate(120, 142)">
              <rect x="0" y="8" width="44" height="32" rx="3" fill="#1e293b" stroke="#059669" strokeWidth="1.5" />
              <line x1="0" y1="20" x2="44" y2="20" stroke="#334155" strokeWidth="1" />
              <rect x="8" y="17" width="5" height="6" fill="#fbbf24" />
              <rect x="31" y="17" width="5" height="6" fill="#fbbf24" />
              <path d="M16,8 L16,2 L28,2 L28,8" fill="none" stroke="#fbbf24" strokeWidth="2" />
            </g>
          )}

          {avatarAccessory === 'acc-dumbbell' && (
            <g id="gear-dumbbell" transform="translate(122, 142)">
              <rect x="4" y="18" width="30" height="5" rx="2" fill="#94a3b8" />
              <rect x="0" y="8" width="6" height="25" rx="2" fill="#1e293b" stroke="#475569" strokeWidth="1" />
              <rect x="32" y="8" width="6" height="25" rx="2" fill="#1e293b" stroke="#475569" strokeWidth="1" />
            </g>
          )}

          {avatarAccessory === 'acc-headphones' && (
            <g id="gear-dj-headphones">
              <path d="M60,118 Q100,146 140,118" fill="none" stroke="#ec4899" strokeWidth="5" strokeLinecap="round" />
              <circle cx="62" cy="116" r="8" fill="#1e1b4b" stroke="#f472b6" strokeWidth="2" />
              <circle cx="138" cy="116" r="8" fill="#1e1b4b" stroke="#f472b6" strokeWidth="2" />
            </g>
          )}
        </svg>

        {/* Small Bottom Outfit Name Tag on XL and 2XL */}
        {(size === 'xl' || size === '2xl') && !isFullBody && (
          <div className="absolute bottom-1.5 inset-x-2 py-0.5 px-2 text-[9px] font-black uppercase tracking-wider text-center rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-slate-200 truncate">
            {avatarOutfit.replace('outfit-', '').replace(/-/g, ' ')}
          </div>
        )}
      </div>

      {/* Optional Stat Multiplier Pill under avatar */}
      {showStatBadge && (
        <div className={`mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide border flex items-center gap-1 ${tierConfig.badgeClass}`}>
          <Zap className="w-2.5 h-2.5 text-amber-400" />
          {tierConfig.percentText} COMBAT STATS
        </div>
      )}

      {/* Sub-badges for compact mode */}
      {showHeadwearBadge && avatarHeadwear !== 'headwear-none' && (
        <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-slate-950 border border-purple-500/50 flex items-center justify-center text-purple-300 shadow-md">
          <Sparkles className="w-3 h-3" />
        </div>
      )}

      {showAccessoryBadge && avatarAccessory && (
        <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-slate-950 border border-cyan-500/50 flex items-center justify-center text-cyan-300 shadow-md">
          <Zap className="w-3 h-3" />
        </div>
      )}
    </div>
  );
}
