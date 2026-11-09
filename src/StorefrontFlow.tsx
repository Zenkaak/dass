import { marketplaceFaqs } from './marketplaceFaqs';
import { DisputesPanel } from './DisputesPanel';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  ChevronDown,
  MapPin,
  Package,
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
  shopDeliveryHomeFee?: number;
  shopDeliveryPickupFee?: number;
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

const kenyanCounties=['Baringo','Bomet','Bungoma','Busia','Elgeyo-Marakwet','Embu','Garissa','Homa Bay','Isiolo','Kajiado','Kakamega','Kericho','Kiambu','Kilifi','Kirinyaga','Kisii','Kisumu','Kitui','Kwale','Laikipia','Lamu','Machakos','Makueni','Mandera','Marsabit','Meru','Migori','Mombasa','Murang’a','Nairobi','Nakuru','Nandi','Narok','Nyamira','Nyandarua','Nyeri','Samburu','Siaya','Taita-Taveta','Tana River','Tharaka-Nithi','Trans Nzoia','Turkana','Uasin Gishu','Vihiga','Wajir','West Pokot'];
const kenyanSubCounties:Record<string,string[]>={"Uasin Gishu":["Ainabkoi","Kapseret","Kesses","Moiben","Soy","Turbo"],"Kericho":["Ainamoi","Belgut","Buret","Kipkelion East","Kipkelion West","Sigowet/Soin"],"Nandi":["Aldai","Chesumei","Emgwen","Mosop","Nandi Hills","Tinderet"],"Siaya":["Alego Usonga","Bondo","Gem","Rarieda","Ugenya","Ugunja"],"Migori":["Awendo","Kuria East","Kuria West","Nyatike","Rongo","Suna East","Suna West","Uriri"],"Nakuru":["Bahati","Gilgil","Kuresoi North","Kuresoi South","Molo","Naivasha","Nakuru Town East","Nakuru Town West","Njoro","Rongai","Subukia"],"Garissa":["Balambala","Dadaab","Dujis","Fafi","Ijara","Lagdera"],"Mandera":["Banissa","Lafey","Mandera East","Mandera North","Mandera South","Mandera West"],"Baringo":["Baringo Central","Baringo North","Baringo South","Eldama Ravine","Mogotio","Tiaty"],"Kisii":["Bobasi","Bomachoge Borabu","Bomachoge Chache","Bonchari","Kitutu Chache North","Kitutu Chache South","Nyaribari Chache","Nyaribari Masaba","South Mugirango"],"Bomet":["Bomet Central","Bomet East","Chepalungu","Konoin","Sotik"],"Nyamira":["Borabu","Kitutu Masaba","North Mugirango","West Mugirango"],"Busia":["Budalangi","Butula","Funyula","Matayos","Nambale","Teso North","Teso South"],"Bungoma":["Bumula","Kabuchai","Kanduyi","Kimilili","Mt. Elgon","Sirisia","Tongaren","Webuye East","Webuye West"],"Tana River":["Bura","Galole","Garsen"],"Kakamega":["Butere","Ikolomani","Khwisero","Likuyani","Lugari","Lurambi","Malava","Matungu","Mumias East","Mumias West","Navakholo","Shinyalu"],"Meru":["Buuri","Cental Imenti","Igembe Central","Igembe North","Igembe South","North Imenti","South Imenti","Tigania East","Tigania West"],"Mombasa":["Changamwe","Jomvu","Kisauni","Likoni","Mvita","Nyali"],"Trans Nzoia":["Cherangany","Endebess","Kiminini","Kwanza","Saboti"],"Nairobi":["Dagoretti","Embakasi Central","Embakasi East","Embakasi North","Embakasi South","Embakasi West","Kamukunji","Kasarani","Kibra","Kilimani","Langata","Makadara","Mathare","Roysambu","Ruaraka","Starehe","Westlands"],"Wajir":["Eldas","Tarbaj","Wajir East","Wajir North","Wajir South","Wajir West"],"Vihiga":["Emuhaya","Hamisi","Luanda","Sabatia","Vihiga"],"Narok":["Emurua Dikirr","Kilgoris","Narok East","Narok North","Narok South","Narok West"],"Embu":["Gachoka","Manyatta","Runyenjes","Siakago"],"Kilifi":["Ganze","Kaloleni","Kilifi North","Kilifi South","Magarini","Malindi","Rabai"],"Murang'a":["Gatanga","Kandara","Kangema","Kigumo","Kiharu","Maragwa","Mathioya"],"Kiambu":["Gatundu North","Gatundu South","Githunguri","Juja","Kabete","Kiambaa","Kiambu","Kikuyu","Lari","Limuru","Ruiru","Thika Town"],"Kirinyaga":["Gichugu","Kirinyaga Central","Mwea","Ndia"],"Homa Bay":["Homa Bay","Kabondo Kasipul","Karachuonyo","Kasipul","Ndhiwa","Rangwe","Suba North","Suba South"],"Isiolo":["Isiolo North","Isiolo South"],"West Pokot":["Kacheliba","Kapenguria","Pokot South","Sigor"],"Makueni":["Kaiti","Kibwezi East","Kibwezi West","Kilome","Makueni","Mbooni"],"Kajiado":["Kajiado Central","Kajiado East","Kajiado North","Kajiado South","Kajiado West"],"Machakos":["Kangundo","Kathiani","Machakos Town","Masinga","Matungulu","Mavoko","Mwala","Yatta"],"Elgeyo-Marakwet":["Keiyo North","Keiyo South","Marakwet East","Marakwet West"],"Nyeri":["Kieni","Mathira","Mukurweni","Nyeri Town","Othaya","Tetu"],"Kwale":["Kinango","Lunga Lunga","Matuga","Msambweni"],"Nyandarua":["Kinangop","Kipipiri","Ndaragwa","Ol Jorok","Ol Kalou"],"Kisumu":["Kisumu Central","Kisumu East","Kisumu West","Muhoroni","Nyakach","Nyando","Seme"],"Kitui":["Kitui Central","Kitui East","Kitui Rural","Kitui South","Kitui West","Mwingi East","Mwingi North","Mwingi West"],"Laikipia":["Laikipia East","Laikipia North","Laikipia West"],"Marsabit":["Laisamis","Moyale","North Horr","Saku"],"Lamu":["Lamu East","Lamu West"],"Turkana":["Loima","Turkana Central","Turkana East","Turkana North","Turkana South","Turkana West"],"Tharaka-Nithi":["Maara","Nithi","Tharaka"],"Taita Taveta":["Mwatate","Taveta","Voi","Wundanyi"],"Samburu":["Samburu East","Samburu North","Samburu West"]};
kenyanSubCounties['Murang’a']=kenyanSubCounties["Murang'a"]||[];
kenyanSubCounties['Taita-Taveta']=kenyanSubCounties['Taita Taveta']||[];


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
    { label: 'Newsletter & offers', icon: WalletCards, view: 'newsletter' },
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




function ProductThumb({ product }: { product: StoreProduct }) {
  const image = product.images?.[0] || product.imageUrl;
  return image
    ? <img className="customer-product-thumb" src={image} alt={product.name} loading="lazy" decoding="async" onError={event=>{event.currentTarget.onerror=null;event.currentTarget.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22640%22 height=%22480%22 viewBox=%220 0 640 480%22%3E%3Crect width=%22640%22 height=%22480%22 fill=%22%23eaf0f6%22/%3E%3Cpath d=%22M240 280l80-100 70 80 45-55 70 75%22 fill=%22none%22 stroke=%22%2394a3b8%22 stroke-width=%2216%22/%3E%3C/svg%3E'}} />
    : <div className="customer-product-thumb customer-product-placeholder" aria-hidden="true"><ShoppingBag size={22} /></div>;
}

function CheckoutProgress({step}:{step:1|2|3}){const items=[{n:1,label:'Delivery'},{n:2,label:'Payment'},{n:3,label:'Review & place order'}];return <nav className="market-checkout-progress" aria-label="Checkout progress">{items.map(item=><div key={item.n} className={'market-checkout-progress-step '+(item.n===step?'current':item.n<step?'complete':'')}><span>{item.n<step?'✓':String(item.n).padStart(2,'0')}</span><div><strong>{item.label}</strong><small>{item.n<step?'Completed':item.n===step?'Current step':'Next step'}</small></div></div>)}</nav>}
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

function SearchableLocationSelect({label,value,options,placeholder,onChange,disabled=false}:{label:string;value:string;options:string[];placeholder:string;onChange:(value:string)=>void;disabled?:boolean}) {
  const [query,setQuery]=useState(value);
  const [open,setOpen]=useState(false);
  useEffect(()=>{setQuery(value)},[value]);
  const matches=options.filter(option=>option.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).slice(0,80);
  return <label className="customer-form-label market-search-select-label">{label}
    <span className="market-search-select">
      <input type="text" value={query} disabled={disabled} placeholder={placeholder} autoComplete="off" role="combobox" aria-expanded={open} aria-autocomplete="list" onFocus={()=>setOpen(true)} onChange={event=>{setQuery(event.target.value);setOpen(true)}} onKeyDown={event=>{if(event.key==='Escape')setOpen(false);if(event.key==='Enter'&&open&&matches.length){event.preventDefault();onChange(matches[0]);setQuery(matches[0]);setOpen(false)}}}/>
      <button type="button" className="market-search-select-toggle" aria-label={open?'Close options':`Show ${label.toLowerCase()} options`} disabled={disabled} onClick={()=>setOpen(current=>!current)}><ChevronDown size={16}/></button>
      {open&&!disabled&&<div className="market-search-select-menu" role="listbox">
        {matches.length?matches.map(option=><button type="button" role="option" aria-selected={option===value} key={option} onMouseDown={event=>event.preventDefault()} onClick={()=>{onChange(option);setQuery(option);setOpen(false)}}>{option}</button>):<div className="market-search-select-empty">No matches found</div>}
      </div>}
    </span>
  </label>;
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
  onOpenProduct,
  notifications = [],
  onSignOut,
  onOrderCreated,
  chatPanel,
  onOpenChat,
  onProfileUpdated,
}: StorefrontFlowProps) {
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
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const checkoutIdempotency=useRef<{fingerprint:string;key:string}|null>(null);
  const [retryingOrder,setRetryingOrder]=useState(false);const [retryPaymentPhone,setRetryPaymentPhone]=useState('');const [retryMessage,setRetryMessage]=useState('');const [paymentCelebration,setPaymentCelebration]=useState(false);const lastPaymentStatus=useRef<string|null>(null);
  const [ordersLoading,setOrdersLoading]=useState(false),[ordersError,setOrdersError]=useState('');
  const [currentPassword,setCurrentPassword]=useState(''),[newPassword,setNewPassword]=useState(''),[confirmPassword,setConfirmPassword]=useState(''),[passwordSaving,setPasswordSaving]=useState(false),[passwordMessage,setPasswordMessage]=useState('');
  const [inAppNotificationsEnabled,setInAppNotificationsEnabled]=useState(true);
  const [profileName,setProfileName]=useState(initialCustomerName),[profileEmail,setProfileEmail]=useState(initialCustomerEmail),[profilePhoneAlt,setProfilePhoneAlt]=useState(''),[profileAddress,setProfileAddress]=useState(initialCustomerAddress),[profileSaving,setProfileSaving]=useState(false),[profileMessage,setProfileMessage]=useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mpesa');
  const [paymentModal,setPaymentModal]=useState<PaymentMethod|null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [paymentPollMessage,setPaymentPollMessage]=useState('Contacting Safaricom to check your payment…');
  const [checkoutError, setCheckoutError] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('pickup');
  const [deliveryCounty, setDeliveryCounty] = useState('');
  const [deliverySubCounty, setDeliverySubCounty] = useState('');
  const [deliveryEstate, setDeliveryEstate] = useState('');
  const [deliveryDirections, setDeliveryDirections] = useState('');
  const [orderConfirmed,setOrderConfirmed]=useState(false);
  const [customerName, setCustomerName] = useState(initialCustomerName);
  const [customerPhone, setCustomerPhone] = useState(initialCustomerPhone);
  const [paymentPhone, setPaymentPhone] = useState(initialCustomerPhone);
  const [customerEmail, setCustomerEmail] = useState(initialCustomerEmail);
  const [deliveryAddress, setDeliveryAddress] = useState(initialCustomerAddress);
  const [pickupStation, setPickupStation] = useState('');
  const [deliveryPreferenceLoading,setDeliveryPreferenceLoading]=useState(false);
  const [pickupStationEditor,setPickupStationEditor]=useState(false);
  const [pickupStationDraft,setPickupStationDraft]=useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherMessage, setVoucherMessage] = useState('');
  const [appliedCoupon,setAppliedCoupon]=useState<any>(null),[shopCoupons,setShopCoupons]=useState<any[]>([]);
  const [reportShop,setReportShop]=useState(shopName),[reportOrderId,setReportOrderId]=useState(''),[reportProductId,setReportProductId]=useState(''),[reportIssue,setReportIssue]=useState('payment'),[reportPaymentMade,setReportPaymentMade]=useState(false),[reportPaymentAmount,setReportPaymentAmount]=useState(''),[reportPaymentReference,setReportPaymentReference]=useState(''),[reportDetails,setReportDetails]=useState(''),[reportFiles,setReportFiles]=useState<File[]>([]),[reportBusy,setReportBusy]=useState(false),[reportMessage,setReportMessage]=useState('');
  const [activeOrderNumber, setActiveOrderNumber] = useState('');
  const [newsletterEnabled, setNewsletterEnabled] = useState(false);
  const [isShopFollowed, setIsShopFollowed] = useState(false);
  const [buyerFeatureMessage,setBuyerFeatureMessage]=useState('');
  const [buyerFeatureBusy,setBuyerFeatureBusy]=useState(false);
  const [closureRequest,setClosureRequest]=useState<any>(null);
  const [buyerFollowedShops,setBuyerFollowedShops]=useState<any[]>([]);
  const [serverWishlist,setServerWishlist]=useState<string[]>([]),[serverWishlistLoaded,setServerWishlistLoaded]=useState(false);
  const togglePersistentWishlist=async(productId:string)=>{
    const enabled=!(serverWishlistLoaded?serverWishlist.includes(productId):wishlistIds.includes(productId));
    try{await buyerFeatureRequest('buyer-wishlist',{productId,enabled});setServerWishlist(current=>enabled?[...new Set([...current,productId])]:current.filter(id=>id!==productId));}
    catch(error:any){setBuyerFeatureMessage(error.message||'Could not update your wishlist.');}
  };
  const buyerFeatureRequest=async(action:string,payload:any={})=>{
    const response=await fetch('/api/buyer?action='+encodeURIComponent(action),{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug,...payload})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(data.error||'Could not save your account preference.');
    return data;
  };
  useEffect(()=>{
    let live=true;
    if(!initialCustomerPhone){setDeliveryPreferenceLoading(false);return()=>{live=false};}
    setDeliveryPreferenceLoading(true);
    fetch('/api/buyer?action=buyer-delivery-preference&slug='+encodeURIComponent(slug),{credentials:'same-origin',cache:'no-store'})
      .then(async response=>{const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||'Could not load your saved delivery details.');return data;})
      .then(data=>{if(!live||!data.preference)return;const p=data.preference;setDeliveryMethod(p.deliveryMethod==='home'?'home':'pickup');setDeliveryCounty(p.deliveryCounty||'');setDeliverySubCounty(p.deliverySubCounty||'');setDeliveryEstate(p.deliveryEstate||'');setDeliveryAddress(p.deliveryAddress||initialCustomerAddress);setDeliveryDirections(p.deliveryDirections||'');setPickupStation(p.pickupStation||'');})
      .catch(error=>{if(live)setCheckoutError(error.message||'Could not load your saved delivery details.');})
      .finally(()=>{if(live)setDeliveryPreferenceLoading(false);});
    return()=>{live=false;};
  },[slug,initialCustomerPhone,initialCustomerAddress]);
  useEffect(()=>{
    let live=true;
    if(!initialCustomerPhone)return;
    fetch('/api/buyer?action=buyer-account-data&slug='+encodeURIComponent(slug),{credentials:'same-origin',cache:'no-store'})
      .then(async response=>{const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||'Could not load saved account preferences.');return data;})
      .then(data=>{if(!live)return;const followed=Array.isArray(data.followedShops)?data.followedShops:[];setBuyerFollowedShops(followed);setIsShopFollowed(followed.some((shop:any)=>shop.slug===slug));setNewsletterEnabled(Boolean(data.newsletter));setClosureRequest(data.closureRequest||null);setServerWishlist(Array.isArray(data.wishlist)?data.wishlist.map((item:any)=>String(item.id)):[]);setServerWishlistLoaded(true);})
      .catch(error=>{if(live)setBuyerFeatureMessage(error.message||'Could not load saved account preferences.');});
    return()=>{live=false;};
  },[slug,initialCustomerPhone]);


  useEffect(()=>{setAppliedCoupon(null);if(voucherCode)setVoucherMessage('Your cart changed. Reapply the coupon.');},[subtotal]);

  useEffect(()=>{let live=true;fetch('/api/buyer?action=coupons-public&slug='+encodeURIComponent(slug),{credentials:'same-origin',cache:'no-store'}).then(r=>r.json()).then(d=>{if(live)setShopCoupons(Array.isArray(d.coupons)?d.coupons:[])}).catch(()=>{});return()=>{live=false}},[slug]);
  useEffect(() => { setCustomerName(initialCustomerName); setCustomerPhone(initialCustomerPhone); setPaymentPhone(initialCustomerPhone); setCustomerEmail(initialCustomerEmail); setProfileName(initialCustomerName); setProfileEmail(initialCustomerEmail); setProfileAddress(initialCustomerAddress); setProfilePhoneAlt(initialCustomerAlternativePhone); if(initialCustomerAddress&&!deliveryAddress)setDeliveryAddress(initialCustomerAddress); }, [initialCustomerName,initialCustomerPhone,initialCustomerEmail,initialCustomerAddress,initialCustomerAlternativePhone]);
  useEffect(() => {
    let live = true;
    let requestInFlight = false;
    setOrders([]);
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
          deliveryFee: Number(order.deliveryFee) || 0,
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
            lineTotal: Number(item.lineTotal) || 0,
          })),
          chatToken: '',
          paymentStatus: order.paymentStatus || 'unpaid',
          paymentIssue: order.paymentIssue || null,
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
  }, [slug, initialCustomerPhone]);

  const deliveryFee = Math.max(0,Number(deliveryMethod==='pickup'?shopDeliveryPickupFee:shopDeliveryHomeFee)||0);
  const total = Math.max(0, subtotal - Number(appliedCoupon?.discount||0) + deliveryFee);
  const activeOrder = orders.find((order) => order.orderNumber === activeOrderNumber) || (!activeOrderNumber ? orders[0] : undefined);
  useEffect(()=>{if(activeOrder?.orderId)setRetryPaymentPhone(activeOrder.customerPhone||initialCustomerPhone);if(activeOrder?.orderId&&['order-detail','order-tracking'].includes(view))onOpenChat?.('',activeOrder.orderNumber,activeOrder.orderId)},[view,activeOrder?.orderId,initialCustomerPhone]);

  useEffect(()=>{
    if(view!=='checkout/processing'||!activeOrder?.orderId)return;
    let live=true,requestInFlight=false,attempts=0,finished=false;
    const checkPayment=async()=>{
      if(!live||requestInFlight||finished)return;
      requestInFlight=true;attempts++;
      try{
        const response=await fetch('/api/buyer?action=customer-payment-status&slug='+encodeURIComponent(slug)+'&orderId='+encodeURIComponent(activeOrder.orderId),{credentials:'same-origin',cache:'no-store'});
        const data=await response.json().catch(()=>({}));
        if(!response.ok)throw Error(data.error||'Could not check payment status.');
        if(!live)return;
        const status=String(data.paymentStatus||'pending').toLowerCase();
        if(status==='succeeded'||status==='failed'||status==='cancelled'||status==='reversed'){
          finished=true;
          setOrders(current=>current.map(order=>order.orderId===activeOrder.orderId?{...order,paymentStatus:status,receipt:data.receipt||null}:order));
          setPaymentPollMessage(status==='succeeded'?'Payment confirmed by Safaricom.':'Safaricom has returned the final payment result.');
          onOrderCreated?.(activeOrder.chatToken||'',activeOrder.orderNumber);
          onNavigate('checkout/complete');
          return;
        }
        setPaymentPollMessage(attempts>20?'Still waiting for Safaricom. We’ll keep checking automatically…':data.message||'Waiting for Safaricom payment confirmation…');
      }catch(error:any){
        if(live)setPaymentPollMessage('Connection interrupted. Retrying the payment check automatically…');
      }finally{requestInFlight=false;}
    };
    setPaymentPollMessage('Contacting Safaricom to check your payment…');
    void checkPayment();
    const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void checkPayment();},6000);
    return()=>{live=false;window.clearInterval(timer);};
  },[view,slug,activeOrder?.orderId,activeOrder?.orderNumber]);

  useEffect(()=>{const status=String(activeOrder?.paymentStatus||'');if(lastPaymentStatus.current&&lastPaymentStatus.current!=='succeeded'&&status==='succeeded'){setPaymentCelebration(true);const timer=window.setTimeout(()=>setPaymentCelebration(false),5200);lastPaymentStatus.current=status;return()=>window.clearTimeout(timer)}if(status)lastPaymentStatus.current=status},[activeOrder?.paymentStatus]);
  async function retryActiveOrderPayment(){if(!activeOrder?.orderId||retryingOrder)return;const cleaned=retryPaymentPhone.trim().replace(/[\s().-]/g,'');if(!/^\+?254[17]\d{8}$|^0[17]\d{8}$/.test(cleaned)){setRetryMessage('Enter a valid Kenyan M-PESA number (07…, 01… or 254…).');return;}setRetryingOrder(true);setRetryMessage('');try{const r=await fetch('/api/payments?action=customer-payment-retry',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug,orderId:activeOrder.orderId,paymentPhone:cleaned})});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Could not retry payment');setOrders(current=>current.map(order=>order.orderId===activeOrder.orderId?{...order,paymentStatus:'pending'}:order));setRetryMessage('M-PESA prompt sent. Enter your PIN to complete payment.')}catch(e:any){setRetryMessage(e.message||'Could not retry payment')}finally{setRetryingOrder(false)}}
  const recentlyViewedProducts = recentlyViewedIds
    .map((id) => products.find((product) => product.id === id))
    .filter((product): product is StoreProduct => Boolean(product));

  function updateQuantity(id: string, quantity: number) {
    const next = { ...cart };
    if (quantity <= 0) delete next[id];
    else {
      const product = products.find((item) => item.id === id);
      const available = product?.stockQuantity == null ? 99 : Math.max(0, product.stockQuantity);
      next[id] = Math.min(99, available, quantity);
      if (next[id] <= 0) delete next[id];
    }
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
    const fingerprint=JSON.stringify({slug,items:lines.map(({product,quantity})=>[product.id,quantity]).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))),coupon:appliedCoupon?.code||'',paymentPhone:paymentPhone.trim(),deliveryFee,deliveryMethod,deliveryCounty,deliverySubCounty,deliveryEstate:deliveryEstate.trim(),deliveryAddress:deliveryAddress.trim(),deliveryDirections:deliveryDirections.trim(),pickupStation:pickupStation.trim()});
    if(!checkoutIdempotency.current||checkoutIdempotency.current.fingerprint!==fingerprint){const key=window.crypto?.randomUUID?.()||('buyer-'+Date.now()+'-'+Math.random().toString(36).slice(2,14));checkoutIdempotency.current={fingerprint,key};}
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
          paymentMethod: 'mpesa',
          items: lines.map(({ product, quantity }) => ({ id: product.id, quantity })),
          idempotencyKey: checkoutIdempotency.current.key,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.orderNumber || !data.orderId) {
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
        deliveryFee: Number(data.deliveryFee??deliveryFee),
        total: Number(data.total??total),
        lines: lines.map((line) => ({ ...line })),
        chatToken: data.chatToken||'',
        paymentStatus: data.paymentStatus || 'pending',
        discount: Number(data.discount||0),
        couponCode: data.couponCode||null,
      };
      const updatedOrders = [order, ...orders.filter((entry) => entry.orderNumber !== order.orderNumber)];
      setOrders(updatedOrders);
      setActiveOrderNumber(order.orderNumber);
      checkoutIdempotency.current=null;
      onCartChange({});
      setPaymentPollMessage('Contacting Safaricom to check your payment…');
      onNavigate('checkout/processing');
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
          <button type="button" className="customer-primary-button" disabled={!lines.length} onClick={() => onNavigate('checkout/delivery')}>
            Checkout ({formatKes(subtotal)}) <ArrowRight size={17} />
          </button>
        )}
      </aside>
    );
  }

  function renderCart() {
    const itemCount = lines.reduce((count, line) => count + line.quantity, 0);
    return (
      <section className="customer-flow market-cart-page">
        <div className="market-cart-heading">
          <button type="button" className="market-cart-back" onClick={() => onNavigate('store')}><ArrowLeft size={17}/> Continue shopping</button>
          <div><span>SHOPPING BAG</span><h1>Your cart <small>({itemCount} {itemCount===1?'item':'items'})</small></h1><p>Review your items before moving to delivery.</p></div>
        </div>
        {lines.length ? (
          <>
            <div className="market-cart-layout">
              <div className="market-cart-items">
                <div className="market-cart-list-head"><strong>Cart items</strong><span>{lines.length} {lines.length===1?'product':'products'}</span></div>
                {lines.map(({ product, quantity }) => (
                  <article className="market-cart-item" key={product.id}>
                    <button type="button" className="market-cart-product-image" onClick={() => onOpenProduct?.(product)} aria-label={`View ${product.name}`}><ProductThumb product={product}/></button>
                    <div className="market-cart-product-info">
                      <button type="button" className="market-cart-product-name" onClick={() => onOpenProduct?.(product)}>{product.name}</button>
                      <span className="market-cart-category">{product.category || 'Product'} <i>·</i> Sold by {shopName}</span>
                      <strong className="market-cart-unit-price">{formatKes(product.price)}</strong>
                      <small className={product.stockQuantity===0?'market-cart-stock-out':'market-cart-stock'}>{product.stockQuantity===0?'Currently out of stock':product.stockQuantity==null?'Availability confirmed at checkout':`${Math.max(0,product.stockQuantity)} available`}</small>
                      <div className="market-cart-mobile-actions">
                        <div className="market-cart-quantity" aria-label={`Quantity for ${product.name}`}>
                          <button type="button" aria-label={`Decrease ${product.name} quantity`} onClick={() => updateQuantity(product.id, quantity - 1)}>−</button>
                          <span>{quantity}</span>
                          <button type="button" aria-label={`Increase ${product.name} quantity`} disabled={product.stockQuantity!==null&&product.stockQuantity!==undefined&&quantity>=product.stockQuantity} onClick={() => updateQuantity(product.id, quantity + 1)}>＋</button>
                        </div>
                        <button type="button" className="market-cart-remove" onClick={() => updateQuantity(product.id, 0)}>Remove</button>
                      </div>
                    </div>
                    <div className="market-cart-item-end">
                      <strong>{formatKes(product.price * quantity)}</strong>
                      <div className="market-cart-quantity" aria-label={`Quantity for ${product.name}`}>
                        <button type="button" aria-label={`Decrease ${product.name} quantity`} onClick={() => updateQuantity(product.id, quantity - 1)}>−</button>
                        <span>{quantity}</span>
                        <button type="button" aria-label={`Increase ${product.name} quantity`} disabled={product.stockQuantity!==null&&product.stockQuantity!==undefined&&quantity>=product.stockQuantity} onClick={() => updateQuantity(product.id, quantity + 1)}>＋</button>
                      </div>
                      <button type="button" className="market-cart-remove" onClick={() => updateQuantity(product.id, 0)}>Remove</button>
                    </div>
                  </article>
                ))}
                <div className="market-cart-continue"><ShoppingBag size={16}/><button type="button" onClick={() => onNavigate('store')}>Continue shopping</button></div>
              </div>
              <aside className="market-cart-summary">
                <h2>Order summary</h2>
                <div className="market-cart-summary-line"><span>Items ({itemCount})</span><strong>{formatKes(subtotal)}</strong></div>
                <div className="market-cart-summary-line"><span>Delivery</span><span>Calculated next</span></div>
                <div className="market-cart-summary-total"><span>Subtotal</span><strong>{formatKes(subtotal)}</strong></div>
                <p className="market-cart-delivery-note">Delivery options and any applicable charges are shown on the next step.</p>
                <button type="button" className="market-cart-checkout" onClick={() => onNavigate('checkout/delivery')}>Proceed to checkout <ArrowRight size={18}/></button>
                <div className="market-cart-secure"><ShieldCheck size={17}/><span>Secure checkout<br/><small>Your order and payment details are protected.</small></span></div>
              </aside>
            </div>
            <div className="market-cart-mobile-checkout"><div><small>Subtotal</small><strong>{formatKes(subtotal)}</strong></div><button type="button" onClick={() => onNavigate('checkout/delivery')}>Checkout <ArrowRight size={17}/></button></div>
          </>
        ) : (
          <div className="market-cart-empty">
            <span><ShoppingBag size={34}/></span><h2>Your cart is waiting</h2><p>You haven’t added anything from {shopName} yet.</p>
            <button type="button" onClick={() => onNavigate('store')}>Explore products <ArrowRight size={17}/></button>
          </div>
        )}
      </section>
    );
  }

  function renderCheckoutDelivery() {
    const savePickupStation=(event:any)=>{event.preventDefault();const value=pickupStationDraft.trim();if(!value)return;setPickupStation(value);setPickupStationEditor(false);};
    const saveDeliveryPreference=async()=>{setDeliveryPreferenceLoading(true);try{return await buyerFeatureRequest('buyer-delivery-preference',{deliveryMethod,deliveryCounty,deliverySubCounty,deliveryEstate,deliveryAddress,deliveryDirections,pickupStation});}finally{setDeliveryPreferenceLoading(false);}};
    return (
      <section className="customer-flow market-checkout-page market-checkout-redesign">
        <CheckoutProgress step={1}/>
        <FlowHeading title="Delivery details" onBack={() => onNavigate('cart')} backLabel="Back to cart" />
        <div className="market-checkout-intro"><span>STEP 1 OF 3</span><h2>Where should we deliver your order?</h2><p>Choose how you would like to receive your items from {shopName}.</p></div>
        <div className="market-checkout-delivery-choice" role="tablist" aria-label="Delivery method">
          <button type="button" role="tab" aria-selected={deliveryMethod==='pickup'} className={deliveryMethod==='pickup'?'active':''} onClick={()=>setDeliveryMethod('pickup')}><span className="market-checkout-choice-icon"><MapPin size={21}/></span><span><strong>Pickup station</strong><small>Collect your order from your preferred point</small></span><i>{deliveryMethod==='pickup'?'✓':''}</i></button>
          <button type="button" role="tab" aria-selected={deliveryMethod==='home'} className={deliveryMethod==='home'?'active':''} onClick={()=>setDeliveryMethod('home')}><span className="market-checkout-choice-icon"><Package size={21}/></span><span><strong>Door delivery</strong><small>Have your order brought to your address</small></span><i>{deliveryMethod==='home'?'✓':''}</i></button>
        </div>
        <div className="market-checkout-delivery-layout"><div className="market-checkout-delivery-main">
        {deliveryMethod==='pickup' ? <div className="market-checkout-card">
          <div className="market-checkout-card-heading"><span className="market-checkout-step-icon"><MapPin size={18}/></span><div><h2>Pickup location</h2><p>Enter the collection station or preferred meeting point</p></div></div>
          {pickupStation&&!pickupStationEditor ? <div className="market-checkout-saved-location"><div><strong>{pickupStation}</strong><small>{[deliveryAddress,deliveryEstate,deliverySubCounty,deliveryCounty].filter(Boolean).join(', ')||'Saved pickup location'} · Saved for future orders</small></div><button type="button" onClick={()=>{setPickupStationDraft(pickupStation);setPickupStationEditor(true)}}>Change location</button></div> : null}
          {(!pickupStation||pickupStationEditor) && <form className="market-checkout-location-form" onSubmit={savePickupStation}>
            <div className="market-checkout-fields">
              <SearchableLocationSelect label="County" value={deliveryCounty} options={kenyanCounties} placeholder="Type to search counties…" onChange={county=>{setDeliveryCounty(county);setDeliverySubCounty('')}}/>
              <SearchableLocationSelect label="Sub-county" value={deliverySubCounty} options={kenyanSubCounties[deliveryCounty]||[]} placeholder={deliveryCounty?'Type to search sub-counties…':'Select a county first'} disabled={!deliveryCounty} onChange={setDeliverySubCounty}/>
              <label className="customer-form-label market-checkout-full">Pickup address / collection point<input required value={pickupStationDraft} onChange={e=>setPickupStationDraft(e.target.value)} placeholder="Pickup station, building, shop or collection point"/></label>
              <label className="customer-form-label">Estate / area<input required value={deliveryEstate} onChange={e=>setDeliveryEstate(e.target.value)} placeholder="Estate, town or neighbourhood"/></label>
              <label className="customer-form-label">Street / physical address<input required value={deliveryAddress} onChange={e=>setDeliveryAddress(e.target.value)} placeholder="Street, building or nearby address"/></label>
              <label className="customer-form-label market-checkout-full">Directions / landmark <small>(optional)</small><textarea value={deliveryDirections} onChange={e=>setDeliveryDirections(e.target.value)} placeholder="Add directions or a nearby landmark"/></label>
            </div>
            <div className="market-checkout-inline-actions"><button type="submit" className="customer-primary-button">Save pickup location</button>{pickupStationEditor&&<button type="button" className="customer-secondary-button" onClick={()=>setPickupStationEditor(false)}>Cancel</button>}</div>
          </form>}
        </div> : <div className="market-checkout-card">
          <div className="market-checkout-card-heading"><span className="market-checkout-step-icon"><MapPin size={18}/></span><div><h2>Delivery address</h2><p>Provide the location where the seller should deliver</p></div></div>
          <div className="market-checkout-fields">
            <SearchableLocationSelect label="County" value={deliveryCounty} options={kenyanCounties} placeholder="Type to search counties…" onChange={county=>{setDeliveryCounty(county);setDeliverySubCounty('')}}/>
            <SearchableLocationSelect label="Sub-county" value={deliverySubCounty} options={kenyanSubCounties[deliveryCounty]||[]} placeholder={deliveryCounty?'Type to search sub-counties…':'Select a county first'} disabled={!deliveryCounty} onChange={setDeliverySubCounty}/>
            <label className="customer-form-label">Estate / area<input required value={deliveryEstate} onChange={e=>setDeliveryEstate(e.target.value)} placeholder="e.g. Kilimani"/></label>
            <label className="customer-form-label">Physical address<input required value={deliveryAddress} onChange={e=>setDeliveryAddress(e.target.value)} placeholder="Building, street, plot or house number"/></label>
            <label className="customer-form-label market-checkout-full">Directions / landmark <small>(optional)</small><textarea value={deliveryDirections} onChange={e=>setDeliveryDirections(e.target.value)} placeholder="Nearby landmark, gate details or directions"/></label>
          </div>
        </div>}
        <div className="market-checkout-card">
          <div className="market-checkout-card-heading"><span className="market-checkout-step-icon"><UserRound size={18}/></span><div><h2>Contact information</h2><p>We will use these details for order updates</p></div></div>
          <div className="market-checkout-fields">
            <label className="customer-form-label">Full name<input required value={customerName} onChange={e=>setCustomerName(e.target.value)} autoComplete="name" placeholder="Your full name"/></label>
            <label className="customer-form-label">Phone number<input required type="tel" value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} autoComplete="tel" placeholder="07… or +254…"/></label>
            <label className="customer-form-label market-checkout-full">Email address <small>(optional)</small><input type="email" value={customerEmail} onChange={e=>setCustomerEmail(e.target.value)} autoComplete="email" placeholder="you@example.com"/></label>
          </div>
        </div>
        </div>
        <aside className="market-checkout-order-card">
          <div className="market-checkout-order-card-head"><span>YOUR ORDER</span><strong>{lines.reduce((count,line)=>count+line.quantity,0)} {lines.reduce((count,line)=>count+line.quantity,0)===1?'item':'items'}</strong></div>
          <div className="market-checkout-order-items">{lines.map(({product,quantity})=><div className="market-checkout-order-item" key={product.id}><ProductThumb product={product}/><div><strong>{product.name}</strong><small>Qty {quantity} · {formatKes(product.price)} each</small></div><b>{formatKes(product.price*quantity)}</b></div>)}</div>
          <div className="market-checkout-order-total"><span>Items subtotal</span><strong>{formatKes(subtotal)}</strong></div>
          <div className="market-checkout-order-total"><span>{deliveryMethod==='pickup'?'Pickup fee':'Delivery fee'}</span><strong>{deliveryFee?formatKes(deliveryFee):'Free'}</strong></div>
          {appliedCoupon&&<div className="market-checkout-order-total"><span>Discount</span><strong>−{formatKes(appliedCoupon.discount)}</strong></div>}
          <div className="market-checkout-order-grand"><span>Order total</span><strong>{formatKes(total)}</strong></div>
          <p className="market-checkout-order-secure"><ShieldCheck size={16}/> Your order details are protected. You will review the final amount before payment.</p>
        </aside></div>
        {checkoutError&&<p className="customer-checkout-error" role="alert">{checkoutError}</p>}
        <div className="market-checkout-bottom-action"><div><small>ORDER TOTAL</small><strong>{formatKes(total)}</strong></div><button type="button" className="customer-primary-button" disabled={deliveryPreferenceLoading||!customerName.trim()||!customerPhone.trim()||(deliveryMethod==='pickup'&&(!pickupStation.trim()||!deliveryCounty||!deliverySubCounty.trim()||!deliveryEstate.trim()||!deliveryAddress.trim()))||(deliveryMethod==='home'&&(!deliveryCounty||!deliverySubCounty.trim()||!deliveryEstate.trim()||!deliveryAddress.trim()))} onClick={async()=>{setCheckoutError('');try{await saveDeliveryPreference();setOrderConfirmed(false);onNavigate('checkout/payment')}catch(error:any){setCheckoutError(error.message||'Could not save your delivery details. Please try again.')}}}>{deliveryPreferenceLoading?'Saving delivery details…':'Continue to payment'} <ArrowRight size={18}/></button></div>
      </section>
    );
  }

  function renderCheckoutPayment() {
    const confirmMpesa=()=>{if(!/^\+?254[17]\d{8}$|^0[17]\d{8}$/.test(paymentPhone.trim().replace(/[\s().-]/g,''))){setCheckoutError('Enter a valid Kenyan M-PESA phone number to receive the payment prompt.');return;}setCheckoutError('');setPaymentModal(null);};
    const choosePayment=()=>{setCheckoutError('');setPaymentMethod('mpesa');setPaymentModal('mpesa');};
    return (
      <section className="customer-flow market-checkout-page market-checkout-redesign market-checkout-payment">
        <CheckoutProgress step={2}/>
        <FlowHeading title="Payment" onBack={() => onNavigate('checkout/delivery')} backLabel="Delivery details" />
        <div className="market-checkout-intro"><span>STEP 2 OF 3</span><h2>Choose how to pay</h2><p>Your payment is securely processed through M-PESA.</p></div>
        <div className="market-checkout-payment-layout">
          <div className="market-checkout-main-column">
            <div className="market-checkout-card market-checkout-payment-methods-card">
              <div className="market-checkout-card-heading"><span className="market-checkout-step-icon"><WalletCards size={18}/></span><div><h2>Choose a payment method</h2><p>Select how you would like to complete your payment.</p></div></div>
              <div className="market-payment-method-options" role="group" aria-label="Available payment methods">
                <button type="button" className="market-payment-method-option is-selected" aria-pressed="true" onClick={choosePayment}>
                  <span className="market-payment-method-brand market-payment-mpesa">M</span><strong>M-PESA</strong><small>STK Push</small><i><Check size={13}/></i>
                </button>
                <button type="button" className="market-payment-method-option is-unavailable" disabled aria-disabled="true" title="Airtel Money is not enabled for this shop">
                  <span className="market-payment-method-brand market-payment-airtel">A</span><strong>Airtel Money</strong><small>Not enabled</small><i>—</i>
                </button>
                <button type="button" className="market-payment-method-option is-unavailable" disabled aria-disabled="true" title="Card payments are not enabled for this shop">
                  <span className="market-payment-method-brand market-payment-card">▤</span><strong>Bank card</strong><small>Not enabled</small><i>—</i>
                </button>
              </div>
              <div className="market-checkout-mpesa-select" role="group" aria-label="M-PESA payment details"><span><strong>Pay securely with M-PESA</strong><small>We will send a payment request to your selected Kenyan mobile number. Enter your PIN only in the official M-PESA prompt.</small></span><button type="button" className="market-checkout-change-phone" onClick={choosePayment}>Choose phone number</button></div>
              <div className="market-checkout-secure-note"><ShieldCheck size={17}/><span>Your order remains pending until Safaricom confirms the payment. Never share your M-PESA PIN or one-time password with anyone.</span></div>
            </div>
            <div className="market-checkout-card market-checkout-voucher-card">
              <div className="market-checkout-card-heading"><span className="market-checkout-step-icon"><TicketPercent size={18}/></span><div><h2>Have a voucher?</h2><p>Apply a discount code to this order</p></div></div>
              <label className="customer-voucher"><span>Voucher code</span><span className="customer-voucher-controls"><input value={voucherCode} onChange={event=>setVoucherCode(event.target.value)} placeholder="Enter voucher code"/><button type="button" onClick={applyVoucher}>Apply</button></span>{voucherMessage&&<small role="status">{voucherMessage}</small>}</label>
            </div>
          </div>
          {renderSummary()}
        </div>
        {checkoutError&&<p className="customer-checkout-error" role="alert">{checkoutError}</p>}
        <div className="market-checkout-bottom-action"><div><small>AMOUNT TO PAY</small><strong>{formatKes(total)}</strong></div><button type="button" className="customer-primary-button" disabled={!lines.length||paymentMethod!=='mpesa'} onClick={()=>onNavigate('checkout/review')}>Review your order <ArrowRight size={18}/></button></div>
        {paymentModal==='mpesa'&&<div className="customer-payment-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setPaymentModal(null)}}><section className="customer-payment-modal market-checkout-payment-dialog" role="dialog" aria-modal="true" aria-labelledby="customer-payment-modal-title"><button type="button" className="customer-payment-modal-close" aria-label="Close payment window" onClick={()=>setPaymentModal(null)}>×</button><span className="customer-payment-modal-mark">M</span><h2 id="customer-payment-modal-title">M-PESA payment number</h2><p>Enter the Kenyan mobile number that should receive the STK payment prompt. It can be different from your buyer account number.</p><label className="customer-form-label">Phone number to pay with<input type="tel" inputMode="tel" autoComplete="tel" placeholder="07XX XXX XXX or 2547XXXXXXXX" value={paymentPhone} onChange={e=>setPaymentPhone(e.target.value)} required maxLength={16}/></label><small className="customer-payment-modal-note">Your order remains pending until Safaricom confirms payment.</small><div className="customer-payment-modal-actions"><button type="button" className="customer-secondary-button" onClick={()=>setPaymentModal(null)}>Cancel</button><button type="button" className="customer-primary-button" onClick={confirmMpesa}>Use this number <ArrowRight size={16}/></button></div></section></div>}
      </section>
    );
  }

  function renderReview() {
    const addressSummary=deliveryMethod==='home'?[deliveryAddress,deliveryEstate,deliverySubCounty,deliveryCounty].filter(Boolean).join(', '):pickupStation;
    return (
      <section className="customer-flow market-checkout-page market-checkout-redesign market-checkout-review">
        <CheckoutProgress step={3}/>
        <FlowHeading title="Review your order" onBack={() => onNavigate('checkout/payment')} backLabel="Payment" />
        <div className="market-checkout-intro"><span>STEP 3 OF 3</span><h2>Check everything before placing your order</h2><p>Review your delivery and payment details, then confirm your order.</p></div>
        <div className="market-checkout-review-layout">
          <div className="market-checkout-main-column">
            <div className="market-checkout-card">
              <div className="market-checkout-card-heading"><span className="market-checkout-step-icon"><MapPin size={18}/></span><div><h2>Delivery information</h2><p>{deliveryMethod==='pickup'?'Pickup station':'Door delivery'}</p></div><button type="button" className="market-checkout-edit" onClick={()=>{setOrderConfirmed(false);onNavigate('checkout/delivery')}}>Edit</button></div>
              <div className="market-checkout-review-details"><strong>{deliveryMethod==='pickup'?pickupStation:addressSummary}</strong>{deliveryMethod==='home'&&deliveryDirections&&<small>Directions: {deliveryDirections}</small>}<div><span>{customerName}</span><span>{customerPhone}</span>{customerEmail&&<span>{customerEmail}</span>}</div></div>
            </div>
            <div className="market-checkout-card">
              <div className="market-checkout-card-heading"><span className="market-checkout-mpesa-mark">M</span><div><h2>Payment method</h2><p>M-PESA · STK push</p></div><button type="button" className="market-checkout-edit" onClick={()=>{setOrderConfirmed(false);onNavigate('checkout/payment')}}>Edit</button></div>
              <div className="market-checkout-review-details"><strong>{paymentLabels[paymentMethod]}</strong><small>Payment prompt will be sent to {paymentPhone||customerPhone}. Payment is only complete after Safaricom confirmation.</small></div>
            </div>
            <div className="market-checkout-card">
              <div className="market-checkout-card-heading"><span className="market-checkout-step-icon"><ShoppingBag size={18}/></span><div><h2>Items in your order</h2><p>{lines.length} {lines.length===1?'product':'products'} · Fulfilled by {shopName}</p></div><button type="button" className="market-checkout-edit" onClick={()=>onNavigate('cart')}>Edit cart</button></div>
              {lines.map(({product,quantity})=><article className="customer-review-product market-checkout-product-row" key={product.id}><ProductThumb product={product}/><div><strong>{product.name}</strong><small>Quantity: {quantity} · {formatKes(product.price)} each</small></div><b>{formatKes(product.price*quantity)}</b></article>)}
            </div>
            <p className="customer-terms-copy">By placing your order, you agree to the store’s <button type="button" onClick={()=>onNavigate('shop-terms')}>Terms &amp; Conditions</button>.</p>
          </div>
          {renderSummary()}
        </div>
        {checkoutError&&<p className="customer-preview-alert" role="alert">{checkoutError}</p>}
        {orderConfirmed&&<div className="market-checkout-confirmed" role="status"><Check size={18}/><div><strong>Order details confirmed</strong><small>Your delivery, items and payment number are ready. Continue when you are ready to request the M-PESA prompt.</small></div></div>}
        <div className="market-checkout-bottom-action"><div><small>{orderConfirmed?'READY TO PAY':'ORDER TOTAL'}</small><strong>{formatKes(total)}</strong></div><button type="button" className="customer-primary-button" disabled={!lines.length||!customerName.trim()||!customerPhone.trim()||paymentMethod!=='mpesa'||submitting||(deliveryMethod==='home'&&(!deliveryCounty||!deliverySubCounty.trim()||!deliveryEstate.trim()||!deliveryAddress.trim()))||(deliveryMethod==='pickup'&&(!pickupStation.trim()||!deliveryCounty||!deliverySubCounty.trim()||!deliveryEstate.trim()||!deliveryAddress.trim()))} onClick={orderConfirmed?placeOrder:()=>setOrderConfirmed(true)}>{submitting?'Requesting M-PESA…':orderConfirmed?'Pay with M-PESA':'Confirm order'} <ArrowRight size={18}/></button></div>
      </section>
    );
  }

  function renderPaymentProcessing() {
    if(!activeOrder)return <section className="customer-flow"><FlowHeading title="Payment processing" onBack={()=>onNavigate('cart')}/><div className="customer-empty-state"><p>Loading…</p></div></section>;
    return <section className="customer-flow customer-success-page market-payment-processing">
      <div className="market-payment-processing-icon" aria-hidden="true"><span/></div>
      <span className="buyer-section-kicker">SECURE PAYMENT CHECK</span>
      <h1>Confirming your M-PESA payment</h1>
      <p className="market-payment-processing-copy">We’re checking the transaction with Safaricom. Keep this page open while we wait for the final confirmation.</p>
      <div className="customer-panel market-payment-processing-card">
        <div><small>ORDER NUMBER</small><strong>{activeOrder.orderNumber}</strong></div>
        <div><small>AMOUNT</small><strong>{formatKes(activeOrder.total)}</strong></div>
        <div><small>PAYMENT PHONE</small><strong>{paymentPhone||activeOrder.customerPhone}</strong></div>
      </div>
      <p className="market-payment-poll-status" role="status">{paymentPollMessage}</p>
      <p className="customer-preview-note"><ShieldCheck size={15}/> Your order will only be marked paid after Safaricom’s payment receipt is verified. Do not send another payment prompt while this check is running.</p>
      <div className="customer-flow-actions"><button type="button" className="customer-secondary-button" onClick={()=>openOrder(activeOrder,'order-detail')}>View order status</button></div>
    </section>;
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
    const activeOrderTab = view.startsWith('orders/') ? (view.split('/')[1] as 'ongoing'|'delivered'|'cancelled') : 'ongoing';
    const tabOrders = orders.filter(order => order.orderNumber && (activeOrderTab==='ongoing' ? !isCancelled(order)&&!isDelivered(order) : activeOrderTab==='delivered' ? isDelivered(order) : isCancelled(order)));
    const suggestions = products.filter(product => product.stockQuantity !== 0).slice(0,12);
    return (
      <section className="customer-flow buyer-my-orders-v2">
        <FlowHeading title="My orders" onBack={() => onNavigate('account')} backLabel="My account" />
        <div className="buyer-my-orders-heading">
          <div><span className="buyer-section-kicker">YOUR PURCHASES</span><h2>All orders</h2><p>View your purchases and follow their latest updates.</p></div>
          <span className="buyer-orders-total">{orders.length} {orders.length===1?'order':'orders'}</span>
        </div>
        {ordersLoading&&<p className="customer-preview-note">Refreshing your order history…</p>}
        {ordersError&&<p className="customer-preview-alert" role="alert">{ordersError}</p>}
        <nav className="buyer-my-orders-tabs" aria-label="Filter orders">
          <button type="button" className={activeOrderTab==='ongoing'?'is-active':''} onClick={()=>onNavigate('orders/ongoing')}><span>Ongoing</span><b>{orders.filter(o=>!isCancelled(o)&&!isDelivered(o)).length}</b></button>
          <button type="button" className={activeOrderTab==='delivered'?'is-active':''} onClick={()=>onNavigate('orders/delivered')}><span>Delivered</span><b>{orders.filter(isDelivered).length}</b></button>
          <button type="button" className={activeOrderTab==='cancelled'?'is-active':''} onClick={()=>onNavigate('orders/cancelled')}><span>Cancelled</span><b>{orders.filter(isCancelled).length}</b></button>
        </nav>
        {tabOrders.length ? <div className="buyer-my-orders-list">{tabOrders.map(order=>{
          const status=stateOf(order);
          const statusText=status.delivery==='delivered'?'Delivered':status.delivery==='in_transit'?'On the way':status.order==='processing'?'Processing':status.payment==='failed'?'Payment failed':status.payment==='cancelled'?'Payment cancelled':status.payment==='succeeded'?'Paid':'Order placed';
          const statusClass=status.delivery==='delivered'||status.payment==='succeeded'?'is-success':status.payment==='failed'||status.payment==='cancelled'||isCancelled(order)?'is-danger':'is-pending';
          return <article className="buyer-my-order-card" key={order.orderNumber}>
            <div className="buyer-my-order-top"><div><small>ORDER NUMBER</small><strong>{order.orderNumber}</strong><span>{new Date(order.createdAt).toLocaleDateString('en-KE',{day:'numeric',month:'short',year:'numeric'})}</span></div><span className={'buyer-my-order-status '+statusClass}><i/>{statusText}</span></div>
            <div className="buyer-my-order-items">{order.lines.slice(0,2).map(({product,quantity,lineTotal})=><div className="buyer-my-order-item" key={product.id}><ProductThumb product={product}/><div><strong>{product.name}</strong><span>Qty: {quantity}</span></div><b>{formatKes(lineTotal??product.price*quantity)}</b></div>)}
              {order.lines.length>2&&<p className="buyer-my-order-more">+{order.lines.length-2} more item{order.lines.length-2===1?'':'s'}</p>}
              {!order.lines.length&&<p className="buyer-my-order-more">Order items are being retrieved.</p>}
            </div>
            <div className="buyer-my-order-bottom"><div><small>ORDER TOTAL</small><strong>{formatKes(order.total)}</strong></div><div className="buyer-my-order-actions"><button type="button" className="customer-secondary-button" onClick={()=>openOrder(order,'order-detail')}>View details</button>{isDelivered(order)?<button type="button" className="customer-primary-button" onClick={()=>onNavigate('store')}>Shop again <ArrowRight size={15}/></button>:<button type="button" className="customer-primary-button" onClick={()=>{if(isCancelled(order)){const restartCart=Object.fromEntries(order.lines.filter(line=>products.some(product=>product.id===line.product.id)).map(line=>[line.product.id,line.quantity]));if(Object.keys(restartCart).length){onCartChange(restartCart);setDeliveryMethod(order.deliveryMethod);setDeliveryCounty(order.deliveryCounty||'');setDeliverySubCounty(order.deliverySubCounty||'');setDeliveryEstate(order.deliveryEstate||'');setDeliveryAddress(order.deliveryAddress||'');setDeliveryDirections(order.deliveryDirections||'');setPickupStation(order.pickupStation||'');onNavigate('checkout/delivery');}else{onNavigate('store');}}else{openOrder(order,'order-detail');}}}>Complete order <ArrowRight size={15}/></button>}</div></div>
          </article>;
        })}</div> : <div className="buyer-my-orders-empty"><span><Package size={28}/></span><h2>{activeOrderTab==='ongoing'?'No ongoing orders yet':activeOrderTab==='delivered'?'No delivered orders yet':'No cancelled or returned orders'}</h2><p>{activeOrderTab==='ongoing'?'When you place an order, you can follow its payment and delivery progress here.':'Orders matching this status will appear here.'}</p><button type="button" className="customer-primary-button" onClick={()=>onNavigate('store')}>Shop again <ArrowRight size={16}/></button></div>}
        {suggestions.length>0&&<section className="customer-recommendations customer-orders-recommendations"><div className="customer-section-title"><h2>You may also like</h2><button type="button" onClick={()=>onNavigate('store')}>View shop <ArrowRight size={14}/></button></div><div className="customer-recommendation-row">{suggestions.map(product=><button type="button" className="customer-recommendation-card" key={product.id} onClick={()=>onNavigate('store')}><ProductThumb product={product}/><strong>{product.name}</strong><b>{formatKes(product.price)}</b></button>)}</div></section>}
      </section>
    );
  }

  function renderOrderDetail() {
    const paymentState=String(activeOrder?.paymentStatus||'unpaid').toLowerCase();
    const orderState=String(activeOrder?.orderStatus||'').toLowerCase();
    const deliveryState=String(activeOrder?.deliveryStatus||'pending_delivery').toLowerCase();
    const paid=['succeeded','success','paid'].includes(paymentState);
    const cancelled=paymentState==='cancelled'||orderState==='cancelled';
    const failed=paymentState==='failed';
    const orderClosed=['cancelled','returned','refunded'].includes(orderState);
    const canRetryPayment=Boolean(activeOrder?.orderId&&!paid&&!orderClosed&&(activeOrder?.lines?.length||0)>0);
    const paymentLabel=orderState==='refunded'||paymentState==='refunded'?'Refunded':paid?'Paid':cancelled?'Payment cancelled':failed?'Payment failed':paymentState==='pending'?'Awaiting confirmation':'Not yet paid';
    const deliveryLabel=deliveryState==='delivered'?'Delivered':deliveryState==='in_transit'?'On the way':orderState==='processing'?'Being prepared':orderState==='fulfilled'?'Ready for delivery':cancelled?'Cancelled':'Order received';
    const isDelivered=deliveryState==='delivered';
    const processing=['processing','fulfilled'].includes(orderState)||['in_transit','delivered'].includes(deliveryState);
    const inTransit=['in_transit','delivered'].includes(deliveryState);
    const steps=[{label:'Order placed',done:true},{label:'Payment confirmed',done:paid},{label:'Processing',done:processing},{label:'Out for delivery',done:inTransit},{label:'Delivered',done:isDelivered}];
    const celebration=paymentCelebration?<div className="buyer-payment-celebration" role="status" aria-live="polite"><div className="buyer-confetti-burst">{Array.from({length:36},(_,i)=><i key={i} style={{'--confetti-angle':(i*10)+'deg','--confetti-delay':((i%7)*0.035)+'s'} as any}>{['✦','✧','●','◆','🎉'][i%5]}</i>)}</div><div className="buyer-celebration-message"><strong>Payment successful!</strong><span>Your order is confirmed. Thank you for shopping.</span></div></div>:null;
    if (!activeOrder) return <div className="customer-flow"><FlowHeading title="Order details" onBack={() => onNavigate('orders')} backLabel="My orders" /><div className="customer-empty-state"><h2>No order selected</h2><button type="button" className="customer-primary-button" onClick={() => onNavigate('orders')}>View my orders</button></div></div>;
    return (
      <section className="customer-flow buyer-order-v2 buyer-order-design">
        {celebration}
        <FlowHeading title="Order details" onBack={() => onNavigate('orders')} backLabel="My orders" />
        <header className="buyer-order-overview">
          <div className="buyer-order-overview-main"><span className="buyer-order-kicker">ORDER DETAILS</span><h2>Order #{activeOrder.orderNumber}</h2><p>Placed on {new Date(activeOrder.createdAt).toLocaleString('en-KE',{weekday:'short',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</p></div>
          <div className="buyer-order-total"><small>ORDER TOTAL</small><strong>{formatKes(activeOrder.total)}</strong></div>
          <div className="buyer-order-status-row"><span className={paid?'is-success':cancelled||failed?'is-muted':'is-pending'}><i/> Payment: {paymentLabel}</span><span className={isDelivered?'is-success':'is-muted'}><i/> Delivery: {deliveryLabel}</span></div>
          <div className="buyer-order-progress" aria-label="Order progress">{steps.map((step,index)=><div className={'buyer-order-progress-step '+(step.done?'is-done':index===steps.findIndex(item=>!item.done)?'is-current':'')} key={step.label}><span>{step.done?<Check size={17}/>:index+1}</span><small>{step.label}</small></div>)}</div>
          {(cancelled||failed)&&<p className="buyer-order-payment-explainer" role="status">{cancelled?'M-PESA prompt cancelled. No payment was collected.':'The payment was not completed. No payment was collected.'} You can retry when ready.</p>}
        </header>
        <section className="buyer-order-panel buyer-order-summary-panel">
          <div className="buyer-order-panel-heading"><span className="buyer-order-icon"><Package size={21}/></span><div><h3>Order summary</h3><p>{activeOrder.lines.reduce((n,line)=>n+line.quantity,0)} item(s)</p></div></div>
          <div className="buyer-order-money"><div><span>Items subtotal</span><strong>{formatKes(activeOrder.subtotal)}</strong></div><div><span>Delivery fee</span><strong>{formatKes(activeOrder.deliveryFee)}</strong></div>{activeOrder.discount?<div><span>Discount</span><strong>−{formatKes(activeOrder.discount)}</strong></div>:null}<div className="buyer-order-grand-total"><span>{paid?'Total paid':'Order total'}</span><strong>{formatKes(activeOrder.total)}</strong></div></div>
        </section>
        <section className="buyer-order-panel">
          <div className="buyer-order-panel-heading"><span className="buyer-order-icon"><Package size={21}/></span><div><h3>Items in your order</h3><p>{activeOrder.lines.length?activeOrder.lines.reduce((n,line)=>n+line.quantity,0)+' item(s) purchased':'Order contents unavailable'}</p></div></div>
          <div className="buyer-order-products">{activeOrder.lines.length?activeOrder.lines.map(({product,quantity,lineTotal})=><article className="buyer-order-product" key={product.id}><ProductThumb product={product}/><div className="buyer-order-product-copy"><strong>{product.name}</strong><span>Qty: {quantity}</span><small>{formatKes(product.price)} each</small>{isDelivered&&paid&&<button type="button" className="customer-order-review-link" onClick={()=>onOpenProduct?.(product)}>★ Review product</button>}</div><b>{formatKes(lineTotal ?? product.price*quantity)}</b></article>):<div className="buyer-order-missing-items" role="alert"><strong>Order items are unavailable</strong><p>Do not make another payment for this order. Contact the shop or open a report so the order can be checked.</p><button type="button" className="customer-secondary-button" onClick={()=>onNavigate('reports')}>Get help with this order</button></div>}</div>
        </section>
        <section className="buyer-order-panel">
          <div className="buyer-order-panel-heading"><span className="buyer-order-icon"><MapPin size={21}/></span><div><h3>Delivery information</h3><p>{activeOrder.deliveryMethod==='pickup'?'Collection details':'Delivery destination'}</p></div></div>
          <div className="buyer-order-detail-list"><div className="buyer-order-detail-row"><MapPin size={18}/><div><strong>{activeOrder.deliveryMethod==='pickup'?'Collection point':'Delivery address'}</strong><p>{activeOrder.deliveryMethod==='pickup'?activeOrder.pickupStation||'Collection point to be confirmed':[activeOrder.deliveryCounty,activeOrder.deliverySubCounty,activeOrder.deliveryEstate,activeOrder.deliveryAddress].filter(Boolean).join(', ')||'Delivery destination not recorded'}{activeOrder.deliveryDirections?' · '+activeOrder.deliveryDirections:''}</p></div></div><div className="buyer-order-detail-row"><UserRound size={18}/><div><strong>{activeOrder.customerName}</strong><p>{activeOrder.customerPhone}{activeOrder.customerEmail?' · '+activeOrder.customerEmail:''}</p></div></div></div>
        </section>
        <section className="buyer-order-panel">
          <div className="buyer-order-panel-heading"><span className="buyer-order-icon"><WalletCards size={21}/></span><div><h3>Payment information</h3><p>{paymentLabels[activeOrder.paymentMethod]}</p></div><span className={'buyer-order-payment-tag '+(paid?'is-success':canRetryPayment?'is-pending':'is-muted')}>{paymentLabel}</span></div>
          <div className="buyer-order-payment-method"><WalletCards size={22}/><span><strong>{paid?'Paid via '+paymentLabels[activeOrder.paymentMethod]:paymentLabels[activeOrder.paymentMethod]}</strong><small>{activeOrder.receipt?'Receipt: '+activeOrder.receipt:cancelled?'No payment collected':failed?'Payment was not completed':'Payment reference will appear when confirmed'}</small></span></div>
          {activeOrder.paymentIssue&&<div className="buyer-order-inventory-alert" role="status"><strong>Payment received — shop confirmation needed</strong><p>{activeOrder.paymentIssue} The shop needs to contact you before this order can be prepared or dispatched.</p></div>}
          {canRetryPayment&&<div className="buyer-order-retry"><div><strong>{paymentState==='pending'?'Payment is awaiting confirmation':cancelled?'Payment was cancelled':'Finish paying for this order'}</strong><p>{paymentState==='pending'?'Check the previous M-PESA request first. Do not send another prompt while Safaricom is still processing it.':'No payment was collected. You can request a fresh M-PESA prompt when ready.'}</p></div><label className="customer-form-label">M-PESA number<input type="tel" inputMode="tel" autoComplete="tel" value={retryPaymentPhone} onChange={e=>setRetryPaymentPhone(e.target.value)} placeholder="07XX XXX XXX or 2547XXXXXXXX" maxLength={16}/></label><button type="button" className="buyer-retry-payment" onClick={retryActiveOrderPayment} disabled={retryingOrder}>{retryingOrder?'Checking M-PESA…':paymentState==='pending'?'Check payment / retry if failed':'Retry M-PESA payment'}</button>{retryMessage&&<small className="market-order-retry-message" role="status">{retryMessage}</small>}</div>}
        </section>
        <div className="buyer-order-bottom-actions"><button type="button" className="customer-secondary-button" onClick={()=>openOrder(activeOrder,'order-tracking')}>Track order <ArrowRight size={16}/></button><button type="button" className="customer-primary-button" onClick={()=>onNavigate('store')}>Shop again <ShoppingBag size={16}/></button></div>
        <div className="buyer-order-safety-note"><ShieldCheck size={16}/><span>Keep your order number and payment receipt. Never share your M-PESA PIN or verification codes.</span></div>
        {chatPanel}
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
            <article className={activeOrder.paymentStatus==='succeeded'?'is-complete':activeOrder.paymentStatus==='failed'||activeOrder.paymentStatus==='cancelled'?'is-current':'is-current'}><span>{activeOrder.paymentStatus==='succeeded'?<Check size={15}/>: '2'}</span><div><strong>{activeOrder.paymentStatus==='succeeded'?'Payment confirmed':activeOrder.paymentStatus==='failed'?'Payment failed':activeOrder.paymentStatus==='cancelled'?'Payment cancelled':'Payment awaiting confirmation'}</strong><small>{activeOrder.receipt||activeOrder.paymentStatus||'Pending'}</small><p>{activeOrder.paymentStatus==='succeeded'?'Safaricom confirmed this payment.':activeOrder.paymentStatus==='cancelled'?'Safaricom confirmed that you cancelled the M-PESA prompt. No payment was collected; return to Order details to retry when ready.':activeOrder.paymentStatus==='failed'?'Safaricom confirmed that this payment failed. No payment was collected; return to Order details to retry.':'The M-PESA request is still awaiting a final result from Safaricom. You can retry only after it is confirmed failed or cancelled.'}</p></div></article>
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
  function renderProfile(){return <section className="customer-flow"><FlowHeading title="My profile" onBack={()=>onNavigate('account')} backLabel="My account"/><form className="customer-panel customer-account-detail" onSubmit={saveProfile}><div className="customer-contact-fields"><label className="customer-form-label">Full name<input name="buyer-profile-display-name" type="text" required minLength={2} maxLength={120} value={profileName} onChange={e=>setProfileName(e.target.value)} autoComplete="off" autoCorrect="off" spellCheck={false}/></label><label className="customer-form-label">Email address<input type="email" required maxLength={254} value={profileEmail} onChange={e=>setProfileEmail(e.target.value)}/></label><label className="customer-form-label">Primary phone<input value={initialCustomerPhone} disabled readOnly/></label><label className="customer-form-label">Alternative phone<input type="tel" value={profilePhoneAlt} onChange={e=>setProfilePhoneAlt(e.target.value)} placeholder="Optional Kenyan mobile number"/></label><label className="customer-form-label">Default delivery address<textarea rows={3} required maxLength={300} value={profileAddress} onChange={e=>setProfileAddress(e.target.value)} placeholder="Your default delivery address"/></label></div>{profileMessage&&<p role="status" className="customer-preview-note">{profileMessage}</p>}<div className="customer-flow-actions"><button className="customer-primary-button" type="submit" disabled={profileSaving}>{profileSaving?'Saving…':'Save profile'}</button></div></form></section>}
  function renderAccount() {
    return (
      <section className="customer-flow customer-account-page">
        <div className="customer-account-welcome"><span><UserRound size={27} /></span><div><small>MY ACCOUNT</small><h1>{customerName.trim() ? `Welcome back, ${customerName.trim()}` : 'Welcome back'}</h1><p>Manage your orders, saved items and account settings.</p><small>{initialCustomerPhone}{initialCustomerEmail?' · '+initialCustomerEmail:''}</small></div><button type="button" className="customer-secondary-button" onClick={onSignOut}>Sign out</button></div>
        <button type="button" className="buyer-account-orders-shortcut" onClick={()=>onNavigate('orders')}><span className="buyer-account-orders-icon"><Package size={20}/></span><span><strong>My Orders</strong><small>View purchases, payment and delivery updates</small></span><b>{orders.length}</b><ChevronRight size={18}/></button>
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
    if(view==='public-profile')return <section className="customer-flow"><FlowHeading title="Buyer profile" onBack={()=>onNavigate('account')} backLabel="My account"/><div className="customer-panel customer-account-detail"><h2>{profileName||initialCustomerName||'Buyer profile'}</h2><p className="customer-preview-note">Private account profile</p><dl className="customer-profile-summary"><dt>Phone</dt><dd>{initialCustomerPhone||'Not available'}</dd><dt>Email</dt><dd>{profileEmail||initialCustomerEmail||'Not provided'}</dd><dt>Default address</dt><dd>{profileAddress||initialCustomerAddress||'Not saved'}</dd></dl><p>Your buyer profile is private to this shop account. It is not published as a public profile or exposed to other shoppers.</p><button type="button" className="customer-primary-button" onClick={()=>onNavigate('profile')}>Edit profile</button></div></section>;
    const policyViews:any={
      'shop-terms':{title:'Shop Terms & Conditions',body:shopTermsAndConditions,publisher:shopName},
      'shop-privacy':{title:'Shop Privacy Policy',body:shopPrivacyPolicy,publisher:shopName},
      'shop-returns':{title:'Returns, refunds & exchanges',body:shopReturnPolicy,publisher:shopName},
      'shop-delivery':{title:'Delivery & collection policy',body:shopDeliveryPolicy,publisher:shopName},
      'platform-terms':{title:'DASMARKET Terms & Conditions',publisher:'DASMARKET · Powered by DASMARKET',body:'ABOUT THE MARKETPLACE\\nDASMARKET provides online storefront and marketplace tools that help buyers discover products and communicate with independent sellers. The seller is responsible for product descriptions, pricing, stock accuracy, fulfilment, delivery arrangements and any seller-specific promises.\\n\\nBUYER RESPONSIBILITIES\\nReview the listing and seller information carefully. Confirm the final price, delivery or collection method, delivery charges, payment recipient and applicable return terms before paying. Keep order references, messages and proof of payment. Never share your M-PESA PIN, password or one-time verification codes.\\n\\nORDERS AND PAYMENTS\\nAn order is subject to the seller’s confirmation and the payment status shown in the checkout or order record. Do not treat a payment prompt, screenshot or pending status as proof of a completed payment. Payment handling and any refund depend on the checkout method, payment provider and applicable seller terms.\\n\\nSELLER CONTENT AND AVAILABILITY\\nProduct images, descriptions, stock and prices are supplied or managed by sellers and may change. Contact the seller to clarify any detail that is important to your purchase. DASMARKET may restrict listings or accounts that appear misleading, unsafe or in breach of platform rules.\\n\\nREPORTS AND SUPPORT\\nUse the available report or complaint tools to flag suspicious listings, orders or conduct. Include relevant order references and evidence, but never include passwords, PINs or one-time codes. Platform support can assist with marketplace issues but cannot guarantee recovery of money sent directly to a seller or independently guarantee every product or seller.\\n\\nCHANGES\\nThese marketplace terms may be updated as platform features and operating requirements change. The terms displayed on this page apply when you use the marketplace.'},
      'platform-privacy':{title:'DASMARKET Privacy Policy',publisher:'DASMARKET · Powered by DASMARKET',body:'INFORMATION USED\\nDepending on the features you use, DASMARKET may process account and contact details, delivery information, order and payment references, messages, support reports, saved items and basic technical information needed to operate and secure the marketplace.\\n\\nHOW INFORMATION IS USED\\nInformation is used to create and secure accounts, operate storefronts, process orders, support buyer-seller communication, maintain order records, respond to reports, prevent misuse and improve marketplace reliability.\\n\\nWHEN INFORMATION IS SHARED\\nRelevant order and delivery details are made available to the shop handling your order so it can fulfil it and contact you. Information may also be shared with payment, hosting, messaging and other service providers where needed to provide the service, or where disclosure is required to address security, fraud or legal obligations.\\n\\nMESSAGES AND REPORTS\\nMessages and evidence submitted through order conversations or support reports may be reviewed to provide support, investigate reported conduct and protect marketplace users. Do not submit passwords, M-PESA PINs or one-time verification codes.\\n\\nSECURITY AND RETENTION\\nReasonable technical and organisational safeguards are used to protect marketplace information. No online service can promise absolute security. Information is retained for as long as reasonably needed for account operation, order records, support, security and applicable obligations.\\n\\nYOUR CHOICES\\nKeep your account contact details accurate and use account settings or support to request help with your information or account. For privacy questions, contact DASNET support at support@dasnet.co.ke or +254 758 884 861.'}
    };
    if(policyViews[view])return <section className="customer-flow"><FlowHeading title={policyViews[view].title} onBack={()=>onNavigate('account')} backLabel="My account"/><article className="customer-panel customer-account-detail"><div className="customer-policy-publisher"><strong>{shopName}</strong><small>Published by this shop</small></div>{policyViews[view].body?<div style={{whiteSpace:'pre-wrap',lineHeight:1.75}}>{policyViews[view].body}</div>:<p className="customer-preview-note">This shop has not published this policy yet. Contact the seller if you need clarification before placing an order.</p>}</article></section>;
    if(view==='wishlist'){
      const savedProducts=products.filter(product=>(serverWishlistLoaded?serverWishlist:wishlistIds).includes(product.id));
      return <section className="customer-flow"><FlowHeading title="Saved items" onBack={()=>onNavigate('account')} backLabel="My account"/><div className="customer-panel customer-account-detail"><div className="customer-panel-heading"><h2>Your wishlist</h2><span>{savedProducts.length} saved</span></div><p className="customer-preview-note">Saved items are synced to your buyer account.</p>{savedProducts.length?<div className="customer-recommendation-row">{savedProducts.map(product=><article className="customer-recommendation-card" key={product.id}><ProductThumb product={product}/><strong>{product.name}</strong><b>{formatKes(product.price)}</b><div className="customer-wishlist-actions"><button type="button" className="customer-secondary-button" onClick={()=>onOpenProduct?.(product)}>View item</button><button type="button" className="customer-text-button" onClick={()=>togglePersistentWishlist(product.id)}>Remove</button></div></article>)}</div>:<div className="customer-empty-state"><span><ShoppingBag size={28}/></span><h2>No saved items yet</h2><p>Open a product and save it to your wishlist to keep it here.</p><button type="button" className="customer-primary-button" onClick={()=>onNavigate('store')}>Browse products</button></div>}</div></section>;
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
    if(view==='address-book')return <section className="customer-flow"><FlowHeading title="Address book" onBack={()=>onNavigate('account')} backLabel="My account"/><div className="customer-panel customer-account-detail"><h2>Default delivery address</h2><p>{profileAddress||initialCustomerAddress||'No default address saved yet.'}</p><p className="customer-preview-note">Your default address is saved with your buyer profile and can be updated at any time.</p><button type="button" className="customer-primary-button" onClick={()=>onNavigate('profile')}>Edit and save address</button></div></section>;
    if(view==='notifications')return <section className="customer-flow"><FlowHeading title="Order notifications" onBack={()=>onNavigate('account')} backLabel="My account"/><div className="customer-panel customer-account-detail"><div className="customer-panel-heading"><h2>Recent order updates</h2><span>{notifications.length} updates</span></div>{notifications.length?notifications.map((item:any)=><article className="customer-order-card" key={item.id||item.orderId||item.complaintId||item.orderNumber}><div className="customer-order-card-heading"><strong>{item.title}</strong><small>{item.created_at?new Date(item.created_at).toLocaleString('en-KE'):item.updatedAt?new Date(item.updatedAt).toLocaleString('en-KE'):'Update'}</small></div><p>{item.detail}</p><button type="button" className="customer-secondary-button" onClick={()=>onNavigate(item.complaint_id?'my-reports':'orders')}>{item.complaint_id?'Track my report':'View my orders'}</button></article>):<div className="customer-empty-state"><span><Package size={28}/></span><h2>No recent updates</h2><p>Payment, fulfilment and delivery changes will appear here when the seller updates your order.</p><button type="button" className="customer-primary-button" onClick={()=>onNavigate('orders')}>View my orders</button></div>}</div></section>;
    if(view==='notification-settings')return <section className="customer-flow"><FlowHeading title="Notification settings" onBack={()=>onNavigate('account')} backLabel="My account"/><div className="customer-panel customer-account-detail"><h2>In-app order updates</h2><p>Choose whether this device displays order payment and delivery updates in the storefront notification menu.</p><label className="customer-newsletter-toggle"><input type="checkbox" checked={inAppNotificationsEnabled} onChange={e=>setInAppNotificationsEnabled(e.target.checked)}/><span>{inAppNotificationsEnabled?'Order notifications enabled':'Order notifications paused'}</span></label><p className="customer-preview-note">This preference is saved on this device. Your order and payment records are not affected.</p></div></section>;
    if(view==='reviews'){const reviewProducts=products.filter(product=>orders.some(order=>order.paymentStatus==='succeeded'&&order.lines.some(line=>line.product.id===product.id)));return <section className="customer-flow"><FlowHeading title="Product reviews" onBack={()=>onNavigate('account')} backLabel="My account"/><div className="customer-panel customer-account-detail"><h2>Products you have purchased</h2>{reviewProducts.length?<div className="customer-recommendation-row">{reviewProducts.map(product=><article className="customer-recommendation-card" key={product.id}><ProductThumb product={product}/><strong>{product.name}</strong><b>{formatKes(product.price)}</b><button type="button" className="customer-secondary-button" onClick={()=>onOpenProduct?.(product)}>Write a review</button></article>)}</div>:<div className="customer-empty-state"><span><ShieldCheck size={28}/></span><h2>No reviewable purchases yet</h2><p>After a successful payment, you can review the products you bought.</p><button type="button" className="customer-primary-button" onClick={()=>onNavigate('orders')}>View my orders</button></div>}</div></section>}
    if(view==='followed-shops')return <section className="customer-flow"><FlowHeading title="Followed shops" onBack={()=>onNavigate('account')} backLabel="My account"/><div className="customer-panel customer-account-detail"><div className="customer-panel-heading"><h2>{shopName}</h2><span>{isShopFollowed?'Following':'Not followed'}</span></div><p>Follow this shop to keep it in your account across devices. Your followed shops are saved to your buyer account.</p><p className="customer-preview-note">{buyerFollowedShops.length} shop{buyerFollowedShops.length===1?'':'s'} followed</p><div className="customer-flow-actions"><button type="button" disabled={buyerFeatureBusy} className={isShopFollowed?'customer-secondary-button':'customer-primary-button'} onClick={async()=>{setBuyerFeatureBusy(true);setBuyerFeatureMessage('');try{const next=!isShopFollowed;await buyerFeatureRequest('buyer-follow-shop',{targetSlug:slug,follow:next});setIsShopFollowed(next);setBuyerFollowedShops(current=>next?[{slug,name:shopName},...current.filter((x:any)=>x.slug!==slug)]:current.filter((x:any)=>x.slug!==slug));}catch(error:any){setBuyerFeatureMessage(error.message||'Could not update followed shops.');}finally{setBuyerFeatureBusy(false);}}}>{buyerFeatureBusy?'Saving…':isShopFollowed?'Unfollow shop':'Follow shop'}</button><button type="button" className="customer-secondary-button" onClick={()=>onNavigate('store')}>Browse this shop</button></div>{buyerFeatureMessage&&<p className="customer-preview-note" role="status">{buyerFeatureMessage}</p>}</div></section>;
    if(view==='newsletter')return <section className="customer-flow"><FlowHeading title="Shop updates & offers" onBack={()=>onNavigate('account')} backLabel="My account"/><div className="customer-panel customer-account-detail"><h2>Shop update preference</h2><p>Choose whether this shop may send you marketing updates using the email address on your buyer account. You can withdraw consent at any time.</p><label className="customer-newsletter-toggle"><input type="checkbox" checked={newsletterEnabled} disabled={buyerFeatureBusy} onChange={async event=>{const enabled=event.target.checked;setBuyerFeatureBusy(true);setBuyerFeatureMessage('');try{await buyerFeatureRequest('buyer-newsletter',{enabled,email:initialCustomerEmail});setNewsletterEnabled(enabled);}catch(error:any){setBuyerFeatureMessage(error.message||'Could not update your subscription.');}finally{setBuyerFeatureBusy(false);}}}/><span>{newsletterEnabled?'Subscribed to shop updates':'Subscribe to shop updates'}</span></label><p className="customer-preview-note" role="status">{newsletterEnabled?'Your marketing consent is saved to your buyer account.':'You are not subscribed to this shop’s marketing updates.'}</p>{buyerFeatureMessage&&<p className="customer-preview-note" role="status">{buyerFeatureMessage}</p>}</div></section>;
    if(view==='close-account'){return <section className="customer-flow"><FlowHeading title="Close account" onBack={()=>onNavigate('account')} backLabel="My account"/><div className="customer-panel customer-account-detail"><h2>Request buyer account closure</h2><p>Account closure is handled by DASNET Support after identity verification. Your account will not be deleted by opening this link. Order, payment, tax and dispute records may need to be retained where required by law or to resolve an active case.</p><p><strong>Account:</strong> {initialCustomerName||'Buyer'} · {initialCustomerPhone}</p>{closureRequest&&<p className="customer-preview-note">Existing request: {closureRequest.status.replace('_',' ')} · submitted {new Date(closureRequest.created_at||closureRequest.createdAt).toLocaleDateString()}</p>}<button type="button" className="customer-primary-button" disabled={buyerFeatureBusy||closureRequest?.status==='pending'||closureRequest?.status==='under_review'} onClick={async()=>{setBuyerFeatureBusy(true);setBuyerFeatureMessage('');try{const data=await buyerFeatureRequest('buyer-close-account',{reason:'Buyer requested account closure from the account settings page.'});setClosureRequest(data.request||null);setBuyerFeatureMessage(data.message||'Your request has been recorded.');}catch(error:any){setBuyerFeatureMessage(error.message||'Could not submit your closure request.');}finally{setBuyerFeatureBusy(false);}}}>{buyerFeatureBusy?'Submitting…':closureRequest?.status==='pending'||closureRequest?.status==='under_review'?'Closure request submitted':'Submit account closure request'}</button>{buyerFeatureMessage&&<p className="customer-preview-note" role="status">{buyerFeatureMessage}</p>}</div></section>;}
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

  if (view.startsWith('collection/')) {
    const collectionKey = view.split('/')[1] || 'all-products';
    const collectionTitles: Record<string,string> = {
      'all-products': 'All products',
      'top-picks': 'Shop picks',
      'featured-products': 'Featured products',
      'new-finds': 'New finds',
      'categories': 'Browse categories',
    };
    const collectionProducts = collectionKey === 'featured-products'
      ? products.filter((product:any) => Boolean(product.spotlight))
      : collectionKey === 'top-picks'
        ? products.slice(0, 12)
        : collectionKey === 'new-finds'
          ? products.slice(0, 12)
          : products;
    const categories = [...new Set(products.map(product => String(product.category || 'Other')))].sort((a,b)=>a.localeCompare(b));
    return (
      <section className="customer-flow customer-collection-page">
        <FlowHeading title={collectionTitles[collectionKey] || 'Shop products'} onBack={() => onNavigate('store')} />
        {collectionKey === 'categories' ? (
          <div className="customer-panel customer-collection-categories">
            <p>Choose a category to browse products from {shopName}.</p>
            <div className="customer-account-links">
              {categories.map(category => <button type="button" className="customer-account-link" key={category} onClick={() => onNavigate(category.toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''))}>
                <ShoppingBag size={18}/><span>{category}</span><ChevronRight size={16}/>
              </button>)}
            </div>
          </div>
        ) : (
          <>
            {collectionKey === 'featured-products' && collectionProducts.length === 0 && <p className="customer-preview-note">This shop has not marked any products as featured yet. Browse the full catalogue instead.</p>}
            <div className="market-products-grid customer-collection-grid">
              {(collectionProducts.length ? collectionProducts : products).map(product => (
                <article className="market-product-card" key={product.id}>
                  <button type="button" className="market-home-product-open" onClick={() => onOpenProduct?.(product)}>
                    <ProductThumb product={product}/>
                    <strong>{product.name}</strong>
                    <b>{formatKes(product.price)}</b>
                    <small>{product.stockQuantity === 0 ? 'Out of stock' : product.stockQuantity == null ? 'Available' : product.stockQuantity + ' in stock'}</small>
                  </button>
                  <button type="button" className="market-product-add" disabled={product.stockQuantity === 0} onClick={() => onCartChange({...cart,[product.id]:Math.min(99,product.stockQuantity ?? 99,(cart[product.id]||0)+1)})}>Add to cart</button>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    );
  }

  if (view === 'trust-safety') return (
    <section className="customer-flow storefront-all-faqs">
      <FlowHeading title="Trust & safety" onBack={() => onNavigate('store')} backLabel="Back to shop" />
      <p className="storefront-all-faqs-intro">Practical checks to help you make informed decisions when shopping with independent sellers.</p>
      <div className="customer-panel customer-account-detail">
        <h2>Before you pay</h2><p>Confirm the product, final price, seller identity, payment recipient and delivery or collection arrangements. Ask for current photos or a demonstration when appropriate.</p>
        <h2>Protect your account and money</h2><p>Never share your M-PESA PIN, password or one-time verification code. Verify payment status in your own official payment app; do not rely on screenshots or forwarded messages.</p>
        <h2>Keep a record</h2><p>Keep the listing, order reference, seller conversation and proof of payment. Agree return or refund terms in writing before paying.</p>
        <h2>Report a concern</h2><p>Stop a suspicious transaction, preserve relevant evidence and use Reports & Complaints or contact DASNET support. If you sent money, contact your payment provider promptly.</p>
        <p><strong>Important:</strong> DASMARKET provides marketplace and storefront tools. It does not independently inspect every item or guarantee every seller, delivery or direct payment.</p>
        <button type="button" className="customer-primary-button" onClick={()=>onNavigate('my-reports')}>Report a problem</button>
      </div>
    </section>
  );

  if (view === 'faqs') return (
    <section className="customer-flow storefront-all-faqs">
      <FlowHeading title="Frequently asked questions" onBack={() => onNavigate('store')} backLabel="Back to shop" />
      <p className="storefront-all-faqs-intro">Helpful answers about buying, sellers, payments, delivery and staying safe on DASNET.</p>
      <div className="storefront-all-faqs-list">{(shopFaqs.length?shopFaqs:marketplaceFaqs.map(([question,answer])=>({question,answer}))).map((faq:any)=><details key={faq.question}><summary>{faq.question}<span>＋</span></summary><p>{faq.answer}</p></details>)}</div>
    </section>
  );

  if (view === 'store') return null;
  const pageContent = view === 'cart' ? renderCart() : view === 'checkout/delivery' ? (lines.length ? renderCheckoutDelivery() : renderCart()) : view === 'checkout/payment' ? (lines.length ? renderCheckoutPayment() : renderCart()) : view === 'checkout/review' ? (lines.length ? renderReview() : renderCart()) : view === 'checkout/processing' ? renderPaymentProcessing() : view === 'checkout/complete' ? renderSuccess() : view === 'orders' || view.startsWith('orders/') ? renderOrders() : view === 'order-detail' ? renderOrderDetail() : view === 'order-tracking' ? renderTracking() : view === 'account' ? renderAccount() : view === 'profile' ? renderProfile() : renderAccountSection() || (<section className="customer-flow"><FlowHeading title="Shopping assistant" onBack={() => onNavigate('store')} /><div className="customer-panel customer-account-detail"><Search size={24} /><p>{accountSectionCopy.assistant.description}</p><button type="button" className="customer-secondary-button" onClick={() => onNavigate('store')}>Back to the store</button></div></section>);
  // The storefront-level marketplace header is the single buyer navigation surface for every route.
  // Do not mount a second sticky nav here: nested sticky bars overlapped the account/cart content
  // and intercepted taps on mobile.
  return <div className="customer-workspace-shell">{pageContent}</div>;
}
