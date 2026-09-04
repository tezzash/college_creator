import React from 'react';
import { Home, Building2, Swords, Users } from 'lucide-react';

export type MainNavTab = 'dorm' | 'campus' | 'arena' | 'community';

interface NavigationShellProps {
  activeTab: MainNavTab;
  onSelectTab: (tab: MainNavTab) => void;
  pendingBadges?: {
    dorm?: boolean | number;
    campus?: boolean | number;
    arena?: boolean | number;
    community?: boolean | number;
  };
}

export const MAIN_NAV_ITEMS: Array<{
  id: MainNavTab;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'dorm',
    label: 'Dorm',
    subtitle: 'Residence & Identity',
    icon: Home,
  },
  {
    id: 'campus',
    label: 'Campus',
    subtitle: 'Academics & Gigs',
    icon: Building2,
  },
  {
    id: 'arena',
    label: 'Arena',
    subtitle: 'PvP & Rivalries',
    icon: Swords,
  },
  {
    id: 'community',
    label: 'Community',
    subtitle: 'Social & Union',
    icon: Users,
  },
];

export const NavigationShell: React.FC<NavigationShellProps> = ({
  activeTab,
  onSelectTab,
  pendingBadges = {},
}) => {
  return (
    <>
      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav
        aria-label="Main Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#0E111C]/95 backdrop-blur-xl border-t border-slate-800/80 md:hidden"
      >
        <div className="grid grid-cols-4 max-w-lg mx-auto h-14">
          {MAIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const badge = pendingBadges[item.id];
            const hasBadge = Boolean(badge);
            const badgeCount = typeof badge === 'number' ? badge : null;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`relative flex flex-col items-center justify-center gap-0.5 font-extrabold text-[9px] tracking-wider uppercase transition-colors cursor-pointer ${
                  isActive ? 'text-purple-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="relative">
                  <Icon className="w-4 h-4" />
                  {hasBadge && (
                    <span className="absolute -top-1 -right-1.5 min-w-[12px] h-[12px] bg-emerald-500 text-white text-[7px] font-black rounded-full flex items-center justify-center px-0.5 shadow-sm">
                      {badgeCount !== null && badgeCount > 0
                        ? badgeCount > 99
                          ? '99+'
                          : badgeCount
                        : '!'}
                    </span>
                  )}
                </div>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Desktop Floating Navigation Dock */}
      <div
        aria-label="Desktop Main Navigation"
        className="hidden md:flex fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-[#0F121C]/90 backdrop-blur-xl border border-slate-800/80 p-1.5 rounded-2xl shadow-2xl gap-1"
      >
        {MAIN_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const badge = pendingBadges[item.id];
          const hasBadge = Boolean(badge);
          const badgeCount = typeof badge === 'number' ? badge : null;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`relative px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                isActive
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <div className="relative">
                <Icon className="w-4 h-4" />
                {hasBadge && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] bg-emerald-500 text-white text-[8px] font-black rounded-full flex items-center justify-center px-0.5 shadow-sm border border-[#0F121C]">
                    {badgeCount !== null && badgeCount > 0
                      ? badgeCount > 99
                        ? '99+'
                        : badgeCount
                      : '!'}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};
