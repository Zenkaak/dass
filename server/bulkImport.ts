import crypto from 'node:crypto';
import { storefrontCategories } from '../src/storefrontCatalog.js';

export type BulkNormalizedProduct = {
  row: number;
  name: string;
  price: number;
  description: string;
  type: 'physical' | 'data_bundle' | 'digital';
  stock: number | null;
  sku: string | null;
  images: string[];
  isActive: boolean;
  metadata: Record<string, any>;
};

const PARENT_BY_SUBCATEGORY = new Map<string, string>();
for (const group of storefrontCategories) {
  PARENT_BY_SUBCATEGORY.set(group.name.toLowerCase(), group.name);
  for (const sub of group.subcategories) {
    if (!sub.startsWith('All ')) {
      PARENT_BY_SUBCATEGORY.set(sub.toLowerCase(), group.name);
    }
  }
}

export function normalizeProductNameKey(value: string): string {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function normalizeSkuKey(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase();
}

function slugify(value: string): string {
  return (
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'product'
  );
}

export function inferParentCategory(category: string, explicitParent?: string): string {
  const cleanParent = String(explicitParent || '').trim().slice(0, 100);
  if (cleanParent) return cleanParent;
  const cleanCat = String(category || '').trim();
  if (!cleanCat) return '';
  return PARENT_BY_SUBCATEGORY.get(cleanCat.toLowerCase()) || cleanCat;
}

export function validateAndNormalizeBulkRows(
  rows: any[],
  tenantId: string
): { items: BulkNormalizedProduct[]; error?: string } {
  const items: BulkNormalizedProduct[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] || {};
    const rowLabel = String(r.row || i + 1);
    const name = String(r.name || '').trim().slice(0, 160);
    const price = Number(r.price);
    const description = String(r.description || '').trim().slice(0, 4000);
    const rawType = String(r.type || 'physical').trim().toLowerCase();
    const type: 'physical' | 'data_bundle' | 'digital' =
      rawType === 'data_bundle' || rawType === 'digital' ? rawType : 'physical';

    const stockRaw = r.stock === null || r.stock === undefined || String(r.stock).trim() === '' ? null : Number(r.stock);
    const sku = String(r.sku || '').trim().slice(0, 100) || null;
    const isActive = r.isActive === undefined ? true : Boolean(r.isActive);

    if (
      !name ||
      !Number.isFinite(price) ||
      price < 0 ||
      price > 100000000 ||
      (stockRaw !== null && (!Number.isInteger(stockRaw) || stockRaw < 0))
    ) {
      return { items: [], error: `Invalid product name, price or stock on row ${rowLabel}.` };
    }

    const imageKey = String(r.imageKey || '').trim();
    const singleImage = String(r.image || '').trim();
    const rawImages = Array.isArray(r.images) ? r.images : [];
    const collectedImages: string[] = [];

    if (imageKey) {
      if (!imageKey.startsWith(`${tenantId}/products/`) || imageKey.includes('..')) {
        return { items: [], error: `Invalid uploaded image key on row ${rowLabel}.` };
      }
      collectedImages.push(`neon-object:${imageKey}`);
    }

    const candidateUrls = [
      ...(singleImage ? [singleImage] : []),
      ...rawImages.map((img: any) =>
        typeof img === 'string'
          ? img.trim()
          : String(img?.url || img?.src || img?.publicUrl || '').trim()
      ),
    ].filter(Boolean);

    for (const url of candidateUrls) {
      if (collectedImages.length >= 5) break;
      if (url.startsWith('neon-object:')) {
        const keyPart = url.slice('neon-object:'.length);
        if (!keyPart.startsWith(`${tenantId}/products/`) || keyPart.includes('..')) {
          return { items: [], error: `Invalid object storage image reference on row ${rowLabel}.` };
        }
        if (!collectedImages.includes(url)) collectedImages.push(url);
        continue;
      }
      if (!/^https:\/\//i.test(url) || url.length > 2000) {
        return { items: [], error: `Image URL on row ${rowLabel} must be a valid HTTPS URL under 2000 characters.` };
      }
      if (!collectedImages.includes(url)) collectedImages.push(url);
    }

    const category = String(r.category || '').trim().slice(0, 100);
    const parentCategory = inferParentCategory(category, r.parentCategory);
    const condition = String(r.condition || '').trim().slice(0, 40);
    const brand = String(r.brand || '').trim().slice(0, 100);
    const model = String(r.model || '').trim().slice(0, 100);
    const spotlight = Boolean(r.spotlight);
    const ratingNum = Number(r.rating);
    const reviewCountNum = Number(r.reviewCount);

    const metadata: Record<string, any> = {
      catalogue_import: true,
    };
    if (category) metadata.category = category;
    if (parentCategory) metadata.parent_category = parentCategory;
    if (condition) metadata.condition = condition;
    if (brand) metadata.brand = brand;
    if (model) metadata.model = model;
    if (spotlight) metadata.spotlight = true;
    if (Number.isFinite(ratingNum) && ratingNum > 0 && ratingNum <= 5) metadata.rating = Number(ratingNum.toFixed(1));
    if (Number.isInteger(reviewCountNum) && reviewCountNum >= 0) metadata.review_count = reviewCountNum;

    if (r.specifications && (typeof r.specifications === 'object' || Array.isArray(r.specifications))) {
      const serialized = JSON.stringify(r.specifications);
      if (serialized.length <= 16000) {
        metadata.specifications = r.specifications;
      }
    }

    items.push({
      row: Number(r.row) || i + 1,
      name,
      price,
      description,
      type,
      stock: stockRaw,
      sku,
      images: collectedImages,
      isActive,
      metadata,
    });
  }

  return { items };
}

export async function partitionBulkDuplicates(
  sql: any,
  tenantId: string,
  items: BulkNormalizedProduct[]
): Promise<{
  toInsert: BulkNormalizedProduct[];
  skipped: Array<{ row: number; name: string; sku: string | null; reason: 'sku_exists' | 'name_exists' | 'duplicate_in_batch' }>;
}> {
  const existingRows = await sql`
    SELECT lower(btrim(sku)) AS sku_key, lower(regexp_replace(btrim(name), '\s+', ' ', 'g')) AS name_key
    FROM public.products
    WHERE tenant_id = ${tenantId}
  `;

  const existingSkus = new Set<string>();
  const existingNames = new Set<string>();
  for (const row of existingRows) {
    if (row.sku_key) existingSkus.add(String(row.sku_key));
    if (row.name_key) existingNames.add(String(row.name_key));
  }

  const batchSkus = new Set<string>();
  const batchNames = new Set<string>();
  const toInsert: BulkNormalizedProduct[] = [];
  const skipped: Array<{ row: number; name: string; sku: string | null; reason: 'sku_exists' | 'name_exists' | 'duplicate_in_batch' }> = [];

  for (const item of items) {
    const skuKey = normalizeSkuKey(item.sku);
    const nameKey = normalizeProductNameKey(item.name);

    if (skuKey && existingSkus.has(skuKey)) {
      skipped.push({ row: item.row, name: item.name, sku: item.sku, reason: 'sku_exists' });
      continue;
    }
    if (nameKey && existingNames.has(nameKey)) {
      skipped.push({ row: item.row, name: item.name, sku: item.sku, reason: 'name_exists' });
      continue;
    }
    if ((skuKey && batchSkus.has(skuKey)) || (nameKey && batchNames.has(nameKey))) {
      skipped.push({ row: item.row, name: item.name, sku: item.sku, reason: 'duplicate_in_batch' });
      continue;
    }

    if (skuKey) batchSkus.add(skuKey);
    if (nameKey) batchNames.add(nameKey);
    toInsert.push(item);
  }

  return { toInsert, skipped };
}

export async function insertBulkProducts(
  sql: any,
  tenantId: string,
  items: BulkNormalizedProduct[]
): Promise<number> {
  if (!items.length) return 0;

  const CHUNK = 100;
  let inserted = 0;

  for (let offset = 0; offset < items.length; offset += CHUNK) {
    const slice = items.slice(offset, offset + CHUNK);
    const tenantIds: string[] = [];
    const names: string[] = [];
    const slugs: string[] = [];
    const descriptions: string[] = [];
    const types: string[] = [];
    const pricesMinor: number[] = [];
    const stocks: Array<number | null> = [];
    const skus: Array<string | null> = [];
    const imagesJson: string[] = [];
    const metadataJson: string[] = [];
    const actives: boolean[] = [];

    for (const p of slice) {
      tenantIds.push(tenantId);
      names.push(p.name);
      slugs.push(`${slugify(p.name)}-${crypto.randomBytes(4).toString('hex')}`);
      descriptions.push(p.description);
      types.push(p.type);
      pricesMinor.push(Math.round(p.price * 100));
      stocks.push(p.stock);
      skus.push(p.sku);
      imagesJson.push(JSON.stringify(p.images));
      metadataJson.push(JSON.stringify(p.metadata));
      actives.push(p.isActive);
    }

    await sql`
      INSERT INTO public.products (
        tenant_id,
        name,
        slug,
        description,
        product_type,
        price_minor,
        stock_quantity,
        sku,
        images,
        metadata,
        is_active
      )
      SELECT *
      FROM unnest(
        ${tenantIds}::uuid[],
        ${names}::text[],
        ${slugs}::text[],
        ${descriptions}::text[],
        ${types}::text[],
        ${pricesMinor}::bigint[],
        ${stocks}::int[],
        ${skus}::text[],
        ${imagesJson}::jsonb[],
        ${metadataJson}::jsonb[],
        ${actives}::boolean[]
      )
    `;
    inserted += slice.length;
  }

  return inserted;
}

export async function fetchTenantDedupIndex(sql: any, tenantId: string) {
  const rows = await sql`
    SELECT lower(btrim(sku)) AS sku_key, lower(regexp_replace(btrim(name), '\s+', ' ', 'g')) AS name_key
    FROM public.products
    WHERE tenant_id = ${tenantId}
  `;
  const skus: string[] = [];
  const names: string[] = [];
  for (const r of rows) {
    if (r.sku_key) skus.push(String(r.sku_key));
    if (r.name_key) names.push(String(r.name_key));
  }
  return {
    skus: Array.from(new Set(skus)),
    names: Array.from(new Set(names)),
    total: rows.length,
  };
}
