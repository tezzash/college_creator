import React, { useState, useEffect, useRef } from 'react';
import { Wallet, Zap, Menu, Shield } from 'lucide-react';
import { Player } from '../../types';
import { AvatarDisplay } from '../AvatarDisplay';

interface MinimalGlobalHUDProps {
  player: Player;
  onOpenProfile: () => void;
  onOpenBank: () => void;
  onOpenMenu: () => void;
  onRefreshPlayer: () => Promise<void>;
  hasPendingBadges?: boolean;
  totalBadgeCount?: number;
}

export const MinimalGlobalHUD: React.FC<MinimalGlobalHUDProps> = ({
  player,
  onOpenProfile,
  onOpenBank,
  onOpenMenu,
  onRefreshPlayer,
  hasPendingBadges = false,
  totalBadgeCount = 0,
}) => {
  const [energyCountdown, setEnergyCountdown] = useState<string>('');
  const isRegenTriggeredRef = useRef(false);

  const maxEnergy = player.maxEnergy ?? 10;
  const energy = player.energy ?? 0;

  useEffect(() => {
    const updateCountdown = () => {
      const REGEN_SECONDS = 420; // 7 minutes authoritative regen interval

      if (energy >= maxEnergy) {
        setEnergyCountdown('');
      } else {
        const last = player.lastEnergyUpdate
          ? new Date(player.lastEnergyUpdate).getTime()
          : Date.now();
        const now = Date.now();
        const elapsedSecs = Math.max(0, Math.floor((now - last) / 1000));
        const remainingSecs = Math.max(0, REGEN_SECONDS - (elapsedSecs % REGEN_SECONDS));

        if (remainingSecs === 0 && !isRegenTriggeredRef.current) {
          isRegenTriggeredRef.current = true;
          onRefreshPlayer().finally(() => {
            isRegenTriggeredRef.current = false;
          });
        }

        const mins = Math.floor(remainingSecs / 60);
        const secs = remainingSecs % 60;
        setEnergyCountdown(`${mins}:${secs.toString().padStart(2, '0')}`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [energy, player.lastEnergyUpdate, maxEnergy, onRefreshPlayer]);

  return (
    <header className="sticky top-0 z-40 bg-[#0E111B]/95 backdrop-blur-md border-b border-slate-800/80 shadow-md">
      <div className="max-w-4xl mx-auto px-2.5 sm:px-4 h-13 flex items-center justify-between gap-1.5 sm:gap-2">
        {/* Left: Player Persona & Identity */}
        <button
          onClick={onOpenProfile}
          className="flex items-center gap-1.5 p-1 rounded-xl bg-[#141824] hover:bg-[#1A2030] border border-purple-500/30 transition-all cursor-pointer group shrink-0"
          title="Open Student Profile & Closet"
        >
          <AvatarDisplay
            avatarId={player.avatarId}
            avatarFrame={player.avatarFrame}
            avatarOutfit={player.avatarOutfit}
            avatarAccessory={player.avatarAccessory}
            size="sm"
          />
          <div className="flex flex-col items-start pr-1 max-w-[75px] sm:max-w-[120px]">
            <span className="text-[11px] font-black text-white group-hover:text-purple-300 truncate w-full text-left">
              {player.username}
            </span>
            <span className="text-[8px] font-bold text-amber-400 truncate w-full text-left">
              {player.equippedTitle || 'Student'}
            </span>
          </div>
        </button>

        {/* Center: Minimal Status Counters — Pocket Cash, Bank Cash, Energy with countdown */}
        <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
          {/* Pocket Cash */}
          <button
            onClick={onOpenBank}
            className="flex items-center gap-1 bg-[#141824] hover:bg-[#1A2030] border border-emerald-500/30 px-2 py-1 rounded-lg text-[11px] font-black text-emerald-300 transition-colors cursor-pointer shrink-0"
            title="Pocket Cash (Tap to open Safe Vault)"
          >
            <Wallet className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>${Number(player.cash || 0).toLocaleString()}</span>
          </button>

          {/* Bank Cash Vault indicator */}
          <button
            onClick={onOpenBank}
            className="hidden sm:flex items-center gap-1 bg-[#141824] hover:bg-[#1A2030] border border-cyan-500/30 px-2 py-1 rounded-lg text-[11px] font-black text-cyan-300 transition-colors cursor-pointer shrink-0"
            title="Safe Bank Vault Deposit (Tap to manage)"
          >
            <Shield className="w-3 h-3 text-cyan-400 shrink-0" />
            <span>${Number(player.bankCash || 0).toLocaleString()}</span>
          </button>

          {/* Universal Energy Gauge with Live Countdown */}
          <div
            className="flex items-center gap-1 bg-[#141824] border border-amber-500/30 px-2 py-1 rounded-lg text-[11px] font-black text-amber-300 shadow-sm shrink-0"
            title={
              energyCountdown
                ? `Universal PvP Energy: +1 in ${energyCountdown}`
                : 'Universal PvP Energy: Full capacity'
            }
          >
            <Zap className="w-3 h-3 text-amber-400 shrink-0" />
            <span>
              {energy}/{maxEnergy}
            </span>
            {energyCountdown && (
              <span className="text-[9px] font-mono font-medium text-amber-400/80 pl-0.5 border-l border-amber-500/30">
                {energyCountdown}
              </span>
            )}
          </div>
        </div>

        {/* Right: Unified Menu / Settings Access */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onOpenMenu}
            className="relative p-2 rounded-xl bg-[#141824] hover:bg-[#1A2030] border border-slate-750 text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
            title="Campus Unified Menu & Settings"
          >
            <Menu className="w-4 h-4" />
            <span className="hidden sm:inline text-[10px] font-black uppercase text-slate-300">Menu</span>
            {hasPendingBadges && (
              <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] bg-emerald-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border border-[#0E111B] animate-bounce px-0.5">
                {totalBadgeCount > 99 ? '99+' : totalBadgeCount || '!'}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
