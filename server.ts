import 'dotenv/config';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import express from 'express';

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

function resolveWritableStorePath() {
  if (process.env.AIVAD_STORE_PATH) {
    return path.resolve(process.env.AIVAD_STORE_PATH);
  }
  if (process.env.K_SERVICE || process.env.K_REVISION) {
    return path.join(os.tmpdir(), '.aivad-server-store.json');
  }
  return path.resolve(process.cwd(), '.aivad-server-store.json');
}

async function loadApiRouterFactory() {
  const builtBundlePath = path.resolve(process.cwd(), 'dist', 'apiRouter.mjs');
  if (process.env.NODE_ENV === 'production' && fs.existsSync(builtBundlePath)) {
    const mod = await import(pathToFileURL(builtBundlePath).href);
    return mod.createAivadApiRouter;
  }
  const devSourcePath = path.resolve(process.cwd(), 'src', 'server', 'apiRouter.ts');
  const mod = await import(pathToFileURL(devSourcePath).href);
  return mod.createAivadApiRouter;
}

async function createAppServer() {
  const app = express();
  const createAivadApiRouter = await loadApiRouterFactory();

  const runtimeEnv = { ...process.env };
  if (
    runtimeEnv.NODE_ENV === 'production' &&
    !runtimeEnv.AIVAD_ENV &&
    !(runtimeEnv.AIVAD_SESSION_SECRET || '').trim()
  ) {
    // Managed Cloud Run / Preview container without manual AIVAD_SESSION_SECRET:
    // boot cleanly with ephemeral 256-bit cryptographic session secret unless AIVAD_ENV=production is explicitly enforced.
    runtimeEnv.AIVAD_ENV = 'preview';
  }

  const { router, securityBoot } = createAivadApiRouter({
    storePath: resolveWritableStorePath(),
    env: runtimeEnv,
  });

  app.use(router);

  if (process.env.NODE_ENV !== 'production') {
    app.use('/@vite-plugin-pwa', (_req, res) => {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.send(`function cleanupStaleDevSw() {
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .then((unregistered) => {
        const hadSw = Array.isArray(unregistered) && unregistered.some(Boolean);
        const clearCaches =
          typeof caches !== 'undefined'
            ? caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
            : Promise.resolve([]);
        return clearCaches.then(() => {
          if (hadSw && typeof window !== 'undefined' && !window.sessionStorage.getItem('aivad_sw_purged')) {
            window.sessionStorage.setItem('aivad_sw_purged', '1');
            window.location.reload();
          }
        });
      })
      .catch(() => {});
  }
}
cleanupStaleDevSw();
export function registerDevSW() {
  cleanupStaleDevSw();
}
export function registerSW() {
  cleanupStaleDevSw();
  return async () => {};
}
export default registerDevSW;
`);
    });

    app.get(['/dev-sw.js', '/sw.js', '/registerSW.js'], (_req, res) => {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.send(`self.addEventListener('install', () => {
  if (typeof self.skipWaiting === 'function') self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      if (typeof caches !== 'undefined') {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if (self.registration && typeof self.registration.unregister === 'function') {
        await self.registration.unregister();
      }
    })()
  );
});
`);
    });

    app.get('/workbox-*.js', (_req, res) => {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.send('// stale workbox dev stub\n');
    });

    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    const srcAssetsDir = path.resolve(process.cwd(), 'src', 'assets');
    if (fs.existsSync(srcAssetsDir)) {
      app.use('/src/assets', express.static(srcAssetsDir));
    }
    app.use(express.static(distDir));
    app.use('/api/*', (_req, res) => {
      res.status(404).json({ ok: false, error: 'Endpoint API não encontrado.' });
    });
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(
      `[AIVAD Server] Running on http://${HOST}:${PORT} (runtime=${securityBoot.runtimeEnvironment}, nodeEnv=${process.env.NODE_ENV || 'development'})`
    );
  });
}

createAppServer().catch((err) => {
  console.error('[AIVAD Server] Fatal boot error:', err);
  process.exit(1);
});
