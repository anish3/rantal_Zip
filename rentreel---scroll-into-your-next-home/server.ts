import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './src/server/routes.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const basePort = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const candidatePorts = Array.from({ length: 10 }, (_, index) => basePort + index);

  // Security headers & CORS
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // Body parsing with limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // REST API router
  app.use('/api', apiRouter);

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      product: 'RentReel',
      city: 'Indore',
      authenticationDisabled: true,
      databaseConfigured: Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0),
      timestamp: new Date().toISOString(),
    });
  });

  // Global Error Handler for API routes
  app.use('/api', (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(`[API Error] ${req.method} ${req.url}:`, err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error occurred',
    });
  });

  // Environment dispatch (Static in prod, Vite middlewares in dev)
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  await new Promise<void>((resolve, reject) => {
    let portIndex = 0;

    const tryListen = () => {
      const port = candidatePorts[portIndex];
      const server = app.listen(port, '0.0.0.0', () => {
        console.log(`[RentReel] Server running on http://localhost:${port}`);
        resolve();
      });

      server.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE' && portIndex < candidatePorts.length - 1) {
          portIndex += 1;
          setTimeout(() => tryListen(), 100);
          return;
        }

        reject(error);
      });
    };

    tryListen();
  });
}

startServer().catch((err) => {
  console.error('[RentReel] Failed to start server:', err);
  process.exit(1);
});
