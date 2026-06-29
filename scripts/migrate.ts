import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'nbndigynlvlkbmppyvip';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

async function runSql(query: string): Promise<void> {
  if (!ACCESS_TOKEN) {
    throw new Error('SUPABASE_ACCESS_TOKEN is required to run migrations.');
  }

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Migration failed (${response.status}): ${body}`);
  }
}

async function runMigrationFile(filePath: string) {
  const sql = fs.readFileSync(filePath, 'utf-8');
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

  console.log(`\n→ ${path.basename(filePath)} (${statements.length} statements)`);

  for (const statement of statements) {
    try {
      await runSql(statement);
      console.log('  OK:', statement.split('\n')[0].slice(0, 72));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('already exists')) {
        console.log('  SKIP:', statement.split('\n')[0].slice(0, 72));
        continue;
      }
      throw err;
    }
  }
}

async function main() {
  const migrationsDir = path.join(process.cwd(), 'supabase/migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log(`Running ${files.length} migrations on ${PROJECT_REF}...`);

  for (const file of files) {
    await runMigrationFile(path.join(migrationsDir, file));
  }

  console.log('\nAll migrations complete.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
