import { useEffect, useMemo, useState } from 'react';
import { unzipSync } from 'fflate';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileUp,
  Layers,
  X,
} from 'lucide-react';
import { storefrontCategories } from './storefrontCatalog';
import {
  classifyCatalogueRows,
  parseCsvCatalogue,
  parseJsonCatalogue,
  resolveParentCategory,
  type ParsedCatalogueRow,
} from './bulkCatalogueParser';
import './bulk-importer.css';

type TenantOption = {
  id: string;
  name: string;
  slug: string;
};

type BulkCatalogueImporterProps = {
  mode: 'seller' | 'admin';
  tenants?: TenantOption[];
  initialTenantId?: string;
  existingProducts?: Array<{ name?: string; sku?: string | null }>;
  onUploadImage?: (file: File) => Promise<string>;
  onImported: () => Promise<void> | void;
  onClose?: () => void;
};

const categorySelectOptions = storefrontCategories.flatMap((group) => [
  group.name,
  ...group.subcategories.filter((sub) => !sub.startsWith('All ')),
]);

async function readJsonSafe(response: Response) {
  const text = await response.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {
      error: response.ok
        ? 'Server returned an unreadable response.'
        : `Request failed (HTTP ${response.status}).`,
    };
  }
  if (!response.ok && !data.error) {
    data.error = `Request failed (HTTP ${response.status}).`;
  }
  return data;
}

export function BulkCatalogueImporter({
  mode,
  tenants = [],
  initialTenantId = '',
  existingProducts,
  onUploadImage,
  onImported,
  onClose,
}: BulkCatalogueImporterProps) {
  const [selectedTenantId, setSelectedTenantId] = useState(
    initialTenantId || tenants[0]?.id || ''
  );
  const [dedupSkus, setDedupSkus] = useState<Set<string>>(() => new Set());
  const [dedupNames, setDedupNames] = useState<Set<string>>(() => new Set());
  const [indexTotal, setIndexTotal] = useState<number>(0);
  const [loadingIndex, setLoadingIndex] = useState(false);

  const [fileName, setFileName] = useState('');
  const [zipName, setZipName] = useState('');
  const [imageFiles, setImageFiles] = useState<Record<string, File>>({});
  const [parsedRows, setParsedRows] = useState<ParsedCatalogueRow[]>([]);
  const [categoryMode, setCategoryMode] = useState<'file' | 'override'>('file');
  const [defaultCategory, setDefaultCategory] = useState('');
  const [publishOnImport, setPublishOnImport] = useState(true);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [rowFilter, setRowFilter] = useState<'all' | 'ready' | 'duplicate' | 'invalid'>('all');
  const [isDragging, setIsDragging] = useState(false);

  const [error, setError] = useState('');
  const [resultMessage, setResultMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, batch: 0, batches: 0 });

  useEffect(() => {
    if (mode === 'admin' && !selectedTenantId && tenants.length > 0) {
      setSelectedTenantId(initialTenantId || tenants[0].id);
    }
  }, [mode, tenants, selectedTenantId, initialTenantId]);

  useEffect(() => {
    if (mode === 'admin' && initialTenantId) {
      setSelectedTenantId(initialTenantId);
    }
  }, [mode, initialTenantId]);

  useEffect(() => {
    let active = true;
    async function loadDedupIndex() {
      if (mode === 'admin' && !selectedTenantId) {
        setDedupSkus(new Set());
        setDedupNames(new Set());
        setIndexTotal(0);
        return;
      }

      if (mode === 'seller' && existingProducts && existingProducts.length > 0) {
        const skus = new Set<string>();
        const names = new Set<string>();
        for (const p of existingProducts) {
          const skuKey = String(p.sku || '').trim().toLowerCase();
          const nameKey = String(p.name || '').trim().replace(/\s+/g, ' ').toLowerCase();
          if (skuKey) skus.add(skuKey);
          if (nameKey) names.add(nameKey);
        }
        setDedupSkus(skus);
        setDedupNames(names);
        setIndexTotal(existingProducts.length);
      }

      setLoadingIndex(true);
      try {
        const url =
          mode === 'admin'
            ? `/api/platform-admin?action=tenant_dedup_index&tenantId=${encodeURIComponent(selectedTenantId)}`
            : '/api/merchant?action=products-dedup-index';
        const r = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
        const d = await readJsonSafe(r);
        if (!r.ok || !active) return;
        setDedupSkus(new Set<string>(Array.isArray(d.skus) ? d.skus : []));
        setDedupNames(new Set<string>(Array.isArray(d.names) ? d.names : []));
        setIndexTotal(Number(d.total || 0));
      } catch {
        // Fallback to client-loaded products or authoritative server dedup on submit
      } finally {
        if (active) setLoadingIndex(false);
      }
    }
    loadDedupIndex();
    return () => {
      active = false;
    };
  }, [mode, selectedTenantId, existingProducts]);

  const effectiveRows = useMemo(() => {
    const withCategory = parsedRows.map((r) => {
      const chosenCategory =
        categoryMode === 'override'
          ? defaultCategory.trim()
          : r.category.trim() || defaultCategory.trim();
      return {
        ...r,
        category: chosenCategory,
        parentCategory: resolveParentCategory(chosenCategory, r.parentCategory),
      };
    });

    return classifyCatalogueRows(withCategory, {
      existingSkus: dedupSkus,
      existingNames: dedupNames,
      skipDuplicates,
      availableImageFiles: zipName ? imageFiles : undefined,
    });
  }, [
    parsedRows,
    categoryMode,
    defaultCategory,
    dedupSkus,
    dedupNames,
    skipDuplicates,
    zipName,
    imageFiles,
  ]);

  const summary = useMemo(() => {
    let ready = 0;
    let duplicateShop = 0;
    let duplicateFile = 0;
    let invalid = 0;
    for (const row of effectiveRows) {
      if (row.status === 'ready') ready++;
      else if (row.status === 'duplicate_shop') duplicateShop++;
      else if (row.status === 'duplicate_file') duplicateFile++;
      else invalid++;
    }
    return {
      total: effectiveRows.length,
      ready,
      duplicates: duplicateShop + duplicateFile,
      duplicateShop,
      duplicateFile,
      invalid,
    };
  }, [effectiveRows]);

  const filteredPreview = useMemo(() => {
    return effectiveRows.filter((r) => {
      if (rowFilter === 'ready') return r.status === 'ready';
      if (rowFilter === 'duplicate') {
        return r.status === 'duplicate_shop' || r.status === 'duplicate_file';
      }
      if (rowFilter === 'invalid') return r.status === 'invalid';
      return true;
    });
  }, [effectiveRows, rowFilter]);

  async function handleCatalogueFile(file?: File) {
    if (!file) return;
    setError('');
    setResultMessage('');
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.csv') && !lower.endsWith('.json')) {
      setError('Upload a .csv or .json category file.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError('Choose a CSV or JSON file smaller than 15 MB.');
      return;
    }

    try {
      const content = await file.text();
      if (lower.endsWith('.json')) {
        const parsed = parseJsonCatalogue(content);
        setParsedRows(parsed.rows);
        if (parsed.fileCategory && !defaultCategory) {
          setDefaultCategory(parsed.fileCategory);
        }
      } else {
        setParsedRows(parseCsvCatalogue(content));
      }
      setFileName(file.name);
      setRowFilter('all');
    } catch (e: any) {
      setParsedRows([]);
      setFileName('');
      setError(e?.message || 'Could not read catalogue file.');
    }
  }

  async function handleImagesZip(file?: File) {
    if (!file) return;
    setError('');
    setResultMessage('');
    if (!file.name.toLowerCase().endsWith('.zip') || file.size > 52428800) {
      setError('Choose a ZIP archive no larger than 50 MB.');
      return;
    }
    try {
      const archive = unzipSync(new Uint8Array(await file.arrayBuffer()));
      const found: Record<string, File> = {};
      let totalBytes = 0;
      for (const [entryPath, data] of Object.entries(
        archive as Record<string, Uint8Array>
      )) {
        if (
          entryPath.endsWith('/') ||
          entryPath.startsWith('__MACOSX/') ||
          entryPath.split('/').some((part) => part === '..')
        ) {
          continue;
        }
        const cleanName = entryPath.split('/').pop() || '';
        const ext = cleanName.split('.').pop()?.toLowerCase() || '';
        const mime = (
          {
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            webp: 'image/webp',
          } as Record<string, string>
        )[ext];
        if (!mime) continue;
        if (data.length > 5242880) {
          throw new Error(`${cleanName} is larger than 5 MB.`);
        }
        totalBytes += data.length;
        if (totalBytes > 52428800) {
          throw new Error('Images inside the ZIP exceed 50 MB total.');
        }
        found[cleanName.toLowerCase()] = new File(
          [data.slice().buffer as ArrayBuffer],
          cleanName,
          { type: mime }
        );
      }
      if (!Object.keys(found).length) {
        throw new Error('ZIP contains no JPG, PNG or WebP images.');
      }
      setZipName(file.name);
      setImageFiles(found);
    } catch (e: any) {
      setZipName('');
      setImageFiles({});
      setError(e?.message || 'Could not read ZIP images.');
    }
  }

  function downloadCsvTemplate() {
    const csv =
      'Name,Category,Price,Stock,SKU,Condition,Description,Image URL,Image Filename\r\n' +
      'Samsung Galaxy A16 128GB,Mobile Phones,20950,12,SAM-A16-128,New,"Dual SIM 5000mAh smartphone with 6.7 inch display",https://images.example.com/galaxy-a16.jpg,\r\n' +
      'HP ProBook 450 G9 Core i5,Laptops,68500,5,HP-450-G9,New,"16GB RAM 512GB NVMe SSD business laptop",,\r\n';
    const url = URL.createObjectURL(
      new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dasmarket-category-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadJsonTemplate() {
    const sample = {
      category: 'Mobile Phones',
      parent_category: 'Phones & Tablets',
      products: [
        {
          name: 'Infinix Hot 50i 128GB',
          category: 'Mobile Phones',
          price: 14500,
          stock: 15,
          sku: 'INF-H50I-128',
          condition: 'New',
          description: '6.7 inch 120Hz display, 5000mAh battery, Dual SIM',
          images: ['https://images.example.com/hot50i-1.jpg'],
        },
      ],
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(sample, null, 2)], {
        type: 'application/json;charset=utf-8',
      })
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dasmarket-category-template.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function runImport() {
    if (busy) return;
    if (mode === 'admin' && !selectedTenantId) {
      setError('Select the target shop first.');
      return;
    }

    const candidates = effectiveRows.filter((r) => r.status === 'ready');
    if (!candidates.length) {
      setError(
        summary.duplicates > 0
          ? 'All parsed rows already exist in the shop or are duplicates. Nothing new to import.'
          : 'No valid products ready to import.'
      );
      return;
    }

    setBusy(true);
    setError('');
    setResultMessage('');

    const BATCH_SIZE = 200;
    const totalBatches = Math.ceil(candidates.length / BATCH_SIZE);
    let totalImported = 0;
    let totalSkippedServer = 0;

    try {
      setProgress({ done: 0, total: candidates.length, batch: 1, batches: totalBatches });

      for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const slice = candidates.slice(i, i + BATCH_SIZE);

        const payloadRows: any[] = [];
        for (const item of slice) {
          let imageKey = '';
          if (item.imageFilename && mode === 'seller' && onUploadImage) {
            const keyName = item.imageFilename.split('/').pop()?.toLowerCase() || '';
            const fileObj = imageFiles[keyName];
            if (!fileObj) {
              throw new Error(`Missing ZIP image "${item.imageFilename}" on row ${item.row}.`);
            }
            imageKey = await onUploadImage(fileObj);
          }

          payloadRows.push({
            row: item.row,
            name: item.name,
            price: item.price,
            description: item.description,
            type: item.type,
            stock: item.stock,
            sku: item.sku,
            category: item.category,
            parentCategory: item.parentCategory,
            condition: item.condition,
            brand: item.brand,
            model: item.model,
            rating: item.rating,
            reviewCount: item.reviewCount,
            spotlight: item.spotlight,
            specifications: item.specifications,
            images: item.images,
            imageKey,
            isActive: publishOnImport,
          });
        }

        const endpoint =
          mode === 'admin'
            ? '/api/platform-admin'
            : '/api/merchant?action=products-bulk';

        const body =
          mode === 'admin'
            ? {
                action: 'bulk_import_products',
                tenantId: selectedTenantId,
                skipDuplicates,
                products: payloadRows,
              }
            : {
                skipDuplicates,
                products: payloadRows,
              };

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(body),
        });
        const data = await readJsonSafe(response);
        if (!response.ok) {
          throw new Error(data.error || `Batch ${batchNum} failed.`);
        }

        totalImported += Number(data.imported || 0);
        totalSkippedServer += Number(data.skippedDuplicates || 0);

        setProgress({
          done: Math.min(candidates.length, i + slice.length),
          total: candidates.length,
          batch: batchNum,
          batches: totalBatches,
        });
      }

      const skippedAll = summary.duplicates + totalSkippedServer;
      setResultMessage(
        `${totalImported} new product${totalImported === 1 ? '' : 's'} imported${
          skippedAll
            ? ` · ${skippedAll} duplicate${skippedAll === 1 ? '' : 's'} skipped`
            : ''
        }.`
      );
      setParsedRows([]);
      setFileName('');
      setZipName('');
      setImageFiles({});
      await onImported();
    } catch (e: any) {
      setError(e?.message || 'Bulk catalogue import failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bci-card" aria-label="Bulk catalogue importer">
      <div className="bci-head">
        <div>
          <span className="bci-eyebrow">BULK CATALOGUE IMPORTER · CSV &amp; JSON</span>
          <h3>Import category products with automatic duplicate skipping</h3>
          <p>
            Upload category CSV or JSON files directly from your browser. Existing products
            (matched by SKU or product name) and in-file duplicates are automatically skipped.
          </p>
        </div>
        <div className="bci-head-actions">
          <button type="button" className="bci-btn-ghost" onClick={downloadCsvTemplate}>
            <Download size={14} /> CSV template
          </button>
          <button type="button" className="bci-btn-ghost" onClick={downloadJsonTemplate}>
            <Download size={14} /> JSON template
          </button>
          {onClose && (
            <button
              type="button"
              className="bci-btn-ghost"
              aria-label="Close bulk importer"
              onClick={onClose}
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      <div className="bci-controls-grid">
        {mode === 'admin' && (
          <label className="bci-field">
            Target shop
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
            >
              {!tenants.length && <option value="">Loading shops…</option>}
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (/{t.slug})
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="bci-field">
          Category assignment
          <select
            value={categoryMode}
            onChange={(e) => setCategoryMode(e.target.value as 'file' | 'override')}
          >
            <option value="file">Use file category (fallback below if missing)</option>
            <option value="override">Assign all rows to selected category</option>
          </select>
        </label>

        <label className="bci-field">
          {categoryMode === 'override' ? 'Assign category' : 'Fallback category (optional)'}
          <select
            value={defaultCategory}
            onChange={(e) => setDefaultCategory(e.target.value)}
          >
            <option value="">Keep file category / general shop</option>
            {categorySelectOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </label>

        <label className="bci-field">
          Initial visibility
          <select
            value={publishOnImport ? 'published' : 'hidden'}
            onChange={(e) => setPublishOnImport(e.target.value === 'published')}
          >
            <option value="published">Published (live in storefront)</option>
            <option value="hidden">Hidden (review in dashboard first)</option>
          </select>
        </label>
      </div>

      <div className="bci-check-row">
        <label className="bci-check">
          <input
            type="checkbox"
            checked={skipDuplicates}
            onChange={(e) => setSkipDuplicates(e.target.checked)}
          />
          <span>
            Skip duplicates automatically ({loadingIndex ? 'checking…' : `${indexTotal.toLocaleString('en-KE')} existing items indexed`})
          </span>
        </label>
      </div>

      <div
        className={'bci-dropzone' + (isDragging ? ' is-drag' : '')}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const dropped = e.dataTransfer.files?.[0];
          if (dropped) {
            if (dropped.name.toLowerCase().endsWith('.zip')) {
              void handleImagesZip(dropped);
            } else {
              void handleCatalogueFile(dropped);
            }
          }
        }}
      >
        <div className="bci-drop-info">
          <span className="bci-drop-icon">
            {fileName ? <FileSpreadsheet size={20} /> : <Layers size={20} />}
          </span>
          <div>
            <strong>
              {fileName
                ? `${fileName} (${parsedRows.length.toLocaleString('en-KE')} rows)`
                : 'Drop a category CSV or JSON file here'}
            </strong>
            <small>
              Supports .json category arrays/objects and .csv spreadsheets up to 15 MB.
              {zipName
                ? ` · Images ZIP: ${zipName} (${Object.keys(imageFiles).length} files)`
                : ' Large catalogues upload automatically in batches.'}
            </small>
          </div>
        </div>

        <div className="bci-file-pickers">
          <label className="bci-btn-primary bci-file-label">
            <FileUp size={15} /> Choose CSV / JSON
            <input
              type="file"
              accept=".csv,.json,text/csv,application/json"
              onChange={(e) => {
                void handleCatalogueFile(e.target.files?.[0]);
                e.currentTarget.value = '';
              }}
            />
          </label>
          {mode === 'seller' && onUploadImage && (
            <label className="bci-btn-ghost bci-file-label">
              Images ZIP (optional)
              <input
                type="file"
                accept=".zip,application/zip"
                onChange={(e) => {
                  void handleImagesZip(e.target.files?.[0]);
                  e.currentTarget.value = '';
                }}
              />
            </label>
          )}
        </div>
      </div>

      {error && (
        <div className="bci-banner error" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {resultMessage && (
        <div className="bci-banner success" role="status">
          <CheckCircle2 size={16} />
          <span>{resultMessage}</span>
        </div>
      )}

      {busy && progress.total > 0 && (
        <div className="bci-progress-wrap" aria-live="polite">
          <div className="bci-progress-meta">
            <span>
              Uploading batch {progress.batch} of {progress.batches}…
            </span>
            <span>
              {progress.done.toLocaleString('en-KE')} / {progress.total.toLocaleString('en-KE')}
            </span>
          </div>
          <div className="bci-progress-track">
            <div
              className="bci-progress-fill"
              style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {parsedRows.length > 0 && (
        <>
          <div className="bci-stats">
            <div className="bci-stat">
              <span>Parsed rows</span>
              <strong>{summary.total.toLocaleString('en-KE')}</strong>
            </div>
            <div className="bci-stat is-good">
              <span>Ready to import</span>
              <strong>{summary.ready.toLocaleString('en-KE')}</strong>
            </div>
            <div className="bci-stat is-skip">
              <span>Duplicates skipped</span>
              <strong>{summary.duplicates.toLocaleString('en-KE')}</strong>
            </div>
            <div className="bci-stat is-bad">
              <span>Invalid rows</span>
              <strong>{summary.invalid.toLocaleString('en-KE')}</strong>
            </div>
          </div>

          <div className="bci-table-toolbar">
            <div className="bci-filter-tabs" role="group" aria-label="Preview filter">
              <button
                type="button"
                className={rowFilter === 'all' ? 'active' : ''}
                onClick={() => setRowFilter('all')}
              >
                All ({summary.total})
              </button>
              <button
                type="button"
                className={rowFilter === 'ready' ? 'active' : ''}
                onClick={() => setRowFilter('ready')}
              >
                New ({summary.ready})
              </button>
              <button
                type="button"
                className={rowFilter === 'duplicate' ? 'active' : ''}
                onClick={() => setRowFilter('duplicate')}
              >
                Duplicates ({summary.duplicates})
              </button>
              <button
                type="button"
                className={rowFilter === 'invalid' ? 'active' : ''}
                onClick={() => setRowFilter('invalid')}
              >
                Invalid ({summary.invalid})
              </button>
            </div>
            <small style={{ color: '#64748b' }}>
              Showing first {Math.min(100, filteredPreview.length)} of {filteredPreview.length} rows
            </small>
          </div>

          <div className="bci-table-scroll">
            <table className="bci-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Image</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>SKU</th>
                  <th>Import status</th>
                </tr>
              </thead>
              <tbody>
                {filteredPreview.slice(0, 100).map((r) => (
                  <tr key={`${r.row}-${r.name}-${r.sku}`}>
                    <td>{r.row}</td>
                    <td>
                      {r.image ? (
                        <img className="bci-thumb" src={r.image} alt="" loading="lazy" />
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>
                    <td>
                      <strong>{r.name || '—'}</strong>
                    </td>
                    <td>{r.category || 'General'}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {r.price !== null ? `KES ${r.price.toLocaleString('en-KE')}` : r.priceRaw || '—'}
                    </td>
                    <td>{r.sku || '—'}</td>
                    <td>
                      <span className={`bci-status-text ${r.status}`}>{r.statusReason}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bci-footer-actions">
            <button
              type="button"
              className="bci-btn-ghost"
              disabled={busy}
              onClick={() => {
                setParsedRows([]);
                setFileName('');
                setZipName('');
                setImageFiles({});
                setError('');
              }}
            >
              Clear selection
            </button>
            <button
              type="button"
              className="bci-btn-primary"
              disabled={busy || summary.ready === 0}
              onClick={runImport}
            >
              {busy
                ? `Importing…`
                : `Import ${summary.ready.toLocaleString('en-KE')} new product${
                    summary.ready === 1 ? '' : 's'
                  }`}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
