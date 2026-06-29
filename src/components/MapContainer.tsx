import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Dump } from '../types';
import { getWardForCoord, getConstituencyForCoord } from '../wards_constituencies';

interface MapContainerProps {
  dumps: Dump[];
  selectedDump: Dump | null;
  onSelectDump: (dump: Dump) => void;
  reportMode: boolean;
  reportCoords: { lat: number; lng: number } | null;
  onUpdateReportCoords: (coords: { lat: number; lng: number }) => void;
}

export default function MapContainer({
  dumps,
  selectedDump,
  onSelectDump,
  reportMode,
  reportCoords,
  onUpdateReportCoords,
}: MapContainerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const reportMarkerRef = useRef<L.Marker | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Centered in Greater Hyderabad
    const defaultCenter: L.LatLngExpression = [17.3850, 78.4867];
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView(defaultCenter, 12);

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
        const { lat, lng } = e.latlng;
        onUpdateReportCoords({ lat, lng });
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
          <div class="relative w-8 h-8 flex items-center justify-center">
            <span class="absolute inline-flex h-full w-full rounded-full bg-natural-clay opacity-75 marker-pulse-active"></span>
            <div class="relative rounded-full h-5 w-5 bg-natural-clay border border-white shadow-md flex items-center justify-center text-[10px] text-white font-bold">
              !
            </div>
          </div>
        `;
      } else if (dump.status === 'pending_verification') {
        markerHtml = `
          <div class="relative w-8 h-8 flex items-center justify-center">
            <span class="absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75 marker-pulse-pending"></span>
            <div class="relative rounded-full h-5 w-5 bg-yellow-500 border border-white shadow-md flex items-center justify-center text-[10px] text-white font-bold">
              ?
            </div>
          </div>
        `;
      } else {
        // Resolved
        markerHtml = `
          <div class="relative w-8 h-8 flex items-center justify-center">
            <div class="relative rounded-full h-5 w-5 bg-natural-sage border border-white shadow-md flex items-center justify-center text-[9px] text-white font-bold">
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

  // Manage Report Pin
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
            onUpdateReportCoords({ lat: position.lat, lng: position.lng });
          });
      }
      
      // Pan map gently to the report pin
      map.panTo([reportCoords.lat, reportCoords.lng]);
    } else {
      if (reportMarkerRef.current) {
        reportMarkerRef.current.remove();
        reportMarkerRef.current = null;
      }
    }
  }, [reportMode, reportCoords, onUpdateReportCoords]);

  return (
    <div className="relative w-full h-full bg-natural-ivory rounded-[24px] overflow-hidden border border-natural-sand shadow-sm">
      <div id="map-canvas" ref={mapContainerRef} className="w-full h-full min-h-[400px] z-10" />

      {/* Floating Map Indicators */}
      <div className="absolute top-4 left-4 z-20 bg-white/95 backdrop-blur-md px-4 py-2 rounded-[20px] border border-natural-sand/80 shadow-sm text-[11px] font-medium text-natural-text flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-natural-clay inline-block animate-pulse"></span>
          <span>Active Dump</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block"></span>
          <span>Pending Verify</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-natural-sage inline-block"></span>
          <span>Verified Clean</span>
        </div>
      </div>

      {reportMode && (
        <div className="absolute top-4 right-4 z-20 bg-natural-clay text-white px-4 py-2 rounded-full font-medium text-xs shadow-md animate-bounce flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-crosshair"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>
          <span>Tap or drag pin to position</span>
        </div>
      )}
    </div>
  );
}
