import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
dotenv.config();

const url = process.env.SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_ANON_KEY?.trim();

async function main() {
  console.log('Cyber-Kachra Supabase health check\n');

  if (!url) {
    console.error('FAIL: SUPABASE_URL is missing in .env.local');
    process.exit(1);
  }
  if (!key) {
    console.error('FAIL: SUPABASE_SERVICE_ROLE_KEY is missing or empty in .env.local');
    console.error('  → Supabase Dashboard → Project Settings → API → service_role key');
    process.exit(1);
  }

  console.log(`Project: ${process.env.SUPABASE_PROJECT_REF ?? url}`);
  console.log('Connecting...');

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { count, error } = await client
    .from('dumps')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('FAIL:', error.message);
    if (
      error.message.includes('timeout') ||
      error.message.includes('Connection') ||
      error.message.includes('fetch failed')
    ) {
      console.error('\nHint: Supabase project may be paused. Restore it in the dashboard first.');
    }
    process.exit(1);
  }

  console.log(`OK: Connected. dumps table has ${count ?? 0} row(s).`);
}

main().catch((err) => {
  console.error('FAIL:', err instanceof Error ? err.message : err);
  process.exit(1);
});
