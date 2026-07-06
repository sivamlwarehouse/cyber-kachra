import React, { useState } from 'react';
import { LeaderboardEntry } from '../types';
import { Search, ShieldAlert, Award, ArrowUpRight, CheckCircle, Percent } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface LeaderboardProps {
  constituencies: LeaderboardEntry[];
  wards: LeaderboardEntry[];
  zones: LeaderboardEntry[];
  onSelectEntity: (type: 'constituency' | 'ward', id: number) => void;
}

export default function Leaderboard({
  constituencies,
  wards,
  zones,
  onSelectEntity,
}: LeaderboardProps) {
  const { t } = useLanguage();
  const lb = t.leaderboard;
  const [filterType, setFilterType] = useState<'constituency' | 'ward' | 'zone' | 'fastest'>('ward');
  const [searchQuery, setSearchQuery] = useState('');

  const activeList = 
    filterType === 'constituency' ? constituencies :
    filterType === 'ward' ? wards :
    filterType === 'zone' ? zones :
    [...wards].sort((a, b) => b.percentage_cleaned - a.percentage_cleaned);

  const filteredList = activeList.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.subLabel && item.subLabel.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="bg-white rounded-[24px] border border-natural-sand shadow-sm flex flex-col h-full overflow-hidden">
      {/* Header and Filter Selector */}
      <div className="p-5 border-b border-natural-sand bg-natural-ivory/50">
        <div className="flex flex-col gap-1.5 mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-natural-clay" />
            <h2 className="text-lg font-bold text-natural-heading tracking-tight font-serif italic">{lb.title}</h2>
          </div>
          <p className="text-xs text-[#7A7872] font-medium">{lb.subtitle}</p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1 bg-natural-ivory border border-natural-sand/60 p-1 rounded-2xl">
          <button
            onClick={() => { setFilterType('ward'); setSearchQuery(''); }}
            className={`py-1.5 px-2 rounded-xl text-[10px] font-semibold transition-all ${
              filterType === 'ward'
                ? 'bg-white text-natural-heading shadow-sm'
                : 'text-[#A3A199] hover:text-natural-heading'
            }`}
          >
            {lb.ward}
          </button>
          <button
            onClick={() => { setFilterType('constituency'); setSearchQuery(''); }}
            className={`py-1.5 px-2 rounded-xl text-[10px] font-semibold transition-all ${
              filterType === 'constituency'
                ? 'bg-white text-natural-heading shadow-sm'
                : 'text-[#A3A199] hover:text-natural-heading'
            }`}
          >
            {lb.constituency}
          </button>
          <button
            onClick={() => { setFilterType('zone'); setSearchQuery(''); }}
            className={`py-1.5 px-2 rounded-xl text-[10px] font-semibold transition-all ${
              filterType === 'zone'
                ? 'bg-white text-natural-heading shadow-sm'
                : 'text-[#A3A199] hover:text-natural-heading'
            }`}
          >
            {lb.zone}
          </button>
          <button
            onClick={() => { setFilterType('fastest'); setSearchQuery(''); }}
            className={`py-1.5 px-2 rounded-xl text-[10px] font-semibold transition-all ${
              filterType === 'fastest'
                ? 'bg-white text-natural-heading shadow-sm'
                : 'text-[#A3A199] hover:text-natural-heading'
            }`}
          >
            {lb.fastestCleanup}
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="px-4 py-3 border-b border-natural-sand flex items-center gap-2 bg-white">
        <Search className="w-4 h-4 text-[#A3A199] shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={lb.search}
          className="text-xs text-natural-text w-full outline-none placeholder-[#A3A199] bg-transparent font-medium"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs text-[#A3A199] hover:text-natural-heading font-bold px-1"
          >
            ×
          </button>
        )}
      </div>

      {/* Leaderboard List */}
      <div className="flex-1 overflow-y-auto divide-y divide-natural-sand/30 max-h-[480px]">
        {filteredList.length === 0 ? (
          <div className="p-8 text-center text-[#A3A199] text-xs">
            {lb.noResults}
          </div>
        ) : (
          filteredList.map((entry, index) => {
            const rank = index + 1;
            // Rank badge color
            const getRankBadge = (r: number) => {
              if (entry.active_dumps === 0) return 'bg-status-clean-light text-status-clean border-status-clean/20';
              if (r === 1) return 'bg-status-active text-white border-status-active shadow-sm';
              if (r === 2) return 'bg-status-pending-light text-status-pending border-status-pending/20';
              if (r === 3) return 'bg-natural-ivory text-natural-text border-natural-sand';
              return 'bg-natural-bg/60 text-[#7A7872] border-natural-sand';
            };

            const isTopPerformer = filterType === 'fastest' && rank <= 3 && entry.percentage_cleaned >= 50;
            const needsAttention = entry.active_dumps >= 3;

            return (
              <div
                key={`${filterType}-${entry.id}`}
                className="p-4 hover:bg-natural-bg/40 transition-colors flex items-center justify-between gap-4"
              >
                {/* Left Side: Rank and Name */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 rounded-xl border flex items-center justify-center font-mono text-xs font-bold shrink-0 ${getRankBadge(
                      rank
                    )}`}
                  >
                    {entry.active_dumps === 0 ? '✓' : rank}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-natural-heading tracking-tight">
                        {entry.name}
                      </span>
                      {isTopPerformer && (
                        <span className="text-[9px] font-bold text-status-clean bg-status-clean-light px-1.5 py-0.5 rounded-full">
                          {lb.topPerformer}
                        </span>
                      )}
                      {needsAttention && !isTopPerformer && (
                        <span className="text-[9px] font-bold text-status-active bg-status-active-light px-1.5 py-0.5 rounded-full">
                          {lb.needsAttention}
                        </span>
                      )}
                      {filterType !== 'zone' && (
                        <button
                          onClick={() => onSelectEntity(
                            filterType === 'constituency' ? 'constituency' : 'ward',
                            entry.id,
                          )}
                          className="p-1 rounded-lg text-[#A3A199] hover:text-natural-sage hover:bg-natural-light-sage/40 transition-colors"
                          title={lb.viewOnMap}
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {entry.subLabel && (
                      <div className="text-[10px] text-[#A3A199] font-mono">
                        {entry.subLabel}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Stats Panel */}
                <div className="flex items-center gap-4 shrink-0 text-right">
                  {/* Active Dumps */}
                  <div>
                    <div className="text-[10px] text-[#A3A199] font-medium uppercase tracking-wider font-mono">
                      {lb.active}
                    </div>
                    <div
                      className={`text-sm font-bold font-mono ${
                        entry.active_dumps > 3
                          ? 'text-status-active'
                          : entry.active_dumps > 0
                          ? 'text-status-pending'
                          : 'text-status-clean'
                      }`}
                    >
                      {entry.active_dumps}
                    </div>
                  </div>

                  {/* Cleaned Percentage */}
                  <div className="w-16">
                    <div className="text-[10px] text-[#A3A199] font-medium uppercase tracking-wider font-mono">
                      {lb.cleanRate}
                    </div>
                    <div className="flex items-center justify-end gap-0.5 text-xs font-bold font-mono text-natural-text">
                      <span>{entry.percentage_cleaned}</span>
                      <span className="text-[10px] text-[#A3A199]">%</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Disclaimer */}
      <div className="p-3.5 border-t border-natural-sand bg-natural-ivory text-[10px] text-[#A3A199] font-mono text-center flex items-center justify-center gap-1">
        <span>*</span>
        <span>Worst performing area ranks higher. Keep your area clean to rank down.</span>
      </div>
    </div>
  );
}
