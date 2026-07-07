import { CitizenReport, Dump, VerificationLog } from '../types';
import { initialDumps, initialReports, initialVerifications } from './seed-data';
import * as local from './local-store';
import { getSupabase, isSupabaseConfigured } from './supabase';

export type { DBState } from './local-store';

/** When Supabase is down, stick to in-memory for the whole process (avoids split read/write). */
let useLocalStoreFallback = false;

function shouldUseLocalStore(): boolean {
  return !isSupabaseConfigured() || useLocalStoreFallback;
}

function markLocalStoreFallback(reason: string): void {
  if (!useLocalStoreFallback) {
    useLocalStoreFallback = true;
    console.warn(`⚠ Supabase unavailable — in-memory store for this session. ${reason}`);
  }
}

function errorText(err: unknown): string {
  if (err instanceof Error) {
    const cause = err.cause instanceof Error ? err.cause.message : String(err.cause ?? '');
    return `${err.message} ${cause}`;
  }
  if (err && typeof err === 'object') {
    const o = err as Record<string, unknown>;
    return [o.message, o.details, o.hint, o.code].filter(Boolean).join(' ');
  }
  return String(err);
}

function isTransientDbError(err: unknown): boolean {
  const message = errorText(err);
  return (
    message.includes('timeout') ||
    message.includes('Connection terminated') ||
    message.includes('ENOTFOUND') ||
    message.includes('getaddrinfo') ||
    message.includes('fetch failed') ||
    message.includes('Failed to fetch') ||
    message.includes('ECONNREFUSED') ||
    message.includes('EAI_AGAIN')
  );
}

function mapDump(row: Dump): Dump {
  return {
    ...row,
    photos: Array.isArray(row.photos) ? row.photos : [],
  };
}

function mapReport(row: CitizenReport): CitizenReport {
  return {
    ...row,
    citizen_text: row.citizen_text ?? '',
    severity: row.severity ?? 'moderate',
    complaint_type: row.complaint_type ?? 'public_place',
    waste_type: row.waste_type ?? 'mixed',
  };
}

export async function getAllDumps(): Promise<Dump[]> {
  if (shouldUseLocalStore()) return local.localGetAllDumps();
  try {
    const { data, error } = await getSupabase()
      .from('dumps')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapDump);
  } catch (err) {
    if (isTransientDbError(err)) {
      markLocalStoreFallback('reads');
      return local.localGetAllDumps();
    }
    throw err;
  }
}

export async function getActiveDumps(): Promise<Dump[]> {
  if (shouldUseLocalStore()) return local.localGetActiveDumps();
  try {
    const { data, error } = await getSupabase()
      .from('dumps')
      .select('*')
      .neq('status', 'resolved');
    if (error) throw error;
    return (data ?? []).map(mapDump);
  } catch (err) {
    if (isTransientDbError(err)) {
      markLocalStoreFallback('reads');
      return local.localGetActiveDumps();
    }
    throw err;
  }
}

export async function getDumpById(id: string): Promise<Dump | null> {
  if (shouldUseLocalStore()) return local.localGetDumpById(id);
  try {
    const { data, error } = await getSupabase()
      .from('dumps')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapDump(data) : null;
  } catch (err) {
    if (isTransientDbError(err)) {
      markLocalStoreFallback('reads');
      return local.localGetDumpById(id);
    }
    throw err;
  }
}

export async function insertDump(dump: Dump): Promise<Dump> {
  if (shouldUseLocalStore()) return local.localInsertDump(dump);
  try {
    const { data, error } = await getSupabase()
      .from('dumps')
      .insert(dump)
      .select('*')
      .single();
    if (error) throw error;
    return mapDump(data);
  } catch (err) {
    if (isTransientDbError(err)) {
      markLocalStoreFallback('writes');
      return local.localInsertDump(dump);
    }
    throw err;
  }
}

export async function updateDump(id: string, updates: Partial<Dump>): Promise<Dump> {
  if (shouldUseLocalStore()) return local.localUpdateDump(id, updates);
  try {
    const { data, error } = await getSupabase()
      .from('dumps')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return mapDump(data);
  } catch (err) {
    if (isTransientDbError(err)) {
      markLocalStoreFallback('writes');
      return local.localUpdateDump(id, updates);
    }
    throw err;
  }
}

export async function deleteDump(id: string): Promise<void> {
  if (shouldUseLocalStore()) return local.localDeleteDump(id);
  try {
    const { error } = await getSupabase().from('dumps').delete().eq('id', id);
    if (error) throw error;
  } catch (err) {
    if (isTransientDbError(err)) {
      markLocalStoreFallback('writes');
      return local.localDeleteDump(id);
    }
    throw err;
  }
}

export async function insertReport(report: CitizenReport): Promise<CitizenReport> {
  if (shouldUseLocalStore()) return local.localInsertReport(report);
  try {
    const { data, error } = await getSupabase()
      .from('citizen_reports')
      .insert(report)
      .select('*')
      .single();
    if (error) throw error;
    return mapReport(data);
  } catch (err) {
    if (isTransientDbError(err)) {
      markLocalStoreFallback('writes');
      return local.localInsertReport(report);
    }
    throw err;
  }
}

export async function getReportById(id: string): Promise<CitizenReport | null> {
  if (shouldUseLocalStore()) {
    const reports = await local.localGetAllReports();
    return reports.find((r) => r.id === id) ?? null;
  }
  try {
    const { data, error } = await getSupabase()
      .from('citizen_reports')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapReport(data) : null;
  } catch (err) {
    if (isTransientDbError(err)) {
      markLocalStoreFallback('reads');
      const reports = await local.localGetAllReports();
      return reports.find((r) => r.id === id) ?? null;
    }
    throw err;
  }
}

export async function deleteReport(id: string): Promise<CitizenReport | null> {
  const report = await getReportById(id);
  if (!report) return null;
  if (shouldUseLocalStore()) {
    await local.localDeleteReport(id);
    return report;
  }
  try {
    const { error } = await getSupabase().from('citizen_reports').delete().eq('id', id);
    if (error) throw error;
    return report;
  } catch (err) {
    if (isTransientDbError(err)) {
      markLocalStoreFallback('writes');
      await local.localDeleteReport(id);
      return report;
    }
    throw err;
  }
}

export async function getAllReports(): Promise<CitizenReport[]> {
  if (shouldUseLocalStore()) return local.localGetAllReports();
  try {
    const { data, error } = await getSupabase()
      .from('citizen_reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapReport);
  } catch (err) {
    if (isTransientDbError(err)) {
      markLocalStoreFallback('reads');
      return local.localGetAllReports();
    }
    throw err;
  }
}

export async function getAllVerifications(): Promise<VerificationLog[]> {
  if (shouldUseLocalStore()) return local.localGetAllVerifications();
  try {
    const { data, error } = await getSupabase()
      .from('verification_logs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  } catch (err) {
    if (isTransientDbError(err)) {
      markLocalStoreFallback('reads');
      return local.localGetAllVerifications();
    }
    throw err;
  }
}

export async function getVerificationsForDump(dumpId: string): Promise<VerificationLog[]> {
  if (shouldUseLocalStore()) return local.localGetVerificationsForDump(dumpId);
  try {
    const { data, error } = await getSupabase()
      .from('verification_logs')
      .select('*')
      .eq('dump_id', dumpId);
    if (error) throw error;
    return data ?? [];
  } catch (err) {
    if (isTransientDbError(err)) {
      markLocalStoreFallback('reads');
      return local.localGetVerificationsForDump(dumpId);
    }
    throw err;
  }
}

export async function hasRecentVote(
  dumpId: string,
  deviceHash: string,
  voteType: VerificationLog['vote_type'],
  withinMs: number,
): Promise<boolean> {
  if (shouldUseLocalStore()) {
    return local.localHasRecentVote(dumpId, deviceHash, voteType, withinMs);
  }
  try {
    const since = new Date(Date.now() - withinMs).toISOString();
    const { data, error } = await getSupabase()
      .from('verification_logs')
      .select('id')
      .eq('dump_id', dumpId)
      .eq('device_hash', deviceHash)
      .eq('vote_type', voteType)
      .gte('created_at', since)
      .limit(1);
    if (error) throw error;
    return (data?.length ?? 0) > 0;
  } catch (err) {
    if (isTransientDbError(err)) {
      markLocalStoreFallback('reads');
      return local.localHasRecentVote(dumpId, deviceHash, voteType, withinMs);
    }
    throw err;
  }
}

export async function insertVerification(vote: VerificationLog): Promise<VerificationLog> {
  if (shouldUseLocalStore()) return local.localInsertVerification(vote);
  try {
    const { data, error } = await getSupabase()
      .from('verification_logs')
      .insert(vote)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    if (isTransientDbError(err)) {
      markLocalStoreFallback('writes');
      return local.localInsertVerification(vote);
    }
    throw err;
  }
}

export async function deleteVerification(id: string): Promise<void> {
  if (shouldUseLocalStore()) return local.localDeleteVerification(id);
  try {
    const { error } = await getSupabase().from('verification_logs').delete().eq('id', id);
    if (error) throw error;
  } catch (err) {
    if (isTransientDbError(err)) {
      markLocalStoreFallback('writes');
      return local.localDeleteVerification(id);
    }
    throw err;
  }
}

export async function getFullState() {
  if (shouldUseLocalStore()) return local.localGetFullState();
  const [dumps, reports, verifications] = await Promise.all([
    getAllDumps(),
    getAllReports(),
    getAllVerifications(),
  ]);
  return { dumps, reports, verifications };
}

export async function ensureSeedData(): Promise<void> {
  if (!isSupabaseConfigured()) {
    await local.localEnsureSeedData();
    console.log(
      '⚠ In-memory store active — set SUPABASE_SERVICE_ROLE_KEY in .env.local for persistent data.',
    );
    return;
  }

  console.log(`✓ Supabase configured (${process.env.SUPABASE_URL})`);

  try {
    const { count, error } = await getSupabase()
      .from('dumps')
      .select('*', { count: 'exact', head: true });
    if (error) throw error;
    if ((count ?? 0) > 0) {
      console.log(`✓ Supabase connected — ${count} dump(s) in database.`);
      return;
    }

    const { error: dumpError } = await getSupabase().from('dumps').insert(initialDumps);
    if (dumpError) throw dumpError;

    const { error: reportError } = await getSupabase().from('citizen_reports').insert(initialReports);
    if (reportError) throw reportError;

    const { error: verificationError } = await getSupabase()
      .from('verification_logs')
      .insert(initialVerifications);
    if (verificationError) throw verificationError;

    console.log('Seeded Supabase with initial civic waste tracker data.');
  } catch (err) {
    if (isTransientDbError(err)) {
      markLocalStoreFallback('startup');
      await local.localEnsureSeedData();
      return;
    }
    throw err;
  }
}
