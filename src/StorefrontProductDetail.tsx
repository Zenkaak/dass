import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Heart, ShieldCheck, Store } from 'lucide-react';

export type LiveProduct = {
  id: string;
  name: string;
  description: string;
  category: string;
  parentCategory?: string;
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
  condition?: string;
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

export function StorefrontProductDetail({
  product,
  products,
  shopName,
  cartQuantity,
  onBack,
  onAdd,
  onOpen,
  saved,
  onToggleSaved,
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
}) {
  const [imageIndex, setImageIndex] = useState(0);
  const [addedFeedback, setAddedFeedback] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const maxAdd = Math.max(0, Math.min(99, product.stockQuantity ?? 99) - cartQuantity);

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
    setImageIndex(0);
  }, [product.id]);

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
          <span>{product.category || 'Products'}</span>
          <span aria-hidden="true">/</span>
          <strong>{product.name}</strong>
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
                      loading="lazy"
                      decoding="async"
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
                {product.catalogRating && product.catalogRating > 0 ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Stars value={product.catalogRating} />
                    <strong>{product.catalogRating.toFixed(1)}</strong>
                    <span>Catalogue source rating{product.catalogRatingCount ? ` · ${product.catalogRatingCount} source reviews` : ''}</span>
                  </span>
                ) : (
                  <span>No ratings yet</span>
                )}
                <span aria-hidden="true">·</span>
                <span className="sf-mono">SKU {product.sku || product.id.slice(0, 8).toUpperCase()}</span>
              </div>
            </header>

            <section className="sf-pdp-purchase-box">
              <div className="sf-pdp-price-row">
                <strong className="sf-pdp-price">KES {product.price.toLocaleString('en-KE')}</strong>
                <span className={`sf-pdp-stock-text ${product.stockQuantity === 0 ? 'out' : ''}`}>
                  {product.stockQuantity === 0
                    ? 'Out of stock'
                    : product.stockQuantity === null
                    ? 'Available'
                    : `${product.stockQuantity} in stock`}
                </span>
              </div>
              <div className="sf-pdp-stock-track" aria-hidden="true">
                <i
                  style={{
                    width:
                      product.stockQuantity === null
                        ? '100%'
                        : `${Math.max(0, Math.min(100, product.stockQuantity))}%`,
                  }}
                />
              </div>

              <div className="sf-qty-row">
                <div className="sf-qty-label">
                  Quantity
                  <small>{maxAdd === 0 ? 'No more units available' : `${maxAdd} available to add`}</small>
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
                  {maxAdd === 0 ? 'Out of stock' : addedFeedback ? 'Added to cart' : 'Add to cart'}
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

            <section className="sf-pdp-block">
              <h2>Description</h2>
              <p>{product.description || 'The seller has not added a product description yet.'}</p>
            </section>

            <section className="sf-pdp-block">
              <h2>Specifications</h2>
              <div className="sf-specs-grid">
                <div>
                  <span>Condition</span>
                  <strong>{product.condition || 'Not specified'}</strong>
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
                    {product.stockQuantity === 0
                      ? 'Out of stock'
                      : product.stockQuantity === null
                      ? 'Available'
                      : `${product.stockQuantity} in stock`}
                  </strong>
                </div>
              </div>
            </section>

            <section className="sf-pdp-block">
              <h2>Delivery &amp; Returns</h2>
              <p>
                Delivery arrangements and charges are confirmed with {shopName || 'the shop'} before payment. Review the
                shop's delivery and return policies before placing your order.
              </p>
            </section>

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

        {/* Customer reviews are hidden on the storefront until genuine reviews are available. */}

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
              {related.map((p) => (
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
                        <small className={`sf-card-stock ${p.stockQuantity === 0 ? 'out' : ''}`}>
                          {p.stockQuantity === 0
                            ? 'Out of stock'
                            : p.stockQuantity == null
                            ? 'Available'
                            : `${p.stockQuantity} left`}
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
              ))}
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
