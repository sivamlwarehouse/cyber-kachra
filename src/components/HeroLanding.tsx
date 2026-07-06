import { motion } from 'motion/react';
import {
  MapPin, Camera, Shield, ChevronDown, Sparkles, CheckCircle, Users,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface HeroLandingProps {
  onReport: () => void;
  onExplore: () => void;
  stats?: {
    active: number;
    resolved: number;
    total_reported: number;
    cleaned_this_week?: number;
    avg_cleanup_days?: number;
  };
}

export default function HeroLanding({ onReport, onExplore, stats }: HeroLandingProps) {
  const { t } = useLanguage();
  const h = t.hero;
  const a = t.app;

  const cleanedWeek = stats?.cleaned_this_week ?? stats?.resolved ?? 0;
  const avgDays = stats?.avg_cleanup_days ?? 0;

  const trustItems = [
    h.trust1, h.trust2, h.trust3, h.trust4, h.trust5,
  ];

  return (
    <section className="relative overflow-hidden border-b border-natural-sand">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-status-pending/10 blur-3xl" />
        <div className="absolute bottom-0 -left-16 w-48 h-48 rounded-full bg-status-clean/10 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 w-full">
        <div className="flex flex-col gap-5">
          <div className="flex justify-center md:justify-start">
            <span className="inline-flex items-center gap-2 bg-white border border-natural-sand rounded-full px-3 py-1 text-[10px] font-mono font-bold text-status-clean uppercase tracking-wider">
              <Shield className="w-3.5 h-3.5" />
              {h.badge}
            </span>
          </div>

          <div className="text-center md:text-left max-w-2xl">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-natural-heading leading-tight tracking-tight">
              {h.headline}
            </h2>
            <p className="mt-2 text-sm text-[#7A7872] font-medium">
              {h.subtitle}
            </p>
          </div>

          {stats && (
            <div className="flex flex-wrap justify-center md:justify-start gap-2.5">
              {[
                { label: h.activeComplaints, value: stats.active, color: 'text-status-active border-status-active/30 bg-status-active/10' },
                { label: h.cleanedThisWeek, value: cleanedWeek, color: 'text-status-clean border-status-clean/30 bg-status-clean/10' },
                {
                  label: h.avgCleanup,
                  value: avgDays > 0 ? h.avgCleanupDays.replace('{days}', String(avgDays)) : '—',
                  color: 'text-status-pending border-status-pending/30 bg-status-pending/10',
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className={`border rounded-xl px-4 py-2.5 min-w-[110px] text-center md:text-left ${s.color}`}
                >
                  <span className="text-xl font-bold block leading-none">{s.value}</span>
                  <span className="text-[9px] font-mono uppercase tracking-wider opacity-80 mt-1 block">{s.label}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2.5 justify-center md:justify-start items-stretch sm:items-center">
            <motion.button
              onClick={onReport}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-status-active hover:opacity-90 text-white font-bold px-8 py-4 rounded-full text-sm shadow-lg shadow-status-active/25 cursor-pointer flex items-center justify-center gap-2.5 sm:min-w-[260px]"
            >
              <Camera className="w-5 h-5" />
              {h.reportBtn}
            </motion.button>
            <button
              onClick={onExplore}
              className="text-[#7A7872] hover:text-natural-heading font-medium px-4 py-2 rounded-full text-xs cursor-pointer flex items-center justify-center gap-1.5 underline-offset-2 hover:underline"
            >
              <MapPin className="w-3.5 h-3.5" />
              {h.exploreBtn}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1 text-[11px] text-[#7A7872]">
            <span className="flex items-center gap-1.5 font-semibold text-natural-heading">
              <Users className="w-4 h-4 text-status-clean" />
              {a.citizensJoined.replace('{count}', '8,000+')}
            </span>
            <span className="hidden sm:inline text-natural-sand">·</span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-status-pending" />
              {a.dumpsCleaned.replace('{count}', String(stats?.total_reported ?? 0))}
            </span>
          </div>

          <div className="bg-natural-ivory border border-natural-sand rounded-2xl p-3.5">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#A3A199] mb-2.5">
              {h.trustTitle}
            </p>
            <div className="flex flex-wrap gap-2">
              {trustItems.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1.5 bg-white border border-natural-sand rounded-full px-3 py-1.5 text-[11px] font-semibold text-natural-heading"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-status-clean" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <motion.button
        onClick={onExplore}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex w-full items-center justify-center gap-1 py-3 text-[#A3A199] hover:text-status-active transition-colors cursor-pointer border-t border-natural-sand/60"
        aria-label="Scroll to live tracker"
      >
        <span className="text-[10px] font-mono uppercase tracking-wider">{h.scrollCue}</span>
        <motion.div animate={{ y: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
          <ChevronDown className="w-4 h-4" />
        </motion.div>
      </motion.button>
    </section>
  );
}
