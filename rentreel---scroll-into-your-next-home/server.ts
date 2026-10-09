import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './src/server/routes.ts';
import { connectDatabase } from './src/server/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const databaseReady = await connectDatabase();
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

  // Session-backed auth for Google OIDC and server-side user identity
  app.set('trust proxy', 1);
  app.use(
    session({
      name: 'rentreel.sid',
      secret: process.env.SESSION_SECRET || 'rentreel-dev-secret-change-me',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24 * 7,
      },
    })
  );

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
      database: databaseReady ? 'postgres' : 'json-fallback',
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
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
