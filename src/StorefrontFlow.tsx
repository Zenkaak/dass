import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  MapPin,
  Package,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  UserRound,
  WalletCards,
} from 'lucide-react';

// Buyer account navigation keeps the marketplace account destinations available as real URLs.
export type StoreProduct = {
  id: string;
  name: string;
  description?: string;
  category?: string;
  price: number;
  stockQuantity?: number | null;
  images?: string[];
  imageUrl?: string;
};

type CartLine = { product: StoreProduct; quantity: number };
type PaymentMethod = 'card' | 'airtel' | 'mpesa' | 'delivery';
type DeliveryMethod = 'pickup' | 'home';
type BuyerOrder = {
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  paymentMethod: PaymentMethod;
  deliveryMethod: DeliveryMethod;
  deliveryAddress: string;
  pickupStation: string;
  deliveryCounty: string;
  deliverySubCounty: string;
  deliveryEstate: string;
  deliveryDirections: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  lines: CartLine[];
  chatToken: string;
  paymentStatus: string;
  receipt?: string | null;
  orderStatus?: string | null;
  deliveryStatus?: string | null;
};

type StorefrontFlowProps = {
  slug: string;
  shopName: string;
  products: StoreProduct[];
  recentlyViewed?: string[];
  cart: Record<string, number>;
  onCartChange: (next: Record<string, number>) => void;
  view: string;
  onNavigate: (next: string) => void;
  customerName?: string;
  onOrderCreated?: (token: string, orderNumber: string) => void;
  chatPanel?: ReactNode;
  onOpenChat?: (token: string, orderNumber: string) => void;
};

const paymentLabels: Record<PaymentMethod, string> = {
  card: 'Bank card',
  airtel: 'Airtel Money',
  mpesa: 'M-Pesa',
  delivery: 'Pay on delivery',
};

const accountGroups = [
  { title: 'SHOPPING', links: [
    { label: 'Orders', icon: Package, view: 'orders' },
    { label: 'Inbox & messages', icon: ShoppingBag, view: 'inbox' },
    { label: 'Saved items', icon: Search, view: 'wishlist' },
    { label: 'Recently viewed', icon: Search, view: 'recently-viewed' },
    { label: 'Vouchers', icon: WalletCards, view: 'vouchers' },
    { label: 'Reviews', icon: ShieldCheck, view: 'reviews' },
  ]},
  { title: 'ACCOUNT & SUPPORT', links: [
    { label: 'My profile', icon: UserRound, view: 'profile' },
    { label: 'Address book', icon: MapPin, view: 'address-book' },
    { label: 'Notifications', icon: Package, view: 'notifications' },
    { label: 'Notification settings', icon: ShieldCheck, view: 'notification-settings' },
    { label: 'Account management', icon: UserRound, view: 'account-management' },
    { label: 'Help & support', icon: ShieldCheck, view: 'assistant' },
    { label: 'Followed shops', icon: ShoppingBag, view: 'followed-shops' },
    { label: 'Newsletter', icon: WalletCards, view: 'newsletter' },
    { label: 'Notification settings', icon: ShieldCheck, view: 'notification-settings' },
    { label: 'Public profile', icon: UserRound, view: 'public-profile' },
    { label: 'Close account', icon: UserRound, view: 'close-account' },
  ]},
];

const accountSectionCopy: Record<string, { title: string; description: string }> = {
  inbox: { title: 'Inbox', description: 'Your store messages will appear here when messaging is connected.' },
  reviews: { title: 'Pending reviews', description: 'Items that are ready for a review will appear here after your first order.' },
  vouchers: { title: 'Vouchers', description: 'Available discount vouchers will appear here when promotions are connected.' },
  wishlist: { title: 'Wishlist', description: 'Save products you want to come back to. Wishlist syncing is not connected yet.' },
  'followed-shops': { title: 'Followed shops', description: 'The shops you follow will be listed here.' },
  'recently-viewed': { title: 'Recently viewed', description: 'Products you opened in this store will be listed here.' },
  'account-management': { title: 'Account management', description: 'Your profile details and sign-in options will appear here when accounts are connected.' },
  'address-book': { title: 'Address book', description: 'Save delivery addresses here when customer accounts are connected.' },
  newsletter: { title: 'Newsletter', description: 'Choose whether to receive store updates and offers.' },
  'close-account': { title: 'Close account', description: 'Account closure is not connected in this front-end preview.' },
  assistant: { title: 'Shopping assistant', description: 'The assistant screen is ready for your future search and recommendation wiring.' },
  profile: { title: 'My profile', description: 'Your profile details will appear here when accounts are connected.' },
  notifications: { title: 'Notifications', description: 'Order and account notifications will appear here when connected.' },
  'notification-settings': { title: 'Notification settings', description: 'Notification preferences will appear here when accounts are connected.' },
  'public-profile': { title: 'My public profile', description: 'Your public profile will appear here when profile features are connected.' },
};

function formatKes(amount: number) {
  return `KES ${Math.max(0, Math.round(amount)).toLocaleString('en-KE')}`;
}

function storedOrders(key: string): BuyerOrder[] {
  try {
    const saved = localStorage.getItem(key);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function ProductThumb({ product }: { product: StoreProduct }) {
  const image = product.images?.[0] || product.imageUrl;
  return image
    ? <img className="customer-product-thumb" src={image} alt={product.name} loading="lazy" onError={event=>{event.currentTarget.onerror=null;event.currentTarget.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22640%22 height=%22480%22 viewBox=%220 0 640 480%22%3E%3Crect width=%22640%22 height=%22480%22 fill=%22%23eaf0f6%22/%3E%3Cpath d=%22M240 280l80-100 70 80 45-55 70 75%22 fill=%22none%22 stroke=%22%2394a3b8%22 stroke-width=%2216%22/%3E%3C/svg%3E'}} />
    : <div className="customer-product-thumb customer-product-placeholder" aria-hidden="true"><ShoppingBag size={22} /></div>;
}

function FlowHeading({
  title,
  onBack,
  backLabel = 'Back to store',
}: {
  title: string;
  onBack: () => void;
  backLabel?: string;
}) {
  return (
    <div className="customer-flow-heading">
      <button type="button" className="customer-back-button" onClick={onBack}>
        <ArrowLeft size={17} /> {backLabel}
      </button>
      <h1>{title}</h1>
    </div>
  );
}

export function StorefrontFlow({
  slug,
  shopName,
  products,
  recentlyViewed: recentlyViewedIds = [],
  cart,
  onCartChange,
  view,
  onNavigate,
  customerName: initialCustomerName = '',
  onOrderCreated,
  chatPanel,
  onOpenChat,
}: StorefrontFlowProps) {
  const orderStorageKey = `dasnet-storefront-orders-${slug}`;
  const lines = useMemo(() => Object.entries(cart)
    .map(([id, quantity]) => {
      const product = products.find((entry) => entry.id === id);
      return product && quantity > 0 ? { product, quantity } : null;
    })
    .filter((line): line is CartLine => Boolean(line)), [cart, products]);
  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0),
    [lines],
  );
  const [orders, setOrders] = useState<BuyerOrder[]>(() => storedOrders(orderStorageKey));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mpesa');
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('home');
  const [deliveryCounty, setDeliveryCounty] = useState('');
  const [deliverySubCounty, setDeliverySubCounty] = useState('');
  const [deliveryEstate, setDeliveryEstate] = useState('');
  const [deliveryDirections, setDeliveryDirections] = useState('');
  const [customerName, setCustomerName] = useState(initialCustomerName);
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [pickupStation, setPickupStation] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherMessage, setVoucherMessage] = useState('');
  const [activeOrderNumber, setActiveOrderNumber] = useState('');
  const [newsletterEnabled, setNewsletterEnabled] = useState(false);
  const [orderTab, setOrderTab] = useState<'ongoing' | 'delivered' | 'cancelled'>('ongoing');

  useEffect(() => {
    try {
      localStorage.setItem(orderStorageKey, JSON.stringify(orders));
    } catch {
      // The UI remains usable when browser storage is unavailable.
    }
  }, [orderStorageKey, orders]);

  const deliveryFee = 0;
  const total = subtotal;
  const activeOrder = orders.find((order) => order.orderNumber === activeOrderNumber) || orders[0];
  useEffect(() => {
    const refresh = async () => {
      const refreshed = await Promise.all(orders.map(async (order) => {
        if (!order.chatToken) return order;
        try {
          const response = await fetch('/api/store?action=customer-chat&token=' + encodeURIComponent(order.chatToken));
          const data = await response.json();
          if (!response.ok) return order;
          return { ...order, paymentStatus: data.order?.paymentStatus || order.paymentStatus, receipt: data.order?.receipt || order.receipt, orderStatus: data.order?.status, deliveryStatus: data.order?.deliveryStatus };
        } catch { return order; }
      }));
      setOrders((current) => JSON.stringify(current) === JSON.stringify(refreshed) ? current : refreshed);
    };
    if (orders.length) refresh();
  }, [orders.map((order) => order.chatToken).join('|')]);
  const recentlyViewedProducts = recentlyViewedIds
    .map((id) => products.find((product) => product.id === id))
    .filter((product): product is StoreProduct => Boolean(product));

  function updateQuantity(id: string, quantity: number) {
    const next = { ...cart };
    if (quantity <= 0) delete next[id];
    else next[id] = Math.min(99, quantity);
    onCartChange(next);
  }

  function applyVoucher() {
    setVoucherMessage(voucherCode.trim()
      ? 'Voucher redemption is coming soon. No discount has been applied.'
      : 'Enter a voucher code first.');
  }

  async function placeOrder() {
    if (!lines.length || submitting) return;
    if (paymentMethod !== 'mpesa') {
      setCheckoutError('This payment method is coming soon. Choose M-PESA to continue.');
      return;
    }
    if (deliveryMethod === 'home' && (!deliveryCounty || !deliverySubCounty || !deliveryEstate.trim() || !deliveryAddress.trim())) {
      setCheckoutError('Complete your county, sub-county, estate/area and physical delivery address.');
      return;
    }
    if (deliveryMethod === 'pickup' && !pickupStation.trim()) {
      setCheckoutError('Enter your preferred pickup location so the seller can confirm collection arrangements.');
      return;
    }
    setSubmitting(true);
    setCheckoutError('');
    try {
      const response = await fetch('/api/store?action=order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim(),
          deliveryMethod,
          deliveryCounty,
          deliverySubCounty,
          deliveryEstate: deliveryEstate.trim(),
          deliveryAddress: deliveryAddress.trim(),
          deliveryDirections: deliveryDirections.trim(),
          pickupStation: pickupStation.trim(),
          paymentMethod: 'till',
          items: lines.map(({ product, quantity }) => ({ id: product.id, quantity })),
          idempotencyKey: `buyer-${slug}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.orderNumber || !data.chatToken) {
        throw new Error(data.error || 'We could not create your order or start M-PESA. Please review your details and try again.');
      }
      const createdAt = new Date().toISOString();
      const order: BuyerOrder = {
        orderNumber: data.orderNumber,
        createdAt,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        paymentMethod: 'mpesa',
        deliveryMethod,
        deliveryAddress: deliveryAddress.trim(),
        pickupStation: pickupStation.trim(),
        deliveryCounty,
        deliverySubCounty,
        deliveryEstate: deliveryEstate.trim(),
        deliveryDirections: deliveryDirections.trim(),
        subtotal,
        deliveryFee: 0,
        total: subtotal,
        lines: lines.map((line) => ({ ...line })),
        chatToken: data.chatToken,
        paymentStatus: data.paymentStatus || 'pending',
      };
      const updatedOrders = [order, ...orders.filter((entry) => entry.orderNumber !== order.orderNumber)];
      setOrders(updatedOrders);
      setActiveOrderNumber(order.orderNumber);
      onOrderCreated?.(data.chatToken, data.orderNumber);
      try { localStorage.setItem(orderStorageKey, JSON.stringify(updatedOrders)); } catch { /* Backend order remains valid. */ }
      onCartChange({});
      onNavigate('checkout/complete');
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Checkout failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function openOrder(order: BuyerOrder, next: string) {
    setActiveOrderNumber(order.orderNumber);
    if (order.chatToken) onOpenChat?.(order.chatToken, order.orderNumber);
    onNavigate(next);
  }

  function renderSummary() {
    return (
      <aside className="customer-summary-card">
        <h2>{view === 'cart' ? 'Cart summary' : 'Order summary'}</h2>
        {view === 'cart' ? <div className="customer-summary-row customer-summary-total"><span>Subtotal</span><strong>{formatKes(subtotal)}</strong></div> : <>
          <div className="customer-summary-row"><span>Items total</span><strong>{formatKes(subtotal)}</strong></div>
          <div className="customer-summary-row"><span>Delivery fees</span><strong>{formatKes(deliveryFee)}</strong></div>
          <div className="customer-summary-row customer-summary-total"><span>Total</span><strong>{formatKes(total)}</strong></div>
        </>}
        <p className="customer-preview-note"><ShieldCheck size={15} /> Prices and stock are rechecked by the shop server before an M-PESA request is created.</p>
        {view === 'cart' && (
          <button type="button" className="customer-primary-button" disabled={!lines.length} onClick={() => onNavigate('checkout/payment')}>
            Checkout ({formatKes(subtotal)}) <ArrowRight size={17} />
          </button>
        )}
      </aside>
    );
  }

  function renderCart() {
    return (
      <section className="customer-flow">
        <FlowHeading title="Your cart" onBack={() => onNavigate('store')} />
        {lines.length ? (
          <>
            <div className="customer-checkout-grid customer-cart-grid">
              <div className="customer-panel">
                <div className="customer-panel-heading"><h2>Cart ({lines.length})</h2><span>{lines.reduce((count, line) => count + line.quantity, 0)} items</span></div>
                <div className="customer-cart-lines">
                  {lines.map(({ product, quantity }) => (
                    <article className="customer-cart-line" key={product.id}>
                      <ProductThumb product={product} />
                      <div className="customer-cart-copy">
                        <h3>{product.name}</h3>
                        <p>{product.category || 'Product'} · Sold by {shopName}</p>
                        <strong>{formatKes(product.price)}</strong>
                        <div className="customer-mobile-quantity">
                          <button type="button" aria-label={`Decrease ${product.name} quantity`} onClick={() => updateQuantity(product.id, quantity - 1)}>−</button>
                          <span>{quantity}</span>
                          <button type="button" aria-label={`Increase ${product.name} quantity`} onClick={() => updateQuantity(product.id, quantity + 1)}><Plus size={15} /></button>
                        </div>
                        <button type="button" className="customer-mobile-remove" onClick={() => updateQuantity(product.id, 0)}>Remove</button>
                      </div>
                      <div className="customer-cart-controls">
                        <button type="button" className="customer-remove-button" onClick={() => updateQuantity(product.id, 0)}>Remove</button>
                        <div className="customer-quantity">
                          <button type="button" aria-label={`Decrease ${product.name} quantity`} onClick={() => updateQuantity(product.id, quantity - 1)}>−</button>
                          <span>{quantity}</span>
                          <button type="button" aria-label={`Increase ${product.name} quantity`} onClick={() => updateQuantity(product.id, quantity + 1)}><Plus size={15} /></button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
              {renderSummary()}
            </div>
            <div className="customer-mobile-checkout-bar"><span><small>Subtotal</small><strong>{formatKes(subtotal)}</strong></span><button type="button" className="customer-primary-button" onClick={() => onNavigate('checkout/payment')}>Checkout <ArrowRight size={17} /></button></div>
            <section className="customer-recommendations">
              <div className="customer-section-title"><h2>{recentlyViewedProducts.length ? 'Recently viewed' : 'You may also like'}</h2><button type="button" onClick={() => onNavigate('store')}>See all <ArrowRight size={14} /></button></div>
              <div className="customer-recommendation-row">
                {(recentlyViewedProducts.length ? recentlyViewedProducts : products.slice(0, 5)).map((product) => (
                  <article className="customer-recommendation-card" key={product.id}>
                    <ProductThumb product={product} />
                    <strong>{product.name}</strong><b>{formatKes(product.price)}</b>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : (
          <div className="customer-empty-state">
            <span><ShoppingBag size={30} /></span><h2>Your cart is empty</h2>
            <p>Add something from {shopName} and it will appear here.</p>
            <button type="button" className="customer-primary-button" onClick={() => onNavigate('store')}>Continue shopping <ArrowRight size={17} /></button>
          </div>
        )}
      </section>
    );
  }

  function renderCheckoutPayment() {
    const choices: { id: PaymentMethod; title: string; description: string; mark: string; available: boolean }[] = [
      { id: 'mpesa', title: 'Pay with M-PESA', description: 'Primary payment · Secure STK Push to your phone', mark: 'M-PESA', available: true },
      { id: 'card', title: 'Pay with bank card', description: 'Visa and Mastercard · Coming soon', mark: 'Coming soon', available: false },
      { id: 'airtel', title: 'Pay with Airtel Money', description: 'Airtel Money · Coming soon', mark: 'Coming soon', available: false },
      { id: 'delivery', title: 'Pay on delivery', description: 'Coming soon', mark: 'Coming soon', available: false },
    ];
    const paymentOption = (choice: typeof choices[number]) => (
      <button type="button" key={choice.id} className={`customer-payment-option${paymentMethod === choice.id ? ' is-selected' : ''}`} onClick={() => choice.available && setPaymentMethod(choice.id)} aria-pressed={paymentMethod === choice.id} disabled={!choice.available}>
        <span className="customer-radio" aria-hidden="true">{paymentMethod === choice.id && <i />}</span>
        <span className="customer-payment-copy"><strong>{choice.title}</strong><small>{choice.description}</small></span>
        <b className="customer-payment-mark">{choice.mark}</b>
      </button>
    );
    return (
      <section className="customer-flow">
        <FlowHeading title="Select payment" onBack={() => onNavigate('cart')} backLabel="Back to cart" />
        <div className="customer-checkout-grid">
          <div className="customer-checkout-stack">
            <div className="customer-panel customer-voucher-panel">
              <label className="customer-voucher">
                <span>Voucher code</span>
                <span className="customer-voucher-controls"><input value={voucherCode} onChange={(event) => setVoucherCode(event.target.value)} placeholder="Enter voucher code" /><button type="button" onClick={applyVoucher}>Apply</button></span>
                {voucherMessage && <small role="status">{voucherMessage}</small>}
              </label>
            </div>
            <div className="customer-panel">
              <div className="customer-panel-heading"><h2>Payment method</h2><span>Choose one</span></div>
              <div className="customer-payment-list">
                <h3 className="customer-payment-group-title">Pre-pay now</h3>
                {choices.slice(0, 3).map(paymentOption)}
                <div className="customer-card-preview"><strong>M-PESA checkout</strong><span>After you confirm, an STK prompt will be sent to your phone. Your order remains pending until Safaricom confirms payment.</span></div>
                <h3 className="customer-payment-group-title customer-payment-delivery-title">Pay on delivery</h3>
                {paymentOption(choices[3])}
              </div>
            </div>
          </div>
          {renderSummary()}
        </div>
        <div className="customer-flow-actions">
          <button type="button" className="customer-secondary-button" onClick={() => onNavigate('cart')}>Modify cart</button>
          <button type="button" className="customer-primary-button" disabled={!lines.length || paymentMethod !== 'mpesa'} onClick={() => onNavigate('checkout/review')}>Continue <ArrowRight size={17} /></button>
        </div>
      </section>
    );
  }

  function renderReview() {
    return (
      <section className="customer-flow">
        <FlowHeading title="Place your order" onBack={() => onNavigate('checkout/payment')} backLabel="Payment method" />
        <p className="customer-terms-copy">By continuing, you agree to the store’s <button type="button">Terms &amp; Conditions</button>.</p>
        <div className="customer-checkout-grid">
          <div className="customer-review-stack">
            <div className="customer-panel">
              <div className="customer-panel-heading"><h2>Payment method</h2><button type="button" className="customer-text-button" onClick={() => onNavigate('checkout/payment')}>Change</button></div>
              <div className="customer-review-summary"><WalletCards size={19} /><strong>{paymentLabels[paymentMethod]}</strong><span>STK prompt sent after you confirm. Payment is pending until verified.</span></div>
            </div>
            <div className="customer-panel">
              <div className="customer-panel-heading"><h2>Delivery details</h2><button type="button" className="customer-text-button" onClick={() => document.getElementById('customer-delivery-options')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>Change</button></div>
              <div className="customer-delivery-options" id="customer-delivery-options">
                <label className={`customer-delivery-option${deliveryMethod === 'home' ? ' is-selected' : ''}`}><input type="radio" name="deliveryMethod" checked={deliveryMethod === 'home'} onChange={() => setDeliveryMethod('home')} /><span><strong>Home / business delivery</strong><small>Provide the location where the seller should deliver.</small></span></label>
                <label className={`customer-delivery-option${deliveryMethod === 'pickup' ? ' is-selected' : ''}`}><input type="radio" name="deliveryMethod" checked={deliveryMethod === 'pickup'} onChange={() => setDeliveryMethod('pickup')} /><span><strong>Collect / meet-up</strong><small>Enter your preferred collection area; the seller will confirm the exact point.</small></span></label>
              </div>
              {deliveryMethod === 'home' ? <div className="customer-contact-fields customer-delivery-fields">
                <label className="customer-form-label">County<select required value={deliveryCounty} onChange={(event) => { setDeliveryCounty(event.target.value); setDeliverySubCounty(''); }}><option value="">Select county</option>{['Baringo','Bomet','Bungoma','Busia','Elgeyo-Marakwet','Embu','Garissa','Homa Bay','Isiolo','Kajiado','Kakamega','Kericho','Kiambu','Kilifi','Kirinyaga','Kisii','Kisumu','Kitui','Kwale','Laikipia','Lamu','Machakos','Makueni','Mandera','Marsabit','Meru','Migori','Mombasa','Murang’a','Nairobi','Nakuru','Nandi','Narok','Nyamira','Nyandarua','Nyeri','Samburu','Siaya','Taita-Taveta','Tana River','Tharaka-Nithi','Trans Nzoia','Turkana','Uasin Gishu','Vihiga','Wajir','West Pokot'].map((county) => <option key={county} value={county}>{county}</option>)}</select></label>
                <label className="customer-form-label">Sub-county<input required value={deliverySubCounty} onChange={(event) => setDeliverySubCounty(event.target.value)} placeholder="e.g. Westlands" /></label>
                <label className="customer-form-label">Estate / area<input required value={deliveryEstate} onChange={(event) => setDeliveryEstate(event.target.value)} placeholder="e.g. Kilimani, near Yaya Centre" /></label>
                <label className="customer-form-label">Physical address<input required value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} placeholder="Building, street, plot or house number" /></label>
                <label className="customer-form-label">Directions / landmark (optional)<textarea value={deliveryDirections} onChange={(event) => setDeliveryDirections(event.target.value)} placeholder="Nearby landmark, gate details or directions" /></label>
              </div> : <div className="customer-contact-fields"><label className="customer-form-label">Preferred pickup area / station<input required value={pickupStation} onChange={(event) => setPickupStation(event.target.value)} placeholder="Town, mall or preferred meeting area" /></label></div>}
              <div className="customer-contact-fields">
                <label className="customer-form-label">Full name<input required value={customerName} onChange={(event) => setCustomerName(event.target.value)} autoComplete="name" placeholder="Your name" /></label>
                <label className="customer-form-label">Phone number<input required type="tel" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} autoComplete="tel" placeholder="07… or +254…" /></label>
                <label className="customer-form-label">Email <small>(optional)</small><input type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" /></label>
              </div>
            </div>
            <div className="customer-panel">
              <div className="customer-panel-heading"><h2>Shipment 1 / 1</h2><span>Fulfilled by {shopName}</span></div>
              {lines.map(({ product, quantity }) => (
                <article className="customer-review-product" key={product.id}>
                  <ProductThumb product={product} />
                  <div><strong>{product.name}</strong><small>Qty {quantity} · {formatKes(product.price)}</small></div>
                  <b>{formatKes(product.price * quantity)}</b>
                </article>
              ))}
            </div>
          </div>
          {renderSummary()}
        </div>
        {checkoutError && <p className="customer-preview-alert" role="alert">{checkoutError}</p>}
        <div className="customer-flow-actions">
          <button type="button" className="customer-secondary-button" onClick={() => onNavigate('cart')}>Modify cart</button>
          <button type="button" className="customer-primary-button" disabled={!lines.length || !customerName.trim() || !customerPhone.trim() || paymentMethod !== 'mpesa' || submitting || (deliveryMethod === 'home' && (!deliveryCounty || !deliverySubCounty.trim() || !deliveryEstate.trim() || !deliveryAddress.trim())) || (deliveryMethod === 'pickup' && !pickupStation.trim())} onClick={placeOrder}>{submitting ? 'Starting M-PESA…' : 'Confirm & pay with M-PESA'} <ArrowRight size={17} /></button>
        </div>
      </section>
    );
  }

  function renderSuccess() {
    if (!activeOrder) {
      return <div className="customer-flow"><FlowHeading title="Order confirmation" onBack={() => onNavigate('store')} /><div className="customer-empty-state"><h2>No preview order yet</h2><button type="button" className="customer-primary-button" onClick={() => onNavigate('store')}>Continue shopping</button></div></div>;
    }
    return (
      <section className="customer-flow customer-success-page">
        <div className="customer-success-banner"><span className="customer-success-check"><Check size={39} /></span><div><h1>Thank you for your order</h1><p>Order number <strong>{activeOrder.orderNumber}</strong></p></div></div>
        <div className="customer-preview-alert"><ShieldCheck size={17} /><span>{activeOrder.paymentStatus === 'succeeded' ? `Payment confirmed${activeOrder.receipt ? ` · M-PESA receipt ${activeOrder.receipt}` : ''}.` : activeOrder.paymentStatus === 'failed' || activeOrder.paymentStatus === 'cancelled' ? 'M-PESA payment was not completed. This order is not paid.' : 'Your order has been created. Payment is pending Safaricom confirmation; do not retry unless the payment prompt has failed or expired.'}</span></div>
        <div className="customer-panel customer-success-delivery">
          <MapPin size={22} />
          <div><strong>Delivery coordination</strong><p>Contact the seller through your private order conversation to agree on collection or delivery.</p><small>Pickup and home delivery options are coming soon.</small></div>
        </div>
        <div className="customer-panel customer-success-payment">
          <WalletCards size={22} />
          <div><strong>{paymentLabels[activeOrder.paymentMethod]}</strong><p>{activeOrder.paymentStatus === 'succeeded' ? 'Payment successful.' : activeOrder.paymentStatus === 'failed' ? 'Payment failed.' : activeOrder.paymentStatus === 'cancelled' ? 'Payment cancelled.' : 'Awaiting M-PESA confirmation.'}</p></div>
        </div>
        <div className="customer-flow-actions customer-success-actions">
          <button type="button" className="customer-secondary-button" onClick={() => openOrder(activeOrder, 'orders')}>My orders</button>
          <button type="button" className="customer-primary-button" onClick={() => openOrder(activeOrder, 'order-detail')}>See order details <ArrowRight size={17} /></button>
        </div>
        <section className="customer-recommendations">
          <div className="customer-section-title"><h2>Top picks from {shopName}</h2><button type="button" onClick={() => onNavigate('store')}>See all <ArrowRight size={14} /></button></div>
          <div className="customer-recommendation-row">
            {products.slice(0, 5).map((product) => <article className="customer-recommendation-card" key={product.id}><ProductThumb product={product} /><strong>{product.name}</strong><b>{formatKes(product.price)}</b></article>)}
          </div>
        </section>
      </section>
    );
  }

  function renderOrders() {
    const stateOf = (order: BuyerOrder) => ({ order: String(order.orderStatus || '').toLowerCase(), delivery: String(order.deliveryStatus || '').toLowerCase(), payment: String(order.paymentStatus || '').toLowerCase() });
    const isCancelled = (order: BuyerOrder) => { const s=stateOf(order); return ['cancelled','returned','refunded'].includes(s.order)||['cancelled','returned'].includes(s.delivery)||s.payment==='cancelled'; };
    const isDelivered = (order: BuyerOrder) => { const s=stateOf(order); return s.delivery==='delivered'||['fulfilled','delivered'].includes(s.order); };
    const tabOrders = orders.filter(order => order.orderNumber && (orderTab==='ongoing' ? !isCancelled(order)&&!isDelivered(order) : orderTab==='delivered' ? isDelivered(order) : isCancelled(order)));
    const suggestions = products.filter(product => product.stockQuantity !== 0).slice(0,12);
    return (
      <section className="customer-flow">
        <FlowHeading title="My orders" onBack={() => onNavigate('account')} backLabel="My account" />
        <div className="customer-order-tabs"><button type="button" className={orderTab === 'ongoing' ? 'is-active' : ''} onClick={() => setOrderTab('ongoing')}>ONGOING ({orders.filter(o=>!isCancelled(o)&&!isDelivered(o)).length})</button><button type="button" className={orderTab === 'delivered' ? 'is-active' : ''} onClick={() => setOrderTab('delivered')}>DELIVERED ({orders.filter(isDelivered).length})</button><button type="button" className={orderTab === 'cancelled' ? 'is-active' : ''} onClick={() => setOrderTab('cancelled')}>CANCELLED / RETURNED ({orders.filter(isCancelled).length})</button></div>
        {tabOrders.length ? <div className="customer-order-list">{tabOrders.map((order) => (
          <article className="customer-order-card" key={order.orderNumber}>
            <div className="customer-order-card-heading"><div><small>ORDER {order.orderNumber}</small><strong>{new Date(order.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></div><span className="customer-order-status">{stateOf(order).delivery==='delivered'?'Delivered':stateOf(order).delivery==='in_transit'?'In transit':stateOf(order).order==='processing'?'Processing':stateOf(order).payment==='failed'?'Payment failed':stateOf(order).payment==='succeeded'?'Paid':'Order placed'}</span></div>
            {order.lines.slice(0, 2).map(({ product, quantity }) => <div className="customer-order-product" key={product.id}><ProductThumb product={product} /><span><strong>{product.name}</strong><small>Qty {quantity}</small></span><b>{formatKes(product.price * quantity)}</b></div>)}
            <div className="customer-order-card-footer"><span>Total <strong>{formatKes(order.total)}</strong></span><div><button type="button" className="customer-secondary-button" onClick={() => openOrder(order, 'order-detail')}>Order details</button><button type="button" className="customer-primary-button" onClick={() => openOrder(order, 'order-tracking')}>Track my item</button></div></div>
          </article>
        ))}</div> : <div className="customer-empty-state"><span><Package size={28} /></span><h2>{orderTab === 'ongoing' ? 'You have placed no orders yet!' : `No ${orderTab === 'delivered' ? 'delivered' : 'cancelled / returned'} orders`}</h2><p>{orderTab === 'ongoing' ? 'All your orders will be saved here so you can access their status anytime.' : 'Orders in this section will appear here when their status is updated by the shop.'}</p><button type="button" className="customer-primary-button" onClick={() => onNavigate('store')}>Continue shopping <ArrowRight size={17} /></button></div>}
      </section>
    );
  }

  function renderOrderDetail() {
    if (!activeOrder) return <div className="customer-flow"><FlowHeading title="Order details" onBack={() => onNavigate('orders')} backLabel="My orders" /><div className="customer-empty-state"><h2>No order selected</h2><button type="button" className="customer-primary-button" onClick={() => onNavigate('orders')}>View my orders</button></div></div>;
    return (
      <section className="customer-flow">
        <FlowHeading title="Order details" onBack={() => onNavigate('orders')} backLabel="My orders" />
        <div className="customer-order-detail-heading"><div><small>ORDER NUMBER</small><h2>{activeOrder.orderNumber}</h2><span>Placed {new Date(activeOrder.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div><span className="customer-order-status">Order placed</span></div>
        <div className="customer-checkout-grid">
          <div className="customer-review-stack">
            <div className="customer-panel">
              <div className="customer-panel-heading"><h2>Items in this order</h2><span>{activeOrder.lines.length} items</span></div>
              {activeOrder.lines.map(({ product, quantity }) => <div className="customer-review-product" key={product.id}><ProductThumb product={product} /><div><strong>{product.name}</strong><small>Qty {quantity}</small><small>{formatKes(product.price)} each</small></div><b>{formatKes(product.price * quantity)}</b></div>)}
              <div className="customer-flow-actions"><button type="button" className="customer-primary-button" onClick={() => openOrder(activeOrder, 'order-tracking')}>Track my item <ArrowRight size={17} /></button></div>
            </div>
            <div className="customer-panel">
              <div className="customer-panel-heading"><h2>Delivery details</h2></div>
              <p className="customer-order-address"><MapPin size={18} />{activeOrder.deliveryMethod === 'pickup' ? `Preferred collection: ${activeOrder.pickupStation || 'To be confirmed with seller'}` : [activeOrder.deliveryCounty, activeOrder.deliverySubCounty, activeOrder.deliveryEstate, activeOrder.deliveryAddress].filter(Boolean).join(', ') || 'Delivery destination not recorded'}{activeOrder.deliveryDirections ? ` · Directions: ${activeOrder.deliveryDirections}` : ''}</p>
              <p className="customer-order-address"><UserRound size={18} />{activeOrder.customerName} · {activeOrder.customerPhone}</p>
            </div>
            {chatPanel}
          </div>
          <aside className="customer-summary-card">
            <h2>Payment summary</h2>
            <div className="customer-summary-row"><span>Items</span><strong>{formatKes(activeOrder.subtotal)}</strong></div>
            <div className="customer-summary-row"><span>Delivery</span><strong>{formatKes(activeOrder.deliveryFee)}</strong></div>
            <div className="customer-summary-row customer-summary-total"><span>Total</span><strong>{formatKes(activeOrder.total)}</strong></div>
            <p className="customer-preview-note"><WalletCards size={15} /> {paymentLabels[activeOrder.paymentMethod]}</p>
          </aside>
        </div>
      </section>
    );
  }

  function renderTracking() {
    if (!activeOrder) return <div className="customer-flow"><FlowHeading title="Package history" onBack={() => onNavigate('orders')} backLabel="My orders" /><div className="customer-empty-state"><h2>No order selected</h2><button type="button" className="customer-primary-button" onClick={() => onNavigate('orders')}>View my orders</button></div></div>;
    return (
      <section className="customer-flow">
        <FlowHeading title="Package history" onBack={() => onNavigate('order-detail')} backLabel="Order details" />
        <div className="customer-tracking-summary"><div><small>ORDER NUMBER</small><strong>{activeOrder.orderNumber}</strong></div><span className="customer-order-status">Order placed</span></div>
        <div className="customer-panel customer-timeline-panel">
          <div className="customer-tracking-timeline">
            <article className="is-complete"><span><Check size={15} /></span><div><strong>Order placed</strong><small>{new Date(activeOrder.createdAt).toLocaleString('en-KE')}</small><p>Your order was received by the shop and saved to its order records.</p></div></article>
            <article className="is-current"><span>2</span><div><strong>Pending confirmation</strong><small>Waiting for store connection</small><p>Payment and fulfilment updates will appear here when the seller updates your order.</p></div></article>
            <article><span>3</span><div><strong>Waiting to be shipped</strong><small>Not started</small></div></article>
            <article><span>4</span><div><strong>Delivered</strong><small>Not started</small></div></article>
          </div>
          <p className="customer-preview-note"><ShieldCheck size={15} /> Payment and delivery status are retrieved from the order conversation service. Delivery updates appear when the seller records them.</p>
        </div>
        {chatPanel}
      </section>
    );
  }

  function renderAccount() {
    return (
      <section className="customer-flow customer-account-page">
        <div className="customer-account-welcome"><span><UserRound size={27} /></span><div><small>MY ACCOUNT</small><h1>{customerName.trim() ? `Welcome back, ${customerName.trim()}` : 'Welcome back'}</h1><p>Manage your orders, saved items and account settings.</p></div></div>
        <div className="customer-account-groups">
          {accountGroups.map((group) => <section className="customer-panel" key={group.title}>
            <h2 className="customer-account-group-title">{group.title}</h2>
            {group.links.map((link) => <button type="button" className="customer-account-link" key={link.view} onClick={() => onNavigate(link.view)}><link.icon size={18} /><span>{link.label}</span><ChevronRight size={16} /></button>)}
          </section>)}
        </div>
      </section>
    );
  }

  function renderAccountSection() {
    if (view === 'inbox') return (
      <section className="customer-flow">
        <FlowHeading title="Inbox & messages" onBack={() => onNavigate('account')} backLabel="My account" />
        <div className="customer-panel customer-inbox-list">
          <div className="customer-panel-heading"><h2>Order conversations</h2><span>{orders.filter((order) => Boolean(order.chatToken)).length} chats</span></div>
          {orders.filter((order) => Boolean(order.chatToken)).length ? orders.filter((order) => Boolean(order.chatToken)).map((order) => (
            <article className="customer-order-card" key={order.orderNumber}>
              <div className="customer-order-card-heading"><div><small>ORDER {order.orderNumber}</small><strong>{new Date(order.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></div><span className="customer-order-status">Seller chat</span></div>
              <div className="customer-order-card-footer"><span>{order.lines[0]?.product.name || 'Order'}{order.lines.length > 1 ? ` + ${order.lines.length - 1} more` : ''}</span><div><button type="button" className="customer-primary-button" onClick={() => onOpenChat?.(order.chatToken, order.orderNumber)}>Open conversation</button></div></div>
            </article>
          )) : <div className="customer-empty-state"><span><ShoppingBag size={28}/></span><h2>No messages yet</h2><p>Conversations with sellers appear here after you place an order.</p><button type="button" className="customer-primary-button" onClick={() => onNavigate('orders')}>View my orders</button></div>}
        </div>
        {chatPanel}
      </section>
    );
    const content = accountSectionCopy[view];
    if (!content) return null;
    return (
      <section className="customer-flow">
        <FlowHeading title={content.title} onBack={() => onNavigate('account')} backLabel="My account" />
        <div className="customer-panel customer-account-detail"><p>{content.description}</p>
          {view === 'recently-viewed' && recentlyViewedProducts.length > 0 && <div className="customer-recommendation-row">{recentlyViewedProducts.map((product) => <article className="customer-recommendation-card" key={product.id}><ProductThumb product={product} /><strong>{product.name}</strong><b>{formatKes(product.price)}</b></article>)}</div>}
          {view === 'newsletter' && <label className="customer-newsletter-toggle"><input type="checkbox" checked={newsletterEnabled} onChange={(event) => setNewsletterEnabled(event.target.checked)} /><span>{newsletterEnabled ? 'Subscribed for this preview' : 'Subscribe to store updates'}</span></label>}
          {view === 'close-account' && <p className="customer-preview-note"><ShieldCheck size={15} /> No account action will be taken from this preview.</p>}
          <button type="button" className="customer-secondary-button" onClick={() => onNavigate(view === 'recently-viewed' ? 'store' : 'account')}>{view === 'recently-viewed' ? 'Continue shopping' : 'Back to my account'}</button>
        </div>
      </section>
    );
  }

  if (view === 'store') return null;
  const pageContent = view === 'cart' ? renderCart() : view === 'checkout/payment' ? (lines.length ? renderCheckoutPayment() : renderCart()) : view === 'checkout/review' ? (lines.length ? renderReview() : renderCart()) : view === 'checkout/complete' ? renderSuccess() : view === 'orders' ? renderOrders() : view === 'order-detail' ? renderOrderDetail() : view === 'order-tracking' ? renderTracking() : (view === 'account' || view === 'profile') ? renderAccount() : renderAccountSection() || (<section className="customer-flow"><FlowHeading title="Shopping assistant" onBack={() => onNavigate('store')} /><div className="customer-panel customer-account-detail"><Search size={24} /><p>{accountSectionCopy.assistant.description}</p><button type="button" className="customer-secondary-button" onClick={() => onNavigate('store')}>Back to the store</button></div></section>);
  // The storefront-level marketplace header is the single buyer navigation surface for every route.
  // Do not mount a second sticky nav here: nested sticky bars overlapped the account/cart content
  // and intercepted taps on mobile.
  return <div className="customer-workspace-shell">{pageContent}</div>;
}
