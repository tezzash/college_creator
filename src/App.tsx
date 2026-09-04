import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GraduationCap } from 'lucide-react';
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
import { NavigationShell, MainNavTab } from './components/navigation/NavigationShell';
import { MinimalGlobalHUD } from './components/navigation/MinimalGlobalHUD';
import { DormPillarHub } from './components/navigation/DormPillarHub';
import { CampusPillarHub } from './components/navigation/CampusPillarHub';
import { ArenaPillarHub } from './components/navigation/ArenaPillarHub';
import { CommunityPillarHub } from './components/navigation/CommunityPillarHub';

export function App() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<MainNavTab>('dorm');
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
    setActiveTab('dorm');
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
            setActiveTab('dorm');
            fetchBadges();
          }}
          showToast={showToast}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  const totalBadgeCount =
    claimableQuestsCount + claimableTrophiesCount + pendingFriendsCount + unreadInboxCount;
  const hasPendingBadges = totalBadgeCount > 0;

  return (
    <div className="min-h-screen bg-[#090B10] text-slate-100 flex flex-col selection:bg-purple-500 pb-16 md:pb-20">
      {/* Minimal Global HUD Bar: Pocket Cash, Bank Cash, Energy/countdown, unified menu access */}
      <MinimalGlobalHUD
        player={player}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenBank={() => setIsBankOpen(true)}
        onOpenMenu={() => setIsQuickMenuOpen(true)}
        onRefreshPlayer={fetchPlayer}
        hasPendingBadges={hasPendingBadges}
        totalBadgeCount={totalBadgeCount}
      />

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
          {activeTab === 'dorm' && (
            <motion.div
              key="dorm"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.1 }}
            >
              <DormPillarHub
                player={player}
                onRefresh={fetchPlayer}
                onSignOut={handleSignOut}
                showToast={showToast}
                onOpenProfile={() => setIsProfileOpen(true)}
                onOpenBank={() => setIsBankOpen(true)}
                onOpenDailyPlanner={() => setIsDailyPlannerOpen(true)}
                onOpenTrophies={() => setIsTrophiesOpen(true)}
                onOpenLeaderboards={() => setIsLeaderboardOpen(true)}
                onOpenFriends={() => setIsFriendsOpen(true)}
                onOpenInbox={() => {
                  setInboxPartnerId(null);
                  setIsInboxOpen(true);
                }}
                onNavigateArena={() => setActiveTab('arena')}
                claimableQuestsCount={claimableQuestsCount}
                claimableTrophiesCount={claimableTrophiesCount}
                pendingFriendsCount={pendingFriendsCount}
                unreadInboxCount={unreadInboxCount}
              />
            </motion.div>
          )}

          {activeTab === 'campus' && (
            <motion.div
              key="campus"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.1 }}
            >
              <CampusPillarHub
                player={player}
                onPlayerUpdated={fetchPlayer}
                showToast={showToast}
                onOpenDailyPlanner={() => setIsDailyPlannerOpen(true)}
                onOpenTrophies={() => setIsTrophiesOpen(true)}
                claimableQuestsCount={claimableQuestsCount}
                claimableTrophiesCount={claimableTrophiesCount}
              />
            </motion.div>
          )}

          {activeTab === 'arena' && (
            <motion.div
              key="arena"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.1 }}
            >
              <ArenaPillarHub
                player={player}
                onPlayerUpdated={fetchPlayer}
                showToast={showToast}
                onOpenLeaderboards={() => setIsLeaderboardOpen(true)}
              />
            </motion.div>
          )}

          {activeTab === 'community' && (
            <motion.div
              key="community"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.1 }}
            >
              <CommunityPillarHub
                player={player}
                onOpenFriends={() => setIsFriendsOpen(true)}
                onOpenInbox={() => {
                  setInboxPartnerId(null);
                  setIsInboxOpen(true);
                }}
                onOpenLeaderboards={() => setIsLeaderboardOpen(true)}
                onOpenBank={() => setIsBankOpen(true)}
                pendingFriendsCount={pendingFriendsCount}
                unreadInboxCount={unreadInboxCount}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 4-Pillar Reusable Navigation Shell (Mobile Bottom Bar & Desktop Dock) */}
      <NavigationShell
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        pendingBadges={{
          dorm: false,
          campus: claimableQuestsCount + claimableTrophiesCount > 0 ? claimableQuestsCount + claimableTrophiesCount : false,
          arena: false,
          community: pendingFriendsCount + unreadInboxCount > 0 ? pendingFriendsCount + unreadInboxCount : false,
        }}
      />

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
