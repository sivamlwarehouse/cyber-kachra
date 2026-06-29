import React, { useState, useRef } from 'react';
import { Camera, Upload, MapPin, CheckCircle2, AlertTriangle, RefreshCw, X } from 'lucide-react';
import { Dump } from '../types';

interface ReportDrawerProps {
  onReportSuccess: (message: string) => void;
  reportCoords: { lat: number; lng: number } | null;
  onRequestGeolocation: () => void;
  onCancel: () => void;
  initialAddressText?: string;
  onSubmitReport: (data: {
    lat: number;
    lng: number;
    address_text: string;
    image_url: string;
    force_new?: boolean;
  }) => Promise<{
    action: string;
    message: string;
    dump?: Dump;
    distance?: number;
    existing_dump?: Dump;
  } | null>;
}

export default function ReportDrawer({
  onReportSuccess,
  reportCoords,
  onRequestGeolocation,
  onCancel,
  initialAddressText = '',
  onSubmitReport,
}: ReportDrawerProps) {
  const [image, setImage] = useState<string | null>(null);
  const [addressText, setAddressText] = useState(initialAddressText);
  const [compressing, setCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Soft catch state
  const [softCatchPrompt, setSoftCatchPrompt] = useState<{
    distance: number;
    existing_dump: Dump;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Client-Side Image Compression & EXIF Stripping
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Draw to canvas to resize and strip EXIF
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Scale down if massive
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          if (width > height) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          } else {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Export as JPEG at 80% quality (<250KB)
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setImage(compressedDataUrl);
        }
        setCompressing(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const triggerCamera = () => {
    cameraInputRef.current?.click();
  };

  const handleSubmit = async (forceNew = false) => {
    if (!reportCoords || !image) return;

    setSubmitting(true);
    try {
      const response = await onSubmitReport({
        lat: reportCoords.lat,
        lng: reportCoords.lng,
        address_text: addressText,
        image_url: image,
        force_new: forceNew
      });

      if (response?.action === 'soft_catch_prompt') {
        // Halt and show soft catch dialog
        setSoftCatchPrompt({
          distance: response.distance!,
          existing_dump: response.existing_dump!
        });
      } else if (response) {
        // Clean up and notify success
        onReportSuccess(response.message);
        setImage(null);
        setAddressText('');
        setSoftCatchPrompt(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-[24px] border border-natural-sand shadow-lg p-5 flex flex-col gap-4 relative overflow-hidden transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-natural-heading flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-natural-clay rounded-full inline-block animate-pulse"></span>
            Snap Garbage Dump
          </h3>
          <p className="text-[11px] text-[#7A7872] font-medium">
            Take a photo and verify GPS location. Total anonymity.
          </p>
        </div>
        <button
          onClick={onCancel}
          className="p-1.5 rounded-full text-[#A3A199] hover:text-natural-heading hover:bg-natural-ivory transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Form content or Soft Catch Dialog */}
      {softCatchPrompt ? (
        <div className="bg-natural-light-clay/40 border border-natural-clay/20 rounded-2xl p-4 flex flex-col gap-3 animate-fadeIn">
          <div className="flex gap-2.5">
            <AlertTriangle className="w-5 h-5 text-natural-clay shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-natural-heading">
                Wait! Potential Duplicate Detected
              </h4>
              <p className="text-[11px] text-natural-text mt-1 leading-relaxed">
                We found an active, uncleaned garbage site exactly <span className="font-bold font-mono text-natural-clay">{softCatchPrompt.distance.toFixed(0)}m</span> away. Is your report the same spot?
              </p>
            </div>
          </div>

          {/* Photo of existing dump */}
          <div className="relative rounded-xl overflow-hidden aspect-[16/9] border border-natural-sand">
            <img
              src={softCatchPrompt.existing_dump.photos[0]}
              alt="Existing active dump"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[9px] font-mono">
              Reported nearby
            </div>
          </div>

          <p className="text-[10px] text-natural-clay/80 italic">
            * Silently merging attaches your photo to this dump & strengthens its priority (+5 confidence).
          </p>

          <div className="flex gap-2 mt-1">
            <button
              onClick={() => {
                // Confirm merge
                handleSubmit(false);
              }}
              disabled={submitting}
              className="flex-1 bg-natural-clay hover:opacity-90 text-white font-semibold py-2.5 px-3 rounded-full text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              {submitting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>Yes, Merge Reports</span>
            </button>
            <button
              onClick={() => {
                // Reject merge, force new dump creation
                setSoftCatchPrompt(null);
                handleSubmit(true);
              }}
              disabled={submitting}
              className="flex-1 bg-white hover:bg-natural-ivory text-natural-text border border-natural-sand font-semibold py-2.5 px-3 rounded-full text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <span>No, Create New Site</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {/* Photo Selection / Camera Panel */}
          {!image ? (
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={triggerCamera}
                className="border-2 border-dashed border-natural-sand hover:border-natural-clay bg-natural-ivory/50 hover:bg-natural-light-clay/10 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 transition-all group cursor-pointer"
              >
                <div className="p-3 bg-white rounded-2xl shadow-sm text-natural-text group-hover:text-natural-clay transition-colors">
                  <Camera className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-natural-text group-hover:text-natural-clay">
                  Take Photo
                </span>
                <span className="text-[10px] text-[#A3A199]">
                  Using device camera
                </span>
              </button>

              <button
                onClick={triggerUpload}
                className="border-2 border-dashed border-natural-sand hover:border-natural-clay bg-natural-ivory/50 hover:bg-natural-light-clay/10 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 transition-all group cursor-pointer"
              >
                <div className="p-3 bg-white rounded-2xl shadow-sm text-natural-text group-hover:text-natural-clay transition-colors">
                  <Upload className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-natural-text group-hover:text-natural-clay">
                  Upload Photo
                </span>
                <span className="text-[10px] text-[#A3A199]">
                  From photo gallery
                </span>
              </button>

              {/* Invisible HTML Inputs for capture */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageSelect}
                className="hidden"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>
          ) : (
            <div className="relative rounded-[24px] overflow-hidden aspect-[4/3] border border-natural-sand">
              <img
                src={image}
                alt="Uploaded garbage dump"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setImage(null)}
                className="absolute top-2 right-2 bg-black/70 backdrop-blur-md text-white p-1 rounded-full hover:bg-black/95 transition-all cursor-pointer"
                title="Remove photo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="absolute bottom-2 left-2 bg-natural-sage/90 text-white px-2 py-0.5 rounded text-[9px] font-mono tracking-wide">
                EXIF STRIPPED & COMPRESSED
              </div>
            </div>
          )}

          {compressing && (
            <div className="flex items-center justify-center gap-2 text-xs text-natural-clay font-mono py-1">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Optimizing photo size client-side...</span>
            </div>
          )}

          {/* Location Verification Status */}
          <div className="bg-natural-ivory border border-natural-sand/60 rounded-2xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${reportCoords ? 'bg-natural-light-clay text-natural-clay' : 'bg-natural-ivory border border-natural-sand text-[#A3A199]'}`}>
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-natural-heading">
                  {reportCoords ? 'Geotag Verified' : 'Awaiting Geotag'}
                </div>
                <div className="text-[10px] text-[#A3A199] font-mono">
                  {reportCoords
                    ? `${reportCoords.lat.toFixed(5)}°N, ${reportCoords.lng.toFixed(5)}°E`
                    : 'Tap "Verify Geotag" to locate'}
                </div>
              </div>
            </div>

            {!reportCoords ? (
              <button
                type="button"
                onClick={onRequestGeolocation}
                className="bg-natural-clay hover:opacity-90 text-white font-semibold px-4 py-2 rounded-full text-xs transition-all cursor-pointer"
              >
                Verify Geotag
              </button>
            ) : (
              <button
                type="button"
                onClick={onRequestGeolocation}
                className="bg-white hover:bg-natural-ivory text-natural-text border border-natural-sand font-semibold px-3 py-1.5 rounded-full text-xs transition-all cursor-pointer flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3 animate-spin-once" />
                <span>Relocate</span>
              </button>
            )}
          </div>

          {/* Optional landmarks / landmark input */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-[#A3A199] font-mono font-bold uppercase tracking-wider">
              Street / Nearby Landmark
            </label>
            <input
              type="text"
              value={addressText}
              onChange={(e) => setAddressText(e.target.value)}
              placeholder="e.g. Next to Somajiguda park corner post, opposite HDFC"
              className="text-xs text-natural-text w-full outline-none border border-natural-sand rounded-xl px-3 py-2.5 bg-white focus:border-natural-clay font-medium transition-colors"
            />
          </div>

          {/* Form Actions */}
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="flex-1 border border-natural-sand text-[#7A7872] py-2.5 rounded-full text-xs font-bold hover:bg-natural-ivory transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSubmit(false)}
              disabled={submitting || !image || !reportCoords}
              className="flex-1 bg-natural-clay hover:opacity-90 text-white py-2.5 rounded-full text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shadow-natural-clay/10"
            >
              {submitting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>Report Dump</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
