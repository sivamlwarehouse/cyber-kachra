import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Camera, MapPin, Truck, Clock, Users, X } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface ReportSuccessModalProps {
  open: boolean;
  message?: string;
  onClose: () => void;
}

const STEPS = [
  { key: 'photo', icon: Camera, delay: 0 },
  { key: 'location', icon: MapPin, delay: 600 },
  { key: 'sent', icon: Truck, delay: 1200 },
  { key: 'verification', icon: Clock, delay: 1800 },
  { key: 'community', icon: Users, delay: 2400 },
] as const;

export default function ReportSuccessModal({ open, message, onClose }: ReportSuccessModalProps) {
  const { t } = useLanguage();
  const s = t.success;
  const [visibleSteps, setVisibleSteps] = useState(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) {
      setVisibleSteps(0);
      return;
    }
    const timers = STEPS.map((step, i) =>
      setTimeout(() => setVisibleSteps(i + 1), step.delay),
    );
    const autoClose = setTimeout(() => onCloseRef.current(), 5500);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(autoClose);
    };
  }, [open]);

  const stepLabels: Record<string, string> = {
    photo: s.stepPhoto,
    location: s.stepLocation,
    sent: s.stepSent,
    verification: s.stepVerification,
    community: s.stepCommunity,
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => onCloseRef.current()}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 relative overflow-hidden"
          >
            <button
              onClick={() => onCloseRef.current()}
              className="absolute top-4 right-4 p-1.5 rounded-full text-[#A3A199] hover:bg-natural-ivory cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col items-center text-center gap-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.1, damping: 12 }}
                className="w-16 h-16 rounded-full bg-status-clean/15 flex items-center justify-center"
              >
                <CheckCircle2 className="w-9 h-9 text-status-clean" />
              </motion.div>

              <div>
                <h2 className="text-lg font-bold text-natural-heading">{s.title}</h2>
                <p className="text-xs text-[#7A7872] mt-1 leading-relaxed">
                  {message || s.body}
                </p>
              </div>

              <div className="w-full flex flex-col gap-2.5 mt-1">
                {STEPS.map((step, i) => {
                  const Icon = step.icon;
                  const done = visibleSteps > i;
                  return (
                    <motion.div
                      key={step.key}
                      initial={{ opacity: 0, x: -12 }}
                      animate={done ? { opacity: 1, x: 0 } : { opacity: 0.3, x: 0 }}
                      transition={{ duration: 0.35 }}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-colors ${
                        done
                          ? 'bg-status-clean/10 border-status-clean/30'
                          : 'bg-natural-ivory border-natural-sand'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        done ? 'bg-status-clean text-white' : 'bg-natural-sand text-[#A3A199]'
                      }`}>
                        {done ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <Icon className="w-4 h-4" />
                        )}
                      </div>
                      <span className={`text-xs font-semibold text-left ${
                        done ? 'text-natural-heading' : 'text-[#A3A199]'
                      }`}>
                        {stepLabels[step.key]}
                      </span>
                    </motion.div>
                  );
                })}
              </div>

              <button
                onClick={() => onCloseRef.current()}
                className="w-full mt-2 bg-status-clean hover:opacity-90 text-white font-bold py-3 rounded-full text-xs cursor-pointer"
              >
                {s.doneBtn}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
