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

  const escapeHtmlAttr = (value: string) =>
    String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const NON_STORE_FIRST_SEGMENTS = new Set([
    '',
    'login',
    'signup',
    'reset-password',
    'dashboard',
    'platform-admin',
    'create-online-store',
    'ecommerce-platform',
    'sell-online-with-mpesa',
    'custom-domain-online-store',
    'online-store-management',
  ]);

  const isPlatformHostname = (host: string) =>
    host === 'dasmarket.co.ke' ||
    host === 'www.dasmarket.co.ke' ||
    host === 'app.dasmarket.co.ke' ||
    host === 'mambu.dasmarket.co.ke' ||
    host.endsWith('.vercel.app') ||
    host.endsWith('.run.app') ||
    host.endsWith('.googleusercontent.com') ||
    host.endsWith('.aistudio.google.com') ||
    host === 'localhost' ||
    host === '127.0.0.1';

  const getRequestHost = (req: express.Request) =>
    String(req.headers['x-forwarded-host'] || req.headers.host || '')
      .split(',')[0]
      .trim()
      .split(':')[0]
      .toLowerCase();

  const standardIcons = [
    { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ];

  async function resolveStoreMeta(host: string, explicitSlug: string) {
    const fallback = {
      name: explicitSlug ? explicitSlug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'DASMARKET Store',
      shortName: explicitSlug ? explicitSlug.slice(0, 12) : 'DASMARKET',
      description: 'Browse products, place orders, and track delivery on DASMARKET.',
      slug: explicitSlug,
      themeColor: '#ea580c',
    };
    try {
      const { getDb } = await import('./server/db.js');
      const sql = getDb();
      const tenantSub =
        host.endsWith('.dasmarket.co.ke') && !['www', 'app', 'mambu'].includes(host.split('.')[0])
          ? host.split('.')[0]
          : '';
      const isCustom = Boolean(host && !isPlatformHostname(host) && !tenantSub);
      let rows: any[] = [];
      if (isCustom) {
        rows = await sql`
          SELECT t.name, t.slug, s.description, s.theme
          FROM public.domains d
          JOIN public.tenants t ON t.id = d.tenant_id
          LEFT JOIN public.sites s ON s.tenant_id = t.id
          WHERE lower(d.hostname) = ${host}
            AND (d.verified_at IS NOT NULL OR d.verification_data->>'storefrontVerified' = 'true')
            AND t.status IN ('trial', 'active')
          LIMIT 1
        `;
      } else {
        const lookupSlug = (explicitSlug || tenantSub).toLowerCase().trim();
        if (lookupSlug && /^[a-z0-9-]+$/.test(lookupSlug)) {
          rows = await sql`
            SELECT t.name, t.slug, s.description, s.theme
            FROM public.tenants t
            LEFT JOIN public.sites s ON s.tenant_id = t.id
            WHERE lower(t.slug) = ${lookupSlug}
              AND t.status IN ('trial', 'active')
            LIMIT 1
          `;
        }
      }
      if (rows[0]?.name) {
        const name = String(rows[0].name).trim().slice(0, 80);
        const slug = String(rows[0].slug || explicitSlug).trim();
        const theme = /^#[0-9a-f]{6}$/i.test(String(rows[0].theme || ''))
          ? String(rows[0].theme)
          : '#ea580c';
        return {
          name,
          shortName: name.slice(0, 12).trim() || 'Shop',
          description: String(rows[0].description || fallback.description).slice(0, 200),
          slug,
          themeColor: theme,
        };
      }
    } catch {
      // Safe fallback when database is unavailable
    }
    return fallback;
  }

  app.get('/manifest-seller.webmanifest', (req, res) => {
    const host = getRequestHost(req);
    const isAdminCustom = host.startsWith('adm.') && !isPlatformHostname(host);
    const baseStart = isAdminCustom ? '/' : '/dashboard';
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.status(200).json({
      id: baseStart,
      name: 'DASMARKET Seller Dashboard',
      short_name: 'DAS Seller',
      description: 'Manage products, bulk catalogue imports, orders, and M-PESA payments on DASMARKET.',
      theme_color: '#0f52ba',
      background_color: '#f8fafc',
      display: 'standalone',
      start_url: baseStart,
      scope: baseStart,
      icons: standardIcons,
    });
  });

  app.get('/manifest-store.webmanifest', async (req, res) => {
    const host = getRequestHost(req);
    const rawSlug = String(req.query?.slug || '').toLowerCase().trim();
    const safeSlug = /^[a-z0-9-]+$/.test(rawSlug) ? rawSlug : '';
    const tenantSub =
      host.endsWith('.dasmarket.co.ke') && !['www', 'app', 'mambu'].includes(host.split('.')[0])
        ? host.split('.')[0]
        : '';
    const isCustom = Boolean(host && !isPlatformHostname(host) && !tenantSub);
    const meta = await resolveStoreMeta(host, safeSlug);
    const rootScoped = isCustom || Boolean(tenantSub) || !meta.slug;
    const baseStart = rootScoped ? '/' : `/${encodeURIComponent(meta.slug)}`;
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.status(200).json({
      id: baseStart,
      name: meta.name,
      short_name: meta.shortName,
      description: meta.description,
      theme_color: meta.themeColor,
      background_color: '#f8fafc',
      display: 'standalone',
      start_url: baseStart,
      scope: baseStart,
      icons: standardIcons,
    });
  });

  async function customizePwaHtml(rawHtml: string, req: express.Request): Promise<string> {
    const host = getRequestHost(req);
    const pathname = (req.originalUrl || req.url || '/').split('?')[0];
    const trimmed = pathname.replace(/^\/+|\/+$/g, '');
    const firstSegment = (trimmed.split('/')[0] || '').toLowerCase();
    const tenantSub =
      host.endsWith('.dasmarket.co.ke') && !['www', 'app', 'mambu'].includes(host.split('.')[0])
        ? host.split('.')[0]
        : '';
    const isCustom = Boolean(host && !isPlatformHostname(host) && !tenantSub);
    const isSellerRoute =
      host.startsWith('adm.') || firstSegment === 'dashboard';
    const isPlatformAdminRoute =
      host === 'mambu.dasmarket.co.ke' || firstSegment === 'platform-admin';
    const isStorefrontRoute =
      !isSellerRoute &&
      !isPlatformAdminRoute &&
      (Boolean(tenantSub) || isCustom || (Boolean(firstSegment) && !NON_STORE_FIRST_SEGMENTS.has(firstSegment)));

    let manifestHref = '/manifest.webmanifest';
    let appTitle = 'DASMARKET';

    if (isSellerRoute) {
      manifestHref = '/manifest-seller.webmanifest';
      appTitle = 'DAS Seller';
    } else if (isStorefrontRoute) {
      const slug = tenantSub || (isCustom ? '' : firstSegment);
      manifestHref = slug
        ? `/manifest-store.webmanifest?slug=${encodeURIComponent(slug)}`
        : '/manifest-store.webmanifest';
      const meta = await resolveStoreMeta(host, slug);
      appTitle = meta.shortName;
    }

    let html = rawHtml;
    const safeHref = escapeHtmlAttr(manifestHref);
    const safeAppTitle = escapeHtmlAttr(appTitle);

    if (/<link[^>]+rel=["']manifest["'][^>]*>/i.test(html)) {
      html = html.replace(
        /<link[^>]+rel=["']manifest["'][^>]*>/i,
        `<link rel="manifest" href="${safeHref}" />`
      );
    } else {
      html = html.replace(
        /<\/head>/i,
        `  <link rel="manifest" href="${safeHref}" />\n  </head>`
      );
    }

    html = html.replace(
      /<meta\s+name=["']apple-mobile-web-app-title["']\s+content=["'][^"']*["']\s*\/?>/i,
      `<meta name="apple-mobile-web-app-title" content="${safeAppTitle}" />`
    );

    if (isSellerRoute) {
      html = html.replace(
        /<meta\s+name=["']application-name["']\s+content=["'][^"']*["']\s*\/?>/i,
        '<meta name="application-name" content="DASMARKET Seller Dashboard" />'
      );
    } else if (isStorefrontRoute) {
      html = html.replace(
        /<meta\s+name=["']application-name["']\s+content=["'][^"']*["']\s*\/?>/i,
        `<meta name="application-name" content="${safeAppTitle}" />`
      );
    }

    return html;
  }

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
        const transformed = await vite.transformIndexHtml(req.originalUrl, rawHtml);
        const html = await customizePwaHtml(transformed, req);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (err) {
        vite.ssrFixStacktrace(err as Error);
        next(err);
      }
    });
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    let prodTemplateCache: string | null = null;
    app.use(express.static(distDir, {
      index: false,
      setHeaders: (res, filePath) => {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      },
    }));
    app.use(async (req, res, next) => {
      if (req.method !== 'GET') return next();
      try {
        if (!prodTemplateCache) {
          prodTemplateCache = await fs.readFile(path.join(distDir, 'index.html'), 'utf-8');
        }
        const html = await customizePwaHtml(prodTemplateCache, req);
        res.setHeader('Cache-Control', 'no-cache');
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (err) {
        next(err);
      }
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
