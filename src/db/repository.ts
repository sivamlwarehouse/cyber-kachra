import { CitizenReport, Dump, VerificationLog } from '../types';
import { initialDumps, initialReports, initialVerifications } from './seed-data';
import * as local from './local-store';
import { getSupabase, isSupabaseConfigured } from './supabase';

export type { DBState } from './local-store';

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
  if (!isSupabaseConfigured()) return local.localGetAllDumps();
  const { data, error } = await getSupabase()
    .from('dumps')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapDump);
}

export async function getActiveDumps(): Promise<Dump[]> {
  if (!isSupabaseConfigured()) return local.localGetActiveDumps();
  const { data, error } = await getSupabase()
    .from('dumps')
    .select('*')
    .neq('status', 'resolved');
  if (error) throw error;
  return (data ?? []).map(mapDump);
}

export async function getDumpById(id: string): Promise<Dump | null> {
  if (!isSupabaseConfigured()) return local.localGetDumpById(id);
  const { data, error } = await getSupabase()
    .from('dumps')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapDump(data) : null;
}

export async function insertDump(dump: Dump): Promise<Dump> {
  if (!isSupabaseConfigured()) return local.localInsertDump(dump);
  const { data, error } = await getSupabase()
    .from('dumps')
    .insert(dump)
    .select('*')
    .single();
  if (error) throw error;
  return mapDump(data);
}

export async function updateDump(id: string, updates: Partial<Dump>): Promise<Dump> {
  if (!isSupabaseConfigured()) return local.localUpdateDump(id, updates);
  const { data, error } = await getSupabase()
    .from('dumps')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return mapDump(data);
}

export async function deleteDump(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return local.localDeleteDump(id);
  const { error } = await getSupabase().from('dumps').delete().eq('id', id);
  if (error) throw error;
}

export async function insertReport(report: CitizenReport): Promise<CitizenReport> {
  if (!isSupabaseConfigured()) return local.localInsertReport(report);
  const { data, error } = await getSupabase()
    .from('citizen_reports')
    .insert(report)
    .select('*')
    .single();
  if (error) throw error;
  return mapReport(data);
}

export async function getReportById(id: string): Promise<CitizenReport | null> {
  if (!isSupabaseConfigured()) {
    const reports = await local.localGetAllReports();
    return reports.find((r) => r.id === id) ?? null;
  }
  const { data, error } = await getSupabase()
    .from('citizen_reports')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapReport(data) : null;
}

export async function deleteReport(id: string): Promise<CitizenReport | null> {
  const report = await getReportById(id);
  if (!report) return null;
  if (!isSupabaseConfigured()) {
    await local.localDeleteReport(id);
    return report;
  }
  const { error } = await getSupabase().from('citizen_reports').delete().eq('id', id);
  if (error) throw error;
  return report;
}

export async function getAllReports(): Promise<CitizenReport[]> {
  if (!isSupabaseConfigured()) return local.localGetAllReports();
  const { data, error } = await getSupabase()
    .from('citizen_reports')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapReport);
}

export async function getAllVerifications(): Promise<VerificationLog[]> {
  if (!isSupabaseConfigured()) return local.localGetAllVerifications();
  const { data, error } = await getSupabase()
    .from('verification_logs')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getVerificationsForDump(dumpId: string): Promise<VerificationLog[]> {
  if (!isSupabaseConfigured()) return local.localGetVerificationsForDump(dumpId);
  const { data, error } = await getSupabase()
    .from('verification_logs')
    .select('*')
    .eq('dump_id', dumpId);
  if (error) throw error;
  return data ?? [];
}

export async function hasRecentVote(
  dumpId: string,
  deviceHash: string,
  voteType: VerificationLog['vote_type'],
  withinMs: number,
): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return local.localHasRecentVote(dumpId, deviceHash, voteType, withinMs);
  }
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
}

export async function insertVerification(vote: VerificationLog): Promise<VerificationLog> {
  if (!isSupabaseConfigured()) return local.localInsertVerification(vote);
  const { data, error } = await getSupabase()
    .from('verification_logs')
    .insert(vote)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteVerification(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return local.localDeleteVerification(id);
  const { error } = await getSupabase().from('verification_logs').delete().eq('id', id);
  if (error) throw error;
}

export async function getFullState() {
  if (!isSupabaseConfigured()) return local.localGetFullState();
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
    console.log('Using in-memory local store (Supabase key not set). Data resets on restart.');
    return;
  }

  const { count, error } = await getSupabase()
    .from('dumps')
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  if ((count ?? 0) > 0) return;

  const { error: dumpError } = await getSupabase().from('dumps').insert(initialDumps);
  if (dumpError) throw dumpError;

  const { error: reportError } = await getSupabase().from('citizen_reports').insert(initialReports);
  if (reportError) throw reportError;

  const { error: verificationError } = await getSupabase()
    .from('verification_logs')
    .insert(initialVerifications);
  if (verificationError) throw verificationError;

  console.log('Seeded Supabase with initial civic waste tracker data.');
}
