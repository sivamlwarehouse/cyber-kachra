import React, { useState, useEffect, useCallback } from 'react';
import { Dump, Ward, Constituency, LeaderboardEntry } from './types';
import { wards, constituencies } from './wards_constituencies';
import StatsDashboard from './components/StatsDashboard';
import MapContainer from './components/MapContainer';
import Leaderboard from './components/Leaderboard';
import ReportDrawer from './components/ReportDrawer';
import DumpDetailDrawer from './components/DumpDetailDrawer';
import { Trash2, Sparkles, HelpCircle } from 'lucide-react';

export default function App() {
  const [dumps, setDumps] = useState<Dump[]>([]);
  const [selectedDump, setSelectedDump] = useState<Dump | null>(null);
  
  // Stats and leaderboard
  const [overview, setOverview] = useState({ total_reported: 0, active: 0, pending: 0, resolved: 0 });
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
      setError(err.message || "Connection failure with Hyderabad Civic servers.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshDeviceHash = () => {
    const newHash = 'citizen-' + Math.random().toString(36).substring(2, 11);
    localStorage.setItem('cyber_kachra_device_hash', newHash);
    setUserDeviceHash(newHash);
    
    setGlobalMessage({
      text: "Simulated new citizen device. Ready to submit separate votes!",
      type: 'info'
    });
    setTimeout(() => setGlobalMessage(null), 4000);
  };

  const handleRequestGeolocation = () => {
    if (!navigator.geolocation) {
      showNotice("Geolocation is not supported by your browser.", "info");
      // Fallback center of Hyderabad
      setReportCoords({ lat: 17.3850, lng: 78.4867 });
      return;
    }

    showNotice("Retrieving high-accuracy GPS coordinates...", "info");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setReportCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        showNotice("GPS location georeferenced successfully!", "success");
      },
      (err) => {
        console.warn("Geolocation permission error, falling back to map center:", err);
        showNotice("Could not determine GPS location automatically. Please tap on map to manually position pin.", "info");
        setReportCoords({ lat: 17.3850, lng: 78.4867 });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const showNotice = (text: string, type: 'success' | 'info') => {
    setGlobalMessage({ text, type });
    setTimeout(() => setGlobalMessage(null), 5000);
  };

  const handleReportModeActivate = () => {
    setSelectedDump(null);
    setReportInitialAddress('');
    setReportMode(true);
    handleRequestGeolocation();
  };

  const handleCancelReport = () => {
    setReportMode(false);
    setReportCoords(null);
    setReportInitialAddress('');
  };

  const handleUpdateReportCoords = useCallback((coords: { lat: number; lng: number }) => {
    setReportCoords(coords);
  }, []);

  const handleReportSubmit = async (data: {
    lat: number;
    lng: number;
    address_text: string;
    image_url: string;
    force_new?: boolean;
  }) => {
    try {
      const res = await fetch('/api/dumps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          device_hash: userDeviceHash
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to post report.");
      }

      const resData = await res.json();

      if (resData.action === 'soft_catch_prompt') {
        return resData; // Return to ReportDrawer to show potential duplicate
      }

      // Success
      await fetchData();
      setReportMode(false);
      setReportCoords(null);
      setReportInitialAddress('');
      return resData;
    } catch (err: any) {
      showNotice(err.message || "Failed to upload report.", "info");
      return null;
    }
  };

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

  return (
    <div className="min-h-screen bg-natural-bg text-natural-text font-sans flex flex-col antialiased">
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
                  CYBER-KACHRA
                </h1>
                <span className="bg-natural-clay/10 text-natural-clay font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-lg border border-natural-clay/20">
                  HYD V1.0
                </span>
              </div>
              <p className="text-xs text-[#7A7872] font-medium mt-0.5">
                Anonymous, zero-friction civic waste tracker for Greater Hyderabad
              </p>
            </div>
          </div>

          {/* Core Navigation, CTA and Info */}
          <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
            <div className="text-right hidden md:block">
              <div className="text-[10px] text-[#A3A199] uppercase font-bold tracking-wider">
                Authority Focus
              </div>
              <div className="text-xs font-semibold text-natural-sage flex items-center justify-end gap-1">
                <span>Elected MLAs & Municipal Wards</span>
              </div>
            </div>

            <button
              onClick={handleReportModeActivate}
              disabled={reportMode}
              className="bg-natural-clay hover:opacity-90 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-full text-xs tracking-tight shadow-sm cursor-pointer flex items-center gap-1.5 transition-all w-full sm:w-auto justify-center"
            >
              <Sparkles className="w-4 h-4 fill-current" />
              <span>Snap Garbage Dump</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6 overflow-hidden">
        
        {/* Global Notices / Alerts */}
        {globalMessage && (
          <div className={`p-3.5 rounded-2xl text-xs font-medium border animate-fadeIn shadow-sm flex items-center gap-2 ${
            globalMessage.type === 'success'
              ? 'bg-natural-light-sage text-natural-sage border-natural-light-sage'
              : 'bg-natural-ivory text-natural-text border-natural-sand'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${
              globalMessage.type === 'success' ? 'bg-natural-sage' : 'bg-natural-clay'
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

        {/* Stats Section */}
        <StatsDashboard
          overview={overview}
          onRefresh={fetchData}
          loading={loading}
        />

        {/* Dynamic Full screen/Workspace Layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch min-h-[450px]">
          {/* Map Column */}
          <div className="lg:col-span-8 flex flex-col gap-3 h-full">
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
              />
            </div>

            {/* Helper Bar */}
            <div className="bg-white border border-natural-sand rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#7A7872] font-medium">
              <div className="flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-[#A3A199]" />
                <span>Geotag drifts are auto-merged within 40m to prevent duplicates.</span>
              </div>
              <div className="flex items-center gap-1">
                <span>Citizen Device: </span>
                <span className="font-mono bg-natural-ivory border border-natural-sand px-1.5 py-0.5 rounded-lg text-natural-text truncate max-w-[120px]" title={userDeviceHash}>
                  {userDeviceHash}
                </span>
                <button
                  onClick={handleRefreshDeviceHash}
                  className="text-natural-clay hover:underline hover:text-natural-clay/80 cursor-pointer font-bold ml-1"
                >
                  Regen
                </button>
              </div>
            </div>
          </div>

          {/* Leaderboard / Details Panel Column */}
          <div className="lg:col-span-4 h-full">
            {reportMode ? (
              <ReportDrawer
                onReportSuccess={(msg) => {
                  showNotice(msg, "success");
                }}
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
                userDeviceHash={userDeviceHash}
                onRefreshDeviceHash={handleRefreshDeviceHash}
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
            &copy; 2026 Greater Hyderabad Citizenry. Built with zero barrier & radical transparency.
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-natural-sage font-bold">Total Anonymity Guarantee</span>
            <span className="text-natural-sand">•</span>
            <span className="text-natural-sage font-bold">MLA Public Scoreboard</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
