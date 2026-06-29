import type { VercelRequest, VercelResponse } from '@vercel/node';
import app, { bootstrap } from '../server';

let ready: Promise<void> | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  ready ??= bootstrap();
  await ready;
  return app(req, res);
}
