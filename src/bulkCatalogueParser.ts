import { storefrontCategories } from './storefrontCatalog';

export type ParsedCatalogueRow = {
  row: number;
  name: string;
  price: number | null;
  priceRaw: string;
  description: string;
  type: 'physical' | 'data_bundle' | 'digital';
  stock: number | null;
  sku: string;
  category: string;
  parentCategory: string;
  condition: string;
  brand: string;
  model: string;
  rating: number | null;
  reviewCount: number | null;
  spotlight: boolean;
  specifications: any;
  image: string;
  images: string[];
  imageFilename: string;
};

export type ClassifiedCatalogueRow = ParsedCatalogueRow & {
  status: 'ready' | 'duplicate_shop' | 'duplicate_file' | 'invalid';
  statusReason: string;
};

const PARENT_BY_SUB = new Map<string, string>();
for (const group of storefrontCategories) {
  PARENT_BY_SUB.set(group.name.toLowerCase(), group.name);
  for (const sub of group.subcategories) {
    if (!sub.startsWith('All ')) {
      PARENT_BY_SUB.set(sub.toLowerCase(), group.name);
    }
  }
}

export function normalizeNameKey(value: string): string {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function normalizeSkuKey(value: string): string {
  return String(value || '').trim().toLowerCase();
}

export function resolveParentCategory(category: string, explicitParent?: string): string {
  const cleanParent = String(explicitParent || '').trim();
  if (cleanParent) return cleanParent;
  const cleanCat = String(category || '').trim();
  if (!cleanCat) return '';
  return PARENT_BY_SUB.get(cleanCat.toLowerCase()) || '';
}

function parsePriceNumber(val: unknown, minorFallback?: unknown): { price: number | null; raw: string } {
  if (val !== undefined && val !== null && String(val).trim() !== '') {
    const cleaned = String(val).replace(/kes|ksh|,|\s/gi, '');
    const num = Number(cleaned);
    if (Number.isFinite(num) && num >= 0 && num <= 100000000) {
      return { price: Math.round(num * 100) / 100, raw: String(val).trim() };
    }
    return { price: null, raw: String(val).trim() };
  }
  if (minorFallback !== undefined && minorFallback !== null && String(minorFallback).trim() !== '') {
    const num = Number(minorFallback);
    if (Number.isFinite(num) && num >= 0) {
      const major = Math.round(num) / 100;
      return { price: major, raw: String(major) };
    }
  }
  return { price: null, raw: '' };
}

function parseStockNumber(val: unknown): { stock: number | null; valid: boolean } {
  if (val === undefined || val === null || String(val).trim() === '') {
    return { stock: null, valid: true };
  }
  const num = Number(String(val).trim());
  if (!Number.isInteger(num) || num < 0) {
    return { stock: null, valid: false };
  }
  return { stock: num, valid: true };
}

function extractImageList(rawSingle: unknown, rawMany: unknown): string[] {
  const out: string[] = [];
  const pushUrl = (v: string) => {
    const clean = v.trim();
    if (!clean) return;
    if (!out.includes(clean)) out.push(clean);
  };

  if (typeof rawSingle === 'string' && rawSingle.trim()) {
    for (const part of rawSingle.split(/\s*\|\s*/)) {
      pushUrl(part);
    }
  }

  if (Array.isArray(rawMany)) {
    for (const item of rawMany) {
      const str =
        typeof item === 'string'
          ? item
          : String(item?.url || item?.src || item?.publicUrl || item?.public_url || '');
      pushUrl(str);
    }
  } else if (typeof rawMany === 'string' && rawMany.trim()) {
    const separator = rawMany.includes('|') ? /\s*\|\s*/ : /\s*,\s*/;
    for (const part of rawMany.split(separator)) {
      pushUrl(part);
    }
  }

  return out.slice(0, 5);
}

export function parseCsvCatalogue(input: string): ParsedCatalogueRow[] {
  const cleanInput = input.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < cleanInput.length; i++) {
    const ch = cleanInput[i];
    if (ch === '"' && quoted && cleanInput[i + 1] === '"') {
      cell += '"';
      i++;
    } else if (ch === '"') {
      quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && cleanInput[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);

  if (rows.length < 2) {
    throw new Error('CSV file must include a header row and at least one product row.');
  }

  const headers = rows.shift()!.map((h) => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
  const ix = (...candidates: string[]) => headers.findIndex((h) => candidates.includes(h));

  const nameIx = ix('name', 'title', 'productname', 'itemname');
  const priceIx = ix('price', 'pricekes', 'sellingprice', 'amount', 'unitprice');
  const priceMinorIx = ix('priceminor', 'unitpriceminor');

  if (nameIx < 0 || (priceIx < 0 && priceMinorIx < 0)) {
    throw new Error('CSV must include Name and Price columns.');
  }

  const descIx = ix('description', 'shortdescription', 'summary', 'details');
  const typeIx = ix('type', 'producttype');
  const stockIx = ix('stock', 'quantity', 'stockquantity', 'qty');
  const skuIx = ix('sku', 'productsku', 'itemcode', 'code');
  const catIx = ix('category', 'subcategory', 'categoryname');
  const parentCatIx = ix('parentcategory', 'maincategory', 'department');
  const conditionIx = ix('condition');
  const brandIx = ix('brand');
  const modelIx = ix('model');
  const imgIx = ix('image', 'imageurl', 'productimage', 'thumbnail');
  const imgsIx = ix('images', 'imageurls', 'gallery');
  const imgFnIx = ix('imagefilename', 'filename', 'imagefile');

  return rows.map((r, i) => {
    const rawType = typeIx >= 0 ? String(r[typeIx] || '').trim().toLowerCase() : 'physical';
    const type: 'physical' | 'data_bundle' | 'digital' =
      rawType === 'data_bundle' || rawType === 'digital' ? rawType : 'physical';
    const { price, raw: priceRaw } = parsePriceNumber(
      priceIx >= 0 ? r[priceIx] : undefined,
      priceMinorIx >= 0 ? r[priceMinorIx] : undefined
    );
    const { stock } = parseStockNumber(stockIx >= 0 ? r[stockIx] : undefined);
    const category = catIx >= 0 ? String(r[catIx] || '').trim() : '';
    const parentCategory = resolveParentCategory(
      category,
      parentCatIx >= 0 ? String(r[parentCatIx] || '').trim() : ''
    );
    const images = extractImageList(
      imgIx >= 0 ? r[imgIx] : '',
      imgsIx >= 0 ? r[imgsIx] : ''
    );

    return {
      row: i + 2,
      name: String(r[nameIx] || '').trim(),
      price,
      priceRaw,
      description: descIx >= 0 ? String(r[descIx] || '').trim() : '',
      type,
      stock,
      sku: skuIx >= 0 ? String(r[skuIx] || '').trim() : '',
      category,
      parentCategory,
      condition: conditionIx >= 0 ? String(r[conditionIx] || '').trim() : '',
      brand: brandIx >= 0 ? String(r[brandIx] || '').trim() : '',
      model: modelIx >= 0 ? String(r[modelIx] || '').trim() : '',
      rating: null,
      reviewCount: null,
      spotlight: false,
      specifications: null,
      image: images[0] || '',
      images,
      imageFilename: imgFnIx >= 0 ? String(r[imgFnIx] || '').trim() : '',
    };
  });
}

export function parseJsonCatalogue(input: string): {
  rows: ParsedCatalogueRow[];
  fileCategory?: string;
  fileParentCategory?: string;
} {
  let parsed: any;
  try {
    parsed = JSON.parse(input.replace(/^\uFEFF/, ''));
  } catch {
    throw new Error('Could not parse JSON file. Ensure the file contains valid JSON.');
  }

  let items: any[] = [];
  let fileCategory = '';
  let fileParentCategory = '';

  if (Array.isArray(parsed)) {
    items = parsed;
  } else if (parsed && typeof parsed === 'object') {
    fileCategory = String(parsed.category || parsed.subcategory || parsed.sub_category || '').trim();
    fileParentCategory = String(
      parsed.parentCategory || parsed.parent_category || parsed.department || ''
    ).trim();
    const list =
      parsed.products ||
      parsed.items ||
      parsed.data ||
      parsed.catalogue ||
      parsed.catalog ||
      parsed.results ||
      parsed.records;
    if (Array.isArray(list)) {
      items = list;
    }
  }

  if (!Array.isArray(items) || !items.length) {
    throw new Error('JSON file must be a non-empty array of products or contain a products/items array.');
  }

  const rows: ParsedCatalogueRow[] = items.map((item, idx) => {
    const meta = item?.metadata && typeof item.metadata === 'object' ? item.metadata : {};
    const name = String(item?.name || item?.title || item?.product_name || item?.productName || '').trim();
    const { price, raw: priceRaw } = parsePriceNumber(
      item?.price ?? item?.price_kes ?? item?.priceKes ?? item?.selling_price ?? item?.amount ?? item?.unit_price,
      item?.price_minor ?? item?.priceMinor
    );
    const { stock } = parseStockNumber(
      item?.stock ?? item?.stockQuantity ?? item?.stock_quantity ?? item?.quantity ?? item?.qty
    );

    const category = String(
      item?.category ||
        item?.sub_category ||
        item?.subcategory ||
        item?.category_name ||
        meta?.category ||
        fileCategory ||
        ''
    ).trim();

    const parentCategory = resolveParentCategory(
      category,
      String(
        item?.parentCategory ||
          item?.parent_category ||
          item?.main_category ||
          item?.department ||
          meta?.parent_category ||
          fileParentCategory ||
          ''
      ).trim()
    );

    const rawType = String(item?.type || item?.product_type || item?.productType || 'physical')
      .trim()
      .toLowerCase();
    const type: 'physical' | 'data_bundle' | 'digital' =
      rawType === 'data_bundle' || rawType === 'digital' ? rawType : 'physical';

    const images = extractImageList(
      item?.image || item?.imageUrl || item?.image_url || item?.thumbnail,
      item?.images
    );

    const specifications =
      item?.specifications ?? item?.specs ?? meta?.specifications ?? null;

    const ratingRaw = item?.rating ?? meta?.rating ?? specifications?.rating;
    const ratingNum = ratingRaw !== undefined && ratingRaw !== null ? Number(ratingRaw) : null;
    const reviewRaw =
      item?.reviewCount ??
      item?.review_count ??
      item?.reviews ??
      meta?.review_count ??
      meta?.reviews;
    const reviewCountNum = reviewRaw !== undefined && reviewRaw !== null ? Number(reviewRaw) : null;

    return {
      row: idx + 1,
      name,
      price,
      priceRaw,
      description: String(
        item?.description || item?.short_description || item?.summary || ''
      ).trim(),
      type,
      stock,
      sku: String(item?.sku || item?.product_sku || item?.item_code || item?.code || '').trim(),
      category,
      parentCategory,
      condition: String(item?.condition || meta?.condition || '').trim(),
      brand: String(item?.brand || meta?.brand || '').trim(),
      model: String(item?.model || meta?.model || '').trim(),
      rating: ratingNum !== null && Number.isFinite(ratingNum) ? ratingNum : null,
      reviewCount:
        reviewCountNum !== null && Number.isInteger(reviewCountNum) ? reviewCountNum : null,
      spotlight: Boolean(item?.spotlight ?? meta?.spotlight),
      specifications,
      image: images[0] || '',
      images,
      imageFilename: String(item?.imageFilename || item?.image_filename || '').trim(),
    };
  });

  return { rows, fileCategory, fileParentCategory };
}

export function classifyCatalogueRows(
  rows: ParsedCatalogueRow[],
  options: {
    existingSkus: Set<string>;
    existingNames: Set<string>;
    skipDuplicates: boolean;
    availableImageFiles?: Record<string, File>;
  }
): ClassifiedCatalogueRow[] {
  const seenSkus = new Set<string>();
  const seenNames = new Set<string>();

  return rows.map((row) => {
    if (!row.name) {
      return { ...row, status: 'invalid', statusReason: 'Missing product name' };
    }
    if (row.price === null || !Number.isFinite(row.price) || row.price < 0) {
      return { ...row, status: 'invalid', statusReason: `Invalid price (${row.priceRaw || 'empty'})` };
    }
    for (const img of row.images) {
      if (!/^https:\/\//i.test(img)) {
        return { ...row, status: 'invalid', statusReason: 'Image URL must start with https://' };
      }
    }
    if (row.imageFilename && options.availableImageFiles) {
      const fn = row.imageFilename.split('/').pop()?.toLowerCase() || '';
      if (fn && !options.availableImageFiles[fn]) {
        return { ...row, status: 'invalid', statusReason: `Missing ZIP image: ${row.imageFilename}` };
      }
    }

    const skuKey = normalizeSkuKey(row.sku);
    const nameKey = normalizeNameKey(row.name);

    if (options.skipDuplicates) {
      if (skuKey && options.existingSkus.has(skuKey)) {
        return { ...row, status: 'duplicate_shop', statusReason: 'Already in shop (SKU match)' };
      }
      if (nameKey && options.existingNames.has(nameKey)) {
        return { ...row, status: 'duplicate_shop', statusReason: 'Already in shop (name match)' };
      }
      if ((skuKey && seenSkus.has(skuKey)) || (nameKey && seenNames.has(nameKey))) {
        return { ...row, status: 'duplicate_file', statusReason: 'Duplicate inside uploaded file' };
      }
    }

    if (skuKey) seenSkus.add(skuKey);
    if (nameKey) seenNames.add(nameKey);

    return { ...row, status: 'ready', statusReason: 'Ready to import' };
  });
}
