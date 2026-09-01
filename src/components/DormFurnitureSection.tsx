import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Server,
  Dumbbell,
  Shield,
  Coffee,
  CheckCircle2,
  Lock,
  Sparkles,
  Zap,
  ShoppingBag,
  RefreshCw
} from 'lucide-react';
import { DormFurnitureItem, Player } from '../types';
import { api } from '../api';

interface DormFurnitureSectionProps {
  player: Player;
  onPlayerUpdated: () => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const DormFurnitureSection: React.FC<DormFurnitureSectionProps> = ({
  player,
  onPlayerUpdated,
  showToast,
}) => {
  const [catalog, setCatalog] = useState<DormFurnitureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const res = await api.dormFurniture();
      setCatalog(res.catalog || []);
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const handleBuy = async (item: DormFurnitureItem) => {
    if (player.cash < item.cost) {
      showToast(`Insufficient cash. ${item.name} costs $${item.cost.toLocaleString()}.`, 'error');
      return;
    }

    setBuyingId(item.id);
    try {
      await api.buyDormFurniture(item.id);
      showToast(`Equipped ${item.name}! ${item.bonusSummary}`, 'success');
      await Promise.all([fetchCatalog(), onPlayerUpdated()]);
    } catch (err: any) {
      showToast(err.message || 'Purchase failed.', 'error');
    } finally {
      setBuyingId(null);
    }
  };

  const getItemIcon = (iconName: string) => {
    switch (iconName) {
      case 'server':
        return <Server className="w-5 h-5 text-purple-400" />;
      case 'dumbbell':
        return <Dumbbell className="w-5 h-5 text-rose-400" />;
      case 'shield-check':
        return <Shield className="w-5 h-5 text-cyan-400" />;
      case 'coffee':
        return <Coffee className="w-5 h-5 text-amber-400" />;
      default:
        return <Sparkles className="w-5 h-5 text-purple-400" />;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'TECH':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'GYM':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'SECURITY':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'VIBE':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="bg-[#131622] border border-slate-800/80 p-5 rounded-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            Dorm Room Upgrades & Furniture
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Furnish your Campus Tower suites with permanent stat multipliers & defense locks
          </p>
        </div>
        <button
          onClick={fetchCatalog}
          disabled={loading}
          className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-400' : ''}`} />
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin text-purple-400" />
          <p className="text-xs font-bold uppercase tracking-wider">Loading Furniture Catalog...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {catalog.map((item) => {
            const isOwned = !!item.isOwned;
            const canAfford = player.cash >= item.cost;
            const isBuying = buyingId === item.id;

            return (
              <motion.div
                key={item.id}
                whileHover={{ y: -2 }}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  isOwned
                    ? 'bg-[#0E1322] border-purple-500/40 shadow-md shadow-purple-950/20'
                    : 'bg-[#0B0D14] border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center">
                        {getItemIcon(item.iconName)}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm leading-tight flex items-center gap-2">
                          {item.name}
                        </h3>
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border mt-0.5 ${getCategoryBadge(
                            item.category
                          )}`}
                        >
                          {item.category}
                        </span>
                      </div>
                    </div>

                    {isOwned ? (
                      <div className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full text-xs font-black">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>EQUIPPED</span>
                      </div>
                    ) : (
                      <div className="text-right">
                        <div className="text-xs font-black text-emerald-400">
                          ${item.cost.toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    {item.description}
                  </p>

                  <div className="bg-[#131622] px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-1.5 text-xs font-bold text-purple-300">
                    <Zap className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>{item.bonusSummary}</span>
                  </div>
                </div>

                {!isOwned && (
                  <div className="mt-4 pt-3 border-t border-slate-800/60">
                    <button
                      type="button"
                      disabled={!canAfford || isBuying}
                      onClick={() => handleBuy(item)}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        canAfford
                          ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-950'
                          : 'bg-slate-800/60 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      {isBuying
                        ? 'Purchasing...'
                        : canAfford
                        ? `Purchase & Equip ($${item.cost.toLocaleString()})`
                        : `Need $${(item.cost - player.cash).toLocaleString()} more`}
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
