import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface CategoryHubItem {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  badge?: string | number;
  badgeVariant?: 'emerald' | 'amber' | 'rose' | 'purple';
  onClick: () => void;
  disabled?: boolean;
}

interface CategoryHubViewProps {
  categoryTitle: string;
  categorySubtitle: string;
  categoryIcon: LucideIcon;
  categoryThemeColor?: string;
  items: CategoryHubItem[];
  banner?: React.ReactNode;
  children?: React.ReactNode;
}

export const CategoryHubView: React.FC<CategoryHubViewProps> = ({
  categoryTitle,
  categorySubtitle,
  categoryIcon: CategoryIcon,
  categoryThemeColor = 'text-purple-400',
  items,
  banner,
  children,
}) => {
  return (
    <div className="space-y-3 pb-6">
      {/* Category Header */}
      <div className="bg-[#121624] border border-slate-800/80 p-3.5 sm:p-4 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center shrink-0">
            <CategoryIcon className={`w-5 h-5 ${categoryThemeColor}`} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg font-black text-white tracking-wide truncate">
              {categoryTitle}
            </h1>
            <p className="text-xs text-slate-400 truncate">
              {categorySubtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Optional Top Banner (Status, Pinned, Alerts) */}
      {banner && <div>{banner}</div>}

      {/* Category Feature Hub Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {items.map((item) => {
          const Icon = item.icon;
          const badgeClass =
            item.badgeVariant === 'rose'
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              : item.badgeVariant === 'amber'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : item.badgeVariant === 'purple'
              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

          return (
            <button
              key={item.id}
              onClick={item.onClick}
              disabled={item.disabled}
              className={`bg-[#121624] hover:bg-[#181E2E] active:scale-[0.99] border border-slate-800/80 hover:border-purple-500/40 p-3 rounded-2xl flex items-center justify-between text-left transition-all cursor-pointer shadow-md group ${
                item.disabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105 ${
                    item.iconBgColor || 'bg-purple-500/15 border-purple-500/30'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${item.iconColor || 'text-purple-400'}`} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm font-black text-slate-100 group-hover:text-purple-300 truncate">
                      {item.title}
                    </span>
                    {item.badge !== undefined && item.badge !== null && (
                      <span
                        className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md border shrink-0 ${badgeClass}`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                    {item.subtitle}
                  </p>
                </div>
              </div>

              <div className="text-slate-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          );
        })}
      </div>

      {/* Embedded functional context / detail view */}
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
};
