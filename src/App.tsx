import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GraduationCap,
  Home,
  Briefcase,
  Building2,
  Swords,
  Wallet,
  Zap,
  Sparkles,
  Menu,
  LogOut,
  Calendar,
  Trophy,
  Award,
  Users
} from 'lucide-react';
import { api } from './api';
import { Player } from './types';
import { AuthScreen } from './components/AuthScreen';
import { HomePage } from './components/HomePage';
import { JobsPage } from './components/JobsPage';
import { TowerPage } from './components/TowerPage';
import { BattlePage } from './components/BattlePage';
import { BankModal } from './components/BankModal';
import { LeaderboardsModal } from './components/LeaderboardsModal';
import { DailyPlannerModal } from './components/DailyPlannerModal';
import { TrophiesModal } from './components/TrophiesModal';
import { ProfileClosetModal } from './components/ProfileClosetModal';
import { FriendsModal } from './components/FriendsModal';
import { InboxModal } from './components/InboxModal';
import { InboxButton } from './components/InboxButton';
import { AvatarDisplay } from './components/AvatarDisplay';
import { ToastContainer, ToastMessage } from './components/Toast';
import { CompactQuickMenu } from './components/CompactQuickMenu';

export function App() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'jobs' | 'tower' | 'battle'>('home');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isBankOpen, setIsBankOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isDailyPlannerOpen, setIsDailyPlannerOpen] = useState(false);
  const [isTrophiesOpen, setIsTrophiesOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isFriendsOpen, setIsFriendsOpen] = useState(false);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [inboxPartnerId, setInboxPartnerId] = useState<string | null>(null);
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);
  const [claimableQuestsCount, setClaimableQuestsCount] = useState(0);
  const [claimableTrophiesCount, setClaimableTrophiesCount] = useState(0);
  const [pendingFriendsCount, setPendingFriendsCount] = useState(0);
  const [unreadInboxCount, setUnreadInboxCount] = useState(0);

  const showToast = useCallback((text: string, type: 'error' | 'success' | 'info' = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const fetchBadges = useCallback(async () => {
    if (!api.getToken()) return;
    try {
      const [questsRes, trophiesRes, friendsRes, inboxRes] = await Promise.allSettled([
        api.getDailyQuests(),
        api.getTrophies(),
        api.getFriends(),
        api.getInbox(),
      ]);

      if (questsRes.status === 'fulfilled' && questsRes.value) {
        const qData = questsRes.value;
        const readyQuests = (qData.dailyQuests || []).filter((q) => q.completed && !q.claimed).length;
        const bonusReady = qData.allDailyCompleted && !qData.dailyBonusClaimed ? 1 : 0;
        setClaimableQuestsCount(readyQuests + bonusReady);
      }

      if (trophiesRes.status === 'fulfilled' && trophiesRes.value) {
        const tData = trophiesRes.value;
        const readyMilestones = (tData.milestones || []).filter((m) => m.completed && !m.claimed).length;
        setClaimableTrophiesCount(readyMilestones);
      }

      if (friendsRes.status === 'fulfilled' && friendsRes.value) {
        const fData = friendsRes.value;
        const incomingCount = (fData.requests?.incoming || []).length;
        setPendingFriendsCount(incomingCount);
      }

      if (inboxRes.status === 'fulfilled' && inboxRes.value) {
        const iData = inboxRes.value as any;
        setUnreadInboxCount(iData.totalUnread ?? iData.unreadTotal ?? 0);
      }
    } catch {
      // Non-blocking
    }
  }, []);

  const fetchPlayer = useCallback(async () => {
    try {
      const res = await api.me();
      setPlayer(res.player);
      fetchBadges();
    } catch {
      api.setToken(null);
      setPlayer(null);
    }
  }, [fetchBadges]);

  useEffect(() => {
    const restoreSession = async () => {
      const token = api.getToken();
      if (token) {
        await fetchPlayer();
        await fetchBadges();
      }
      setLoading(false);
    };
    restoreSession();

    const badgeInterval = setInterval(() => {
      if (api.getToken()) {
        fetchBadges();
      }
    }, 5000);

    const onFocus = () => {
      if (api.getToken()) {
        fetchBadges();
      }
    };
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(badgeInterval);
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchPlayer, fetchBadges]);

  const handleSignOut = () => {
    api.setToken(null);
    setPlayer(null);
    setActiveTab('home');
    showToast('Signed out successfully.', 'info');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090B10] flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 animate-pulse">
          <GraduationCap className="w-6 h-6" />
        </div>
        <p className="text-xs font-black text-slate-400 tracking-widest uppercase">
          Loading Campus Empire...
        </p>
      </div>
    );
  }

  if (!player) {
    return (
      <>
        <AuthScreen
          onSignedIn={(p) => {
            setPlayer(p);
            setActiveTab('home');
            fetchBadges();
          }}
          showToast={showToast}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  const hasPendingBadges = claimableQuestsCount > 0 || claimableTrophiesCount > 0 || unreadInboxCount > 0;

  return (
    <div className="min-h-screen bg-[#090B10] text-slate-100 flex flex-col selection:bg-purple-500 pb-16 md:pb-20">
      {/* Top HUD Bar - Clean, fully responsive, zero cut-off */}
      <header className="sticky top-0 z-40 bg-[#0E111B]/95 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-4xl mx-auto px-2.5 sm:px-4 h-13 flex items-center justify-between gap-1 sm:gap-2">
          {/* Left: Avatar & Username trigger */}
          <button
            onClick={() => setIsProfileOpen(true)}
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
            <span className="text-[11px] font-black text-white group-hover:text-purple-300 max-w-[65px] sm:max-w-[100px] truncate">
              {player.username}
            </span>
          </button>

          {/* Center: Pocket Cash, Energy, Morale */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Cash */}
            <button
              onClick={() => setIsBankOpen(true)}
              className="flex items-center gap-1 bg-[#141824] hover:bg-[#1A2030] border border-emerald-500/30 px-2 py-1 rounded-lg text-[11px] font-black text-emerald-300 transition-colors cursor-pointer"
              title="Campus Cash & Vault"
            >
              <Wallet className="w-3 h-3 text-emerald-400" />
              <span>${Number(player.cash).toLocaleString()}</span>
            </button>

            {/* Universal Energy */}
            <div
              className="flex items-center gap-1 bg-[#141824] border border-amber-500/30 px-2 py-1 rounded-lg text-[11px] font-black text-amber-300 shadow-sm"
              title="Universal Energy: Used for Fight, Prank & Spy (1⚡ each)"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>{player.energy ?? 0}/{player.maxEnergy ?? 10}</span>
            </div>
          </div>

          {/* Right: Inbox Button, Friends Button, Quick Menu & Sign Out */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Campus Private Inbox Button */}
            <InboxButton
              onClick={() => {
                setInboxPartnerId(null);
                setIsInboxOpen(true);
              }}
              unreadCount={unreadInboxCount}
              variant="icon"
            />

            {/* Friends Button */}
            <button
              onClick={() => setIsFriendsOpen(true)}
              className={`relative p-1.5 sm:p-2 rounded-xl bg-[#141824] hover:bg-[#1A2030] border ${
                pendingFriendsCount > 0
                  ? 'border-rose-500/50 bg-rose-950/20 text-rose-400'
                  : 'border-cyan-500/30 text-cyan-400'
              } hover:text-white transition-all cursor-pointer flex items-center justify-center`}
              title={`Campus Buddies & Friends ${pendingFriendsCount > 0 ? `(${pendingFriendsCount} pending)` : ''}`}
            >
              <Users className="w-4 h-4" />
              {pendingFriendsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex items-center justify-center rounded-full h-4 min-w-[16px] px-1 bg-rose-600 border border-[#0E111B] text-[8px] font-black text-white shadow-lg shadow-rose-600/50">
                    {pendingFriendsCount > 99 ? '99+' : pendingFriendsCount}
                  </span>
                </span>
              )}
            </button>

            {/* Quick Menu Button (Drawer for Bank, Quests, Trophies, Leaderboard) */}
            <button
              onClick={() => setIsQuickMenuOpen(true)}
              className="relative p-1.5 rounded-xl bg-[#141824] hover:bg-[#1A2030] border border-slate-750 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Campus Quick Menu"
            >
              <Menu className="w-4 h-4" />
              {hasPendingBadges && (
                <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] bg-emerald-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border border-[#0E111B] animate-bounce">
                  {claimableQuestsCount + claimableTrophiesCount + pendingFriendsCount + unreadInboxCount}
                </span>
              )}
            </button>

            {/* Direct Logout */}
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-xl bg-[#141824] hover:bg-rose-950/40 border border-slate-750 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              title="Exit / Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-2.5 sm:px-4 pt-3">
        {/* Pinned Alert if Infirmary Protected */}
        {player.isPinned && (
          <div className="mb-3 bg-rose-950/80 border border-rose-500/80 p-2.5 rounded-xl flex items-center justify-between text-xs animate-pulse">
            <div className="flex items-center gap-2">
              <span className="text-base">🏥</span>
              <div>
                <span className="font-black text-white uppercase text-[11px]">Infirmary Protected</span>
                <p className="text-[10px] text-rose-200">
                  {player.pinnedSecondsRemaining ? `${player.pinnedSecondsRemaining}s medical recovery remaining` : 'Recovering'}
                </p>
              </div>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.1 }}
            >
              <HomePage
                player={player}
                onRefresh={fetchPlayer}
                onSignOut={handleSignOut}
                onNavigate={setActiveTab}
                claimableQuestsCount={claimableQuestsCount}
                claimableTrophiesCount={claimableTrophiesCount}
                onOpenBank={() => setIsBankOpen(true)}
                onOpenDailyPlanner={() => setIsDailyPlannerOpen(true)}
                onOpenTrophies={() => setIsTrophiesOpen(true)}
                onOpenLeaderboards={() => setIsLeaderboardOpen(true)}
                onOpenFriends={() => setIsFriendsOpen(true)}
                onOpenInbox={() => {
                  setInboxPartnerId(null);
                  setIsInboxOpen(true);
                }}
                pendingFriendsCount={pendingFriendsCount}
                unreadInboxCount={unreadInboxCount}
              />
            </motion.div>
          )}

          {activeTab === 'jobs' && (
            <motion.div
              key="jobs"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.1 }}
            >
              <JobsPage onPlayerUpdated={fetchPlayer} showToast={showToast} />
            </motion.div>
          )}

          {activeTab === 'tower' && (
            <motion.div
              key="tower"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.1 }}
            >
              <TowerPage
                player={player}
                onPlayerUpdated={fetchPlayer}
                showToast={showToast}
                onNavigate={(t) => setActiveTab(t)}
              />
            </motion.div>
          )}

          {activeTab === 'battle' && (
            <motion.div
              key="battle"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.1 }}
            >
              <BattlePage player={player} onPlayerUpdated={fetchPlayer} showToast={showToast} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation Bar (Mobile) - Fixed bottom, high z-index */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0E111C]/95 backdrop-blur-xl border-t border-slate-800/80 md:hidden">
        <div className="grid grid-cols-4 max-w-lg mx-auto h-14">
          <button
            onClick={() => setActiveTab('home')}
            className={`relative flex flex-col items-center justify-center gap-0.5 font-extrabold text-[9px] tracking-wider uppercase transition-colors cursor-pointer ${
              activeTab === 'home' ? 'text-purple-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Home className="w-4 h-4" />
              {unreadInboxCount > 0 ? (
                <span className="absolute -top-1 -right-1.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border border-[#0E111C]"></span>
                </span>
              ) : hasPendingBadges ? (
                <span className="absolute -top-1 -right-1.5 min-w-[12px] h-[12px] bg-emerald-500 text-white text-[7px] font-black rounded-full flex items-center justify-center">
                  !
                </span>
              ) : null}
            </div>
            <span>Home</span>
          </button>

          <button
            onClick={() => setActiveTab('jobs')}
            className={`flex flex-col items-center justify-center gap-0.5 font-extrabold text-[9px] tracking-wider uppercase transition-colors cursor-pointer ${
              activeTab === 'jobs' ? 'text-purple-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Jobs</span>
          </button>

          <button
            onClick={() => setActiveTab('tower')}
            className={`flex flex-col items-center justify-center gap-0.5 font-extrabold text-[9px] tracking-wider uppercase transition-colors cursor-pointer ${
              activeTab === 'tower' ? 'text-purple-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Tower</span>
          </button>

          <button
            onClick={() => setActiveTab('battle')}
            className={`flex flex-col items-center justify-center gap-0.5 font-extrabold text-[9px] tracking-wider uppercase transition-colors cursor-pointer ${
              activeTab === 'battle' ? 'text-purple-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Swords className="w-4 h-4" />
            <span>PvP</span>
          </button>
        </div>
      </nav>

      {/* Desktop Navigation Floating Dock */}
      <div className="hidden md:flex fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-[#0F121C]/90 backdrop-blur-xl border border-slate-800/80 p-1.5 rounded-2xl shadow-2xl">
        <button
          onClick={() => setActiveTab('home')}
          className={`relative px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'home'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <div className="relative">
            <Home className="w-4 h-4" />
            {unreadInboxCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            )}
          </div>
          <span>Home</span>
          {unreadInboxCount > 0 && (
            <span className="min-w-[15px] h-[15px] bg-rose-600 text-white text-[8px] font-black rounded-full flex items-center justify-center px-1 shadow-sm">
              {unreadInboxCount > 99 ? '99+' : unreadInboxCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('jobs')}
          className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'jobs'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Jobs</span>
        </button>
        <button
          onClick={() => setActiveTab('tower')}
          className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'tower'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Tower</span>
        </button>
        <button
          onClick={() => setActiveTab('battle')}
          className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'battle'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Swords className="w-4 h-4" />
          <span>PvP Arena</span>
        </button>
      </div>

      {/* Campus Friends & Study Buddies Modal */}
      <FriendsModal
        isOpen={isFriendsOpen}
        onClose={() => setIsFriendsOpen(false)}
        onPlayerUpdated={fetchPlayer}
        showToast={showToast}
        onOpenInbox={(partnerId) => {
          setInboxPartnerId(partnerId || null);
          setIsInboxOpen(true);
        }}
        unreadInboxCount={unreadInboxCount}
      />

      {/* Campus Direct Messaging & Inbox Modal */}
      <InboxModal
        isOpen={isInboxOpen}
        onClose={() => {
          setIsInboxOpen(false);
          setInboxPartnerId(null);
        }}
        initialPartnerId={inboxPartnerId}
        showToast={showToast}
        onInboxUpdated={fetchBadges}
      />

      {/* Quick Menu Drawer Modal */}
      {player && (
        <CompactQuickMenu
          isOpen={isQuickMenuOpen}
          onClose={() => setIsQuickMenuOpen(false)}
          player={player}
          onOpenBank={() => setIsBankOpen(true)}
          onOpenLeaderboards={() => setIsLeaderboardOpen(true)}
          onOpenDailyPlanner={() => setIsDailyPlannerOpen(true)}
          onOpenTrophies={() => setIsTrophiesOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
          onOpenFriends={() => setIsFriendsOpen(true)}
          onOpenInbox={() => {
            setInboxPartnerId(null);
            setIsInboxOpen(true);
          }}
          onSignOut={handleSignOut}
          claimableQuestsCount={claimableQuestsCount}
          claimableTrophiesCount={claimableTrophiesCount}
          pendingFriendsCount={pendingFriendsCount}
          unreadInboxCount={unreadInboxCount}
        />
      )}

      {/* Campus Bank Modal */}
      {player && (
        <BankModal
          isOpen={isBankOpen}
          onClose={() => setIsBankOpen(false)}
          player={player}
          onPlayerUpdated={fetchPlayer}
          showToast={showToast}
        />
      )}

      {/* Leaderboards Modal */}
      {player && (
        <LeaderboardsModal
          isOpen={isLeaderboardOpen}
          onClose={() => setIsLeaderboardOpen(false)}
          currentPlayerId={player.id}
        />
      )}

      {/* Daily Campus Planner Modal */}
      <DailyPlannerModal
        isOpen={isDailyPlannerOpen}
        onClose={() => setIsDailyPlannerOpen(false)}
        onPlayerUpdated={fetchPlayer}
        showToast={showToast}
      />

      {/* Campus Trophies Modal */}
      <TrophiesModal
        isOpen={isTrophiesOpen}
        onClose={() => setIsTrophiesOpen(false)}
        onPlayerUpdated={fetchPlayer}
        showToast={showToast}
      />

      {/* Profile Closet Modal */}
      {player && (
        <ProfileClosetModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          player={player}
          onPlayerUpdated={fetchPlayer}
          showToast={showToast}
        />
      )}

      {/* Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
