import './storefront-redesign.css';
import { defaultTerms, defaultPrivacy, defaultReturns, defaultDelivery } from './shopPolicyDefaults';
import { marketplaceFaqs } from './marketplaceFaqs';
import { DisputesPanel } from './DisputesPanel';
import { fallbackProductImage } from './StorefrontProductDetail';
import { CardNetworkLogos, CardProviderIcon, CashProviderIcon, MpesaProviderIcon } from './PaymentProviderIcons';
import PaystackPop, { type PaystackPopupTransaction, type PaystackTransactionStatus } from '@paystack/inline-js';
import { useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Flag,
  Heart,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Star,
  TicketPercent,
  Trash2,
  UserRound,
  WalletCards,
} from 'lucide-react';

const accountGroups = [
  {
    title: 'SHOPPING & ORDERS',
    links: [
      { label: 'My Orders', icon: ShoppingBag, view: 'orders' },
      { label: 'Inbox & Messages', icon: MessageCircle, view: 'inbox' },
      { label: 'Saved Items', icon: Heart, view: 'wishlist' },
      { label: 'Product Reviews', icon: Star, view: 'reviews' },
      { label: 'Vouchers & Offers', icon: TicketPercent, view: 'vouchers' },
    ],
  },
  {
    title: 'ACCOUNT & SUPPORT',
    links: [
      { label: 'Personal Profile', icon: UserRound, view: 'profile' },
      { label: 'Delivery Addresses', icon: MapPin, view: 'address-book' },
      { label: 'Notifications', icon: Bell, view: 'notifications' },
      { label: 'Account & Security', icon: ShieldCheck, view: 'account-management' },
      { label: 'Reports & Complaints', icon: Flag, view: 'my-reports' },
      { label: 'Help & Support', icon: Phone, view: 'assistant' },
    ],
  },
];

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

type CartLine = { product: StoreProduct; quantity: number; lineTotal?: number };
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
  paymentIssue?: string | null;
  paymentFailureReason?: string | null;
  receipt?: string | null;
  orderStatus?: string | null;
  discount?: number;
  couponCode?: string | null;
  deliveryStatus?: string | null;
  deliveryUpdatedAt?: string | null;
};

function safeHttpsUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function shouldUsePaystackRedirectCheckout(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  const isMobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
  const isCoarsePointer = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  return isMobileUa || (isCoarsePointer && window.innerWidth <= 900);
}

function describePaystackPopupFailure(popupStatus: PaystackTransactionStatus | null | undefined): string | null {
  if (!popupStatus) return null;
  const errMessages = Array.isArray(popupStatus.errors)
    ? popupStatus.errors
        .map((entry) => (typeof entry === 'string' ? entry : entry?.message || ''))
        .map((msg) => msg.trim())
        .filter(Boolean)
    : [];
  if (errMessages.length > 0) {
    return Array.from(new Set(errMessages)).join(' · ');
  }
  const response = popupStatus.response;
  if (typeof response === 'string' && response.trim()) {
    return response.trim();
  }
  if (response && typeof response === 'object') {
    const detail = String(response.gateway_response || response.message || '').trim();
    if (detail && !/^(pending|success|successful)$/i.test(detail)) {
      return detail;
    }
  }
  if (popupStatus.status === 'auth') {
    return 'Card verification (3-D Secure) did not complete. Re-open the card form or use the Paystack checkout page below to approve the 3-D Secure prompt.';
  }
  return null;
}

function launchPaystackCardModal(options: {
  accessCode: string;
  onLoad?: () => void;
  onSuccess: () => void;
  onCancel: (status?: PaystackTransactionStatus | null) => void;
  onError: (message?: string, status?: PaystackTransactionStatus | null) => void;
}): boolean {
  let popupTx: PaystackPopupTransaction | null = null;
  const readStatus = (): PaystackTransactionStatus | null => {
    try {
      return popupTx?.getStatus?.() || null;
    } catch {
      return null;
    }
  };
  try {
    const popup = new PaystackPop();
    popupTx = popup.resumeTransaction(options.accessCode, {
      onLoad: () => options.onLoad?.(),
      onSuccess: () => options.onSuccess(),
      onCancel: () => options.onCancel(readStatus()),
      onError: (err) => options.onError(err?.message, readStatus()),
    });
    return true;
  } catch (err) {
    options.onError(err instanceof Error ? err.message : undefined, readStatus());
    return false;
  }
}

type StorefrontFlowProps = {
  slug: string;
  shopName: string;
  shopWhatsappNumber?: string;
  shopContactEmail?: string;
  shopTermsAndConditions?: string;
  shopPrivacyPolicy?: string;
  shopReturnPolicy?: string;
  shopDeliveryPolicy?: string;
  shopDeliveryHomeFee?: number;
  shopDeliveryPickupFee?: number;
  shopCashOnDeliveryEnabled?: boolean;
  shopCashOnPickupEnabled?: boolean;
  shopFaqs?: Array<{ question: string; answer: string }>;
  products: StoreProduct[];
  productsLoading?: boolean;
  storeError?: string;
  onRetryConnection?: () => void;
  recentlyViewed?: string[];
  cart: Record<string, number>;
  cartLoading?: boolean;
  onCartChange: Dispatch<SetStateAction<Record<string, number>>>;
  view: string;
  initialReportId?: string;
  initialOrderNumber?: string;
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

type CheckoutDraftState = {
  paymentMethod?: PaymentMethod;
  paymentPhone?: string;
  deliveryMethod?: DeliveryMethod;
  deliveryCounty?: string;
  deliverySubCounty?: string;
  deliveryEstate?: string;
  deliveryAddress?: string;
  deliveryDirections?: string;
  pickupStation?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  voucherCode?: string;
};

function getCheckoutScopeKey(slug: string) {
  const trimmed = String(slug || '').trim();
  if (trimmed) return trimmed;
  try {
    return 'host:' + window.location.hostname.toLowerCase();
  } catch {
    return 'default';
  }
}

function readCheckoutDraft(scopeKey: string): CheckoutDraftState {
  const keys = [`dasnet-checkout-draft-${scopeKey}`];
  if (scopeKey.startsWith('host:')) keys.push('dasnet-checkout-draft-default');
  for (const key of keys) {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as CheckoutDraftState;
    } catch {}
  }
  return {};
}

function writeCheckoutDraft(scopeKey: string, draft: CheckoutDraftState) {
  const key = `dasnet-checkout-draft-${scopeKey}`;
  const serialized = JSON.stringify(draft);
  try {
    sessionStorage.setItem(key, serialized);
  } catch {}
}

function clearCheckoutDraft(scopeKey: string) {
  for (const key of [`dasnet-checkout-draft-${scopeKey}`, `dasnet-checkout-idem-${scopeKey}`]) {
    try {
      sessionStorage.removeItem(key);
    } catch {}
    try {
      localStorage.removeItem(key);
    } catch {}
  }
}

const kenyanCounties = [
  'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu', 'Garissa', 'Homa Bay', 'Isiolo',
  'Kajiado', 'Kakamega', 'Kericho', 'Kiambu', 'Kilifi', 'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui', 'Kwale',
  'Laikipia', 'Lamu', 'Machakos', 'Makueni', 'Mandera', 'Marsabit', 'Meru', 'Migori', 'Mombasa',
  'Murang’a', 'Nairobi', 'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua', 'Nyeri', 'Samburu', 'Siaya',
  'Taita-Taveta', 'Tana River', 'Tharaka-Nithi', 'Trans Nzoia', 'Turkana', 'Uasin Gishu', 'Vihiga',
  'Wajir', 'West Pokot',
];

const kenyanSubCounties: Record<string, string[]> = {
  'Uasin Gishu': ['Ainabkoi', 'Kapseret', 'Kesses', 'Moiben', 'Soy', 'Turbo'],
  Kericho: ['Ainamoi', 'Belgut', 'Buret', 'Kipkelion East', 'Kipkelion West', 'Sigowet/Soin'],
  Nandi: ['Aldai', 'Chesumei', 'Emgwen', 'Mosop', 'Nandi Hills', 'Tinderet'],
  Siaya: ['Alego Usonga', 'Bondo', 'Gem', 'Rarieda', 'Ugenya', 'Ugunja'],
  Migori: ['Awendo', 'Kuria East', 'Kuria West', 'Nyatike', 'Rongo', 'Suna East', 'Suna West', 'Uriri'],
  Nakuru: ['Bahati', 'Gilgil', 'Kuresoi North', 'Kuresoi South', 'Molo', 'Naivasha', 'Nakuru Town East', 'Nakuru Town West', 'Njoro', 'Rongai', 'Subukia'],
  Garissa: ['Balambala', 'Dadaab', 'Dujis', 'Fafi', 'Ijara', 'Lagdera'],
  Mandera: ['Banissa', 'Lafey', 'Mandera East', 'Mandera North', 'Mandera South', 'Mandera West'],
  Baringo: ['Baringo Central', 'Baringo North', 'Baringo South', 'Eldama Ravine', 'Mogotio', 'Tiaty'],
  Kisii: ['Bobasi', 'Bomachoge Borabu', 'Bomachoge Chache', 'Bonchari', 'Kitutu Chache North', 'Kitutu Chache South', 'Nyaribari Chache', 'Nyaribari Masaba', 'South Mugirango'],
  Bomet: ['Bomet Central', 'Bomet East', 'Chepalungu', 'Konoin', 'Sotik'],
  Nyamira: ['Borabu', 'Kitutu Masaba', 'North Mugirango', 'West Mugirango'],
  Busia: ['Budalangi', 'Butula', 'Funyula', 'Matayos', 'Nambale', 'Teso North', 'Teso South'],
  Bungoma: ['Bumula', 'Kabuchai', 'Kanduyi', 'Kimilili', 'Mt. Elgon', 'Sirisia', 'Tongaren', 'Webuye East', 'Webuye West'],
  'Tana River': ['Bura', 'Galole', 'Garsen'],
  Kakamega: ['Butere', 'Ikolomani', 'Khwisero', 'Likuyani', 'Lugari', 'Lurambi', 'Malava', 'Matungu', 'Mumias East', 'Mumias West', 'Navakholo', 'Shinyalu'],
  Meru: ['Buuri', 'Cental Imenti', 'Igembe Central', 'Igembe North', 'Igembe South', 'North Imenti', 'South Imenti', 'Tigania East', 'Tigania West'],
  Mombasa: ['Changamwe', 'Jomvu', 'Kisauni', 'Likoni', 'Mvita', 'Nyali'],
  'Trans Nzoia': ['Cherangany', 'Endebess', 'Kiminini', 'Kwanza', 'Saboti'],
  Nairobi: ['Dagoretti', 'Embakasi Central', 'Embakasi East', 'Embakasi North', 'Embakasi South', 'Embakasi West', 'Kamukunji', 'Kasarani', 'Kibra', 'Kilimani', 'Langata', 'Makadara', 'Mathare', 'Roysambu', 'Ruaraka', 'Starehe', 'Westlands'],
  Wajir: ['Eldas', 'Tarbaj', 'Wajir East', 'Wajir North', 'Wajir South', 'Wajir West'],
  Vihiga: ['Emuhaya', 'Hamisi', 'Luanda', 'Sabatia', 'Vihiga'],
  Narok: ['Emurua Dikirr', 'Kilgoris', 'Narok East', 'Narok North', 'Narok South', 'Narok West'],
  Embu: ['Gachoka', 'Manyatta', 'Runyenjes', 'Siakago'],
  Kilifi: ['Ganze', 'Kaloleni', 'Kilifi North', 'Kilifi South', 'Magarini', 'Malindi', 'Rabai'],
  "Murang'a": ['Gatanga', 'Kandara', 'Kangema', 'Kigumo', 'Kiharu', 'Maragwa', 'Mathioya'],
  Kiambu: ['Gatundu North', 'Gatundu South', 'Githunguri', 'Juja', 'Kabete', 'Kiambaa', 'Kiambu', 'Kikuyu', 'Lari', 'Limuru', 'Ruiru', 'Thika Town'],
  Kirinyaga: ['Gichugu', 'Kirinyaga Central', 'Mwea', 'Ndia'],
  'Homa Bay': ['Homa Bay', 'Kabondo Kasipul', 'Karachuonyo', 'Kasipul', 'Ndhiwa', 'Rangwe', 'Suba North', 'Suba South'],
  Isiolo: ['Isiolo North', 'Isiolo South'],
  'West Pokot': ['Kacheliba', 'Kapenguria', 'Pokot South', 'Sigor'],
  Makueni: ['Kaiti', 'Kibwezi East', 'Kibwezi West', 'Kilome', 'Makueni', 'Mbooni'],
  Kajiado: ['Kajiado Central', 'Kajiado East', 'Kajiado North', 'Kajiado South', 'Kajiado West'],
  Machakos: ['Kangundo', 'Kathiani', 'Machakos Town', 'Masinga', 'Matungulu', 'Mavoko', 'Mwala', 'Yatta'],
  'Elgeyo-Marakwet': ['Keiyo North', 'Keiyo South', 'Marakwet East', 'Marakwet West'],
  Nyeri: ['Kieni', 'Mathira', 'Mukurweni', 'Nyeri Town', 'Othaya', 'Tetu'],
  Kwale: ['Kinango', 'Lunga Lunga', 'Matuga', 'Msambweni'],
  Nyandarua: ['Kinangop', 'Kipipiri', 'Ndaragwa', 'Ol Jorok', 'Ol Kalou'],
  Kisumu: ['Kisumu Central', 'Kisumu East', 'Kisumu West', 'Muhoroni', 'Nyakach', 'Nyando', 'Seme'],
  Kitui: ['Kitui Central', 'Kitui East', 'Kitui Rural', 'Kitui South', 'Kitui West', 'Mwingi East', 'Mwingi North', 'Mwingi West'],
  Laikipia: ['Laikipia East', 'Laikipia North', 'Laikipia West'],
  Marsabit: ['Laisamis', 'Moyale', 'North Horr', 'Saku'],
  Lamu: ['Lamu East', 'Lamu West'],
  Turkana: ['Loima', 'Turkana Central', 'Turkana East', 'Turkana North', 'Turkana South', 'Turkana West'],
  'Tharaka-Nithi': ['Maara', 'Nithi', 'Tharaka'],
  'Taita Taveta': ['Mwatate', 'Taveta', 'Voi', 'Wundanyi'],
  Samburu: ['Samburu East', 'Samburu North', 'Samburu West'],
};
kenyanSubCounties['Murang’a'] = kenyanSubCounties["Murang'a"] || [];
kenyanSubCounties['Taita-Taveta'] = kenyanSubCounties['Taita Taveta'] || [];

const paymentLabels: Record<PaymentMethod, string> = {
  card: 'Bank card',
  airtel: 'Airtel Money',
  mpesa: 'M-PESA',
  delivery: 'Cash on delivery / pickup',
};

const accountSectionCopy: Record<string, { title: string; description: string }> = {
  inbox: { title: 'Inbox', description: 'Your store messages will appear here when messaging is connected.' },
  reviews: { title: 'Pending reviews', description: 'Items that are ready for a review will appear here after your first order.' },
  vouchers: { title: 'Vouchers', description: 'Available discount vouchers will appear here when promotions are connected.' },
  wishlist: { title: 'Wishlist', description: 'Save products you want to come back to.' },
  'followed-shops': { title: 'Followed shops', description: 'The shops you follow will be listed here.' },
  'recently-viewed': { title: 'Recently viewed', description: 'Products you opened in this store will be listed here.' },
  'account-management': { title: 'Account management', description: 'Manage your buyer sign-in security.' },
  'address-book': { title: 'Address book', description: 'Save delivery addresses here.' },
  newsletter: { title: 'Newsletter', description: 'Choose whether to receive store updates and offers.' },
  'close-account': { title: 'Close account', description: 'Request buyer account closure.' },
  assistant: { title: 'Shopping assistant', description: 'Contact the shop or DASNET support.' },
  profile: { title: 'My profile', description: 'Your profile details.' },
  notifications: { title: 'Notifications', description: 'Order and account notifications.' },
  'notification-settings': { title: 'Notification settings', description: 'Notification preferences.' },
  'public-profile': { title: 'My profile', description: 'Your buyer profile details.' },
};

function formatKes(amount: number) {
  return `KES ${Math.max(0, Math.round(amount)).toLocaleString('en-KE')}`;
}

function ProductThumb({ product }: { product: StoreProduct }) {
  const image = product.images?.[0] || product.imageUrl;
  return image ? (
    <img
      className="sf-thumb"
      src={image}
      alt={product.name}
      loading="lazy"
      decoding="async"
      onError={(event) => {
        event.currentTarget.onerror = null;
        event.currentTarget.src = fallbackProductImage(product.name);
      }}
    />
  ) : (
    <div className="sf-thumb-placeholder" aria-hidden="true">
      <ShoppingBag size={20} />
    </div>
  );
}

function CheckoutTopBar({
  title,
  stepLabel,
  onBack,
}: {
  title: string;
  stepLabel?: string;
  onBack: () => void;
}) {
  return (
    <header className="sf-checkout-topbar">
      <div className="sf-checkout-topbar-inner">
        <div className="sf-checkout-topbar-left">
          <button type="button" className="sf-checkout-topbar-back" onClick={onBack} aria-label="Go back">
            <ArrowLeft size={18} strokeWidth={2.2} />
          </button>
          <h1>{title}</h1>
        </div>
        {stepLabel && <span className="sf-checkout-topbar-step">{stepLabel}</span>}
      </div>
    </header>
  );
}

function CheckoutSteps({
  currentStep,
  onSelectStep,
}: {
  currentStep: 1 | 2 | 3;
  onSelectStep?: (step: 1 | 2 | 3) => void;
}) {
  const steps: Array<{ step: 1 | 2 | 3; title: string; subtitle: string }> = [
    { step: 1, title: 'Delivery', subtitle: 'Address & contact' },
    { step: 2, title: 'Payment', subtitle: 'Choose method' },
    { step: 3, title: 'Review', subtitle: 'Confirm order' },
  ];

  return (
    <nav className="sf-checkout-progress" aria-label="Checkout steps">
      {steps.map(({ step, title, subtitle }) => {
        const isComplete = step < currentStep;
        const isCurrent = step === currentStep;
        const statusClass = isCurrent ? 'current' : isComplete ? 'complete' : '';
        const clickable = isComplete && Boolean(onSelectStep);
        const content = (
          <>
            <span aria-hidden="true">{isComplete ? <Check size={14} strokeWidth={2.5} /> : step}</span>
            <div>
              <strong>{title}</strong>
              <small>{subtitle}</small>
            </div>
          </>
        );

        if (clickable) {
          return (
            <button
              key={step}
              type="button"
              className={`sf-progress-step ${statusClass} is-clickable`}
              onClick={() => onSelectStep?.(step)}
            >
              {content}
            </button>
          );
        }

        return (
          <div
            key={step}
            className={`sf-progress-step ${statusClass}`}
            aria-current={isCurrent ? 'step' : undefined}
          >
            {content}
          </div>
        );
      })}
    </nav>
  );
}

function FlowHeading({
  title,
  subtitle,
  onBack,
  backLabel = 'Back to store',
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  backLabel?: string;
}) {
  return (
    <div className="sf-flow-head">
      <button type="button" className="sf-back-btn" onClick={onBack}>
        <ArrowLeft size={16} /> {backLabel}
      </button>
      <h1>{title}</h1>
      {subtitle && <p className="sf-flow-sub">{subtitle}</p>}
    </div>
  );
}

function SearchableLocationSelect({
  label,
  value,
  options,
  placeholder,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setQuery(value);
  }, [value]);
  const matches = options
    .filter((option) => option.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    .slice(0, 80);

  return (
    <label className="sf-field">
      {label}
      <span className="sf-combobox">
        <input
          type="text"
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setOpen(false);
            if (event.key === 'Enter' && open && matches.length) {
              event.preventDefault();
              onChange(matches[0]);
              setQuery(matches[0]);
              setOpen(false);
            }
          }}
        />
        <button
          type="button"
          className="sf-combobox-toggle"
          aria-label={open ? 'Close options' : `Show ${label.toLowerCase()} options`}
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
        >
          <ChevronDown size={16} />
        </button>
        {open && !disabled && (
          <div className="sf-combobox-menu" role="listbox">
            {matches.length ? (
              matches.map((option) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={option === value}
                  key={option}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(option);
                    setQuery(option);
                    setOpen(false);
                  }}
                >
                  {option}
                </button>
              ))
            ) : (
              <div className="sf-combobox-empty">No matches found</div>
            )}
          </div>
        )}
      </span>
    </label>
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
  shopDeliveryHomeFee = 0,
  shopDeliveryPickupFee = 0,
  shopCashOnDeliveryEnabled = false,
  shopCashOnPickupEnabled = false,
  shopFaqs = [],
  products,
  productsLoading = false,
  storeError = '',
  onRetryConnection,
  recentlyViewed: recentlyViewedIds = [],
  cart,
  cartLoading = false,
  onCartChange,
  view,
  initialReportId,
  initialOrderNumber = '',
  onNavigate,
  customerName: initialCustomerName = '',
  customerPhone: initialCustomerPhone = '',
  customerEmail: initialCustomerEmail = '',
  customerAddress: initialCustomerAddress = '',
  customerAlternativePhone: initialCustomerAlternativePhone = '',
  wishlistIds = [],
  onOpenProduct,
  notifications = [],
  onSignOut,
  onOrderCreated,
  chatPanel,
  onOpenChat,
  onProfileUpdated,
}: StorefrontFlowProps) {
  const initialDraftScope = getCheckoutScopeKey(slug);
  const draftScopeRef = useRef(initialDraftScope);
  const initialDraftRef = useRef<CheckoutDraftState | null>(null);
  if (initialDraftRef.current === null) {
    initialDraftRef.current = readCheckoutDraft(initialDraftScope);
  }
  const initialDraft = initialDraftRef.current;

  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false));
  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      onRetryConnection?.();
    };
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [onRetryConnection]);

  const rawCartCount = useMemo(
    () => Object.values(cart).reduce((sum, quantity) => sum + (Number(quantity) > 0 ? Number(quantity) : 0), 0),
    [cart],
  );

  const lines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, quantity]) => {
          const product = products.find((entry) => entry.id === id);
          return product && quantity > 0 ? { product, quantity } : null;
        })
        .filter((line): line is CartLine => Boolean(line)),
    [cart, products],
  );

  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0),
    [lines],
  );

  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [chatThreads, setChatThreads] = useState<any[]>([]);
  const checkoutIdempotency = useRef<{ fingerprint: string; key: string } | null>((() => {
    try {
      const raw = sessionStorage.getItem(`dasnet-checkout-idem-${initialDraftScope}`);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed.fingerprint === 'string' && typeof parsed.key === 'string' ? parsed : null;
    } catch {
      return null;
    }
  })());
  const [retryingOrder, setRetryingOrder] = useState(false);
  const [retryPaymentPhone, setRetryPaymentPhone] = useState('');
  const [retryMessage, setRetryMessage] = useState('');
  const [cardFallbackUrl, setCardFallbackUrl] = useState<string | null>(null);
  const [paymentCelebration, setPaymentCelebration] = useState(false);
  const lastPaymentStatus = useRef<string | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [inAppNotificationsEnabled, setInAppNotificationsEnabled] = useState(true);

  const [profileName, setProfileName] = useState(initialCustomerName);
  const [profileEmail, setProfileEmail] = useState(initialCustomerEmail);
  const [profilePhoneAlt, setProfilePhoneAlt] = useState('');
  const [profileAddress, setProfileAddress] = useState(initialCustomerAddress);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() =>
    initialDraft.paymentMethod === 'card' || initialDraft.paymentMethod === 'delivery' || initialDraft.paymentMethod === 'mpesa'
      ? initialDraft.paymentMethod
      : 'mpesa',
  );
  const [paymentModal, setPaymentModal] = useState<PaymentMethod | null>(null);
  const [paymentModalError, setPaymentModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [paymentPollMessage, setPaymentPollMessage] = useState('Waiting for payment confirmation…');
  const [paymentPollAuthError, setPaymentPollAuthError] = useState(false);
  const [paymentProviderResponded, setPaymentProviderResponded] = useState(false);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const [checkingPollNow, setCheckingPollNow] = useState(false);
  const [manualPollTick, setManualPollTick] = useState(0);
  const [checkoutError, setCheckoutError] = useState('');

  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>(() =>
    initialDraft.deliveryMethod === 'home' ? 'home' : 'pickup',
  );
  const cashOptionEnabled = deliveryMethod === 'pickup' ? shopCashOnPickupEnabled : shopCashOnDeliveryEnabled;
  useEffect(() => {
    if (paymentMethod === 'delivery' && !cashOptionEnabled) setPaymentMethod('mpesa');
  }, [paymentMethod, cashOptionEnabled]);

  const [deliveryCounty, setDeliveryCounty] = useState(() => initialDraft.deliveryCounty || '');
  const [deliverySubCounty, setDeliverySubCounty] = useState(() => initialDraft.deliverySubCounty || '');
  const [deliveryEstate, setDeliveryEstate] = useState(() => initialDraft.deliveryEstate || '');
  const [deliveryDirections, setDeliveryDirections] = useState(() => initialDraft.deliveryDirections || '');
  const [customerName, setCustomerName] = useState(() => initialDraft.customerName || initialCustomerName);
  const [customerPhone, setCustomerPhone] = useState(() => initialDraft.customerPhone || initialCustomerPhone);
  const [paymentPhone, setPaymentPhone] = useState(() => initialDraft.paymentPhone || initialCustomerPhone);
  const [customerEmail, setCustomerEmail] = useState(() => initialDraft.customerEmail || initialCustomerEmail);
  const [deliveryAddress, setDeliveryAddress] = useState(() => initialDraft.deliveryAddress || initialCustomerAddress);
  const [pickupStation, setPickupStation] = useState(() => initialDraft.pickupStation || '');
  const [deliveryPreferenceLoading, setDeliveryPreferenceLoading] = useState(false);
  const [pickupStationEditor, setPickupStationEditor] = useState(false);
  const [homeAddressEditor, setHomeAddressEditor] = useState(false);
  const [contactEditor, setContactEditor] = useState(false);
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);
  const [checkoutReturnToSummary, setCheckoutReturnToSummary] = useState(false);

  const [voucherCode, setVoucherCode] = useState(() => initialDraft.voucherCode || '');
  const [voucherMessage, setVoucherMessage] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [shopCoupons, setShopCoupons] = useState<any[]>([]);

  const [reportShop, setReportShop] = useState(shopName);
  const [reportOrderId, setReportOrderId] = useState('');
  const [reportProductId, setReportProductId] = useState('');
  const [reportIssue, setReportIssue] = useState('payment');
  const [reportPaymentMade, setReportPaymentMade] = useState(false);
  const [reportPaymentAmount, setReportPaymentAmount] = useState('');
  const [reportPaymentReference, setReportPaymentReference] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [reportFiles, setReportFiles] = useState<File[]>([]);
  const [reportBusy, setReportBusy] = useState(false);
  const [reportMessage, setReportMessage] = useState('');

  const [activeOrderNumber, setActiveOrderNumber] = useState('');
  const [paystackReturnBanner, setPaystackReturnBanner] = useState<{
    status: string;
    orderNumber: string;
    reason: string;
  } | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const payment = String(params.get('payment') || '').trim().toLowerCase();
      const order = String(params.get('order') || '').trim();
      const reason = String(params.get('reason') || '').trim().toLowerCase();
      if (
        (payment === 'succeeded' ||
          payment === 'processing' ||
          payment === 'pending' ||
          payment === 'failed' ||
          payment === 'cancelled') &&
        order
      ) {
        return { status: payment, orderNumber: order, reason };
      }
      return null;
    } catch {
      return null;
    }
  });
  const paystackCartClearedRef = useRef<string>('');
  const paystackVerifiedRef = useRef<string>('');
  const [showMpesaSwitchRetry, setShowMpesaSwitchRetry] = useState(false);
  const [newsletterEnabled, setNewsletterEnabled] = useState(false);
  const [isShopFollowed, setIsShopFollowed] = useState(false);
  const [buyerFeatureMessage, setBuyerFeatureMessage] = useState('');
  const [buyerFeatureBusy, setBuyerFeatureBusy] = useState(false);
  const [closureRequest, setClosureRequest] = useState<any>(null);
  const [buyerFollowedShops, setBuyerFollowedShops] = useState<any[]>([]);
  const [serverWishlist, setServerWishlist] = useState<string[]>([]);
  const [serverWishlistLoaded, setServerWishlistLoaded] = useState(false);

  const buyerFeatureRequest = async (action: string, payload: any = {}) => {
    const response = await fetch('/api/buyer?action=' + encodeURIComponent(action), {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, ...payload }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Error(data.error || 'Could not save your account preference.');
    return data;
  };

  const togglePersistentWishlist = async (productId: string) => {
    const enabled = !(serverWishlistLoaded ? serverWishlist.includes(productId) : wishlistIds.includes(productId));
    try {
      await buyerFeatureRequest('buyer-wishlist', { productId, enabled });
      setServerWishlist((current) =>
        enabled ? [...new Set([...current, productId])] : current.filter((id) => id !== productId),
      );
    } catch (error: any) {
      setBuyerFeatureMessage(error.message || 'Could not update your wishlist.');
    }
  };

  useEffect(() => {
    const nextScope = getCheckoutScopeKey(slug);
    const prevScope = draftScopeRef.current;
    if (nextScope === prevScope) return;
    const resolvedDraft = readCheckoutDraft(nextScope);
    draftScopeRef.current = nextScope;
    if (resolvedDraft.paymentMethod && paymentMethod === 'mpesa') setPaymentMethod(resolvedDraft.paymentMethod);
    if (resolvedDraft.paymentPhone && !paymentPhone) setPaymentPhone(resolvedDraft.paymentPhone);
    if (resolvedDraft.deliveryMethod && !deliveryCounty && !pickupStation && !deliveryAddress) {
      setDeliveryMethod(resolvedDraft.deliveryMethod);
    }
    if (resolvedDraft.deliveryCounty && !deliveryCounty) setDeliveryCounty(resolvedDraft.deliveryCounty);
    if (resolvedDraft.deliverySubCounty && !deliverySubCounty) setDeliverySubCounty(resolvedDraft.deliverySubCounty);
    if (resolvedDraft.deliveryEstate && !deliveryEstate) setDeliveryEstate(resolvedDraft.deliveryEstate);
    if (resolvedDraft.deliveryAddress && !deliveryAddress) setDeliveryAddress(resolvedDraft.deliveryAddress);
    if (resolvedDraft.deliveryDirections && !deliveryDirections) setDeliveryDirections(resolvedDraft.deliveryDirections);
    if (resolvedDraft.pickupStation && !pickupStation) setPickupStation(resolvedDraft.pickupStation);
    if (resolvedDraft.customerName && !customerName) setCustomerName(resolvedDraft.customerName);
    if (resolvedDraft.customerPhone && !customerPhone) setCustomerPhone(resolvedDraft.customerPhone);
    if (resolvedDraft.customerEmail && !customerEmail) setCustomerEmail(resolvedDraft.customerEmail);
    if (resolvedDraft.voucherCode && !voucherCode) setVoucherCode(resolvedDraft.voucherCode);
    try {
      const nextIdemRaw = sessionStorage.getItem(`dasnet-checkout-idem-${nextScope}`);
      const nextIdem = nextIdemRaw ? JSON.parse(nextIdemRaw) : null;
      if (nextIdem && typeof nextIdem.fingerprint === 'string' && typeof nextIdem.key === 'string') {
        if (!checkoutIdempotency.current) checkoutIdempotency.current = nextIdem;
      } else if (checkoutIdempotency.current) {
        sessionStorage.setItem(`dasnet-checkout-idem-${nextScope}`, JSON.stringify(checkoutIdempotency.current));
      }
      if (prevScope.startsWith('host:')) {
        sessionStorage.removeItem(`dasnet-checkout-draft-${prevScope}`);
        sessionStorage.removeItem(`dasnet-checkout-idem-${prevScope}`);
        localStorage.removeItem(`dasnet-checkout-draft-${prevScope}`);
      }
    } catch {}
  }, [slug]);

  useEffect(() => {
    const targetScope = getCheckoutScopeKey(slug);
    if (draftScopeRef.current !== targetScope) return;
    writeCheckoutDraft(targetScope, {
      paymentMethod,
      paymentPhone,
      deliveryMethod,
      deliveryCounty,
      deliverySubCounty,
      deliveryEstate,
      deliveryAddress,
      deliveryDirections,
      pickupStation,
      customerName,
      customerPhone,
      customerEmail,
      voucherCode,
    });
  }, [
    slug,
    paymentMethod,
    paymentPhone,
    deliveryMethod,
    deliveryCounty,
    deliverySubCounty,
    deliveryEstate,
    deliveryAddress,
    deliveryDirections,
    pickupStation,
    customerName,
    customerPhone,
    customerEmail,
    voucherCode,
  ]);

  useEffect(() => {
    let live = true;
    if (!slug || !initialCustomerPhone) {
      setDeliveryPreferenceLoading(false);
      return () => {
        live = false;
      };
    }
    setDeliveryPreferenceLoading(true);
    fetch('/api/buyer?action=buyer-delivery-preference&slug=' + encodeURIComponent(slug), {
      credentials: 'same-origin',
      cache: 'no-store',
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw Error(data.error || 'Could not load your saved delivery details.');
        return data;
      })
      .then((data) => {
        if (!live || !data.preference) return;
        const p = data.preference;
        setDeliveryMethod((current) => (deliveryCounty || deliveryAddress || pickupStation ? current : p.deliveryMethod === 'home' ? 'home' : 'pickup'));
        setDeliveryCounty((current) => current || p.deliveryCounty || '');
        setDeliverySubCounty((current) => current || p.deliverySubCounty || '');
        setDeliveryEstate((current) => current || p.deliveryEstate || '');
        setDeliveryAddress((current) => current || p.deliveryAddress || initialCustomerAddress);
        setDeliveryDirections((current) => current || p.deliveryDirections || '');
        setPickupStation((current) => current || p.pickupStation || '');
      })
      .catch((error) => {
        // Saved delivery preferences are optional. A stale or unavailable buyer
        // session must not surface a seller-workspace authentication message
        // on the buyer's checkout review screen or block placing the order.
        const message = String(error?.message || '');
        const isAuthenticationError = /sign in|unauthori[sz]ed|forbidden/i.test(message);
        if (live && !isAuthenticationError) {
          setCheckoutError(message || 'Could not load your saved delivery details.');
        }
      })
      .finally(() => {
        if (live) setDeliveryPreferenceLoading(false);
      });
    return () => {
      live = false;
    };
  }, [slug, initialCustomerPhone, initialCustomerAddress]);

  useEffect(() => {
    let live = true;
    if (!initialCustomerPhone || !slug) return;
    fetch('/api/buyer?action=buyer-account-data&slug=' + encodeURIComponent(slug), {
      credentials: 'same-origin',
      cache: 'no-store',
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw Error(data.error || 'Could not load saved account preferences.');
        return data;
      })
      .then((data) => {
        if (!live) return;
        const followed = Array.isArray(data.followedShops) ? data.followedShops : [];
        setBuyerFollowedShops(followed);
        setIsShopFollowed(followed.some((shop: any) => shop.slug === slug));
        setNewsletterEnabled(Boolean(data.newsletter));
        setClosureRequest(data.closureRequest || null);
        setServerWishlist(Array.isArray(data.wishlist) ? data.wishlist.map((item: any) => String(item.id)) : []);
        setServerWishlistLoaded(true);
      })
      .catch((error) => {
        if (live) setBuyerFeatureMessage(error.message || 'Could not load saved account preferences.');
      });
    return () => {
      live = false;
    };
  }, [slug, initialCustomerPhone]);

  const previousSubtotalRef = useRef<number | null>(null);
  useEffect(() => {
    const prev = previousSubtotalRef.current;
    previousSubtotalRef.current = subtotal;
    if (prev !== null && prev > 0 && subtotal !== prev) {
      setAppliedCoupon(null);
      if (voucherCode) setVoucherMessage('Your cart changed. Reapply the coupon.');
    }
  }, [subtotal, voucherCode]);

  useEffect(() => {
    let live = true;
    if (!slug) return;
    fetch('/api/buyer?action=coupons-public&slug=' + encodeURIComponent(slug), {
      credentials: 'same-origin',
      cache: 'no-store',
    })
      .then((r) => r.json())
      .then((d) => {
        if (live) setShopCoupons(Array.isArray(d.coupons) ? d.coupons : []);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [slug]);

  useEffect(() => {
    if (initialCustomerName) setCustomerName((current) => current || initialCustomerName);
    if (initialCustomerPhone) {
      setCustomerPhone((current) => current || initialCustomerPhone);
      setPaymentPhone((current) => current || initialCustomerPhone);
    }
    if (initialCustomerEmail) setCustomerEmail((current) => current || initialCustomerEmail);
    setProfileName(initialCustomerName);
    setProfileEmail(initialCustomerEmail);
    setProfileAddress(initialCustomerAddress);
    setProfilePhoneAlt(initialCustomerAlternativePhone);
    if (initialCustomerAddress) setDeliveryAddress((current) => current || initialCustomerAddress);
  }, [initialCustomerName, initialCustomerPhone, initialCustomerEmail, initialCustomerAddress, initialCustomerAlternativePhone]);

  useEffect(() => {
    let live = true;
    let requestInFlight = false;
    setOrders([]);
    setOrdersError('');

    if (!initialCustomerPhone) {
      setOrdersLoading(false);
      return () => {
        live = false;
      };
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
          if (response.status === 401)
            throw Error('Your buyer session needs refreshing. Sign in again to securely load your orders.');
          throw Error(data.error || 'Could not load your orders.');
        }
        const serverOrders: BuyerOrder[] = (Array.isArray(data.orders) ? data.orders : []).map((order: any) => ({
          orderId: order.id,
          orderNumber: order.orderNumber,
          createdAt: order.createdAt,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerEmail: order.customerEmail || '',
          paymentMethod:
            order.paymentMethod === 'delivery'
              ? 'delivery'
              : order.paymentMethod === 'card' || order.paymentMethod === 'paystack'
              ? 'card'
              : 'mpesa',
          deliveryMethod: order.deliveryMethod === 'pickup' ? 'pickup' : 'home',
          deliveryAddress: order.deliveryAddress || '',
          pickupStation: order.pickupStation || '',
          deliveryCounty: order.deliveryCounty || '',
          deliverySubCounty: order.deliverySubCounty || '',
          deliveryEstate: order.deliveryEstate || '',
          deliveryDirections: order.deliveryDirections || '',
          subtotal: Number(order.subtotal) || 0,
          deliveryFee: Number(order.deliveryFee) || 0,
          total: Number(order.total) || 0,
          lines: (order.items || []).map((item: any) => ({
            product: {
              id: String(item.id || 'item-' + item.name),
              name: item.name,
              price: Number(item.price) || 0,
              category: item.category || 'Product',
              images: item.image ? [item.image] : [],
            },
            quantity: Number(item.quantity) || 1,
            lineTotal: Number(item.lineTotal) || 0,
          })),
          chatToken: '',
          paymentStatus: order.paymentStatus || 'unpaid',
          paymentIssue: order.paymentIssue || null,
          paymentFailureReason: order.paymentFailureReason || null,
          receipt: order.receipt || null,
          orderStatus: order.orderStatus || null,
          deliveryStatus: order.deliveryStatus || null,
          deliveryUpdatedAt: order.deliveryUpdatedAt || null,
        }));

        if (live) {
          setOrders((current) => {
            const merged = [...current];
            for (const incoming of serverOrders) {
              const index = merged.findIndex(
                (existing) =>
                  (incoming.orderId && existing.orderId === incoming.orderId) ||
                  existing.orderNumber === incoming.orderNumber,
              );
              if (index >= 0) {
                merged[index] = {
                  ...merged[index],
                  ...incoming,
                  chatToken: merged[index].chatToken || incoming.chatToken,
                };
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
  }, [slug, initialCustomerPhone]);

  const deliveryFee = Math.max(0, Number(deliveryMethod === 'pickup' ? shopDeliveryPickupFee : shopDeliveryHomeFee) || 0);
  const total = Math.max(0, subtotal - Number(appliedCoupon?.discount || 0) + deliveryFee);
  const activeOrder =
    orders.find((order) => order.orderNumber === activeOrderNumber) || (!activeOrderNumber ? orders[0] : undefined);

  useEffect(() => {
    if (view === 'order-detail' && initialOrderNumber) setActiveOrderNumber(initialOrderNumber);
  }, [view, orders, initialOrderNumber]);

  useEffect(() => {
    let live = true;
    if (!initialCustomerPhone || view !== 'inbox') {
      setChatThreads([]);
      return () => {
        live = false;
      };
    }
    const refresh = async () => {
      try {
        const response = await fetch('/api/store?action=customer-chat-threads&slug=' + encodeURIComponent(slug), {
          credentials: 'same-origin',
          cache: 'no-store',
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw Error(data.error || 'Could not load messages.');
        if (live) setChatThreads(Array.isArray(data.threads) ? data.threads : []);
      } catch (error: any) {
        if (live) setBuyerFeatureMessage(error.message || 'Could not load messages.');
      }
    };
    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 10000);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [slug, initialCustomerPhone, view]);

  useEffect(() => {
    if (activeOrder?.orderId) {
      setRetryPaymentPhone(activeOrder.customerPhone || initialCustomerPhone);
      setShowMpesaSwitchRetry(false);
      setRetryMessage('');
    }
  }, [activeOrder?.orderId, initialCustomerPhone]);

  useEffect(() => {
    if (view !== 'checkout/processing' || !activeOrder?.orderId) return;
    let live = true;
    let requestInFlight = false;
    let attempts = 0;
    let finished = false;
    const isCardOrder = activeOrder.paymentMethod === 'card';
    const providerLabel = isCardOrder ? 'Paystack' : 'Safaricom';
    const checkPayment = async () => {
      if (!live || requestInFlight || finished) return;
      requestInFlight = true;
      setCheckingPollNow(true);
      attempts++;
      try {
        const response = await fetch(
          '/api/buyer?action=customer-payment-status&slug=' +
            encodeURIComponent(slug) +
            '&orderId=' +
            encodeURIComponent(String(activeOrder.orderId || '')),
          { credentials: 'same-origin', cache: 'no-store' },
        );
        const data = await response.json().catch(() => ({}));
        if (!live) return;
        if (response.status === 401) {
          finished = true;
          setPollTimedOut(false);
          setPaymentPollAuthError(true);
          setPaymentPollMessage(
            'Your buyer session could not be verified (401 Unauthorized). Sign in again to confirm your payment.',
          );
          return;
        }
        setPaymentPollAuthError(false);
        if (!response.ok) {
          setPaymentPollMessage(data.error || 'Could not check payment status right now. Retrying…');
          return;
        }
        const status = String(data.paymentStatus || 'pending').toLowerCase();
        if (status === 'succeeded' || status === 'failed' || status === 'cancelled' || status === 'reversed') {
          finished = true;
          setPollTimedOut(false);
          const failureText = data.failureReason || data.message || null;
          setOrders((current) =>
            current.map((order) =>
              order.orderId === activeOrder.orderId
                ? {
                    ...order,
                    paymentStatus: status,
                    receipt: data.receipt || null,
                    paymentFailureReason: status === 'succeeded' ? null : failureText,
                  }
                : order,
            ),
          );
          if (status === 'succeeded') {
            setPaymentPollMessage(`Payment confirmed by ${providerLabel}.`);
            onOrderCreated?.(activeOrder.chatToken || '', activeOrder.orderNumber);
            onNavigate('checkout/complete');
          } else {
            setPaymentPollMessage(
              failureText ||
                (status === 'cancelled'
                  ? `${providerLabel} confirmed that the payment was cancelled.`
                  : `${providerLabel} confirmed that the payment was not successful. You can retry when ready.`),
            );
          }
          return;
        }
        if (data.providerAuthError) {
          finished = true;
          setPollTimedOut(false);
          setPaymentPollMessage(
            data.message ||
              `${providerLabel} rejected verification credentials (401 Unauthorized). Contact the seller before retrying.`,
          );
          return;
        }
        if (data.providerResponded) {
          setPollTimedOut(false);
          setPaymentProviderResponded(true);
          setPaymentPollMessage(
            isCardOrder
              ? 'Paystack has processed the card charge. Verifying your payment receipt…'
              : 'Safaricom has processed the request. Verifying the M-PESA receipt…',
          );
        } else if (attempts >= 20) {
          finished = true;
          setPollTimedOut(true);
          setPaymentProviderResponded(false);
          setPaymentPollMessage(
            `We have not received a final result from ${providerLabel} yet. Check again shortly before submitting another payment.`,
          );
        } else {
          setPollTimedOut(false);
          setPaymentPollMessage(data.message || `Waiting for ${providerLabel} payment confirmation…`);
        }
      } catch {
        if (live) setPaymentPollMessage('Connection interrupted. Retrying the payment check automatically…');
      } finally {
        requestInFlight = false;
        if (live) setCheckingPollNow(false);
      }
    };
    setPollTimedOut(false);
    setPaymentPollAuthError(false);
    setPaymentProviderResponded(false);
    setPaymentPollMessage('Waiting for payment confirmation…');
    void checkPayment();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void checkPayment();
    }, 6000);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [view, slug, activeOrder?.orderId, activeOrder?.orderNumber, activeOrder?.paymentMethod, manualPollTick]);

  useEffect(() => {
    const status = String(activeOrder?.paymentStatus || '');
    if (lastPaymentStatus.current && lastPaymentStatus.current !== 'succeeded' && status === 'succeeded') {
      setPaymentCelebration(true);
      const timer = window.setTimeout(() => setPaymentCelebration(false), 5200);
      lastPaymentStatus.current = status;
      return () => window.clearTimeout(timer);
    }
    if (status) lastPaymentStatus.current = status;
  }, [activeOrder?.paymentStatus]);

  useEffect(() => {
    if (!paystackReturnBanner?.orderNumber) return;
    const matchedOrder = orders.find((entry) => entry.orderNumber === paystackReturnBanner.orderNumber);
    const isConfirmed =
      paystackReturnBanner.status === 'succeeded' ||
      String(matchedOrder?.paymentStatus || '').toLowerCase() === 'succeeded';
    if (isConfirmed) {
      checkoutIdempotency.current = null;
      clearCheckoutDraft(getCheckoutScopeKey(slug));
      setCheckoutReturnToSummary(false);
      if (
        !cartLoading &&
        Object.keys(cart).length > 0 &&
        paystackCartClearedRef.current !== paystackReturnBanner.orderNumber
      ) {
        paystackCartClearedRef.current = paystackReturnBanner.orderNumber;
        onCartChange({});
      }
      return;
    }
    if (
      (paystackReturnBanner.status === 'processing' || paystackReturnBanner.status === 'pending') &&
      matchedOrder?.orderId &&
      paystackVerifiedRef.current !== matchedOrder.orderId
    ) {
      paystackVerifiedRef.current = matchedOrder.orderId;
      void verifyCardAttemptAfterClose(matchedOrder.orderId).then((res) => {
        if (res.status === 'succeeded') {
          setPaystackReturnBanner((prev) => (prev ? { ...prev, status: 'succeeded' } : prev));
        } else if (res.status === 'failed' || res.status === 'cancelled') {
          setPaystackReturnBanner((prev) => (prev ? { ...prev, status: res.status || 'failed' } : prev));
        }
      });
    }
  }, [paystackReturnBanner, orders, slug, cartLoading, cart]);

  async function verifyCardAttemptAfterClose(orderId: string): Promise<{
    handled: boolean;
    status?: string;
    message?: string;
    authRequired?: boolean;
  }> {
    try {
      const response = await fetch(
        '/api/buyer?action=customer-payment-status&slug=' +
          encodeURIComponent(slug) +
          '&orderId=' +
          encodeURIComponent(orderId),
        { credentials: 'same-origin', cache: 'no-store' },
      );
      if (response.status === 401) {
        return {
          handled: true,
          authRequired: true,
          message: 'Your buyer session expired (401 Unauthorized). Sign in again to check or resume your card payment.',
        };
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return { handled: false };
      const status = String(data.paymentStatus || '').toLowerCase();
      if (status === 'succeeded') {
        setOrders((current) =>
          current.map((entry) =>
            entry.orderId === orderId
              ? { ...entry, paymentStatus: 'succeeded', receipt: data.receipt || entry.receipt, paymentFailureReason: null }
              : entry,
          ),
        );
        return { handled: true, status, message: data.message || 'Payment confirmed by Paystack.' };
      }
      if (status === 'failed' || status === 'cancelled' || status === 'reversed') {
        const reasonText =
          data.failureReason ||
          data.message ||
          (status === 'cancelled'
            ? 'Card payment or 3-D Secure verification was cancelled before completion.'
            : 'Card authorization failed. Please review your card details and try again.');
        setOrders((current) =>
          current.map((entry) =>
            entry.orderId === orderId ? { ...entry, paymentStatus: status, paymentFailureReason: reasonText } : entry,
          ),
        );
        return { handled: true, status, message: reasonText };
      }
      if (data.providerAuthError) {
        return {
          handled: true,
          status: 'error',
          message: data.message || 'Paystack rejected merchant API credentials (401 Unauthorized). Please contact the seller.',
        };
      }
      return { handled: false, status };
    } catch {
      return { handled: false };
    }
  }

  async function retryActiveOrderWithCard(options?: { forceRedirect?: boolean }) {
    if (!activeOrder?.orderId || retryingOrder) return;
    const targetOrderId = activeOrder.orderId;
    setRetryingOrder(true);
    setRetryMessage('');
    setCardFallbackUrl(null);
    let inlinePopupOpened = false;
    let redirectingToPaystack = false;
    try {
      const r = await fetch('/api/payments?action=customer-payment-retry', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, orderId: targetOrderId, paymentMethod: 'card' }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.status === 401) {
        throw Error('Your buyer session expired (401 Unauthorized). Please sign in again to retry card payment.');
      }
      if (!r.ok) throw Error(d.error || 'Could not start card payment.');
      const hostedUrl = safeHttpsUrl(d.authorizationUrl);
      if ((options?.forceRedirect || shouldUsePaystackRedirectCheckout()) && hostedUrl) {
        redirectingToPaystack = true;
        window.location.assign(hostedUrl);
        return;
      }
      if (d.accessCode) {
        let settled = false;
        const loadGuard = window.setTimeout(() => {
          if (!settled) setRetryingOrder(false);
        }, 8000);
        inlinePopupOpened = launchPaystackCardModal({
          accessCode: String(d.accessCode),
          onLoad: () => {
            settled = true;
            window.clearTimeout(loadGuard);
            setRetryingOrder(false);
          },
          onSuccess: () => {
            settled = true;
            window.clearTimeout(loadGuard);
            setRetryingOrder(false);
            setCardFallbackUrl(null);
            setOrders((current) =>
              current.map((order) =>
                order.orderId === targetOrderId
                  ? { ...order, paymentMethod: 'card', paymentStatus: 'pending', paymentFailureReason: null }
                  : order,
              ),
            );
            setPaymentPollMessage('Paystack received your card payment. Confirming your receipt…');
            onNavigate('checkout/processing');
          },
          onCancel: (popupStatus) => {
            settled = true;
            window.clearTimeout(loadGuard);
            setRetryingOrder(false);
            const fallback = safeHttpsUrl(popupStatus?.checkoutUrl) || hostedUrl;
            const inlineDetail = describePaystackPopupFailure(popupStatus);
            setRetryMessage(inlineDetail || 'Checking card payment status…');
            void (async () => {
              const verified = await verifyCardAttemptAfterClose(targetOrderId);
              if (verified.status === 'succeeded') {
                setCardFallbackUrl(null);
                setRetryMessage('');
                onNavigate('checkout/complete');
                return;
              }
              if (verified.status === 'failed' || verified.status === 'cancelled' || verified.status === 'reversed') {
                setCardFallbackUrl(null);
              } else {
                setCardFallbackUrl(fallback);
              }
              setRetryMessage(
                verified.message ||
                  inlineDetail ||
                  'Card verification closed before completing payment. Click below to retry or open Paystack directly.',
              );
            })();
          },
          onError: (errMsg, popupStatus) => {
            settled = true;
            window.clearTimeout(loadGuard);
            setRetryingOrder(false);
            const fallback = safeHttpsUrl(popupStatus?.checkoutUrl) || hostedUrl;
            const inlineDetail = describePaystackPopupFailure(popupStatus);
            setRetryMessage(inlineDetail || errMsg || 'Checking card payment status…');
            void (async () => {
              const verified = await verifyCardAttemptAfterClose(targetOrderId);
              if (verified.status === 'succeeded') {
                setCardFallbackUrl(null);
                setRetryMessage('');
                onNavigate('checkout/complete');
                return;
              }
              if (verified.status === 'failed' || verified.status === 'cancelled' || verified.status === 'reversed') {
                setCardFallbackUrl(null);
              } else {
                setCardFallbackUrl(fallback);
              }
              setRetryMessage(
                verified.message ||
                  inlineDetail ||
                  errMsg ||
                  'Could not complete Paystack card payment here. Use the Paystack checkout link below or try again.',
              );
            })();
          },
        });
        if (inlinePopupOpened) return;
        window.clearTimeout(loadGuard);
      }
      if (hostedUrl) {
        setCardFallbackUrl(hostedUrl);
        setRetryMessage('Could not open card fields inline in this browser. Open Paystack below to complete card payment.');
        return;
      }
      setRetryMessage(d.message || 'Check your order status shortly before retrying.');
    } catch (e: any) {
      setRetryMessage(e.message || 'Could not start card payment.');
    } finally {
      if (!inlinePopupOpened && !redirectingToPaystack) setRetryingOrder(false);
    }
  }

  async function retryActiveOrderPayment() {
    if (!activeOrder?.orderId || retryingOrder) return;
    const cleaned = retryPaymentPhone.trim().replace(/[\s().-]/g, '');
    if (!/^\+?254[17]\d{8}$|^0[17]\d{8}$/.test(cleaned)) {
      setRetryMessage('Enter a valid Kenyan M-PESA number (07…, 01… or 254…).');
      return;
    }
    setRetryingOrder(true);
    setRetryMessage('');
    try {
      const r = await fetch('/api/payments?action=customer-payment-retry', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, orderId: activeOrder.orderId, paymentMethod: 'mpesa', paymentPhone: cleaned }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.status === 401) {
        throw Error('Your buyer session expired (401 Unauthorized). Please sign in again to retry payment.');
      }
      if (!r.ok) throw Error(d.error || 'Could not retry payment');
      setOrders((current) =>
        current.map((order) =>
          order.orderId === activeOrder.orderId
            ? { ...order, paymentMethod: 'mpesa', paymentStatus: 'pending', paymentFailureReason: null }
            : order,
        ),
      );
      setManualPollTick((tick) => tick + 1);
      setRetryMessage('M-PESA prompt sent. Enter your PIN to complete payment.');
    } catch (e: any) {
      setRetryMessage(e.message || 'Could not retry payment');
    } finally {
      setRetryingOrder(false);
    }
  }

  const recentlyViewedProducts = recentlyViewedIds
    .map((id) => products.find((product) => product.id === id))
    .filter((product): product is StoreProduct => Boolean(product));

  const canJumpDirectToReview = () => {
    const contactReady = Boolean(customerName.trim() && customerPhone.trim());
    const deliveryReady =
      deliveryMethod === 'home'
        ? Boolean(deliveryCounty && deliverySubCounty.trim() && deliveryEstate.trim() && deliveryAddress.trim())
        : Boolean(deliveryCounty && pickupStation.trim());
    const activeMpesa = (paymentPhone || customerPhone || '').trim().replace(/[\s().-]/g, '');
    const payReady =
      paymentMethod === 'delivery'
        ? cashOptionEnabled
        : paymentMethod === 'card'
        ? customerName.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())
        : /^\+?254[17]\d{8}$|^0[17]\d{8}$/.test(activeMpesa);
    return contactReady && deliveryReady && payReady;
  };

  const handleProceedToCheckout = () => {
    setCheckoutError('');
    setCheckoutReturnToSummary(false);
    onNavigate(canJumpDirectToReview() ? 'checkout/review' : 'checkout/delivery');
  };

  function updateQuantity(id: string, quantity: number) {
    const product = products.find((item) => item.id === id);
    const available = product?.stockQuantity == null || product.stockQuantity <= 0
      ? 99
      : Math.max(0, product.stockQuantity);
    onCartChange((current) => {
      const next = { ...current };
      if (quantity <= 0) {
        delete next[id];
      } else {
        const nextQuantity = Math.min(99, available, quantity);
        if (nextQuantity <= 0) delete next[id];
        else next[id] = nextQuantity;
      }
      return next;
    });
  }

  async function applyVoucher() {
    if (!voucherCode.trim()) {
      setAppliedCoupon(null);
      setVoucherMessage('Enter a coupon code first.');
      return;
    }
    try {
      const r = await fetch('/api/buyer?action=coupon-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ slug, code: voucherCode.trim(), subtotal }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw Error(d.error || 'Coupon could not be applied.');
      setAppliedCoupon({ code: d.code, discount: Number(d.discount) || 0, description: d.description });
      setVoucherMessage(`${d.description} applied. You save ${formatKes(d.discount)}.`);
    } catch (e: any) {
      setAppliedCoupon(null);
      setVoucherMessage(e.message || 'Coupon could not be applied.');
    }
  }

  async function placeOrder(options?: { forceRedirect?: boolean }) {
    if (!lines.length || submitting) return;
    const isCash = paymentMethod === 'delivery';
    if (paymentMethod === 'mpesa' && !/^\+?254[17]\d{8}$|^0[17]\d{8}$/.test(paymentPhone.trim().replace(/[\s().-]/g, ''))) {
      setCheckoutError('Enter a valid Kenyan M-PESA phone number to receive the payment prompt.');
      return;
    }
    if (paymentMethod === 'card' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
      setCheckoutError('Enter a valid email address for your card payment receipt before continuing.');
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
    setCardFallbackUrl(null);
    let inlinePopupOpened = false;
    let redirectingToPaystack = false;
    const fingerprint = JSON.stringify({
      slug,
      items: lines
        .map(({ product, quantity }) => [product.id, quantity])
        .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
      coupon: appliedCoupon?.code || '',
      paymentMethod,
      paymentPhone: paymentMethod === 'mpesa' ? paymentPhone.trim() : '',
      deliveryFee,
      deliveryMethod,
      deliveryCounty,
      deliverySubCounty,
      deliveryEstate: deliveryEstate.trim(),
      deliveryAddress: deliveryAddress.trim(),
      deliveryDirections: deliveryDirections.trim(),
      pickupStation: pickupStation.trim(),
    });
    if (!checkoutIdempotency.current || checkoutIdempotency.current.fingerprint !== fingerprint) {
      const key =
        window.crypto?.randomUUID?.() || 'buyer-' + Date.now() + '-' + Math.random().toString(36).slice(2, 14);
      checkoutIdempotency.current = { fingerprint, key };
    }
    try {
      sessionStorage.setItem(`dasnet-checkout-idem-${getCheckoutScopeKey(slug)}`, JSON.stringify(checkoutIdempotency.current));
    } catch {}
    try {
      const response = await fetch('/api/buyer?action=order', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          couponCode: appliedCoupon?.code || '',
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          paymentPhone: paymentMethod === 'mpesa' ? paymentPhone.trim() : '',
          customerEmail: customerEmail.trim(),
          deliveryMethod,
          deliveryCounty,
          deliverySubCounty,
          deliveryEstate: deliveryEstate.trim(),
          deliveryAddress: deliveryAddress.trim(),
          deliveryDirections: deliveryDirections.trim(),
          pickupStation: pickupStation.trim(),
          paymentMethod: isCash ? 'delivery' : paymentMethod === 'card' ? 'paystack' : 'mpesa',
          items: lines.map(({ product, quantity }) => ({ id: product.id, quantity })),
          idempotencyKey: checkoutIdempotency.current.key,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        throw new Error('Your buyer session expired (401 Unauthorized). Please sign in again and retry checkout.');
      }
      if (!response.ok || !data.orderNumber || !data.orderId) {
        throw new Error(
          data.error || 'We could not create your order or start payment. Please review your details and try again.',
        );
      }
      const createdAt = new Date().toISOString();
      const order: BuyerOrder = {
        orderNumber: data.orderNumber,
        orderId: data.orderId,
        createdAt,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        paymentMethod: isCash ? 'delivery' : paymentMethod,
        deliveryMethod,
        deliveryAddress: deliveryAddress.trim(),
        pickupStation: pickupStation.trim(),
        deliveryCounty,
        deliverySubCounty,
        deliveryEstate: deliveryEstate.trim(),
        deliveryDirections: deliveryDirections.trim(),
        subtotal: Number(data.subtotal ?? subtotal),
        deliveryFee: Number(data.deliveryFee ?? deliveryFee),
        total: Number(data.total ?? total),
        lines: lines.map((line) => ({ ...line })),
        chatToken: data.chatToken || '',
        paymentStatus: data.paymentStatus || 'pending',
        discount: Number(data.discount || 0),
        couponCode: data.couponCode || null,
      };
      const updatedOrders = [order, ...orders.filter((entry) => entry.orderNumber !== order.orderNumber)];
      setOrders(updatedOrders);
      setActiveOrderNumber(order.orderNumber);
      if (paymentMethod === 'card') {
        if (String(data.paymentStatus || '').toLowerCase() === 'succeeded') {
          checkoutIdempotency.current = null;
          clearCheckoutDraft(getCheckoutScopeKey(slug));
          setCheckoutReturnToSummary(false);
          onCartChange({});
          onOrderCreated?.(order.chatToken || '', order.orderNumber);
          onNavigate('checkout/complete');
          return;
        }
        const hostedUrl = safeHttpsUrl(data.authorizationUrl);
        if ((options?.forceRedirect || shouldUsePaystackRedirectCheckout()) && hostedUrl) {
          redirectingToPaystack = true;
          window.location.assign(hostedUrl);
          return;
        }
        if (data.accessCode) {
          let settled = false;
          const loadGuard = window.setTimeout(() => {
            if (!settled) setSubmitting(false);
          }, 8000);
          inlinePopupOpened = launchPaystackCardModal({
            accessCode: String(data.accessCode),
            onLoad: () => {
              settled = true;
              window.clearTimeout(loadGuard);
              setSubmitting(false);
            },
            onSuccess: () => {
              settled = true;
              window.clearTimeout(loadGuard);
              checkoutIdempotency.current = null;
              clearCheckoutDraft(getCheckoutScopeKey(slug));
              setCheckoutReturnToSummary(false);
              onCartChange({});
              setCardFallbackUrl(null);
              setSubmitting(false);
              setPaymentPollMessage('Paystack received your card payment. Confirming your receipt…');
              onNavigate('checkout/processing');
            },
            onCancel: (popupStatus) => {
              settled = true;
              window.clearTimeout(loadGuard);
              setSubmitting(false);
              const fallback = safeHttpsUrl(popupStatus?.checkoutUrl) || hostedUrl;
              const inlineDetail = describePaystackPopupFailure(popupStatus);
              setCheckoutError(inlineDetail || 'Checking card payment status…');
              void (async () => {
                const verified = await verifyCardAttemptAfterClose(order.orderId!);
                if (verified.status === 'succeeded') {
                  checkoutIdempotency.current = null;
                  clearCheckoutDraft(getCheckoutScopeKey(slug));
                  setCheckoutReturnToSummary(false);
                  onCartChange({});
                  setCardFallbackUrl(null);
                  setCheckoutError('');
                  onOrderCreated?.(order.chatToken || '', order.orderNumber);
                  onNavigate('checkout/complete');
                  return;
                }
                if (verified.status === 'failed' || verified.status === 'cancelled' || verified.status === 'reversed') {
                  setCardFallbackUrl(null);
                } else {
                  setCardFallbackUrl(fallback);
                }
                setCheckoutError(
                  verified.message ||
                    inlineDetail ||
                    'Card form closed before payment was completed. Click Confirm & pay to retry, or finish later from My orders.',
                );
              })();
            },
            onError: (errMsg, popupStatus) => {
              settled = true;
              window.clearTimeout(loadGuard);
              setSubmitting(false);
              const fallback = safeHttpsUrl(popupStatus?.checkoutUrl) || hostedUrl;
              const inlineDetail = describePaystackPopupFailure(popupStatus);
              setCheckoutError(inlineDetail || errMsg || 'Checking card payment status…');
              void (async () => {
                const verified = await verifyCardAttemptAfterClose(order.orderId!);
                if (verified.status === 'succeeded') {
                  checkoutIdempotency.current = null;
                  clearCheckoutDraft(getCheckoutScopeKey(slug));
                  setCheckoutReturnToSummary(false);
                  onCartChange({});
                  setCardFallbackUrl(null);
                  setCheckoutError('');
                  onOrderCreated?.(order.chatToken || '', order.orderNumber);
                  onNavigate('checkout/complete');
                  return;
                }
                if (verified.status === 'failed' || verified.status === 'cancelled' || verified.status === 'reversed') {
                  setCardFallbackUrl(null);
                } else {
                  setCardFallbackUrl(fallback);
                }
                setCheckoutError(
                  verified.message ||
                    inlineDetail ||
                    errMsg ||
                    'Could not load Paystack card fields here. Use the Paystack checkout link below or try again.',
                );
              })();
            },
          });
          if (inlinePopupOpened) return;
          window.clearTimeout(loadGuard);
        }
        if (hostedUrl) {
          setCardFallbackUrl(hostedUrl);
          setCheckoutError(
            'Could not open card fields inline in this browser. Use the secure Paystack link below to complete payment.',
          );
          return;
        }
        if (String(data.paymentStatus || '').toLowerCase() === 'pending') {
          checkoutIdempotency.current = null;
          clearCheckoutDraft(getCheckoutScopeKey(slug));
          setCheckoutReturnToSummary(false);
          onCartChange({});
          setPaymentPollMessage(data.message || 'Paystack processed this payment; confirming your receipt.');
          onNavigate('checkout/processing');
          return;
        }
        throw new Error('Paystack did not return a card checkout session. Check your orders or contact the shop before retrying.');
      }
      checkoutIdempotency.current = null;
      clearCheckoutDraft(getCheckoutScopeKey(slug));
      setCheckoutReturnToSummary(false);
      onCartChange({});
      if (isCash) {
        setPaymentPollMessage(
          deliveryMethod === 'pickup'
            ? 'Order placed. Pay in cash when you collect it; the seller must accept the order first.'
            : 'Order placed. Pay the seller in cash when it arrives; the seller must accept the order first.',
        );
        onNavigate('orders');
      } else {
        setPaymentPollMessage('Waiting for payment confirmation…');
        onNavigate('checkout/processing');
      }
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Checkout failed. Please try again.');
    } finally {
      if (!inlinePopupOpened && !redirectingToPaystack) setSubmitting(false);
    }
  }

  function openOrder(order: BuyerOrder, next: string) {
    setActiveOrderNumber(order.orderNumber);
    if (next === 'inbox' || next === 'order-tracking') {
      onOpenChat?.(order.chatToken || '', order.orderNumber, order.orderId);
    }
    onNavigate(next);
  }

  function renderSummary() {
    const itemCount = lines.reduce((count, line) => count + line.quantity, 0);
    return (
      <aside className={`sf-summary-card ${mobileSummaryOpen ? 'is-mobile-open' : ''}`}>
        <button
          type="button"
          className="sf-summary-toggle"
          aria-expanded={mobileSummaryOpen}
          onClick={() => setMobileSummaryOpen((open) => !open)}
        >
          <span>
            <strong>{view === 'cart' ? 'Cart summary' : 'Order summary'}</strong>
            <small>
              {itemCount} {itemCount === 1 ? 'item' : 'items'} · {formatKes(view === 'cart' ? subtotal : total)}
            </small>
          </span>
          <ChevronDown
            size={18}
            style={{
              transform: mobileSummaryOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.16s ease',
            }}
          />
        </button>
        <h2>{view === 'cart' ? 'Cart summary' : 'Order summary'}</h2>
        <div className="sf-summary-body">
          {view !== 'cart' && view !== 'checkout/review' && (
            <div className="sf-checkout-items-mini">
              {lines.map(({ product, quantity }) => (
                <div className="sf-checkout-item-mini" key={product.id}>
                  <div className="sf-checkout-item-mini-img">
                    <ProductThumb product={product} />
                  </div>
                  <div>
                    <strong>{product.name}</strong>
                    <small>
                      Qty {quantity} · {formatKes(product.price)}
                    </small>
                  </div>
                  <b>{formatKes(product.price * quantity)}</b>
                </div>
              ))}
            </div>
          )}
          {view === 'checkout/payment' && (
            <div className="sf-summary-delivery-recap">
              <div>
                <strong>{deliveryMethod === 'pickup' ? 'Collection point' : 'Delivery destination'}</strong>
                <span>
                  {deliveryMethod === 'pickup'
                    ? pickupStation || deliveryCounty || 'Pickup station'
                    : [deliveryAddress, deliveryEstate, deliverySubCounty, deliveryCounty].filter(Boolean).join(', ') ||
                      'Door delivery'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCheckoutReturnToSummary(false);
                  onNavigate('checkout/delivery');
                }}
              >
                Edit
              </button>
            </div>
          )}
          {view === 'cart' ? (
            <div className="sf-summary-row sf-summary-total">
              <span>Subtotal</span>
              <strong>{formatKes(subtotal)}</strong>
            </div>
          ) : (
            <>
              <div className="sf-summary-row">
                <span>Items total ({itemCount})</span>
                <strong>{formatKes(subtotal)}</strong>
              </div>
              <div className="sf-summary-row">
                <span>{deliveryMethod === 'pickup' ? 'Pickup fee' : 'Delivery fee'}</span>
                <strong>{deliveryFee ? formatKes(deliveryFee) : 'Free'}</strong>
              </div>
              {appliedCoupon && (
                <div className="sf-summary-row">
                  <span>Coupon ({appliedCoupon.code})</span>
                  <strong>−{formatKes(appliedCoupon.discount)}</strong>
                </div>
              )}
              <div className="sf-summary-row sf-summary-total">
                <span>Total</span>
                <strong>{formatKes(total)}</strong>
              </div>
            </>
          )}
          <p className="sf-summary-note">
            <ShieldCheck size={15} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>Prices and stock are verified live before payment is processed.</span>
          </p>
        </div>
        {view === 'cart' && (
          <button
            type="button"
            className="sf-btn sf-btn-accent"
            disabled={!lines.length}
            onClick={handleProceedToCheckout}
          >
            Checkout ({formatKes(subtotal)}) <ArrowRight size={17} />
          </button>
        )}
      </aside>
    );
  }

  function renderOfflineBanner() {
    if (isOnline && !storeError) return null;
    return (
      <div className="sf-alert" role="status" style={{ marginBottom: 14, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <span>
          {!isOnline
            ? 'You are offline. Reconnect to sync your cart and continue checkout.'
            : 'Connection was interrupted while refreshing store data.'}
        </span>
        {onRetryConnection && (
          <button type="button" className="sf-btn sf-btn-secondary" style={{ minHeight: 34, padding: '0 12px', fontSize: 12.5 }} onClick={onRetryConnection}>
            Retry connection
          </button>
        )}
      </div>
    );
  }

  function renderRestoringCartState(currentStep: string) {
    const stepLabel =
      currentStep === 'checkout/delivery'
        ? 'Delivery details'
        : currentStep === 'checkout/payment'
        ? 'Payment method'
        : currentStep === 'checkout/review'
        ? 'Place your order'
        : `Cart (${rawCartCount})`;
    const isCheckout = currentStep.startsWith('checkout/');
    const checkoutStepNum: 1 | 2 | 3 =
      currentStep === 'checkout/payment' ? 2 : currentStep === 'checkout/review' ? 3 : 1;
    return (
      <>
        {isCheckout && (
          <CheckoutTopBar
            title={stepLabel}
            stepLabel={`Step ${checkoutStepNum} of 3`}
            onBack={() => onNavigate('cart')}
          />
        )}
        <section className="sf-flow sf-flow-compact">
          {isCheckout && <CheckoutSteps currentStep={checkoutStepNum} />}
          {!isCheckout && (
            <FlowHeading
              title={stepLabel}
              onBack={() => onNavigate('store')}
              backLabel="Back to shop"
            />
          )}
          <div className="sf-state-box">
            <span className="sf-state-icon">
              <ShoppingBag size={26} />
            </span>
            <h2>
              {!isOnline || storeError
                ? `Waiting to reconnect (${rawCartCount} ${rawCartCount === 1 ? 'item' : 'items'})`
                : `Loading your cart (${rawCartCount} ${rawCartCount === 1 ? 'item' : 'items'})…`}
            </h2>
            <p>
              {!isOnline || storeError
                ? 'Reconnect to load item prices and continue checkout.'
                : 'Loading your saved items from your account…'}
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              {onRetryConnection && (!isOnline || storeError || !productsLoading) && (
                <button type="button" className="sf-btn sf-btn-primary" onClick={onRetryConnection}>
                  Retry connection
                </button>
              )}
              <button type="button" className="sf-btn sf-btn-secondary" onClick={() => onNavigate('store')}>
                Back to shop
              </button>
            </div>
          </div>
        </section>
      </>
    );
  }

  function renderCart() {
    const itemCount = lines.reduce((count, line) => count + line.quantity, 0);
    const rawWaDigits = shopWhatsappNumber.replace(/\D/g, '');
    const whatsappDigits = rawWaDigits.startsWith('0') ? '254' + rawWaDigits.slice(1) : rawWaDigits;
    if (!lines.length && rawCartCount > 0) {
      return renderRestoringCartState('cart');
    }
    if (!lines.length && cartLoading) {
      return (
        <section className="sf-flow sf-flow-compact">
          <div className="sf-state-box">
            <span className="sf-state-icon">
              <ShoppingBag size={26} />
            </span>
            <h2>Loading your cart…</h2>
            <p>Checking your saved items for {shopName}.</p>
          </div>
        </section>
      );
    }
    return (
      <section className="sf-flow sf-flow-compact sf-cart-page-flow">
        {renderOfflineBanner()}
        {lines.length ? (
          <>
            <div className="sf-cart-mobile-summary-band" aria-label="Cart summary">
              <div className="sf-cart-band-label">CART SUMMARY</div>
              <div className="sf-cart-subtotal-row">
                <span>Subtotal</span>
                <strong className="sf-num">{formatKes(subtotal)}</strong>
              </div>
              <div className="sf-cart-band-label">CART ({itemCount})</div>
            </div>

            <div className="sf-two-col sf-cart-layout">
              <div className="sf-panel sf-cart-panel">
                <div className="sf-panel-head sf-cart-desktop-head">
                  <h2>Cart ({itemCount})</h2>
                  <span className="sf-num" style={{ color: 'var(--sf-muted)', fontSize: 13 }}>
                    {lines.length} {lines.length === 1 ? 'product' : 'products'}
                  </span>
                </div>
                <div className="sf-cart-list">
                  {lines.map(({ product, quantity }) => (
                    <article className="sf-cart-item" key={product.id}>
                      <button
                        type="button"
                        className="sf-cart-thumb"
                        onClick={() => onOpenProduct?.(product)}
                        aria-label={`View ${product.name}`}
                      >
                        <ProductThumb product={product} />
                      </button>
                      <div className="sf-cart-info">
                        <button type="button" className="sf-cart-name" onClick={() => onOpenProduct?.(product)}>
                          {product.name}
                        </button>
                        <div className="sf-cart-price-row">
                          <strong className="sf-cart-unit sf-num">{formatKes(product.price)}</strong>
                          {quantity > 1 && (
                            <span className="sf-cart-line-sub sf-num">
                              · {formatKes(product.price * quantity)} total
                            </span>
                          )}
                        </div>
                        <small className="sf-cart-stock is-in">
                          {product.stockQuantity == null || product.stockQuantity <= 0
                            ? 'In Stock'
                            : product.stockQuantity <= 5
                            ? `Only ${product.stockQuantity} left`
                            : 'In Stock'}
                        </small>
                      </div>
                      <div className="sf-cart-end">
                        <button
                          type="button"
                          className="sf-remove-btn"
                          onClick={() => updateQuantity(product.id, 0)}
                        >
                          <Trash2 size={15} />
                          <span>Remove</span>
                        </button>
                        <div className="sf-stepper sf-cart-stepper" aria-label={`Quantity for ${product.name}`}>
                          <button
                            type="button"
                            aria-label={`Decrease ${product.name} quantity`}
                            onClick={() => updateQuantity(product.id, quantity - 1)}
                          >
                            −
                          </button>
                          <span className="sf-num">{quantity}</span>
                          <button
                            type="button"
                            aria-label={`Increase ${product.name} quantity`}
                            disabled={
                              product.stockQuantity !== null &&
                              product.stockQuantity !== undefined &&
                              product.stockQuantity > 0 &&
                              quantity >= product.stockQuantity
                            }
                            onClick={() => updateQuantity(product.id, quantity + 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
                <div className="sf-cart-continue-desktop">
                  <button type="button" className="sf-btn sf-btn-ghost" onClick={() => onNavigate('store')}>
                    <ShoppingBag size={16} /> Continue shopping
                  </button>
                </div>
              </div>

              <aside className="sf-summary-card sf-cart-desktop-summary">
                <h2>Cart summary</h2>
                <div className="sf-summary-row">
                  <span>Items ({itemCount})</span>
                  <strong>{formatKes(subtotal)}</strong>
                </div>
                <div className="sf-summary-row">
                  <span>Delivery fees</span>
                  <span style={{ color: 'var(--sf-muted)' }}>Calculated next</span>
                </div>
                <div className="sf-summary-row sf-summary-total">
                  <span>Subtotal</span>
                  <strong>{formatKes(subtotal)}</strong>
                </div>
                <button
                  type="button"
                  className="sf-btn sf-btn-accent"
                  onClick={handleProceedToCheckout}
                >
                  Checkout ({formatKes(subtotal)}) <ArrowRight size={17} />
                </button>
                <div className="sf-summary-note">
                  <ShieldCheck size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>Delivery options and payment methods are confirmed on checkout.</span>
                </div>
              </aside>
            </div>

            <div className="sf-cart-mobile-actions">
              {whatsappDigits.length >= 10 && (
                <a
                  href={`https://wa.me/${whatsappDigits}?text=${encodeURIComponent(`Hello ${shopName}, I need help with my cart.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sf-checkout-call-btn"
                  aria-label={`Contact ${shopName}`}
                >
                  <Phone size={18} />
                </a>
              )}
              <button
                type="button"
                className="sf-btn sf-btn-accent sf-checkout-main-cta"
                onClick={handleProceedToCheckout}
              >
                Checkout ({formatKes(subtotal)})
              </button>
            </div>

            {recentlyViewedProducts.length > 0 && (
              <section className="sf-cart-recent" aria-label="Recently viewed products">
                <div className="sf-panel-head" style={{ borderBottom: 0, marginBottom: 10, paddingBottom: 0 }}>
                  <h2>Recently Viewed</h2>
                </div>
                <div className="sf-cart-recent-track">
                  {recentlyViewedProducts.slice(0, 8).map((product) => (
                    <button
                      type="button"
                      key={product.id}
                      className="sf-cart-recent-card"
                      onClick={() => onOpenProduct?.(product)}
                    >
                      <div className="sf-cart-recent-img">
                        <ProductThumb product={product} />
                      </div>
                      <strong>{product.name}</strong>
                      <span className="sf-num">{formatKes(product.price)}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <div className="sf-state-box">
            <span className="sf-state-icon">
              <ShoppingBag size={26} />
            </span>
            <h2>Your cart is waiting</h2>
            <p>You haven’t added anything from {shopName} yet.</p>
            <button type="button" className="sf-btn sf-btn-primary" onClick={() => onNavigate('store')}>
              Explore products <ArrowRight size={16} />
            </button>
          </div>
        )}
      </section>
    );
  }

  function renderCheckoutDelivery() {
    const pickupComplete = Boolean(deliveryCounty && pickupStation.trim());
    const homeAddressComplete = Boolean(
      deliveryCounty && deliverySubCounty.trim() && deliveryEstate.trim() && deliveryAddress.trim(),
    );
    const contactComplete = Boolean(customerName.trim() && customerPhone.trim());

    const continueToNext = () => {
      setCheckoutError('');
      if (!contactComplete) {
        setContactEditor(true);
        setCheckoutError('Enter your full name and phone number under Contact information.');
        document.getElementById('checkout-contact-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (deliveryMethod === 'pickup') {
        if (!deliveryCounty || !pickupStation.trim()) {
          setPickupStationEditor(true);
          setCheckoutError(
            !deliveryCounty
              ? 'Select your county for collection.'
              : 'Enter your preferred pickup station or collection point.',
          );
          document.getElementById('checkout-delivery-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      } else if (!homeAddressComplete) {
        setHomeAddressEditor(true);
        setCheckoutError('Complete your county, sub-county, estate/area and physical delivery address.');
        document.getElementById('checkout-delivery-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      setPickupStationEditor(false);
      setHomeAddressEditor(false);
      setContactEditor(false);
      const nextRoute = checkoutReturnToSummary ? 'checkout/review' : 'checkout/payment';
      setCheckoutReturnToSummary(false);
      onNavigate(nextRoute);
      void buyerFeatureRequest('buyer-delivery-preference', {
        deliveryMethod,
        deliveryCounty,
        deliverySubCounty,
        deliveryEstate,
        deliveryAddress,
        deliveryDirections,
        pickupStation,
      }).catch(() => {});
    };

    return (
      <>
        <CheckoutTopBar
          title="Delivery details"
          stepLabel="Step 1 of 3"
          onBack={() => {
            const backTarget = checkoutReturnToSummary ? 'checkout/review' : 'cart';
            setCheckoutReturnToSummary(false);
            onNavigate(backTarget);
          }}
        />
        <section className="sf-flow sf-flow-compact sf-checkout-page-flow">
          <CheckoutSteps currentStep={1} />
          {renderOfflineBanner()}

          <div className="sf-choice-grid" role="tablist" aria-label="Delivery method">
            <button
              type="button"
              role="tab"
              aria-selected={deliveryMethod === 'pickup'}
              className={`sf-choice-card ${deliveryMethod === 'pickup' ? 'active' : ''}`}
              onClick={() => {
                setCheckoutError('');
                setDeliveryMethod('pickup');
              }}
            >
              <span className="sf-choice-icon">
                <MapPin size={19} />
              </span>
              <span className="sf-choice-copy">
                <strong>
                  Pickup station{' '}
                  <span className="sf-choice-fee">
                    {shopDeliveryPickupFee ? formatKes(shopDeliveryPickupFee) : 'Free'}
                  </span>
                </strong>
                <small>Collect from your chosen station</small>
              </span>
              <span className="sf-choice-check">{deliveryMethod === 'pickup' ? <Check size={13} /> : ''}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={deliveryMethod === 'home'}
              className={`sf-choice-card ${deliveryMethod === 'home' ? 'active' : ''}`}
              onClick={() => {
                setCheckoutError('');
                setDeliveryMethod('home');
              }}
            >
              <span className="sf-choice-icon">
                <Package size={19} />
              </span>
              <span className="sf-choice-copy">
                <strong>
                  Door delivery{' '}
                  <span className="sf-choice-fee">
                    {shopDeliveryHomeFee ? formatKes(shopDeliveryHomeFee) : 'Free'}
                  </span>
                </strong>
                <small>Delivered to your home or office</small>
              </span>
              <span className="sf-choice-check">{deliveryMethod === 'home' ? <Check size={13} /> : ''}</span>
            </button>
          </div>

          <div className="sf-two-col">
            <div className="sf-checkout-stack">
              {deliveryMethod === 'pickup' ? (
                <div className="sf-panel" id="checkout-delivery-panel">
                  <div className="sf-panel-head">
                    <div>
                      <h2>Pickup location</h2>
                      <p>{pickupComplete && !pickupStationEditor ? 'Saved collection point' : 'Choose your county and collection station'}</p>
                    </div>
                  </div>
                  {pickupComplete && !pickupStationEditor ? (
                    <div className="sf-saved-location-box">
                      <span className="sf-choice-icon" style={{ width: 34, height: 34 }}>
                        <MapPin size={16} />
                      </span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <strong>{pickupStation}</strong>
                        <small>
                          {[deliverySubCounty, deliveryCounty, deliveryDirections].filter(Boolean).join(' · ')}
                        </small>
                      </div>
                      <button
                        type="button"
                        className="sf-btn sf-btn-secondary"
                        style={{ minHeight: 34, padding: '0 12px', fontSize: 12.5 }}
                        onClick={() => setPickupStationEditor(true)}
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="sf-form-grid">
                      <SearchableLocationSelect
                        label="County"
                        value={deliveryCounty}
                        options={kenyanCounties}
                        placeholder="Select county (e.g. Nairobi)"
                        onChange={(county) => {
                          setDeliveryCounty(county);
                          setDeliverySubCounty('');
                        }}
                      />
                      <SearchableLocationSelect
                        label="Sub-county (optional)"
                        value={deliverySubCounty}
                        options={kenyanSubCounties[deliveryCounty] || []}
                        placeholder={deliveryCounty ? 'Select sub-county' : 'Select a county first'}
                        disabled={!deliveryCounty}
                        onChange={setDeliverySubCounty}
                      />
                      <label className="sf-field sf-form-full">
                        Pickup station / collection point
                        <input
                          required
                          value={pickupStation}
                          onChange={(e) => setPickupStation(e.target.value)}
                          placeholder="e.g. Pick-up Mtaani CBD, G4S Westlands, or shop counter"
                        />
                      </label>
                      <label className="sf-field sf-form-full">
                        Notes or nearby landmark <small>(optional)</small>
                        <input
                          value={deliveryDirections}
                          onChange={(e) => setDeliveryDirections(e.target.value)}
                          placeholder="Any collection instructions for the seller"
                        />
                      </label>
                      {pickupComplete && (
                        <div className="sf-form-full" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="sf-btn sf-btn-secondary"
                            style={{ minHeight: 34, padding: '0 14px', fontSize: 12.5 }}
                            onClick={() => setPickupStationEditor(false)}
                          >
                            Done
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="sf-panel" id="checkout-delivery-panel">
                  <div className="sf-panel-head">
                    <div>
                      <h2>Delivery address</h2>
                      <p>{homeAddressComplete && !homeAddressEditor ? 'Saved drop-off address' : 'Provide the exact location for courier or rider drop-off'}</p>
                    </div>
                  </div>
                  {homeAddressComplete && !homeAddressEditor ? (
                    <div className="sf-saved-location-box">
                      <span className="sf-choice-icon" style={{ width: 34, height: 34 }}>
                        <Package size={16} />
                      </span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <strong>{deliveryAddress}</strong>
                        <small>
                          {[deliveryEstate, deliverySubCounty, deliveryCounty, deliveryDirections].filter(Boolean).join(' · ')}
                        </small>
                      </div>
                      <button
                        type="button"
                        className="sf-btn sf-btn-secondary"
                        style={{ minHeight: 34, padding: '0 12px', fontSize: 12.5 }}
                        onClick={() => setHomeAddressEditor(true)}
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="sf-form-grid">
                      <SearchableLocationSelect
                        label="County"
                        value={deliveryCounty}
                        options={kenyanCounties}
                        placeholder="Select county (e.g. Nairobi)"
                        onChange={(county) => {
                          setDeliveryCounty(county);
                          setDeliverySubCounty('');
                        }}
                      />
                      <SearchableLocationSelect
                        label="Sub-county"
                        value={deliverySubCounty}
                        options={kenyanSubCounties[deliveryCounty] || []}
                        placeholder={deliveryCounty ? 'Select sub-county' : 'Select a county first'}
                        disabled={!deliveryCounty}
                        onChange={setDeliverySubCounty}
                      />
                      <label className="sf-field">
                        Estate / area
                        <input
                          required
                          value={deliveryEstate}
                          onChange={(e) => setDeliveryEstate(e.target.value)}
                          placeholder="e.g. Kilimani"
                        />
                      </label>
                      <label className="sf-field">
                        Street / building / house no.
                        <input
                          required
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          placeholder="Building, street, floor or gate"
                        />
                      </label>
                      <label className="sf-field sf-form-full">
                        Directions / landmark <small>(optional)</small>
                        <input
                          value={deliveryDirections}
                          onChange={(e) => setDeliveryDirections(e.target.value)}
                          placeholder="Nearby landmark, gate details or delivery notes"
                        />
                      </label>
                      {homeAddressComplete && (
                        <div className="sf-form-full" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="sf-btn sf-btn-secondary"
                            style={{ minHeight: 34, padding: '0 14px', fontSize: 12.5 }}
                            onClick={() => setHomeAddressEditor(false)}
                          >
                            Done
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="sf-panel" id="checkout-contact-panel">
                <div className="sf-panel-head">
                  <div>
                    <h2>Contact information</h2>
                    <p>{contactComplete && !contactEditor ? 'Dispatch & SMS updates' : 'Used for dispatch and delivery coordination'}</p>
                  </div>
                </div>
                {contactComplete && !contactEditor ? (
                  <div className="sf-saved-location-box">
                    <span className="sf-choice-icon" style={{ width: 34, height: 34 }}>
                      <UserRound size={16} />
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <strong>{customerName}</strong>
                      <small>{[customerPhone, customerEmail].filter(Boolean).join(' · ')}</small>
                    </div>
                    <button
                      type="button"
                      className="sf-btn sf-btn-secondary"
                      style={{ minHeight: 34, padding: '0 12px', fontSize: 12.5 }}
                      onClick={() => setContactEditor(true)}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="sf-form-grid">
                    <label className="sf-field">
                      Full name
                      <input
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        autoComplete="name"
                        placeholder="Your full name"
                      />
                    </label>
                    <label className="sf-field">
                      Phone number
                      <input
                        required
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        autoComplete="tel"
                        placeholder="07… or +254…"
                      />
                    </label>
                    <label className="sf-field sf-form-full">
                      Email address <small>(optional)</small>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        autoComplete="email"
                        placeholder="you@example.com"
                      />
                    </label>
                    {contactComplete && (
                      <div className="sf-form-full" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="sf-btn sf-btn-secondary"
                          style={{ minHeight: 34, padding: '0 14px', fontSize: 12.5 }}
                          onClick={() => setContactEditor(false)}
                        >
                          Done
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {renderSummary()}
          </div>

          {checkoutError && (
            <p className="sf-alert error" style={{ marginTop: 14 }} role="alert">
              {checkoutError}
            </p>
          )}

          <div className="sf-checkout-footer-bar">
            <div>
              <small>ORDER TOTAL</small>
              <strong>{formatKes(total)}</strong>
            </div>
            <button
              type="button"
              className="sf-btn sf-btn-accent"
              disabled={deliveryPreferenceLoading}
              onClick={continueToNext}
            >
              {checkoutReturnToSummary ? 'Save delivery details' : 'Continue to payment'} <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </>
    );
  }

  function renderCheckoutPayment() {
    const activeMpesaPhone = (paymentPhone || customerPhone || '').trim();
    const isValidKenyanPhone = (val: string) => /^\+?254[17]\d{8}$|^0[17]\d{8}$/.test(val.replace(/[\s().-]/g, ''));
    const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
    const itemCount = lines.reduce((count, line) => count + line.quantity, 0);

    const chooseMpesa = () => {
      setCheckoutError('');
      setPaymentModalError('');
      setCardFallbackUrl(null);
      setPaymentMethod('mpesa');
      setPaymentModal(isValidKenyanPhone(activeMpesaPhone) ? null : 'mpesa');
    };
    const chooseCard = () => {
      setCheckoutError('');
      setPaymentModalError('');
      setCardFallbackUrl(null);
      setPaymentMethod('card');
      setPaymentModal(!isValidEmail(customerEmail) || customerName.trim().length < 2 ? 'card' : null);
    };
    const confirmPaymentSelection = () => {
      setCheckoutError('');
      if (paymentMethod === 'card' && (!isValidEmail(customerEmail) || customerName.trim().length < 2)) {
        setPaymentModalError('Enter your billing name and receipt email before confirming bank card.');
        setPaymentModal('card');
        return;
      }
      if (paymentMethod === 'mpesa' && !isValidKenyanPhone(activeMpesaPhone)) {
        setPaymentModalError('Enter a valid Kenyan M-PESA phone number before confirming M-PESA.');
        setPaymentModal('mpesa');
        return;
      }
      setPaymentModalError('');
      setPaymentModal(null);
      setCheckoutReturnToSummary(false);
      onNavigate('checkout/review');
    };

    const renderOrderSummaryCard = () => (
      <div className="sf-review-summary-wrap">
        <div className="sf-review-block-head sf-review-summary-mobile-head">
          <span className="sf-kicker">ORDER SUMMARY</span>
        </div>
        <aside className="sf-summary-card sf-review-summary-col" aria-labelledby="payment-order-summary-heading">
          <span id="payment-order-summary-heading" className="sf-kicker sf-review-summary-kicker-desktop">
            ORDER SUMMARY
          </span>
          <div className="sf-review-summary-rows">
            <div className="sf-summary-row">
              <span>Item’s total ({itemCount})</span>
              <strong>{formatKes(subtotal)}</strong>
            </div>
            <div className="sf-summary-row">
              <span>Delivery fees</span>
              <strong>{deliveryFee ? formatKes(deliveryFee) : 'Free'}</strong>
            </div>
            {appliedCoupon && (
              <div className="sf-summary-row">
                <span>Voucher ({appliedCoupon.code})</span>
                <strong>−{formatKes(appliedCoupon.discount)}</strong>
              </div>
            )}
            <div className="sf-summary-row sf-summary-total">
              <span>Total</span>
              <strong>{formatKes(total)}</strong>
            </div>
          </div>

          <div className="sf-review-voucher-box">
            {appliedCoupon ? (
              <div className="sf-review-voucher-applied">
                <TicketPercent size={16} />
                <span>
                  <strong>{appliedCoupon.code}</strong> · −{formatKes(appliedCoupon.discount)}
                </span>
                <button
                  type="button"
                  className="sf-review-change-btn"
                  onClick={() => {
                    setAppliedCoupon(null);
                    setVoucherMessage('');
                    setVoucherCode('');
                  }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="sf-review-voucher-form">
                <div className="sf-review-voucher-input-wrap">
                  <TicketPercent size={16} aria-hidden="true" />
                  <input
                    aria-label="Voucher code"
                    value={voucherCode}
                    onChange={(event) => {
                      setVoucherCode(event.target.value);
                      if (voucherMessage) setVoucherMessage('');
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void applyVoucher();
                      }
                    }}
                    placeholder="Enter code here"
                  />
                </div>
                <button
                  type="button"
                  className="sf-review-voucher-apply"
                  disabled={!voucherCode.trim()}
                  onClick={() => void applyVoucher()}
                >
                  APPLY
                </button>
              </div>
            )}
            {voucherMessage && (
              <small className="sf-review-voucher-msg" role="status">
                {voucherMessage}
              </small>
            )}
          </div>

          <button
            type="button"
            className="sf-btn sf-btn-accent sf-review-desktop-confirm"
            disabled={!lines.length}
            onClick={confirmPaymentSelection}
          >
            Confirm payment method
          </button>
        </aside>
      </div>
    );

    return (
      <>
        <CheckoutTopBar
          title="Select payment"
          stepLabel="Step 2 of 3"
          onBack={() => {
            const backTarget = checkoutReturnToSummary ? 'checkout/review' : 'checkout/delivery';
            setCheckoutReturnToSummary(false);
            onNavigate(backTarget);
          }}
        />
        <section className="sf-flow sf-flow-compact sf-place-order-flow sf-select-payment-flow">
          <CheckoutSteps
            currentStep={2}
            onSelectStep={(step) => {
              if (step === 1) {
                setCheckoutReturnToSummary(false);
                onNavigate('checkout/delivery');
              }
            }}
          />
          {renderOfflineBanner()}

          <div className="sf-two-col sf-review-layout">
            <div className="sf-checkout-stack sf-review-details-col">
              <div className="sf-review-block-head sf-select-payment-head">
                <span className="sf-kicker">PAYMENT METHOD</span>
              </div>

              <section className="sf-pay-group" aria-labelledby="pay-group-prepay">
                <div id="pay-group-prepay" className="sf-pay-group-title">
                  Pre-pay Now
                </div>
                <div className="sf-panel sf-panel-compact sf-pay-group-card" role="radiogroup" aria-label="Pre-pay Now">
                  <div className={`sf-pay-item ${paymentMethod === 'mpesa' ? 'is-selected' : ''}`}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={paymentMethod === 'mpesa'}
                      className="sf-pay-item-trigger"
                      onClick={chooseMpesa}
                    >
                      <span className="sf-pay-radio" aria-hidden="true">
                        {paymentMethod === 'mpesa' ? <span className="sf-pay-radio-dot" /> : null}
                      </span>
                      <span className="sf-pay-item-copy">
                        <span className="sf-pay-item-top">
                          <strong>Pay Now with M-PESA</strong>
                          <MpesaProviderIcon compact />
                        </span>
                        <span className="sf-pay-item-sub">
                          Pay now fast and securely with your M-PESA account.
                        </span>
                      </span>
                    </button>
                    {paymentMethod === 'mpesa' && (
                      <div className="sf-pay-item-expand">
                        <div className="sf-pay-item-inline-row">
                          <span>
                            STK prompt number:{' '}
                            <strong className="sf-mono">{activeMpesaPhone || 'Not set'}</strong>
                          </span>
                          <button
                            type="button"
                            className="sf-review-change-btn"
                            onClick={() => {
                              setPaymentModalError('');
                              setPaymentModal((current) => (current === 'mpesa' ? null : 'mpesa'));
                            }}
                          >
                            {paymentModal === 'mpesa' ? 'Done' : activeMpesaPhone ? 'Change' : 'Set number'}
                          </button>
                        </div>
                        {(paymentModal === 'mpesa' || !isValidKenyanPhone(activeMpesaPhone)) && (
                          <div className="sf-pay-inline-form">
                            <label className="sf-field">
                              M-PESA phone number
                              <input
                                type="tel"
                                inputMode="tel"
                                autoComplete="tel"
                                placeholder="07XX XXX XXX or 2547XXXXXXXX"
                                value={paymentPhone}
                                onChange={(e) => {
                                  setPaymentModalError('');
                                  setPaymentPhone(e.target.value);
                                }}
                                maxLength={16}
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className={`sf-pay-item ${paymentMethod === 'card' ? 'is-selected' : ''}`}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={paymentMethod === 'card'}
                      className="sf-pay-item-trigger"
                      onClick={chooseCard}
                    >
                      <span className="sf-pay-radio" aria-hidden="true">
                        {paymentMethod === 'card' ? <span className="sf-pay-radio-dot" /> : null}
                      </span>
                      <span className="sf-pay-item-copy">
                        <span className="sf-pay-item-top">
                          <strong>Pay Now With Bank Card</strong>
                          <CardProviderIcon compact />
                        </span>
                        <span className="sf-pay-item-sub">
                          Pay now fast and securely with Paystack, Visa and Mastercard.
                        </span>
                      </span>
                    </button>
                    {paymentMethod === 'card' && (
                      <div className="sf-pay-item-expand">
                        <div className="sf-pay-accept-card">
                          <div className="sf-pay-accept-row">
                            <span>We accept:</span>
                            <CardNetworkLogos />
                          </div>
                          <p>
                            Card details open safely via Paystack when you confirm your order.
                            {isValidEmail(customerEmail) ? ` Receipt to ${customerEmail.trim()}.` : ''}
                          </p>
                          <div className="sf-pay-item-inline-row">
                            <span style={{ color: 'var(--sf-muted)', fontSize: 12 }}>
                              {customerName.trim() || 'Billing name needed'}
                            </span>
                            <button
                              type="button"
                              className="sf-review-change-btn"
                              onClick={() => {
                                setPaymentModalError('');
                                setPaymentModal((current) => (current === 'card' ? null : 'card'));
                              }}
                            >
                              {paymentModal === 'card' ? 'Done' : isValidEmail(customerEmail) ? 'Details' : 'Add details'}
                            </button>
                          </div>
                        </div>
                        {(paymentModal === 'card' || !isValidEmail(customerEmail) || customerName.trim().length < 2) && (
                          <div className="sf-pay-inline-form">
                            <label className="sf-field">
                              Cardholder / billing name
                              <input
                                type="text"
                                autoComplete="name"
                                placeholder="Full name"
                                value={customerName}
                                onChange={(e) => {
                                  setPaymentModalError('');
                                  setCustomerName(e.target.value);
                                }}
                                maxLength={120}
                              />
                            </label>
                            <label className="sf-field">
                              Email address for receipt
                              <input
                                type="email"
                                autoComplete="email"
                                placeholder="you@example.com"
                                value={customerEmail}
                                onChange={(e) => {
                                  setPaymentModalError('');
                                  setCustomerEmail(e.target.value);
                                }}
                                maxLength={254}
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {cashOptionEnabled && (
                <section className="sf-pay-group" aria-labelledby="pay-group-pod">
                  <div id="pay-group-pod" className="sf-pay-group-title">
                    Pay on Delivery
                  </div>
                  <div className="sf-panel sf-panel-compact sf-pay-group-card" role="radiogroup" aria-label="Pay on Delivery">
                    <div className={`sf-pay-item ${paymentMethod === 'delivery' ? 'is-selected' : ''}`}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={paymentMethod === 'delivery'}
                        className="sf-pay-item-trigger"
                        onClick={() => {
                          setCheckoutError('');
                          setPaymentModalError('');
                          setCardFallbackUrl(null);
                          setPaymentMethod('delivery');
                          setPaymentModal(null);
                        }}
                      >
                        <span className="sf-pay-radio" aria-hidden="true">
                          {paymentMethod === 'delivery' ? <span className="sf-pay-radio-dot" /> : null}
                        </span>
                        <span className="sf-pay-item-copy">
                          <span className="sf-pay-item-top">
                            <strong>{deliveryMethod === 'pickup' ? 'Pay on pickup' : 'Pay on delivery'}</strong>
                            <CashProviderIcon compact />
                          </span>
                          <span className="sf-pay-item-sub">
                            {deliveryMethod === 'pickup'
                              ? 'Pay cash when collecting your confirmed order from the pickup station.'
                              : 'Pay cash on delivery after the seller confirms and dispatches your order.'}
                          </span>
                        </span>
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {(paymentModalError || checkoutError) && (
                <p className="sf-alert error" role="alert">
                  {paymentModalError || checkoutError}
                </p>
              )}
            </div>

            {renderOrderSummaryCard()}
          </div>

          <div className="sf-checkout-footer-bar sf-checkout-footer-mobile-only">
            <button
              type="button"
              className="sf-btn sf-btn-accent sf-checkout-main-cta"
              disabled={!lines.length}
              onClick={confirmPaymentSelection}
            >
              Confirm payment method
            </button>
          </div>
        </section>
      </>
    );
  }

  function renderReview() {
    const itemCount = lines.reduce((count, line) => count + line.quantity, 0);
    const addressSummary =
      deliveryMethod === 'home'
        ? [deliveryAddress, deliveryEstate, deliverySubCounty, deliveryCounty].filter(Boolean).join(', ')
        : pickupStation;
    const deliverySubtext =
      deliveryMethod === 'pickup'
        ? [deliverySubCounty, deliveryCounty, deliveryDirections].filter(Boolean).join(' · ')
        : [deliveryEstate, deliverySubCounty, deliveryCounty, deliveryDirections].filter(Boolean).join(' · ');
    const canSubmit =
      lines.length > 0 &&
      Boolean(customerName.trim()) &&
      Boolean(customerPhone.trim()) &&
      !(paymentMethod === 'delivery' && !cashOptionEnabled) &&
      !submitting &&
      (deliveryMethod === 'home'
        ? Boolean(deliveryCounty && deliverySubCounty.trim() && deliveryEstate.trim() && deliveryAddress.trim())
        : Boolean(pickupStation.trim() && deliveryCounty));

    const confirmLabel = submitting
      ? paymentMethod === 'delivery'
        ? 'Placing order…'
        : paymentMethod === 'card'
        ? 'Loading card fields…'
        : 'Requesting M-PESA…'
      : 'Confirm order';

    return (
      <>
        <CheckoutTopBar
          title="Place your order"
          stepLabel="Step 3 of 3"
          onBack={() => {
            setCheckoutReturnToSummary(false);
            onNavigate('checkout/payment');
          }}
        />
        <section className="sf-flow sf-flow-compact sf-place-order-flow">
          <CheckoutSteps
            currentStep={3}
            onSelectStep={(step) => {
              setCheckoutReturnToSummary(true);
              onNavigate(step === 1 ? 'checkout/delivery' : 'checkout/payment');
            }}
          />
          <p className="sf-checkout-terms-strip">
            By proceeding, you are automatically accepting the{' '}
            <button
              type="button"
              className="sf-auth-link"
              onClick={() => onNavigate('shop-terms')}
            >
              Terms &amp; Conditions
            </button>
            .
          </p>

          {renderOfflineBanner()}

          <div className="sf-two-col sf-review-layout">
            <div className="sf-checkout-stack sf-review-details-col">
              <section className="sf-review-block" aria-labelledby="review-payment-heading">
                <div className="sf-review-block-head">
                  <span id="review-payment-heading" className="sf-kicker">PAYMENT METHOD</span>
                  <button
                    type="button"
                    className="sf-review-change-btn"
                    onClick={() => {
                      setCheckoutReturnToSummary(true);
                      onNavigate('checkout/payment');
                    }}
                  >
                    Change
                  </button>
                </div>
                <div className="sf-panel sf-panel-compact sf-review-card">
                  <div className="sf-review-method-row">
                    {paymentMethod === 'delivery' ? (
                      <CashProviderIcon compact />
                    ) : paymentMethod === 'card' ? (
                      <CardProviderIcon compact />
                    ) : (
                      <MpesaProviderIcon compact />
                    )}
                    <div style={{ minWidth: 0 }}>
                      <strong>
                        {paymentMethod === 'mpesa'
                          ? 'Pay Now with M-PESA'
                          : paymentMethod === 'card'
                          ? 'Pay with Debit or Credit Card'
                          : deliveryMethod === 'pickup'
                          ? 'Pay on Pickup'
                          : 'Cash on Delivery'}
                      </strong>
                      <p>
                        {paymentMethod === 'delivery'
                          ? `Pay cash upon ${deliveryMethod === 'pickup' ? 'collection at pickup point' : 'delivery after seller confirmation'}.`
                          : paymentMethod === 'card'
                          ? `Receipt to ${customerEmail.trim() || 'your email'} · Paystack opens securely when you confirm.`
                          : `Pay now fast and securely with M-PESA (${paymentPhone || customerPhone}).`}
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="sf-review-block" aria-labelledby="review-delivery-heading">
                <div className="sf-review-block-head">
                  <span id="review-delivery-heading" className="sf-kicker">DELIVERY DETAILS</span>
                  <button
                    type="button"
                    className="sf-review-change-btn"
                    onClick={() => {
                      setCheckoutReturnToSummary(true);
                      onNavigate('checkout/delivery');
                    }}
                  >
                    Change
                  </button>
                </div>
                <div className="sf-panel sf-panel-compact sf-review-card">
                  <div className="sf-review-delivery-top">
                    <span className="sf-review-delivery-icon" aria-hidden="true">
                      {deliveryMethod === 'pickup' ? <MapPin size={18} /> : <Package size={18} />}
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="sf-review-delivery-title">
                        <strong>{deliveryMethod === 'pickup' ? 'Pick-up Station' : 'Door Delivery'}</strong>
                        <span className="sf-review-fee-note">
                          ({deliveryFee ? formatKes(deliveryFee) : 'Free'})
                        </span>
                      </div>
                      <p>
                        Recipient: {customerName} · {customerPhone}
                      </p>
                    </div>
                  </div>
                  <div className="sf-review-destination-box">
                    <MapPin size={16} aria-hidden="true" />
                    <div style={{ minWidth: 0 }}>
                      <small>{deliveryMethod === 'pickup' ? 'Pickup Station' : 'Delivery Address'}</small>
                      <strong>{deliveryMethod === 'pickup' ? pickupStation : addressSummary}</strong>
                      {deliverySubtext && <span>{deliverySubtext}</span>}
                    </div>
                  </div>
                </div>
              </section>

              <section className="sf-review-block" aria-labelledby="review-shipment-heading">
                <div className="sf-review-block-head">
                  <span id="review-shipment-heading" className="sf-review-shipment-label">Shipment 1/1</span>
                  <span className="sf-review-fulfilled-by">Fulfilled by {shopName}</span>
                </div>
                <div className="sf-panel sf-panel-compact sf-review-card">
                  <div className="sf-review-shipment-head">
                    <strong>{deliveryMethod === 'pickup' ? 'Pick-up Station' : 'Door Delivery'}</strong>
                    <small>
                      {deliveryMethod === 'pickup'
                        ? `Collect from ${pickupStation || deliveryCounty || 'selected station'}`
                        : `Deliver to ${deliveryEstate || deliveryCounty || 'your address'}`}
                    </small>
                  </div>
                  <div className="sf-review-shipment-items">
                    {lines.map(({ product, quantity }) => (
                      <article className="sf-review-shipment-item" key={product.id}>
                        <div className="sf-review-shipment-thumb">
                          <ProductThumb product={product} />
                          <span className="sf-review-qty-badge sf-num">x{quantity}</span>
                        </div>
                        <div className="sf-review-shipment-copy">
                          <strong>{product.name}</strong>
                          <span className="sf-num">{formatKes(product.price * quantity)}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
                <div className="sf-review-modify-wrap">
                  <button
                    type="button"
                    className="sf-review-change-btn sf-review-modify-btn"
                    onClick={() => {
                      setCheckoutReturnToSummary(false);
                      onNavigate('cart');
                    }}
                  >
                    Modify cart
                  </button>
                </div>
              </section>

              <div className="sf-review-continue-shop-wrap">
                <button
                  type="button"
                  className="sf-review-continue-shop-link"
                  onClick={() => {
                    setCheckoutReturnToSummary(false);
                    onNavigate('store');
                  }}
                >
                  <ChevronLeft size={16} />
                  <span>Go back &amp; continue shopping</span>
                </button>
              </div>
            </div>

            <div className="sf-review-summary-wrap">
              <div className="sf-review-block-head sf-review-summary-mobile-head">
                <span className="sf-kicker">ORDER SUMMARY</span>
              </div>
              <aside className="sf-summary-card sf-review-summary-col" aria-labelledby="review-order-summary-heading">
                <span id="review-order-summary-heading" className="sf-kicker sf-review-summary-kicker-desktop">
                  ORDER SUMMARY
                </span>
              <div className="sf-review-summary-rows">
                <div className="sf-summary-row">
                  <span>Item’s total ({itemCount})</span>
                  <strong>{formatKes(subtotal)}</strong>
                </div>
                <div className="sf-summary-row">
                  <span>Delivery fees</span>
                  <strong>{deliveryFee ? formatKes(deliveryFee) : 'Free'}</strong>
                </div>
                {appliedCoupon && (
                  <div className="sf-summary-row">
                    <span>Voucher ({appliedCoupon.code})</span>
                    <strong>−{formatKes(appliedCoupon.discount)}</strong>
                  </div>
                )}
                <div className="sf-summary-row sf-summary-total">
                  <span>Total</span>
                  <strong>{formatKes(total)}</strong>
                </div>
              </div>

              <div className="sf-review-voucher-box">
                {appliedCoupon ? (
                  <div className="sf-review-voucher-applied">
                    <TicketPercent size={16} />
                    <span>
                      <strong>{appliedCoupon.code}</strong> · −{formatKes(appliedCoupon.discount)}
                    </span>
                    <button
                      type="button"
                      className="sf-review-change-btn"
                      onClick={() => {
                        setAppliedCoupon(null);
                        setVoucherMessage('');
                        setVoucherCode('');
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="sf-review-voucher-form">
                    <div className="sf-review-voucher-input-wrap">
                      <TicketPercent size={16} aria-hidden="true" />
                      <input
                        aria-label="Voucher code"
                        value={voucherCode}
                        onChange={(event) => {
                          setVoucherCode(event.target.value);
                          if (voucherMessage) setVoucherMessage('');
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            void applyVoucher();
                          }
                        }}
                        placeholder="Enter code here"
                      />
                    </div>
                    <button
                      type="button"
                      className="sf-review-voucher-apply"
                      disabled={!voucherCode.trim()}
                      onClick={() => void applyVoucher()}
                    >
                      APPLY
                    </button>
                  </div>
                )}
                {voucherMessage && (
                  <small className="sf-review-voucher-msg" role="status">
                    {voucherMessage}
                  </small>
                )}
              </div>

              <button
                type="button"
                className="sf-btn sf-btn-accent sf-review-desktop-confirm"
                disabled={!canSubmit}
                onClick={() => void placeOrder()}
              >
                {confirmLabel}
              </button>
                <p className="sf-summary-note">
                  <ShieldCheck size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>Prices and stock are verified live before payment is processed.</span>
                </p>
              </aside>
            </div>
          </div>

          {checkoutError && (
            <p className="sf-alert error" style={{ marginTop: 14 }} role="alert">
              {checkoutError}
            </p>
          )}
          {cardFallbackUrl && paymentMethod === 'card' && (
            <div style={{ marginTop: 10 }}>
              <a className="sf-btn sf-btn-secondary" href={cardFallbackUrl} rel="noopener noreferrer">
                Open Paystack card page <ArrowRight size={15} />
              </a>
            </div>
          )}
          {!cardFallbackUrl && checkoutError && paymentMethod === 'card' && !shouldUsePaystackRedirectCheckout() && (
            <div style={{ marginTop: 10 }}>
              <button
                type="button"
                className="sf-btn sf-btn-secondary"
                disabled={!canSubmit}
                onClick={() => void placeOrder({ forceRedirect: true })}
              >
                Pay on Paystack hosted page <ArrowRight size={15} />
              </button>
            </div>
          )}

          <div className="sf-checkout-footer-bar sf-checkout-footer-mobile-only">
            <button
              type="button"
              className="sf-btn sf-btn-accent sf-checkout-main-cta"
              disabled={!canSubmit}
              onClick={() => void placeOrder()}
            >
              {confirmLabel}
            </button>
          </div>
        </section>
      </>
    );
  }

  function renderPaymentProcessing() {
    if (!activeOrder)
      return (
        <>
          <CheckoutTopBar title="Payment status" onBack={() => onNavigate('cart')} />
          <section className="sf-flow sf-flow-compact sf-poll-flow">
            <div className="sf-panel sf-poll-hero">
              <div className="sf-poll-ring-wrap">
                <div className="sf-processing-ring" aria-hidden="true" />
              </div>
              <span className="sf-kicker">LOADING PAYMENT</span>
              <h1>Checking order details</h1>
              <p className="sf-poll-lead">Fetching your latest payment status from {shopName}…</p>
            </div>
          </section>
        </>
      );

    const paymentState = String(activeOrder.paymentStatus || 'pending').toLowerCase();
    const paymentTerminal = ['cancelled', 'failed', 'reversed'].includes(paymentState);
    const paymentSucceeded = paymentState === 'succeeded';
    const paymentWaiting = !paymentTerminal && !paymentSucceeded && !paymentPollAuthError;
    const isCardOrder = activeOrder.paymentMethod === 'card';
    const providerLabel = isCardOrder ? 'Paystack' : 'Safaricom';
    const targetAccount = isCardOrder
      ? activeOrder.customerEmail || customerEmail || '—'
      : paymentPhone || activeOrder.customerPhone || '—';
    const itemCount = activeOrder.lines.reduce((sum, line) => sum + line.quantity, 0);
    const failureMessage =
      activeOrder.paymentFailureReason ||
      (paymentTerminal && paymentPollMessage !== 'Waiting for payment confirmation…' ? paymentPollMessage : '');

    const step2State = paymentSucceeded || paymentProviderResponded ? 'done' : paymentTerminal ? 'error' : 'active';
    const step3State = paymentSucceeded ? 'done' : paymentTerminal ? 'error' : paymentProviderResponded ? 'active' : 'pending';

    return (
      <>
        <CheckoutTopBar title="Payment confirmation" onBack={() => onNavigate('orders')} />
        <section className="sf-flow sf-flow-compact sf-poll-flow">
          <article className={`sf-panel sf-poll-hero ${paymentSucceeded ? 'is-success' : paymentTerminal || paymentPollAuthError ? 'is-error' : 'is-waiting'}`}>
            <div className="sf-poll-top-row">
              {isCardOrder ? <CardProviderIcon compact /> : <MpesaProviderIcon compact />}
              <span className={`sf-poll-state-label ${paymentSucceeded ? 'is-success' : paymentTerminal || paymentPollAuthError ? 'is-error' : 'is-waiting'}`}>
                {paymentSucceeded
                  ? 'Confirmed'
                  : paymentPollAuthError
                  ? 'Sign in required'
                  : paymentTerminal
                  ? paymentState === 'cancelled'
                    ? 'Cancelled'
                    : paymentState === 'reversed'
                    ? 'Reversed'
                    : 'Not completed'
                  : pollTimedOut
                  ? 'Awaiting confirmation'
                  : 'Verifying'}
              </span>
            </div>

            <div className="sf-poll-headline-row">
              <div className="sf-poll-visual" aria-hidden="true">
                {paymentSucceeded ? (
                  <span className="sf-poll-badge is-success">
                    <Check size={24} />
                  </span>
                ) : paymentTerminal || paymentPollAuthError ? (
                  <span className="sf-poll-badge is-error">
                    <AlertCircle size={24} />
                  </span>
                ) : (
                  <div className="sf-processing-ring" />
                )}
              </div>
              <div className="sf-poll-heading-copy">
                <span className="sf-kicker">
                  {paymentSucceeded
                    ? 'PAYMENT CONFIRMED'
                    : paymentPollAuthError
                    ? 'SESSION VERIFICATION REQUIRED'
                    : paymentTerminal
                    ? 'PAYMENT NOT COMPLETED'
                    : isCardOrder
                    ? 'PAYSTACK VERIFICATION'
                    : 'M-PESA STK PUSH'}
                </span>
                <h1>
                  {paymentSucceeded
                    ? 'Your payment is confirmed'
                    : paymentPollAuthError
                    ? 'Sign in to check this payment'
                    : paymentState === 'cancelled'
                    ? isCardOrder
                      ? 'Card payment cancelled'
                      : 'You cancelled the M-PESA prompt'
                    : paymentState === 'failed'
                    ? isCardOrder
                      ? 'Card payment failed'
                      : 'M-PESA payment failed'
                    : paymentState === 'reversed'
                    ? 'Payment reversed'
                    : paymentProviderResponded
                    ? isCardOrder
                      ? 'Verifying card receipt'
                      : 'Verifying M-PESA receipt'
                    : isCardOrder
                    ? 'Confirming your card payment'
                    : 'Enter your M-PESA PIN on your phone'}
                </h1>
                <p className="sf-poll-lead">
                  {paymentSucceeded
                    ? activeOrder.receipt
                      ? `${providerLabel} verified your payment · Receipt ${activeOrder.receipt}.`
                      : `${providerLabel} verified your payment.`
                    : paymentPollAuthError
                    ? 'Your browser session expired or opened on a different host (401 Unauthorized). Sign in again to load your verified payment status.'
                    : paymentTerminal
                    ? failureMessage ||
                      `${providerLabel} confirmed that no funds were collected for this attempt. You can safely retry below.`
                    : paymentProviderResponded
                    ? `${providerLabel} responded. We are verifying your receipt before confirming the order.`
                    : isCardOrder
                    ? 'Keep this page open while Paystack confirms your authorization.'
                    : `Check the prompt sent to ${targetAccount} and approve the ${formatKes(activeOrder.total)} charge.`}
                </p>
              </div>
            </div>

            <ol className="sf-poll-steps" aria-label="Payment progress">
              <li className="is-done">
                <span className="sf-poll-step-dot" aria-hidden="true">
                  <Check size={13} />
                </span>
                <div>
                  <strong>Order created</strong>
                  <small className="sf-mono">{activeOrder.orderNumber}</small>
                </div>
              </li>
              <li className={`is-${step2State}`}>
                <span className="sf-poll-step-dot" aria-hidden="true">
                  {step2State === 'done' ? <Check size={13} /> : step2State === 'error' ? '!' : '2'}
                </span>
                <div>
                  <strong>{isCardOrder ? 'Card approval' : 'M-PESA PIN'}</strong>
                  <small>
                    {step2State === 'done'
                      ? 'Authorized'
                      : step2State === 'error'
                      ? 'Not approved'
                      : isCardOrder
                      ? 'Authorizing'
                      : 'Waiting on phone'}
                  </small>
                </div>
              </li>
              <li className={`is-${step3State}`}>
                <span className="sf-poll-step-dot" aria-hidden="true">
                  {step3State === 'done' ? <Check size={13} /> : step3State === 'error' ? '!' : '3'}
                </span>
                <div>
                  <strong>Receipt verified</strong>
                  <small>
                    {step3State === 'done'
                      ? activeOrder.receipt || 'Confirmed'
                      : step3State === 'error'
                      ? 'Stopped'
                      : step3State === 'active'
                      ? 'Finalizing'
                      : 'Pending'}
                  </small>
                </div>
              </li>
            </ol>

            <div className={`sf-poll-live-row ${paymentSucceeded ? 'is-success' : paymentTerminal || paymentPollAuthError ? 'is-error' : ''}`} role="status">
              <span>
                {paymentSucceeded
                  ? `Payment confirmed by ${providerLabel}.`
                  : paymentPollAuthError
                  ? paymentPollMessage
                  : paymentTerminal
                  ? failureMessage || 'Payment attempt ended.'
                  : paymentPollMessage}
              </span>
              {paymentPollAuthError ? (
                <button
                  type="button"
                  className="sf-poll-refresh-btn"
                  onClick={() => onNavigate('buyer-login')}
                >
                  <span>Sign in again</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                paymentWaiting && (
                  <button
                    type="button"
                    className="sf-poll-refresh-btn"
                    disabled={checkingPollNow}
                    onClick={() => setManualPollTick((tick) => tick + 1)}
                  >
                    <RefreshCw size={14} className={checkingPollNow ? 'is-spinning' : ''} />
                    <span>{checkingPollNow ? 'Checking…' : 'Check now'}</span>
                  </button>
                )
              )}
            </div>
          </article>

          <article className="sf-panel sf-poll-summary">
            <div className="sf-poll-summary-head">
              <span className="sf-kicker">ORDER DETAILS</span>
              <strong className="sf-mono">{activeOrder.orderNumber}</strong>
            </div>
            <div className="sf-poll-summary-rows">
              <div>
                <span>Shop</span>
                <strong>{shopName}</strong>
              </div>
              <div>
                <span>Payment method</span>
                <strong>{isCardOrder ? 'Bank Card (Paystack)' : 'M-PESA STK Push'}</strong>
              </div>
              <div>
                <span>{isCardOrder ? 'Receipt email' : 'M-PESA number'}</span>
                <strong className="sf-mono">{targetAccount}</strong>
              </div>
              <div>
                <span>Items</span>
                <strong className="sf-num">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </strong>
              </div>
              <div className="is-total">
                <span>Total amount</span>
                <strong className="sf-num">{formatKes(activeOrder.total)}</strong>
              </div>
            </div>
          </article>

          {paymentTerminal ? (
            <article className="sf-panel sf-poll-retry-card">
              <div className="sf-poll-retry-head">
                <strong>Try payment again</strong>
                <span>{isCardOrder ? 'Re-open secure Paystack card checkout.' : 'Confirm your M-PESA number and resend the STK prompt.'}</span>
              </div>
              {!isCardOrder && (
                <label className="sf-field">
                  M-PESA phone number
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="07XX XXX XXX or 2547XXXXXXXX"
                    value={retryPaymentPhone}
                    onChange={(event) => setRetryPaymentPhone(event.target.value)}
                    maxLength={16}
                  />
                </label>
              )}
              {retryMessage && (
                <p className="sf-alert" role="status">
                  {retryMessage}
                </p>
              )}
              {cardFallbackUrl && (
                <a className="sf-btn sf-btn-secondary" href={cardFallbackUrl} rel="noopener noreferrer">
                  Open Paystack card page <ArrowRight size={15} />
                </a>
              )}
              <div className="sf-poll-actions">
                <button
                  type="button"
                  className="sf-btn sf-btn-accent"
                  disabled={retryingOrder}
                  onClick={() => (isCardOrder ? void retryActiveOrderWithCard() : void retryActiveOrderPayment())}
                >
                  {isCardOrder ? <CreditCard size={16} /> : <Phone size={16} />}
                  <span>
                    {retryingOrder
                      ? 'Sending request…'
                      : isCardOrder
                      ? 'Retry card payment'
                      : 'Resend M-PESA prompt'}
                  </span>
                </button>
                {isCardOrder && !cardFallbackUrl && !shouldUsePaystackRedirectCheckout() && (
                  <button
                    type="button"
                    className="sf-btn sf-btn-secondary"
                    disabled={retryingOrder}
                    onClick={() => void retryActiveOrderWithCard({ forceRedirect: true })}
                  >
                    Pay on Paystack hosted page <ArrowRight size={15} />
                  </button>
                )}
                <button
                  type="button"
                  className="sf-btn sf-btn-secondary"
                  onClick={() => openOrder(activeOrder, 'order-detail')}
                >
                  View order &amp; switch method
                </button>
              </div>
            </article>
          ) : (
            <>
              {paymentWaiting && (
                <p className="sf-summary-note sf-poll-guard">
                  <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>
                    {isCardOrder
                      ? 'Your order only marks paid after Paystack confirms the charge. Do not submit another card charge while checking.'
                      : 'Your order only marks paid after Safaricom verifies your M-PESA receipt. Do not send a duplicate prompt while waiting.'}
                  </span>
                </p>
              )}
              <div className="sf-poll-actions">
                <button
                  type="button"
                  className="sf-btn sf-btn-primary"
                  onClick={() => openOrder(activeOrder, 'order-detail')}
                >
                  View order details <ArrowRight size={16} />
                </button>
                {paymentSucceeded ? (
                  <button type="button" className="sf-btn sf-btn-secondary" onClick={() => onNavigate('store')}>
                    Continue shopping
                  </button>
                ) : (
                  <button type="button" className="sf-btn sf-btn-secondary" onClick={() => onNavigate('orders')}>
                    My orders
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      </>
    );
  }

  function renderSuccess() {
    if (!activeOrder) {
      return (
        <>
          <CheckoutTopBar title="Order confirmed" onBack={() => onNavigate('store')} />
          <div className="sf-flow">
            <div className="sf-state-box">
              <h2>No preview order yet</h2>
              <button type="button" className="sf-btn sf-btn-primary" onClick={() => onNavigate('store')}>
                Continue shopping
              </button>
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        <CheckoutTopBar title="Order confirmed" onBack={() => onNavigate('store')} />
        <section className="sf-flow">
        <div className="sf-panel" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <span className="sf-state-icon" style={{ background: 'var(--sf-success-bg)', color: 'var(--sf-success)' }}>
              <Check size={26} />
            </span>
            <div>
              <span className="sf-kicker">ORDER CONFIRMATION</span>
              <h1 style={{ fontSize: 28 }}>Thank you for your order</h1>
              <p style={{ margin: '4px 0 0', color: 'var(--sf-muted)' }}>
                Order number <strong className="sf-mono">{activeOrder.orderNumber}</strong>
              </p>
            </div>
          </div>

          <div
            className={`sf-alert ${activeOrder.paymentStatus === 'succeeded' ? 'success' : 'warn'}`}
            style={{ marginTop: 18 }}
          >
            <ShieldCheck size={17} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              {activeOrder.paymentStatus === 'succeeded'
                ? `Payment confirmed${activeOrder.receipt ? ` · Receipt ${activeOrder.receipt}` : ''}.`
                : activeOrder.paymentStatus === 'failed' || activeOrder.paymentStatus === 'cancelled'
                ? `${activeOrder.paymentMethod === 'card' ? 'Card' : 'M-PESA'} payment was not completed. This order is not paid.`
                : `Your order has been created. Payment is pending ${activeOrder.paymentMethod === 'card' ? 'Paystack' : 'Safaricom'} confirmation; do not retry unless the payment has failed or expired.`}
            </span>
          </div>
        </div>

        <div className="sf-account-grid" style={{ marginBottom: 24 }}>
          <div className="sf-panel" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <span className="sf-assurance-icon">
              <MapPin size={19} />
            </span>
            <div>
              <strong>Delivery coordination</strong>
              <p style={{ margin: '4px 0', fontSize: 13.5, color: 'var(--sf-ink-2)' }}>
                You can message the seller about this order from Inbox &amp; messages in your account.
              </p>
              <small style={{ color: 'var(--sf-muted)' }}>
                {activeOrder.deliveryMethod === 'pickup'
                  ? 'Your preferred pickup station is saved with this order.'
                  : 'Your delivery address is saved with this order.'}
              </small>
            </div>
          </div>

          <div className="sf-panel" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <span className="sf-assurance-icon">
              <WalletCards size={19} />
            </span>
            <div>
              <strong>{paymentLabels[activeOrder.paymentMethod]}</strong>
              <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--sf-ink-2)' }}>
                {activeOrder.paymentStatus === 'succeeded'
                  ? 'Payment successful.'
                  : activeOrder.paymentStatus === 'failed'
                  ? 'Payment failed.'
                  : activeOrder.paymentStatus === 'cancelled'
                  ? 'Payment cancelled.'
                  : activeOrder.paymentMethod === 'card'
                  ? 'Awaiting Paystack confirmation.'
                  : 'Awaiting M-PESA confirmation.'}
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 36 }}>
          <button
            type="button"
            className="sf-btn sf-btn-secondary"
            onClick={() => openOrder(activeOrder, 'orders')}
          >
            My orders
          </button>
          <button
            type="button"
            className="sf-btn sf-btn-primary"
            onClick={() => openOrder(activeOrder, 'order-detail')}
          >
            See order details <ArrowRight size={16} />
          </button>
        </div>

        {products.length > 0 && (
          <section className="sf-section">
            <div className="sf-section-head">
              <h2>Top picks from {shopName}</h2>
              <button type="button" className="sf-link-action" onClick={() => onNavigate('store')}>
                See all <ArrowRight size={14} />
              </button>
            </div>
            <div className="sf-product-grid">
              {products.slice(0, 4).map((product) => (
                <article className="sf-card" key={product.id}>
                  <button
                    type="button"
                    className="sf-card-open"
                    onClick={() => onOpenProduct?.(product)}
                  >
                    <span className="sf-card-media">
                      <ProductThumb product={product} />
                    </span>
                    <div className="sf-card-body">
                      <span className="sf-card-cat">{product.category || 'Product'}</span>
                      <span className="sf-card-title">{product.name}</span>
                      <div className="sf-card-meta-row">
                        <strong className="sf-card-price">{formatKes(product.price)}</strong>
                      </div>
                    </div>
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}
        </section>
      </>
    );
  }

  function renderOrders() {
    const stateOf = (order: BuyerOrder) => ({
      order: String(order.orderStatus || '').toLowerCase(),
      delivery: String(order.deliveryStatus || '').toLowerCase(),
      payment: String(order.paymentStatus || '').toLowerCase(),
    });
    const isCancelled = (order: BuyerOrder) => {
      const s = stateOf(order);
      return (
        ['cancelled', 'returned', 'refunded'].includes(s.order) ||
        ['cancelled', 'returned'].includes(s.delivery) ||
        s.payment === 'cancelled'
      );
    };
    const isDelivered = (order: BuyerOrder) => {
      const s = stateOf(order);
      return s.delivery === 'delivered' || ['fulfilled', 'delivered'].includes(s.order);
    };
    const activeOrderTab = view.startsWith('orders/')
      ? (view.split('/')[1] as 'ongoing' | 'delivered' | 'cancelled')
      : 'ongoing';
    const tabOrders = orders.filter(
      (order) =>
        order.orderNumber &&
        (activeOrderTab === 'ongoing'
          ? !isCancelled(order) && !isDelivered(order)
          : activeOrderTab === 'delivered'
          ? isDelivered(order)
          : isCancelled(order)),
    );
    const suggestions = products.filter((product) => product.stockQuantity !== 0).slice(0, 8);

    return (
      <section className="sf-flow">
        <FlowHeading
          title="My orders"
          subtitle="View your purchases and follow their latest updates."
          onBack={() => onNavigate('account')}
          backLabel="My account"
        />

        {paystackReturnBanner && (() => {
          const matchedOrder = orders.find((entry) => entry.orderNumber === paystackReturnBanner.orderNumber);
          const effectiveStatus =
            String(matchedOrder?.paymentStatus || '').toLowerCase() === 'succeeded'
              ? 'succeeded'
              : paystackReturnBanner.status;
          const isSucceeded = effectiveStatus === 'succeeded';
          const isSuccess = isSucceeded || effectiveStatus === 'processing';
          const isFailure = effectiveStatus === 'failed' || effectiveStatus === 'cancelled';
          const reasonCode = paystackReturnBanner.reason;
          const failureTitle =
            effectiveStatus === 'cancelled'
              ? `Card payment cancelled for #${paystackReturnBanner.orderNumber}`
              : effectiveStatus === 'failed'
              ? `Card payment could not be completed for #${paystackReturnBanner.orderNumber}`
              : isSucceeded
              ? `Card payment confirmed for #${paystackReturnBanner.orderNumber}`
              : effectiveStatus === 'processing'
              ? `Card payment submitted for #${paystackReturnBanner.orderNumber}`
              : `Card payment pending for #${paystackReturnBanner.orderNumber}`;
          const failureBody =
            reasonCode === '3ds_authentication_failed'
              ? '3-D Secure card authentication did not complete or was declined by your bank. Open order details to retry card payment or switch to M-PESA.'
              : reasonCode === 'cardholder_unauthorized'
              ? 'Your bank reported the cardholder authorization check as unsuccessful. Verify your card or bank 3-D Secure settings and try again.'
              : reasonCode === 'provider_unauthorized'
              ? 'Paystack authorization failed while verifying this payment (401 Unauthorized). Contact the seller or support before retrying.'
              : reasonCode === 'declined'
              ? 'Your card issuer declined this payment. Try another card or pay with M-PESA.'
              : reasonCode === 'abandoned'
              ? 'The card checkout session was closed before 3-D Secure verification finished. Open order details to retry.'
              : effectiveStatus === 'cancelled'
              ? 'Card checkout was cancelled and no payment was collected. Open order details to retry.'
              : effectiveStatus === 'failed'
              ? 'The card transaction failed and no payment was collected. Open order details to see details and retry.'
              : isSucceeded
              ? matchedOrder?.receipt
                ? `Paystack verified your card payment · Receipt ${matchedOrder.receipt}.`
                : 'Paystack verified your card payment and your order is now paid.'
              : effectiveStatus === 'processing'
              ? 'Paystack verified your card session. Your order status will update to Paid as soon as confirmation finishes.'
              : 'Your card payment has not completed yet. Open order details to resume or check status.';
          return (
            <div
              className={`sf-alert ${isSuccess ? 'success' : isFailure ? 'error' : 'warn'}`}
              style={{ marginBottom: 16 }}
              role="status"
            >
              {isFailure ? (
                <AlertCircle size={17} style={{ flexShrink: 0, marginTop: 2 }} />
              ) : (
                <ShieldCheck size={17} style={{ flexShrink: 0, marginTop: 2 }} />
              )}
              <div style={{ flex: 1 }}>
                <strong>{failureTitle}</strong>
                <div>{matchedOrder?.paymentFailureReason || failureBody}</div>
              </div>
              {matchedOrder && (
                <button
                  type="button"
                  className="sf-btn sf-btn-ghost"
                  style={{ minHeight: 32, padding: '0 8px' }}
                  onClick={() => openOrder(matchedOrder, 'order-detail')}
                >
                  View order
                </button>
              )}
              <button
                type="button"
                className="sf-btn sf-btn-ghost"
                style={{ minHeight: 32, padding: '0 8px' }}
                onClick={() => setPaystackReturnBanner(null)}
              >
                Dismiss
              </button>
            </div>
          );
        })()}

        {ordersLoading && (
          <p style={{ fontSize: 13, color: 'var(--sf-muted)', marginBottom: 12 }}>Refreshing your order history…</p>
        )}
        {ordersError && (
          <p className="sf-alert error" style={{ marginBottom: 16 }} role="alert">
            {ordersError}
          </p>
        )}

        <nav className="sf-tabs" aria-label="Filter orders">
          <button
            type="button"
            className={`sf-tab ${activeOrderTab === 'ongoing' ? 'is-active' : ''}`}
            onClick={() => onNavigate('orders/ongoing')}
          >
            <span>Ongoing</span>
            <b>{orders.filter((o) => !isCancelled(o) && !isDelivered(o)).length}</b>
          </button>
          <button
            type="button"
            className={`sf-tab ${activeOrderTab === 'delivered' ? 'is-active' : ''}`}
            onClick={() => onNavigate('orders/delivered')}
          >
            <span>Delivered</span>
            <b>{orders.filter(isDelivered).length}</b>
          </button>
          <button
            type="button"
            className={`sf-tab ${activeOrderTab === 'cancelled' ? 'is-active' : ''}`}
            onClick={() => onNavigate('orders/cancelled')}
          >
            <span>Cancelled</span>
            <b>{orders.filter(isCancelled).length}</b>
          </button>
        </nav>

        {tabOrders.length ? (
          <div className="sf-orders-list">
            {tabOrders.map((order) => {
              const status = stateOf(order);
              const statusText =
                status.delivery === 'delivered'
                  ? 'Delivered'
                  : status.delivery === 'in_transit'
                  ? 'On the way'
                  : status.order === 'processing'
                  ? 'Processing'
                  : status.payment === 'failed'
                  ? 'Payment failed'
                  : status.payment === 'cancelled'
                  ? 'Payment cancelled'
                  : status.payment === 'succeeded'
                  ? 'Paid'
                  : status.payment === 'pending' && order.paymentMethod === 'card'
                  ? 'Awaiting card confirmation'
                  : 'Order placed';
              const statusClass =
                status.delivery === 'delivered' || status.payment === 'succeeded'
                  ? 'is-success'
                  : status.payment === 'failed' || status.payment === 'cancelled' || isCancelled(order)
                  ? 'is-danger'
                  : 'is-pending';

              return (
                <article className="sf-order-card" key={order.orderNumber}>
                  <div className="sf-order-top">
                    <div>
                      <small>ORDER NUMBER</small>
                      <strong>#{order.orderNumber}</strong>
                      <span className="sf-order-date">
                        ·{' '}
                        {new Date(order.createdAt).toLocaleDateString('en-KE', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <span className={`sf-status-text ${statusClass}`}>{statusText}</span>
                  </div>

                  <div className="sf-order-items">
                    {order.lines.slice(0, 2).map(({ product, quantity, lineTotal }) => (
                      <div className="sf-order-item" key={product.id}>
                        <div className="sf-order-item-img">
                          <ProductThumb product={product} />
                        </div>
                        <div>
                          <strong>{product.name}</strong>
                          <span>Qty: {quantity}</span>
                        </div>
                        <b>{formatKes(lineTotal ?? product.price * quantity)}</b>
                      </div>
                    ))}
                    {order.lines.length > 2 && (
                      <div style={{ fontSize: 13, color: 'var(--sf-muted)' }}>
                        +{order.lines.length - 2} more item{order.lines.length - 2 === 1 ? '' : 's'}
                      </div>
                    )}
                    {!order.lines.length && (
                      <div style={{ fontSize: 13, color: 'var(--sf-muted)' }}>Order items are being retrieved.</div>
                    )}
                  </div>

                  <div className="sf-order-bottom">
                    <div>
                      <small>ORDER TOTAL</small>
                      <strong>{formatKes(order.total)}</strong>
                    </div>
                    <div className="sf-order-actions">
                      <button
                        type="button"
                        className="sf-btn sf-btn-secondary"
                        onClick={() => openOrder(order, 'order-detail')}
                      >
                        View details
                      </button>
                      {isDelivered(order) ? (
                        <button
                          type="button"
                          className="sf-btn sf-btn-primary"
                          onClick={() => onNavigate('store')}
                        >
                          Shop again <ArrowRight size={15} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="sf-btn sf-btn-primary"
                          onClick={() => {
                            if (isCancelled(order)) {
                              const restartCart = Object.fromEntries(
                                order.lines
                                  .filter((line) => products.some((product) => product.id === line.product.id))
                                  .map((line) => [line.product.id, line.quantity]),
                              );
                              if (Object.keys(restartCart).length) {
                                onCartChange(restartCart);
                                setDeliveryMethod(order.deliveryMethod);
                                setDeliveryCounty(order.deliveryCounty || '');
                                setDeliverySubCounty(order.deliverySubCounty || '');
                                setDeliveryEstate(order.deliveryEstate || '');
                                setDeliveryAddress(order.deliveryAddress || '');
                                setDeliveryDirections(order.deliveryDirections || '');
                                setPickupStation(order.pickupStation || '');
                                onNavigate('checkout/delivery');
                              } else {
                                onNavigate('store');
                              }
                            } else {
                              openOrder(order, 'order-tracking');
                            }
                          }}
                        >
                          {isCancelled(order) ? 'Reorder' : 'Track order'} <ArrowRight size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="sf-state-box">
            <span className="sf-state-icon">
              <Package size={26} />
            </span>
            <h2>
              {activeOrderTab === 'ongoing'
                ? 'No ongoing orders yet'
                : activeOrderTab === 'delivered'
                ? 'No delivered orders yet'
                : 'No cancelled or returned orders'}
            </h2>
            <p>
              {activeOrderTab === 'ongoing'
                ? 'When you place an order, you can follow its payment and delivery progress here.'
                : 'Orders matching this status will appear here.'}
            </p>
            <button type="button" className="sf-btn sf-btn-primary" onClick={() => onNavigate('store')}>
              Explore products <ArrowRight size={16} />
            </button>
          </div>
        )}

        {suggestions.length > 0 && (
          <section className="sf-section">
            <div className="sf-section-head">
              <h2>You may also like</h2>
              <button type="button" className="sf-link-action" onClick={() => onNavigate('store')}>
                View shop <ArrowRight size={14} />
              </button>
            </div>
            <div className="sf-product-grid">
              {suggestions.slice(0, 4).map((product) => (
                <article className="sf-card" key={product.id}>
                  <button
                    type="button"
                    className="sf-card-open"
                    onClick={() => onOpenProduct?.(product)}
                  >
                    <span className="sf-card-media">
                      <ProductThumb product={product} />
                    </span>
                    <div className="sf-card-body">
                      <span className="sf-card-cat">{product.category || 'Product'}</span>
                      <span className="sf-card-title">{product.name}</span>
                      <div className="sf-card-meta-row">
                        <strong className="sf-card-price">{formatKes(product.price)}</strong>
                      </div>
                    </div>
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}
      </section>
    );
  }

  function renderOrderDetail() {
    if (!activeOrder)
      return (
        <div className="sf-flow">
          <FlowHeading title="Order details" onBack={() => onNavigate('orders')} backLabel="My orders" />
          <div className="sf-state-box">
            <h2>No order selected</h2>
            <button type="button" className="sf-btn sf-btn-primary" onClick={() => onNavigate('orders')}>
              View my orders
            </button>
          </div>
        </div>
      );

    const paymentState = String(activeOrder.paymentStatus || 'unpaid').toLowerCase();
    const orderState = String(activeOrder.orderStatus || '').toLowerCase();
    const deliveryState = String(activeOrder.deliveryStatus || 'pending_delivery').toLowerCase();
    const paid = ['succeeded', 'success', 'paid'].includes(paymentState);
    const cashDue =
      activeOrder.paymentMethod === 'delivery' && !paid && !['cancelled', 'refunded'].includes(orderState);
    const cancelled = paymentState === 'cancelled' || orderState === 'cancelled';
    const failed = paymentState === 'failed';
    const orderClosed = ['cancelled', 'returned', 'refunded'].includes(orderState);
    const canRetryPayment = Boolean(
      activeOrder.orderId && !paid && !cashDue && !orderClosed && (activeOrder.lines?.length || 0) > 0,
    );

    const paymentLabel =
      orderState === 'refunded' || paymentState === 'refunded'
        ? 'Refunded'
        : paid
        ? 'Paid'
        : cashDue
        ? activeOrder.deliveryMethod === 'pickup'
          ? 'Cash due on pickup'
          : 'Cash due on delivery'
        : cancelled
        ? 'Payment cancelled'
        : failed
        ? 'Payment failed'
        : paymentState === 'pending'
        ? 'Awaiting confirmation'
        : 'Not yet paid';

    const deliveryLabel =
      deliveryState === 'delivered'
        ? 'Delivered'
        : deliveryState === 'in_transit'
        ? 'On the way'
        : orderState === 'processing'
        ? 'Being prepared'
        : orderState === 'fulfilled'
        ? 'Ready for delivery'
        : cancelled
        ? 'Cancelled'
        : 'Order received';

    const isDelivered = deliveryState === 'delivered';
    const processing =
      ['processing', 'fulfilled'].includes(orderState) || ['in_transit', 'delivered'].includes(deliveryState);
    const inTransit = ['in_transit', 'delivered'].includes(deliveryState);
    const steps = [
      { label: 'Order placed', done: true },
      { label: 'Payment confirmed', done: paid },
      { label: 'Processing', done: processing },
      { label: 'Out for delivery', done: inTransit },
      { label: 'Delivered', done: isDelivered },
    ];
    const currentStepIdx = steps.findIndex((item) => !item.done);

    return (
      <section className="sf-flow">
        {paymentCelebration && (
          <div className="sf-alert success" style={{ marginBottom: 18 }} role="status" aria-live="polite">
            <Check size={18} />
            <div>
              <strong>Payment successful!</strong> Your order is confirmed. Thank you for shopping.
            </div>
          </div>
        )}

        <FlowHeading title="Order details" onBack={() => onNavigate('orders')} backLabel="My orders" />

        <div className="sf-checkout-stack">
          {/* Overview & Progress Header */}
          <header className="sf-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <span className="sf-kicker">ORDER DETAILS</span>
                <h2 style={{ fontSize: 24, marginTop: 4 }} className="sf-mono">
                  Order #{activeOrder.orderNumber}
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--sf-muted)' }}>
                  Placed on{' '}
                  {new Date(activeOrder.createdAt).toLocaleString('en-KE', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="sf-kicker">ORDER TOTAL</span>
                <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--sf-font-display)' }} className="sf-num">
                  {formatKes(activeOrder.total)}
                </div>
                <div style={{ marginTop: 6, fontSize: 12.5 }}>
                  <span className={`sf-status-text ${paid ? 'is-success' : cancelled || failed ? 'is-danger' : 'is-pending'}`}>
                    Payment: {paymentLabel}
                  </span>
                  <span style={{ margin: '0 8px', color: 'var(--sf-muted)' }}>·</span>
                  <span className={`sf-status-text ${isDelivered ? 'is-success' : 'is-muted'}`}>
                    Delivery: {deliveryLabel}
                  </span>
                </div>
              </div>
            </div>

            <div className="sf-order-steps" aria-label="Order progress">
              {steps.map((step, index) => (
                <div
                  key={step.label}
                  className={`sf-order-step ${step.done ? 'is-done' : index === currentStepIdx ? 'is-current' : ''}`}
                >
                  <div className="sf-order-step-bar" />
                  <span className="sf-order-step-label">
                    {step.done ? <Check size={13} /> : <span className="sf-mono">{index + 1}.</span>}
                    {step.label}
                  </span>
                </div>
              ))}
            </div>

            {(cancelled || failed) && (
              <p className="sf-alert error" style={{ marginTop: 16 }} role="status">
                {activeOrder.paymentFailureReason
                  ? activeOrder.paymentFailureReason
                  : cancelled
                  ? activeOrder.paymentMethod === 'card'
                    ? 'Card payment cancelled. No payment was collected.'
                    : 'M-PESA prompt cancelled. No payment was collected.'
                  : 'The payment was not completed. No payment was collected.'}{' '}
                You can retry when ready.
              </p>
            )}
          </header>

          <div className="sf-two-col">
            <div className="sf-checkout-stack">
              {/* Items */}
              <section className="sf-panel">
                <div className="sf-panel-head">
                  <div>
                    <h3>Items in your order</h3>
                    <p>
                      {activeOrder.lines.length
                        ? `${activeOrder.lines.reduce((n, line) => n + line.quantity, 0)} item(s) purchased`
                        : 'Order contents unavailable'}
                    </p>
                  </div>
                </div>
                {activeOrder.lines.length ? (
                  <div className="sf-order-items" style={{ padding: 0 }}>
                    {activeOrder.lines.map(({ product, quantity, lineTotal }) => (
                      <article className="sf-order-item" key={product.id}>
                        <div className="sf-order-item-img">
                          <ProductThumb product={product} />
                        </div>
                        <div>
                          <strong>{product.name}</strong>
                          <span>
                            Qty: {quantity} · {formatKes(product.price)} each
                          </span>
                          {isDelivered && paid && (
                            <div>
                              <button
                                type="button"
                                className="sf-auth-link"
                                onClick={() => onOpenProduct?.(product)}
                              >
                                ★ Review product
                              </button>
                            </div>
                          )}
                        </div>
                        <b>{formatKes(lineTotal ?? product.price * quantity)}</b>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="sf-alert warn" role="alert">
                    <div>
                      <strong>Order items are unavailable</strong>
                      <p style={{ margin: '4px 0 8px' }}>
                        Do not make another payment for this order. Contact the shop or open a report so the order can
                        be checked.
                      </p>
                      <button
                        type="button"
                        className="sf-btn sf-btn-secondary"
                        onClick={() => onNavigate('my-reports')}
                      >
                        Get help with this order
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* Delivery Info */}
              <section className="sf-panel">
                <div className="sf-panel-head">
                  <div>
                    <h3>Delivery information</h3>
                    <p>{activeOrder.deliveryMethod === 'pickup' ? 'Collection details' : 'Delivery destination'}</p>
                  </div>
                </div>
                <div className="sf-checkout-stack" style={{ gap: 12 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <MapPin size={18} style={{ flexShrink: 0, marginTop: 2, color: 'var(--sf-muted)' }} />
                    <div>
                      <strong>{activeOrder.deliveryMethod === 'pickup' ? 'Collection point' : 'Delivery address'}</strong>
                      <p style={{ margin: '2px 0 0', fontSize: 14, color: 'var(--sf-ink-2)' }}>
                        {activeOrder.deliveryMethod === 'pickup'
                          ? activeOrder.pickupStation || 'Collection point to be confirmed'
                          : [
                              activeOrder.deliveryCounty,
                              activeOrder.deliverySubCounty,
                              activeOrder.deliveryEstate,
                              activeOrder.deliveryAddress,
                            ]
                              .filter(Boolean)
                              .join(', ') || 'Delivery destination not recorded'}
                        {activeOrder.deliveryDirections ? ` · ${activeOrder.deliveryDirections}` : ''}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <UserRound size={18} style={{ flexShrink: 0, marginTop: 2, color: 'var(--sf-muted)' }} />
                    <div>
                      <strong>{activeOrder.customerName}</strong>
                      <p style={{ margin: '2px 0 0', fontSize: 14, color: 'var(--sf-ink-2)' }}>
                        {activeOrder.customerPhone}
                        {activeOrder.customerEmail ? ` · ${activeOrder.customerEmail}` : ''}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Right column: Summary + Payment + Actions */}
            <div className="sf-checkout-stack">
              <section className="sf-panel">
                <div className="sf-panel-head">
                  <h3>Order summary</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="sf-summary-row">
                    <span>Items subtotal</span>
                    <strong>{formatKes(activeOrder.subtotal)}</strong>
                  </div>
                  <div className="sf-summary-row">
                    <span>Delivery fee</span>
                    <strong>{formatKes(activeOrder.deliveryFee)}</strong>
                  </div>
                  {activeOrder.discount ? (
                    <div className="sf-summary-row">
                      <span>Discount</span>
                      <strong>−{formatKes(activeOrder.discount)}</strong>
                    </div>
                  ) : null}
                  <div className="sf-summary-row sf-summary-total">
                    <span>{paid ? 'Total paid' : 'Order total'}</span>
                    <strong>{formatKes(activeOrder.total)}</strong>
                  </div>
                </div>
              </section>

              <section className="sf-panel">
                <div className="sf-panel-head">
                  <div>
                    <h3>Payment information</h3>
                    <p>{paymentLabels[activeOrder.paymentMethod]}</p>
                  </div>
                  <span className={`sf-status-text ${paid ? 'is-success' : canRetryPayment ? 'is-pending' : 'is-muted'}`}>
                    {paymentLabel}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 13.5, color: 'var(--sf-ink-2)' }}>
                  {activeOrder.receipt ? (
                    <>
                      Receipt: <strong className="sf-mono">{activeOrder.receipt}</strong>
                    </>
                  ) : cancelled || failed ? (
                    activeOrder.paymentFailureReason || (cancelled ? 'No payment collected' : 'Payment was not completed')
                  ) : (
                    'Payment reference will appear when confirmed'
                  )}
                </p>

                {activeOrder.paymentIssue && (
                  <div className="sf-alert warn" style={{ marginTop: 12 }} role="status">
                    <div>
                      <strong>Payment received — shop confirmation needed</strong>
                      <div>{activeOrder.paymentIssue}</div>
                    </div>
                  </div>
                )}

                {canRetryPayment && (
                  <div
                    style={{
                      marginTop: 16,
                      paddingTop: 16,
                      borderTop: '1px solid var(--sf-line)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    <div>
                      <strong>
                        {paymentState === 'pending'
                          ? 'Payment is awaiting confirmation'
                          : cancelled
                          ? 'Payment was cancelled'
                          : 'Finish paying for this order'}
                      </strong>
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--sf-muted)' }}>
                        {activeOrder.paymentMethod === 'card'
                          ? paymentState === 'pending'
                            ? 'Open the secure card fields right here to finish payment, or check if your transaction already cleared.'
                            : 'No card payment was collected. Open the secure card fields here when ready.'
                          : paymentState === 'pending'
                          ? 'Check the previous M-PESA request first. Do not send another prompt while Safaricom is still processing it.'
                          : 'No payment was collected. You can request a fresh M-PESA prompt when ready.'}
                      </p>
                    </div>
                    {activeOrder.paymentMethod === 'card' && !showMpesaSwitchRetry ? (
                      <>
                        <button
                          type="button"
                          className="sf-btn sf-btn-accent"
                          onClick={() => void retryActiveOrderWithCard()}
                          disabled={retryingOrder}
                        >
                          {retryingOrder
                            ? 'Loading card fields…'
                            : paymentState === 'pending'
                            ? 'Enter card details / check payment'
                            : 'Enter card details'}
                        </button>
                        {!cardFallbackUrl && !shouldUsePaystackRedirectCheckout() && (
                          <button
                            type="button"
                            className="sf-btn sf-btn-secondary"
                            onClick={() => void retryActiveOrderWithCard({ forceRedirect: true })}
                            disabled={retryingOrder}
                          >
                            Pay on Paystack hosted page <ArrowRight size={15} />
                          </button>
                        )}
                        <button
                          type="button"
                          className="sf-btn sf-btn-ghost"
                          style={{ fontSize: 12.5 }}
                          onClick={() => {
                            setRetryMessage('');
                            setCardFallbackUrl(null);
                            setShowMpesaSwitchRetry(true);
                          }}
                        >
                          Pay with M-PESA instead
                        </button>
                      </>
                    ) : (
                      <>
                        <label className="sf-field">
                          M-PESA number
                          <input
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            value={retryPaymentPhone}
                            onChange={(e) => setRetryPaymentPhone(e.target.value)}
                            placeholder="07XX XXX XXX or 2547XXXXXXXX"
                            maxLength={16}
                          />
                        </label>
                        <button
                          type="button"
                          className="sf-btn sf-btn-accent"
                          onClick={retryActiveOrderPayment}
                          disabled={retryingOrder}
                        >
                          {retryingOrder
                            ? 'Checking M-PESA…'
                            : paymentState === 'pending'
                            ? 'Check payment / retry if failed'
                            : 'Retry M-PESA payment'}
                        </button>
                        {activeOrder.paymentMethod === 'card' && (
                          <button
                            type="button"
                            className="sf-btn sf-btn-ghost"
                            style={{ fontSize: 12.5 }}
                            onClick={() => {
                              setRetryMessage('');
                              setCardFallbackUrl(null);
                              setShowMpesaSwitchRetry(false);
                            }}
                          >
                            Back to card payment
                          </button>
                        )}
                      </>
                    )}
                    {retryMessage && (
                      <small className="sf-alert" role="status">
                        {retryMessage}
                      </small>
                    )}
                    {cardFallbackUrl && activeOrder.paymentMethod === 'card' && (
                      <a className="sf-btn sf-btn-secondary" href={cardFallbackUrl} rel="noopener noreferrer">
                        Open Paystack card page <ArrowRight size={15} />
                      </a>
                    )}
                  </div>
                )}
              </section>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  type="button"
                  className="sf-btn sf-btn-primary"
                  onClick={() => openOrder(activeOrder, 'order-tracking')}
                >
                  Track order <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  className="sf-btn sf-btn-secondary"
                  onClick={() => openOrder(activeOrder, 'inbox')}
                >
                  <MessageCircle size={16} /> Message seller
                </button>
                <button
                  type="button"
                  className="sf-btn sf-btn-ghost"
                  onClick={() => onNavigate('store')}
                >
                  <ShoppingBag size={16} /> Shop again
                </button>
              </div>
            </div>
          </div>

          <p className="sf-summary-note">
            <ShieldCheck size={16} />
            <span>Keep your order number and payment receipt. Never share your M-PESA PIN or verification codes.</span>
          </p>
        </div>
      </section>
    );
  }

  function renderTracking() {
    if (!activeOrder)
      return (
        <div className="sf-flow">
          <FlowHeading title="Package history" onBack={() => onNavigate('orders')} backLabel="My orders" />
          <div className="sf-state-box">
            <h2>No order selected</h2>
            <button type="button" className="sf-btn sf-btn-primary" onClick={() => onNavigate('orders')}>
              View my orders
            </button>
          </div>
        </div>
      );

    const step3Complete =
      ['processing', 'fulfilled'].includes(String(activeOrder.orderStatus || '')) ||
      ['in_transit', 'delivered'].includes(String(activeOrder.deliveryStatus || ''));

    return (
      <section className="sf-flow">
        <FlowHeading title="Package history" onBack={() => onNavigate('order-detail')} backLabel="Order details" />

        <div className="sf-panel" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <span className="sf-kicker">ORDER NUMBER</span>
              <div style={{ fontSize: 20, fontWeight: 700 }} className="sf-mono">
                #{activeOrder.orderNumber}
              </div>
            </div>
            <span className="sf-status-text is-pending">
              {activeOrder.deliveryStatus === 'delivered'
                ? 'Delivered'
                : activeOrder.deliveryStatus === 'in_transit'
                ? 'In transit'
                : 'Tracking active'}
            </span>
          </div>
        </div>

        <div className="sf-panel" style={{ marginBottom: 24 }}>
          <div className="sf-timeline">
            <article className="sf-timeline-item is-complete">
              <span className="sf-timeline-node">
                <Check size={14} />
              </span>
              <div>
                <strong>Order placed</strong>
                <small>{new Date(activeOrder.createdAt).toLocaleString('en-KE')}</small>
                <p>Your order was received by the shop and saved to its order records.</p>
              </div>
            </article>

            <article
              className={`sf-timeline-item ${
                activeOrder.paymentStatus === 'succeeded' ? 'is-complete' : 'is-current'
              }`}
            >
              <span className="sf-timeline-node">
                {activeOrder.paymentStatus === 'succeeded' ? <Check size={14} /> : '2'}
              </span>
              <div>
                <strong>
                  {activeOrder.paymentStatus === 'succeeded'
                    ? 'Payment confirmed'
                    : activeOrder.paymentStatus === 'failed'
                    ? 'Payment failed'
                    : activeOrder.paymentStatus === 'cancelled'
                    ? 'Payment cancelled'
                    : 'Payment awaiting confirmation'}
                </strong>
                <small>{activeOrder.receipt || activeOrder.paymentStatus || 'Pending'}</small>
                <p>
                  {activeOrder.paymentStatus === 'succeeded'
                    ? 'Safaricom confirmed this payment.'
                    : activeOrder.paymentStatus === 'cancelled'
                    ? 'Safaricom confirmed that you cancelled the M-PESA prompt. No payment was collected; return to Order details to retry when ready.'
                    : activeOrder.paymentStatus === 'failed'
                    ? 'Safaricom confirmed that this payment failed. No payment was collected; return to Order details to retry.'
                    : 'The M-PESA request is still awaiting a final result from Safaricom. You can retry only after it is confirmed failed or cancelled.'}
                </p>
              </div>
            </article>

            <article className={`sf-timeline-item ${step3Complete ? 'is-complete' : ''}`}>
              <span className="sf-timeline-node">{step3Complete ? <Check size={14} /> : '3'}</span>
              <div>
                <strong>
                  {activeOrder.deliveryStatus === 'in_transit'
                    ? 'In transit'
                    : activeOrder.deliveryStatus === 'delivered'
                    ? 'Fulfilment complete'
                    : activeOrder.orderStatus === 'processing'
                    ? 'Processing'
                    : activeOrder.orderStatus === 'fulfilled'
                    ? 'Fulfilled'
                    : 'Preparing your order'}
                </strong>
                <small>
                  {activeOrder.deliveryUpdatedAt
                    ? new Date(activeOrder.deliveryUpdatedAt).toLocaleString('en-KE')
                    : 'Waiting for seller update'}
                </small>
                <p>
                  {activeOrder.deliveryStatus === 'in_transit'
                    ? 'The seller has marked your order as on its way.'
                    : activeOrder.deliveryStatus === 'delivered'
                    ? 'The seller has marked this order as delivered.'
                    : 'The seller will update this step as your order is prepared.'}
                </p>
              </div>
            </article>

            <article
              className={`sf-timeline-item ${activeOrder.deliveryStatus === 'delivered' ? 'is-complete' : ''}`}
            >
              <span className="sf-timeline-node">
                {activeOrder.deliveryStatus === 'delivered' ? <Check size={14} /> : '4'}
              </span>
              <div>
                <strong>Delivered</strong>
                <small>
                  {activeOrder.deliveryStatus === 'delivered' && activeOrder.deliveryUpdatedAt
                    ? new Date(activeOrder.deliveryUpdatedAt).toLocaleString('en-KE')
                    : 'Not yet delivered'}
                </small>
              </div>
            </article>
          </div>
          <p className="sf-summary-note" style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--sf-line)' }}>
            <ShieldCheck size={15} />
            <span>
              Payment and delivery status are retrieved from the order conversation service. Delivery updates appear when
              the seller records them.
            </span>
          </p>
        </div>

        {chatPanel}
      </section>
    );
  }

  async function changePassword(e: any) {
    e.preventDefault();
    if (passwordSaving) return;
    setPasswordMessage('');
    if (newPassword !== confirmPassword) {
      setPasswordMessage('The new passwords do not match.');
      return;
    }
    setPasswordSaving(true);
    try {
      const r = await fetch('/api/buyer-auth?action=change-password&slug=' + encodeURIComponent(slug), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, currentPassword, newPassword }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw Error(d.error || 'Password could not be changed.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage('Your password has been changed successfully.');
    } catch (e: any) {
      setPasswordMessage(e.message || 'Password could not be changed.');
    } finally {
      setPasswordSaving(false);
    }
  }

  async function saveProfile(e: any) {
    e.preventDefault();
    if (profileSaving) return;
    setProfileSaving(true);
    setProfileMessage('');
    try {
      const r = await fetch('/api/buyer-auth?action=update-profile&slug=' + encodeURIComponent(slug), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          name: profileName,
          email: profileEmail,
          alternativePhone: profilePhoneAlt,
          address: profileAddress,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw Error(d.error || 'Profile could not be saved.');
      onProfileUpdated?.(d.customer);
      setProfileMessage('Your profile has been updated.');
    } catch (e: any) {
      setProfileMessage(e.message || 'Profile could not be saved.');
    } finally {
      setProfileSaving(false);
    }
  }

  function renderProfile() {
    return (
      <section className="sf-flow">
        <FlowHeading
          title="My profile"
          subtitle="Keep your contact details up to date for orders, delivery and support."
          onBack={() => onNavigate('account')}
          backLabel="My account"
        />
        <form className="sf-panel sf-checkout-stack" onSubmit={saveProfile}>
          <div className="sf-panel-head">
            <div>
              <h2>Personal information</h2>
              <p>Fields marked required must be completed</p>
            </div>
          </div>
          <div className="sf-form-grid">
            <label className="sf-field">
              <span>
                Full name <em>Required</em>
              </span>
              <input
                name="buyer-profile-display-name"
                type="text"
                required
                minLength={2}
                maxLength={120}
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                autoComplete="name"
              />
            </label>
            <label className="sf-field">
              <span>
                Email address <em>Required</em>
              </span>
              <input
                type="email"
                required
                maxLength={254}
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                autoComplete="email"
              />
            </label>
            <label className="sf-field">
              <span>
                Primary phone <small>Used for verification</small>
              </span>
              <input value={initialCustomerPhone} disabled readOnly />
            </label>
            <label className="sf-field">
              <span>
                Alternative phone <small>(optional)</small>
              </span>
              <input
                type="tel"
                value={profilePhoneAlt}
                onChange={(e) => setProfilePhoneAlt(e.target.value)}
                placeholder="e.g. 07XX XXX XXX"
                autoComplete="tel"
              />
            </label>
          </div>
          {profileMessage && (
            <p role="status" className="sf-alert success">
              {profileMessage}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--sf-muted)' }}>
              Your details are kept within this shop's buyer account.
            </span>
            <button className="sf-btn sf-btn-primary" type="submit" disabled={profileSaving}>
              {profileSaving ? 'Saving changes…' : 'Save changes'}
            </button>
          </div>
        </form>
      </section>
    );
  }

  async function saveAddress(e: any) {
    e.preventDefault();
    if (profileSaving) return;
    setProfileSaving(true);
    setProfileMessage('');
    try {
      const r = await fetch('/api/buyer-auth?action=update-profile&slug=' + encodeURIComponent(slug), {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          name: profileName,
          email: profileEmail,
          alternativePhone: profilePhoneAlt,
          address: profileAddress,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw Error(d.error || 'Address could not be saved.');
      onProfileUpdated?.(d.customer);
      setProfileMessage('Your delivery address has been saved to your buyer account.');
    } catch (e: any) {
      setProfileMessage(e.message || 'Address could not be saved.');
    } finally {
      setProfileSaving(false);
    }
  }

  function renderAddressEditor() {
    return (
      <section className="sf-flow">
        <FlowHeading
          title="Edit delivery address"
          onBack={() => onNavigate('address-book')}
          backLabel="Address book"
        />
        <form className="sf-panel sf-checkout-stack" onSubmit={saveAddress}>
          <p className="sf-summary-note">
            This address is saved to your buyer account and can be used as your default for future orders in this shop.
          </p>
          <label className="sf-field">
            Default delivery address
            <textarea
              rows={4}
              required
              maxLength={300}
              value={profileAddress}
              onChange={(e) => setProfileAddress(e.target.value)}
              placeholder="County, sub-county, estate, street, building or house number"
            />
          </label>
          {profileMessage && (
            <p role="status" className="sf-alert success">
              {profileMessage}
            </p>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="sf-btn sf-btn-secondary" onClick={() => onNavigate('address-book')}>
              Cancel
            </button>
            <button className="sf-btn sf-btn-primary" type="submit" disabled={profileSaving}>
              {profileSaving ? 'Saving…' : 'Save address'}
            </button>
          </div>
        </form>
      </section>
    );
  }

  function renderAccount() {
    return (
      <section className="sf-flow">
        <div className="sf-account-welcome">
          <div className="sf-account-welcome-user">
            <span className="sf-account-welcome-avatar">
              <UserRound size={24} />
            </span>
            <div>
              <span className="sf-kicker">MY ACCOUNT</span>
              <h1 style={{ fontSize: 24, marginTop: 2 }}>
                {customerName.trim() ? `Welcome back, ${customerName.trim()}` : 'Welcome back'}
              </h1>
              <div style={{ fontSize: 13.5, color: 'var(--sf-muted)', marginTop: 2 }}>
                {initialCustomerPhone}
                {initialCustomerEmail ? ` · ${initialCustomerEmail}` : ''}
              </div>
            </div>
          </div>
          <button type="button" className="sf-btn sf-btn-secondary" onClick={onSignOut}>
            Sign out
          </button>
        </div>

        <button type="button" className="sf-orders-shortcut" onClick={() => onNavigate('orders')}>
          <span className="sf-assurance-icon">
            <Package size={20} />
          </span>
          <span>
            <strong>My Orders</strong>
            <small>View purchases, payment and delivery updates</small>
          </span>
          <b>{orders.length}</b>
          <ChevronRight size={18} />
        </button>

        <div className="sf-account-grid">
          {accountGroups.map((group) => (
            <section className="sf-panel" key={group.title}>
              <div className="sf-panel-head">
                <h2 style={{ fontSize: 14, letterSpacing: '0.06em' }}>{group.title}</h2>
              </div>
              <div>
                {group.links.map((link) => (
                  <button
                    type="button"
                    className="sf-account-link"
                    key={link.view}
                    onClick={() => onNavigate(link.view)}
                  >
                    <link.icon size={17} />
                    <span>{link.label}</span>
                    <ChevronRight size={15} />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    );
  }

  async function submitShopReport(e: any) {
    e.preventDefault();
    if (reportBusy) return;
    setReportBusy(true);
    setReportMessage('');
    try {
      const attachmentIds: string[] = [];
      for (const file of reportFiles) {
        const sign = await fetch('/api/buyer?action=complaint-attachment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ slug, mode: 'upload', fileName: file.name, contentType: file.type, size: file.size }),
        });
        const sd = await sign.json().catch(() => ({}));
        if (!sign.ok) throw Error(sd.error || 'Could not prepare ' + file.name);
        const put = await fetch(sd.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
        if (!put.ok) throw Error('Upload failed for ' + file.name);
        const done = await fetch('/api/buyer?action=complaint-attachment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ slug, mode: 'complete', attachmentId: sd.attachmentId }),
        });
        const dd = await done.json().catch(() => ({}));
        if (!done.ok) throw Error(dd.error || 'Security scan failed for ' + file.name);
        attachmentIds.push(sd.attachmentId);
      }
      const r = await fetch('/api/buyer?action=complaint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          slug,
          shopName: reportShop,
          orderId: reportOrderId || null,
          issueType: reportIssue,
          productId: reportProductId || null,
          paymentMade: reportPaymentMade,
          paymentAmount: reportPaymentAmount,
          paymentReference: reportPaymentReference,
          details: reportDetails,
          attachmentIds,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw Error(d.error || 'Report could not be submitted.');
      setReportMessage('Report submitted to DASNET. Reference: ' + d.report.id);
      setReportDetails('');
      setReportFiles([]);
      setReportPaymentAmount('');
      setReportPaymentReference('');
    } catch (e: any) {
      setReportMessage(e.message || 'Report could not be submitted.');
    } finally {
      setReportBusy(false);
    }
  }

  function renderAccountSection() {
    if (view === 'vouchers')
      return (
        <section className="sf-flow">
          <FlowHeading
            title="Shop vouchers & offers"
            subtitle={`Current discounts published by ${shopName}. Enter a code at checkout to apply an eligible offer.`}
            onBack={() => onNavigate('account')}
            backLabel="My account"
          />
          {shopCoupons.length ? (
            <div className="sf-orders-list">
              {shopCoupons.map((c) => (
                <article className="sf-panel" key={c.code}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div>
                      <span className="sf-kicker">COUPON CODE</span>
                      <div style={{ fontSize: 18, fontWeight: 700 }} className="sf-mono">
                        {c.code}
                      </div>
                    </div>
                    <strong className="sf-status-text is-success">
                      {c.discount_type === 'percentage'
                        ? `${c.discount_value}% OFF`
                        : `KES ${Number(c.discount_value).toLocaleString('en-KE')} OFF`}
                    </strong>
                  </div>
                  <p style={{ margin: '8px 0 14px', fontSize: 13.5, color: 'var(--sf-muted)' }}>
                    Minimum spend: {formatKes(Number(c.minimum_order_minor || 0) / 100)}
                    {c.expires_at ? ` · Expires ${new Date(c.expires_at).toLocaleDateString('en-KE')}` : ''}
                  </p>
                  <button
                    type="button"
                    className="sf-btn sf-btn-primary"
                    onClick={() => {
                      setVoucherCode(c.code);
                      setVoucherMessage('Code selected. Apply it at checkout.');
                      onNavigate('cart');
                    }}
                  >
                    Use this coupon
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="sf-state-box">
              <span className="sf-state-icon">
                <TicketPercent size={26} />
              </span>
              <h2>No active offers</h2>
              <p>{shopName} has not published any active coupons yet.</p>
              <button type="button" className="sf-btn sf-btn-secondary" onClick={() => onNavigate('store')}>
                Continue shopping
              </button>
            </div>
          )}
        </section>
      );

    if (view === 'assistant')
      return (
        <section className="sf-flow">
          <FlowHeading title="Shopping assistance" onBack={() => onNavigate('account')} backLabel="My account" />
          <div className="sf-panel sf-checkout-stack">
            <div>
              <h2>Contact {shopName}</h2>
              <p style={{ margin: '4px 0 0', color: 'var(--sf-muted)' }}>
                Questions about products, orders, delivery or payment? Contact the seller directly or open a report.
              </p>
            </div>
            {shopWhatsappNumber || shopContactEmail ? (
              <div>
                {shopWhatsappNumber && (
                  <a
                    className="sf-account-link"
                    href={'https://wa.me/' + shopWhatsappNumber.replace(/\D/g, '')}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Phone size={17} />
                    <span>WhatsApp / Call seller · {shopWhatsappNumber}</span>
                    <ChevronRight size={15} />
                  </a>
                )}
                {shopContactEmail && (
                  <a className="sf-account-link" href={'mailto:' + shopContactEmail}>
                    <Mail size={17} />
                    <span>Email seller · {shopContactEmail}</span>
                    <ChevronRight size={15} />
                  </a>
                )}
              </div>
            ) : (
              <p className="sf-summary-note">
                The seller has not added public contact details yet. You can still use the order conversation or report an
                issue to DASNET.
              </p>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <button type="button" className="sf-btn sf-btn-primary" onClick={() => onNavigate('my-reports')}>
                Open Reports &amp; Complaints
              </button>
              <button type="button" className="sf-btn sf-btn-secondary" onClick={() => onNavigate('inbox')}>
                Open order messages
              </button>
            </div>
          </div>
        </section>
      );

    if (view === 'my-reports' || view.startsWith('my-reports/'))
      return (
        <section className="sf-flow">
          <FlowHeading title="Reports & complaints" onBack={() => onNavigate('account')} backLabel="My account" />
          <DisputesPanel
            slug={slug}
            viewerRole="buyer"
            initialReportId={
              initialReportId ||
              (view.startsWith('my-reports/') && view !== 'my-reports/new'
                ? decodeURIComponent(view.slice('my-reports/'.length))
                : undefined)
            }
            orders={orders.filter((o) => Boolean(o.orderId)).map((o) => ({ id: o.orderId as string, label: o.orderNumber }))}
          />
        </section>
      );

    if (view === 'report-shop' || view === 'reports')
      return (
        <section className="sf-flow">
          <FlowHeading title="Reports & complaints" onBack={() => onNavigate('account')} backLabel="My account" />
          <DisputesPanel
            slug={slug}
            viewerRole="buyer"
            initialReportId={initialReportId}
            orders={orders.filter((o) => Boolean(o.orderId)).map((o) => ({ id: o.orderId as string, label: o.orderNumber }))}
          />
        </section>
      );

    if (view === 'report-shop-legacy-disabled')
      return (
        <section className="sf-flow">
          <FlowHeading title="Report a shop or order" onBack={() => onNavigate('account')} backLabel="My account" />
          <form className="sf-panel sf-checkout-stack" onSubmit={submitShopReport}>
            <label className="sf-field">
              Shop name
              <select required value={reportShop} onChange={(e) => setReportShop(e.target.value)}>
                <option value={shopName}>{shopName}</option>
              </select>
            </label>
            <label className="sf-field">
              Order affected
              <select
                value={reportOrderId}
                onChange={(e) => {
                  setReportOrderId(e.target.value);
                  setReportProductId('');
                }}
              >
                <option value="">No specific order</option>
                {orders.map((o) => (
                  <option key={o.orderId || o.orderNumber} value={o.orderId || ''}>
                    {o.orderNumber} · {formatKes(o.total)}
                  </option>
                ))}
              </select>
            </label>
            <label className="sf-field">
              Product affected (optional)
              <select value={reportProductId} onChange={(e) => setReportProductId(e.target.value)}>
                <option value="">No specific product</option>
                {orders
                  .filter((o) => !reportOrderId || o.orderId === reportOrderId)
                  .flatMap((o) => o.lines.map((line) => ({ product: line.product, order: o })))
                  .filter((x, i, a) => a.findIndex((y) => y.product.id === x.product.id) === i)
                  .map((x) => (
                    <option key={x.product.id} value={x.product.id}>
                      {x.product.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="sf-field">
              Type of issue
              <select required value={reportIssue} onChange={(e) => setReportIssue(e.target.value)}>
                <option value="payment">Payment / M-PESA</option>
                <option value="delivery">Delivery not received / delayed</option>
                <option value="product_quality">Product quality / not as described</option>
                <option value="wrong_item">Wrong or missing item</option>
                <option value="seller_communication">Seller communication</option>
                <option value="refund_return">Refund / return dispute</option>
                <option value="shop_listing">Misleading shop or listing</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              <input
                type="checkbox"
                checked={reportPaymentMade}
                onChange={(e) => setReportPaymentMade(e.target.checked)}
              />
              <span>I made a payment related to this issue</span>
            </label>
            {reportPaymentMade && (
              <div className="sf-form-grid">
                <label className="sf-field">
                  Amount paid (KES)
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={reportPaymentAmount}
                    onChange={(e) => setReportPaymentAmount(e.target.value)}
                  />
                </label>
                <label className="sf-field">
                  M-PESA receipt
                  <input
                    maxLength={100}
                    value={reportPaymentReference}
                    onChange={(e) => setReportPaymentReference(e.target.value)}
                    placeholder="e.g. QAB12XYZ"
                  />
                </label>
              </div>
            )}
            <label className="sf-field">
              Describe what happened
              <textarea
                required
                minLength={10}
                maxLength={5000}
                rows={5}
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
              />
            </label>
            <label className="sf-field">
              Attachments (optional)
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.webp"
                onChange={(e) => {
                  const fs = Array.from(e.target.files || []);
                  if (fs.length > 8 || fs.some((f) => f.size > 10485760)) {
                    setReportMessage('Attach up to 8 files, each 10 MB or smaller.');
                    return;
                  }
                  setReportFiles(fs);
                  setReportMessage('');
                }}
              />
            </label>
            {reportMessage && <p className="sf-alert">{reportMessage}</p>}
            <button className="sf-btn sf-btn-primary" disabled={reportBusy}>
              {reportBusy ? 'Submitting…' : 'Submit report to DASNET'}
            </button>
          </form>
        </section>
      );

    if (view === 'public-profile')
      return (
        <section className="sf-flow">
          <FlowHeading title="Buyer profile" onBack={() => onNavigate('account')} backLabel="My account" />
          <div className="sf-panel sf-checkout-stack">
            <h2>{profileName || initialCustomerName || 'Buyer profile'}</h2>
            <div className="sf-specs-grid">
              <div>
                <span>Phone</span>
                <strong>{initialCustomerPhone || 'Not available'}</strong>
              </div>
              <div>
                <span>Email</span>
                <strong>{profileEmail || initialCustomerEmail || 'Not provided'}</strong>
              </div>
              <div>
                <span>Default address</span>
                <strong>{profileAddress || initialCustomerAddress || 'Not saved'}</strong>
              </div>
            </div>
            <div>
              <button type="button" className="sf-btn sf-btn-primary" onClick={() => onNavigate('profile')}>
                Edit profile
              </button>
            </div>
          </div>
        </section>
      );

    const policyViews: any = {
      'shop-terms': {
        title: 'Shop Terms & DASMARKET Platform Rules',
        body: [
          shopTermsAndConditions.trim() || defaultTerms(shopName),
          'DASMARKET MINIMUM TERMS — APPLY TO EVERY SHOP\n\n1. INDEPENDENT SELLER: This shop is operated by ' +
            shopName +
            '. The seller, not DASMARKET, is responsible for the products, descriptions, prices, stock, warranties, delivery, returns and customer service.\n\n2. DIRECT PAYMENTS: Payments go directly to the seller or the seller’s nominated payment provider/account. Verify the recipient name, number and amount before paying.\n\n3. BUYER SAFETY: Check the seller, listing, total price, delivery and refund terms before paying. Never share your M-PESA PIN, password or one-time code.\n\n4. ORDER AND REFUND RESPONSIBILITY: The purchase contract is between the buyer and seller.\n\n5. REPORTING AND PLATFORM ACTION: Buyers may report suspicious listings, payment requests or seller conduct through the available report tools.',
        ].join('\n\n'),
      },
      'shop-privacy': {
        title: 'Shop Privacy & DASMARKET Platform Privacy',
        body: [
          shopPrivacyPolicy.trim() || defaultPrivacy(shopName),
          'DASMARKET MINIMUM PRIVACY NOTICES — APPLY TO EVERY SHOP\n\n1. ORDER INFORMATION: When you place an order, your name, contact details, delivery information, order contents and relevant order status are shared with ' +
            shopName +
            ' so the seller can confirm, fulfil and support your order.\n\n2. DIRECT PAYMENT PROCESSING: Never disclose your PIN, password or one-time security code.\n\n3. PLATFORM OPERATIONS: DASMARKET may process account, order and support information to operate the storefront platform, maintain security, and prevent fraud.',
        ].join('\n\n'),
      },
      'shop-returns': { title: 'Returns, refunds & exchanges', body: shopReturnPolicy.trim() || defaultReturns(shopName) },
      'shop-delivery': { title: 'Delivery & collection policy', body: shopDeliveryPolicy.trim() || defaultDelivery(shopName) },
    };

    if (policyViews[view])
      return (
        <section className="sf-flow">
          <FlowHeading title={policyViews[view].title} onBack={() => onNavigate('store')} backLabel="Back to shop" />
          <article className="sf-panel sf-checkout-stack">
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, paddingBottom: 14, borderBottom: '1px solid var(--sf-line)' }}>
              <div>
                <strong>{shopName}</strong>
                <div style={{ fontSize: 13, color: 'var(--sf-muted)' }}>Official shop policy</div>
              </div>
              <div style={{ display: 'flex', gap: 14, fontSize: 13.5 }}>
                {shopWhatsappNumber && (
                  <a href={'https://wa.me/' + shopWhatsappNumber.replace(/\D/g, '')} target="_blank" rel="noopener noreferrer">
                    {shopWhatsappNumber}
                  </a>
                )}
                {shopContactEmail && <a href={'mailto:' + shopContactEmail}>{shopContactEmail}</a>}
              </div>
            </div>
            <div style={{ display: 'grid', gap: 12, fontSize: 14.5, color: 'var(--sf-ink-2)', lineHeight: 1.68 }}>
              {policyViews[view].body.split(/\n\n|\\n\\n/).map((paragraph: string, index: number) => (
                <p key={index} style={{ margin: 0 }}>
                  {paragraph}
                </p>
              ))}
            </div>
          </article>
        </section>
      );

    if (view === 'wishlist') {
      const savedProducts = products.filter((product) =>
        (serverWishlistLoaded ? serverWishlist : wishlistIds).includes(product.id),
      );
      return (
        <section className="sf-flow">
          <FlowHeading
            title={`Saved items (${savedProducts.length})`}
            subtitle="Saved items are synced to your buyer account."
            onBack={() => onNavigate('account')}
            backLabel="My account"
          />
          {savedProducts.length ? (
            <div className="sf-product-grid">
              {savedProducts.map((product) => (
                <article className="sf-card" key={product.id}>
                  <button type="button" className="sf-card-open" onClick={() => onOpenProduct?.(product)}>
                    <span className="sf-card-media">
                      <ProductThumb product={product} />
                    </span>
                    <div className="sf-card-body">
                      <span className="sf-card-cat">{product.category || 'Product'}</span>
                      <span className="sf-card-title">{product.name}</span>
                      <div className="sf-card-meta-row">
                        <strong className="sf-card-price">{formatKes(product.price)}</strong>
                      </div>
                    </div>
                  </button>
                  <div className="sf-card-foot" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                    <button type="button" className="sf-card-add" onClick={() => onOpenProduct?.(product)}>
                      View item
                    </button>
                    <button
                      type="button"
                      className="sf-btn sf-btn-ghost"
                      style={{ minHeight: 38 }}
                      onClick={() => togglePersistentWishlist(product.id)}
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="sf-state-box">
              <span className="sf-state-icon">
                <Heart size={26} />
              </span>
              <h2>No saved items yet</h2>
              <p>Open a product and save it to your wishlist to keep it here.</p>
              <button type="button" className="sf-btn sf-btn-primary" onClick={() => onNavigate('store')}>
                Browse products
              </button>
            </div>
          )}
        </section>
      );
    }

    if (view === 'inbox') {
      return (
        <section className="sf-flow">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
            <FlowHeading
              title="Messages"
              subtitle="Your private conversations with the seller."
              onBack={() => onNavigate('account')}
              backLabel="My account"
            />
            <button type="button" className="sf-btn sf-btn-primary" onClick={() => onNavigate('orders')}>
              + Message about an order
            </button>
          </div>
          <div className="sf-inbox-layout">
            <div className="sf-panel" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="sf-panel-head" style={{ padding: '14px 16px', margin: 0 }}>
                <strong>Conversations</strong>
                <span className="sf-mono">{chatThreads.length}</span>
              </div>
              {chatThreads.length ? (
                chatThreads.map((thread: any) => (
                  <button
                    type="button"
                    className="sf-inbox-thread"
                    key={thread.order_id}
                    onClick={() => onOpenChat?.('', thread.order_number, thread.order_id)}
                  >
                    <span className="sf-assurance-icon" style={{ width: 34, height: 34 }}>
                      <MessageCircle size={16} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="sf-inbox-thread-top">
                        <strong>{shopName}</strong>
                        <time>
                          {thread.last_message_at
                            ? new Date(thread.last_message_at).toLocaleDateString('en-KE', {
                                day: 'numeric',
                                month: 'short',
                              })
                            : ''}
                        </time>
                      </div>
                      <span className="sf-inbox-thread-order">Order #{thread.order_number}</span>
                      <p>{thread.last_message || 'Conversation started'}</p>
                    </div>
                  </button>
                ))
              ) : (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--sf-muted)', fontSize: 13.5 }}>
                  <strong>No conversations yet</strong>
                  <p style={{ margin: '6px 0 0' }}>
                    Open an order and choose “Message seller” to begin a conversation.
                  </p>
                </div>
              )}
            </div>

            <div>
              {chatPanel || (
                <div className="sf-state-box">
                  <span className="sf-state-icon">
                    <MessageCircle size={26} />
                  </span>
                  <h3>Select a conversation</h3>
                  <p>Choose a message thread to read and reply. Your private conversations appear in the list.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      );
    }

    if (view === 'account-management')
      return (
        <section className="sf-flow">
          <FlowHeading title="Account & security" onBack={() => onNavigate('account')} backLabel="My account" />
          <form className="sf-panel sf-checkout-stack" onSubmit={changePassword}>
            <div>
              <h2>Change password</h2>
              <p style={{ margin: '4px 0 0', color: 'var(--sf-muted)' }}>
                Use your current password to set a new password for this shop account.
              </p>
            </div>
            <div className="sf-form-grid">
              <label className="sf-field sf-form-full">
                Current password
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </label>
              <label className="sf-field">
                New password
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={10}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 10 characters"
                />
              </label>
              <label className="sf-field">
                Confirm new password
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={10}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </label>
            </div>
            {passwordMessage && (
              <p role="status" className="sf-alert">
                {passwordMessage}
              </p>
            )}
            <div>
              <button className="sf-btn sf-btn-primary" type="submit" disabled={passwordSaving}>
                {passwordSaving ? 'Updating…' : 'Update password'}
              </button>
            </div>
          </form>
        </section>
      );

    if (view === 'address-book')
      return (
        <section className="sf-flow">
          <FlowHeading title="Address book" onBack={() => onNavigate('account')} backLabel="My account" />
          <div className="sf-panel sf-checkout-stack">
            <div>
              <h2>Default delivery address</h2>
              <p style={{ margin: '6px 0 0', fontSize: 15 }}>
                {profileAddress || initialCustomerAddress || 'No default address saved yet.'}
              </p>
            </div>
            <p className="sf-summary-note">
              Your default address is saved with your buyer profile and can be updated at any time.
            </p>
            <div>
              <button
                type="button"
                className="sf-btn sf-btn-primary"
                onClick={() => onNavigate('address-book/edit')}
              >
                Edit delivery address
              </button>
            </div>
          </div>
        </section>
      );

    if (view === 'address-book/edit') return renderAddressEditor();

    if (view === 'notifications')
      return (
        <section className="sf-flow">
          <FlowHeading
            title={`Order notifications (${notifications.length})`}
            onBack={() => onNavigate('account')}
            backLabel="My account"
          />
          {notifications.length ? (
            <div className="sf-orders-list">
              {notifications.map((item: any) => (
                <article
                  className="sf-panel"
                  key={item.id || item.orderId || item.complaintId || item.orderNumber}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <strong>{item.title}</strong>
                    <small style={{ color: 'var(--sf-muted)' }}>
                      {item.created_at
                        ? new Date(item.created_at).toLocaleString('en-KE')
                        : item.updatedAt
                        ? new Date(item.updatedAt).toLocaleString('en-KE')
                        : 'Update'}
                    </small>
                  </div>
                  <p style={{ margin: '8px 0 14px', fontSize: 14, color: 'var(--sf-ink-2)' }}>{item.detail}</p>
                  <button
                    type="button"
                    className="sf-btn sf-btn-secondary"
                    onClick={() => onNavigate(item.complaint_id ? 'my-reports' : 'orders')}
                  >
                    {item.complaint_id ? 'Track my report' : 'View my orders'}
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="sf-state-box">
              <span className="sf-state-icon">
                <Bell size={26} />
              </span>
              <h2>No recent updates</h2>
              <p>Payment, fulfilment and delivery changes will appear here when the seller updates your order.</p>
              <button type="button" className="sf-btn sf-btn-primary" onClick={() => onNavigate('orders')}>
                View my orders
              </button>
            </div>
          )}
        </section>
      );

    if (view === 'notification-settings')
      return (
        <section className="sf-flow">
          <FlowHeading title="Notification settings" onBack={() => onNavigate('account')} backLabel="My account" />
          <div className="sf-panel sf-checkout-stack">
            <h2>In-app order updates</h2>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14.5 }}>
              <input
                type="checkbox"
                checked={inAppNotificationsEnabled}
                onChange={(e) => setInAppNotificationsEnabled(e.target.checked)}
              />
              <span>{inAppNotificationsEnabled ? 'Order notifications enabled' : 'Order notifications paused'}</span>
            </label>
          </div>
        </section>
      );

    if (view === 'reviews') {
      const reviewProducts = products.filter((product) =>
        orders.some(
          (order) => order.paymentStatus === 'succeeded' && order.lines.some((line) => line.product.id === product.id),
        ),
      );
      return (
        <section className="sf-flow">
          <FlowHeading
            title="Product reviews"
            subtitle="Products you have purchased."
            onBack={() => onNavigate('account')}
            backLabel="My account"
          />
          {reviewProducts.length ? (
            <div className="sf-product-grid">
              {reviewProducts.map((product) => (
                <article className="sf-card" key={product.id}>
                  <div className="sf-card-media">
                    <ProductThumb product={product} />
                  </div>
                  <div className="sf-card-body">
                    <span className="sf-card-title">{product.name}</span>
                    <strong className="sf-card-price">{formatKes(product.price)}</strong>
                  </div>
                  <div className="sf-card-foot">
                    <button type="button" className="sf-card-add" onClick={() => onOpenProduct?.(product)}>
                      Write a review
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="sf-state-box">
              <span className="sf-state-icon">
                <Star size={26} />
              </span>
              <h2>No reviewable purchases yet</h2>
              <p>After a successful payment, you can review the products you bought.</p>
              <button type="button" className="sf-btn sf-btn-primary" onClick={() => onNavigate('orders')}>
                View my orders
              </button>
            </div>
          )}
        </section>
      );
    }

    if (view === 'followed-shops')
      return (
        <section className="sf-flow">
          <FlowHeading title="Followed shops" onBack={() => onNavigate('account')} backLabel="My account" />
          <div className="sf-panel sf-checkout-stack">
            <div className="sf-panel-head">
              <h2>{shopName}</h2>
              <span>{isShopFollowed ? 'Following' : 'Not followed'}</span>
            </div>
            <p style={{ margin: 0, color: 'var(--sf-muted)' }}>
              {buyerFollowedShops.length} shop{buyerFollowedShops.length === 1 ? '' : 's'} followed
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                disabled={buyerFeatureBusy}
                className={`sf-btn ${isShopFollowed ? 'sf-btn-secondary' : 'sf-btn-primary'}`}
                onClick={async () => {
                  setBuyerFeatureBusy(true);
                  setBuyerFeatureMessage('');
                  try {
                    const next = !isShopFollowed;
                    await buyerFeatureRequest('buyer-follow-shop', { targetSlug: slug, follow: next });
                    setIsShopFollowed(next);
                    setBuyerFollowedShops((current) =>
                      next ? [{ slug, name: shopName }, ...current.filter((x: any) => x.slug !== slug)] : current.filter((x: any) => x.slug !== slug),
                    );
                  } catch (error: any) {
                    setBuyerFeatureMessage(error.message || 'Could not update followed shops.');
                  } finally {
                    setBuyerFeatureBusy(false);
                  }
                }}
              >
                {buyerFeatureBusy ? 'Saving…' : isShopFollowed ? 'Unfollow shop' : 'Follow shop'}
              </button>
              <button type="button" className="sf-btn sf-btn-secondary" onClick={() => onNavigate('store')}>
                Browse this shop
              </button>
            </div>
            {buyerFeatureMessage && <p className="sf-alert">{buyerFeatureMessage}</p>}
          </div>
        </section>
      );

    if (view === 'newsletter')
      return (
        <section className="sf-flow">
          <FlowHeading title="Shop updates & offers" onBack={() => onNavigate('account')} backLabel="My account" />
          <div className="sf-panel sf-checkout-stack">
            <h2>Shop update preference</h2>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14.5 }}>
              <input
                type="checkbox"
                checked={newsletterEnabled}
                disabled={buyerFeatureBusy}
                onChange={async (event) => {
                  const enabled = event.target.checked;
                  setBuyerFeatureBusy(true);
                  setBuyerFeatureMessage('');
                  try {
                    await buyerFeatureRequest('buyer-newsletter', { enabled, email: initialCustomerEmail });
                    setNewsletterEnabled(enabled);
                  } catch (error: any) {
                    setBuyerFeatureMessage(error.message || 'Could not update your subscription.');
                  } finally {
                    setBuyerFeatureBusy(false);
                  }
                }}
              />
              <span>{newsletterEnabled ? 'Subscribed to shop updates' : 'Subscribe to shop updates'}</span>
            </label>
            {buyerFeatureMessage && <p className="sf-alert">{buyerFeatureMessage}</p>}
          </div>
        </section>
      );

    if (view === 'close-account')
      return (
        <section className="sf-flow">
          <FlowHeading title="Close account" onBack={() => onNavigate('account')} backLabel="My account" />
          <div className="sf-panel sf-checkout-stack">
            <h2>Request buyer account closure</h2>
            <p style={{ margin: 0, color: 'var(--sf-ink-2)' }}>
              Account closure is handled by DASNET Support after identity verification. Order, payment, tax and dispute
              records may need to be retained where required by law.
            </p>
            <p style={{ margin: 0 }}>
              <strong>Account:</strong> {initialCustomerName || 'Buyer'} · {initialCustomerPhone}
            </p>
            {closureRequest && (
              <p className="sf-alert">
                Existing request: {closureRequest.status.replace('_', ' ')} · submitted{' '}
                {new Date(closureRequest.created_at || closureRequest.createdAt).toLocaleDateString()}
              </p>
            )}
            <div>
              <button
                type="button"
                className="sf-btn sf-btn-primary"
                disabled={
                  buyerFeatureBusy || closureRequest?.status === 'pending' || closureRequest?.status === 'under_review'
                }
                onClick={async () => {
                  setBuyerFeatureBusy(true);
                  setBuyerFeatureMessage('');
                  try {
                    const data = await buyerFeatureRequest('buyer-close-account', {
                      reason: 'Buyer requested account closure from the account settings page.',
                    });
                    setClosureRequest(data.request || null);
                    setBuyerFeatureMessage(data.message || 'Your request has been recorded.');
                  } catch (error: any) {
                    setBuyerFeatureMessage(error.message || 'Could not submit your closure request.');
                  } finally {
                    setBuyerFeatureBusy(false);
                  }
                }}
              >
                {buyerFeatureBusy
                  ? 'Submitting…'
                  : closureRequest?.status === 'pending' || closureRequest?.status === 'under_review'
                  ? 'Closure request submitted'
                  : 'Submit account closure request'}
              </button>
            </div>
            {buyerFeatureMessage && <p className="sf-alert">{buyerFeatureMessage}</p>}
          </div>
        </section>
      );

    const content = accountSectionCopy[view];
    if (!content) return null;
    return (
      <section className="sf-flow">
        <FlowHeading title={content.title} onBack={() => onNavigate('account')} backLabel="My account" />
        <div className="sf-panel sf-checkout-stack">
          <p style={{ margin: 0 }}>{content.description}</p>
          <button
            type="button"
            className="sf-btn sf-btn-secondary"
            onClick={() => onNavigate(view === 'recently-viewed' ? 'store' : 'account')}
          >
            {view === 'recently-viewed' ? 'Continue shopping' : 'Back to my account'}
          </button>
        </div>
      </section>
    );
  }

  if (view === 'trust-safety')
    return (
      <section className="sf-flow">
        <FlowHeading
          title="Trust & safety"
          subtitle="Practical checks to help you make informed decisions when shopping with independent sellers."
          onBack={() => onNavigate('store')}
          backLabel="Back to shop"
        />
        <div className="sf-panel sf-checkout-stack">
          <div>
            <h2>Before you pay</h2>
            <p style={{ margin: '6px 0 0', color: 'var(--sf-ink-2)' }}>
              Confirm the product, final price, seller identity, payment recipient and delivery or collection
              arrangements. Ask for current photos or a demonstration when appropriate.
            </p>
          </div>
          <div>
            <h2>Protect your account and money</h2>
            <p style={{ margin: '6px 0 0', color: 'var(--sf-ink-2)' }}>
              Never share your M-PESA PIN, password or one-time verification code. Verify payment status in your own
              official payment app; do not rely on screenshots or forwarded messages.
            </p>
          </div>
          <div>
            <h2>Keep a record</h2>
            <p style={{ margin: '6px 0 0', color: 'var(--sf-ink-2)' }}>
              Keep the listing, order reference, seller conversation and proof of payment. Agree return or refund terms
              in writing before paying.
            </p>
          </div>
          <div>
            <button type="button" className="sf-btn sf-btn-primary" onClick={() => onNavigate('my-reports')}>
              Report a problem
            </button>
          </div>
        </div>
      </section>
    );

  if (view === 'faqs')
    return (
      <section className="sf-flow">
        <FlowHeading
          title="Frequently asked questions"
          subtitle="Helpful answers about buying, sellers, payments, delivery and staying safe on DASNET."
          onBack={() => onNavigate('store')}
          backLabel="Back to shop"
        />
        <div className="sf-faq-list">
          {(shopFaqs.length ? shopFaqs : marketplaceFaqs.map(([question, answer]) => ({ question, answer }))).map(
            (faq: any) => (
              <details key={faq.question}>
                <summary>
                  <span>{faq.question}</span>
                  <span>+</span>
                </summary>
                <p>{faq.answer}</p>
              </details>
            ),
          )}
        </div>
      </section>
    );

  if (view === 'store') return null;

  const pageContent =
    view === 'cart'
      ? renderCart()
      : view === 'checkout/delivery'
      ? lines.length
        ? renderCheckoutDelivery()
        : rawCartCount > 0
        ? renderRestoringCartState(view)
        : renderCart()
      : view === 'checkout/payment'
      ? lines.length
        ? renderCheckoutPayment()
        : rawCartCount > 0
        ? renderRestoringCartState(view)
        : renderCart()
      : view === 'checkout/review'
      ? lines.length
        ? renderReview()
        : rawCartCount > 0
        ? renderRestoringCartState(view)
        : renderCart()
      : view === 'checkout/processing'
      ? renderPaymentProcessing()
      : view === 'checkout/complete'
      ? renderSuccess()
      : view === 'orders' || view.startsWith('orders/')
      ? renderOrders()
      : view === 'order-detail'
      ? renderOrderDetail()
      : view === 'order-tracking'
      ? renderTracking()
      : view === 'account'
      ? renderAccount()
      : view === 'profile'
      ? renderProfile()
      : renderAccountSection() || (
          <section className="sf-flow">
            <FlowHeading title="Shopping assistant" onBack={() => onNavigate('store')} />
            <div className="sf-state-box">
              <Search size={24} />
              <p>{accountSectionCopy.assistant.description}</p>
              <button type="button" className="sf-btn sf-btn-secondary" onClick={() => onNavigate('store')}>
                Back to the store
              </button>
            </div>
          </section>
        );

  const buyerDashboardViews = new Set([
    'account',
    'orders',
    'order-detail',
    'order-tracking',
    'inbox',
    'wishlist',
    'recently-viewed',
    'address-book',
    'address-book/edit',
    'vouchers',
    'reviews',
    'notifications',
    'my-reports',
    'report-shop',
    'followed-shops',
    'newsletter',
    'notification-settings',
    'public-profile',
    'account-management',
    'close-account',
    'assistant',
  ]);
  const showProductDiscovery = buyerDashboardViews.has(view) || view.startsWith('orders/');
  const viewedCategories = new Set(
    recentlyViewedProducts.map((product) => String(product.category || '').toLowerCase()).filter(Boolean),
  );
  const discoveryProducts = products
    .filter((product) => product.stockQuantity !== 0)
    .slice()
    .sort(
      (a, b) =>
        Number(viewedCategories.has(String(b.category || '').toLowerCase())) -
          Number(viewedCategories.has(String(a.category || '').toLowerCase())) ||
        Number(Boolean((b as any).spotlight)) - Number(Boolean((a as any).spotlight)),
    )
    .slice(0, 4);

  return (
    <div>
      {pageContent}
      {showProductDiscovery && discoveryProducts.length > 0 && (
        <section className="sf-discovery" aria-label="Product recommendations">
          <div className="sf-section-head">
            <div>
              <span className="sf-kicker">MORE TO EXPLORE</span>
              <h2>Discover more products</h2>
            </div>
            <button type="button" className="sf-link-action" onClick={() => onNavigate('collection/all-products')}>
              View all <ArrowRight size={15} />
            </button>
          </div>
          <div className="sf-discovery-track">
            {discoveryProducts.map((product) => (
              <article className="sf-card" key={product.id}>
                <button
                  type="button"
                  className="sf-card-open"
                  onClick={() => onOpenProduct?.(product)}
                  aria-label={`View ${product.name}`}
                >
                  <span className="sf-card-media">
                    <ProductThumb product={product} />
                  </span>
                  <div className="sf-card-body">
                    <span className="sf-card-cat">{product.category || 'Product'}</span>
                    <span className="sf-card-title">{product.name}</span>
                    <div className="sf-card-meta-row">
                      <strong className="sf-card-price">{formatKes(product.price)}</strong>
                      <small className="sf-card-stock">
                        {product.stockQuantity == null ? 'Available' : `${product.stockQuantity} in stock`}
                      </small>
                    </div>
                  </div>
                </button>
                <div className="sf-card-foot">
                  <button
                    type="button"
                    className="sf-card-add"
                    disabled={product.stockQuantity === 0}
                    onClick={() =>
                      onCartChange({
                        ...cart,
                        [product.id]: Math.min(99, product.stockQuantity ?? 99, (cart[product.id] || 0) + 1),
                      })
                    }
                  >
                    Add to cart
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
