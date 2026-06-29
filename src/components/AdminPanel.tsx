import React, { useState, useEffect } from 'react';
import { Dump, CitizenReport, VerificationLog } from '../types';
import { wards, constituencies } from '../wards_constituencies';
import AdminAnalytics from './AdminAnalytics';
import LanguageToggle from './LanguageToggle';
import { useLanguage } from '../i18n/LanguageContext';
import { 
  Trash2, CheckCircle, RefreshCw, MapPin, Search, X, 
  Edit2, Save, ArrowLeft, Calendar, Vote, Database, AlertTriangle, 
  BarChart2, Filter, Image as ImageIcon, Shield, MapPinned
} from 'lucide-react';

function hasImage(url?: string) {
  return Boolean(url && url.trim().length > 0);
}

interface AdminPanelProps {
  onBack: () => void;
  onRefreshParent: () => void;
}

interface AdminData {
  dumps: Dump[];
  reports: CitizenReport[];
  verifications: VerificationLog[];
}

export default function AdminPanel({ onBack, onRefreshParent }: AdminPanelProps) {
  const { t } = useLanguage();
  const tr = t.report;
  const [data, setData] = useState<AdminData>({ dumps: [], reports: [], verifications: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'dumps' | 'grievances' | 'votes'>('overview');
  
  // Search & Filter state for Dumps
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [wardFilter, setWardFilter] = useState<string>('all');
  const [constituencyFilter, setConstituencyFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Editing state
  const [editingDumpId, setEditingDumpId] = useState<string | null>(null);
  const [editAddress, setEditAddress] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'pending_verification' | 'resolved'>('active');
  const [editConfidence, setEditConfidence] = useState(50);
  
  // Image modal state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/data');
      if (!res.ok) {
        throw new Error('Failed to retrieve full system data logs.');
      }
      const jsonData = await res.json();
      setData(jsonData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to connect to the Admin API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleShowMessage = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => {
      setActionSuccessMessage(null);
    }, 4000);
  };

  const handleUpdateDump = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/dumps/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editStatus,
          confidence_score: editConfidence,
          address_text: editAddress
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update garbage site details.');
      }

      handleShowMessage('Garbage site overridden successfully.');
      setEditingDumpId(null);
      await fetchAdminData();
      onRefreshParent();
    } catch (err: any) {
      alert(err.message || 'Error updating dump.');
    }
  };

  const handleDeleteDump = async (id: string) => {
    if (!window.confirm('Are you absolutely sure you want to delete this garbage site? This will permanently delete the dump, all connected citizen photos, and all verification votes.')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/dumps/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        throw new Error('Failed to delete garbage site.');
      }

      handleShowMessage('Garbage site and its entire history permanently purged.');
      await fetchAdminData();
      onRefreshParent();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteGrievance = async (id: string) => {
    if (!window.confirm('Delete this citizen grievance permanently? This removes their report text and photo from the system.')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        throw new Error('Failed to delete grievance.');
      }

      handleShowMessage('Citizen grievance deleted successfully.');
      await fetchAdminData();
      onRefreshParent();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteVote = async (id: string) => {
    if (!window.confirm('Purge this verification vote from the record?')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/verifications/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        throw new Error('Failed to delete verification vote.');
      }

      handleShowMessage('Verification vote log deleted.');
      await fetchAdminData();
      onRefreshParent();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const startEditing = (dump: Dump) => {
    setEditingDumpId(dump.id);
    setEditAddress(dump.address_text);
    setEditStatus(dump.status);
    setEditConfidence(dump.confidence_score);
  };

  // Filtered Dumps computation
  const filteredDumps = data.dumps.filter(d => {
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    const matchesWard = wardFilter === 'all' || d.ward_id.toString() === wardFilter;
    const matchesConstituency = constituencyFilter === 'all' || d.constituency_id.toString() === constituencyFilter;
    const matchesSearch = d.address_text.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          d.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesWard && matchesConstituency && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-natural-bg text-natural-text font-sans flex flex-col antialiased animate-fadeIn pb-12">
      {/* Admin Header */}
      <header className="bg-white/95 border-b border-natural-sand text-natural-heading shadow-sm sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-natural-ivory border border-natural-sand rounded-xl text-natural-text hover:text-natural-heading transition-all cursor-pointer flex items-center justify-center"
              title="Return to Citizen Portal"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight uppercase font-mono text-natural-heading">
                  Admin Dashboard
                </h1>
                <span className="bg-natural-clay text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded-full border border-natural-clay/20 shadow-sm">
                  ANALYTICS
                </span>
              </div>
              <p className="text-xs text-[#7A7872] font-medium mt-0.5">
                Civic waste analytics, audit trail & municipal overrides
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LanguageToggle />
            <button
              onClick={fetchAdminData}
              disabled={loading}
              className="bg-white hover:bg-natural-ivory border border-natural-sand text-natural-text hover:text-natural-heading font-medium px-4 py-2 rounded-full text-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Logs</span>
            </button>
            <button
              onClick={onBack}
              className="bg-natural-sage hover:opacity-90 text-white font-medium px-4 py-2 rounded-full text-xs transition-all cursor-pointer shadow-sm"
            >
              Exit Console
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6">
        
        {/* Success Alert */}
        {actionSuccessMessage && (
          <div className="bg-natural-light-sage border border-natural-sage/30 text-natural-sage p-3.5 rounded-2xl text-xs font-semibold shadow-sm flex items-center gap-2 animate-fadeIn">
            <CheckCircle className="w-4 h-4 text-natural-sage" />
            <span>{actionSuccessMessage}</span>
          </div>
        )}

        {error && (
          <div className="bg-natural-light-clay border border-natural-clay/20 text-natural-clay p-4 rounded-2xl text-xs font-medium shadow-sm flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-natural-clay animate-pulse" />
            <span>{error}</span>
          </div>
        )}

        {/* Console Navigation Tabs */}
        <div className="flex border-b border-natural-sand gap-1 scrollbar-none overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-5 border-b-2 font-medium text-xs transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'overview'
                ? 'border-natural-clay text-natural-clay font-bold'
                : 'border-transparent text-[#7A7872] hover:text-natural-heading'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>Analytics</span>
          </button>
          <button
            onClick={() => setActiveTab('dumps')}
            className={`py-3 px-5 border-b-2 font-medium text-xs transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'dumps'
                ? 'border-natural-clay text-natural-clay font-bold'
                : 'border-transparent text-[#7A7872] hover:text-natural-heading'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Garbage Sites ({data.dumps.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('grievances')}
            className={`py-3 px-5 border-b-2 font-medium text-xs transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'grievances'
                ? 'border-natural-clay text-natural-clay font-bold'
                : 'border-transparent text-[#7A7872] hover:text-natural-heading'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Citizen Grievances ({data.reports.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('votes')}
            className={`py-3 px-5 border-b-2 font-medium text-xs transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'votes'
                ? 'border-natural-clay text-natural-clay font-bold'
                : 'border-transparent text-[#7A7872] hover:text-natural-heading'
            }`}
          >
            <Vote className="w-4 h-4" />
            <span>Verification Votes ({data.verifications.length})</span>
          </button>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-natural-clay" />
            <span className="text-xs text-[#7A7872] font-mono font-medium">Downloading live system databases...</span>
          </div>
        ) : (
          <>
            {/* TAB 1: ANALYTICS */}
            {activeTab === 'overview' && (
              <AdminAnalytics
                dumps={data.dumps}
                reports={data.reports}
                verifications={data.verifications}
              />
            )}

            {/* TAB 2: GARBAGE SITES LIST */}
            {activeTab === 'dumps' && (
              <div className="flex flex-col gap-4">
                {/* Filters Row */}
                <div className="bg-white border border-natural-sand rounded-3xl p-5 shadow-sm flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-natural-heading font-mono uppercase tracking-wider">
                    <Filter className="w-4 h-4 text-natural-sage" />
                    <span>Filter & Search active databases</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Search query */}
                    <div className="relative flex items-center border border-natural-sand rounded-full px-3 bg-natural-ivory">
                      <Search className="w-4 h-4 text-[#A3A199] absolute left-3" />
                      <input
                        type="text"
                        placeholder="Search address or site ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full text-xs outline-none bg-transparent py-2.5 pl-6 pr-2 text-natural-text placeholder-[#A3A199]"
                      />
                      {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="text-xs text-[#A3A199] hover:text-natural-heading">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Status filter */}
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="border border-natural-sand rounded-full px-4 py-2 text-xs font-semibold bg-natural-ivory text-natural-heading outline-none cursor-pointer"
                    >
                      <option value="all">Status: All Slices</option>
                      <option value="active">Active open dumps</option>
                      <option value="pending_verification">Pending Verify</option>
                      <option value="resolved">Verified Clean</option>
                    </select>

                    {/* Ward filter */}
                    <select
                      value={wardFilter}
                      onChange={(e) => setWardFilter(e.target.value)}
                      className="border border-natural-sand rounded-full px-4 py-2 text-xs font-semibold bg-natural-ivory text-natural-heading outline-none cursor-pointer"
                    >
                      <option value="all">Municipal Ward: All</option>
                      {wards.map(w => (
                        <option key={w.id} value={w.id.toString()}>Ward {w.ward_number}: {w.name}</option>
                      ))}
                    </select>

                    {/* Constituency filter */}
                    <select
                      value={constituencyFilter}
                      onChange={(e) => setConstituencyFilter(e.target.value)}
                      className="border border-natural-sand rounded-full px-4 py-2 text-xs font-semibold bg-natural-ivory text-natural-heading outline-none cursor-pointer"
                    >
                      <option value="all">MLA Assembly: All</option>
                      {constituencies.map(c => (
                        <option key={c.id} value={c.id.toString()}>{c.name} ({c.party})</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-[#7A7872] font-medium border-t border-natural-sand/50 pt-3">
                    <span>Found <strong>{filteredDumps.length}</strong> matching garbage site entries in the database.</span>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setStatusFilter('all');
                        setWardFilter('all');
                        setConstituencyFilter('all');
                      }}
                      className="text-natural-clay hover:underline font-bold"
                    >
                      Reset filters
                    </button>
                  </div>
                </div>

                {/* Table or Cards Layout */}
                <div className="flex flex-col gap-4">
                  {filteredDumps.length === 0 ? (
                    <div className="bg-white border border-natural-sand rounded-3xl p-12 text-center text-[#A3A199] text-xs">
                      No garbage dumps found matching those filters in the command center.
                    </div>
                  ) : (
                    filteredDumps.map(dump => {
                      const dumpWard = wards.find(w => w.id === dump.ward_id);
                      const dumpConst = constituencies.find(c => c.id === dump.constituency_id);
                      const isEditing = editingDumpId === dump.id;

                      return (
                        <div key={dump.id} className={`bg-white border rounded-3xl p-5 shadow-sm transition-all flex flex-col lg:flex-row gap-5 items-stretch ${
                          isEditing ? 'border-natural-clay ring-1 ring-natural-clay/20' : 'border-natural-sand hover:border-natural-sand/90'
                        }`}>
                          {/* Image Column */}
                          <div className="w-full lg:w-48 shrink-0 relative aspect-[4/3] lg:aspect-square bg-natural-ivory rounded-2xl overflow-hidden self-center border border-natural-sand">
                            {dump.photos && dump.photos.length > 0 && hasImage(dump.photos[0]) ? (
                              <>
                                <img
                                  src={dump.photos[0]}
                                  alt="Dump primary"
                                  className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-all"
                                  onClick={() => setSelectedImage(dump.photos[0])}
                                  referrerPolicy="no-referrer"
                                />
                                {dump.photos.length > 1 && (
                                  <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[9px] font-mono px-1.5 py-0.5 rounded-lg">
                                    +{dump.photos.length - 1} photos
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-[#A3A199] gap-1.5 p-3">
                                <MapPinned className="w-6 h-6 text-natural-sage" />
                                <span className="text-[10px] font-mono font-bold text-natural-heading">Location only</span>
                                <span className="text-[9px] text-center leading-tight">No photo attached</span>
                              </div>
                            )}
                            <div className="absolute top-2 left-2 bg-black/50 text-white font-mono text-[8px] px-1.5 py-0.5 rounded-lg uppercase tracking-wide">
                              {dump.id}
                            </div>
                          </div>

                          {/* Info Column */}
                          <div className="flex-1 flex flex-col justify-between gap-3">
                            <div className="flex flex-col gap-2">
                              {/* Meta Info Row */}
                              <div className="flex flex-wrap items-center gap-2">
                                {/* Status Badge */}
                                {isEditing ? (
                                  <select
                                    value={editStatus}
                                    onChange={(e) => setEditStatus(e.target.value as any)}
                                    className="border border-natural-sand rounded-lg px-2.5 py-1 text-[10px] font-mono font-bold uppercase bg-natural-ivory text-natural-heading outline-none cursor-pointer"
                                  >
                                    <option value="active">ACTIVE</option>
                                    <option value="pending_verification">PENDING VERIFY</option>
                                    <option value="resolved">RESOLVED / CLEANED</option>
                                  </select>
                                ) : (
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border ${
                                    dump.status === 'active'
                                      ? 'bg-natural-light-clay text-natural-clay border-natural-clay/20'
                                      : dump.status === 'pending_verification'
                                      ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                      : 'bg-natural-light-sage text-natural-sage border-natural-sage/20'
                                  }`}>
                                    {dump.status === 'active' ? 'Active Dump' : dump.status === 'pending_verification' ? 'Pending verify' : 'Verified Cleaned'}
                                  </span>
                                )}

                                {/* Date Badge */}
                                <span className="text-[10px] text-[#A3A199] font-mono flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>Reported: {new Date(dump.created_at).toLocaleDateString()}</span>
                                </span>

                                {dump.resolved_at && (
                                  <span className="text-[10px] text-natural-sage font-mono font-semibold flex items-center gap-1 bg-natural-light-sage px-1.5 py-0.5 rounded-lg border border-natural-sage/10">
                                    <span>Cleaned: {new Date(dump.resolved_at).toLocaleDateString()}</span>
                                  </span>
                                )}
                              </div>

                              {/* Landmark / Landmark Input */}
                              {isEditing ? (
                                <div className="flex flex-col gap-1 mt-1">
                                  <label className="text-[9px] text-[#A3A199] font-mono font-bold uppercase">Landmark / Address Description</label>
                                  <input
                                    type="text"
                                    value={editAddress}
                                    onChange={(e) => setEditAddress(e.target.value)}
                                    className="text-xs font-semibold text-natural-heading border border-natural-sand rounded-xl px-3 py-2 outline-none focus:border-natural-clay"
                                  />
                                </div>
                              ) : (
                                <h4 className="text-sm font-bold text-natural-heading flex items-start gap-1.5 leading-tight">
                                  <MapPin className="w-4 h-4 text-[#A3A199] shrink-0 mt-0.5" />
                                  <span>{dump.address_text}</span>
                                </h4>
                              )}

                              {/* Location Coordinate tag */}
                              <div className="text-[10px] font-mono text-[#A3A199] flex items-center gap-1 bg-natural-ivory px-2 py-1 rounded-lg border border-natural-sand/30 w-max">
                                <span>GPS: {dump.lat.toFixed(6)}°N, {dump.lng.toFixed(6)}°E</span>
                              </div>

                              {/* Ward and Constituency Details */}
                              <div className="grid grid-cols-2 gap-2 mt-1">
                                <div className="bg-natural-ivory/60 border border-natural-sand/40 p-2 rounded-xl">
                                  <span className="text-[8px] font-mono text-[#A3A199] font-bold uppercase block">Constituency</span>
                                  <span className="text-xs font-bold text-natural-heading">{dumpConst?.name || 'Hyderabad'}</span>
                                  <span className="text-[9px] text-[#7A7872] block font-medium">MLA: {dumpConst?.mla_name || 'N/A'}</span>
                                </div>
                                <div className="bg-natural-ivory/60 border border-natural-sand/40 p-2 rounded-xl">
                                  <span className="text-[8px] font-mono text-[#A3A199] font-bold uppercase block">Ward Jurisdiction</span>
                                  <span className="text-xs font-bold text-natural-heading">Ward {dumpWard?.ward_number || 'N/A'}: {dumpWard?.name || 'Banjara Hills'}</span>
                                  <span className="text-[9px] text-[#7A7872] block font-medium">{dumpWard?.zone || 'N/A'}</span>
                                </div>
                              </div>
                            </div>

                            {/* Priority / Confidence Score slider */}
                            <div className="border-t border-natural-sand/40 pt-3 flex flex-col sm:flex-row items-center justify-between gap-4">
                              <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className="shrink-0 flex items-center gap-1 text-[10px] font-bold font-mono text-[#7A7872] uppercase">
                                  <Shield className="w-3.5 h-3.5 text-natural-clay" />
                                  <span>Priority Score:</span>
                                </div>
                                {isEditing ? (
                                  <div className="flex items-center gap-2 w-full sm:w-48">
                                    <input
                                      type="range"
                                      min="0"
                                      max="100"
                                      value={editConfidence}
                                      onChange={(e) => setEditConfidence(parseInt(e.target.value))}
                                      className="w-full h-1.5 bg-natural-sand rounded-lg appearance-none cursor-pointer accent-natural-clay"
                                    />
                                    <span className="text-xs font-bold font-mono text-natural-clay bg-natural-light-clay px-2 py-0.5 rounded-lg border border-natural-clay/20 shrink-0">
                                      {editConfidence}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <div className="h-2 w-24 bg-natural-sand rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-natural-clay rounded-full"
                                        style={{ width: `${dump.confidence_score}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-xs font-bold font-mono text-natural-heading">{dump.confidence_score}</span>
                                  </div>
                                )}
                              </div>

                              {/* Action Buttons */}
                              <div className="flex gap-2 self-end w-full sm:w-auto justify-end">
                                {isEditing ? (
                                  <>
                                    <button
                                      onClick={() => handleUpdateDump(dump.id)}
                                      className="bg-natural-sage text-white hover:opacity-90 font-bold px-3 py-2 rounded-full text-[10px] flex items-center gap-1 cursor-pointer transition-all"
                                    >
                                      <Save className="w-3.5 h-3.5" />
                                      <span>Save Changes</span>
                                    </button>
                                    <button
                                      onClick={() => setEditingDumpId(null)}
                                      className="bg-white text-natural-text border border-natural-sand hover:bg-natural-ivory font-bold px-3 py-2 rounded-full text-[10px] flex items-center gap-1 cursor-pointer transition-all"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      <span>Cancel</span>
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => startEditing(dump)}
                                      className="bg-white text-natural-text border border-natural-sand hover:bg-natural-ivory font-bold px-3.5 py-2 rounded-full text-[10px] flex items-center gap-1 cursor-pointer transition-all"
                                    >
                                      <Edit2 className="w-3.5 h-3.5 text-[#7A7872]" />
                                      <span>Override / Edit</span>
                                    </button>
                                    <button
                                      onClick={() => handleDeleteDump(dump.id)}
                                      className="bg-natural-light-clay text-natural-clay border border-natural-clay/10 hover:bg-natural-light-clay/80 font-bold px-3.5 py-2 rounded-full text-[10px] flex items-center gap-1 cursor-pointer transition-all"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Purge Site</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: CITIZEN GRIEVANCES */}
            {activeTab === 'grievances' && (
              <div className="flex flex-col gap-4">
                <div className="bg-white border border-natural-sand rounded-3xl p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-natural-heading flex items-center gap-2 mb-1">
                    <ImageIcon className="w-4.5 h-4.5 text-natural-clay" />
                    Citizen Grievance Reports
                  </h3>
                  <p className="text-xs text-[#7A7872] leading-relaxed">
                    Each entry is a citizen-submitted grievance with description text and optional photo. Delete spam or invalid reports individually.
                  </p>
                </div>

                {data.reports.length === 0 ? (
                  <div className="bg-white border border-natural-sand rounded-3xl p-12 text-center text-[#A3A199] text-xs">
                    No citizen grievances recorded yet.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {data.reports.map(report => {
                      const matchedDump = data.dumps.find(d => d.id === report.dump_id);

                      return (
                        <div key={report.id} className="bg-white border border-natural-sand rounded-3xl p-4 shadow-sm hover:border-natural-sand/90 transition-all">
                          <div className="flex flex-col sm:flex-row gap-4">
                            <div className="w-full sm:w-24 h-24 bg-natural-ivory border border-natural-sand rounded-2xl overflow-hidden shrink-0 flex items-center justify-center">
                              {hasImage(report.image_url) ? (
                                <img
                                  src={report.image_url}
                                  alt="Grievance"
                                  className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-all"
                                  onClick={() => setSelectedImage(report.image_url)}
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <MapPinned className="w-6 h-6 text-natural-sage" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0 flex flex-col gap-2">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-[9px] font-mono text-natural-clay font-bold bg-natural-light-clay px-1.5 py-0.5 rounded border border-natural-clay/10">
                                  {report.id}
                                </span>
                                <span className="text-[9px] text-[#A3A199] font-mono">
                                  {new Date(report.created_at).toLocaleString()}
                                </span>
                              </div>

                              {report.citizen_text ? (
                                <p className="text-sm text-natural-heading leading-relaxed bg-natural-ivory/80 border border-natural-sand/50 rounded-xl px-3 py-2.5">
                                  &ldquo;{report.citizen_text}&rdquo;
                                </p>
                              ) : (
                                <p className="text-xs text-[#A3A199] italic">No description</p>
                              )}

                              <div className="flex flex-wrap gap-1.5">
                                {report.severity && (
                                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-natural-light-clay text-natural-clay border border-natural-clay/15">
                                    {tr.severity[report.severity as keyof typeof tr.severity]?.label || report.severity}
                                  </span>
                                )}
                                {report.complaint_type && (
                                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-natural-ivory text-[#7A7872] border border-natural-sand">
                                    {tr.complaint[report.complaint_type as keyof typeof tr.complaint] || report.complaint_type}
                                  </span>
                                )}
                                {report.waste_type && (
                                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-natural-light-sage/50 text-natural-sage border border-natural-sage/15">
                                    {tr.waste[report.waste_type as keyof typeof tr.waste] || report.waste_type}
                                  </span>
                                )}
                              </div>

                              <p className="text-[11px] text-[#7A7872] font-medium truncate" title={matchedDump?.address_text}>
                                <MapPin className="w-3 h-3 inline mr-1 text-[#A3A199]" />
                                {matchedDump ? matchedDump.address_text : `Site: ${report.dump_id}`}
                              </p>

                              <div className="flex justify-end pt-1">
                                <button
                                  onClick={() => handleDeleteGrievance(report.id)}
                                  className="bg-natural-light-clay text-natural-clay border border-natural-clay/15 hover:bg-natural-light-clay/80 font-bold px-4 py-2 rounded-full text-[10px] flex items-center gap-1.5 cursor-pointer transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete Grievance</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: VERIFICATION VOTES */}
            {activeTab === 'votes' && (
              <div className="flex flex-col gap-4">
                <div className="bg-white border border-natural-sand rounded-3xl p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-natural-heading flex items-center gap-2 mb-1">
                    <Vote className="w-4.5 h-4.5 text-natural-sage" />
                    Anti-Sabotage Verification Vote Trail
                  </h3>
                  <p className="text-xs text-[#7A7872] leading-relaxed">
                    Tracks anonymous device feedback tags. Citizens must submit three independent "Cleaned" reports within a rolling 12-hour window to automatically move a dump to the "Resolved" list. Below is the immutable log of these transactions.
                  </p>
                </div>

                {data.verifications.length === 0 ? (
                  <div className="bg-white border border-natural-sand rounded-3xl p-12 text-center text-[#A3A199] text-xs">
                    No active citizen verification votes recorded in the transaction log yet.
                  </div>
                ) : (
                  <div className="bg-white border border-natural-sand rounded-3xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-natural-ivory border-b border-natural-sand text-[10px] font-mono uppercase tracking-wider text-[#7A7872]">
                            <th className="p-4">Transaction ID</th>
                            <th className="p-4">Timestamp</th>
                            <th className="p-4">Associated Site</th>
                            <th className="p-4">Vote Type</th>
                            <th className="p-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-natural-sand/30 text-xs">
                          {data.verifications.map(log => {
                            const matchedDump = data.dumps.find(d => d.id === log.dump_id);

                            return (
                              <tr key={log.id} className="hover:bg-natural-bg/30 transition-colors">
                                <td className="p-4 font-mono font-bold text-natural-text text-[11px]">{log.id}</td>
                                <td className="p-4 font-mono text-[#7A7872] text-[10px]">
                                  {new Date(log.created_at).toLocaleString()}
                                </td>
                                <td className="p-4 max-w-xs">
                                  <div className="font-semibold text-natural-heading truncate" title={matchedDump?.address_text}>
                                    {matchedDump ? matchedDump.address_text : `Dump: ${log.dump_id}`}
                                  </div>
                                </td>
                                <td className="p-4">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                    log.vote_type === 'still_exists'
                                      ? 'bg-natural-light-clay text-natural-clay border border-natural-clay/15'
                                      : 'bg-natural-light-sage text-natural-sage border border-natural-sage/15'
                                  }`}>
                                    {log.vote_type === 'still_exists' ? 'Still Exists' : 'Swept Clean'}
                                  </span>
                                </td>
                                <td className="p-4 text-right">
                                  <button
                                    onClick={() => handleDeleteVote(log.id)}
                                    className="text-natural-clay hover:underline inline-flex items-center gap-1 font-bold font-mono text-[10px]"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Purge Log</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Large Image View Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] rounded-3xl overflow-hidden border-2 border-white/25 shadow-2xl bg-black">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm text-white hover:bg-black/90 rounded-full p-2 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedImage}
              alt="Expanded citizen evidence"
              className="w-full h-auto max-h-[80vh] object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}
    </div>
  );
}
