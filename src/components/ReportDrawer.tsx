import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, MapPin, CheckCircle2, AlertTriangle, RefreshCw, X, Shield, ChevronRight, ChevronLeft } from 'lucide-react';
import { Dump } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import {
  Severity, ComplaintType, WasteType,
  SEVERITY_OPTIONS, WASTE_TYPE_OPTIONS,
  SEVERITY_COLORS, SEVERITY_BORDER, SEVERITY_EMOJI,
  COMPLAINT_CATEGORIES, ComplaintCategory,
} from '../i18n/report-options';

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
    citizen_text: string;
    severity: Severity;
    complaint_type: ComplaintType;
    waste_type: WasteType;
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

const STEPS = ['location', 'photo', 'details', 'review'] as const;
type Step = typeof STEPS[number];

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-[10px] text-[#A3A199] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
      {children}
      {required && <span className="text-status-active">*</span>}
    </label>
  );
}

export default function ReportDrawer({
  onReportSuccess,
  reportCoords,
  onRequestGeolocation,
  onCancel,
  initialAddressText = '',
  onSubmitReport,
}: ReportDrawerProps) {
  const { t } = useLanguage();
  const tr = t.report;

  const [step, setStep] = useState<Step>('location');
  const [image, setImage] = useState<string | null>(null);
  const [addressText, setAddressText] = useState(initialAddressText);
  const [citizenText, setCitizenText] = useState('');
  const [severity, setSeverity] = useState<Severity>('moderate');
  const [complaintType, setComplaintType] = useState<ComplaintType>('public_place');
  const [complaintCategory, setComplaintCategory] = useState<ComplaintCategory>('public');
  const [wasteType, setWasteType] = useState<WasteType>('mixed');
  const [compressing, setCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [softCatchPrompt, setSoftCatchPrompt] = useState<{
    distance: number;
    existing_dump: Dump;
  } | null>(null);
  const [locationInfo, setLocationInfo] = useState<{
    ward_number: number;
    ward_name: string;
    zone: string;
  } | null>(null);
  const [resolvingLocation, setResolvingLocation] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const stepIndex = STEPS.indexOf(step);
  const stepLabels: Record<Step, string> = {
    location: tr.stepLocation,
    photo: tr.stepPhoto,
    details: tr.stepDetails,
    review: tr.stepReview,
  };

  useEffect(() => {
    if (!reportCoords) {
      setLocationInfo(null);
      return;
    }
    const controller = new AbortController();
    setResolvingLocation(true);
    fetch(
      `/api/resolve-location?lat=${reportCoords.lat}&lng=${reportCoords.lng}`,
      { signal: controller.signal },
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setLocationInfo({
            ward_number: data.ward_number,
            ward_name: data.ward_name,
            zone: data.zone,
          });
        } else {
          setLocationInfo(null);
        }
      })
      .catch(() => setLocationInfo(null))
      .finally(() => setResolvingLocation(false));
    return () => controller.abort();
  }, [reportCoords?.lat, reportCoords?.lng]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX = 800;
        if (width > MAX || height > MAX) {
          if (width > height) {
            height = Math.round((height * MAX) / width);
            width = MAX;
          } else {
            width = Math.round((width * MAX) / height);
            height = MAX;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          setImage(canvas.toDataURL('image/jpeg', 0.8));
        }
        setCompressing(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setStep('location');
    setImage(null);
    setAddressText('');
    setCitizenText('');
    setSeverity('moderate');
    setComplaintType('public_place');
    setComplaintCategory('public');
    setWasteType('mixed');
    setSoftCatchPrompt(null);
  };

  const handleSubmit = async (forceNew = false) => {
    if (!reportCoords || !image) return;
    setSubmitting(true);
    try {
      const response = await onSubmitReport({
        lat: reportCoords.lat,
        lng: reportCoords.lng,
        address_text: addressText,
        citizen_text: citizenText,
        severity,
        complaint_type: complaintType,
        waste_type: wasteType,
        image_url: image,
        force_new: forceNew,
      });

      if (response?.action === 'soft_catch_prompt') {
        setSoftCatchPrompt({
          distance: response.distance!,
          existing_dump: response.existing_dump!,
        });
      } else if (response) {
        resetForm();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = () => {
    if (step === 'location') return Boolean(reportCoords && addressText.trim());
    if (step === 'photo') return Boolean(image);
    if (step === 'details') return Boolean(citizenText.trim());
    return true;
  };

  const handleCategorySelect = (cat: ComplaintCategory) => {
    setComplaintCategory(cat);
    const types = COMPLAINT_CATEGORIES.find((c) => c.key === cat)?.types ?? [];
    if (types.length > 0) setComplaintType(types[0]);
  };

  const selectedCategoryTypes = COMPLAINT_CATEGORIES.find((c) => c.key === complaintCategory)?.types ?? [];

  const goNext = () => {
    if (stepIndex < STEPS.length - 1) setStep(STEPS[stepIndex + 1]);
  };
  const goBack = () => {
    if (stepIndex > 0) setStep(STEPS[stepIndex - 1]);
  };

  return (
    <div className="bg-white rounded-t-[24px] md:rounded-[24px] border border-natural-sand shadow-2xl md:shadow-lg p-4 md:p-5 flex flex-col gap-3 relative overflow-hidden max-h-[70vh] md:max-h-[85vh] overflow-y-auto">
      <div className="flex items-center justify-between sticky top-0 bg-white z-10 pb-1">
        <div>
          <h3 className="text-sm font-bold text-natural-heading">{tr.title}</h3>
          <p className="text-[11px] text-[#7A7872] font-medium">{tr.subtitle}</p>
        </div>
        <button onClick={onCancel} className="p-1.5 rounded-full text-[#A3A199] hover:text-natural-heading hover:bg-natural-ivory cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      {!softCatchPrompt && (
        <div className="flex gap-1">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1 flex flex-col gap-1">
              <div className={`h-1 rounded-full transition-colors ${i <= stepIndex ? 'bg-status-active' : 'bg-natural-sand'}`} />
              <span className={`text-[9px] font-mono font-bold uppercase truncate ${i === stepIndex ? 'text-status-active' : 'text-[#A3A199]'}`}>
                {stepLabels[s]}
              </span>
            </div>
          ))}
        </div>
      )}

      {softCatchPrompt ? (
        <div className="bg-status-pending-light border border-status-pending/20 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex gap-2.5">
            <AlertTriangle className="w-5 h-5 text-status-pending shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-natural-heading">{tr.duplicateTitle}</h4>
              <p className="text-[11px] text-natural-text mt-1 leading-relaxed">
                {tr.duplicateBody.replace('{distance}', softCatchPrompt.distance.toFixed(0))}
              </p>
            </div>
          </div>
          {softCatchPrompt.existing_dump.photos?.[0] ? (
            <div className="relative rounded-xl overflow-hidden aspect-[16/9] border border-natural-sand">
              <img src={softCatchPrompt.existing_dump.photos[0]} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-0.5 rounded text-[9px] font-mono">{tr.reportedNearby}</div>
            </div>
          ) : (
            <div className="rounded-xl border border-natural-sand bg-natural-ivory p-4 text-[11px] text-[#7A7872]">{tr.locationOnly}</div>
          )}
          <p className="text-[10px] text-status-pending/80 italic">{tr.mergeHint}</p>
          <div className="flex gap-2">
            <button onClick={() => handleSubmit(false)} disabled={submitting} className="flex-1 bg-status-active text-white font-semibold py-2.5 rounded-full text-xs flex items-center justify-center gap-1.5 cursor-pointer">
              {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              {tr.mergeYes}
            </button>
            <button onClick={() => { setSoftCatchPrompt(null); handleSubmit(true); }} disabled={submitting} className="flex-1 bg-white border border-natural-sand font-semibold py-2.5 rounded-full text-xs cursor-pointer">
              {tr.mergeNo}
            </button>
          </div>
        </div>
      ) : (
        <>
          {step === 'location' && (
            <div className="flex flex-col gap-3">
              {!reportCoords ? (
                <div className="bg-status-active-light border border-status-active/20 rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex gap-2">
                    <MapPin className="w-5 h-5 text-status-active shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-status-active">{tr.locationOff}</p>
                      <p className="text-[11px] text-status-active/90 mt-1 leading-relaxed">{tr.locationOffBody}</p>
                    </div>
                  </div>
                  <button type="button" onClick={onRequestGeolocation} className="w-full bg-status-active hover:opacity-90 text-white font-semibold py-2.5 rounded-full text-xs flex items-center justify-center gap-2 cursor-pointer">
                    <RefreshCw className="w-4 h-4" />
                    {tr.tryAgain}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="bg-status-clean-light border border-status-clean/30 rounded-2xl p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-status-clean" />
                      <div>
                        <p className="text-xs font-bold text-status-clean">{tr.geotagVerified}</p>
                        <p className="text-[10px] font-mono text-[#7A7872]">
                          {reportCoords.lat.toFixed(5)}°N, {reportCoords.lng.toFixed(5)}°E
                        </p>
                      </div>
                    </div>
                    <button type="button" onClick={onRequestGeolocation} className="text-[10px] font-bold text-status-clean hover:underline cursor-pointer">
                      {tr.relocate}
                    </button>
                  </div>
                  {(resolvingLocation || locationInfo) && (
                    <div className="bg-natural-ivory border border-natural-sand rounded-2xl px-3 py-2.5 flex flex-col gap-1">
                      {resolvingLocation ? (
                        <p className="text-[10px] text-[#7A7872] flex items-center gap-1.5">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          {tr.resolvingWard}
                        </p>
                      ) : locationInfo ? (
                        <>
                          <p className="text-[10px] text-[#A3A199] font-mono font-bold uppercase">{tr.wardLabel}</p>
                          <p className="text-xs font-bold text-natural-heading">
                            {tr.wardResolved
                              .replace('{number}', String(locationInfo.ward_number))
                              .replace('{name}', locationInfo.ward_name)}
                          </p>
                          <p className="text-[10px] text-[#7A7872]">
                            {tr.zoneLabel}: <span className="font-semibold text-natural-heading">{locationInfo.zone}</span>
                          </p>
                        </>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-col gap-1">
                <FieldLabel required>{tr.landmarkLabel}</FieldLabel>
                <input
                  type="text"
                  value={addressText}
                  onChange={(e) => setAddressText(e.target.value)}
                  placeholder={tr.landmarkPlaceholder}
                  className="text-xs w-full outline-none border border-natural-sand rounded-xl px-3 py-2.5 bg-white focus:border-status-active"
                />
              </div>
            </div>
          )}

          {step === 'photo' && (
            <div className="flex flex-col gap-3">
              {!image ? (
                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="border-2 border-dashed border-status-active/40 bg-status-active-light rounded-2xl p-8 flex flex-col items-center gap-2.5 cursor-pointer hover:border-status-active"
                  >
                    <Camera className="w-8 h-8 text-status-active" />
                    <span className="text-sm font-bold text-natural-heading">{tr.takePhoto}</span>
                    <span className="text-[10px] text-[#7A7872]">{tr.takePhotoSub}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="border border-natural-sand rounded-xl py-2.5 flex items-center justify-center gap-2 text-xs font-medium text-[#7A7872] cursor-pointer hover:bg-natural-ivory"
                  >
                    <Upload className="w-4 h-4" />
                    {tr.uploadPhoto}
                  </button>
                  <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageSelect} className="hidden" />
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden aspect-[4/3] border border-natural-sand">
                  <img src={image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <button type="button" onClick={() => setImage(null)} className="absolute top-2 right-2 bg-black/70 text-white p-1 rounded-full cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {compressing && (
                <p className="text-xs text-status-pending flex items-center gap-2 justify-center">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> {tr.compressing}
                </p>
              )}
            </div>
          )}

          {step === 'details' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <FieldLabel required>{tr.describeLabel}</FieldLabel>
                <textarea
                  value={citizenText}
                  onChange={(e) => setCitizenText(e.target.value)}
                  placeholder={tr.describePlaceholder}
                  rows={2}
                  maxLength={500}
                  className="text-xs w-full outline-none border border-natural-sand rounded-xl px-3 py-2.5 bg-white focus:border-status-active resize-none leading-relaxed"
                />
              </div>

              <div className="flex flex-col gap-2">
                <FieldLabel required>{tr.howBad}</FieldLabel>
                <div className="grid grid-cols-2 gap-2">
                  {SEVERITY_OPTIONS.map((key) => {
                    const selected = severity === key;
                    const info = tr.severity[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSeverity(key)}
                        className={`text-left border-2 rounded-xl p-2.5 transition-all cursor-pointer ${
                          selected ? `${SEVERITY_BORDER[key]} bg-white shadow-sm` : 'border-natural-sand bg-natural-ivory/50'
                        }`}
                      >
                        <span className="text-lg leading-none">{SEVERITY_EMOJI[key]}</span>
                        <span className="text-[11px] font-bold text-natural-heading block mt-1">{info.label}</span>
                        <p className="text-[9px] text-[#7A7872] mt-0.5 leading-snug line-clamp-2">{info.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <FieldLabel required>{tr.complaintType}</FieldLabel>
                <div className="grid grid-cols-2 gap-1.5">
                  {COMPLAINT_CATEGORIES.map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => handleCategorySelect(cat.key)}
                      className={`border rounded-xl px-3 py-2 text-[11px] font-semibold cursor-pointer transition-all ${
                        complaintCategory === cat.key
                          ? 'border-status-active bg-status-active-light text-natural-heading'
                          : 'border-natural-sand bg-white text-natural-text'
                      }`}
                    >
                      {tr.complaintCategory[cat.key]}
                    </button>
                  ))}
                </div>
                {selectedCategoryTypes.length > 1 && (
                  <div className="flex flex-col gap-1 mt-1">
                    {selectedCategoryTypes.map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setComplaintType(key)}
                        className={`flex items-center justify-between border rounded-lg px-3 py-2 text-[11px] font-medium cursor-pointer ${
                          complaintType === key
                            ? 'border-status-active bg-status-active-light'
                            : 'border-natural-sand bg-white'
                        }`}
                      >
                        <span>{tr.complaint[key]}</span>
                        {complaintType === key && <CheckCircle2 className="w-3.5 h-3.5 text-status-active" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <FieldLabel required>{tr.wasteType}</FieldLabel>
                <div className="flex flex-wrap gap-1.5">
                  {WASTE_TYPE_OPTIONS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setWasteType(key)}
                      className={`border rounded-full px-3 py-1.5 text-[11px] font-medium cursor-pointer transition-all ${
                        wasteType === key
                          ? 'border-status-clean bg-status-clean-light text-natural-heading'
                          : 'border-natural-sand bg-white text-natural-text'
                      }`}
                    >
                      {tr.waste[key]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="flex flex-col gap-3">
              <div className="bg-status-clean-light border border-status-clean/30 rounded-2xl p-4 text-center">
                <CheckCircle2 className="w-8 h-8 text-status-clean mx-auto mb-2" />
                <p className="text-sm font-bold text-natural-heading">{tr.reviewTitle}</p>
                <p className="text-[11px] text-[#7A7872] mt-1">{tr.reviewHint}</p>
              </div>
              {image && (
                <div className="rounded-xl overflow-hidden aspect-[16/9] border border-natural-sand">
                  <img src={image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              )}
              <div className="text-[11px] text-[#7A7872] space-y-1 bg-natural-ivory rounded-xl p-3">
                <p><span className="font-bold text-natural-heading">{tr.landmarkLabel}:</span> {addressText}</p>
                <p><span className="font-bold text-natural-heading">{tr.howBad}:</span> {SEVERITY_EMOJI[severity]} {tr.severity[severity].label}</p>
                <p><span className="font-bold text-natural-heading">{tr.complaintType}:</span> {tr.complaint[complaintType]}</p>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1 sticky bottom-0 bg-white pb-1">
            {stepIndex > 0 && step !== 'review' ? (
              <button type="button" onClick={goBack} className="px-4 border border-natural-sand py-2.5 rounded-full text-xs font-bold text-[#7A7872] cursor-pointer flex items-center gap-1">
                <ChevronLeft className="w-3.5 h-3.5" />
                {tr.back}
              </button>
            ) : (
              <button type="button" onClick={onCancel} className="px-4 border border-natural-sand py-2.5 rounded-full text-xs font-bold text-[#7A7872] cursor-pointer">
                {tr.cancel}
              </button>
            )}

            {step === 'review' ? (
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={submitting || !reportCoords || !image}
                className="flex-1 bg-status-active text-white py-2.5 rounded-full text-xs font-bold disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                {tr.submit}
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                disabled={!canProceed()}
                className="flex-1 bg-status-active text-white py-2.5 rounded-full text-xs font-bold disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1"
              >
                {tr.next}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <p className="text-[10px] text-status-clean font-semibold flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            {tr.anonymous}
          </p>
        </>
      )}
    </div>
  );
}
