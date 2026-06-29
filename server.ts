import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { Dump, CitizenReport, VerificationLog } from './src/types';
import { getWardForCoord, isWithinGhmcBoundary } from './src/ghmc/ward-lookup.js';
import { getConstituencyForCoord, getDistanceMeters, wards, constituencies } from './src/wards_constituencies.js';
import { isWithinHyderabad } from './src/hyderabad-bounds.js';
import {
  deleteDump,
  deleteReport,
  deleteVerification,
  ensureSeedData,
  getActiveDumps,
  getAllDumps,
  getDumpById,
  getFullState,
  getVerificationsForDump,
  hasRecentVote,
  insertDump,
  insertReport,
  insertVerification,
  updateDump,
} from './src/db/repository.js';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

export async function bootstrap(): Promise<void> {
  try {
    await ensureSeedData();
    console.log('Database ready.');
  } catch (err) {
    console.error('Database startup failed:', err instanceof Error ? err.message : err);
  }
}

function setupProductionStatic(): void {
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

app.use(express.json({ limit: '10mb' }));

let bootPromise: Promise<void> | null = null;
app.use(async (_req, _res, next) => {
  bootPromise ??= bootstrap();
  try {
    await bootPromise;
    next();
  } catch (err) {
    next(err);
  }
});

function handleDbError(res: express.Response, err: unknown, fallback = 'Database error') {
  console.error(err);
  const message = err instanceof Error ? err.message : fallback;
  res.status(500).json({ error: message });
}

// 1. GET ALL ACTIVE AND RECENTLY RESOLVED DUMPS
app.get('/api/dumps', async (_req, res) => {
  try {
    const dumps = await getAllDumps();
    res.json(dumps);
  } catch (err) {
    handleDbError(res, err, 'Failed to load dumps');
  }
});

// 1b. RESOLVE GHMC WARD + ZONE FROM COORDINATES
app.get('/api/resolve-location', (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: 'lat and lng query parameters are required' });
    }
    if (!isWithinHyderabad(lat, lng)) {
      return res.status(400).json({ error: 'Coordinates are outside Greater Hyderabad bounds.' });
    }
    if (!isWithinGhmcBoundary(lat, lng)) {
      return res.status(400).json({ error: 'Coordinates are outside GHMC municipal limits.' });
    }
    const ward = getWardForCoord(lat, lng);
    const constituency = getConstituencyForCoord(lat, lng);
    res.json({
      ward_id: ward.id,
      ward_number: ward.ward_number,
      ward_name: ward.name,
      zone: ward.zone,
      constituency_id: constituency.id,
      constituency_name: constituency.name,
    });
  } catch (err) {
    handleDbError(res, err, 'Failed to resolve location');
  }
});

// 1c. GHMC WARD METADATA (lightweight list for filters)
app.get('/api/wards', (_req, res) => {
  res.json(wards);
});

// 2. REPORT / CREATE DUMP WITH SOFT CATCH AND HARD MERGE LOGIC
app.post('/api/dumps', async (req, res) => {
  try {
    const { lat, lng, address_text, image_url, device_hash, citizen_text, severity, complaint_type, waste_type, force_new } = req.body;

    if (!lat || !lng || !image_url || !device_hash) {
      return res.status(400).json({ error: 'Missing required fields: lat, lng, image_url, device_hash' });
    }

    if (!isWithinHyderabad(lat, lng) || !isWithinGhmcBoundary(lat, lng)) {
      return res.status(400).json({ error: 'Reports must be within Greater Hyderabad municipal limits.' });
    }

    const ward = getWardForCoord(lat, lng);
    const constituency = getConstituencyForCoord(lat, lng);
    const activeDumps = await getActiveDumps();

    let closestDump: Dump | null = null;
    let minDistance = Infinity;

    for (const d of activeDumps) {
      const dist = getDistanceMeters(lat, lng, d.lat, d.lng);
      if (dist < minDistance) {
        minDistance = dist;
        closestDump = d;
      }
    }

    // Hard auto-merge (0 - 40m)
    if (closestDump && minDistance <= 40 && !force_new) {
      const updatedPhotos = [...closestDump.photos, image_url];
      const updatedDump = await updateDump(closestDump.id, {
        photos: updatedPhotos,
        confidence_score: Math.min(100, closestDump.confidence_score + 5),
      });

      const reportId = `rep-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      await insertReport({
        id: reportId,
        dump_id: closestDump.id,
        image_url,
        citizen_text: citizen_text?.trim() || '',
        severity: severity || 'moderate',
        complaint_type: complaint_type || 'public_place',
        waste_type: waste_type || 'mixed',
        device_hash,
        created_at: new Date().toISOString(),
      });

      return res.json({
        action: 'merged_silently',
        message: `Report attached to existing dump site ${minDistance.toFixed(1)}m away.`,
        dump: updatedDump,
      });
    }

    // Soft catch prompt (40 - 75m)
    if (closestDump && minDistance > 40 && minDistance <= 75 && !force_new) {
      return res.json({
        action: 'soft_catch_prompt',
        distance: minDistance,
        existing_dump: closestDump,
        message: `We found an active report ${minDistance.toFixed(0)}m away. Is it the same site?`,
      });
    }

    // New creation (> 75m or force_new)
    const dumpId = `dump-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newDump = await insertDump({
      id: dumpId,
      lat,
      lng,
      address_text: address_text || `Near ${ward.name} Ward, ${constituency.name} Constituency`,
      ward_id: ward.id,
      constituency_id: constituency.id,
      status: 'active',
      confidence_score: 50,
      created_at: new Date().toISOString(),
      resolved_at: null,
      photos: [image_url],
    });

    const reportId = `rep-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    await insertReport({
      id: reportId,
      dump_id: dumpId,
      image_url,
      citizen_text: citizen_text?.trim() || '',
      severity: severity || 'moderate',
      complaint_type: complaint_type || 'public_place',
      waste_type: waste_type || 'mixed',
      device_hash,
      created_at: new Date().toISOString(),
    });

    res.json({
      action: 'created_new',
      message: 'New garbage dump successfully reported.',
      dump: newDump,
    });
  } catch (err) {
    handleDbError(res, err, 'Failed to create dump report');
  }
});

// 3. VERIFICATION / VOTE API
app.post('/api/dumps/:id/vote', async (req, res) => {
  try {
    const { id } = req.params;
    const { vote_type, device_hash } = req.body;

    if (!vote_type || !device_hash) {
      return res.status(400).json({ error: 'Missing required fields: vote_type, device_hash' });
    }

    const dump = await getDumpById(id);
    if (!dump) {
      return res.status(404).json({ error: 'Dump not found' });
    }

    if (dump.status === 'resolved') {
      return res.status(400).json({ error: 'Dump is already resolved and cleaned' });
    }

    const alreadyVoted = await hasRecentVote(id, device_hash, vote_type, 12 * 3600 * 1000);
    if (alreadyVoted) {
      return res.status(400).json({ error: 'You have already submitted this feedback in the last 12 hours.' });
    }

    const newVote: VerificationLog = {
      id: `v-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      dump_id: id,
      device_hash,
      vote_type,
      created_at: new Date().toISOString(),
    };
    await insertVerification(newVote);

    let updatedDump = dump;

    if (vote_type === 'still_exists') {
      const updates: Partial<Dump> = {
        confidence_score: Math.min(100, dump.confidence_score + 10),
      };
      if (dump.status === 'pending_verification') {
        updates.status = 'active';
      }
      updatedDump = await updateDump(id, updates);
    } else if (vote_type === 'cleaned') {
      const updates: Partial<Dump> = {};
      if (dump.status === 'active') {
        updates.status = 'pending_verification';
      }

      const verifications = await getVerificationsForDump(id);
      const recentCleanedVotes = verifications.filter(
        (v) =>
          v.vote_type === 'cleaned' &&
          Date.now() - new Date(v.created_at).getTime() < 12 * 3600 * 1000,
      );
      const uniqueHashes = new Set(recentCleanedVotes.map((v) => v.device_hash));

      if (uniqueHashes.size >= 3) {
        updates.status = 'resolved';
        updates.resolved_at = new Date().toISOString();
        updates.confidence_score = 0;
      }

      if (Object.keys(updates).length > 0) {
        updatedDump = await updateDump(id, updates);
      }
    }

    const allVotes = await getVerificationsForDump(id);
    res.json({
      message: 'Feedback recorded successfully.',
      dump: updatedDump,
      votes_count: allVotes.filter((v) => v.vote_type === 'cleaned').length,
    });
  } catch (err) {
    handleDbError(res, err, 'Failed to record vote');
  }
});

// Unified Stats Endpoint
app.get('/api/stats', async (_req, res) => {
  try {
    const dumps = await getAllDumps();
    const constituencyStats = getConstituencyStats(dumps);
    const wardStats = getWardStats(dumps);
    const zoneStats = getZoneStats(dumps);

    res.json({
      constituencyStats,
      wardStats,
      zoneStats,
      overview: {
        total_reported: dumps.length,
        active: dumps.filter((d) => d.status === 'active').length,
        pending: dumps.filter((d) => d.status === 'pending_verification').length,
        resolved: dumps.filter((d) => d.status === 'resolved').length,
      },
    });
  } catch (err) {
    handleDbError(res, err, 'Failed to load stats');
  }
});

// Admin endpoints
app.get('/api/admin/data', async (_req, res) => {
  try {
    const state = await getFullState();
    res.json(state);
  } catch (err) {
    handleDbError(res, err, 'Failed to load admin data');
  }
});

app.put('/api/admin/dumps/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, confidence_score, address_text } = req.body;

    const dump = await getDumpById(id);
    if (!dump) {
      return res.status(404).json({ error: 'Garbage dump not found' });
    }

    const updates: Partial<Dump> = {};
    if (status) {
      updates.status = status;
      updates.resolved_at = status === 'resolved'
        ? dump.resolved_at || new Date().toISOString()
        : null;
    }
    if (typeof confidence_score === 'number') {
      updates.confidence_score = Math.max(0, Math.min(100, confidence_score));
    }
    if (address_text !== undefined) {
      updates.address_text = address_text;
    }

    const updatedDump = await updateDump(id, updates);
    res.json({ message: 'Dump updated successfully', dump: updatedDump });
  } catch (err) {
    handleDbError(res, err, 'Failed to update dump');
  }
});

app.delete('/api/admin/dumps/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const dump = await getDumpById(id);
    if (!dump) {
      return res.status(404).json({ error: 'Dump not found' });
    }

    await deleteDump(id);
    res.json({ message: 'Dump and associated reports deleted' });
  } catch (err) {
    handleDbError(res, err, 'Failed to delete dump');
  }
});

app.delete('/api/admin/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const report = await deleteReport(id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const dump = await getDumpById(report.dump_id);
    if (dump) {
      let photos = dump.photos.filter((p) => p !== report.image_url);
      if (photos.length === 0) {
        photos = ['https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=600&q=80'];
      }
      await updateDump(dump.id, { photos });
    }

    res.json({ message: 'Citizen report photo deleted' });
  } catch (err) {
    handleDbError(res, err, 'Failed to delete report');
  }
});

app.delete('/api/admin/verifications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteVerification(id);
    res.json({ message: 'Verification log deleted' });
  } catch (err) {
    handleDbError(res, err, 'Failed to delete verification');
  }
});

function getConstituencyStats(dumps: Dump[]) {
  const map: Record<number, { active: number; resolved: number; pending: number }> = {};

  dumps.forEach((d) => {
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
      percentage_cleaned: total > 0 ? Math.round((item.resolved / total) * 100) : 100,
    };
  }).sort((a: any, b: any) => b.active_dumps - a.active_dumps);
}

function getWardStats(dumps: Dump[]) {
  const map: Record<number, { active: number; resolved: number; pending: number }> = {};

  dumps.forEach((d) => {
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
      subLabel: w.zone,
      active_dumps: item.active + item.pending,
      resolved_dumps: item.resolved,
      percentage_cleaned: total > 0 ? Math.round((item.resolved / total) * 100) : 100,
    };
  })
    .filter((w: any) => w.active_dumps + w.resolved_dumps > 0)
    .sort((a: any, b: any) => b.active_dumps - a.active_dumps);
}

function getZoneStats(dumps: Dump[]) {
  const zoneMap: Record<string, { active: number; resolved: number; pending: number }> = {};
  const zones = Array.from(new Set(wards.map((w: any) => w.zone))) as string[];

  zones.forEach((z) => {
    zoneMap[z] = { active: 0, resolved: 0, pending: 0 };
  });

  dumps.forEach((d) => {
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
      name: z,
      subLabel: 'Greater Hyderabad Municipal Corp.',
      active_dumps: item.active + item.pending,
      resolved_dumps: item.resolved,
      percentage_cleaned: total > 0 ? Math.round((item.resolved / total) * 100) : 100,
    };
  }).sort((a: any, b: any) => b.active_dumps - a.active_dumps);
}

async function startServer() {
  await bootstrap();

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    setupProductionStatic();
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

setupProductionStatic();

export default app;

if (!process.env.VERCEL) {
  startServer();
}
