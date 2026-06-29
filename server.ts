import dotenv from 'dotenv';
import app, { bootstrap } from './src/server-app.js';

dotenv.config({ path: '.env.local' });
dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  await bootstrap();

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
