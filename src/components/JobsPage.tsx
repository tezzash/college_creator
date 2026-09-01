import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Briefcase,
  BookOpen,
  Moon,
  Laptop,
  Timer,
  CheckCircle2,
  RefreshCw,
  Coins,
  Play,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { api } from '../api';
import { Job, ActiveJob } from '../types';

interface JobsPageProps {
  onPlayerUpdated: () => Promise<void>;
  showToast: (text: string, type?: 'error' | 'success' | 'info') => void;
}

export const JobsPage: React.FC<JobsPageProps> = ({ onPlayerUpdated, showToast }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJob, setActiveJob] = useState<ActiveJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [countdown, setCountdown] = useState('');
  const [isFinished, setIsFinished] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [jobsRes, activeRes] = await Promise.all([
        api.jobs(),
        api.activeJob(),
      ]);
      setJobs(jobsRes.jobs || []);
      setActiveJob(activeRes.activeJob || null);
    } catch (err: any) {
      if (!silent) showToast(err.message || 'Failed to load jobs.', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Active Job ticker
  useEffect(() => {
    if (!activeJob) {
      setProgress(0);
      setCountdown('');
      setIsFinished(false);
      return;
    }

    const updateJobStatus = () => {
      const start = new Date(activeJob.startedAt).getTime();
      const end = new Date(activeJob.finishesAt).getTime();
      const now = Date.now();

      const total = Math.max(1, end - start);
      const elapsed = Math.max(0, now - start);
      const currentProgress = Math.min(1, Math.max(0, elapsed / total));
      setProgress(currentProgress);

      const remainingMs = end - now;
      if (remainingMs <= 0) {
        setCountdown('0:00');
        setIsFinished(true);
      } else {
        const totalSecs = Math.ceil(remainingMs / 1000);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        setCountdown(`${mins}:${secs.toString().padStart(2, '0')}`);
        setIsFinished(false);
      }
    };

    updateJobStatus();
    const interval = setInterval(updateJobStatus, 1000);
    return () => clearInterval(interval);
  }, [activeJob]);

  const handleStartJob = async (jobId: string) => {
    if (actionBusy || activeJob) return;
    setActionBusy(true);
    try {
      const res = await api.startJob(jobId);
      setActiveJob(res.activeJob);
      showToast('Started job! Timer is ticking.', 'success');
      await onPlayerUpdated();
    } catch (err: any) {
      showToast(err.message || 'Failed to start job.', 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const handleCollectReward = async () => {
    if (!activeJob || !isFinished || actionBusy) return;
    setActionBusy(true);
    try {
      const res = await api.collectJob(activeJob.id);
      showToast(`Collected +$${res.rewardCash} Cash!`, 'success');
      setActiveJob(null);
      await loadData(true);
      await onPlayerUpdated();
    } catch (err: any) {
      showToast(err.message || 'Failed to collect reward.', 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const handleResetJob = async () => {
    if (!activeJob || actionBusy) return;
    setActionBusy(true);
    try {
      await api.cancelJob(activeJob.id);
      showToast('Active job cleared! You can now start any gig.', 'info');
      setActiveJob(null);
      await loadData(true);
      await onPlayerUpdated();
    } catch (err: any) {
      showToast(err.message || 'Failed to reset job.', 'error');
    } finally {
      setActionBusy(false);
    }
  };

  const getJobIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('study')) return <BookOpen className="w-5 h-5 text-indigo-400" />;
    if (lower.includes('night')) return <Moon className="w-5 h-5 text-purple-400" />;
    if (lower.includes('freelance')) return <Laptop className="w-5 h-5 text-blue-400" />;
    return <Briefcase className="w-5 h-5 text-emerald-400" />;
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between bg-[#121624] border border-slate-800/80 p-5 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-blue-400" />
            Campus Jobs & Freelancing
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Work shifts, study sessions, and gigs to earn reliable student income.
          </p>
        </div>
        <button
          onClick={() => loadData()}
          disabled={loading}
          className="p-2.5 rounded-xl bg-[#181E2E] hover:bg-[#20273C] border border-slate-750 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Refresh jobs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
        </button>
      </div>

      {/* Active Job Tracker */}
      {activeJob && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#141828] border-2 border-purple-500/40 rounded-2xl p-5 shadow-2xl shadow-purple-950/40 relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-purple-300 font-extrabold text-xs uppercase tracking-wider">
              <Timer className="w-4 h-4 text-purple-400 animate-pulse" />
              <span>Active Gig in Progress</span>
            </div>
            <div className="text-xs font-black font-mono px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">
              {countdown}
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <div className="text-base sm:text-lg font-black text-white">
              {activeJob.job?.name || 'Current Task'}
            </div>
            <div className="text-sm font-black text-emerald-400 flex items-center gap-1">
              <Coins className="w-4 h-4" />
              <span>+${activeJob.job?.rewardCash || 0} Cash</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-[#0A0D16] h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-800 mb-4">
            <motion.div
              className={`h-full rounded-full transition-all duration-300 ${
                isFinished ? 'bg-emerald-500 shadow-md shadow-emerald-500/50' : 'bg-gradient-to-r from-purple-500 to-indigo-500'
              }`}
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>

          {/* Action Button */}
          <div className="space-y-2">
            <button
              onClick={handleCollectReward}
              disabled={!isFinished || actionBusy}
              className={`w-full py-3 px-4 rounded-xl font-black text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isFinished
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40 animate-bounce'
                  : 'bg-[#181E2E] text-slate-500 cursor-not-allowed border border-slate-800'
              }`}
            >
              {actionBusy ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : isFinished ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Collect Reward (+${activeJob.job?.rewardCash || 0})
                </>
              ) : (
                <>
                  <Timer className="w-4 h-4 animate-spin" />
                  Working... ({countdown} remaining)
                </>
              )}
            </button>

            <button
              onClick={handleResetJob}
              disabled={actionBusy}
              className="w-full py-1.5 px-3 rounded-lg text-xs font-bold text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 border border-slate-800 hover:border-rose-900/40 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Cancel / Clear Current Job</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* Available Jobs List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider">
            Available Campus Opportunities
          </h2>
          <span className="text-xs text-slate-500 font-bold">Earn Cash & Experience</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
            <p className="text-xs font-bold tracking-wider uppercase">Loading campus gigs...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-8 text-center bg-[#121624] border border-slate-800/80 rounded-2xl text-slate-400 text-sm">
            No jobs currently available. Check back soon!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {jobs.map((j) => {
              const isCurrent = activeJob?.jobId === j.id;
              const hasActiveJob = !!activeJob;

              return (
                <div
                  key={j.id}
                  className={`bg-[#121624] border rounded-2xl p-4 flex flex-col justify-between transition-all ${
                    isCurrent
                      ? 'border-purple-500/60 bg-[#151A2C] shadow-lg shadow-purple-950/30'
                      : 'border-slate-800/80 hover:border-slate-700 hover:bg-[#161B2C]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#181E2E] border border-slate-750 flex items-center justify-center shrink-0">
                        {getJobIcon(j.name)}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-white text-sm">
                          {j.name}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Earn quick campus cash & pocket money
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-3 text-xs font-black">
                      <div className="flex items-center gap-1 text-emerald-400">
                        <Coins className="w-3.5 h-3.5" />
                        <span>+${j.rewardCash}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400">
                        <Timer className="w-3.5 h-3.5" />
                        <span>{Math.round(j.durationSeconds / 60)} min</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleStartJob(j.id)}
                      disabled={hasActiveJob || actionBusy}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 cursor-default'
                          : hasActiveJob
                          ? 'bg-[#181E2E] text-slate-600 border border-slate-800 cursor-not-allowed'
                          : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-900/30'
                      }`}
                    >
                      {isCurrent ? (
                        <>
                          <Timer className="w-3 h-3 animate-spin" />
                          <span>In Progress</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3" />
                          <span>Start Job</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
