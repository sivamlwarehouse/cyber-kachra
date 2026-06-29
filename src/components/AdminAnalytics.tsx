import React, { useMemo } from 'react';
import { Dump, CitizenReport, VerificationLog } from '../types';
import { wards, constituencies } from '../wards_constituencies';
import {
  TrendingUp, TrendingDown, MapPin, Users, Camera, Vote,
  AlertTriangle, CheckCircle, Clock, BarChart3,
} from 'lucide-react';

interface AdminAnalyticsProps {
  dumps: Dump[];
  reports: CitizenReport[];
  verifications: VerificationLog[];
}

function pct(n: number, total: number) {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

function BarRow({
  label, sub, value, max, color, pctLabel,
}: {
  label: string; sub?: string; value: number; max: number; color: string; pctLabel?: string;
}) {
  const width = max > 0 ? Math.max(4, (value / max) * 100) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-baseline gap-2">
        <div className="min-w-0">
          <span className="text-xs font-semibold text-natural-heading truncate block">{label}</span>
          {sub && <span className="text-[10px] text-[#7A7872]">{sub}</span>}
        </div>
        <span className="text-xs font-mono font-bold text-natural-heading shrink-0">
          {value}{pctLabel !== undefined ? ` · ${pctLabel}%` : ''}
        </span>
      </div>
      <div className="h-2 bg-natural-sand rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export default function AdminAnalytics({ dumps, reports, verifications }: AdminAnalyticsProps) {
  const analytics = useMemo(() => {
    const now = Date.now();
    const day = 24 * 3600 * 1000;
    const week = 7 * day;

    const active = dumps.filter((d) => d.status === 'active').length;
    const pending = dumps.filter((d) => d.status === 'pending_verification').length;
    const resolved = dumps.filter((d) => d.status === 'resolved').length;
    const total = dumps.length;
    const withPhotos = dumps.filter((d) => d.photos?.length > 0).length;
    const withoutPhotos = total - withPhotos;

    const reportsThisWeek = reports.filter(
      (r) => now - new Date(r.created_at).getTime() < week,
    ).length;
    const votesThisWeek = verifications.filter(
      (v) => now - new Date(v.created_at).getTime() < week,
    ).length;
    const newDumpsThisWeek = dumps.filter(
      (d) => now - new Date(d.created_at).getTime() < week,
    ).length;

    const stillExists = verifications.filter((v) => v.vote_type === 'still_exists').length;
    const cleaned = verifications.filter((v) => v.vote_type === 'cleaned').length;
    const grievanceCount = reports.length;

    const avgConfidence = total > 0
      ? Math.round(dumps.reduce((s, d) => s + d.confidence_score, 0) / total)
      : 0;
    const highPriority = dumps.filter(
      (d) => d.status === 'active' && d.confidence_score >= 70,
    ).length;

    const zoneMap: Record<string, { active: number; pending: number; resolved: number }> = {};
    wards.forEach((w) => {
      if (!zoneMap[w.zone]) zoneMap[w.zone] = { active: 0, pending: 0, resolved: 0 };
    });
    dumps.forEach((d) => {
      const ward = wards.find((w) => w.id === d.ward_id);
      if (!ward) return;
      if (d.status === 'active') zoneMap[ward.zone].active++;
      else if (d.status === 'pending_verification') zoneMap[ward.zone].pending++;
      else zoneMap[ward.zone].resolved++;
    });
    const zoneStats = Object.entries(zoneMap)
      .map(([name, s]) => ({
        name,
        open: s.active + s.pending,
        resolved: s.resolved,
        total: s.active + s.pending + s.resolved,
        cleanRate: pct(s.resolved, s.active + s.pending + s.resolved),
      }))
      .sort((a, b) => b.open - a.open);

    const wardMap: Record<number, number> = {};
    dumps.forEach((d) => {
      if (d.status !== 'resolved') {
        wardMap[d.ward_id] = (wardMap[d.ward_id] || 0) + 1;
      }
    });
    const topWards = Object.entries(wardMap)
      .map(([id, open]) => {
        const w = wards.find((x) => x.id === Number(id));
        return { name: w ? `Ward ${w.ward_number}: ${w.name}` : `Ward ${id}`, zone: w?.zone, open };
      })
      .sort((a, b) => b.open - a.open)
      .slice(0, 6);

    const constMap: Record<number, { open: number; resolved: number }> = {};
    dumps.forEach((d) => {
      if (!constMap[d.constituency_id]) constMap[d.constituency_id] = { open: 0, resolved: 0 };
      if (d.status === 'resolved') constMap[d.constituency_id].resolved++;
      else constMap[d.constituency_id].open++;
    });
    const constituencyStats = constituencies
      .map((c) => {
        const s = constMap[c.id] || { open: 0, resolved: 0 };
        const t = s.open + s.resolved;
        return {
          name: c.name,
          mla: c.mla_name,
          party: c.party,
          open: s.open,
          resolved: s.resolved,
          cleanRate: pct(s.resolved, t),
        };
      })
      .filter((c) => c.open + c.resolved > 0)
      .sort((a, b) => b.open - a.open)
      .slice(0, 8);

    const recentActivity = [
      ...reports.map((r) => ({
        type: 'report' as const,
        at: r.created_at,
        id: r.id,
        dumpId: r.dump_id,
        label: r.citizen_text
          ? `Grievance: ${r.citizen_text.slice(0, 60)}${r.citizen_text.length > 60 ? '…' : ''}`
          : 'New citizen grievance report',
      })),
      ...verifications.map((v) => ({
        type: 'vote' as const,
        at: v.created_at,
        id: v.id,
        dumpId: v.dump_id,
        label: v.vote_type === 'cleaned' ? 'Marked as cleaned' : 'Confirmed still exists',
      })),
      ...dumps.map((d) => ({
        type: 'dump' as const,
        at: d.created_at,
        id: d.id,
        dumpId: d.id,
        label: `Site reported · ${d.status.replace('_', ' ')}`,
      })),
    ]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 12);

    const maxZoneOpen = Math.max(...zoneStats.map((z) => z.open), 1);

    return {
      active, pending, resolved, total, withPhotos, withoutPhotos,
      reportsThisWeek, votesThisWeek, newDumpsThisWeek,
      stillExists, cleaned, grievanceCount, avgConfidence, highPriority,
      zoneStats, topWards, constituencyStats, recentActivity, maxZoneOpen,
      resolutionRate: pct(resolved, total),
      openRate: pct(active + pending, total),
    };
  }, [dumps, reports, verifications]);

  const statusTotal = analytics.active + analytics.pending + analytics.resolved || 1;

  return (
    <div className="flex flex-col gap-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-natural-clay/15 to-white border border-natural-clay/25 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-natural-clay">Open sites</span>
            <AlertTriangle className="w-4 h-4 text-natural-clay" />
          </div>
          <p className="text-4xl font-serif font-bold text-natural-heading mt-2">
            {analytics.active + analytics.pending}
          </p>
          <p className="text-[11px] text-[#7A7872] mt-1">
            {analytics.active} active · {analytics.pending} pending verify
          </p>
        </div>
        <div className="bg-gradient-to-br from-natural-sage/15 to-white border border-natural-sage/25 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-natural-sage">Resolved</span>
            <CheckCircle className="w-4 h-4 text-natural-sage" />
          </div>
          <p className="text-4xl font-serif font-bold text-natural-heading mt-2">{analytics.resolved}</p>
          <p className="text-[11px] text-[#7A7872] mt-1">{analytics.resolutionRate}% resolution rate</p>
        </div>
        <div className="bg-white border border-natural-sand rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#7A7872]">This week</span>
            <TrendingUp className="w-4 h-4 text-natural-sage" />
          </div>
          <p className="text-4xl font-serif font-bold text-natural-heading mt-2">{analytics.newDumpsThisWeek}</p>
          <p className="text-[11px] text-[#7A7872] mt-1">
            new sites · {analytics.reportsThisWeek} photos · {analytics.votesThisWeek} votes
          </p>
        </div>
        <div className="bg-white border border-natural-sand rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#7A7872]">Grievances</span>
            <Users className="w-4 h-4 text-natural-heading" />
          </div>
          <p className="text-4xl font-serif font-bold text-natural-heading mt-2">{analytics.grievanceCount}</p>
          <p className="text-[11px] text-[#7A7872] mt-1">citizen-written reports filed</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Status breakdown */}
        <div className="lg:col-span-5 bg-white border border-natural-sand rounded-3xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-natural-heading flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-natural-clay" />
            Site status breakdown
          </h3>
          <div className="h-4 rounded-full overflow-hidden flex mb-4">
            <div
              className="bg-natural-clay"
              style={{ width: `${(analytics.active / statusTotal) * 100}%` }}
              title={`Active: ${analytics.active}`}
            />
            <div
              className="bg-yellow-400"
              style={{ width: `${(analytics.pending / statusTotal) * 100}%` }}
              title={`Pending: ${analytics.pending}`}
            />
            <div
              className="bg-natural-sage"
              style={{ width: `${(analytics.resolved / statusTotal) * 100}%` }}
              title={`Resolved: ${analytics.resolved}`}
            />
          </div>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="text-center p-3 bg-natural-light-clay/50 rounded-2xl">
              <span className="text-2xl font-bold text-natural-clay">{analytics.active}</span>
              <p className="text-[10px] font-mono text-[#7A7872] mt-0.5">Active</p>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-2xl">
              <span className="text-2xl font-bold text-yellow-700">{analytics.pending}</span>
              <p className="text-[10px] font-mono text-[#7A7872] mt-0.5">Pending</p>
            </div>
            <div className="text-center p-3 bg-natural-light-sage/50 rounded-2xl">
              <span className="text-2xl font-bold text-natural-sage">{analytics.resolved}</span>
              <p className="text-[10px] font-mono text-[#7A7872] mt-0.5">Resolved</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-natural-sand">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-[#A3A199]" />
              <div>
                <p className="text-xs font-bold text-natural-heading">{analytics.withPhotos} with photos</p>
                <p className="text-[10px] text-[#7A7872]">{analytics.withoutPhotos} location-only</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-natural-clay" />
              <div>
                <p className="text-xs font-bold text-natural-heading">{analytics.highPriority} high priority</p>
                <p className="text-[10px] text-[#7A7872]">score ≥ 70 · avg {analytics.avgConfidence}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Zone performance */}
        <div className="lg:col-span-7 bg-white border border-natural-sand rounded-3xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-natural-heading flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-natural-sage" />
            Open dumps by GHMC zone
          </h3>
          <div className="flex flex-col gap-3">
            {analytics.zoneStats.map((z) => (
              <div key={z.name}>
                <BarRow
                  label={`${z.name} Zone`}
                  sub={`${z.resolved} resolved · ${z.cleanRate}% clean rate`}
                  value={z.open}
                  max={analytics.maxZoneOpen}
                  color="bg-natural-clay"
                />
              </div>
            ))}
            {analytics.zoneStats.length === 0 && (
              <p className="text-xs text-[#A3A199] text-center py-6">No zone data yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MLA constituencies */}
        <div className="bg-white border border-natural-sand rounded-3xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-natural-heading mb-4">MLA constituency scoreboard</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] font-mono uppercase text-[#7A7872] border-b border-natural-sand">
                  <th className="pb-2 pr-2">Constituency</th>
                  <th className="pb-2 pr-2 text-center">Open</th>
                  <th className="pb-2 pr-2 text-center">Resolved</th>
                  <th className="pb-2 text-right">Clean %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-natural-sand/40">
                {analytics.constituencyStats.map((c) => (
                  <tr key={c.name} className="hover:bg-natural-bg/50">
                    <td className="py-2.5 pr-2">
                      <span className="font-semibold text-natural-heading block">{c.name}</span>
                      <span className="text-[10px] text-[#7A7872]">{c.mla} · {c.party}</span>
                    </td>
                    <td className="py-2.5 text-center">
                      <span className={`font-mono font-bold ${c.open > 0 ? 'text-natural-clay' : 'text-[#A3A199]'}`}>
                        {c.open}
                      </span>
                    </td>
                    <td className="py-2.5 text-center font-mono text-natural-sage font-bold">{c.resolved}</td>
                    <td className="py-2.5 text-right">
                      <span className={`font-mono font-bold ${c.cleanRate >= 50 ? 'text-natural-sage' : 'text-natural-clay'}`}>
                        {c.cleanRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Votes + top wards */}
        <div className="flex flex-col gap-6">
          <div className="bg-white border border-natural-sand rounded-3xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-natural-heading flex items-center gap-2 mb-4">
              <Vote className="w-4 h-4 text-natural-sage" />
              Citizen verification votes
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-natural-light-clay/60 rounded-2xl p-4 text-center">
                <p className="text-3xl font-bold text-natural-clay">{analytics.stillExists}</p>
                <p className="text-[10px] font-mono text-[#7A7872] mt-1 uppercase">Still exists</p>
              </div>
              <div className="bg-natural-light-sage/60 rounded-2xl p-4 text-center">
                <p className="text-3xl font-bold text-natural-sage">{analytics.cleaned}</p>
                <p className="text-[10px] font-mono text-[#7A7872] mt-1 uppercase">Marked cleaned</p>
              </div>
            </div>
            <p className="text-[11px] text-[#7A7872] mt-3 leading-relaxed">
              3 independent &quot;cleaned&quot; votes within 12h auto-resolve a site. Ratio:{' '}
              <strong>{analytics.cleaned > 0 ? (analytics.stillExists / analytics.cleaned).toFixed(1) : '—'}</strong>{' '}
              still-exists per cleaned vote.
            </p>
          </div>

          <div className="bg-white border border-natural-sand rounded-3xl p-6 shadow-sm flex-1">
            <h3 className="text-sm font-bold text-natural-heading mb-4">Wards needing attention</h3>
            <div className="flex flex-col gap-2.5">
              {analytics.topWards.map((w, i) => (
                <div key={w.name} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-natural-ivory border border-natural-sand flex items-center justify-center text-[10px] font-mono font-bold text-[#7A7872]">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-natural-heading truncate">{w.name}</p>
                    <p className="text-[10px] text-[#7A7872]">{w.zone}</p>
                  </div>
                  <span className="text-sm font-mono font-bold text-natural-clay">{w.open}</span>
                </div>
              ))}
              {analytics.topWards.length === 0 && (
                <p className="text-xs text-natural-sage text-center py-4">All wards clear</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-white border border-natural-sand rounded-3xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-natural-heading flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-[#7A7872]" />
          Recent activity
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {analytics.recentActivity.map((item) => {
            const dump = dumps.find((d) => d.id === item.dumpId);
            return (
              <div
                key={`${item.type}-${item.id}`}
                className="flex items-start gap-2.5 p-3 rounded-2xl bg-natural-ivory/60 border border-natural-sand/50"
              >
                <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                  item.type === 'vote'
                    ? item.label.includes('cleaned') ? 'bg-natural-sage' : 'bg-natural-clay'
                    : item.type === 'report' ? 'bg-blue-400' : 'bg-yellow-500'
                }`} />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-natural-heading">{item.label}</p>
                  <p className="text-[10px] text-[#7A7872] truncate" title={dump?.address_text}>
                    {dump?.address_text || item.dumpId}
                  </p>
                  <p className="text-[9px] font-mono text-[#A3A199] mt-0.5">
                    {new Date(item.at).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
