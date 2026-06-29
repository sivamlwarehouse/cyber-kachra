import React, { useState } from 'react';
import { Dump, Ward, Constituency } from '../types';
import { MapPin, Shield, Calendar, Users, ThumbsUp, CheckCircle, RefreshCw, ChevronLeft, ChevronRight, Image as ImageIcon, Camera } from 'lucide-react';

interface DumpDetailDrawerProps {
  dump: Dump;
  ward: Ward | undefined;
  constituency: Constituency | undefined;
  onVote: (voteType: 'still_exists' | 'cleaned') => Promise<void>;
  onClose: () => void;
  onAddPhoto: () => void;
  userDeviceHash: string;
  onRefreshDeviceHash: () => void;
}

export default function DumpDetailDrawer({
  dump,
  ward,
  constituency,
  onVote,
  onClose,
  onAddPhoto,
  userDeviceHash,
  onRefreshDeviceHash,
}: DumpDetailDrawerProps) {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [voting, setVoting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [voteSuccess, setVoteSuccess] = useState<string | null>(null);

  const handleVoteAction = async (voteType: 'still_exists' | 'cleaned') => {
    setVoting(true);
    setVoteError(null);
    setVoteSuccess(null);
    try {
      await onVote(voteType);
      setVoteSuccess(
        voteType === 'still_exists'
          ? "Successfully confirmed dump still exists. Priority score increased!"
          : "Thank you for the cleanup report! Dump status set to Pending Verification."
      );
      // clear success after 3 seconds
      setTimeout(() => setVoteSuccess(null), 4000);
    } catch (err: any) {
      setVoteError(err.message || "Failed to submit feedback.");
      setTimeout(() => setVoteError(null), 4000);
    } finally {
      setVoting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-natural-light-clay text-natural-clay border-natural-clay/20';
      case 'pending_verification':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'resolved':
        return 'bg-natural-light-sage text-natural-sage border-natural-sage/20';
      default:
        return 'bg-natural-ivory text-natural-text border-natural-sand';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active Waste Dump';
      case 'pending_verification':
        return 'Pending Verification';
      case 'resolved':
        return 'Verified Resolved';
      default:
        return status;
    }
  };

  return (
    <div className="bg-white rounded-[24px] border border-natural-sand shadow-lg overflow-hidden flex flex-col h-full">
      {/* Photo Carousel */}
      <div className="relative aspect-[16/10] bg-slate-900 border-b border-natural-sand overflow-hidden">
        {dump.photos && dump.photos.length > 0 ? (
          <>
            <img
              src={dump.photos[activePhotoIndex]}
              alt="Dump Site Photo"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />

            {/* Navigation buttons */}
            {dump.photos.length > 1 && (
              <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none">
                <button
                  onClick={() => setActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : dump.photos.length - 1))}
                  className="p-1 rounded-full bg-black/60 text-white hover:bg-black/80 pointer-events-auto transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setActivePhotoIndex((prev) => (prev < dump.photos.length - 1 ? prev + 1 : 0))}
                  className="p-1 rounded-full bg-black/60 text-white hover:bg-black/80 pointer-events-auto transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Count Indicator */}
            <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-sm text-white text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />
              <span>{activePhotoIndex + 1} / {dump.photos.length}</span>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
            <ImageIcon className="w-8 h-8" />
            <span className="text-xs">No photos attached</span>
          </div>
        )}

        {/* Back/Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 rounded-full p-1.5 transition-colors cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>

        {/* Rating / Confidence Badge */}
        {dump.status !== 'resolved' && (
          <div className="absolute top-3 left-3 bg-natural-clay text-white font-mono font-bold text-xs px-2.5 py-1.5 rounded-full shadow-md flex items-center gap-1.5 animate-pulse">
            <Shield className="w-3.5 h-3.5" />
            <span>Priority Score: {dump.confidence_score}</span>
          </div>
        )}
      </div>

      {/* Main Details Panel */}
      <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-4">
        {/* Title, Status */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${getStatusColor(dump.status)}`}>
              {getStatusText(dump.status)}
            </span>
            <span className="text-[10px] text-[#A3A199] font-mono flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(dump.created_at).toLocaleDateString()}
            </span>
          </div>
          <div className="text-sm font-bold text-natural-heading flex items-start gap-2">
            <MapPin className="w-4 h-4 text-[#A3A199] shrink-0 mt-0.5" />
            <span>{dump.address_text}</span>
          </div>
        </div>

        {/* Responsible Ward & Constituency Cards (PRD visual match) */}
        <div className="grid grid-cols-2 gap-3.5 border-y border-natural-sand py-4">
          {/* MLA constituency card */}
          <div className="bg-natural-ivory border border-natural-sand/60 rounded-[18px] p-3 flex flex-col gap-1">
            <span className="text-[9px] text-[#A3A199] font-mono font-bold uppercase tracking-wide">
              Assembly Constituency
            </span>
            <span className="text-xs font-bold text-natural-heading">
              {constituency?.name || "Hyderabad"}
            </span>
            {constituency && (
              <div className="text-[10px] mt-1.5 flex flex-col gap-0.5">
                <div className="text-[#7A7872] font-medium">
                  MLA: <span className="text-natural-heading font-bold">{constituency.mla_name}</span>
                </div>
                <div className="text-[#A3A199] font-mono text-[9px] uppercase">
                  Party: <span className="font-bold text-[#7A7872]">{constituency.party}</span>
                </div>
              </div>
            )}
          </div>

          {/* Municipal Ward card */}
          <div className="bg-natural-ivory border border-natural-sand/60 rounded-[18px] p-3 flex flex-col gap-1">
            <span className="text-[9px] text-[#A3A199] font-mono font-bold uppercase tracking-wide">
              Municipal Jurisdiction
            </span>
            <span className="text-xs font-bold text-natural-heading">
              Ward {ward?.ward_number || "93"}: {ward?.name || "Banjara Hills"}
            </span>
            {ward && (
              <div className="text-[10px] mt-1.5 flex flex-col gap-0.5">
                <div className="text-[#7A7872] font-medium">
                  Zone: <span className="text-natural-heading font-bold">{ward.zone} Zone</span>
                </div>
                <div className="text-[#A3A199] font-mono text-[9px] uppercase">
                  Agency: <span className="font-bold text-[#7A7872]">GHMC</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Verification Logic Feedback / Alerts */}
        {dump.status === 'pending_verification' && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs rounded-2xl p-3.5 leading-relaxed flex flex-col gap-1.5">
            <span className="font-bold">Cleanup Pending Community Verification</span>
            <span>
              This dump has been marked cleaned! To prevent false reports, it will disappear only when 3 independent citizen devices verify it has been swept clean.
            </span>
          </div>
        )}

        {dump.status === 'resolved' && (
          <div className="bg-natural-light-sage/60 border border-natural-sage/20 text-natural-text text-xs rounded-2xl p-3.5 leading-relaxed flex flex-col gap-1">
            <span className="font-bold flex items-center gap-1 text-natural-sage">
              ✓ Resolved and Swept Clean
            </span>
            <span>
              Verified clean by {dump.photos.length > 1 ? dump.photos.length : 3} independent community audits. Thank you for making Hyderabad cleaner!
            </span>
          </div>
        )}

        {/* Feedback alerts */}
        {voteSuccess && (
          <div className="bg-natural-light-sage/60 border border-natural-sage/20 text-natural-sage text-xs p-3 rounded-xl font-medium animate-fadeIn">
            {voteSuccess}
          </div>
        )}
        {voteError && (
          <div className="bg-natural-light-clay border border-natural-clay/20 text-natural-clay text-xs p-3 rounded-xl font-medium animate-fadeIn">
            {voteError}
          </div>
        )}

        {/* Interactive Citizen device hash simulator for testing */}
        {dump.status !== 'resolved' && (
          <div className="bg-natural-ivory border border-natural-sand/60 rounded-[18px] p-3 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[10px] text-[#A3A199] font-mono font-bold uppercase">
              <span>Your Anonymous Citizen ID</span>
              <button
                onClick={onRefreshDeviceHash}
                className="text-natural-clay hover:opacity-90 flex items-center gap-1 cursor-pointer font-sans normal-case font-bold"
              >
                <RefreshCw className="w-3 h-3 animate-spin-once" />
                <span>Simulate New Device</span>
              </button>
            </div>
            <div className="text-xs font-mono text-[#7A7872] truncate bg-white border border-natural-sand/40 p-2 rounded-xl">
              {userDeviceHash}
            </div>
            <span className="text-[9px] text-[#A3A199] leading-tight">
              * Generates a new device hash to test anti-sabotage (needs 3 unique devices voting cleaned to resolve).
            </span>
          </div>
        )}

        {/* Action Controls */}
        {dump.status !== 'resolved' && (
          <div className="grid grid-cols-2 gap-3 mt-auto">
            <button
              onClick={() => handleVoteAction('still_exists')}
              disabled={voting}
              className="bg-white hover:bg-natural-light-clay/10 text-natural-clay border border-natural-clay/20 font-bold py-3 px-3 rounded-[20px] text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer shadow-sm disabled:opacity-40"
            >
              <ThumbsUp className="w-4 h-4 text-natural-clay" />
              <span>Still Exists</span>
              <span className="text-[9px] text-natural-clay/80 font-normal font-mono">+10 Score</span>
            </button>

            <button
              onClick={() => handleVoteAction('cleaned')}
              disabled={voting}
              className="bg-natural-sage hover:opacity-90 text-white font-bold py-3 px-3 rounded-[20px] text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer shadow-md shadow-natural-sage/10 disabled:opacity-40"
            >
              <CheckCircle className="w-4 h-4 text-white" />
              <span>Mark Cleaned</span>
              <span className="text-[9px] text-white/80 font-normal">Pending Verification</span>
            </button>
          </div>
        )}

        {dump.status !== 'resolved' && (
          <button
            onClick={onAddPhoto}
            className="w-full mt-2 bg-natural-ivory hover:bg-natural-light-sage/20 text-natural-heading border border-natural-sand font-semibold py-3 px-3 rounded-full text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Camera className="w-4 h-4 text-natural-sage" />
            <span>Document Dump (Upload photo)</span>
          </button>
        )}
      </div>
    </div>
  );
}
