import express from 'express';
import compression from 'compression';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

for (const envFile of ['.env.local', '.env']) {
  if (existsSync(envFile) && typeof process.loadEnvFile === 'function') {
    try {
      process.loadEnvFile(envFile);
    } catch {
      // Ignore unreadable local env file; host env vars remain authoritative
    }
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT) || 3000;

async function startServer() {
  // Register tsx ESM hooks when invoked directly via `node server.ts`
  try {
    const { register } = await import('tsx/esm/api');
    register();
  } catch {
    // Already running under tsx or loader already registered
  }

  const [
    { default: authHandler },
    { default: buyerAuthHandler },
    { default: commerceHandler },
    { default: customDomainHandler },
    { default: disputeCronHandler },
    { default: disputesHandler },
    { default: emailCronHandler },
    { default: paystackCallbackHandler },
    { default: paystackWebhookHandler },
    { default: platformAdminHandler },
    { default: storeHandler },
    { default: storefrontHandler },
  ] = await Promise.all([
    import('./api/auth.ts'),
    import('./api/buyer-auth.ts'),
    import('./api/commerce.ts'),
    import('./api/custom-domain.ts'),
    import('./api/dispute-cron.ts'),
    import('./api/disputes.ts'),
    import('./api/email-cron.ts'),
    import('./api/paystack/callback.ts'),
    import('./api/paystack/webhook.ts'),
    import('./api/platform-admin.ts'),
    import('./api/store.ts'),
    import('./api/storefront.ts'),
  ]);

  const app = express();
  app.set('trust proxy', true);
  app.use(compression({ threshold: 1024 }));
  app.use('/api/paystack/webhook', express.raw({ type: 'application/json', limit: '1mb' }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  const wrap = (handler: (req: any, res: any) => Promise<any> | any) => {
    return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      try {
        await handler(req, res);
      } catch (err) {
        next(err);
      }
    };
  };

  const commerceGroup = (group: 'buyer' | 'merchant' | 'payments') => {
    const handler = wrap(commerceHandler);
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const parsed = new URL(req.url, 'http://localhost');
      parsed.searchParams.set('group', group);
      req.url = parsed.pathname + parsed.search;
      return handler(req, res, next);
    };
  };

  app.all('/api/auth', wrap(authHandler));
  app.all('/api/buyer-auth', wrap(buyerAuthHandler));
  app.all('/api/buyer', commerceGroup('buyer'));
  app.all('/api/merchant', commerceGroup('merchant'));
  app.all('/api/payments', commerceGroup('payments'));
  app.all('/api/commerce', wrap(commerceHandler));
  app.all('/api/custom-domain', wrap(customDomainHandler));
  app.all('/api/dispute-cron', wrap(disputeCronHandler));
  app.all('/api/disputes', wrap(disputesHandler));
  app.all('/api/email-cron', wrap(emailCronHandler));
  app.all('/api/paystack/callback', wrap(paystackCallbackHandler));
  app.all('/api/paystack/webhook', wrap(paystackWebhookHandler));
  app.all('/api/platform-admin', wrap(platformAdminHandler));
  app.all('/api/store', wrap(storeHandler));
  app.all('/api/storefront', wrap(storefrontHandler));

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'custom',
    });

    app.use(express.static(path.resolve(__dirname, 'public')));
    app.use(vite.middlewares);

    app.use(async (req, res, next) => {
      if (req.method !== 'GET') return next();
      try {
        const templatePath = path.resolve(__dirname, 'index.html');
        const rawHtml = await fs.readFile(templatePath, 'utf-8');
        const html = await vite.transformIndexHtml(req.originalUrl, rawHtml);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (err) {
        vite.ssrFixStacktrace(err as Error);
        next(err);
      }
    });
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir, {
      setHeaders: (res, filePath) => {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    }));
    app.use((req, res, next) => {
      if (req.method !== 'GET') return next();
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`DASMARKET server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
