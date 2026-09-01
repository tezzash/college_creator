import React, { useState } from 'react';
import { motion } from 'motion/react';
import { GraduationCap, Lock, Mail, User, ArrowRight, Sparkles } from 'lucide-react';
import { api } from '../api';
import { Player } from '../types';

interface AuthScreenProps {
  onSignedIn: (player: Player) => void;
  showToast: (text: string, type?: 'error' | 'success' | 'info') => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSignedIn, showToast }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim();
    if (cleanUser.length < 3) {
      showToast('Username must be at least 3 characters.', 'error');
      return;
    }
    if (isRegister && (!email.includes('@') || !email.includes('.'))) {
      showToast('Enter a valid email address.', 'error');
      return;
    }
    if (password.length < 8) {
      showToast('Password must be at least 8 characters.', 'error');
      return;
    }

    setBusy(true);
    try {
      if (isRegister) {
        const res = await api.register(cleanUser, email.trim(), password);
        showToast('Account created! Welcome to campus.', 'success');
        onSignedIn(res.player);
      } else {
        const res = await api.login(cleanUser, password);
        showToast(`Welcome back, ${res.player.username}!`, 'success');
        onSignedIn(res.player);
      }
    } catch (err: any) {
      showToast(err.message || 'Authentication failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0D14] flex items-center justify-center p-4 selection:bg-purple-500">
      {/* Background ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-[#131622] border border-slate-800/80 rounded-3xl p-8 relative z-10 shadow-2xl backdrop-blur-xl"
      >
        {/* Header Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-inner">
            <GraduationCap className="w-10 h-10" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-black tracking-wider text-white uppercase flex items-center justify-center gap-2">
            College Geeks
          </h1>
          <p className="text-slate-400 text-sm mt-1.5 font-medium">
            {isRegister
              ? 'Create your campus empire.'
              : 'Build. Battle. Become the top geek.'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              {isRegister ? 'Username' : 'Username or email'}
            </label>
            <div className="relative">
              <User className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={isRegister ? 'e.g. CampusBoss' : 'Enter username or email'}
                className="w-full bg-[#0B0D14] border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                required
              />
            </div>
          </div>

          {isRegister && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@campus.edu"
                  className="w-full bg-[#0B0D14] border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                  required
                />
              </div>
            </motion.div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full bg-[#0B0D14] border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full mt-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed text-sm uppercase tracking-wider"
          >
            {busy ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Please wait...
              </span>
            ) : (
              <>
                {isRegister ? 'Create Account' : 'Enter The Campus'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Toggle between Login and Register */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors"
          >
            {isRegister
              ? 'Already have an account? Login'
              : 'New here? Create an account'}
          </button>
        </div>

        {/* Quick Demo Info */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>Register a new player or test freely</span>
        </div>
      </motion.div>
    </div>
  );
};
