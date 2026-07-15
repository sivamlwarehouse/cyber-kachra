import React, { useEffect, useRef, useMemo, useState } from 'react';
import L from 'leaflet';
import { Dump, LeaderboardEntry } from '../types';
import { HYDERABAD_CENTER, HYDERABAD_LEAFLET_BOUNDS, clampToHyderabad } from '../hyderabad-bounds';
import { useLanguage } from '../i18n/LanguageContext';

interface MapContainerProps {
  dumps: Dump[];
  selectedDump: Dump | null;
  onSelectDump: (dump: Dump) => void;
  reportMode: boolean;
  reportCoords: { lat: number; lng: number } | null;
  onUpdateReportCoords: (coords: { lat: number; lng: number }) => void;
  wardLeaderboard?: LeaderboardEntry[];
  onLocateMe?: (coords: { lat: number; lng: number }) => void;
}

export default function MapContainer({
  dumps,
  selectedDump,
  onSelectDump,
  reportMode,
  reportCoords,
  onUpdateReportCoords,
  wardLeaderboard = [],
  onLocateMe,
}: MapContainerProps) {
  const { t } = useLanguage();
  const m = t.map;

  const mapInsights = useMemo(() => {
    const activeDumps = dumps.filter((d) => d.status === 'active');
    const mostDirtyWard = [...wardLeaderboard]
      .filter((w) => w.active_dumps > 0)
      .sort((a, b) => b.active_dumps - a.active_dumps)[0];

    const recentlyCleaned = [...dumps]
      .filter((d) => d.status === 'resolved' && d.resolved_at)
      .sort((a, b) => new Date(b.resolved_at!).getTime() - new Date(a.resolved_at!).getTime())[0];

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentByWard: Record<number, number> = {};
    dumps.forEach((d) => {
      if (new Date(d.created_at).getTime() >= weekAgo) {
        recentByWard[d.ward_id] = (recentByWard[d.ward_id] || 0) + 1;
      }
    });
    const trendingWardId = Object.entries(recentByWard).sort((a, b) => b[1] - a[1])[0]?.[0];
    const trendingWard = wardLeaderboard.find((w) => w.id === Number(trendingWardId));

    let nearestCount = 0;
    if (reportCoords) {
      nearestCount = activeDumps.filter((d) => {
        const dist = Math.sqrt(
          Math.pow((d.lat - reportCoords.lat) * 111000, 2) +
          Math.pow((d.lng - reportCoords.lng) * 111000 * Math.cos(reportCoords.lat * Math.PI / 180), 2),
        );
        return dist <= 2000;
      }).length;
    }

    return { mostDirtyWard, recentlyCleaned, trendingWard, nearestCount };
  }, [dumps, wardLeaderboard, reportCoords]);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const reportMarkerRef = useRef<L.Marker | null>(null);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);
  const prevReportCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setLocateError('Geolocation not supported.');
      return;
    }
    setLocating(true);
    setLocateError(null);

    let settled = false;
    const fallbackTimer = setTimeout(() => {
      if (!settled) {
        settled = true;
        setLocateError('GPS timed out. If in Private Mode, location may be blocked.');
        setLocating(false);
      }
    }, 15000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (settled) return;
        settled = true;
        clearTimeout(fallbackTimer);
        const { latitude, longitude } = pos.coords;
        const map = mapRef.current;
        if (map) {
          map.setView([latitude, longitude], Math.max(map.getZoom(), 16), { animate: true });
          if (userLocationMarkerRef.current) {
            userLocationMarkerRef.current.setLatLng([latitude, longitude]);
          } else {
            const icon = L.divIcon({
              html: '<div style="width:14px;height:14px;border-radius:50%;background:#2563EB;border:2.5px solid white;box-shadow:0 0 0 5px rgba(37,99,235,0.25);"></div>',
              className: '',
              iconSize: [14, 14],
              iconAnchor: [7, 7],
            });
            userLocationMarkerRef.current = L.marker([latitude, longitude], { icon, interactive: false }).addTo(map);
          }
        }
        if (onLocateMe) onLocateMe({ lat: latitude, lng: longitude });
        setLocating(false);
      },
      () => {
        if (settled) return;
        settled = true;
        clearTimeout(fallbackTimer);
        setLocateError('Could not get your location.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true,
      maxBounds: HYDERABAD_LEAFLET_BOUNDS,
      maxBoundsViscosity: 1.0,
      minZoom: 11,
    }).setView(HYDERABAD_CENTER, 12);

    // Add Premium Dark or Light tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(map);

    L.control.zoom({
      position: 'bottomright'
    }).addTo(map);

    mapRef.current = map;

    // On click map in report mode, place or move pin
    map.on('click', (e: L.LeafletMouseEvent) => {
      // We only allow clicking to place pin if reportMode is active
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Sync click events for Report Mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (reportMode) {
        const clamped = clampToHyderabad(e.latlng.lat, e.latlng.lng);
        onUpdateReportCoords(clamped);
      }
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [reportMode, onUpdateReportCoords]);

  // Render/Update Dumps on the Map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing dump markers that are no longer in dumps
    const currentDumpIds = new Set(dumps.map(d => d.id));
    Object.keys(markersRef.current).forEach(id => {
      if (!currentDumpIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // Add or update markers
    dumps.forEach(dump => {
      // Skip if resolved and we don't want to clutter (though showing them is fine)
      const isSelected = selectedDump?.id === dump.id;
      
      let markerHtml = '';
      if (dump.status === 'active') {
        markerHtml = `
          <div class="relative w-9 h-9 flex items-center justify-center">
            <span class="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 marker-pulse-active"></span>
            <div class="relative rounded-full h-6 w-6 bg-red-500 border border-white shadow-md flex items-center justify-center text-[10px] text-white font-bold">
              !
            </div>
          </div>
        `;
      } else if (dump.status === 'pending_verification') {
        markerHtml = `
          <div class="relative w-9 h-9 flex items-center justify-center">
            <span class="absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75 marker-pulse-pending"></span>
            <div class="relative rounded-full h-6 w-6 bg-orange-500 border border-white shadow-md flex items-center justify-center text-[10px] text-white font-bold">
              ?
            </div>
          </div>
        `;
      } else {
        markerHtml = `
          <div class="relative w-9 h-9 flex items-center justify-center">
            <div class="relative rounded-full h-6 w-6 bg-green-500 border border-white shadow-md flex items-center justify-center text-[9px] text-white font-bold">
              ✓
            </div>
          </div>
        `;
      }

      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'custom-div-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      if (markersRef.current[dump.id]) {
        // Update existing marker position & icon
        const marker = markersRef.current[dump.id];
        marker.setLatLng([dump.lat, dump.lng]);
        marker.setIcon(customIcon);
      } else {
        // Create new marker
        const marker = L.marker([dump.lat, dump.lng], { icon: customIcon })
          .addTo(map)
          .on('click', () => {
            onSelectDump(dump);
          });
        markersRef.current[dump.id] = marker;
      }
    });
  }, [dumps, selectedDump, onSelectDump]);

  // Sync Selected Dump (Center camera on selection)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedDump) return;
    map.setView([selectedDump.lat, selectedDump.lng], 16, {
      animate: true,
      duration: 1
    });
  }, [selectedDump]);

  // Manage Report Pin — only pan on first GPS placement, not on every map-drag update
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (reportMode && reportCoords) {
      const reportIcon = L.divIcon({
        html: `
          <div class="relative w-10 h-10 flex items-center justify-center">
            <span class="absolute inline-flex h-full w-full rounded-full bg-natural-clay opacity-50 animate-ping"></span>
            <div class="relative rounded-full h-8 w-8 bg-natural-clay border-2 border-white shadow-lg flex items-center justify-center text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
          </div>
        `,
        className: 'custom-report-icon',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      if (reportMarkerRef.current) {
        reportMarkerRef.current.setLatLng([reportCoords.lat, reportCoords.lng]);
      } else {
        reportMarkerRef.current = L.marker([reportCoords.lat, reportCoords.lng], {
          icon: reportIcon,
          draggable: true
        })
          .addTo(map)
          .on('dragend', (event) => {
            const marker = event.target;
            const position = marker.getLatLng();
            onUpdateReportCoords(clampToHyderabad(position.lat, position.lng));
          });
      }

      // Only pan when this is the FIRST time coords are set (GPS placement).
      // Subsequent updates come from the user dragging the pin — don't scroll back.
      const isFirstPlacement = !prevReportCoordsRef.current;
      if (isFirstPlacement) {
        map.setView([reportCoords.lat, reportCoords.lng], Math.max(map.getZoom(), 15), { animate: true, duration: 0.6 });
      }
      prevReportCoordsRef.current = reportCoords;
    } else {
      if (reportMarkerRef.current) {
        reportMarkerRef.current.remove();
        reportMarkerRef.current = null;
      }
      // Reset so next GPS enable pans correctly
      prevReportCoordsRef.current = null;
    }
  }, [reportMode, reportCoords, onUpdateReportCoords]);

  return (
    <div className="relative w-full h-full bg-natural-ivory rounded-[24px] overflow-hidden border border-natural-sand shadow-sm">
      <div id="map-canvas" ref={mapContainerRef} className="w-full h-full min-h-[400px] z-10" />

      {/* Floating Map Indicators */}
      <div className="absolute top-4 left-4 z-20 bg-white/95 backdrop-blur-md px-4 py-2 rounded-[20px] border border-natural-sand/80 shadow-sm text-[11px] font-medium text-natural-text flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-status-active inline-block animate-pulse"></span>
          <span>{m.activeDump}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-status-pending inline-block"></span>
          <span>{m.pendingVerify}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-status-clean inline-block"></span>
          <span>{m.verifiedClean}</span>
        </div>
      </div>

      <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5 items-end max-w-[160px]">
        {reportCoords && mapInsights.nearestCount > 0 && (
          <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-natural-sand shadow-sm text-[10px] font-semibold text-natural-heading">
            {m.nearestReports}: {mapInsights.nearestCount}
          </div>
        )}
        {mapInsights.trendingWard && (
          <div className="bg-status-pending-light/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-status-pending/30 shadow-sm text-[10px] font-semibold text-status-pending truncate max-w-full">
            {m.trendingArea}: {mapInsights.trendingWard.name}
          </div>
        )}
        {mapInsights.mostDirtyWard && (
          <div className="bg-status-active-light/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-status-active/30 shadow-sm text-[10px] font-semibold text-status-active truncate max-w-full">
            {m.mostDirtyWard}: {mapInsights.mostDirtyWard.name}
          </div>
        )}
        {mapInsights.recentlyCleaned && (
          <div className="bg-status-clean-light/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-status-clean/30 shadow-sm text-[10px] font-semibold text-status-clean truncate max-w-full">
            {m.recentlyCleaned}
          </div>
        )}
      </div>

      <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-natural-sand/80 shadow-sm text-[10px] font-mono text-[#7A7872]">
        {m.hyderabadOnly}
      </div>

      {/* Locate Me Button */}
      <div className="absolute bottom-4 right-14 z-20 flex flex-col items-end gap-1.5">
        {locateError && (
          <div className="bg-white border border-status-active/30 rounded-xl px-3 py-1.5 text-[10px] text-status-active font-medium shadow-sm whitespace-nowrap">
            {locateError}
          </div>
        )}
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={locating}
          title="Show my current location"
          className="bg-white border border-natural-sand shadow-md rounded-full w-10 h-10 flex items-center justify-center hover:bg-natural-ivory transition-colors cursor-pointer disabled:opacity-60"
        >
          {locating ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" fill="#2563EB"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
          )}
        </button>
      </div>

      {reportMode && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 bg-status-active text-white px-4 py-2 rounded-full font-medium text-xs shadow-md animate-bounce flex items-center gap-2 whitespace-nowrap">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-crosshair"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>
          <span>{m.tapDragPin}</span>
        </div>
      )}
    </div>
  );
}
