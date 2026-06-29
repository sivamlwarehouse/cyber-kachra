import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { Dump, CitizenReport, VerificationLog } from './src/types';
import { getWardForCoord, getConstituencyForCoord, getDistanceMeters, wards, constituencies } from './src/wards_constituencies.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

const DATA_FILE = path.join(process.cwd(), 'data.json');

// Interface for DB State
interface DBState {
  dumps: Dump[];
  reports: CitizenReport[];
  verifications: VerificationLog[];
}

// Initial seed data
const initialDumps: Dump[] = [
  {
    id: "dump-1",
    lat: 17.4162,
    lng: 78.4345,
    address_text: "Near Road No. 12, Banjaras, opposite Starbucks alleyway",
    ward_id: 1, // Banjara Hills
    constituency_id: 2, // Khairatabad
    status: 'active',
    confidence_score: 70,
    created_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString(), // 36 hours ago
    resolved_at: null,
    photos: ["https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=600&q=80"]
  },
  {
    id: "dump-2",
    lat: 17.4325,
    lng: 78.4085,
    address_text: "Jubilee Hills Road No. 36, behind the Metro pillar 1622",
    ward_id: 2, // Jubilee Hills
    constituency_id: 1, // Jubilee Hills
    status: 'active',
    confidence_score: 50,
    created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(), // 12 hours ago
    resolved_at: null,
    photos: ["https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80"]
  },
  {
    id: "dump-3",
    lat: 17.3615,
    lng: 78.4735,
    address_text: "Charminar South Gali, near the historic arches",
    ward_id: 5, // Charminar
    constituency_id: 5, // Charminar
    status: 'active',
    confidence_score: 85,
    created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    resolved_at: null,
    photos: [
      "https://images.unsplash.com/photo-1618477388954-7852f32655ec?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1605600611280-1a6b5a4bd42c?auto=format&fit=crop&w=600&q=80"
    ]
  },
  {
    id: "dump-4",
    lat: 17.4410,
    lng: 78.3490,
    address_text: "Gachibowli flyover corner, near DLF Gate 2",
    ward_id: 6, // Gachibowli
    constituency_id: 9, // Sherilingampally
    status: 'pending_verification',
    confidence_score: 60,
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    resolved_at: null,
    photos: ["https://images.unsplash.com/photo-1605600611280-1a6b5a4bd42c?auto=format&fit=crop&w=600&q=80"]
  },
  {
    id: "dump-5",
    lat: 17.4860,
    lng: 78.4060,
    address_text: "Kukatpally Phase 3, next to the local market dumpyard gate",
    ward_id: 9, // Kukatpally
    constituency_id: 8, // Kukatpally
    status: 'resolved',
    confidence_score: 10,
    created_at: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    resolved_at: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    photos: ["https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=600&q=80"]
  }
];

const initialReports: CitizenReport[] = [
  {
    id: "rep-1",
    dump_id: "dump-1",
    image_url: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=600&q=80",
    device_hash: "seed_dev_1",
    created_at: new Date(Date.now() - 36 * 3600 * 1000).toISOString()
  },
  {
    id: "rep-2",
    dump_id: "dump-2",
    image_url: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80",
    device_hash: "seed_dev_2",
    created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString()
  },
  {
    id: "rep-3",
    dump_id: "dump-3",
    image_url: "https://images.unsplash.com/photo-1618477388954-7852f32655ec?auto=format&fit=crop&w=600&q=80",
    device_hash: "seed_dev_3",
    created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString()
  }
];

const initialVerifications: VerificationLog[] = [
  {
    id: "v-1",
    dump_id: "dump-1",
    device_hash: "seed_dev_4",
    vote_type: "still_exists",
    created_at: new Date(Date.now() - 30 * 3600 * 1000).toISOString()
  },
  {
    id: "v-2",
    dump_id: "dump-1",
    device_hash: "seed_dev_5",
    vote_type: "still_exists",
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  }
];

// Helper to load/save state
function loadState(): DBState {
  if (!fs.existsSync(DATA_FILE)) {
    const initialState: DBState = {
      dumps: initialDumps,
      reports: initialReports,
      verifications: initialVerifications
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialState, null, 2));
    return initialState;
  }
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database file, returning default data:", err);
    return { dumps: initialDumps, reports: initialReports, verifications: initialVerifications };
  }
}

function saveState(state: DBState) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error("Error writing database file:", err);
  }
}

// 1. GET ALL ACTIVE AND RECENTLY RESOLVED DUMPS
app.get('/api/dumps', (req, res) => {
  const state = loadState();
  // Filter active or recently resolved dumps
  res.json(state.dumps);
});

// 2. REPORT / CREATE DUMP WITH SOFT CATCH AND HARD MERGE LOGIC
app.post('/api/dumps', (req, res) => {
  const { lat, lng, address_text, image_url, device_hash, force_new } = req.body;

  if (!lat || !lng || !image_url || !device_hash) {
    return res.status(400).json({ error: "Missing required fields: lat, lng, image_url, device_hash" });
  }

  const state = loadState();

  // Find assigned ward and constituency
  const ward = getWardForCoord(lat, lng);
  const constituency = getConstituencyForCoord(lat, lng);

  // Galli GPS drift check: Scan existing ACTIVE or PENDING dumps
  const activeDumps = state.dumps.filter(d => d.status !== 'resolved');
  
  let closestDump: Dump | null = null;
  let minDistance = Infinity;

  for (const d of activeDumps) {
    const dist = getDistanceMeters(lat, lng, d.lat, d.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closestDump = d;
    }
  }

  // 1. Hard auto-merge (0 - 40m)
  if (closestDump && minDistance <= 40 && !force_new) {
    // Attach silently as new photo to existing dump
    closestDump.photos.push(image_url);
    closestDump.confidence_score = Math.min(100, closestDump.confidence_score + 5);
    
    // Add a citizen report record
    const reportId = `rep-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newReport: CitizenReport = {
      id: reportId,
      dump_id: closestDump.id,
      image_url,
      device_hash,
      created_at: new Date().toISOString()
    };
    state.reports.push(newReport);
    saveState(state);

    return res.json({
      action: "merged_silently",
      message: `Report attached to existing dump site ${minDistance.toFixed(1)}m away.`,
      dump: closestDump
    });
  }

  // 2. Soft catch prompt (40 - 75m)
  if (closestDump && minDistance > 40 && minDistance <= 75 && !force_new) {
    return res.json({
      action: "soft_catch_prompt",
      distance: minDistance,
      existing_dump: closestDump,
      message: `We found an active report ${minDistance.toFixed(0)}m away. Is it the same site?`
    });
  }

  // 3. New creation (> 75m or force_new)
  const dumpId = `dump-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const newDump: Dump = {
    id: dumpId,
    lat,
    lng,
    address_text: address_text || `Near ${ward.name} Ward, ${constituency.name} Constituency`,
    ward_id: ward.id,
    constituency_id: constituency.id,
    status: 'active',
    confidence_score: 50, // default start score
    created_at: new Date().toISOString(),
    resolved_at: null,
    photos: [image_url]
  };

  const reportId = `rep-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const newReport: CitizenReport = {
    id: reportId,
    dump_id: dumpId,
    image_url,
    device_hash,
    created_at: new Date().toISOString()
  };

  state.dumps.push(newDump);
  state.reports.push(newReport);
  saveState(state);

  res.json({
    action: "created_new",
    message: "New garbage dump successfully reported.",
    dump: newDump
  });
});

// 3. VERIFICATION / VOTE API
app.post('/api/dumps/:id/vote', (req, res) => {
  const { id } = req.params;
  const { vote_type, device_hash } = req.body; // 'still_exists' | 'cleaned'

  if (!vote_type || !device_hash) {
    return res.status(400).json({ error: "Missing required fields: vote_type, device_hash" });
  }

  const state = loadState();
  const dump = state.dumps.find(d => d.id === id);

  if (!dump) {
    return res.status(404).json({ error: "Dump not found" });
  }

  if (dump.status === 'resolved') {
    return res.status(400).json({ error: "Dump is already resolved and cleaned" });
  }

  // Check if this device already voted for this dump with the same vote_type in the last 12h
  const alreadyVoted = state.verifications.some(v => 
    v.dump_id === id && 
    v.device_hash === device_hash && 
    v.vote_type === vote_type &&
    (Date.now() - new Date(v.created_at).getTime()) < 12 * 3600 * 1000
  );

  if (alreadyVoted) {
    return res.status(400).json({ error: "You have already submitted this feedback in the last 12 hours." });
  }

  // Create verification log
  const newVote: VerificationLog = {
    id: `v-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    dump_id: id,
    device_hash,
    vote_type,
    created_at: new Date().toISOString()
  };
  state.verifications.push(newVote);

  if (vote_type === 'still_exists') {
    // Adds +10 confidence score (max 100)
    dump.confidence_score = Math.min(100, dump.confidence_score + 10);
    // If it was pending_verification, it goes back to active because someone says it still exists!
    if (dump.status === 'pending_verification') {
      dump.status = 'active';
    }
  } else if (vote_type === 'cleaned') {
    // Transitions dump status to pending_verification
    if (dump.status === 'active') {
      dump.status = 'pending_verification';
    }

    // Hard resolution criteria:
    // Flips to resolved only if 3 independent 'cleaned' votes arrive from unique device hashes within rolling 12h.
    const recentCleanedVotes = state.verifications.filter(v => 
      v.dump_id === id && 
      v.vote_type === 'cleaned' &&
      (Date.now() - new Date(v.created_at).getTime()) < 12 * 3600 * 1000
    );

    const uniqueHashes = new Set(recentCleanedVotes.map(v => v.device_hash));
    
    if (uniqueHashes.size >= 3) {
      dump.status = 'resolved';
      dump.resolved_at = new Date().toISOString();
      dump.confidence_score = 0;
    }
  }

  saveState(state);

  res.json({
    message: "Feedback recorded successfully.",
    dump,
    votes_count: state.verifications.filter(v => v.dump_id === id && v.vote_type === 'cleaned').length
  });
});

// 4. LEADERBOARD API: Compute live leaderboard statistics
app.get('/api/leaderboard', (req, res) => {
  const state = loadState();
  const { type } = req.query; // 'constituency' | 'ward' | 'zone'

  if (type === 'constituency') {
    // Get all constituencies
    const constituenciesList = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')).dumps || [];
  }

  // We will build a unified leaderboard handler that computes the stats
  res.json({ success: true });
});

// Unified Stats Endpoint for cleaner client consumption
app.get('/api/stats', (req, res) => {
  const state = loadState();
  
  // Calculate stats by MLA Constituency
  const constituencyStats = getConstituencyStats(state.dumps);
  // Calculate stats by Ward
  const wardStats = getWardStats(state.dumps);
  // Calculate stats by Zone
  const zoneStats = getZoneStats(state.dumps);

  res.json({
    constituencyStats,
    wardStats,
    zoneStats,
    overview: {
      total_reported: state.dumps.length,
      active: state.dumps.filter(d => d.status === 'active').length,
      pending: state.dumps.filter(d => d.status === 'pending_verification').length,
      resolved: state.dumps.filter(d => d.status === 'resolved').length
    }
  });
});

// Admin endpoints for tracking and managing the system state
app.get('/api/admin/data', (req, res) => {
  const state = loadState();
  res.json({
    dumps: state.dumps,
    reports: state.reports,
    verifications: state.verifications
  });
});

app.put('/api/admin/dumps/:id', (req, res) => {
  const { id } = req.params;
  const { status, confidence_score, address_text } = req.body;
  
  const state = loadState();
  const dump = state.dumps.find(d => d.id === id);
  
  if (!dump) {
    return res.status(404).json({ error: "Garbage dump not found" });
  }
  
  if (status) {
    dump.status = status;
    if (status === 'resolved') {
      dump.resolved_at = dump.resolved_at || new Date().toISOString();
    } else {
      dump.resolved_at = null;
    }
  }
  
  if (typeof confidence_score === 'number') {
    dump.confidence_score = Math.max(0, Math.min(100, confidence_score));
  }
  
  if (address_text !== undefined) {
    dump.address_text = address_text;
  }
  
  saveState(state);
  res.json({ message: "Dump updated successfully", dump });
});

app.delete('/api/admin/dumps/:id', (req, res) => {
  const { id } = req.params;
  const state = loadState();
  
  const dumpIndex = state.dumps.findIndex(d => d.id === id);
  if (dumpIndex === -1) {
    return res.status(404).json({ error: "Dump not found" });
  }
  
  state.dumps.splice(dumpIndex, 1);
  state.reports = state.reports.filter(r => r.dump_id !== id);
  state.verifications = state.verifications.filter(v => v.dump_id !== id);
  
  saveState(state);
  res.json({ message: "Dump and associated reports deleted" });
});

app.delete('/api/admin/reports/:id', (req, res) => {
  const { id } = req.params;
  const state = loadState();
  
  const reportIndex = state.reports.findIndex(r => r.id === id);
  if (reportIndex === -1) {
    return res.status(404).json({ error: "Report not found" });
  }
  
  const report = state.reports[reportIndex];
  const dump = state.dumps.find(d => d.id === report.dump_id);
  
  state.reports.splice(reportIndex, 1);
  
  if (dump) {
    dump.photos = dump.photos.filter(p => p !== report.image_url);
    if (dump.photos.length === 0) {
      dump.photos = ["https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=600&q=80"];
    }
  }
  
  saveState(state);
  res.json({ message: "Citizen report photo deleted" });
});

app.delete('/api/admin/verifications/:id', (req, res) => {
  const { id } = req.params;
  const state = loadState();
  
  const vIndex = state.verifications.findIndex(v => v.id === id);
  if (vIndex === -1) {
    return res.status(404).json({ error: "Verification log not found" });
  }
  
  state.verifications.splice(vIndex, 1);
  saveState(state);
  res.json({ message: "Verification log deleted" });
});

// Helper stats calculators
function getConstituencyStats(dumps: Dump[]) {
  const map: Record<number, { active: number; resolved: number; pending: number }> = {};
  
  dumps.forEach(d => {
    if (!map[d.constituency_id]) {
      map[d.constituency_id] = { active: 0, resolved: 0, pending: 0 };
    }
    if (d.status === 'active') map[d.constituency_id].active++;
    else if (d.status === 'pending_verification') map[d.constituency_id].pending++;
    else if (d.status === 'resolved') map[d.constituency_id].resolved++;
  });

  return constituencies.map((c: any) => {
    const item = map[c.id] || { active: 0, resolved: 0, pending: 0 };
    const total = item.active + item.resolved + item.pending;
    return {
      id: c.id,
      name: c.name,
      subLabel: `${c.mla_name} (${c.party})`,
      active_dumps: item.active + item.pending,
      resolved_dumps: item.resolved,
      percentage_cleaned: total > 0 ? Math.round((item.resolved / total) * 100) : 100
    };
  }).sort((a: any, b: any) => b.active_dumps - a.active_dumps); // Show worst performing first (more active dumps = public shame!)
}

function getWardStats(dumps: Dump[]) {
  const map: Record<number, { active: number; resolved: number; pending: number }> = {};
  
  dumps.forEach(d => {
    if (!map[d.ward_id]) {
      map[d.ward_id] = { active: 0, resolved: 0, pending: 0 };
    }
    if (d.status === 'active') map[d.ward_id].active++;
    else if (d.status === 'pending_verification') map[d.ward_id].pending++;
    else if (d.status === 'resolved') map[d.ward_id].resolved++;
  });

  return wards.map((w: any) => {
    const item = map[w.id] || { active: 0, resolved: 0, pending: 0 };
    const total = item.active + item.resolved + item.pending;
    return {
      id: w.id,
      name: `Ward ${w.ward_number}: ${w.name}`,
      subLabel: `Zone: ${w.zone}`,
      active_dumps: item.active + item.pending,
      resolved_dumps: item.resolved,
      percentage_cleaned: total > 0 ? Math.round((item.resolved / total) * 100) : 100
    };
  }).sort((a: any, b: any) => b.active_dumps - a.active_dumps);
}

function getZoneStats(dumps: Dump[]) {
  const zoneMap: Record<string, { active: number; resolved: number; pending: number }> = {};
  
  // Ensure all zones exist
  const zones = Array.from(new Set(wards.map((w: any) => w.zone))) as string[];
  zones.forEach(z => {
    zoneMap[z] = { active: 0, resolved: 0, pending: 0 };
  });

  dumps.forEach(d => {
    const ward = wards.find((w: any) => w.id === d.ward_id);
    if (ward) {
      const z = ward.zone;
      if (d.status === 'active') zoneMap[z].active++;
      else if (d.status === 'pending_verification') zoneMap[z].pending++;
      else if (d.status === 'resolved') zoneMap[z].resolved++;
    }
  });

  return zones.map((z, idx) => {
    const item = zoneMap[z];
    const total = item.active + item.resolved + item.pending;
    return {
      id: idx + 1,
      name: `${z} Zone`,
      subLabel: "Greater Hyderabad Municipal Corp.",
      active_dumps: item.active + item.pending,
      resolved_dumps: item.resolved,
      percentage_cleaned: total > 0 ? Math.round((item.resolved / total) * 100) : 100
    };
  }).sort((a: any, b: any) => b.active_dumps - a.active_dumps);
}

// Setup Vite Dev Server / Static Asset pipeline
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
