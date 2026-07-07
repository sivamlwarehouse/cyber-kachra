import { createClient, SupabaseClient } from '@supabase/supabase-js';
import ws from 'ws';

let client: SupabaseClient | null = null;

function serverClientOptions() {
  return {
    auth: { persistSession: false, autoRefreshToken: false },
    // Node.js < 22 has no native WebSocket; ws is required for Realtime on the server.
    realtime: { transport: ws as unknown as typeof WebSocket },
  };
}

export function createSupabaseClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, serverClientOptions());
}

function envKey(): string | undefined {
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim();
  return key || undefined;
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.SUPABASE_URL?.trim();
  return Boolean(url && envKey());
}

export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL?.trim();
  const key = envKey();

  if (!url || !key) {
    throw new Error(
      'Missing Supabase config. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local',
    );
  }

  client = createSupabaseClient(url, key);

  return client;
}
