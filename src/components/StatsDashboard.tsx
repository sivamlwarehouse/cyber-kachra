import React from 'react';
import { ShieldAlert, RefreshCw, CheckCircle, Clock } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface StatsDashboardProps {
  overview: {
    total_reported: number;
    active: number;
    pending: number;
    resolved: number;
    cleaned_this_week?: number;
    avg_cleanup_days?: number;
  };
  onRefresh: () => void;
  loading: boolean;
}

export default function StatsDashboard({ overview, onRefresh, loading }: StatsDashboardProps) {
  const { t } = useLanguage();
  const s = t.stats;
  const cleanedWeek = overview.cleaned_this_week ?? overview.resolved;
  const avgDays = overview.avg_cleanup_days ?? 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="bg-status-active-light border border-status-active/20 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
        <div className="absolute right-3 top-3 p-2 bg-status-active/10 text-status-active rounded-xl">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[10px] font-mono font-bold text-status-active uppercase tracking-widest">
            {s.activeDumps}
          </span>
          <div className="text-3xl font-bold text-natural-heading mt-1">
            {overview.active}
          </div>
        </div>
        <div className="text-[10px] text-status-active/80 font-medium mt-2">
          ● {s.activeSub}
        </div>
      </div>

      <div className="bg-status-pending-light border border-status-pending/20 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
        <div className="absolute right-3 top-3 p-2 bg-status-pending/10 text-status-pending rounded-xl">
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </div>
        <div>
          <span className="text-[10px] font-mono font-bold text-status-pending uppercase tracking-widest">
            {s.pending}
          </span>
          <div className="text-3xl font-bold text-natural-heading mt-1">
            {overview.pending}
          </div>
        </div>
        <div className="text-[10px] text-status-pending/80 font-medium mt-2">
          ● {s.pendingSub}
        </div>
      </div>

      <div className="bg-status-clean-light border border-status-clean/20 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
        <div className="absolute right-3 top-3 p-2 bg-status-clean/10 text-status-clean rounded-xl">
          <CheckCircle className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[10px] font-mono font-bold text-status-clean uppercase tracking-widest">
            {s.resolved}
          </span>
          <div className="text-3xl font-bold text-natural-heading mt-1">
            {cleanedWeek}
          </div>
        </div>
        <div className="text-[10px] text-status-clean/80 font-medium mt-2">
          ✓ {s.resolvedSub}
        </div>
      </div>

      <button
        type="button"
        onClick={onRefresh}
        className="bg-status-clean text-white rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden text-left cursor-pointer hover:opacity-95"
      >
        <div className="absolute right-3 top-3 p-2 bg-white/20 text-white rounded-xl">
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[10px] font-mono font-bold text-white/70 uppercase tracking-widest">
            {s.cleanupRate}
          </span>
          <div className="text-3xl font-bold text-white mt-1">
            {avgDays > 0 ? `${avgDays}d` : '—'}
          </div>
        </div>
        <div className="text-[10px] text-white/80 font-medium mt-2">
          ★ {s.cleanupSub}
        </div>
      </button>
    </div>
  );
}
