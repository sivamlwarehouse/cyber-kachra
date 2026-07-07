import React, { useRef, useState } from 'react';
import {
  Camera, Upload, MapPin, X, RefreshCw, CheckCircle2, ThumbsUp, AlertTriangle,
} from 'lucide-react';
import { Dump } from '../types';
import { compressImageFile } from '../utils/compress-image';
import { requestDeviceLocation } from '../utils/geolocation';

export type DumpUpdateAction = 'still_exists' | 'cleaned' | 'evidence';

interface DumpUpdateSheetProps {
  dump: Dump;
  deviceHash: string;
  initialAction?: DumpUpdateAction;
  onClose: () => void;
  onSuccess: (message: string, dump: Dump) => void;
}

export default function DumpUpdateSheet({
  dump,
  deviceHash,
  initialAction = 'cleaned',
  onClose,
  onSuccess,
}: DumpUpdateSheetProps) {
  const [action, setAction] = useState<DumpUpdateAction>(initialAction);
  const [image, setImage] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const requestGps = async () => {
    setGpsLoading(true);
    setGpsError(null);
    const result = await requestDeviceLocation();
    setCoords({ lat: result.lat, lng: result.lng });
    if (!result.ok) setGpsError('error' in result ? result.error : 'Could not read GPS.');
    setGpsLoading(false);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressing(true);
    setSubmitError(null);
    try {
      const result = await compressImageFile(file);
      setImage(result.dataUrl);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not process photo.');
      setImage(null);
    } finally {
      setCompressing(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!image) {
      setSubmitError('Please add a photo before submitting.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    let lat = coords?.lat ?? dump.lat;
    let lng = coords?.lng ?? dump.lng;

    if (!coords) {
      const gps = await requestDeviceLocation();
      lat = gps.lat;
      lng = gps.lng;
      setCoords({ lat, lng });
      if (!gps.ok) {
        setGpsError('error' in gps ? gps.error : 'Could not read GPS.');
      }
    }

    try {
      const res = await fetch(`/api/dumps/${dump.id}/document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: image,
          lat,
          lng,
          device_hash: deviceHash,
          vote_type: action === 'evidence' ? null : action,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit update.');
      }
      onSuccess(data.message || 'Site updated successfully.', data.dump);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit update.');
    } finally {
      setSubmitting(false);
    }
  };

  const actions: { id: DumpUpdateAction; label: string; hint: string; icon: React.ReactNode }[] = [
    {
      id: 'cleaned',
      label: 'Mark Cleaned',
      hint: 'Photo proof cleanup — pending community verification',
      icon: <CheckCircle2 className="w-4 h-4" />,
    },
    {
      id: 'still_exists',
      label: 'Still Exists',
      hint: 'Dump is still there — increases priority',
      icon: <ThumbsUp className="w-4 h-4" />,
    },
    {
      id: 'evidence',
      label: 'Add Photo Only',
      hint: 'Attach evidence without changing status',
      icon: <Camera className="w-4 h-4" />,
    },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-[24px] sm:rounded-[24px] border border-natural-sand shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-natural-sand px-4 py-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-natural-heading">Update dump site</h3>
            <p className="text-[10px] text-[#7A7872] truncate max-w-[240px]">{dump.address_text}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-natural-ivory cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          {submitError && (
            <div className="bg-status-active-light border border-status-active/30 rounded-xl px-3 py-2 text-[11px] text-status-active flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {submitError}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-mono font-bold uppercase text-[#A3A199]">What happened?</p>
            {actions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setAction(opt.id)}
                className={`text-left border rounded-xl px-3 py-2.5 flex gap-2.5 items-start cursor-pointer transition-colors ${
                  action === opt.id
                    ? 'border-status-clean bg-status-clean-light'
                    : 'border-natural-sand bg-white hover:bg-natural-ivory'
                }`}
              >
                <span className={action === opt.id ? 'text-status-clean' : 'text-[#A3A199]'}>{opt.icon}</span>
                <span>
                  <span className="text-xs font-bold text-natural-heading block">{opt.label}</span>
                  <span className="text-[10px] text-[#7A7872]">{opt.hint}</span>
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-mono font-bold uppercase text-[#A3A199]">Your location</p>
            <div className="border border-natural-sand rounded-xl p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="w-4 h-4 text-status-clean shrink-0" />
                {coords ? (
                  <p className="text-[10px] font-mono text-[#7A7872] truncate">
                    {coords.lat.toFixed(5)}°N, {coords.lng.toFixed(5)}°E
                  </p>
                ) : (
                  <p className="text-[11px] text-[#7A7872]">Tap to share GPS (required on mobile)</p>
                )}
              </div>
              <button
                type="button"
                onClick={requestGps}
                disabled={gpsLoading}
                className="text-[10px] font-bold text-status-clean shrink-0 cursor-pointer flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${gpsLoading ? 'animate-spin' : ''}`} />
                {coords ? 'Refresh' : 'Enable GPS'}
              </button>
            </div>
            {gpsError && <p className="text-[10px] text-status-pending">{gpsError}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-mono font-bold uppercase text-[#A3A199]">Photo evidence</p>
            {image ? (
              <div className="relative rounded-xl overflow-hidden aspect-[4/3] border border-natural-sand">
                <img src={image} alt="Evidence" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImage(null)}
                  className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-full cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={compressing}
                  className="border border-natural-sand rounded-xl py-4 flex flex-col items-center gap-1.5 text-[11px] font-semibold cursor-pointer hover:bg-natural-ivory"
                >
                  <Camera className="w-5 h-5 text-status-clean" />
                  Take Photo
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={compressing}
                  className="border border-natural-sand rounded-xl py-4 flex flex-col items-center gap-1.5 text-[11px] font-semibold cursor-pointer hover:bg-natural-ivory"
                >
                  <Upload className="w-5 h-5 text-status-pending" />
                  Upload
                </button>
              </div>
            )}
            {compressing && <p className="text-[10px] text-[#7A7872]">Compressing photo…</p>}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || compressing || !image}
            className="w-full bg-natural-sage hover:opacity-90 disabled:opacity-50 text-white font-bold py-3.5 rounded-full text-sm cursor-pointer flex items-center justify-center gap-2"
          >
            {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Submit Update
          </button>
        </div>

        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelect} />
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
      </div>
    </div>
  );
}
