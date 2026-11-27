import { useEffect, useState } from 'react';
import { ArrowRight, Check, ChevronLeft, ChevronRight, Heart, ShieldCheck, Star, X } from 'lucide-react';
import { fallbackProductImage, type LiveProduct } from './StorefrontProductDetail';

export function StorefrontQuickView({
  product,
  shopName,
  cartQuantity,
  saved,
  onClose,
  onAdd,
  onToggleSaved,
  onOpenFullDetails,
}: {
  product: LiveProduct | null;
  shopName: string;
  cartQuantity: number;
  saved: boolean;
  onClose: () => void;
  onAdd: (quantity: number) => void;
  onToggleSaved: () => void;
  onOpenFullDetails: (p: LiveProduct) => void;
}) {
  const [imageIndex, setImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addedFeedback, setAddedFeedback] = useState(false);

  const maxAdd = product ? Math.max(0, Math.min(99, product.stockQuantity ?? 99) - cartQuantity) : 0;

  useEffect(() => {
    if (!product) return;
    setImageIndex(0);
    setQuantity(1);
    setAddedFeedback(false);
  }, [product?.id]);

  useEffect(() => {
    setQuantity((q) => Math.max(1, Math.min(q, Math.max(1, maxAdd))));
  }, [maxAdd]);

  useEffect(() => {
    if (!product) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [product, onClose]);

  if (!product) return null;

  const images = (product.images?.length ? product.images : [product.imageUrl || '']).filter(Boolean);
  const activeImage = images[imageIndex] || fallbackProductImage(product.name);
  const outOfStock = product.stockQuantity === 0 || maxAdd <= 0;

  return (
    <div className="sf-qv-backdrop" role="presentation" onClick={onClose}>
      <section
        className="sf-qv-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sf-qv-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="sf-qv-close"
          aria-label="Close quick view"
          onClick={onClose}
        >
          <X size={18} />
        </button>

        <div className="sf-qv-grid">
          <div className="sf-qv-gallery">
            <div className="sf-qv-stage">
              <img
                src={activeImage}
                alt={product.name}
                decoding="async"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = fallbackProductImage(product.name);
                }}
              />
              {product.stockQuantity === 0 && (
                <span className="sf-qv-tag is-out">Out of stock</span>
              )}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    className="sf-qv-arrow prev"
                    aria-label="Previous image"
                    onClick={() => setImageIndex((i) => (i - 1 + images.length) % images.length)}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    className="sf-qv-arrow next"
                    aria-label="Next image"
                    onClick={() => setImageIndex((i) => (i + 1) % images.length)}
                  >
                    <ChevronRight size={16} />
                  </button>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="sf-qv-thumbs">
                {images.slice(0, 5).map((src, idx) => (
                  <button
                    type="button"
                    key={`${product.id}-qv-img-${idx}`}
                    className={idx === imageIndex ? 'is-active' : ''}
                    aria-label={`View image ${idx + 1}`}
                    onClick={() => setImageIndex(idx)}
                  >
                    <img src={src} alt="" loading="lazy" decoding="async" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="sf-qv-info">
            <div className="sf-qv-eyebrow">
              <span>{product.category || 'Shop product'}</span>
              {product.sku ? <span className="sf-mono">{product.sku}</span> : null}
            </div>

            <h2 id="sf-qv-title">{product.name}</h2>

            {(product.ratingCount ?? 0) > 0 && (
              <div className="sf-qv-rating">
                <Star size={14} fill="currentColor" />
                <strong>{Number(product.ratingAverage || 0).toFixed(1)}</strong>
                <span>({product.ratingCount} {product.ratingCount === 1 ? 'review' : 'reviews'})</span>
              </div>
            )}

            <div className="sf-qv-price-row">
              <strong className="sf-qv-price sf-num">KES {product.price.toLocaleString('en-KE')}</strong>
              <span className={'sf-qv-stock' + (product.stockQuantity === 0 ? ' is-out' : '')}>
                {product.stockQuantity === 0
                  ? 'Out of stock'
                  : product.stockQuantity === null
                    ? 'In stock'
                    : `${product.stockQuantity} available`}
              </span>
            </div>

            <div className="sf-qv-desc">
              {product.description?.trim()
                ? product.description.trim()
                : `Sold by ${shopName}. Open full details for specifications and delivery options.`}
            </div>

            <div className="sf-qv-controls">
              <div className="sf-stepper" aria-label="Quantity">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  disabled={quantity <= 1 || outOfStock}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  −
                </button>
                <output className="sf-num">{outOfStock ? 0 : quantity}</output>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  disabled={quantity >= maxAdd || outOfStock}
                  onClick={() => setQuantity((q) => Math.min(maxAdd, q + 1))}
                >
                  +
                </button>
              </div>

              <button
                type="button"
                className="sf-btn sf-btn-accent sf-qv-add"
                disabled={outOfStock}
                onClick={() => {
                  onAdd(quantity);
                  setAddedFeedback(true);
                  window.setTimeout(() => setAddedFeedback(false), 1600);
                }}
              >
                {product.stockQuantity === 0 ? (
                  'Out of stock'
                ) : maxAdd <= 0 ? (
                  `Max in cart (${cartQuantity})`
                ) : addedFeedback ? (
                  <>
                    <Check size={16} /> Added to cart
                  </>
                ) : (
                  `Add to cart${cartQuantity > 0 ? ` (${cartQuantity} in cart)` : ''}`
                )}
              </button>

              <button
                type="button"
                className={'sf-btn sf-btn-secondary sf-qv-save' + (saved ? ' is-saved' : '')}
                aria-label={saved ? 'Remove from saved items' : 'Save item'}
                aria-pressed={saved}
                onClick={onToggleSaved}
              >
                <Heart size={16} fill={saved ? 'currentColor' : 'none'} />
              </button>
            </div>

            <div className="sf-qv-footer">
              <span className="sf-qv-assurance">
                <ShieldCheck size={15} /> Direct from {shopName}
              </span>
              <button
                type="button"
                className="sf-link-action"
                onClick={() => {
                  onClose();
                  onOpenFullDetails(product);
                }}
              >
                View full details <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
