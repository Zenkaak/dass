import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronDown, Heart, ShieldCheck, ShoppingCart, Store } from 'lucide-react';

export type LiveProduct = {
  id: string;
  name: string;
  description: string;
  category: string;
  type: string;
  price: number;
  currency: string;
  stockQuantity: number | null;
  active: boolean;
  spotlight?: boolean;
  testProduct?: boolean;
  sku?: string;
  images?: string[];
  imageUrl?: string;
  ratingAverage?: number;
  ratingCount?: number;
  catalogRating?: number;
  catalogRatingCount?: number;
};

export function fallbackProductImage(label: string) {
  const safe = String(label || 'Product').replace(/[<>&"]/g, '').slice(0, 42);
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">' +
    '<rect width="640" height="480" fill="#f1f5f9"/>' +
    '<rect x="225" y="105" width="190" height="170" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>' +
    '<path d="M275 225l45-55 38 42 25-28 38 41" fill="none" stroke="#94a3b8" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle cx="360" cy="145" r="12" fill="#94a3b8"/>' +
    '<text x="320" y="335" font-family="sans-serif" font-size="20" fill="#64748b" text-anchor="middle">' +
    safe +
    '</text></svg>';
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

async function readJsonSafe(response: Response) {
  const raw = await response.text();
  let data: any = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = {
      error: response.ok
        ? 'The server returned an unreadable response.'
        : `Server error (HTTP ${response.status}). Please retry and share the time if it continues.`,
    };
  }
  if (!response.ok && !data.error) data.error = `Request failed (HTTP ${response.status}).`;
  return data;
}

function trimClause(text: string, maxLen = 115) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  const slice = clean.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(' ');
  const cut = lastSpace > Math.floor(maxLen * 0.55) ? slice.slice(0, lastSpace) : slice;
  return cut.replace(/[.,;:\-–—]+$/, '') + '…';
}

function parseDescriptionSegments(rawDescription?: string) {
  const clean = String(rawDescription || '').replace(/\r\n/g, '\n').trim();
  if (!clean) {
    return { bullets: [] as string[], kvRows: [] as { label: string; value: string }[] };
  }

  let segments = clean
    .split(/\n+|(?:\s*[•●▪■►✓✔]\s*)|(?:\s+-\s+(?=[A-Z0-9]))/)
    .map((line) => line.replace(/^[\s\-*•●▪■►✓✔]+|^\d+[.)]\s+/, '').trim())
    .filter(Boolean);

  if (segments.length === 1) {
    const single = segments[0];
    if (single.includes(';')) {
      segments = single.split(/;\s*/).map((s) => s.trim()).filter(Boolean);
    } else if (single.length > 70) {
      const sentenceSplit = single
        .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (sentenceSplit.length > 1) {
        segments = sentenceSplit;
      } else if (single.includes(', ') && single.split(', ').length >= 3) {
        segments = single.split(/,\s+/).map((s) => s.trim()).filter(Boolean);
      }
    }
  }

  const kvRows: { label: string; value: string }[] = [];
  const bullets: string[] = [];

  for (const item of segments) {
    const kvMatch = item.match(/^([A-Za-z0-9][A-Za-z0-9 /&(),'-]{1,34}):\s+(.+)$/);
    if (kvMatch && !/^https?$/i.test(kvMatch[1].trim())) {
      kvRows.push({ label: kvMatch[1].trim(), value: kvMatch[2].trim() });
    } else {
      bullets.push(item);
    }
  }

  return { bullets, kvRows };
}

function ProductDescription({ rawDescription, productId }: { rawDescription?: string; productId: string }) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [productId]);

  const { bullets, kvRows } = parseDescriptionSegments(rawDescription);

  if (!bullets.length && !kvRows.length) {
    return <p>No additional description provided.</p>;
  }

  const maxBullets = kvRows.length > 0 ? 2 : 3;
  const maxRows = bullets.length > 0 ? 3 : 4;

  const visibleBullets = expanded ? bullets : bullets.slice(0, maxBullets).map((b) => trimClause(b, 115));
  const visibleRows = expanded
    ? kvRows
    : kvRows.slice(0, maxRows).map((r) => ({ label: r.label, value: trimClause(r.value, 90) }));

  const isTruncated =
    bullets.length > maxBullets ||
    kvRows.length > maxRows ||
    bullets.slice(0, maxBullets).some((b) => b.replace(/\s+/g, ' ').trim().length > 115) ||
    kvRows.slice(0, maxRows).some((r) => r.value.replace(/\s+/g, ' ').trim().length > 90);

  return (
    <div className="sf-desc-structured">
      {visibleBullets.length > 0 && (
        <ul className="sf-desc-bullets">
          {visibleBullets.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      )}
      {visibleRows.length > 0 && (
        <table className="sf-desc-table">
          <tbody>
            {visibleRows.map((row, idx) => (
              <tr key={idx}>
                <th scope="row">{row.label}</th>
                <td>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {isTruncated && (
        <button
          type="button"
          className="sf-desc-toggle"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? 'Show less' : 'Read full description'}
        </button>
      )}
    </div>
  );
}

export function StorefrontProductDetail({
  product,
  products,
  slug,
  shopName,
  cartQuantity,
  onBack,
  onAdd,
  onOpen,
  saved,
  onToggleSaved,
  totalCartUnits = 0,
  onGoToCart,
}: {
  product: LiveProduct;
  products: LiveProduct[];
  slug: string;
  shopName: string;
  cartQuantity: number;
  onBack: () => void;
  onAdd: (quantity: number) => void;
  onOpen: (p: LiveProduct) => void;
  saved: boolean;
  onToggleSaved: () => void;
  totalCartUnits?: number;
  onGoToCart?: () => void;
}) {
  const [imageIndex, setImageIndex] = useState(0);
  const [reviews, setReviews] = useState<any[]>([]);
  const [summary, setSummary] = useState({ average: 0, count: 0 });
  const [token, setToken] = useState('');
  const [reviewOrderId, setReviewOrderId] = useState('');
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [addedFeedback, setAddedFeedback] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const effectiveStock = product.stockQuantity !== null && product.stockQuantity > 0 ? product.stockQuantity : null;
  const maxAdd = Math.max(0, Math.min(99, effectiveStock ?? 99) - cartQuantity);

  useEffect(() => {
    setQuantity(1);
    setAddedFeedback(false);
  }, [product.id]);

  useEffect(() => {
    setQuantity((q) => Math.max(1, Math.min(q, Math.max(1, maxAdd))));
  }, [maxAdd]);

  const images = (product.images?.length ? product.images : [product.imageUrl || '']).filter(Boolean);
  const related = products.filter((p) => p.id !== product.id && p.category === product.category).slice(0, 4);
  const relatedTrackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let live = true;
    setImageIndex(0);
    fetch(
      '/api/buyer?action=product-reviews&slug=' +
        encodeURIComponent(slug) +
        '&productId=' +
        encodeURIComponent(product.id),
      { cache: 'no-store' },
    )
      .then(async (r) => {
        const d = await readJsonSafe(r);
        if (!r.ok) throw Error(d.error);
        if (live) {
          setReviews(d.reviews || []);
          setSummary(d.summary || { average: 0, count: 0 });
        }
      })
      .catch(() => {});

    try {
      const savedOrders = JSON.parse(localStorage.getItem('dasnet-storefront-orders-' + slug) || '[]');
      const found = Array.isArray(savedOrders)
        ? savedOrders.find((o: any) => (o.lines || []).some((line: any) => line.product?.id === product.id) && o.chatToken)
        : null;
      if (live) setToken(found?.chatToken || '');
    } catch {}

    return () => {
      live = false;
    };
  }, [slug, product.id]);

  useEffect(() => {
    let live = true;
    fetch('/api/buyer?action=customer-orders&slug=' + encodeURIComponent(slug), {
      credentials: 'same-origin',
      cache: 'no-store',
    })
      .then(async (r) => {
        if (!r.ok) return null;
        const d = await r.json();
        const match = (d.orders || []).find(
          (o: any) =>
            o.paymentStatus === 'succeeded' &&
            String(o.deliveryStatus || '').toLowerCase() === 'delivered' &&
            (o.items || []).some((item: any) => item.id === product.id),
        );
        if (live) setReviewOrderId(match?.id || '');
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [slug, product.id]);

  async function submitReview(e: any) {
    e.preventDefault();
    if ((!token && !reviewOrderId) || body.trim().length < 8 || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const r = await fetch('/api/buyer?action=product-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          productId: product.id,
          ...(token ? { chatToken: token } : { orderId: reviewOrderId }),
          rating,
          body: body.trim(),
        }),
      });
      const d = await readJsonSafe(r);
      if (!r.ok) throw Error(d.error || 'Review submission failed');
      setReviews(d.reviews || []);
      setSummary(d.summary || { average: 0, count: 0 });
      setBody('');
      setMessage('Your verified-purchase review has been published.');
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  function handleAddToCart() {
    onAdd(quantity);
    setAddedFeedback(true);
    window.setTimeout(() => setAddedFeedback(false), 1800);
  }

  const Stars = ({ value }: { value: number }) => (
    <span className="sf-stars" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {'★'.repeat(Math.round(value))}
      {'☆'.repeat(5 - Math.round(value))}
    </span>
  );

  return (
    <section className="sf-pdp">
      <div className="sf-container">
        <nav className="sf-breadcrumb" aria-label="Breadcrumb">
          <button type="button" onClick={onBack}>
            <ArrowLeft size={15} /> Back to shop
          </button>
          <span aria-hidden="true">/</span>
          <span className="sf-crumb-cat">{product.category || 'Products'}</span>
          <span className="sf-crumb-sep" aria-hidden="true">/</span>
          <strong className="sf-crumb-product">{product.name}</strong>
        </nav>

        <div className="sf-pdp-layout">
          {/* Left Sticky Gallery */}
          <div className="sf-pdp-gallery">
            <div
              className="sf-pdp-stage"
              onTouchStart={(e) => {
                (e.currentTarget as any).dataset.touchX = String(e.touches[0].clientX);
              }}
              onTouchEnd={(e) => {
                const start = Number((e.currentTarget as any).dataset.touchX || 0);
                const delta = e.changedTouches[0].clientX - start;
                if (Math.abs(delta) > 45 && images.length > 1) {
                  setImageIndex((i) => (i + (delta < 0 ? 1 : images.length - 1)) % images.length);
                }
              }}
            >
              <img
                src={images[imageIndex] || fallbackProductImage(product.name)}
                alt={product.name}
                loading="eager"
                decoding="async"
                fetchPriority="high"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = fallbackProductImage(product.name);
                }}
              />
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    className="sf-pdp-arrow prev"
                    aria-label="Previous product image"
                    onClick={() => setImageIndex((i) => (i + images.length - 1) % images.length)}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="sf-pdp-arrow next"
                    aria-label="Next product image"
                    onClick={() => setImageIndex((i) => (i + 1) % images.length)}
                  >
                    ›
                  </button>
                  <span className="sf-pdp-counter">
                    {imageIndex + 1} / {images.length}
                  </span>
                  <div className="sf-pdp-dots" role="tablist" aria-label="Product images">
                    {images.map((src, i) => (
                      <button
                        type="button"
                        key={src + '-dot-' + i}
                        role="tab"
                        aria-selected={imageIndex === i}
                        aria-label={`Image ${i + 1}`}
                        className={imageIndex === i ? 'active' : ''}
                        onClick={() => setImageIndex(i)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {images.length > 1 && (
              <div className="sf-pdp-thumbs">
                {images.map((src, i) => (
                  <button
                    type="button"
                    key={src + i}
                    className={imageIndex === i ? 'active' : ''}
                    aria-label={`View image ${i + 1}`}
                    onClick={() => setImageIndex(i)}
                  >
                    <img
                      src={src}
                      alt={`${product.name} view ${i + 1}`}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = fallbackProductImage(product.name);
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Contiguous Purchase Module */}
          <div className="sf-pdp-summary">
            <header className="sf-pdp-header">
              <div className="sf-pdp-eyebrow">
                <span>{product.category || 'Product'}</span>
                <span aria-hidden="true">·</span>
                <span>{shopName || 'Shop'}</span>
              </div>
              <h1>{product.name}</h1>
              <div className="sf-pdp-submeta">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Stars value={summary.average || Number(product.catalogRating || 0)} />
                  <strong>{summary.average ? summary.average.toFixed(1) : Number(product.catalogRating || 0) ? Number(product.catalogRating).toFixed(1) : 'New'}</strong>
                  <span>{summary.count ? `(${summary.count} verified ratings)` : Number(product.catalogRating || 0) ? 'Catalogue rating' : 'No ratings yet'}</span>
                </span>
                <span aria-hidden="true">·</span>
                <span className="sf-mono">SKU {product.sku || product.id.slice(0, 8).toUpperCase()}</span>
              </div>
            </header>

            <section className="sf-pdp-purchase-box">
              <div className="sf-pdp-price-row">
                <strong className="sf-pdp-price">KES {product.price.toLocaleString('en-KE')}</strong>
                <span className="sf-pdp-stock-text">
                  {effectiveStock === null ? 'Available' : `${effectiveStock} in stock`}
                </span>
              </div>
              <div className="sf-pdp-stock-track" aria-hidden="true">
                <i
                  style={{
                    width:
                      effectiveStock === null
                        ? '100%'
                        : `${Math.max(12, Math.min(100, effectiveStock))}%`,
                  }}
                />
              </div>

              <div className="sf-qty-row">
                <div className="sf-qty-label">
                  Quantity
                  <small>{maxAdd === 0 ? `Max in cart (${cartQuantity})` : `${maxAdd} available to add`}</small>
                </div>
                <div className="sf-stepper">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    disabled={quantity <= 1 || maxAdd === 0}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  >
                    −
                  </button>
                  <output aria-live="polite">{quantity}</output>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    disabled={quantity >= maxAdd}
                    onClick={() => setQuantity((q) => Math.min(maxAdd, q + 1))}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="sf-pdp-cta-stack">
                <button
                  type="button"
                  className="sf-btn sf-btn-accent"
                  disabled={maxAdd === 0}
                  onClick={handleAddToCart}
                >
                  {maxAdd === 0 ? `Max in cart (${cartQuantity})` : addedFeedback ? 'Added to cart' : 'Add to cart'}
                </button>
                <button
                  type="button"
                  className="sf-btn sf-btn-secondary"
                  aria-pressed={saved}
                  onClick={onToggleSaved}
                  aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
                >
                  <Heart size={17} fill={saved ? 'currentColor' : 'none'} />
                  <span>{saved ? 'Saved' : 'Save'}</span>
                </button>
              </div>

              <div className="sf-pdp-assurance">
                <ShieldCheck size={16} />
                <span>Secure order record · Seller-managed fulfilment · DASNET buyer support</span>
              </div>
            </section>

            <details className="sf-pdp-accordion">
              <summary>
                <span>Description</span>
                <ChevronDown size={16} className="sf-pdp-chevron" />
              </summary>
              <div className="sf-pdp-accordion-body">
                <ProductDescription rawDescription={product.description} productId={product.id} />
              </div>
            </details>

            <details className="sf-pdp-accordion">
              <summary>
                <span>Specifications</span>
                <ChevronDown size={16} className="sf-pdp-chevron" />
              </summary>
              <div className="sf-pdp-accordion-body">
                <div className="sf-specs-grid">
                  <div>
                    <span>Condition</span>
                    <strong>{(product as any).condition || 'Not specified'}</strong>
                  </div>
                  <div>
                    <span>Category</span>
                    <strong>{product.category || 'Product'}</strong>
                  </div>
                  <div>
                    <span>SKU</span>
                    <strong className="sf-mono">{product.sku || product.id.slice(0, 8).toUpperCase()}</strong>
                  </div>
                  <div>
                    <span>Availability</span>
                    <strong>
                      {effectiveStock === null ? 'Available' : `${effectiveStock} in stock`}
                    </strong>
                  </div>
                </div>
              </div>
            </details>

            <details className="sf-pdp-accordion">
              <summary>
                <span>Delivery &amp; Returns</span>
                <ChevronDown size={16} className="sf-pdp-chevron" />
              </summary>
              <div className="sf-pdp-accordion-body">
                <p>
                  Delivery arrangements and charges are confirmed with {shopName || 'the shop'} before payment. Review
                  the shop's delivery and return policies before placing your order.
                </p>
              </div>
            </details>

            <div className="sf-pdp-seller-row">
              <span className="sf-assurance-icon">
                <Store size={19} />
              </span>
              <div>
                <strong>{shopName || 'This shop'}</strong>
                <small>Verified seller on DASNET · Contact the shop for product questions</small>
              </div>
            </div>
          </div>
        </div>

        <section className="sf-pdp-safety">
          <h2>
            <ShieldCheck size={18} /> Shop safely
          </h2>
          <ul>
            <li>Check the product details and total cost before ordering.</li>
            <li>Keep order and payment records in your account.</li>
            <li>Never share your M-PESA PIN or one-time password.</li>
          </ul>
        </section>

        <section className="sf-pdp-reviews">
          <div className="sf-pdp-reviews-head">
            <div>
              <span className="sf-kicker">Product rating &amp; reviews</span>
              <h2 style={{ marginTop: 4 }}>Customer reviews</h2>
            </div>
            <div className="sf-pdp-reviews-score">
              <Stars value={summary.average} />
              <strong>{summary.average ? `${summary.average.toFixed(1)}/5` : 'No ratings yet'}</strong>
              <span style={{ color: 'var(--sf-muted)', fontSize: 13 }}>({summary.count} verified ratings)</span>
            </div>
          </div>

          {reviews.length ? (
            <div className="sf-review-grid">
              {reviews.map((r: any) => (
                <article className="sf-review-card" key={r.id}>
                  <div className="sf-review-card-top">
                    <strong>{r.customerName || 'Verified buyer'}</strong>
                    <small>Verified purchase</small>
                  </div>
                  <Stars value={r.rating} />
                  <p>{r.body}</p>
                  <small>{new Date(r.createdAt).toLocaleDateString('en-KE')}</small>
                </article>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--sf-muted)', fontSize: 14 }}>No buyer reviews yet.</p>
          )}

          {token || reviewOrderId ? (
            <form className="sf-review-form" onSubmit={submitReview}>
              <h3>Share your experience</h3>
              <label className="sf-field">
                Rating
                <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                  <option value={5}>★★★★★ Excellent</option>
                  <option value={4}>★★★★ Good</option>
                  <option value={3}>★★★ Average</option>
                  <option value={2}>★★ Poor</option>
                  <option value={1}>★ Very poor</option>
                </select>
              </label>
              <label className="sf-field">
                Your review
                <textarea
                  required
                  minLength={8}
                  maxLength={1200}
                  rows={4}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="What should other buyers know?"
                />
              </label>
              <button
                type="submit"
                className="sf-btn sf-btn-primary"
                disabled={busy || body.trim().length < 8}
              >
                {busy ? 'Submitting…' : 'Submit verified review'}
              </button>
              {message && (
                <p className="sf-alert success" role="status">
                  {message}
                </p>
              )}
            </form>
          ) : (
            <p style={{ color: 'var(--sf-muted)', fontSize: 13.5, marginTop: 12 }}>
              Only buyers with a completed, paid order for this product can submit a verified review.
            </p>
          )}
        </section>

        {related.length > 0 && (
          <section className="sf-section">
            <div className="sf-section-head">
              <div>
                <span className="sf-kicker">You may also like</span>
                <h2>Related products</h2>
                <p>More from this category in {shopName || 'this shop'}.</p>
              </div>
            </div>
            <div className="sf-product-grid" ref={relatedTrackRef}>
              {related.map((p) => {
                const relHasStock = p.stockQuantity !== null && p.stockQuantity > 0;
                return (
                  <article className="sf-card" key={p.id}>
                    <button
                      type="button"
                      className="sf-card-open"
                      onClick={() => onOpen(p)}
                      aria-label={`View ${p.name}`}
                    >
                      <span className="sf-card-media">
                        <img
                          src={p.images?.[0] || p.imageUrl || fallbackProductImage(p.name)}
                          alt={p.name}
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = fallbackProductImage(p.name);
                          }}
                        />
                      </span>
                      <div className="sf-card-body">
                        <span className="sf-card-cat">{p.category || 'Product'}</span>
                        <span className="sf-card-title">{p.name}</span>
                        <div className="sf-card-meta-row">
                          <strong className="sf-card-price">KES {p.price.toLocaleString('en-KE')}</strong>
                          <small className="sf-card-stock">
                            {relHasStock ? `${p.stockQuantity} left` : 'Available'}
                          </small>
                        </div>
                      </div>
                    </button>
                    <div className="sf-card-foot">
                      <button type="button" className="sf-card-add" onClick={() => onOpen(p)}>
                        View product <ArrowRight size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <div className="sf-pdp-sticky-bar">
        <div className="sf-pdp-sticky-price">
          <small>{quantity > 1 ? `Total (${quantity})` : 'Unit price'}</small>
          <strong>KES {(product.price * quantity).toLocaleString('en-KE')}</strong>
        </div>
        <div className="sf-pdp-sticky-actions">
          {totalCartUnits > 0 && onGoToCart && (
            <button
              type="button"
              className="sf-btn sf-btn-secondary sf-pdp-sticky-cart"
              onClick={onGoToCart}
              aria-label={`Go to cart (${totalCartUnits} items)`}
            >
              <ShoppingCart size={16} />
              <span>{totalCartUnits}</span>
            </button>
          )}
          <button
            type="button"
            className="sf-btn sf-btn-accent sf-pdp-sticky-cta"
            disabled={maxAdd === 0}
            onClick={handleAddToCart}
          >
            {maxAdd === 0 ? `Max (${cartQuantity})` : addedFeedback ? 'Added ✓' : 'Add to cart'}
          </button>
        </div>
      </div>
    </section>
  );
}
