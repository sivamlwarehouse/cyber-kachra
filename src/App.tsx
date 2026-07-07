import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Dump, Ward, Constituency, LeaderboardEntry } from './types';
import { wards, constituencies } from './wards_constituencies';
import { snapToReportLocation, HYDERABAD_CENTER, clampToHyderabad } from './hyderabad-bounds';
import StatsDashboard from './components/StatsDashboard';
import MapContainer from './components/MapContainer';
import Leaderboard from './components/Leaderboard';
import ReportDrawer from './components/ReportDrawer';
import ReportSuccessModal from './components/ReportSuccessModal';
import DumpDetailDrawer from './components/DumpDetailDrawer';
import HeroLanding from './components/HeroLanding';
import LanguageToggle from './components/LanguageToggle';
import { useLanguage } from './i18n/LanguageContext';
import { Trash2, Sparkles, HelpCircle } from 'lucide-react';

export default function App() {
  const { t } = useLanguage();
  const [dumps, setDumps] = useState<Dump[]>([]);
  const [selectedDump, setSelectedDump] = useState<Dump | null>(null);
  
  // Stats and leaderboard
  const [overview, setOverview] = useState({
    total_reported: 0,
    citizen_reports: 0,
    active: 0,
    pending: 0,
    resolved: 0,
    cleaned_this_week: 0,
    avg_cleanup_days: 0,
  });
  const [constituencyLeaderboard, setConstituencyLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [wardLeaderboard, setWardLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [zoneLeaderboard, setZoneLeaderboard] = useState<LeaderboardEntry[]>([]);

  // States
  const [reportMode, setReportMode] = useState(false);
  const [reportCoords, setReportCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [reportInitialAddress, setReportInitialAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [globalMessage, setGlobalMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);
  const [successModal, setSuccessModal] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  });

  // Simulated Device Hash
  const [userDeviceHash, setUserDeviceHash] = useState<string>('');

  // Initial load
  useEffect(() => {
    // Set up Device Hash
    let hash = localStorage.getItem('cyber_kachra_device_hash');
    if (!hash) {
      hash = 'citizen-' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('cyber_kachra_device_hash', hash);
    }
    setUserDeviceHash(hash);

    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Parallel fetches for dumps and stats
      const [dumpsRes, statsRes] = await Promise.all([
        fetch('/api/dumps'),
        fetch('/api/stats')
      ]);

      if (!dumpsRes.ok || !statsRes.ok) {
        throw new Error("Failed to retrieve live data from municipal tracker.");
      }

      const dumpsData = await dumpsRes.json();
      const statsData = await statsRes.json();

      setDumps(dumpsData);
      setOverview(statsData.overview);
      setConstituencyLeaderboard(statsData.constituencyStats);
      setWardLeaderboard(statsData.wardStats);
      setZoneLeaderboard(statsData.zoneStats);

      // Keep selected dump in sync if it was selected
      if (selectedDump) {
        const updatedDump = dumpsData.find((d: Dump) => d.id === selectedDump.id);
        if (updatedDump) {
          setSelectedDump(updatedDump);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || t.app.connectionError);
    } finally {
      setLoading(false);
    }
  };


  // Anonymous device hash for vote deduplication (not shown in UI)
  const handleRequestGeolocation = () => {
    const fallback = {
      lat: HYDERABAD_CENTER[0],
      lng: HYDERABAD_CENTER[1],
    };

    if (!navigator.geolocation) {
      showNotice(t.app.geolocationUnsupported, "info");
      setReportCoords(snapToReportLocation(fallback.lat, fallback.lng));
      return;
    }

    const applyCoords = (lat: number, lng: number, successMessage: string) => {
      const snapped = snapToReportLocation(lat, lng);
      setReportCoords(snapped);
      showNotice(successMessage, successMessage === t.app.gpsSuccess ? "success" : "info");
    };

    showNotice(t.app.gpsRetrieving, "info");

    const tryLowAccuracy = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          applyCoords(position.coords.latitude, position.coords.longitude, t.app.gpsSuccess);
        },
        (err) => {
          console.warn("Geolocation failed, falling back to map center:", err);
          showNotice(t.app.gpsFallback, "info");
          setReportCoords(snapToReportLocation(fallback.lat, fallback.lng));
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 },
      );
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        applyCoords(position.coords.latitude, position.coords.longitude, t.app.gpsSuccess);
      },
      () => tryLowAccuracy(),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  };

  const showNotice = (text: string, type: 'success' | 'info') => {
    setGlobalMessage({ text, type });
    setTimeout(() => setGlobalMessage(null), 8000);
  };

  const getDeviceHash = useCallback(() => {
    if (userDeviceHash) return userDeviceHash;
    const stored = localStorage.getItem('cyber_kachara_device_hash');
    if (stored) {
      setUserDeviceHash(stored);
      return stored;
    }
    const hash = `citizen-${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem('cyber_kachara_device_hash', hash);
    setUserDeviceHash(hash);
    return hash;
  }, [userDeviceHash]);

  const handleReportModeActivate = () => {
    setSelectedDump(null);
    setReportInitialAddress('');
    setReportMode(true);
    requestAnimationFrame(() => {
      document.getElementById('report-map')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    handleRequestGeolocation();
  };

  const handleCancelReport = () => {
    setReportMode(false);
    setReportCoords(null);
    setReportInitialAddress('');
  };

  const handleUpdateReportCoords = useCallback((coords: { lat: number; lng: number }) => {
    setReportCoords(clampToHyderabad(coords.lat, coords.lng));
  }, []);

  const handleReportSubmit = async (data: {
    lat: number;
    lng: number;
    address_text: string;
    citizen_text: string;
    severity: string;
    complaint_type: string;
    waste_type: string;
    image_url: string;
    force_new?: boolean;
  }) => {
    try {
      const res = await fetch('/api/dumps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          device_hash: getDeviceHash(),
        }),
      });

      const resData = await res.json().catch(() => ({}));

      if (!res.ok) {
        return { error: resData.error || 'Failed to post report.' };
      }

      if (resData.action === 'soft_catch_prompt') {
        return resData;
      }

      const msg =
        resData.message ||
        'Your complaint was submitted successfully! Thank you for reporting.';

      if (resData.dump) {
        const dump = resData.dump as Dump;
        setDumps((prev) => {
          const exists = prev.some((d) => d.id === dump.id);
          if (resData.action === 'created_new') {
            return exists ? prev : [dump, ...prev];
          }
          return prev.map((d) => (d.id === dump.id ? dump : d));
        });
        setOverview((prev) => ({
          ...prev,
          citizen_reports: prev.citizen_reports + 1,
          ...(resData.action === 'created_new'
            ? {
                active: prev.active + 1,
                total_reported: prev.total_reported + 1,
              }
            : {}),
        }));
      }

      setSuccessModal({ open: true, message: msg });
      showNotice(msg, 'success');
      setReportMode(false);
      setReportCoords(null);
      setReportInitialAddress('');
      await fetchData();
      return resData;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to upload report.';
      showNotice(message, 'info');
      return { error: message };
    }
  };

  const handleSuccessModalClose = useCallback(() => {
    setSuccessModal({ open: false, message: '' });
  }, []);

  const handleVoteSubmit = async (voteType: 'still_exists' | 'cleaned') => {
    if (!selectedDump) return;

    const res = await fetch(`/api/dumps/${selectedDump.id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vote_type: voteType,
        device_hash: userDeviceHash
      })
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || "Failed to submit civic feedback.");
    }

    await fetchData();
  };

  // Locate leader or ward on map
  const handleSelectLeaderboardEntity = (type: 'constituency' | 'ward', id: number) => {
    if (type === 'constituency') {
      const item = constituencies.find(c => c.id === id);
      if (item) {
        setSelectedDump(null);
        setReportMode(false);
        // Create a temporary focal point or mock selected dump to navigate
        const map = (window as any).L?.map; // If map global or we can trigger lat/lng refocus
        // Our map automatically focuses when selectedDump updates. 
        // We can simulate an empty selected dump container or refocus by finding a dump in that area
        const dumpInArea = dumps.find(d => d.constituency_id === id);
        if (dumpInArea) {
          setSelectedDump(dumpInArea);
        } else {
          // Centroid
          setSelectedDump({
            id: `centroid-${id}`,
            lat: item.center[0],
            lng: item.center[1],
            address_text: `${item.name} Assembly Area (No active dumps reported)`,
            ward_id: 0,
            constituency_id: id,
            status: 'resolved',
            confidence_score: 0,
            created_at: new Date().toISOString(),
            resolved_at: null,
            photos: []
          });
        }
      }
    } else {
      const item = wards.find(w => w.id === id);
      if (item) {
        setSelectedDump(null);
        setReportMode(false);
        const dumpInArea = dumps.find(d => d.ward_id === id);
        if (dumpInArea) {
          setSelectedDump(dumpInArea);
        } else {
          setSelectedDump({
            id: `centroid-ward-${id}`,
            lat: item.center[0],
            lng: item.center[1],
            address_text: `${item.name} Ward (No active dumps reported)`,
            ward_id: id,
            constituency_id: 0,
            status: 'resolved',
            confidence_score: 0,
            created_at: new Date().toISOString(),
            resolved_at: null,
            photos: []
          });
        }
      }
    }
  };

  const scrollToTracker = () => {
    document.getElementById('tracker')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleReportFromHero = () => {
    scrollToTracker();
    setTimeout(() => handleReportModeActivate(), 400);
  };

  return (
    <div className="min-h-screen bg-natural-bg text-natural-text font-sans flex flex-col antialiased">
      <ReportSuccessModal
        open={successModal.open}
        message={successModal.message}
        onClose={handleSuccessModalClose}
      />
      {/* Header bar */}
      <header className="bg-white/80 border-b border-natural-sand text-natural-heading shadow-sm backdrop-blur-sm shrink-0">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-natural-sage rounded-2xl text-white shadow-sm flex items-center justify-center">
              <Trash2 className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight uppercase font-mono text-natural-heading">
                  {t.app.title}
                </h1>
                <span className="bg-natural-clay/10 text-natural-clay font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-lg border border-natural-clay/20">
                  {t.app.version}
                </span>
              </div>
              <p className="text-xs text-[#7A7872] font-medium mt-0.5">
                {t.app.tagline}
              </p>
            </div>
          </div>

          {/* Core Navigation, CTA and Info */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <LanguageToggle />
            <div className="text-right hidden md:block">
              <div className="text-[10px] text-[#A3A199] uppercase font-bold tracking-wider">
                {t.app.authorityFocus}
              </div>
              <div className="text-xs font-semibold text-natural-sage flex items-center justify-end gap-1">
                <span>{t.app.authorityLabel}</span>
              </div>
            </div>

            <button
              onClick={handleReportModeActivate}
              disabled={reportMode}
              className="bg-status-active hover:opacity-90 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-full text-xs tracking-tight shadow-md shadow-status-active/20 cursor-pointer flex items-center gap-1.5 transition-all w-full sm:w-auto justify-center"
            >
              <Sparkles className="w-4 h-4 fill-current" />
              <span>{t.app.reportCta}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Animated landing hero — first scroll */}
      <HeroLanding
        onReport={handleReportFromHero}
        onExplore={scrollToTracker}
        stats={overview}
      />

      {/* Main Body — live civic tracker */}
      <main id="tracker" className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6 overflow-hidden scroll-mt-4">
        
        {/* Global Notices / Alerts */}
        {globalMessage && (
          <div className={`p-3.5 rounded-2xl text-xs font-medium border animate-fadeIn shadow-sm flex items-center gap-2 ${
            globalMessage.type === 'success'
              ? 'bg-status-clean-light text-status-clean border-status-clean/30'
              : 'bg-natural-ivory text-natural-text border-natural-sand'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${
              globalMessage.type === 'success' ? 'bg-status-clean' : 'bg-status-pending'
            } animate-ping`}></div>
            <span>{globalMessage.text}</span>
          </div>
        )}

        {error && (
          <div className="bg-natural-light-clay border border-natural-clay/20 text-natural-clay p-4 rounded-2xl text-xs font-medium shadow-sm flex items-center gap-3">
            <span className="w-2.5 h-2.5 bg-natural-clay rounded-full animate-ping"></span>
            <span>{error}</span>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2 pb-1"
        >
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#A3A199]">{t.app.liveTracker}</span>
          <div className="h-px flex-1 bg-natural-sand" />
        </motion.div>

        {/* Stats Section */}
        <StatsDashboard
          overview={overview}
          onRefresh={fetchData}
          loading={loading}
        />

        {/* Dynamic Full screen/Workspace Layout */}
        <div className={`flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch min-h-[450px] ${reportMode ? 'max-lg:flex max-lg:flex-col max-lg:min-h-0' : ''}`}>
          {/* Map Column */}
          <div
            id="report-map"
            className={`lg:col-span-8 flex flex-col gap-3 h-full ${reportMode ? 'max-lg:min-h-[42vh] max-lg:shrink-0' : ''}`}
          >
            <div className="flex-1 relative min-h-[400px]">
              <MapContainer
                dumps={dumps}
                selectedDump={selectedDump}
                onSelectDump={(d) => {
                  setReportMode(false);
                  setSelectedDump(d);
                }}
                reportMode={reportMode}
                reportCoords={reportCoords}
                onUpdateReportCoords={handleUpdateReportCoords}
                wardLeaderboard={wardLeaderboard}
              />
            </div>

            {/* Helper Bar */}
            <div className="bg-white border border-natural-sand rounded-2xl p-3 flex items-center gap-2 text-[11px] text-[#7A7872] font-medium">
              <HelpCircle className="w-4 h-4 text-[#A3A199] shrink-0" />
              <span>{t.app.mapHint}</span>
            </div>
          </div>

          {/* Leaderboard / Details Panel Column */}
          <div className="lg:col-span-4 h-full max-lg:relative">
            {reportMode ? (
              <ReportDrawer
                onReportSuccess={() => {}}
                reportCoords={reportCoords}
                onRequestGeolocation={handleRequestGeolocation}
                onCancel={handleCancelReport}
                initialAddressText={reportInitialAddress}
                onSubmitReport={handleReportSubmit}
              />
            ) : selectedDump ? (
              <DumpDetailDrawer
                dump={selectedDump}
                ward={wards.find(w => w.id === selectedDump.ward_id)}
                constituency={constituencies.find(c => c.id === selectedDump.constituency_id)}
                onVote={handleVoteSubmit}
                onClose={() => setSelectedDump(null)}
                onAddPhoto={() => {
                  setReportCoords({ lat: selectedDump.lat, lng: selectedDump.lng });
                  setReportInitialAddress(`Additional report photo for ${selectedDump.address_text}`);
                  setReportMode(true);
                }}
              />
            ) : (
              <Leaderboard
                constituencies={constituencyLeaderboard}
                wards={wardLeaderboard}
                zones={zoneLeaderboard}
                onSelectEntity={handleSelectLeaderboardEntity}
              />
            )}
          </div>
        </div>
      </main>

      {/* Footer copyright */}
      <footer className="bg-white border-t border-natural-sand py-5 text-center text-[11px] text-[#A3A199] font-medium mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div>
            {t.app.footer}
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-natural-sage font-bold">{t.app.anonymity}</span>
            <span className="text-natural-sand">•</span>
            <span className="text-natural-sage font-bold">{t.app.scoreboard}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
