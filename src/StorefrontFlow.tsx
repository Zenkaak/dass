import { marketplaceFaqs } from './marketplaceFaqs';
import { DisputesPanel } from './DisputesPanel';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
  Flag,
  TicketPercent,
  Phone,
  Mail,
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
  orderId?: string;
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
  discount?: number;
  couponCode?: string | null;
  deliveryStatus?: string | null;
  deliveryUpdatedAt?: string | null;
};

type StorefrontFlowProps = {
  slug: string;
  shopName: string;
  shopWhatsappNumber?: string;
  shopContactEmail?: string;
  shopTermsAndConditions?: string;
  shopPrivacyPolicy?: string;
  shopReturnPolicy?: string;
  shopDeliveryPolicy?: string;
  shopFaqs?: Array<{question:string;answer:string}>;
  products: StoreProduct[];
  recentlyViewed?: string[];
  cart: Record<string, number>;
  onCartChange: (next: Record<string, number>) => void;
  view: string;
  initialReportId?: string;
  onNavigate: (next: string) => void;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerAlternativePhone?: string;
  wishlistIds?: string[];
  onToggleWishlist?: (id: string) => void;
  onOpenProduct?: (product: StoreProduct) => void;
  notifications?: any[];
  onSignOut?: () => void;
  onOrderCreated?: (token: string, orderNumber: string) => void;
  chatPanel?: ReactNode;
  onOpenChat?: (token: string, orderNumber: string, orderId?: string) => void;
  onProfileUpdated?: (customer: any) => void;
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
    { label: 'Reports & Complaints', icon: Flag, view: 'my-reports' },
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
  shopWhatsappNumber = '',
  shopContactEmail = '',
  shopTermsAndConditions = '',
  shopPrivacyPolicy = '',
  shopReturnPolicy = '',
  shopDeliveryPolicy = '',
  shopFaqs = [],
  products,
  recentlyViewed: recentlyViewedIds = [],
  cart,
  onCartChange,
  view,
  initialReportId,
  onNavigate,
  customerName: initialCustomerName = '',
  customerPhone: initialCustomerPhone = '',
  customerEmail: initialCustomerEmail = '',
  customerAddress: initialCustomerAddress = '',
  customerAlternativePhone: initialCustomerAlternativePhone = '',
  wishlistIds = [],
  onToggleWishlist,
  onOpenProduct,
  notifications = [],
  onSignOut,
  onOrderCreated,
  chatPanel,
  onOpenChat,
  onProfileUpdated,
}: StorefrontFlowProps) {
  const legacyOrderStorageKey = `dasnet-storefront-orders-${slug}-${String(initialCustomerPhone||'').replace(/\D/g,'') || 'signed-out'}`;
  const orderStorageKey = `dasnet-storefront-orders-${slug}-${String(initialCustomerPhone||'').replace(/\D/g,'').slice(-9) || 'signed-out'}`;
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
  const [orders, setOrders] = useState<BuyerOrder[]>(() => {const current=storedOrders(orderStorageKey);return current.length?current:storedOrders(legacyOrderStorageKey)});
  const [retryingOrder,setRetryingOrder]=useState(false);const [retryPaymentPhone,setRetryPaymentPhone]=useState('');const [retryMessage,setRetryMessage]=useState('');const [paymentCelebration,setPaymentCelebration]=useState(false);const lastPaymentStatus=useRef<string|null>(null);
  const [ordersLoading,setOrdersLoading]=useState(false),[ordersError,setOrdersError]=useState('');
  const [currentPassword,setCurrentPassword]=useState(''),[newPassword,setNewPassword]=useState(''),[confirmPassword,setConfirmPassword]=useState(''),[passwordSaving,setPasswordSaving]=useState(false),[passwordMessage,setPasswordMessage]=useState('');
  const [inAppNotificationsEnabled,setInAppNotificationsEnabled]=useState(()=>{try{return localStorage.getItem('dasnet-buyer-notifications-'+slug)!=='false'}catch{return true}});
  useEffect(()=>{try{localStorage.setItem('dasnet-buyer-notifications-'+slug,String(inAppNotificationsEnabled))}catch{}},[slug,inAppNotificationsEnabled]);
  const [profileName,setProfileName]=useState(initialCustomerName),[profileEmail,setProfileEmail]=useState(initialCustomerEmail),[profilePhoneAlt,setProfilePhoneAlt]=useState(''),[profileAddress,setProfileAddress]=useState(initialCustomerAddress),[profileSaving,setProfileSaving]=useState(false),[profileMessage,setProfileMessage]=useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mpesa');
  const [paymentModal,setPaymentModal]=useState<PaymentMethod|null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('home');
  const [deliveryCounty, setDeliveryCounty] = useState('');
  const [deliverySubCounty, setDeliverySubCounty] = useState('');
  const [deliveryEstate, setDeliveryEstate] = useState('');
  const [deliveryDirections, setDeliveryDirections] = useState('');
  const [customerName, setCustomerName] = useState(initialCustomerName);
  const [customerPhone, setCustomerPhone] = useState(initialCustomerPhone);
  const [paymentPhone, setPaymentPhone] = useState(initialCustomerPhone);
  const [customerEmail, setCustomerEmail] = useState(initialCustomerEmail);
  const [deliveryAddress, setDeliveryAddress] = useState(initialCustomerAddress);
  const [pickupStation, setPickupStation] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherMessage, setVoucherMessage] = useState('');
  const [appliedCoupon,setAppliedCoupon]=useState<any>(null),[shopCoupons,setShopCoupons]=useState<any[]>([]);
  const [reportShop,setReportShop]=useState(shopName),[reportOrderId,setReportOrderId]=useState(''),[reportProductId,setReportProductId]=useState(''),[reportIssue,setReportIssue]=useState('payment'),[reportPaymentMade,setReportPaymentMade]=useState(false),[reportPaymentAmount,setReportPaymentAmount]=useState(''),[reportPaymentReference,setReportPaymentReference]=useState(''),[reportDetails,setReportDetails]=useState(''),[reportFiles,setReportFiles]=useState<File[]>([]),[reportBusy,setReportBusy]=useState(false),[reportMessage,setReportMessage]=useState('');
  const [activeOrderNumber, setActiveOrderNumber] = useState('');
  const [newsletterEnabled, setNewsletterEnabled] = useState(false);
  const [orderTab, setOrderTab] = useState<'ongoing' | 'delivered' | 'cancelled'>('ongoing');

  useEffect(()=>{setAppliedCoupon(null);if(voucherCode)setVoucherMessage('Your cart changed. Reapply the coupon.');},[subtotal]);

  useEffect(()=>{let live=true;fetch('/api/buyer?action=coupons-public&slug='+encodeURIComponent(slug),{credentials:'same-origin',cache:'no-store'}).then(r=>r.json()).then(d=>{if(live)setShopCoupons(Array.isArray(d.coupons)?d.coupons:[])}).catch(()=>{});return()=>{live=false}},[slug]);
  useEffect(() => { setCustomerName(initialCustomerName); setCustomerPhone(initialCustomerPhone); setPaymentPhone(initialCustomerPhone); setCustomerEmail(initialCustomerEmail); setProfileName(initialCustomerName); setProfileEmail(initialCustomerEmail); setProfileAddress(initialCustomerAddress); setProfilePhoneAlt(initialCustomerAlternativePhone); if(initialCustomerAddress&&!deliveryAddress)setDeliveryAddress(initialCustomerAddress); }, [initialCustomerName,initialCustomerPhone,initialCustomerEmail,initialCustomerAddress,initialCustomerAlternativePhone]);
  useEffect(() => {
    let live = true;
    let requestInFlight = false;
    const cached = initialCustomerPhone
      ? [...storedOrders(orderStorageKey), ...storedOrders(legacyOrderStorageKey)]
      : [];
    setOrders(cached.filter((order, index, all) =>
      all.findIndex((item) => (item.orderId && item.orderId === order.orderId) || item.orderNumber === order.orderNumber) === index
    ));
    setOrdersError('');

    if (!initialCustomerPhone) {
      setOrdersLoading(false);
      return () => { live = false; };
    }

    const loadOrders = async () => {
      if (requestInFlight || !live) return;
      requestInFlight = true;
      setOrdersLoading(true);
      try {
        const response = await fetch('/api/buyer?action=customer-orders&slug=' + encodeURIComponent(slug), {
          credentials: 'same-origin',
          cache: 'no-store',
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (response.status === 401) throw Error('Your buyer session needs refreshing. Sign in again to securely load your orders.');
          throw Error(data.error || 'Could not load your orders.');
        }
        const serverOrders: BuyerOrder[] = (Array.isArray(data.orders) ? data.orders : []).map((order: any) => ({
          orderId: order.id,
          orderNumber: order.orderNumber,
          createdAt: order.createdAt,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerEmail: order.customerEmail || '',
          paymentMethod: 'mpesa',
          deliveryMethod: order.deliveryMethod === 'pickup' ? 'pickup' : 'home',
          deliveryAddress: order.deliveryAddress || '',
          pickupStation: order.pickupStation || '',
          deliveryCounty: order.deliveryCounty || '',
          deliverySubCounty: order.deliverySubCounty || '',
          deliveryEstate: order.deliveryEstate || '',
          deliveryDirections: order.deliveryDirections || '',
          subtotal: Number(order.subtotal) || 0,
          deliveryFee: 0,
          total: Number(order.total) || 0,
          lines: (order.items || []).map((item: any) => ({
            product: {
              id: String(item.id || ('item-' + item.name)),
              name: item.name,
              price: Number(item.price) || 0,
              category: item.category || 'Product',
              images: item.image ? [item.image] : [],
            },
            quantity: Number(item.quantity) || 1,
          })),
          chatToken: '',
          paymentStatus: order.paymentStatus || 'unpaid',
          receipt: order.receipt || null,
          orderStatus: order.orderStatus || null,
          deliveryStatus: order.deliveryStatus || null,
          deliveryUpdatedAt: order.deliveryUpdatedAt || null,
        }));

        if (live) {
          // Merge into the latest state, never replace it with a stale request snapshot.
          // Orders are append-only in the buyer history, so a transient empty response
          // must not make an already-known order disappear.
          setOrders((current) => {
            const merged = [...current];
            for (const incoming of serverOrders) {
              const index = merged.findIndex((existing) =>
                (incoming.orderId && existing.orderId === incoming.orderId) ||
                existing.orderNumber === incoming.orderNumber
              );
              if (index >= 0) {
                merged[index] = { ...merged[index], ...incoming, chatToken: merged[index].chatToken || incoming.chatToken };
              } else {
                merged.push(incoming);
              }
            }
            return merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          });
          setOrdersError('');
        }
      } catch (error: any) {
        if (live) setOrdersError(error.message || 'Could not load your orders.');
      } finally {
        requestInFlight = false;
        if (live) setOrdersLoading(false);
      }
    };

    void loadOrders();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadOrders();
    }, 15000);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [slug, initialCustomerPhone, orderStorageKey, legacyOrderStorageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(orderStorageKey, JSON.stringify(orders));
    } catch {
      // The UI remains usable when browser storage is unavailable.
    }
  }, [orderStorageKey, orders]);

  const deliveryFee = 0;
  const total = Math.max(0, subtotal - Number(appliedCoupon?.discount||0));
  const activeOrder = orders.find((order) => order.orderNumber === activeOrderNumber) || orders[0];
  useEffect(()=>{if(activeOrder?.orderId)setRetryPaymentPhone(activeOrder.customerPhone||initialCustomerPhone);if(activeOrder?.orderId&&['order-detail','order-tracking'].includes(view))onOpenChat?.('',activeOrder.orderNumber,activeOrder.orderId)},[view,activeOrder?.orderId,initialCustomerPhone]);

  useEffect(()=>{const status=String(activeOrder?.paymentStatus||'');if(lastPaymentStatus.current&&lastPaymentStatus.current!=='succeeded'&&status==='succeeded'){setPaymentCelebration(true);const timer=window.setTimeout(()=>setPaymentCelebration(false),5200);lastPaymentStatus.current=status;return()=>window.clearTimeout(timer)}if(status)lastPaymentStatus.current=status},[activeOrder?.paymentStatus]);
  async function retryActiveOrderPayment(){if(!activeOrder?.orderId||retryingOrder)return;const cleaned=retryPaymentPhone.trim().replace(/[\s().-]/g,'');if(!/^\+?254[17]\d{8}$|^0[17]\d{8}$/.test(cleaned)){setRetryMessage('Enter a valid Kenyan M-PESA number (07…, 01… or 254…).');return;}setRetryingOrder(true);setRetryMessage('');try{const r=await fetch('/api/payments?action=customer-payment-retry',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug,orderId:activeOrder.orderId,paymentPhone:cleaned})});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Could not retry payment');setOrders(current=>current.map(order=>order.orderId===activeOrder.orderId?{...order,paymentStatus:'pending'}:order));setRetryMessage('M-PESA prompt sent. Enter your PIN to complete payment.')}catch(e:any){setRetryMessage(e.message||'Could not retry payment')}finally{setRetryingOrder(false)}}
  const recentlyViewedProducts = recentlyViewedIds
    .map((id) => products.find((product) => product.id === id))
    .filter((product): product is StoreProduct => Boolean(product));

  function updateQuantity(id: string, quantity: number) {
    const next = { ...cart };
    if (quantity <= 0) delete next[id];
    else next[id] = Math.min(99, quantity);
    onCartChange(next);
  }

  async function applyVoucher() {
    if(!voucherCode.trim()){setAppliedCoupon(null);setVoucherMessage('Enter a coupon code first.');return;}
    try{const r=await fetch('/api/buyer?action=coupon-validate',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({slug,code:voucherCode.trim(),subtotal})});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Coupon could not be applied.');setAppliedCoupon({code:d.code,discount:Number(d.discount)||0,description:d.description});setVoucherMessage(d.description+' applied. You save '+formatKes(d.discount)+'.');}catch(e:any){setAppliedCoupon(null);setVoucherMessage(e.message||'Coupon could not be applied.');}
  }

  async function placeOrder() {
    if (!lines.length || submitting) return;
    if (paymentMethod !== 'mpesa') {
      setCheckoutError('This payment method is coming soon. Choose M-PESA to continue.');
      return;
    }
    if (!/^\+?254[17]\d{8}$|^0[17]\d{8}$/.test(paymentPhone.trim().replace(/[\s().-]/g,''))) {
      setCheckoutError('Enter a valid Kenyan M-PESA phone number to receive the payment prompt.');
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
      const response = await fetch('/api/buyer?action=order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          couponCode: appliedCoupon?.code || '',
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          paymentPhone: paymentPhone.trim(),
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
        orderId: data.orderId,
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
        subtotal: Number(data.subtotal??subtotal),
        deliveryFee: 0,
        total: Number(data.total??total),
        lines: lines.map((line) => ({ ...line })),
        chatToken: data.chatToken,
        paymentStatus: data.paymentStatus || 'pending',
        discount: Number(data.discount||0),
        couponCode: data.couponCode||null,
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
    if (order.chatToken || order.orderId) onOpenChat?.(order.chatToken, order.orderNumber, order.orderId);
    onNavigate(next);
  }

  function renderSummary() {
    return (
      <aside className="customer-summary-card">
        <h2>{view === 'cart' ? 'Cart summary' : 'Order summary'}</h2>
        {view === 'cart' ? <div className="customer-summary-row customer-summary-total"><span>Subtotal</span><strong>{formatKes(subtotal)}</strong></div> : <>
          <div className="customer-summary-row"><span>Items total</span><strong>{formatKes(subtotal)}</strong></div>
          <div className="customer-summary-row"><span>Delivery fees</span><strong>{formatKes(deliveryFee)}</strong></div>
          {appliedCoupon&&<div className="customer-summary-row"><span>Coupon ({appliedCoupon.code})</span><strong>−{formatKes(appliedCoupon.discount)}</strong></div>}
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
    const choices: { id: 'mpesa'|'airtel'|'card'; label: string; configured: boolean; hint: string }[] = [
      { id: 'mpesa', label: 'MPESA', configured: true, hint: 'Safaricom M-PESA' },
      { id: 'airtel', label: 'AIRTEL', configured: false, hint: 'Airtel Money is not configured for this shop' },
      { id: 'card', label: 'CARD', configured: false, hint: 'Card payments are not configured for this shop' },
    ];
    const confirmMpesa=()=>{if(!/^\+?254[17]\d{8}$|^0[17]\d{8}$/.test(paymentPhone.trim().replace(/[\s().-]/g,''))){setCheckoutError('Enter a valid Kenyan M-PESA phone number to receive the payment prompt.');return;}setCheckoutError('');setPaymentModal(null);};
    const choosePayment=(choice:typeof choices[number])=>{
      if(!choice.configured){setCheckoutError(choice.hint+'.');return;}
      setCheckoutError('');
      setPaymentMethod(choice.id);
      setPaymentModal(choice.id);
    };
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
              <div className="customer-payment-method-tabs" role="group" aria-label="Choose payment method">
                {choices.map(choice=><button type="button" key={choice.id} className={'customer-payment-method-tab '+choice.id+(paymentMethod===choice.id?' is-selected':'')+(!choice.configured?' is-unavailable':'')} onClick={()=>choosePayment(choice)} aria-pressed={paymentMethod===choice.id} aria-disabled={!choice.configured} title={choice.configured?choice.hint:choice.hint}>
                  <strong>{choice.label}</strong><small>{choice.configured?'Select':'Not configured'}</small>
                </button>)}
              </div>
              <p className="customer-payment-config-note">Only payment methods configured by this shop can be selected. Choose a method to open its secure payment window.</p>
            </div>
          </div>
          {renderSummary()}
        </div>
        {checkoutError&&<p className="customer-checkout-error" role="alert">{checkoutError}</p>}
        <div className="customer-flow-actions">
          <button type="button" className="customer-secondary-button" onClick={() => onNavigate('cart')}>Modify cart</button>
          <button type="button" className="customer-primary-button" disabled={!lines.length || paymentMethod !== 'mpesa'} onClick={() => onNavigate('checkout/review')}>Continue <ArrowRight size={17} /></button>
        </div>
        {paymentModal==='mpesa'&&<div className="customer-payment-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setPaymentModal(null)}}><section className="customer-payment-modal" role="dialog" aria-modal="true" aria-labelledby="customer-payment-modal-title"><button type="button" className="customer-payment-modal-close" aria-label="Close payment window" onClick={()=>setPaymentModal(null)}>×</button><span className="customer-payment-modal-mark">M</span><h2 id="customer-payment-modal-title">Pay with M-PESA</h2><p>Enter the Kenyan mobile number that should receive the STK payment prompt. It can be different from your buyer account number.</p><label className="customer-form-label">Phone number to pay with<input type="tel" inputMode="tel" autoComplete="tel" placeholder="07XX XXX XXX or 2547XXXXXXXX" value={paymentPhone} onChange={e=>setPaymentPhone(e.target.value)} required maxLength={16}/></label><small className="customer-payment-modal-note">Your order remains pending until Safaricom confirms payment.</small><div className="customer-payment-modal-actions"><button type="button" className="customer-secondary-button" onClick={()=>setPaymentModal(null)}>Cancel</button><button type="button" className="customer-primary-button" onClick={confirmMpesa}>Use M-PESA <ArrowRight size={16}/></button></div></section></div>}
      </section>
    );
  }

  function renderReview() {
    return (
      <section className="customer-flow">
        <FlowHeading title="Place your order" onBack={() => onNavigate('checkout/payment')} backLabel="Payment method" />
        <p className="customer-terms-copy">By continuing, you agree to the store’s <button type="button" onClick={()=>onNavigate('shop-terms')}>Terms &amp; Conditions</button>.</p>
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
          <div><strong>Delivery coordination</strong><p>Contact the seller through your private order conversation to agree on collection or delivery.</p><small>{activeOrder.deliveryMethod === 'pickup' ? 'Your preferred pickup station is saved with this order.' : 'Your delivery address is saved with this order.'} The seller can coordinate collection or delivery in your private order conversation.</small></div>
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
        {ordersLoading&&<p className="customer-preview-note">Refreshing your order history…</p>}{ordersError&&<p className="customer-preview-alert" role="alert">{ordersError}</p>}
         <div className="customer-order-tabs"><button type="button" className={orderTab === 'ongoing' ? 'is-active' : ''} onClick={() => setOrderTab('ongoing')}>ONGOING ({orders.filter(o=>!isCancelled(o)&&!isDelivered(o)).length})</button><button type="button" className={orderTab === 'delivered' ? 'is-active' : ''} onClick={() => setOrderTab('delivered')}>DELIVERED ({orders.filter(isDelivered).length})</button><button type="button" className={orderTab === 'cancelled' ? 'is-active' : ''} onClick={() => setOrderTab('cancelled')}>CANCELLED / RETURNED ({orders.filter(isCancelled).length})</button></div>
        {tabOrders.length ? <div className="customer-order-list">{tabOrders.map((order) => (
          <article className="customer-order-card" key={order.orderNumber}>
            <div className="customer-order-card-heading"><div><small>ORDER {order.orderNumber}</small><strong>{new Date(order.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></div><span className="customer-order-status">{stateOf(order).delivery==='delivered'?'Delivered':stateOf(order).delivery==='in_transit'?'In transit':stateOf(order).order==='processing'?'Processing':stateOf(order).payment==='failed'?'Payment failed':stateOf(order).payment==='succeeded'?'Paid':'Order placed'}</span></div>
            {order.lines.slice(0, 2).map(({ product, quantity }) => <div className="customer-order-product" key={product.id}><ProductThumb product={product} /><span><strong>{product.name}</strong><small>Qty {quantity}</small></span><b>{formatKes(product.price * quantity)}</b></div>)}
            <div className="customer-order-card-footer"><span>Total <strong>{formatKes(order.total)}</strong></span><div><button type="button" className="customer-secondary-button" onClick={() => openOrder(order, 'order-detail')}>Order details</button>{isDelivered(order)?<button type="button" className="customer-primary-button" onClick={() => onNavigate('store')}>Shop again <ArrowRight size={16}/></button>:<button type="button" className="customer-primary-button" onClick={() => openOrder(order, 'order-tracking')}>Track my item</button>}</div></div>
          </article>
        ))}</div> : <div className="customer-empty-state"><span><Package size={28} /></span><h2>{orderTab === 'ongoing' ? 'You have placed no orders yet!' : `No ${orderTab === 'delivered' ? 'delivered' : 'cancelled / returned'} orders`}</h2><p>{orderTab === 'ongoing' ? 'All your orders will be saved here so you can access their status anytime.' : 'Orders in this section will appear here when their status is updated by the shop.'}</p><button type="button" className="customer-primary-button" onClick={() => onNavigate('store')}>Continue shopping <ArrowRight size={17} /></button></div>}
        {suggestions.length>0&&<section className="customer-recommendations customer-orders-recommendations"><div className="customer-section-title"><h2>Top selling items</h2><button type="button" onClick={() => onNavigate('store')}>See all <ArrowRight size={14}/></button></div><div className="customer-recommendation-row">{suggestions.map(product=><button type="button" className="customer-recommendation-card" key={product.id} onClick={()=>onNavigate('store')}><ProductThumb product={product}/><strong>{product.name}</strong><b>{formatKes(product.price)}</b></button>)}</div></section>}
      </section>
    );
  }

  function renderOrderDetail() {
    const celebration=paymentCelebration?<div className="buyer-payment-celebration" role="status" aria-live="polite"><div className="buyer-confetti-burst">{Array.from({length:36},(_,i)=><i key={i} style={{'--confetti-angle':(i*10)+'deg','--confetti-delay':((i%7)*0.035)+'s'} as any}>{['✦','✧','●','◆','🎉'][i%5]}</i>)}</div><div className="buyer-celebration-message"><strong>Payment successful!</strong><span>Your order is confirmed. Thank you for shopping.</span></div></div>:null;
    if (!activeOrder) return <div className="customer-flow"><FlowHeading title="Order details" onBack={() => onNavigate('orders')} backLabel="My orders" /><div className="customer-empty-state"><h2>No order selected</h2><button type="button" className="customer-primary-button" onClick={() => onNavigate('orders')}>View my orders</button></div></div>;
    return (
      <section className="customer-flow">
        {celebration}
        <FlowHeading title="Order details" onBack={() => onNavigate('orders')} backLabel="My orders" />
        <div className="customer-order-detail-heading"><div><small>ORDER NUMBER</small><h2>{activeOrder.orderNumber}</h2><span>Placed {new Date(activeOrder.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div><span className="customer-order-status">Order placed</span></div>
        <div className="customer-checkout-grid">
          <div className="customer-review-stack">
            <div className="customer-panel">
              <div className="customer-panel-heading"><h2>Items in this order</h2><span>{activeOrder.lines.length} items</span></div>
              {activeOrder.lines.map(({ product, quantity }) => <div className="customer-review-product" key={product.id}><ProductThumb product={product} /><div><strong>{product.name}</strong><small>Qty {quantity}</small><small>{formatKes(product.price)} each</small>{String(activeOrder.deliveryStatus||'').toLowerCase()==='delivered'&&activeOrder.paymentStatus==='succeeded'&&<button type="button" className="customer-order-review-link" onClick={()=>onOpenProduct?.(product)}>★ Review product</button>}</div><b>{formatKes(product.price * quantity)}</b></div>)}
              {String(activeOrder.deliveryStatus||'').toLowerCase()==='delivered'?<div className="customer-delivered-review-prompt" role="status"><strong>How did we serve you?</strong><span>Your order has been delivered. Share a review of the products you purchased.</span></div>:null}
              <div className="customer-flow-actions">{String(activeOrder.deliveryStatus||'').toLowerCase()==='delivered'?<button type="button" className="customer-primary-button" onClick={()=>onNavigate('store')}>Shop again <ArrowRight size={17}/></button>:<button type="button" className="customer-primary-button" onClick={() => openOrder(activeOrder, 'order-tracking')}>Track my item <ArrowRight size={17} /></button>}</div>
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
            {['failed','cancelled'].includes(String(activeOrder.paymentStatus).toLowerCase())&&<div className="customer-summary-retry"><label className="customer-form-label">M-PESA number to pay with<input type="tel" inputMode="tel" autoComplete="tel" value={retryPaymentPhone} onChange={e=>setRetryPaymentPhone(e.target.value)} placeholder="07XX XXX XXX or 2547XXXXXXXX" maxLength={16}/></label><button type="button" className="buyer-retry-payment" onClick={retryActiveOrderPayment} disabled={retryingOrder}>{retryingOrder?'Sending M-PESA prompt…':'↻ Retry payment'}</button>{retryMessage&&<small role="status">{retryMessage}</small>}</div>}
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
            <article className={activeOrder.paymentStatus==='succeeded'?'is-complete':activeOrder.paymentStatus==='failed'||activeOrder.paymentStatus==='cancelled'?'is-current':'is-current'}><span>{activeOrder.paymentStatus==='succeeded'?<Check size={15}/>: '2'}</span><div><strong>{activeOrder.paymentStatus==='succeeded'?'Payment confirmed':activeOrder.paymentStatus==='failed'?'Payment failed':activeOrder.paymentStatus==='cancelled'?'Payment cancelled':'Payment awaiting confirmation'}</strong><small>{activeOrder.receipt||activeOrder.paymentStatus||'Pending'}</small><p>{activeOrder.paymentStatus==='succeeded'?'Safaricom confirmed this payment.':activeOrder.paymentStatus==='failed'?'The payment was not completed. Contact the seller if you need help.':'The order remains pending until the payment provider confirms the result.'}</p></div></article>
            <article className={['processing','fulfilled'].includes(String(activeOrder.orderStatus||''))||['in_transit','delivered'].includes(String(activeOrder.deliveryStatus||''))?'is-complete':''}><span>{['processing','fulfilled'].includes(String(activeOrder.orderStatus||''))||['in_transit','delivered'].includes(String(activeOrder.deliveryStatus||''))?<Check size={15}/>: '3'}</span><div><strong>{activeOrder.deliveryStatus==='in_transit'?'In transit':activeOrder.deliveryStatus==='delivered'?'Fulfilment complete':activeOrder.orderStatus==='processing'?'Processing':activeOrder.orderStatus==='fulfilled'?'Fulfilled':'Preparing your order'}</strong><small>{activeOrder.deliveryUpdatedAt?new Date(activeOrder.deliveryUpdatedAt).toLocaleString('en-KE'):'Waiting for seller update'}</small><p>{activeOrder.deliveryStatus==='in_transit'?'The seller has marked your order as on its way.':activeOrder.deliveryStatus==='delivered'?'The seller has marked this order as delivered.':'The seller will update this step as your order is prepared.'}</p></div></article>
            <article className={activeOrder.deliveryStatus==='delivered'?'is-complete':''}><span>{activeOrder.deliveryStatus==='delivered'?<Check size={15}/>: '4'}</span><div><strong>Delivered</strong><small>{activeOrder.deliveryStatus==='delivered'&&activeOrder.deliveryUpdatedAt?new Date(activeOrder.deliveryUpdatedAt).toLocaleString('en-KE'):'Not yet delivered'}</small></div></article>
          </div>
          <p className="customer-preview-note"><ShieldCheck size={15} /> Payment and delivery status are retrieved from the order conversation service. Delivery updates appear when the seller records them.</p>
        </div>
        {chatPanel}
      </section>
    );
  }

  async function changePassword(e:any){e.preventDefault();if(passwordSaving)return;setPasswordMessage('');if(newPassword!==confirmPassword){setPasswordMessage('The new passwords do not match.');return;}setPasswordSaving(true);try{const r=await fetch('/api/buyer-auth?action=change-password&slug='+encodeURIComponent(slug),{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug,currentPassword,newPassword})});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Password could not be changed.');setCurrentPassword('');setNewPassword('');setConfirmPassword('');setPasswordMessage('Your password has been changed successfully.');}catch(e:any){setPasswordMessage(e.message||'Password could not be changed.')}finally{setPasswordSaving(false)}}
  async function saveProfile(e:any){e.preventDefault();if(profileSaving)return;setProfileSaving(true);setProfileMessage('');try{const r=await fetch('/api/buyer-auth?action=update-profile&slug='+encodeURIComponent(slug),{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug,name:profileName,email:profileEmail,alternativePhone:profilePhoneAlt,address:profileAddress})});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Profile could not be saved.');onProfileUpdated?.(d.customer);setProfileMessage('Your profile has been updated.');}catch(e:any){setProfileMessage(e.message||'Profile could not be saved.')}finally{setProfileSaving(false)}}
  function renderProfile(){return <section className="customer-flow"><FlowHeading title="My profile" onBack={()=>onNavigate('account')} backLabel="My account"/><form className="customer-panel customer-account-detail" onSubmit={saveProfile}><div className="customer-contact-fields"><label className="customer-form-label">Full name<input required minLength={2} maxLength={120} value={profileName} onChange={e=>setProfileName(e.target.value)}/></label><label className="customer-form-label">Email address<input type="email" required maxLength={254} value={profileEmail} onChange={e=>setProfileEmail(e.target.value)}/></label><label className="customer-form-label">Primary phone<input value={initialCustomerPhone} disabled readOnly/></label><label className="customer-form-label">Alternative phone<input type="tel" value={profilePhoneAlt} onChange={e=>setProfilePhoneAlt(e.target.value)} placeholder="Optional Kenyan mobile number"/></label><label className="customer-form-label">Default delivery address<textarea rows={3} required maxLength={300} value={profileAddress} onChange={e=>setProfileAddress(e.target.value)} placeholder="Your default delivery address"/></label></div>{profileMessage&&<p role="status" className="customer-preview-note">{profileMessage}</p>}<div className="customer-flow-actions"><button className="customer-primary-button" type="submit" disabled={profileSaving}>{profileSaving?'Saving…':'Save profile'}</button></div></form></section>}
  function renderAccount() {
    return (
      <section className="customer-flow customer-account-page">
        <div className="customer-account-welcome"><span><UserRound size={27} /></span><div><small>MY ACCOUNT</small><h1>{customerName.trim() ? `Welcome back, ${customerName.trim()}` : 'Welcome back'}</h1><p>Manage your orders, saved items and account settings.</p><small>{initialCustomerPhone}{initialCustomerEmail?' · '+initialCustomerEmail:''}</small></div><button type="button" className="customer-secondary-button" onClick={onSignOut}>Sign out</button></div>
        <div className="customer-account-groups">
          {accountGroups.map((group) => <section className="customer-panel" key={group.title}>
            <h2 className="customer-account-group-title">{group.title}</h2>
            {group.links.map((link) => <button type="button" className="customer-account-link" key={link.view} onClick={() => onNavigate(link.view)}><link.icon size={18} /><span>{link.label}</span><ChevronRight size={16} /></button>)}
          </section>)}
        </div>
      </section>
    );
  }

  async function submitShopReport(e:any){e.preventDefault();if(reportBusy)return;setReportBusy(true);setReportMessage('');try{const attachmentIds:string[]=[];for(const file of reportFiles){const sign=await fetch('/api/buyer?action=complaint-attachment',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({slug,mode:'upload',fileName:file.name,contentType:file.type,size:file.size})});const sd=await sign.json().catch(()=>({}));if(!sign.ok)throw Error(sd.error||'Could not prepare '+file.name);const put=await fetch(sd.uploadUrl,{method:'PUT',headers:{'Content-Type':file.type},body:file});if(!put.ok)throw Error('Upload failed for '+file.name);const done=await fetch('/api/buyer?action=complaint-attachment',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({slug,mode:'complete',attachmentId:sd.attachmentId})});const dd=await done.json().catch(()=>({}));if(!done.ok)throw Error(dd.error||'Security scan failed for '+file.name);attachmentIds.push(sd.attachmentId);}const r=await fetch('/api/buyer?action=complaint',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({slug,shopName:reportShop,orderId:reportOrderId||null,issueType:reportIssue,productId:reportProductId||null,paymentMade:reportPaymentMade,paymentAmount:reportPaymentAmount,paymentReference:reportPaymentReference,details:reportDetails,attachmentIds})});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Report could not be submitted.');setReportMessage('Report submitted to DASNET. Reference: '+d.report.id);setReportDetails('');setReportFiles([]);setReportPaymentAmount('');setReportPaymentReference('');}catch(e:any){setReportMessage(e.message||'Report could not be submitted.');}finally{setReportBusy(false);}}
  function renderAccountSection() {
    if(view==='vouchers')return <section className="customer-flow"><FlowHeading title="Shop vouchers & offers" onBack={()=>onNavigate('account')} backLabel="My account"/><div className="customer-panel customer-account-detail"><p>Current discounts published by {shopName}. Enter a code at checkout to apply an eligible offer.</p>{shopCoupons.length?shopCoupons.map(c=><article className="customer-order-card" key={c.code}><div className="customer-order-card-heading"><div><small>COUPON CODE</small><strong>{c.code}</strong></div><span className="customer-order-status">{c.discount_type==='percentage'?c.discount_value+'% OFF':'KES '+Number(c.discount_value).toLocaleString('en-KE')+' OFF'}</span></div><p>Minimum spend: {formatKes(Number(c.minimum_order_minor||0)/100)}{c.expires_at?' · Expires '+new Date(c.expires_at).toLocaleDateString('en-KE'):''}</p><button type="button" className="customer-primary-button" onClick={()=>{setVoucherCode(c.code);setVoucherMessage('Code selected. Apply it at checkout.');onNavigate('cart')}}>Use this coupon</button></article>):<div className="customer-empty-state"><span><TicketPercent size={26}/></span><h2>No active offers</h2><p>{shopName} has not published any active coupons yet.</p></div>}</div></section>;
    if(view==='assistant')return <section className="customer-flow"><FlowHeading title="Shopping assistance" onBack={()=>onNavigate('account')} backLabel="My account"/><div className="customer-panel customer-account-detail"><h2>Contact {shopName}</h2><p>Questions about products, orders, delivery or payment? Contact the seller directly using the details below.</p>{(shopWhatsappNumber||shopContactEmail)?<div className="customer-contact-fields">{shopWhatsappNumber&&<a className="customer-account-link" href={'https://wa.me/'+shopWhatsappNumber.replace(/\D/g,'')} target="_blank" rel="noopener noreferrer"><Phone size={18}/><span>WhatsApp / Call seller · {shopWhatsappNumber}</span><ChevronRight size={16}/></a>}{shopContactEmail&&<a className="customer-account-link" href={'mailto:'+shopContactEmail}><Mail size={18}/><span>Email seller · {shopContactEmail}</span><ChevronRight size={16}/></a>}</div>:<p className="customer-preview-note">The seller has not added public contact details yet. You can still use the order conversation or report an issue to DASNET.</p>}<button type="button" className="customer-primary-button" onClick={()=>onNavigate('my-reports')}>Open Reports & Complaints</button></div></section>;
    if(view==='my-reports')return <section className="customer-flow"><FlowHeading title="Reports & Complaints" onBack={()=>onNavigate('account')} backLabel="My account"/><DisputesPanel slug={slug} viewerRole="buyer" initialReportId={initialReportId} orders={orders.filter(o=>Boolean(o.orderId)).map(o=>({id:o.orderId as string,label:o.orderNumber}))}/></section>;
    if(view==='report-shop')return <section className="customer-flow"><FlowHeading title="Report a shop or order" onBack={()=>onNavigate('account')} backLabel="My account"/><form className="customer-panel customer-account-detail" onSubmit={submitShopReport}><p>Your report goes directly to DASNET for review. Provide accurate details and attach relevant evidence. Do not upload passwords, PINs or one-time codes.</p><label className="customer-form-label">Shop name<select required value={reportShop} onChange={e=>setReportShop(e.target.value)}><option value={shopName}>{shopName}</option></select></label><label className="customer-form-label">Order affected<select value={reportOrderId} onChange={e=>{setReportOrderId(e.target.value);setReportProductId('')}}><option value="">No specific order / shop-wide report</option>{orders.map(o=><option key={o.orderId||o.orderNumber} value={o.orderId||''}>{o.orderNumber} · {formatKes(o.total)}</option>)}</select></label><label className="customer-form-label">Product affected (optional)<select value={reportProductId} onChange={e=>setReportProductId(e.target.value)}><option value="">No specific product</option>{orders.filter(o=>!reportOrderId||o.orderId===reportOrderId).flatMap(o=>o.lines.map(line=>({product:line.product,order:o}))).filter((x,i,a)=>a.findIndex(y=>y.product.id===x.product.id)===i).map(x=><option key={x.product.id} value={x.product.id}>{x.product.name}</option>)}</select></label><label className="customer-form-label">Type of issue<select required value={reportIssue} onChange={e=>setReportIssue(e.target.value)}><option value="payment">Payment / M-PESA</option><option value="delivery">Delivery not received / delayed</option><option value="product_quality">Product quality / not as described</option><option value="wrong_item">Wrong or missing item</option><option value="seller_communication">Seller communication</option><option value="refund_return">Refund / return dispute</option><option value="shop_listing">Misleading shop or listing</option><option value="other">Other</option></select></label><label className="customer-newsletter-toggle"><input type="checkbox" checked={reportPaymentMade} onChange={e=>setReportPaymentMade(e.target.checked)}/><span>I made a payment related to this issue</span></label>{reportPaymentMade&&<div className="customer-contact-fields"><label className="customer-form-label">Amount paid (KES)<input type="number" min="1" step="0.01" required value={reportPaymentAmount} onChange={e=>setReportPaymentAmount(e.target.value)}/></label><label className="customer-form-label">M-PESA receipt / payment reference<input maxLength={100} value={reportPaymentReference} onChange={e=>setReportPaymentReference(e.target.value)} placeholder="e.g. QAB12XYZ"/></label></div>}<label className="customer-form-label">Describe what happened<textarea required minLength={10} maxLength={5000} rows={6} value={reportDetails} onChange={e=>setReportDetails(e.target.value)} placeholder="Include dates, what was agreed, what happened and what resolution you are seeking."/></label><label className="customer-form-label">Attachments (optional)<input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.webp" onChange={e=>{const fs=Array.from(e.target.files||[]);if(fs.length>8||fs.some(f=>f.size>10485760)){setReportMessage('Attach up to 8 files, each 10 MB or smaller.');return;}setReportFiles(fs);setReportMessage('');}}/><small>PDF, Office documents, TXT, JPG, PNG or WEBP. Files are not malware-scanned at this time. Only upload trusted documents or images; do not upload executable files, passwords, PINs or one-time codes.</small></label>{reportFiles.length>0&&<p className="customer-preview-note">{reportFiles.map(f=>f.name).join(' · ')}</p>}{reportMessage&&<p className="customer-preview-note" role="status">{reportMessage}</p>}<div className="customer-flow-actions"><button className="customer-primary-button" disabled={reportBusy}>{reportBusy?'Submitting securely…':'Submit report to DASNET'}</button></div></form></section>;
    const policyViews:any={'shop-terms':{title:'Terms & Conditions',body:shopTermsAndConditions},'shop-privacy':{title:'Privacy Policy',body:shopPrivacyPolicy},'shop-returns':{title:'Returns, refunds & exchanges',body:shopReturnPolicy},'shop-delivery':{title:'Delivery & collection policy',body:shopDeliveryPolicy}};
    if(policyViews[view])return <section className="customer-flow"><FlowHeading title={policyViews[view].title} onBack={()=>onNavigate('account')} backLabel="My account"/><article className="customer-panel customer-account-detail"><div className="customer-policy-publisher"><strong>{shopName}</strong><small>Published by this shop</small></div>{policyViews[view].body?<div style={{whiteSpace:'pre-wrap',lineHeight:1.75}}>{policyViews[view].body}</div>:<p className="customer-preview-note">This shop has not published this policy yet. Contact the seller if you need clarification before placing an order.</p>}</article></section>;
    if(view==='wishlist'){
      const savedProducts=products.filter(product=>wishlistIds.includes(product.id));
      return <section className="customer-flow"><FlowHeading title="Saved items" onBack={()=>onNavigate('account')} backLabel="My account"/><div className="customer-panel customer-account-detail"><div className="customer-panel-heading"><h2>Your wishlist</h2><span>{savedProducts.length} saved</span></div><p className="customer-preview-note">Saved items are stored on this device for this shop.</p>{savedProducts.length?<div className="customer-recommendation-row">{savedProducts.map(product=><article className="customer-recommendation-card" key={product.id}><ProductThumb product={product}/><strong>{product.name}</strong><b>{formatKes(product.price)}</b><div className="customer-wishlist-actions"><button type="button" className="customer-secondary-button" onClick={()=>onOpenProduct?.(product)}>View item</button><button type="button" className="customer-text-button" onClick={()=>onToggleWishlist?.(product.id)}>Remove</button></div></article>)}</div>:<div className="customer-empty-state"><span><ShoppingBag size={28}/></span><h2>No saved items yet</h2><p>Open a product and choose “Save to wishlist” to keep it here.</p><button type="button" className="customer-primary-button" onClick={()=>onNavigate('store')}>Browse products</button></div>}</div></section>;
    }
    if (view === 'inbox') return (
      <section className="customer-flow">
        <FlowHeading title="Inbox & messages" onBack={() => onNavigate('account')} backLabel="My account" />
        <div className="customer-panel customer-inbox-list">
          <div className="customer-panel-heading"><h2>Order conversations</h2><span>{orders.filter((order) => Boolean(order.chatToken||order.orderId)).length} chats</span></div>
          {orders.filter((order) => Boolean(order.chatToken||order.orderId)).length ? orders.filter((order) => Boolean(order.chatToken||order.orderId)).map((order) => (
            <article className="customer-order-card" key={order.orderNumber}>
              <div className="customer-order-card-heading"><div><small>ORDER {order.orderNumber}</small><strong>{new Date(order.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></div><span className="customer-order-status">Seller chat</span></div>
              <div className="customer-order-card-footer"><span>{order.lines[0]?.product.name || 'Order'}{order.lines.length > 1 ? ` + ${order.lines.length - 1} more` : ''}</span><div><button type="button" className="customer-primary-button" onClick={() => onOpenChat?.(order.chatToken, order.orderNumber, order.orderId)}>Open conversation</button></div></div>
            </article>
          )) : <div className="customer-empty-state"><span><ShoppingBag size={28}/></span><h2>No messages yet</h2><p>Conversations with sellers appear here after you place an order.</p><button type="button" className="customer-primary-button" onClick={() => onNavigate('orders')}>View my orders</button></div>}
        </div>
        {chatPanel}
      </section>
    );
    if(view==='account-management')return <section className="customer-flow"><FlowHeading title="Account & security" onBack={()=>onNavigate('account')} backLabel="My account"/><form className="customer-panel customer-account-detail" onSubmit={changePassword}><h2>Change password</h2><p>Use your current password to set a new password for this shop account.</p><div className="customer-contact-fields"><label className="customer-form-label">Current password<input type="password" autoComplete="current-password" required value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/></label><label className="customer-form-label">New password<input type="password" autoComplete="new-password" minLength={10} required value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="At least 10 characters"/></label><label className="customer-form-label">Confirm new password<input type="password" autoComplete="new-password" minLength={10} required value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/></label></div>{passwordMessage&&<p role="status" className="customer-preview-note">{passwordMessage}</p>}<div className="customer-flow-actions"><button className="customer-primary-button" type="submit" disabled={passwordSaving}>{passwordSaving?'Updating…':'Update password'}</button></div></form></section>;
    if(view==='address-book')return <section className="customer-flow"><FlowHeading title="Address book" onBack={()=>onNavigate('account')} backLabel="My account"/><div className="customer-panel customer-account-detail"><h2>Default delivery address</h2><p>{initialCustomerAddress||'No default address saved yet.'}</p><button type="button" className="customer-primary-button" onClick={()=>onNavigate('profile')}>Edit profile & address</button></div></section>;
    if(view==='notifications')return <section className="customer-flow"><FlowHeading title="Order notifications" onBack={()=>onNavigate('account')} backLabel="My account"/><div className="customer-panel customer-account-detail"><div className="customer-panel-heading"><h2>Recent order updates</h2><span>{notifications.length} updates</span></div>{notifications.length?notifications.map((item:any)=><article className="customer-order-card" key={item.id||item.orderId||item.complaintId||item.orderNumber}><div className="customer-order-card-heading"><strong>{item.title}</strong><small>{item.created_at?new Date(item.created_at).toLocaleString('en-KE'):item.updatedAt?new Date(item.updatedAt).toLocaleString('en-KE'):'Update'}</small></div><p>{item.detail}</p><button type="button" className="customer-secondary-button" onClick={()=>onNavigate(item.complaint_id?'my-reports':'orders')}>{item.complaint_id?'Track my report':'View my orders'}</button></article>):<div className="customer-empty-state"><span><Package size={28}/></span><h2>No recent updates</h2><p>Payment, fulfilment and delivery changes will appear here when the seller updates your order.</p><button type="button" className="customer-primary-button" onClick={()=>onNavigate('orders')}>View my orders</button></div>}</div></section>;
    if(view==='notification-settings')return <section className="customer-flow"><FlowHeading title="Notification settings" onBack={()=>onNavigate('account')} backLabel="My account"/><div className="customer-panel customer-account-detail"><h2>In-app order updates</h2><p>Choose whether this device displays order payment and delivery updates in the storefront notification menu.</p><label className="customer-newsletter-toggle"><input type="checkbox" checked={inAppNotificationsEnabled} onChange={e=>setInAppNotificationsEnabled(e.target.checked)}/><span>{inAppNotificationsEnabled?'Order notifications enabled':'Order notifications paused'}</span></label><p className="customer-preview-note">This preference is saved on this device. Your order and payment records are not affected.</p></div></section>;
    if(view==='reviews'){const reviewProducts=products.filter(product=>orders.some(order=>order.paymentStatus==='succeeded'&&order.lines.some(line=>line.product.id===product.id)));return <section className="customer-flow"><FlowHeading title="Product reviews" onBack={()=>onNavigate('account')} backLabel="My account"/><div className="customer-panel customer-account-detail"><h2>Products you have purchased</h2>{reviewProducts.length?<div className="customer-recommendation-row">{reviewProducts.map(product=><article className="customer-recommendation-card" key={product.id}><ProductThumb product={product}/><strong>{product.name}</strong><b>{formatKes(product.price)}</b><button type="button" className="customer-secondary-button" onClick={()=>onOpenProduct?.(product)}>Write a review</button></article>)}</div>:<div className="customer-empty-state"><span><ShieldCheck size={28}/></span><h2>No reviewable purchases yet</h2><p>After a successful payment, you can review the products you bought.</p><button type="button" className="customer-primary-button" onClick={()=>onNavigate('orders')}>View my orders</button></div>}</div></section>}
    if(view==='followed-shops')return <section className="customer-flow"><FlowHeading title="Followed shops" onBack={()=>onNavigate('account')} backLabel="My account"/><div className="customer-panel customer-account-detail"><h2>{shopName}</h2><p>This buyer account belongs to this shop. Cross-shop following is not enabled in this single-shop storefront.</p><button type="button" className="customer-primary-button" onClick={()=>onNavigate('store')}>Browse this shop</button></div></section>;
    if(view==='newsletter')return <section className="customer-flow"><FlowHeading title="Shop updates" onBack={()=>onNavigate('account')} backLabel="My account"/><div className="customer-panel customer-account-detail"><h2>Newsletter sign-up unavailable</h2><p>This shop has not enabled a newsletter subscription service. No subscription has been created.</p></div></section>;
    if(view==='close-account')return <section className="customer-flow"><FlowHeading title="Close account" onBack={()=>onNavigate('account')} backLabel="My account"/><div className="customer-panel customer-account-detail"><h2>Request account closure</h2><p>For account closure, contact DASNET support. Order and payment records may be retained where required for transaction and dispute records.</p><a className="customer-primary-button" href="https://wa.me/254758884861?text=Please%20help%20me%20close%20my%20buyer%20account." target="_blank" rel="noopener noreferrer">Contact support</a></div></section>;
    if(view==='assistant')return <section className="customer-flow"><FlowHeading title="Shopping help" onBack={()=>onNavigate('account')} backLabel="My account"/><div className="customer-panel customer-account-detail"><h2>Need help with an order?</h2><p>Open your order conversation to contact the seller, or contact DASNET support for account and platform assistance.</p><button type="button" className="customer-primary-button" onClick={()=>onNavigate('inbox')}>Open order messages</button><a className="customer-secondary-button" href="https://wa.me/254758884861?text=Hello%20DASNET%20Support%2C%20I%20need%20help%20with%20a%20storefront%20order." target="_blank" rel="noopener noreferrer">Contact DASNET support</a></div></section>;
    if(view==='vouchers')return <section className="customer-flow"><FlowHeading title="Vouchers" onBack={()=>onNavigate('account')} backLabel="My account"/><div className="customer-empty-state"><span><WalletCards size={28}/></span><h2>No active vouchers</h2><p>There are no voucher codes available from this shop at the moment. A discount is never applied unless the shop confirms a valid offer.</p><button type="button" className="customer-secondary-button" onClick={()=>onNavigate('store')}>Continue shopping</button></div></section>;
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

  if (view === 'faqs') return (
    <section className="customer-flow storefront-all-faqs">
      <FlowHeading title="Frequently asked questions" onBack={() => onNavigate('store')} backLabel="Back to shop" />
      <p className="storefront-all-faqs-intro">Helpful answers about buying, sellers, payments, delivery and staying safe on DASNET.</p>
      <div className="storefront-all-faqs-list">{(shopFaqs.length?shopFaqs:marketplaceFaqs.map(([question,answer])=>({question,answer}))).map((faq:any)=><details key={faq.question}><summary>{faq.question}<span>＋</span></summary><p>{faq.answer}</p></details>)}</div>
    </section>
  );

  if (view === 'store') return null;
  const pageContent = view === 'cart' ? renderCart() : view === 'checkout/payment' ? (lines.length ? renderCheckoutPayment() : renderCart()) : view === 'checkout/review' ? (lines.length ? renderReview() : renderCart()) : view === 'checkout/complete' ? renderSuccess() : view === 'orders' ? renderOrders() : view === 'order-detail' ? renderOrderDetail() : view === 'order-tracking' ? renderTracking() : view === 'account' ? renderAccount() : view === 'profile' ? renderProfile() : renderAccountSection() || (<section className="customer-flow"><FlowHeading title="Shopping assistant" onBack={() => onNavigate('store')} /><div className="customer-panel customer-account-detail"><Search size={24} /><p>{accountSectionCopy.assistant.description}</p><button type="button" className="customer-secondary-button" onClick={() => onNavigate('store')}>Back to the store</button></div></section>);
  // The storefront-level marketplace header is the single buyer navigation surface for every route.
  // Do not mount a second sticky nav here: nested sticky bars overlapped the account/cart content
  // and intercepted taps on mobile.
  return <div className="customer-workspace-shell">{pageContent}</div>;
}
