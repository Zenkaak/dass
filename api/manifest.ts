import { getDb } from '../server/db.js';

const icons = [
  { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
  { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
];

function hostOf(req: any) {
  return String(req.headers['x-forwarded-host'] || req.headers.host || '')
    .split(',')[0].trim().split(':')[0].toLowerCase();
}

export default async function handler(req: any, res: any) {
  const host = hostOf(req);
  const type = String(req.query?.type || 'platform');
  const base = {
    theme_color: '#0f52ba',
    background_color: '#f8fafc',
    display: 'standalone',
    icons,
  };

  if (type === 'seller') {
    const start = host.startsWith('adm.') ? '/' : '/dashboard';
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      ...base, id: start, name: 'DASMARKET Seller Dashboard',
      short_name: 'DAS Seller',
      description: 'Manage your shop, products and orders.',
      start_url: start, scope: start,
    });
  }

  if (type !== 'store') {
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.status(200).json({
      ...base, id: '/', name: 'DASMARKET Kenya', short_name: 'DASMARKET',
      description: 'Create and manage your online shop with DASMARKET.',
      start_url: '/', scope: '/',
    });
  }

  const reserved = new Set(['', 'login', 'signup', 'reset-password', 'dashboard', 'platform-admin', 'create-online-store', 'ecommerce-platform', 'sell-online-with-mpesa', 'custom-domain-online-store', 'online-store-management']);
  const pathname = String(req.url || '/').split('?')[0];
  const first = pathname.replace(/^\/+|\/+$/g, '').split('/')[0] || '';
  const explicit = String(req.query?.slug || '').toLowerCase().trim();
  const tenantSub = host.endsWith('.dasmarket.co.ke') && !['www', 'app', 'mambu'].includes(host.split('.')[0])
    ? host.split('.')[0] : '';
  const slug = /^[a-z0-9-]+$/.test(explicit) ? explicit : tenantSub || (!reserved.has(first) && /^[a-z0-9-]+$/.test(first) ? first : '');
  let name = slug ? slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Online Shop';
  let description = 'Browse products, place orders and shop online.';
  let theme = '#ea580c';
  let start = '/';

  try {
    const sql = getDb();
    let rows: any[] = [];
    const isPlatformHost = ['dasmarket.co.ke', 'www.dasmarket.co.ke', 'app.dasmarket.co.ke', 'mambu.dasmarket.co.ke'].includes(host) || host.endsWith('.vercel.app');
    const isCustom = Boolean(host && !isPlatformHost && !tenantSub);
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
    } else if (slug) {
      rows = await sql`
        SELECT t.name, t.slug, s.description, s.theme
        FROM public.tenants t
        LEFT JOIN public.sites s ON s.tenant_id = t.id
        WHERE lower(t.slug) = ${slug} AND t.status IN ('trial', 'active')
        LIMIT 1
      `;
    }
    if (rows[0]?.name) {
      name = String(rows[0].name).trim().slice(0, 80);
      description = String(rows[0].description || description).slice(0, 200);
      theme = /^#[0-9a-f]{6}$/i.test(String(rows[0].theme || '')) ? String(rows[0].theme) : theme;
      const actualSlug = String(rows[0].slug || slug || '').trim();
      if (!isCustom && !tenantSub && actualSlug) start = '/' + encodeURIComponent(actualSlug);
    }
  } catch (error) {
    console.error('Store manifest lookup failed', error);
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    ...base, id: start, name, short_name: name.slice(0, 12).trim() || 'Shop',
    description, theme_color: theme, start_url: start, scope: start,
  });
}
