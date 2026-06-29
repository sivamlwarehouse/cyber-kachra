import { CitizenReport, Dump, VerificationLog } from '../types';
import { initialDumps, initialReports, initialVerifications } from './seed-data';

export interface DBState {
  dumps: Dump[];
  reports: CitizenReport[];
  verifications: VerificationLog[];
}

const state: DBState = {
  dumps: structuredClone(initialDumps),
  reports: structuredClone(initialReports),
  verifications: structuredClone(initialVerifications),
};

function mapDump(row: Dump): Dump {
  return { ...row, photos: Array.isArray(row.photos) ? row.photos : [] };
}

export async function localGetAllDumps(): Promise<Dump[]> {
  return state.dumps.map(mapDump);
}

export async function localGetActiveDumps(): Promise<Dump[]> {
  return state.dumps.filter((d) => d.status !== 'resolved').map(mapDump);
}

export async function localGetDumpById(id: string): Promise<Dump | null> {
  const row = state.dumps.find((d) => d.id === id);
  return row ? mapDump(row) : null;
}

export async function localInsertDump(dump: Dump): Promise<Dump> {
  state.dumps.unshift(mapDump(dump));
  return mapDump(dump);
}

export async function localUpdateDump(id: string, patch: Partial<Dump>): Promise<Dump> {
  const idx = state.dumps.findIndex((d) => d.id === id);
  if (idx === -1) throw new Error(`Dump ${id} not found`);
  state.dumps[idx] = mapDump({ ...state.dumps[idx], ...patch });
  return mapDump(state.dumps[idx]);
}

export async function localDeleteDump(id: string): Promise<void> {
  state.dumps = state.dumps.filter((d) => d.id !== id);
  state.reports = state.reports.filter((r) => r.dump_id !== id);
  state.verifications = state.verifications.filter((v) => v.dump_id !== id);
}

export async function localGetAllReports(): Promise<CitizenReport[]> {
  return [...state.reports];
}

export async function localInsertReport(report: CitizenReport): Promise<CitizenReport> {
  state.reports.unshift(report);
  return report;
}

export async function localDeleteReport(id: string): Promise<void> {
  state.reports = state.reports.filter((r) => r.id !== id);
}

export async function localGetAllVerifications(): Promise<VerificationLog[]> {
  return [...state.verifications];
}

export async function localGetVerificationsForDump(dumpId: string): Promise<VerificationLog[]> {
  return state.verifications.filter((v) => v.dump_id === dumpId);
}

export async function localHasRecentVote(
  dumpId: string,
  deviceHash: string,
  voteType: VerificationLog['vote_type'],
  withinMs: number,
): Promise<boolean> {
  const since = Date.now() - withinMs;
  return state.verifications.some(
    (v) =>
      v.dump_id === dumpId &&
      v.device_hash === deviceHash &&
      v.vote_type === voteType &&
      new Date(v.created_at).getTime() >= since,
  );
}

export async function localInsertVerification(vote: VerificationLog): Promise<VerificationLog> {
  state.verifications.unshift(vote);
  return vote;
}

export async function localDeleteVerification(id: string): Promise<void> {
  state.verifications = state.verifications.filter((v) => v.id !== id);
}

export async function localGetFullState(): Promise<DBState> {
  return {
    dumps: await localGetAllDumps(),
    reports: await localGetAllReports(),
    verifications: await localGetAllVerifications(),
  };
}

export async function localEnsureSeedData(): Promise<void> {
  // In-memory store is pre-seeded on startup.
}
