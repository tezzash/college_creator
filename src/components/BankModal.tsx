import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Landmark,
  ShieldCheck,
  ArrowDownToLine,
  ArrowUpFromLine,
  X,
  Wallet,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Player } from '../types';
import { api } from '../api';

interface BankModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  onPlayerUpdated: () => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const BankModal: React.FC<BankModalProps> = ({
  isOpen,
  onClose,
  player,
  onPlayerUpdated,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [amountInput, setAmountInput] = useState<string>('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const cash = player.cash || 0;
  const bankCash = player.bankCash || 0;
  const numAmount = parseFloat(amountInput) || 0;

  const depositFee = Math.round(numAmount * 0.15 * 100) / 100;
  const netDeposit = Math.max(0, Math.round((numAmount - depositFee) * 100) / 100);

  const handleDeposit = async () => {
    if (numAmount < 10) {
      showToast('Minimum deposit is $10.', 'error');
      return;
    }
    if (numAmount > cash) {
      showToast('Insufficient pocket cash to deposit.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await api.depositBank(numAmount);
      showToast(`Deposited $${res.depositedNet.toLocaleString()} to Campus Vault! ($${res.fee} fee)`, 'success');
      setAmountInput('');
      await onPlayerUpdated();
    } catch (err: any) {
      showToast(err.message || 'Deposit failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (numAmount < 1) {
      showToast('Minimum withdrawal is $1.', 'error');
      return;
    }
    if (numAmount > bankCash) {
      showToast('Insufficient funds in Campus Vault.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await api.withdrawBank(numAmount);
      showToast(`Withdrew $${res.withdrawn.toLocaleString()} to pocket cash!`, 'success');
      setAmountInput('');
      await onPlayerUpdated();
    } catch (err: any) {
      showToast(err.message || 'Withdrawal failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const setQuickAmount = (val: number) => {
    setAmountInput(val.toString());
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-[#131622] border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-[#131622] border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Landmark className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white tracking-wide flex items-center gap-2">
                  Campus ATM & Bank Vault
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  Shield your hard-earned cash from PvP raiders
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Balances Display */}
          <div className="p-5 sm:p-6 space-y-5">
            <div className="grid grid-cols-2 gap-3.5">
              <div className="bg-[#0B0D14] border border-slate-800 p-4 rounded-2xl">
                <div className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 mb-1">
                  <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                  Pocket Cash
                </div>
                <div className="text-xl font-black text-emerald-300">
                  ${cash.toLocaleString()}
                </div>
                <div className="text-[10px] text-rose-400 font-bold mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  Vulnerable to raids
                </div>
              </div>

              <div className="bg-[#0B0D14] border border-emerald-500/30 p-4 rounded-2xl relative overflow-hidden">
                <div className="text-[11px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Bank Vault
                </div>
                <div className="text-xl font-black text-white">
                  ${bankCash.toLocaleString()}
                </div>
                <div className="text-[10px] text-emerald-400 font-bold mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  100% PvP immune
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-[#0B0D14] p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => {
                  setActiveTab('deposit');
                  setAmountInput('');
                }}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'deposit'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ArrowDownToLine className="w-4 h-4" />
                Deposit (15% Fee)
              </button>
              <button
                onClick={() => {
                  setActiveTab('withdraw');
                  setAmountInput('');
                }}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'withdraw'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ArrowUpFromLine className="w-4 h-4" />
                Withdraw (0% Fee)
              </button>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 tracking-wider mb-2">
                  {activeTab === 'deposit' ? 'Deposit Amount' : 'Withdrawal Amount'}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    min="1"
                    placeholder="Enter amount..."
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="w-full bg-[#0B0D14] border border-slate-800 rounded-xl pl-8 pr-4 py-3 text-white text-sm font-bold focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              {/* Quick Select Buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setQuickAmount(100)}
                  className="flex-1 py-1.5 bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  $100
                </button>
                <button
                  type="button"
                  onClick={() => setQuickAmount(500)}
                  className="flex-1 py-1.5 bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  $500
                </button>
                <button
                  type="button"
                  onClick={() => setQuickAmount(activeTab === 'deposit' ? cash : bankCash)}
                  className="flex-1 py-1.5 bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  MAX
                </button>
              </div>

              {/* Fee & Net Calculation Breakdown (Deposit Mode) */}
              {activeTab === 'deposit' && numAmount > 0 && (
                <div className="bg-[#0B0D14] border border-slate-800 p-3.5 rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Gross Cash to Deposit:</span>
                    <span className="font-bold text-white">${numAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-rose-400">
                    <span>15% Campus Security Processing Fee:</span>
                    <span className="font-bold">-${depositFee.toLocaleString()}</span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-800 flex justify-between text-emerald-400 font-black">
                    <span>Net Added to Safe Vault:</span>
                    <span>+${netDeposit.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Withdrawal Breakdown */}
              {activeTab === 'withdraw' && numAmount > 0 && (
                <div className="bg-[#0B0D14] border border-slate-800 p-3.5 rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Amount Withdrawn:</span>
                    <span className="font-bold text-white">${numAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400 font-bold">
                    <span>Processing Fee:</span>
                    <span>$0.00 (Free ATM)</span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              {activeTab === 'deposit' ? (
                <button
                  type="button"
                  disabled={loading || numAmount < 10 || numAmount > cash}
                  onClick={handleDeposit}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-950 transition-all cursor-pointer"
                >
                  {loading ? 'Processing Secure Deposit...' : `Deposit $${numAmount > 0 ? numAmount.toLocaleString() : '0'}`}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={loading || numAmount < 1 || numAmount > bankCash}
                  onClick={handleWithdraw}
                  className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-purple-950 transition-all cursor-pointer"
                >
                  {loading ? 'Dispensing Cash...' : `Withdraw $${numAmount > 0 ? numAmount.toLocaleString() : '0'}`}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
