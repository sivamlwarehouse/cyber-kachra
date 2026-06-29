import React from 'react';
import { ShieldAlert, RefreshCw, CheckCircle, Award } from 'lucide-react';

interface StatsDashboardProps {
  overview: {
    total_reported: number;
    active: number;
    pending: number;
    resolved: number;
  };
  onRefresh: () => void;
  loading: boolean;
}

export default function StatsDashboard({ overview, onRefresh, loading }: StatsDashboardProps) {
  const percentageCleaned = overview.total_reported > 0
    ? Math.round((overview.resolved / overview.total_reported) * 100)
    : 100;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Active Dumps Card */}
      <div className="bg-natural-light-clay/50 border border-natural-clay/20 rounded-[24px] p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group">
        <div className="absolute right-4 top-4 p-2 bg-natural-light-clay text-natural-clay rounded-xl">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div>
          <span className="text-[10px] font-mono font-bold text-natural-clay uppercase tracking-widest">
            Active Dumps
          </span>
          <div className="text-3xl font-serif font-bold text-natural-heading mt-1">
            {overview.active}
          </div>
        </div>
        <div className="text-[10px] text-natural-clay/80 font-medium mt-3 flex items-center gap-1">
          <span>● Geotagged & Unresolved</span>
        </div>
      </div>

      {/* Pending Cleanup Card */}
      <div className="bg-natural-ivory border border-natural-sand rounded-[24px] p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group">
        <div className="absolute right-4 top-4 p-2 bg-white border border-natural-sand text-[#7A7872] rounded-xl">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </div>
        <div>
          <span className="text-[10px] font-mono font-bold text-[#7A7872] uppercase tracking-widest">
            Pending Verify
          </span>
          <div className="text-3xl font-serif font-bold text-natural-heading mt-1">
            {overview.pending}
          </div>
        </div>
        <div className="text-[10px] text-[#7A7872]/80 font-medium mt-3 flex items-center gap-1">
          <span>● Awaiting Auditing</span>
        </div>
      </div>

      {/* Resolved Card */}
      <div className="bg-natural-light-sage/50 border border-natural-sage/20 rounded-[24px] p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group">
        <div className="absolute right-4 top-4 p-2 bg-natural-light-sage text-natural-sage rounded-xl">
          <CheckCircle className="w-4 h-4" />
        </div>
        <div>
          <span className="text-[10px] font-mono font-bold text-natural-sage uppercase tracking-widest">
            Verified Clean
          </span>
          <div className="text-3xl font-serif font-bold text-natural-heading mt-1">
            {overview.resolved}
          </div>
        </div>
        <div className="text-[10px] text-natural-sage/80 font-medium mt-3 flex items-center gap-1">
          <span>✓ Removed from Shameboard</span>
        </div>
      </div>

      {/* Clean Rate Card */}
      <div className="bg-natural-sage text-white rounded-[24px] p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group">
        <div className="absolute right-4 top-4 p-2 bg-white/20 text-white rounded-xl">
          <Award className="w-4 h-4" />
        </div>
        <div>
          <span className="text-[10px] font-mono font-bold text-white/70 uppercase tracking-widest">
            Cleanup Rate
          </span>
          <div className="text-3xl font-serif italic font-bold text-white mt-1">
            {percentageCleaned}%
          </div>
        </div>
        <div className="text-[10px] text-white/80 font-medium mt-3 flex items-center gap-1">
          <span>★ Community Resolution rate</span>
        </div>
      </div>
    </div>
  );
}
