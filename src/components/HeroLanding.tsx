import { motion } from 'motion/react';
import {
  MapPin, Camera, Shield, BarChart3, ChevronDown, Sparkles, Trash2, Users, CheckCircle,
} from 'lucide-react';

import { useLanguage } from '../i18n/LanguageContext';

interface HeroLandingProps {
  onReport: () => void;
  onExplore: () => void;
  stats?: {
    active: number;
    resolved: number;
    total_reported: number;
  };
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.15 },
  },
};

const item = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function HeroLanding({ onReport, onExplore, stats }: HeroLandingProps) {
  const { t } = useLanguage();
  const h = t.hero;

  const features = [
    { icon: Camera, title: h.feat1Title, desc: h.feat1Desc, color: 'text-natural-clay', bg: 'bg-natural-light-clay' },
    { icon: MapPin, title: h.feat2Title, desc: h.feat2Desc, color: 'text-natural-sage', bg: 'bg-natural-light-sage' },
    { icon: Users, title: h.feat3Title, desc: h.feat3Desc, color: 'text-natural-heading', bg: 'bg-natural-ivory' },
    { icon: BarChart3, title: h.feat4Title, desc: h.feat4Desc, color: 'text-natural-clay', bg: 'bg-natural-light-clay' },
  ];

  const steps = [
    { n: '01', text: h.step1 },
    { n: '02', text: h.step2 },
    { n: '03', text: h.step3 },
    { n: '04', text: h.step4 },
  ];

  return (
    <section className="relative min-h-[calc(100vh-5rem)] flex flex-col justify-center overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-natural-clay/10 blur-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 -left-32 w-[28rem] h-[28rem] rounded-full bg-natural-sage/10 blur-3xl"
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-natural-sand/40 blur-2xl"
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-16 w-full">
        <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-10">
          {/* Badge */}
          <motion.div variants={item} className="flex justify-center md:justify-start">
            <span className="inline-flex items-center gap-2 bg-white/80 backdrop-blur border border-natural-sand rounded-full px-4 py-1.5 text-[11px] font-mono font-bold text-natural-sage uppercase tracking-wider shadow-sm">
              <Shield className="w-3.5 h-3.5" />
              {h.badge}
            </span>
          </motion.div>

          {/* Headline */}
          <div className="text-center md:text-left max-w-3xl">
            <motion.h2
              variants={item}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-natural-heading leading-[1.08] tracking-tight"
            >
              {h.headline1}{' '}
              <span className="text-natural-clay italic">{h.headline2}</span>
              <br />
              {h.headline3}
            </motion.h2>
            <motion.p
              variants={item}
              className="mt-5 text-base md:text-lg text-[#7A7872] font-medium leading-relaxed max-w-2xl mx-auto md:mx-0"
            >
              <strong className="text-natural-heading font-semibold">{h.brand}</strong> {h.body}
            </motion.p>
          </div>

          {/* Live stats strip */}
          {stats && (
            <motion.div
              variants={item}
              className="flex flex-wrap justify-center md:justify-start gap-3 md:gap-4"
            >
              {[
                { label: h.sitesTracked, value: stats.total_reported, accent: 'text-natural-heading' },
                { label: h.activeDumps, value: stats.active, accent: 'text-natural-clay' },
                { label: h.verifiedClean, value: stats.resolved, accent: 'text-natural-sage' },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + i * 0.1, duration: 0.4 }}
                  className="bg-white/90 backdrop-blur border border-natural-sand rounded-2xl px-5 py-3 shadow-sm min-w-[120px] text-center md:text-left"
                >
                  <motion.span
                    key={s.value}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`text-2xl font-serif font-bold block ${s.accent}`}
                  >
                    {s.value}
                  </motion.span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#A3A199]">{s.label}</span>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* CTAs */}
          <motion.div variants={item} className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
            <motion.button
              onClick={onReport}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="bg-natural-clay hover:opacity-90 text-white font-semibold px-8 py-3.5 rounded-full text-sm shadow-lg shadow-natural-clay/20 cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {h.reportBtn}
            </motion.button>
            <motion.button
              onClick={onExplore}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="bg-white hover:bg-natural-ivory text-natural-heading border border-natural-sand font-semibold px-8 py-3.5 rounded-full text-sm cursor-pointer flex items-center justify-center gap-2"
            >
              <MapPin className="w-4 h-4 text-natural-sage" />
              {h.exploreBtn}
            </motion.button>
          </motion.div>

          {/* How it works */}
          <motion.div variants={item} className="pt-2">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#A3A199] mb-4 text-center md:text-left">
              {h.howItWorks}
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {steps.map((step, i) => (
                <motion.div
                  key={step.n}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 + i * 0.1, duration: 0.45 }}
                  className="flex items-start gap-2.5 bg-white/60 backdrop-blur border border-natural-sand/80 rounded-2xl p-3.5"
                >
                  <span className="text-lg font-serif font-bold text-natural-clay/80">{step.n}</span>
                  <span className="text-xs font-medium text-natural-text leading-snug">{step.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Feature cards */}
          <motion.div
            variants={item}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4"
          >
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="bg-white border border-natural-sand rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`w-10 h-10 rounded-2xl ${f.bg} ${f.color} flex items-center justify-center mb-3`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-natural-heading">{f.title}</h3>
                <p className="text-[11px] text-[#7A7872] mt-1.5 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Trust line */}
          <motion.div
            variants={item}
            className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-[11px] text-[#7A7872] font-medium pt-2"
          >
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-natural-sage" />
              {h.trust1}
            </span>
            <span className="hidden sm:inline text-natural-sand">·</span>
            <span className="flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5 text-natural-clay" />
              {h.trust2}
            </span>
            <span className="hidden sm:inline text-natural-sand">·</span>
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-natural-sage" />
              {h.trust3}
            </span>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll cue */}
      <motion.button
        onClick={onExplore}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-[#A3A199] hover:text-natural-clay transition-colors cursor-pointer"
        aria-label="Scroll to live tracker"
      >
        <span className="text-[10px] font-mono uppercase tracking-wider">{h.scrollCue}</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </motion.button>
    </section>
  );
}
