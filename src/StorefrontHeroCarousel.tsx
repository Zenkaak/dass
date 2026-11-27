import { memo, useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import { fallbackProductImage, type LiveProduct } from './StorefrontProductDetail';

type StorefrontHeroCarouselProps = {
  slides: LiveProduct[];
  shopName?: string;
  shopDescription?: string;
  active?: boolean;
  onOpenProduct: (product: LiveProduct) => void;
  onShopCollection: () => void;
};

export const StorefrontHeroCarousel = memo(function StorefrontHeroCarousel({
  slides,
  shopName,
  shopDescription,
  active = true,
  onOpenProduct,
  onShopCollection,
}: StorefrontHeroCarouselProps) {
  const [heroIndex, setHeroIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const count = slides.length;
  const activeIndex = count ? heroIndex % count : 0;

  useEffect(() => {
    if (count < 2 || !active || paused) return;
    const timer = window.setInterval(() => {
      setHeroIndex((index) => (index + 1) % count);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [count, active, paused, activeIndex]);

  return (
    <section className="sf-hero-wrap" aria-label="Featured showcase">
      <div
        className={'sf-hero' + (count > 1 ? ' has-controls' : '') + (paused ? ' is-paused' : '')}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setPaused(false);
        }}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null || count < 2) return;
          const dx = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
          touchStartX.current = null;
          if (Math.abs(dx) > 40) {
            setHeroIndex((i) => (dx < 0 ? (i + 1) % count : (i + count - 1) % count));
          }
        }}
      >
        <div className="sf-hero-track" style={{ transform: `translate3d(-${activeIndex * 100}%, 0, 0)` }}>
          {count ? (
            slides.map((slideProduct, index) => {
              const isCurrent = index === activeIndex;
              return (
                <div
                  className={'sf-hero-slide' + (isCurrent ? ' is-active' : '')}
                  key={slideProduct.id}
                  aria-hidden={!isCurrent}
                >
                  <div className="sf-hero-copy">
                    <div className="sf-hero-meta">
                      <span className="sf-hero-cat">
                        {slideProduct.category || shopName || 'Featured Collection'}
                      </span>
                      {count > 1 && (
                        <span className="sf-hero-index">
                          · {String(index + 1).padStart(2, '0')}/{String(count).padStart(2, '0')}
                        </span>
                      )}
                    </div>
                    {isCurrent ? <h1>{slideProduct.name}</h1> : <h2>{slideProduct.name}</h2>}
                    <p className="sf-hero-desc">
                      {slideProduct.description ||
                        shopDescription ||
                        'Explore quality products with transparent pricing and direct seller coordination.'}
                    </p>
                    <strong className="sf-hero-price">
                      KES {slideProduct.price.toLocaleString('en-KE')}
                    </strong>
                    <div className="sf-hero-actions">
                      <button
                        type="button"
                        className="sf-btn sf-btn-accent"
                        tabIndex={isCurrent ? 0 : -1}
                        onClick={() => onOpenProduct(slideProduct)}
                      >
                        View product <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="sf-hero-media-col">
                    <button
                      type="button"
                      className="sf-hero-media"
                      tabIndex={isCurrent ? 0 : -1}
                      onClick={() => onOpenProduct(slideProduct)}
                      aria-label={`View ${slideProduct.name}`}
                    >
                      <img
                        src={
                          slideProduct.images?.[0] ||
                          slideProduct.imageUrl ||
                          fallbackProductImage(slideProduct.name)
                        }
                        alt={slideProduct.name}
                        loading={index === 0 ? 'eager' : 'lazy'}
                        decoding="async"
                        fetchPriority={index === 0 ? 'high' : 'auto'}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = fallbackProductImage(slideProduct.name);
                        }}
                      />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="sf-hero-slide is-active">
              <div className="sf-hero-copy">
                <div className="sf-hero-meta">
                  <span className="sf-hero-cat">{shopName || 'Featured Collection'}</span>
                </div>
                <h1>{shopName || 'Curated essentials for everyday living'}</h1>
                <p className="sf-hero-desc">
                  {shopDescription ||
                    'Explore quality products with transparent pricing and direct seller coordination.'}
                </p>
                <div className="sf-hero-actions">
                  <button type="button" className="sf-btn sf-btn-accent" onClick={onShopCollection}>
                    Shop collection <ArrowRight size={14} />
                  </button>
                </div>
              </div>
              <div className="sf-hero-media-col">
                <div className="sf-hero-media" aria-hidden="true">
                  <ShoppingBag size={40} strokeWidth={1.3} />
                </div>
              </div>
            </div>
          )}
        </div>
        {count > 1 && (
          <div className="sf-hero-controls">
            <button
              type="button"
              className="sf-hero-arrow"
              aria-label="Previous slide"
              onClick={() => setHeroIndex((i) => (i + count - 1) % count)}
            >
              <ChevronLeft size={15} />
            </button>
            <div className="sf-hero-dots">
              {slides.map((p, index) => (
                <button
                  type="button"
                  key={p.id + '-' + activeIndex}
                  aria-label={'Show featured product ' + (index + 1)}
                  aria-current={index === activeIndex ? 'true' : 'false'}
                  className={index === activeIndex ? 'active' : ''}
                  onClick={() => setHeroIndex(index)}
                />
              ))}
            </div>
            <button
              type="button"
              className="sf-hero-arrow"
              aria-label="Next slide"
              onClick={() => setHeroIndex((i) => (i + 1) % count)}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
});
