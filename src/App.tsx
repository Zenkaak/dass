import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Activity, ArrowRight, ArrowUpRight, Baby, Bell, Briefcase, Building2, Car, Check, ChevronLeft, ChevronRight, CircleAlert, CreditCard, Download, Dumbbell, FileSpreadsheet, FileText, Flag, Gamepad2, Globe, Heart, HelpCircle, Home, Laptop, LayoutDashboard, LogOut, MapPin, Menu, MessageCircle, Package, PawPrint, Plus, RefreshCw, Refrigerator, Search, Send, Settings, ShieldCheck, Shirt, ShoppingBag, ShoppingCart, Smartphone, Sofa, Sparkles, Sprout, Star, Store, TicketPercent, Tv, UserCheck, UserRound, Wallet, WalletCards, Wrench, X } from 'lucide-react';
import { storefrontCategories } from './storefrontCatalog';
import { marketplaceFaqs } from './marketplaceFaqs';
import { AuthPage } from './AuthPage';
import ReplitLandingPage from './ReplitLandingPage';
import PlatformSeoPage, { isPlatformSeoPath } from './PlatformSeoPage';
import { StorefrontProductDetail, fallbackProductImage, type LiveProduct } from './StorefrontProductDetail';
import { BulkCatalogueImporter } from './BulkCatalogueImporter';
import { OfflineIndicator, PWAInstallButton } from './pwa/PWAInstallButton';
import './storefront-redesign.css';


const StorefrontFlow = lazy(()=>import('./StorefrontFlow').then(m=>({default:m.StorefrontFlow})));
const SellerShopControls = lazy(()=>import('./SellerShopControls').then(m=>({default:m.SellerShopControls})));
const SellerDomains = lazy(()=>import('./SellerDomains').then(m=>({default:m.SellerDomains})));
const BuyerAuthPage = lazy(()=>import('./BuyerAuthPage').then(m=>({default:m.BuyerAuthPage})));
const PlatformAdminDashboard = lazy(()=>import('./PlatformAdminDashboard').then(m=>({default:m.PlatformAdminDashboard})));
const DisputesPanel = lazy(()=>import('./DisputesPanel').then(m=>({default:m.DisputesPanel})));
function Deferred({children}:{children:any}) {
 return <Suspense fallback={<div className="dasnet-route-loading" role="status">Loading…</div>}>{children}</Suspense>;
}

const sellerCategoryOptions = Array.from(new Set(storefrontCategories.flatMap(category => [category.name, ...category.subcategories.filter(child => !child.startsWith('All '))])));
const storeAccentColors = [
  {name:'Marketplace orange',value:'#e47a13'},
  {name:'Ocean blue',value:'#2563eb'},
  {name:'Forest green',value:'#16803d'},
  {name:'Rose pink',value:'#db2777'},
  {name:'Royal purple',value:'#7c3aed'},
  {name:'Deep teal',value:'#0f766e'},
  {name:'Classic red',value:'#c62828'},
  {name:'Charcoal',value:'#374151'},
  {name:'Luxury gold',value:'#9a7628'},
];



async function readApiResponse(response: Response) {
 const raw=await response.text(); let data:any={};
 try{data=raw?JSON.parse(raw):{}}catch{data={error:response.ok?'The server returned an unreadable response.':`Server error (HTTP ${response.status}). Please retry and share the time if it continues.`}}
 if(!response.ok&&!data.error)data.error=`Request failed (HTTP ${response.status}).`; return data;
}
async function uploadToObjectStorage(url:string,file:File,label='File'){
 let response:Response;
 try{response=await fetch(url,{method:'PUT',headers:{'Content-Type':file.type||'application/octet-stream'},body:file})}
 catch(e:any){throw Error(label+' could not reach object storage. Check the storage endpoint and browser network access, then retry. '+(e?.message||''))}
  if(!response.ok){
    const body=await response.text().catch(()=>'');
    const code=new RegExp('<Code>([^<]+)</Code>','i').exec(body)?.[1];
    const message=new RegExp('<Message>([^<]+)</Message>','i').exec(body)?.[1];
    throw Error(label+' rejected by storage (HTTP '+response.status+')'+(code?' · '+code:'')+(message?' · '+message:''));
  }
 return response;
}
function Brand() {
  return <a className="brand" href="/" aria-label="DASNET home"><span className="brand-mark">D</span><span>DASNET</span></a>;
}

function LandingPage() { return <ReplitLandingPage/>; }
function categorySlug(value:string){return value.toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
function storeCategoryIcon(name:string){
 const key=name.toLowerCase();
 if(key.includes('phone'))return <Smartphone size={16}/>;
 if(key.includes('computer')||key.includes('laptop'))return <Laptop size={16}/>;
 if(key.includes('tv')||key.includes('audio'))return <Tv size={16}/>;
 if(key.includes('gaming'))return <Gamepad2 size={16}/>;
 if(key.includes('appliance'))return <Refrigerator size={16}/>;
 if(key.includes('furniture'))return <Sofa size={16}/>;
 if(key.includes('fashion'))return <Shirt size={16}/>;
 if(key.includes('beauty')||key.includes('health'))return <Sparkles size={16}/>;
 if(key.includes('babies')||key.includes('kids'))return <Baby size={16}/>;
 if(key.includes('sport')||key.includes('music'))return <Dumbbell size={16}/>;
 if(key.includes('vehicle'))return <Car size={16}/>;
 if(key.includes('property'))return <Building2 size={16}/>;
 if(key.includes('agriculture')||key.includes('food'))return <Sprout size={16}/>;
 if(key.includes('animal')||key.includes('pet'))return <PawPrint size={16}/>;
 if(key.includes('tool')||key.includes('business'))return <Wrench size={16}/>;
 return <Briefcase size={16}/>;
}
function categoryApiFilter(value:string){const group=storefrontCategories.find(c=>c.name.toLocaleLowerCase()===value.toLocaleLowerCase()||c.subcategories.some(child=>child.toLocaleLowerCase()===value.toLocaleLowerCase()));return group&&group.name.toLocaleLowerCase()===value.toLocaleLowerCase()?[group.name,...group.subcategories.filter(child=>!child.startsWith('All '))].join('|'):value;}
function categoryRoute(value:string){const parent=storefrontCategories.find(c=>c.name===value||c.subcategories.includes(value));if(!parent)return '';if(value===parent.name)return categorySlug(parent.name);if(value.startsWith('All '))return categorySlug(parent.name)+'/'+(parent.name==='Gaming'?'all-games':'all-'+categorySlug(parent.name));return categorySlug(parent.name)+'/'+categorySlug(value);}
function readCachedStorefront(slug:string){try{const raw=localStorage.getItem('dasnet-storefront-cache-'+slug);if(!raw)return null;const value=JSON.parse(raw);if(!value||!Array.isArray(value.products)||!value.shop)return null;/* A legacy partial cache must never make a large catalogue look complete. */if(value.products.length<35)return null;return {shop:value.shop,products:value.products.slice(0,60) as LiveProduct[],totalProducts:Number(value.totalProducts||value.products.length)}}catch{return null}}
function MerchantStore({ slug: initialSlug, initialBuyerPage = 'store' }: { slug: string; initialBuyerPage?: string }) {
 const [slug,setSlug]=useState(initialSlug);
 const cachedStorefront=readCachedStorefront(slug);
 const previousPaymentStatus=useRef<string|null>(null);const [chatToken,setChatToken]=useState(''),[chatOrderId,setChatOrderId]=useState(''),[chatOrderNumber,setChatOrderNumber]=useState(''),[chatOrder,setChatOrder]=useState<any>(null),[chatMessages,setChatMessages]=useState<any[]>([]),[chatAttachments,setChatAttachments]=useState<any[]>([]),[chatDraft,setChatDraft]=useState(''),[chatSending,setChatSending]=useState(false),[paymentCelebration,setPaymentCelebration]=useState(false),[chatError,setChatError]=useState('');
 const [filter,setFilter]=useState('All products'),[search,setSearch]=useState(''),[sortOrder,setSortOrder]=useState('recommended'),[products,setProducts]=useState<LiveProduct[]>(()=>cachedStorefront?.products||[]);
 const [cartScopeReady,setCartScopeReady]=useState(Boolean(initialSlug));
 const [catalogueOffset,setCatalogueOffset]=useState(cachedStorefront?.products.length||0),[catalogueTotal,setCatalogueTotal]=useState(cachedStorefront?.totalProducts||0),[catalogueHasMore,setCatalogueHasMore]=useState(true),[loadingMore,setLoadingMore]=useState(false);const catalogueSentinelRef=useRef<HTMLDivElement|null>(null);const [shop,setShop]=useState<{name:string;description:string;logoUrl?:string;whatsappNumber?:string;contactPhone?:string;contactEmail?:string;termsAndConditions?:string;privacyPolicy?:string;returnPolicy?:string;deliveryPolicy?:string;deliveryHomeFee?:number;deliveryPickupFee?:number;cashOnDeliveryEnabled?:boolean;cashOnPickupEnabled?:boolean;faqs?:Array<{question:string;answer:string}>;theme?:string}|null>(()=>cachedStorefront?.shop||null),[loading,setLoading]=useState(!cachedStorefront),[error,setError]=useState(''),[notFound,setNotFound]=useState(false),[cart,setCart]=useState<Record<string,number>>(()=>{try{const saved=JSON.parse(localStorage.getItem('dasnet-cart-'+slug)||'{}');if(!saved||typeof saved!=='object'||Array.isArray(saved))return {};return Object.fromEntries(Object.entries(saved).filter(([id,q])=>typeof id==='string'&&Number.isInteger(q)&&Number(q)>0).map(([id,q])=>[id,Math.min(99,Number(q))]));}catch{return {};}}),[selectedProduct,setSelectedProduct]=useState<LiveProduct|null>(null),[mobileSidebarOpen,setMobileSidebarOpen]=useState(false),[desktopSidebarOpen,setDesktopSidebarOpen]=useState(false),[buyerMobileNavOpen,setBuyerMobileNavOpen]=useState(false);
 useEffect(()=>{if(!notFound)return;const previousTitle=document.title;const robots=document.head.querySelector('meta[name="robots"]') as HTMLMetaElement|null;const previousRobots=robots?.content||'';const meta=robots||document.createElement('meta');meta.name='robots';meta.content='noindex,nofollow';if(!robots)document.head.appendChild(meta);const canonical=document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement|null;const previousCanonical=canonical?.href||'';canonical?.remove();document.title='Shop not found | DASMARKET';return()=>{document.title=previousTitle;if(previousRobots){meta.content=previousRobots}else{meta.remove()}if(previousCanonical){const restored=document.createElement('link');restored.rel='canonical';restored.href=previousCanonical;document.head.appendChild(restored)}}},[notFound]);
  useEffect(()=>{
    if(!mobileSidebarOpen&&!desktopSidebarOpen&&!buyerMobileNavOpen)return;
    const closeOnEscape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setMobileSidebarOpen(false);setDesktopSidebarOpen(false);setBuyerMobileNavOpen(false);}};
    document.addEventListener('keydown',closeOnEscape);
    return()=>document.removeEventListener('keydown',closeOnEscape);
  },[mobileSidebarOpen,desktopSidebarOpen,buyerMobileNavOpen]);
 const [buyerPage,setBuyerPage]=useState(initialBuyerPage||'store'),[expandedCategory,setExpandedCategory]=useState('');
 const emailOrderNumber=useRef(new URLSearchParams(window.location.search).get('order')||'');
  const [wishlistIds,setWishlistIds]=useState<string[]>(()=>{try{const saved=JSON.parse(localStorage.getItem('dasnet-wishlist-'+slug)||'[]');return Array.isArray(saved)?saved.filter((id:any)=>typeof id==='string'):[]}catch{return[]}});
  useEffect(()=>{try{localStorage.setItem('dasnet-wishlist-'+slug,JSON.stringify(wishlistIds))}catch{}},[wishlistIds,slug]);
  function toggleWishlist(id:string){
  setWishlistIds(current=>{
    const enabled=!current.includes(id);
    if(buyerCustomer?.phone)fetch('/api/buyer?action=buyer-wishlist',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug,productId:id,enabled})}).then(async response=>{if(!response.ok){const data=await response.json().catch(()=>({}));throw Error(data.error||'Wishlist could not be synced.');}}).catch(error=>console.warn('Buyer wishlist sync failed:',error));
    return enabled?[...current,id]:current.filter(value=>value!==id);
  });
}
 const [buyerCustomer,setBuyerCustomer]=useState<any>(null),[buyerAuthChecked,setBuyerAuthChecked]=useState(false),[buyerReturnPage,setBuyerReturnPage]=useState('account');
  useEffect(()=>{
    let live=true;
    if(!buyerCustomer?.phone||!buyerAuthChecked)return;
    fetch('/api/buyer?action=buyer-account-data&slug='+encodeURIComponent(slug),{credentials:'same-origin',cache:'no-store'})
      .then(async response=>{const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||'Could not load buyer account data.');return data;})
      .then(data=>{if(live&&Array.isArray(data.wishlist))setWishlistIds(data.wishlist.map((item:any)=>String(item.id)));})
      .catch(error=>console.warn('Buyer account sync unavailable:',error));
    return()=>{live=false;};
  },[slug,buyerCustomer?.phone,buyerAuthChecked]);

 const [buyerNotifications,setBuyerNotifications]=useState<any[]>([]),[buyerNotificationsOpen,setBuyerNotificationsOpen]=useState(false),[buyerInitialReportId,setBuyerInitialReportId]=useState('');
 const [recentlyViewed,setRecentlyViewed]=useState<string[]>(()=>{try{const saved=JSON.parse(localStorage.getItem('dasnet-recently-viewed-'+slug)||'[]');return Array.isArray(saved)?saved:[]}catch{return[]}});
 const isTenantSubdomain=window.location.hostname.toLowerCase().endsWith('.dasmarket.co.ke')&&!['www','app'].includes(window.location.hostname.toLowerCase().split('.')[0]);
 const storeBasePath=isTenantSubdomain?'':`/${slug}`;
 const buyerPath=(page:string)=>page==='store'?(storeBasePath||'/'):`${storeBasePath}/${page}`||`/${page}`;
 function navigateBuyerPage(page:string){if(page==='reports'||page==='report-shop')page='my-reports';if(['recently-viewed','followed-shops','notification-settings','public-profile','newsletter'].includes(page))page='account';if((['account','profile','orders','order-detail','order-tracking','inbox','wishlist','recently-viewed','address-book','address-book/edit','vouchers','reviews','notifications','my-reports','followed-shops','newsletter','notification-settings','public-profile','account-management','close-account'].includes(page)||page.startsWith('orders/')||page.startsWith('my-reports/'))&&!buyerCustomer){setBuyerReturnPage(page);page='buyer-login'}if((page==='checkout/delivery'||page==='checkout/payment'||page==='checkout/review')&&!buyerCustomer){setBuyerReturnPage(page);page='buyer-login'}if(page==='store'){setFilter('All products');setSearch('');setExpandedCategory('');setSelectedProduct(null)}setBuyerPage(page);if(page!=='product-detail')setSelectedProduct(null);setMobileSidebarOpen(false);setDesktopSidebarOpen(false);setBuyerMobileNavOpen(false);setBuyerNotificationsOpen(false);const nextPath=buyerPath(page);if(window.location.pathname!==nextPath)window.history.pushState({buyerPage:page},'',nextPath);window.scrollTo({top:0,behavior:'instant' as ScrollBehavior})}
 function selectStoreCategory(category:string){const parent=storefrontCategories.find(c=>c.name===category||c.subcategories.includes(category));const filterValue=category.startsWith('All ')?(parent?.name||category):category;setFilter(filterValue);setSearch('');setSelectedProduct(null);setProducts([]);setCatalogueOffset(0);setCatalogueHasMore(false);setLoadingMore(false);setLoading(true);setBuyerPage('store');setMobileSidebarOpen(false);setDesktopSidebarOpen(false);const nextPath=buyerPath('store');if(window.location.pathname!==nextPath)window.history.replaceState({buyerPage:'store'},'',nextPath)}
 function openProduct(product:LiveProduct){setProducts(current=>current.some(item=>item.id===product.id)?current:[...current,product]);setSelectedProduct(product);setBuyerPage('product-detail');setMobileSidebarOpen(false);const parent=storefrontCategories.find(c=>c.name===product.category||c.subcategories.includes(product.category));const route=(parent?categorySlug(parent.name):'products')+'/'+(parent&&product.category!==parent.name?categorySlug(product.category).replace(/-/g,''):'products')+'/'+encodeURIComponent(product.sku||product.id);window.history.pushState({productSku:product.sku||product.id},'',(storeBasePath||'')+'/'+route);window.scrollTo({top:0,left:0,behavior:'instant' as ScrollBehavior})}
 function closeProduct(){const route=categoryRoute(selectedProduct?.category||'');if(selectedProduct?.category)setFilter(selectedProduct.category);setBuyerPage('store');setSelectedProduct(null);window.history.pushState({},'',route?(storeBasePath+'/'+route):buyerPath('store'))}
 // A custom domain resolves its tenant slug asynchronously. Rehydrate that tenant's
 // cart before writing anything; otherwise the temporary empty-slug cart can overwrite
 // a previously saved cart and resurrect items the customer removed.
 useEffect(()=>{
  if(!slug){setCartScopeReady(false);return;}
  try{
   const raw=localStorage.getItem('dasnet-cart-'+slug);
   const saved=raw?JSON.parse(raw):{};
   if(saved&&typeof saved==='object'&&!Array.isArray(saved)){
    setCart(Object.fromEntries(Object.entries(saved).filter(([id,q])=>typeof id==='string'&&Number.isInteger(q)&&Number(q)>0).map(([id,q])=>[id,Math.min(99,Number(q))])));
   }else setCart({});
  }catch{setCart({});}
  setCartScopeReady(true);
 },[slug]);
 useEffect(()=>{if(!cartScopeReady||!slug)return;try{localStorage.setItem('dasnet-cart-'+slug,JSON.stringify(cart));}catch{}},[cart,slug,cartScopeReady]);
 // Restore cart products outside the first catalogue page after refresh.
 useEffect(()=>{let live=true;const missing=Object.keys(cart).filter(id=>!products.some((product:LiveProduct)=>product.id===id)).slice(0,50);if(!slug||!missing.length)return()=>{live=false};const params=new URLSearchParams({limit:String(missing.length),offset:'0',ids:missing.join(',')});fetch('/api/storefront?slug='+encodeURIComponent(slug)+'&'+params.toString(),{cache:'no-store'}).then(async response=>{const data=await readApiResponse(response);if(!response.ok)throw Error(data.error||'Could not restore saved cart items');if(!live)return;const restored:LiveProduct[]=Array.isArray(data.products)?data.products:[];if(restored.length)setProducts((current:LiveProduct[])=>{const known=new Set(current.map((product:LiveProduct)=>product.id));return [...current,...restored.filter((product:LiveProduct)=>!known.has(product.id))]});}).catch(error=>console.warn('Saved cart restoration failed:',error));return()=>{live=false}},[cart,products,slug]);
  useEffect(()=>{const syncCart=(event:StorageEvent)=>{if(event.key==='dasnet-cart-'+slug){try{const saved=JSON.parse(event.newValue||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))setCart(Object.fromEntries(Object.entries(saved).filter(([id,q])=>typeof id==='string'&&Number.isInteger(q)&&Number(q)>0).map(([id,q])=>[id,Math.min(99,Number(q))])));}catch{}}};window.addEventListener('storage',syncCart);return()=>window.removeEventListener('storage',syncCart)},[slug]);
  useEffect(()=>{
    let live=true;
    // Custom-domain storefronts start with an empty slug until /api/storefront resolves
    // the domain mapping. Do not treat that temporary state as a signed-out session.
    if(!slug){setBuyerCustomer(null);setBuyerAuthChecked(false);return()=>{live=false};}
    setBuyerAuthChecked(false);
    fetch('/api/buyer-auth?action=session&slug='+encodeURIComponent(slug),{credentials:'same-origin',cache:'no-store'})
      .then(async r=>{if(!r.ok)return null;const d=await r.json();return d.customer||null})
      .then(customer=>{if(live)setBuyerCustomer(customer)})
      .catch(()=>{if(live)setBuyerCustomer(null)})
      .finally(()=>{if(live)setBuyerAuthChecked(true)});
    return()=>{live=false};
  },[slug]);
 useEffect(()=>{if(!buyerAuthChecked||buyerCustomer)return;const protectedPage=['account','profile','orders','order-detail','order-tracking','inbox','wishlist','recently-viewed','address-book','vouchers','reviews','notifications','my-reports','report-shop','followed-shops','newsletter','notification-settings','public-profile','account-management','close-account','checkout/delivery','checkout/payment','checkout/review'];if(protectedPage.includes(buyerPage)||buyerPage.startsWith('my-reports/')||buyerPage.startsWith('address-book/')){setBuyerReturnPage(buyerPage);setBuyerPage('buyer-login');const next=buyerPath('buyer-login');if(window.location.pathname!==next)window.history.replaceState({buyerPage:'buyer-login'},'',next)}},[buyerAuthChecked,buyerCustomer,buyerPage]);
 useEffect(()=>{let live=true;const syncBuyerPage=()=>{const parts=window.location.pathname.replace(/^\/+|\/+$/g,'').split('/').filter(Boolean);const hostIsTenant=window.location.hostname.toLowerCase().endsWith('.dasmarket.co.ke')&&!['www','app'].includes(window.location.hostname.toLowerCase().split('.')[0]);const routeParts=hostIsTenant?parts:(parts[0]===slug?parts.slice(1):[]);if(routeParts.length>=3){const key=decodeURIComponent(routeParts[routeParts.length-1]);const found=products.find(p=>p.sku===key||p.id===key);if(found){setSelectedProduct(found);setBuyerPage('product-detail');return}fetch('/api/storefront?slug='+encodeURIComponent(slug)+'&limit=1&productKey='+encodeURIComponent(key),{cache:'no-store'}).then(async response=>{const data=await readApiResponse(response);if(!response.ok)throw Error(data.error||'Product unavailable');return data.products?.[0] as LiveProduct|undefined}).then((product:LiveProduct|undefined)=>{if(live&&product){setProducts(current=>current.some(item=>item.id===product.id)?current:[...current,product]);setSelectedProduct(product);setBuyerPage('product-detail')}}).catch(error=>console.warn('Direct product link could not be restored:',error));return}if(routeParts.length>=1){const parent=storefrontCategories.find(c=>categorySlug(c.name)===routeParts[0]);if(parent){setFilter('All products');setBuyerPage('store');setSelectedProduct(null);const homePath=buyerPath('store');if(window.location.pathname!==homePath)window.history.replaceState({buyerPage:'store'},'',homePath);return}}const routeKey=routeParts.map(part=>part.toLowerCase()).join('/');if(routeKey==='buyer-login'&&buyerCustomer?.phone){setBuyerPage('store');setSelectedProduct(null);const homePath=buyerPath('store');if(window.location.pathname!==homePath)window.history.replaceState({buyerPage:'store'},'',homePath);return}if(routeKey==='my-reports/reports/new'||routeKey==='my-reports/reports'){setBuyerInitialReportId('');setBuyerPage('my-reports');setSelectedProduct(null);return}const retiredBuyerRoutes:Record<string,string>={'recently-viewed':'account','followed-shops':'account','notification-settings':'account','public-profile':'account','newsletter':'account'};const canonicalRoute=retiredBuyerRoutes[routeKey]||routeKey;if(canonicalRoute!==routeKey)window.history.replaceState({buyerPage:canonicalRoute},'',buyerPath(canonicalRoute));if(!canonicalRoute)setFilter('All products');setBuyerPage(canonicalRoute==='orders/ongoing'||canonicalRoute==='orders/delivered'||canonicalRoute==='orders/cancelled'?canonicalRoute:canonicalRoute||'store');setSelectedProduct(null)};syncBuyerPage();window.addEventListener('popstate',syncBuyerPage);return()=>{live=false;window.removeEventListener('popstate',syncBuyerPage)}},[slug,buyerCustomer?.phone]); useEffect(()=>{if(!selectedProduct)return;setRecentlyViewed(current=>{const next=[selectedProduct.id,...current.filter(id=>id!==selectedProduct.id)].slice(0,12);try{localStorage.setItem('dasnet-recently-viewed-'+slug,JSON.stringify(next))}catch{}return next})},[selectedProduct?.id,slug]);
 // Check the floating WhatsApp shortcut after navigation and viewport changes.
 // Avoid a document-wide MutationObserver: scanning every link/button after every
 // React DOM mutation becomes expensive on stores with large catalogues.
 useEffect(()=>{
  const checkOverlap=()=>{
   const floating=document.querySelector<HTMLElement>('.sf-whatsapp-float');
   if(!floating)return;
   const a=floating.getBoundingClientRect(),pad=5;
   const overlaps=Array.from(document.querySelectorAll<HTMLElement>('button,a,[role="tab"]')).some(el=>{
    if(el===floating||floating.contains(el)||el.closest('.sf-whatsapp-float'))return false;
    const style=window.getComputedStyle(el);
    if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0||el.getAttribute('aria-hidden')==='true')return false;
    const b=el.getBoundingClientRect();
    return b.width>0&&b.height>0&&a.left<b.right+pad&&a.right>b.left-pad&&a.top<b.bottom+pad&&a.bottom>b.top-pad;
   });
   floating.classList.toggle('is-obscured',overlaps);
  };
  window.requestAnimationFrame(checkOverlap);
  window.addEventListener('resize',checkOverlap);
  window.addEventListener('scroll',checkOverlap,true);
  return()=>{window.removeEventListener('resize',checkOverlap);window.removeEventListener('scroll',checkOverlap,true)};
 },[buyerPage,shop?.whatsappNumber]);
 // Customer conversations belong in the customer workspace, not on the public storefront.
 useEffect(()=>{if(!chatToken&&!chatOrderId)return;let live=true;const query=chatToken?'token='+encodeURIComponent(chatToken):'orderId='+encodeURIComponent(chatOrderId)+'&slug='+encodeURIComponent(slug);const refresh=()=>fetch('/api/buyer?action=customer-chat&'+query,{credentials:'same-origin',cache:'no-store'}).then(async r=>{const d=await readApiResponse(r);if(!r.ok)throw Error(d.error||'Could not load conversation');if(live){setChatMessages(d.messages||[]);setChatAttachments(d.attachments||[]);setChatOrder(d.order||null)}}).catch(e=>{if(live)setChatError(e.message)});refresh();const timer=window.setInterval(refresh,5000);return()=>{live=false;window.clearInterval(timer)}},[chatToken,chatOrderId,slug]);
 useEffect(()=>{const status=String(chatOrder?.paymentStatus||'');if(previousPaymentStatus.current&&previousPaymentStatus.current!=='succeeded'&&status==='succeeded'){setPaymentCelebration(true);const timer=window.setTimeout(()=>setPaymentCelebration(false),5200);previousPaymentStatus.current=status;return()=>window.clearTimeout(timer)}if(status)previousPaymentStatus.current=status},[chatOrder?.paymentStatus]);

 async function sendCustomerMessage(e:any){e.preventDefault();if(!chatDraft.trim()||chatSending)return;setChatSending(true);setChatError('');try{const r=await fetch('/api/buyer?action=customer-chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(chatToken?{token:chatToken,message:chatDraft}:{orderId:chatOrderId,slug,message:chatDraft})});const d=await readApiResponse(r);if(!r.ok)throw Error(d.error||'Message could not be sent');setChatMessages(d.messages||[]);setChatDraft('')}catch(e:any){setChatError(e.message)}finally{setChatSending(false)}}

 async function uploadCustomerAttachment(file?:File){if(!file||(!chatToken&&!chatOrderId))return;if(file.size>10485760){setChatError('Each attachment must be 10 MB or smaller.');return;}setChatError('');try{const sign=await fetch('/api/buyer?action=chat-attachment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(chatToken?{token:chatToken,mode:'upload',fileName:file.name,contentType:file.type,size:file.size}:{orderId:chatOrderId,slug,mode:'upload',fileName:file.name,contentType:file.type,size:file.size})});const sd=await readApiResponse(sign);if(!sign.ok)throw Error(sd.error||'Could not prepare upload');await uploadToObjectStorage(sd.uploadUrl,file,'Chat attachment');const done=await fetch('/api/buyer?action=chat-attachment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(chatToken?{token:chatToken,mode:'complete',attachmentId:sd.attachmentId}:{orderId:chatOrderId,slug,mode:'complete',attachmentId:sd.attachmentId})});const dd=await readApiResponse(done);if(!done.ok)throw Error(dd.error||'Could not confirm upload');setChatAttachments(a=>[...a,dd.attachment]);}catch(e:any){setChatError(e.message)}}
 async function downloadCustomerAttachment(id:string){try{const r=await fetch('/api/buyer?action=chat-attachment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(chatToken?{token:chatToken,mode:'download',attachmentId:id}:{orderId:chatOrderId,slug,mode:'download',attachmentId:id})});const d=await readApiResponse(r);if(!r.ok)throw Error(d.error||'Download unavailable');window.open(d.url,'_blank','noopener,noreferrer')}catch(e:any){setChatError(e.message)}}
 useEffect(()=>{const t=window.setTimeout(()=>{void import('./StorefrontFlow');void import('./BuyerAuthPage');},60);return()=>window.clearTimeout(t);},[]);
 useEffect(()=>{let live=true;const runFetch=()=>{setNotFound(false);if(!cachedStorefront||filter!=='All products'||search.trim())setLoading(true);const params=new URLSearchParams({limit:'60',offset:'0'});if(filter.trim()&&filter.trim().toLocaleLowerCase()!=='all products')params.set('category',categoryApiFilter(filter.trim()));if(search.trim())params.set('search',search.trim());const base=slug?'/api/storefront?slug='+encodeURIComponent(slug)+'&':'/api/storefront?';fetch(base+params.toString(),{cache:'no-store'}).then(async r=>{const d=await readApiResponse(r);if(!r.ok){if(r.status===400||r.status===404){setNotFound(true);setCatalogueHasMore(false);setCatalogueTotal(0);setProducts([]);setShop(null)}throw Error(d.error||'Shop unavailable')}if(!live)return;const nextProducts=Array.isArray(d.products)?d.products:[];setShop(d.shop);if(!slug&&d.shop?.slug)setSlug(String(d.shop.slug));setProducts(nextProducts);setCatalogueOffset(Number(d.nextOffset||nextProducts.length));setCatalogueTotal(Number(d.totalProducts??nextProducts.length));setCatalogueHasMore(Boolean(d.hasMore));const requestedProduct=new URLSearchParams(window.location.search).get('product');if(requestedProduct){const match=nextProducts.find((product:any)=>product.id===requestedProduct||product.sku===requestedProduct||product.slug===requestedProduct);if(match){setSelectedProduct(match);setBuyerPage('product-detail')}}setError('');if(filter.trim().toLocaleLowerCase()==='all products'&&!search.trim()){try{localStorage.setItem('dasnet-storefront-cache-'+slug,JSON.stringify({shop:d.shop,products:nextProducts.slice(0,60),totalProducts:Number(d.totalProducts??nextProducts.length),cachedAt:Date.now()}))}catch{}}}).catch(e=>{if(live)setError(e.message)}).finally(()=>{if(live)setLoading(false)})};if(!search.trim()){runFetch();return()=>{live=false};}const timer=window.setTimeout(runFetch,180);return()=>{live=false;window.clearTimeout(timer)}},[slug,filter,search]);
  // Contact details refresh with the storefront request; avoid polling the full catalogue.
  useEffect(()=>{let live=true;const refresh=async()=>{if(!buyerCustomer){if(live)setBuyerNotifications([]);return}try{if(localStorage.getItem('dasnet-buyer-notifications-'+slug)==='false'){if(live)setBuyerNotifications([]);return}const r=await fetch('/api/buyer?action=buyer-notifications&slug='+encodeURIComponent(slug),{credentials:'same-origin',cache:'no-store'});if(!r.ok)return;const d=await r.json();if(live)setBuyerNotifications(Array.isArray(d.notifications)?d.notifications:[])}catch{}};refresh();const timer=window.setInterval(refresh,15000);return()=>{live=false;window.clearInterval(timer)}},[slug,buyerCustomer?.id]);
    async function loadMoreProducts(){if(loadingMore||!catalogueHasMore)return;setLoadingMore(true);try{const base=slug?'/api/storefront?slug='+encodeURIComponent(slug)+'&':'/api/storefront?';const params=new URLSearchParams({limit:'60',offset:String(catalogueOffset)});if(filter.trim()&&filter.trim().toLocaleLowerCase()!=='all products')params.set('category',categoryApiFilter(filter.trim()));if(search.trim())params.set('search',search.trim());const response=await fetch(base+params.toString(),{cache:'no-store'});const data=await readApiResponse(response);if(!response.ok){const failure:any=new Error(data.error||'Could not load more products');failure.status=response.status;if(response.status===400||response.status===404)setCatalogueHasMore(false);throw failure;}const incoming=Array.isArray(data.products)?data.products:[];setProducts((current:LiveProduct[])=>{const known=new Set(current.map((p:LiveProduct)=>p.id));return [...current,...incoming.filter((p:LiveProduct)=>!known.has(p.id))]});setCatalogueOffset(Number(data.nextOffset||catalogueOffset+incoming.length));if(data.totalProducts!==undefined)setCatalogueTotal(Number(data.totalProducts));setCatalogueHasMore(Boolean(data.hasMore));}catch(error:any){if(error?.status===404||error?.status===400){setNotFound(true);setCatalogueHasMore(false);setProducts([]);setShop(null)}setError(error.message||'Could not load more products')}finally{setLoadingMore(false)}}
 useEffect(()=>{const node=catalogueSentinelRef.current;const isCollection=buyerPage.startsWith('collection/')&&buyerPage!=='collection/featured-products';if(!node||!catalogueHasMore||loadingMore||(buyerPage!=='store'&&!isCollection))return;const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting))void loadMoreProducts()},{rootMargin:'900px 0px'});observer.observe(node);return()=>observer.disconnect()},[catalogueHasMore,loadingMore,loading,catalogueOffset,buyerPage]);
 const normalizedFilter=filter.trim().toLocaleLowerCase();
 const categoryMatches=(productCategoryValue:string,selectedValue:string)=>{const productCategory=String(productCategoryValue||'').trim().toLocaleLowerCase();if(!selectedValue||selectedValue==='all products')return true;const parent=storefrontCategories.find(group=>group.name.toLocaleLowerCase()===selectedValue);if(parent)return productCategory===selectedValue||parent.subcategories.filter(child=>!child.startsWith('All ')).some(child=>child.toLocaleLowerCase()===productCategory);return productCategory===selectedValue;};
 const visible=products.filter(p=>{const haystack=[p.name,p.description,p.category,p.sku].filter(Boolean).join(' ').toLocaleLowerCase();return categoryMatches(p.category,normalizedFilter)&&haystack.includes(search.trim().toLocaleLowerCase())});
 const sortedVisible=[...visible].sort((a,b)=>sortOrder==='price-low'?a.price-b.price:sortOrder==='price-high'?b.price-a.price:sortOrder==='name'?a.name.localeCompare(b.name):0);const mixedProducts=sortedVisible;
 const collectionKey=buyerPage.startsWith('collection/')?buyerPage.slice('collection/'.length):'';
 const collectionTitle=collectionKey==='featured-products'?'Featured products':collectionKey==='top-picks'?'Top picks':'All products';
 const collectionBase=collectionKey==='featured-products'?(products.some(p=>p.spotlight)?products.filter(p=>p.spotlight):products.filter(p=>Boolean(p.images?.[0]||p.imageUrl)).slice(0,5)):collectionKey==='top-picks'?[...products].sort((a,b)=>(b.ratingAverage||0)-(a.ratingAverage||0)||(b.ratingCount||0)-(a.ratingCount||0)):products;
 const collectionVisible=collectionBase.filter(p=>{const selected=filter.trim().toLocaleLowerCase();const queryMatch=[p.name,p.description,p.category,p.sku].filter(Boolean).join(' ').toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());return categoryMatches(p.category,selected)&&queryMatch;});
 const collectionSorted=[...collectionVisible].sort((a,b)=>sortOrder==='price-low'?a.price-b.price:sortOrder==='price-high'?b.price-a.price:sortOrder==='name'?a.name.localeCompare(b.name):0);
 const storePreviewProducts=(()=>{const groups=new Map<string,typeof products>();for(const product of products){const key=String(product.category||'Other').trim()||'Other';if(!groups.has(key))groups.set(key,[]);groups.get(key)!.push(product)}const buckets=[...groups.values()];const mixed:typeof products=[];for(let index=0;buckets.some(bucket=>bucket.length>index);index++){for(const bucket of buckets){if(bucket[index])mixed.push(bucket[index])}}return mixed})();
 const [homeHeroIndex,setHomeHeroIndex]=useState(0),[heroPaused,setHeroPaused]=useState(false);const heroTouchStartX=useRef<number|null>(null);
 const spotlightProducts=products.filter(p=>Boolean((p as any).spotlight)).slice(0,5);const homeHeroProducts=(spotlightProducts.length?spotlightProducts:products.filter(p=>Boolean(p.images?.[0]||p.imageUrl))).slice(0,5);
 const heroSlides=homeHeroProducts.length?homeHeroProducts:(products[0]?[products[0]]:[]);
 const activeHeroIndex=heroSlides.length?homeHeroIndex%heroSlides.length:0;
 useEffect(()=>{if(heroSlides.length<2||buyerPage!=='store'||heroPaused)return;const timer=window.setInterval(()=>setHomeHeroIndex(index=>(index+1)%heroSlides.length),5500);return()=>window.clearInterval(timer)},[heroSlides.length,buyerPage,heroPaused,activeHeroIndex]);
 const cartItems=Object.entries(cart).filter(([,q])=>q>0),total=cartItems.reduce((s,[id,q])=>s+(products.find(p=>p.id===id)?.price||0)*q,0);
 const totalCartUnits=cartItems.reduce((n,[,q])=>n+q,0);
 const unreadNotifs=buyerNotifications.some((n:any)=>!n.read_at);
 const chatPanel=Boolean(chatOrderId||chatToken)&&(buyerPage==='inbox'||buyerPage==='order-tracking')?(
  <section className="sf-chat-box">
   {paymentCelebration&&<div className="sf-alert success" role="status" aria-live="polite"><Check size={16}/><span>Payment verified — your order is confirmed. Thank you for shopping.</span></div>}
   <div className="sf-panel-head">
    <div>
     <span className="sf-kicker">Order conversation</span>
     <h3>Chat with {shop?.name||'the seller'}</h3>
     <p>Order {chatOrderNumber}</p>
    </div>
    <span className="sf-status-text is-success">Direct chat</span>
   </div>
   <div className="sf-chat-messages">
    {chatMessages.length?chatMessages.map((m:any)=>(
     <div key={m.id} className={'sf-chat-bubble '+(m.sender_type==='customer'?'mine':'theirs')}>
      <span>{m.sender_type==='customer'?'You':shop?.name||'Merchant'}</span>
      <p>{m.message}</p>
      <small>{new Date(m.created_at).toLocaleString('en-KE')}</small>
     </div>
    )):(
     <div className="sf-state-box" style={{padding:'24px 16px'}}>
      <span className="sf-state-icon"><MessageCircle size={20}/></span>
      <strong>Start a new conversation</strong>
      <p>Send {shop?.name||'the seller'} a message about order {chatOrderNumber}.</p>
     </div>
    )}
   </div>
   {chatAttachments.length>0&&(
    <div className="sf-chat-attachments">
     <strong>Shared files</strong>
     {chatAttachments.map((a:any)=>(
      <button type="button" key={a.id} onClick={()=>downloadCustomerAttachment(a.id)}>
       {a.file_name} · {(Number(a.size_bytes)/1024/1024).toFixed(2)} MB <Download size={13}/>
      </button>
     ))}
    </div>
   )}
   {chatError&&<div className="sf-alert error">{chatError}</div>}
   <form onSubmit={sendCustomerMessage} className="sf-chat-compose">
    <input value={chatDraft} onChange={e=>setChatDraft(e.target.value)} maxLength={2000} placeholder="Write a message to the seller…"/>
    <button type="submit" className="sf-btn sf-btn-primary" disabled={chatSending||!chatDraft.trim()}>{chatSending?'Sending…':'Send'}</button>
   </form>
   <label className="sf-chat-upload">
    <Plus size={15}/> Attach file
    <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.webp" onChange={e=>{uploadCustomerAttachment(e.target.files?.[0]);e.currentTarget.value=''}}/>
    <small>PDF, Office, TXT or image · max 10 MB</small>
   </label>
  </section>
 ):null;

 if(notFound&&!loading)return <main role="main" className="sf-auth-shell" style={{display:'flex'}}><section className="sf-auth-card" style={{textAlign:'center',alignItems:'center'}}><span className="sf-state-icon" style={{color:'var(--sf-warn)'}}>!</span><span className="sf-kicker">DASMARKET</span><h1 style={{fontSize:28}}>Shop not found</h1><p style={{margin:0,color:'var(--sf-muted)'}}>This shop address may be incorrect, or the shop may no longer be available.</p><a href="/" className="sf-btn sf-btn-primary">Go to DASMARKET</a></section></main>;

 const isBuyerAccountRoute=buyerPage==='account'||['orders','order-detail','order-tracking','profile','inbox','wishlist','recently-viewed','address-book','vouchers','reviews','notifications','my-reports','report-shop','followed-shops','newsletter','notification-settings','public-profile','account-management','close-account','assistant'].includes(buyerPage)||buyerPage.startsWith('orders/')||buyerPage.startsWith('my-reports/')||buyerPage.startsWith('address-book/');

 if(buyerPage==='buyer-login'||buyerPage==='buyer-signup') return <Deferred><BuyerAuthPage slug={slug} shopName={shop?.name||'This shop'} initial={buyerPage==='buyer-signup'?'signup':'login'} onBack={()=>navigateBuyerPage('store')} onPolicyNavigate={(page)=>navigateBuyerPage(page)} onAuthenticated={(customer)=>{setBuyerCustomer(customer);const target=buyerReturnPage||'account';setBuyerPage(target);const next=buyerPath(target);if(window.location.pathname!==next)window.history.replaceState({buyerPage:target},'',next)}}/></Deferred>;

 const addSingleToCart=(productId:string,stockQuantity:number|null)=>{
  const limit=stockQuantity!==null&&stockQuantity>0?stockQuantity:99;
  setCart(c=>({...c,[productId]:Math.min(99,limit,(c[productId]||0)+1)}));
 };

 const renderProductCard=(p:LiveProduct,tag?:string,eager=false)=>{
  const hasPositiveStock=p.stockQuantity!==null&&p.stockQuantity>0;
  const stockCapped=hasPositiveStock&&(cart[p.id]||0)>=p.stockQuantity!;
  const inCart=Boolean(cart[p.id]);
  const saved=wishlistIds.includes(p.id);
  return (
   <article className="sf-card" key={p.id}>
    <button type="button" className={'sf-card-fav'+(saved?' active':'')} aria-label="Toggle wishlist" aria-pressed={saved} onClick={()=>toggleWishlist(p.id)}>
     <Heart size={16} fill={saved?'currentColor':'none'}/>
    </button>
    <button type="button" className="sf-card-open" onClick={()=>openProduct(p)}>
     <span className="sf-card-media">
      <img src={p.images?.[0]||p.imageUrl||fallbackProductImage(p.name)} alt={p.name} loading={eager?'eager':'lazy'} decoding="async" onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src=fallbackProductImage(p.name)}}/>
      {tag?<span className="sf-card-tag">{tag}</span>:null}
     </span>
     <div className="sf-card-body">
      <span className="sf-card-cat">{p.category||'Shop'}</span>
      <span className="sf-card-title">{p.name}</span>
      {(p.ratingCount??0)>0||Number(p.catalogRating||0)>0?<span className="sf-card-rating"><Star size={12} fill="currentColor"/> {Number((p.ratingCount??0)>0?p.ratingAverage:p.catalogRating||0).toFixed(1)}{(p.ratingCount??0)>0?` (${p.ratingCount})`:''}</span>:null}
      <div className="sf-card-meta-row">
       <strong className="sf-card-price">KES {p.price.toLocaleString('en-KE')}</strong>
       <small className="sf-card-stock">{hasPositiveStock?`${p.stockQuantity} left`:'Available'}</small>
      </div>
     </div>
    </button>
    <div className="sf-card-foot">
     <button type="button" className={'sf-card-add'+(inCart?' in-cart':'')} disabled={stockCapped} onClick={()=>addSingleToCart(p.id,p.stockQuantity)}>
      {stockCapped?`Max in cart (${cart[p.id]})`:inCart?`In cart (${cart[p.id]})`:'Add to cart'}
     </button>
    </div>
   </article>
  );
 };

 const renderSkeletonGrid=(count=8)=>(
  <div className="sf-product-grid" aria-busy="true" aria-label="Loading products">
   {Array.from({length:count}).map((_,index)=>(
    <article className="sf-skeleton-card" key={index} aria-hidden="true">
     <div className="sf-skeleton-block" style={{aspectRatio:'1 / 1',width:'100%'}}/>
     <div className="sf-skeleton-line" style={{height:11,width:'46%'}}/>
     <div className="sf-skeleton-line" style={{height:15,width:'88%'}}/>
     <div className="sf-skeleton-line" style={{height:18,width:'42%',marginTop:'auto'}}/>
     <div className="sf-skeleton-line" style={{height:36,width:'100%'}}/>
    </article>
   ))}
  </div>
 );

 const isCheckoutFlowRoute=buyerPage.startsWith('checkout/');
 const promoPhoneRaw=(shop?.contactPhone||shop?.whatsappNumber||'').trim();
 const promoWaDigits=promoPhoneRaw.replace(/\D/g,'');
 const renderStoreHeader=(compact=false)=>(
  <>
   {!compact&&(
    <div className="sf-announcement">
     <div className="sf-announcement-inner">
      <button type="button" className="sf-announcement-left" onClick={()=>navigateBuyerPage('collection/all-products')}>
       <span>Direct from <b className="sf-announcement-accent">{shop?.name||'Store'}</b></span>
      </button>
      <div className="sf-announcement-right-group">
       {promoWaDigits.length>=9&&(
        <a className="sf-announcement-call" href={`https://wa.me/${promoWaDigits.startsWith('0')?'254'+promoWaDigits.slice(1):promoWaDigits}?text=Hello%2C%20I%20would%20like%20to%20order%20from%20${encodeURIComponent(shop?.name||'your store')}.`} target="_blank" rel="noopener noreferrer">
         <small>Call or WhatsApp</small>
         <strong>{promoPhoneRaw}</strong>
        </a>
       )}
       <button type="button" className="sf-announcement-right" onClick={()=>navigateBuyerPage('collection/all-products')}>
        <span>Shop Now</span> <ArrowRight size={13}/>
       </button>
      </div>
     </div>
    </div>
   )}
   <header className="sf-header">
    <div className={'sf-header-inner'+(compact?' is-compact':'')}>
     <div className="sf-header-left">
      <button type="button" className="sf-icon-btn sf-menu-trigger" aria-label="Browse shop categories" onClick={()=>{if(window.innerWidth>760)setDesktopSidebarOpen(v=>!v);else setMobileSidebarOpen(true)}}>
       <Menu size={22}/>
      </button>
      <a className="sf-brand" href={buyerPath('store')} onClick={e=>{e.preventDefault();navigateBuyerPage('store')}}>
       <strong className="sf-brand-name">{shop?.name||'OUR STORE'}</strong>
       <span className={'sf-brand-badge'+(shop?.logoUrl?' has-logo':'')} aria-hidden="true">
        {shop?.logoUrl?<img src={shop.logoUrl} alt=""/>:<Star size={12} fill="#ffffff" strokeWidth={2}/>}
       </span>
      </a>
     </div>
     {!compact&&(
      <form className="sf-search-form" onSubmit={e=>{e.preventDefault();setFilter('All products');navigateBuyerPage('store');window.setTimeout(()=>document.getElementById('market-products-grid')?.scrollIntoView({behavior:'smooth',block:'start'}),80)}}>
       <Search size={18}/>
       <input aria-label="Search products" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products, categories and SKUs"/>
       {search.trim()&&(
        <button type="button" className="sf-search-clear" aria-label="Clear search" onClick={()=>setSearch('')}>
         <X size={16}/>
        </button>
       )}
      </form>
     )}
     <div className="sf-header-actions">
      <button type="button" className="sf-header-action" onClick={()=>{setBuyerReturnPage('account');navigateBuyerPage(buyerCustomer?'account':'buyer-login')}} aria-label={buyerCustomer?'My account':'Account'}>
       {buyerCustomer?<UserCheck size={22}/>:<UserRound size={22}/>}
       <span className="sf-header-action-label">{buyerCustomer?`Hi, ${String(buyerCustomer.name||'Buyer').trim().split(' ')[0]}`:'Account'}</span>
      </button>
      <button type="button" className="sf-header-action" aria-label="Help & Notifications" aria-expanded={buyerNotificationsOpen} onClick={()=>{if(!buyerCustomer){navigateBuyerPage('faqs')}else setBuyerNotificationsOpen(v=>!v)}}>
       <Bell size={21}/>
       <span className="sf-header-action-label">Updates</span>
       {unreadNotifs&&<i className="sf-notif-badge"/>}
      </button>
      <button type="button" className="sf-header-action sf-header-cart" onClick={()=>navigateBuyerPage('cart')} aria-label="Shopping cart">
       <span className="sf-cart-icon-wrap">
        <ShoppingCart size={22}/>
        {totalCartUnits>0&&<span className="sf-cart-count">{totalCartUnits}</span>}
       </span>
       <span className="sf-header-action-label">Cart</span>
      </button>
     </div>
    </div>
   </header>
   {buyerNotificationsOpen&&buyerCustomer&&(
    <section className="sf-popover" aria-label="Recent notifications">
     <div className="sf-popover-head">
      <div><strong>Notifications</strong><small>{buyerNotifications.length} recent updates</small></div>
      <button type="button" className="sf-popover-close" aria-label="Close notifications" onClick={()=>setBuyerNotificationsOpen(false)}>×</button>
     </div>
     {buyerNotifications.length?buyerNotifications.slice(0,6).map((item:any,index:number)=>(
      <button type="button" className="sf-popover-item" key={item.id||item.orderId||item.complaintId||index} onClick={()=>{setBuyerNotificationsOpen(false);navigateBuyerPage(item.complaint_id||item.complaintId?'my-reports':'orders')}}>
       <span className="sf-popover-item-icon"><Bell size={15}/></span>
       <span>
        <strong>{item.title||'Order update'}</strong>
        <small>{item.detail||'There is an update on your account.'}</small>
        <time>{item.created_at?new Date(item.created_at).toLocaleString('en-KE'):item.updatedAt?new Date(item.updatedAt).toLocaleString('en-KE'):'Recently'}</time>
       </span>
      </button>
     )):(
      <div className="sf-popover-empty">
       <Bell size={20}/>
       <strong>You’re all caught up</strong>
       <p>Order, payment and delivery updates will appear here.</p>
      </div>
     )}
     <button type="button" className="sf-popover-foot" onClick={()=>{setBuyerNotificationsOpen(false);navigateBuyerPage('notifications')}}>View all updates <ArrowRight size={14}/></button>
    </section>
   )}
  </>
 );

 const renderShopDrawer=()=>(
  <>
   {(mobileSidebarOpen||desktopSidebarOpen)&&<button type="button" className="sf-scrim" aria-label="Close navigation menu" onClick={()=>{setMobileSidebarOpen(false);setDesktopSidebarOpen(false)}}/>}
   <aside className={'sf-drawer'+((mobileSidebarOpen||desktopSidebarOpen)?' is-open':'')} aria-label="Shop navigation">
    <div className="sf-drawer-head">
     <a className="sf-drawer-brand" href={buyerPath('store')} onClick={e=>{e.preventDefault();navigateBuyerPage('store')}}>
      <span className="sf-brand-mark">{(shop?.name||'S').trim().charAt(0).toUpperCase()}</span>
      <span><strong>{shop?.name||'Shop'}</strong><small>Browse store</small></span>
     </a>
     <button type="button" className="sf-icon-btn" aria-label="Close navigation" onClick={()=>{setMobileSidebarOpen(false);setDesktopSidebarOpen(false)}}><X size={16}/></button>
    </div>
    <div className="sf-drawer-account">
     <div className="sf-drawer-account-info">
      <UserRound size={19}/>
      <div><strong>{buyerCustomer?.name||'Guest shopper'}</strong><small>{buyerCustomer?.phone||'Sign in to track orders'}</small></div>
     </div>
     <button type="button" className="sf-drawer-account-btn" onClick={()=>{setBuyerReturnPage('account');navigateBuyerPage(buyerCustomer?'account':'buyer-login');setMobileSidebarOpen(false);setDesktopSidebarOpen(false)}}>{buyerCustomer?'Account':'Sign in'} <ArrowRight size={13}/></button>
    </div>
    <div className="sf-drawer-section-label">Discover</div>
    <nav className="sf-drawer-links" aria-label="Shop destinations">
     <button type="button" onClick={()=>{navigateBuyerPage('collection/all-products');setMobileSidebarOpen(false);setDesktopSidebarOpen(false)}}><span><ShoppingBag size={16}/> All products</span></button>
     <button type="button" onClick={()=>{navigateBuyerPage('collection/top-picks');setMobileSidebarOpen(false);setDesktopSidebarOpen(false)}}><span><Star size={16}/> Top picks</span></button>
     <button type="button" onClick={()=>{navigateBuyerPage('collection/featured-products');setMobileSidebarOpen(false);setDesktopSidebarOpen(false)}}><span><TicketPercent size={16}/> Featured products</span></button>
     <button type="button" onClick={()=>{navigateBuyerPage('faqs');setMobileSidebarOpen(false);setDesktopSidebarOpen(false)}}><span><HelpCircle size={16}/> Shopping help</span></button>
     <PWAInstallButton variant="drawer" label="Install app" appName={shop?.name||"this store"} showFallback />
    </nav>
    <div className="sf-drawer-section-label">Categories</div>
    <div className="sf-drawer-links">
     <button type="button" className={'sf-drawer-cat-btn'+(filter==='All products'?' active':'')} onClick={()=>{selectStoreCategory('All products');setMobileSidebarOpen(false);setDesktopSidebarOpen(false)}}><span>All categories</span></button>
     {storefrontCategories.map(category=>(
      <div key={category.name}>
       <button type="button" className={'sf-drawer-cat-btn'+(filter===category.name?' active':'')} aria-expanded={expandedCategory===category.name} onClick={()=>setExpandedCategory(current=>current===category.name?'':category.name)}>
        <span>{storeCategoryIcon(category.name)} {category.name}</span>
        <ChevronRight size={14} className="sf-drawer-cat-chevron"/>
       </button>
       {expandedCategory===category.name&&(
        <div className="sf-drawer-subcats">
         {category.subcategories.map(child=>(
          <button type="button" key={child} className={filter===child?'active':''} onClick={()=>{selectStoreCategory(child);setMobileSidebarOpen(false);setDesktopSidebarOpen(false)}}>{child}</button>
         ))}
        </div>
       )}
      </div>
     ))}
    </div>
    {buyerCustomer&&(
     <div className="sf-drawer-footer">
      <button type="button" className="sf-drawer-logout" onClick={()=>{fetch('/api/buyer-auth?action=logout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug}),credentials:'same-origin'}).finally(()=>{setBuyerCustomer(null);setCart({});navigateBuyerPage('store')})}}>
       <LogOut size={16}/> Sign out
      </button>
     </div>
    )}
   </aside>
  </>
 );

 const renderFooter=()=>(
  <footer className="sf-footer">
   <div className="sf-footer-grid">
    <div className="sf-footer-col sf-footer-brand">
     <a className="sf-brand" href={buyerPath('store')} onClick={e=>{e.preventDefault();navigateBuyerPage('store')}}>
      <span className="sf-brand-mark">{(shop?.name||'S').trim().charAt(0).toUpperCase()}</span>
      <span className="sf-brand-text"><strong className="sf-brand-name">{shop?.name||'Shop'}</strong><span className="sf-brand-sub">Official Store</span></span>
     </a>
     <p>Shop online from {shop?.name||'this store'} with clear pricing, order tracking, and direct merchant support.</p>
     <a className="sf-btn sf-btn-secondary" href={`https://wa.me/${shop?.whatsappNumber?shop.whatsappNumber.replace(/\D/g,''):'254758884861'}?text=Hello%2C%20I%20need%20help%20with%20a%20storefront.`} target="_blank" rel="noopener noreferrer">
      <MessageCircle size={15}/> WhatsApp Support
     </a>
    </div>
    <div className="sf-footer-col">
     <b>Shop</b>
     <button type="button" onClick={()=>navigateBuyerPage('collection/all-products')}>All products</button>
     <button type="button" onClick={()=>navigateBuyerPage('collection/top-picks')}>Top picks</button>
     <button type="button" onClick={()=>navigateBuyerPage('cart')}>Shopping cart</button>
     <button type="button" onClick={()=>navigateBuyerPage('orders')}>My orders</button>
    </div>
    <div className="sf-footer-col">
     <b>Account</b>
     <button type="button" onClick={()=>{if(!buyerCustomer){setBuyerReturnPage('account');navigateBuyerPage('buyer-login')}else navigateBuyerPage('account')}}>Overview</button>
     <button type="button" onClick={()=>navigateBuyerPage('wishlist')}>Saved items</button>
     <button type="button" onClick={()=>navigateBuyerPage('buyer-login')}>Sign in / Sign up</button>
     <button type="button" onClick={()=>navigateBuyerPage('faqs')}>Help &amp; FAQs</button>
    </div>
    <div className="sf-footer-col">
     <b>Policies</b>
     <button type="button" onClick={()=>navigateBuyerPage('shop-delivery')}>Delivery &amp; Collection</button>
     <button type="button" onClick={()=>navigateBuyerPage('shop-returns')}>Returns &amp; Refunds</button>
     <button type="button" onClick={()=>navigateBuyerPage('shop-terms')}>Terms &amp; Privacy</button>
     <button type="button" onClick={()=>navigateBuyerPage('assistant')}>Contact shop</button>
    </div>
   </div>
   <div className="sf-footer-bottom">
    <span>© {new Date().getFullYear()} {shop?.name||'Shop'}. All rights reserved.</span>
    <span>Kenya · Powered by <a href="https://dasmarket.co.ke">DASMARKET</a></span>
   </div>
  </footer>
 );

 const renderFlow=()=>(
  <StorefrontFlow
   slug={slug}
   shopName={shop?.name||'Store'}
   shopWhatsappNumber={shop?.contactPhone||shop?.whatsappNumber||''}
   shopContactEmail={shop?.contactEmail||''}
   shopTermsAndConditions={shop?.termsAndConditions||''}
   shopPrivacyPolicy={shop?.privacyPolicy||''}
   shopReturnPolicy={shop?.returnPolicy||''}
   shopDeliveryPolicy={shop?.deliveryPolicy||''}
   shopDeliveryHomeFee={shop?.deliveryHomeFee||0}
   shopDeliveryPickupFee={shop?.deliveryPickupFee||0}
   shopCashOnDeliveryEnabled={shop?.cashOnDeliveryEnabled===true}
   shopCashOnPickupEnabled={shop?.cashOnPickupEnabled===true}
   shopFaqs={shop?.faqs||[]}
   products={products}
   recentlyViewed={recentlyViewed}
   cart={cart}
   onCartChange={setCart}
   view={buyerPage}
   initialOrderNumber={emailOrderNumber.current}
   onNavigate={navigateBuyerPage}
   initialReportId={buyerInitialReportId||(buyerPage.startsWith('my-reports/')&&buyerPage!=='my-reports/new'?decodeURIComponent(buyerPage.slice('my-reports/'.length)):undefined)}
   customerName={buyerCustomer?.name||''}
   customerPhone={buyerCustomer?.phone||''}
   customerEmail={buyerCustomer?.email||''}
   customerAddress={buyerCustomer?.address||''}
   customerAlternativePhone={buyerCustomer?.alternativePhone||''}
   wishlistIds={wishlistIds}
   onToggleWishlist={toggleWishlist}
   onOpenProduct={(product)=>openProduct(product as LiveProduct)}
   notifications={buyerNotifications}
   onProfileUpdated={setBuyerCustomer}
   onSignOut={()=>{fetch('/api/buyer-auth?action=logout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug})}).finally(()=>{setBuyerCustomer(null);navigateBuyerPage('store')})}}
   chatPanel={chatPanel}
   onOpenChat={(token,orderNumber,orderId)=>{setChatToken(token||'');setChatOrderId(orderId||'');setChatOrderNumber(orderNumber);setChatMessages([]);setChatAttachments([]);setChatOrder(null);setChatDraft('');setChatError('');}}
   onOrderCreated={(token,orderNumber)=>{setChatToken(token);setChatOrderId('');setChatOrderNumber(orderNumber);setChatError('');}}
  />
 );

 const isFilteringStore=filter!=='All products'||search.trim().length>0||sortOrder!=='recommended';
 const homeCatalogueList=!isFilteringStore&&!buyerPage.startsWith('collection/')
  ?storePreviewProducts
  :mixedProducts;
 const totalMatchingCount=Math.max(homeCatalogueList.length,catalogueTotal);
 const totalCollectionCount=collectionKey==='featured-products'?collectionSorted.length:Math.max(collectionSorted.length,catalogueTotal);

 return (
  <main className="sf-shell" data-store-theme="marketplace" style={{'--store-accent':(!shop?.theme||['#7c3aed','#e47a13','#c85a17'].includes(shop.theme.toLowerCase()))?'#ea580c':shop.theme} as any}>
   {isBuyerAccountRoute?(
    <>
     <header className="sf-account-topbar">
      <div className="sf-account-topbar-left">
       <button type="button" className="sf-icon-btn sf-account-mobile-trigger" aria-label="Open account navigation" aria-expanded={buyerMobileNavOpen} onClick={()=>setBuyerMobileNavOpen(v=>!v)}>
        <Menu size={20}/>
       </button>
       <button type="button" className="sf-account-brand" onClick={()=>navigateBuyerPage('account')}>
        <span className="sf-brand-mark"><ShoppingBag size={17}/></span>
        <span>{shop?.name||'My Account'}</span>
       </button>
      </div>
      <div className="sf-account-topbar-right">
       <button type="button" className="sf-btn sf-btn-secondary" style={{minHeight:36,padding:'0 12px',fontSize:13}} onClick={()=>navigateBuyerPage('store')}>
        <Store size={15}/> Back to shop
       </button>
       <button type="button" className="sf-icon-btn" aria-label="Notifications" onClick={()=>navigateBuyerPage('notifications')} style={{position:'relative'}}>
        <Bell size={18}/>
        {unreadNotifs&&<i className="sf-notif-badge"/>}
       </button>
       <button type="button" className="sf-header-action sf-header-cart" style={{minHeight:36,padding:'0 10px'}} aria-label="Shopping cart" onClick={()=>navigateBuyerPage('cart')}>
        <span className="sf-cart-icon-wrap">
         <ShoppingCart size={18}/>
         {totalCartUnits>0&&<span className="sf-cart-count">{totalCartUnits}</span>}
        </span>
       </button>
       <button type="button" className="sf-account-avatar-btn" aria-label="My account" onClick={()=>navigateBuyerPage('profile')}>
        {(buyerCustomer?.name||'B').trim().charAt(0).toUpperCase()}
       </button>
      </div>
     </header>
     {buyerMobileNavOpen&&<button type="button" className="sf-scrim" aria-label="Close account navigation" onClick={()=>setBuyerMobileNavOpen(false)}/>}
     <div className="sf-account-frame">
      <aside className={'sf-account-sidebar'+(buyerMobileNavOpen?' is-open':'')} aria-label="Buyer account navigation">
       <button type="button" className={'sf-account-nav-item'+(buyerPage==='account'?' active':'')} onClick={()=>navigateBuyerPage('account')}><Home size={17}/><span>Overview</span></button>
       <button type="button" className={'sf-account-nav-item'+(buyerPage==='orders'||buyerPage.startsWith('orders/')||buyerPage==='order-detail'||buyerPage==='order-tracking'?' active':'')} onClick={()=>navigateBuyerPage('orders')}><ShoppingBag size={17}/><span>My Orders</span></button>
       <button type="button" className={'sf-account-nav-item'+(buyerPage==='inbox'?' active':'')} onClick={()=>navigateBuyerPage('inbox')}><MessageCircle size={17}/><span>Messages</span></button>
       <button type="button" className={'sf-account-nav-item'+(buyerPage==='wishlist'?' active':'')} onClick={()=>navigateBuyerPage('wishlist')}><Heart size={17}/><span>Saved Items</span></button>
       <button type="button" className={'sf-account-nav-item'+((buyerPage==='my-reports'||buyerPage.startsWith('my-reports/'))?' active':'')} onClick={()=>navigateBuyerPage('my-reports')}><Flag size={17}/><span>My Reports</span></button>
       <div className="sf-account-nav-group">ACCOUNT</div>
       <button type="button" className={'sf-account-nav-item'+(buyerPage==='profile'?' active':'')} onClick={()=>navigateBuyerPage('profile')}><UserRound size={17}/><span>Profile</span></button>
       <button type="button" className={'sf-account-nav-item'+(buyerPage.startsWith('address-book')?' active':'')} onClick={()=>navigateBuyerPage('address-book')}><MapPin size={17}/><span>Delivery Addresses</span></button>
       <button type="button" className={'sf-account-nav-item'+(buyerPage==='vouchers'?' active':'')} onClick={()=>navigateBuyerPage('vouchers')}><TicketPercent size={17}/><span>Vouchers</span></button>
       <button type="button" className={'sf-account-nav-item'+(buyerPage==='reviews'?' active':'')} onClick={()=>navigateBuyerPage('reviews')}><Star size={17}/><span>Reviews</span></button>
       <button type="button" className={'sf-account-nav-item'+(buyerPage==='notifications'?' active':'')} onClick={()=>navigateBuyerPage('notifications')}><Bell size={17}/><span>Notifications</span></button>
       <button type="button" className={'sf-account-nav-item'+(buyerPage==='account-management'?' active':'')} onClick={()=>navigateBuyerPage('account-management')}><ShieldCheck size={17}/><span>Security</span></button>
       <div className="sf-account-sidebar-help">
        <strong>Need Help?</strong>
        <span>Our support team is ready to assist you.</span>
        <button type="button" className="sf-btn sf-btn-primary" style={{minHeight:36,fontSize:13}} onClick={()=>navigateBuyerPage('assistant')}>Contact Us</button>
       </div>
       <button type="button" className="sf-account-logout" onClick={()=>{fetch('/api/buyer-auth?action=logout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug}),credentials:'same-origin'}).finally(()=>{setBuyerCustomer(null);navigateBuyerPage('store')})}}>
        <LogOut size={16}/><span>Logout</span>
       </button>
      </aside>
      <div className="sf-account-main">
       <Deferred>{renderFlow()}</Deferred>
      </div>
     </div>
     {renderFooter()}
    </>
   ):buyerPage==='store'?(
    <>
     {renderShopDrawer()}
     {renderStoreHeader()}
     <div className="sf-container">
      {/* 1. Editorial Hero Showcase (hidden when customer filters or searches) */}
      {!isFilteringStore&&(
      <section className="sf-hero-wrap" aria-label="Featured showcase">
       <div
        className={'sf-hero'+(heroSlides.length>1?' has-controls':'')+(heroPaused?' is-paused':'')}
        onMouseEnter={()=>setHeroPaused(true)}
        onMouseLeave={()=>setHeroPaused(false)}
        onFocusCapture={()=>setHeroPaused(true)}
        onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setHeroPaused(false)}}
        onTouchStart={e=>{heroTouchStartX.current=e.touches[0]?.clientX??null}}
        onTouchEnd={e=>{if(heroTouchStartX.current===null||heroSlides.length<2)return;const dx=(e.changedTouches[0]?.clientX??heroTouchStartX.current)-heroTouchStartX.current;heroTouchStartX.current=null;if(Math.abs(dx)>40)setHomeHeroIndex(i=>dx<0?(i+1)%heroSlides.length:(i+heroSlides.length-1)%heroSlides.length)}}
       >
        <div className="sf-hero-track" style={{transform:`translate3d(-${activeHeroIndex*100}%, 0, 0)`}}>
         {heroSlides.length?(heroSlides.map((slideProduct,index)=>{
          const isCurrent=index===activeHeroIndex;
          return (
           <div className={'sf-hero-slide'+(isCurrent?' is-active':'')} key={slideProduct.id} aria-hidden={!isCurrent}>
            <div className="sf-hero-copy">
             <div className="sf-hero-meta">
              <span className="sf-hero-cat">{slideProduct.category||shop?.name||'Featured Collection'}</span>
              {heroSlides.length>1&&<span className="sf-hero-index">· {String(index+1).padStart(2,'0')}/{String(heroSlides.length).padStart(2,'0')}</span>}
             </div>
             {isCurrent?<h1>{slideProduct.name}</h1>:<h2>{slideProduct.name}</h2>}
             <p className="sf-hero-desc">{slideProduct.description||shop?.description||'Explore quality products with transparent pricing and direct seller coordination.'}</p>
             <strong className="sf-hero-price">KES {slideProduct.price.toLocaleString('en-KE')}</strong>
             <div className="sf-hero-actions">
              <button type="button" className="sf-btn sf-btn-accent" tabIndex={isCurrent?0:-1} onClick={()=>openProduct(slideProduct)}>
               View product <ArrowRight size={14}/>
              </button>
             </div>
            </div>
            <div className="sf-hero-media-col">
             <button type="button" className="sf-hero-media" tabIndex={isCurrent?0:-1} onClick={()=>openProduct(slideProduct)} aria-label={`View ${slideProduct.name}`}>
              <img src={slideProduct.images?.[0]||slideProduct.imageUrl||fallbackProductImage(slideProduct.name)} alt={slideProduct.name} loading={index===0?'eager':'lazy'} decoding="async" fetchPriority={index===0?'high':'auto'} onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src=fallbackProductImage(slideProduct.name)}}/>
             </button>
            </div>
           </div>
          );
         })):(
          <div className="sf-hero-slide is-active">
           <div className="sf-hero-copy">
            <div className="sf-hero-meta">
             <span className="sf-hero-cat">{shop?.name||'Featured Collection'}</span>
            </div>
            <h1>{shop?.name||'Curated essentials for everyday living'}</h1>
            <p className="sf-hero-desc">{shop?.description||'Explore quality products with transparent pricing and direct seller coordination.'}</p>
            <div className="sf-hero-actions">
             <button type="button" className="sf-btn sf-btn-accent" onClick={()=>selectStoreCategory('All products')}>
              Shop collection <ArrowRight size={14}/>
             </button>
            </div>
           </div>
           <div className="sf-hero-media-col">
            <div className="sf-hero-media" aria-hidden="true">
             <ShoppingBag size={40} strokeWidth={1.3}/>
            </div>
           </div>
          </div>
         )}
        </div>
        {heroSlides.length>1&&(
         <div className="sf-hero-controls">
          <button type="button" className="sf-hero-arrow" aria-label="Previous slide" onClick={()=>setHomeHeroIndex(i=>(i+heroSlides.length-1)%heroSlides.length)}><ChevronLeft size={15}/></button>
          <div className="sf-hero-dots">
           {heroSlides.map((p,index)=>(
            <button type="button" key={p.id+'-'+activeHeroIndex} aria-label={'Show featured product '+(index+1)} aria-current={index===activeHeroIndex?'true':'false'} className={index===activeHeroIndex?'active':''} onClick={()=>setHomeHeroIndex(index)}/>
           ))}
          </div>
          <button type="button" className="sf-hero-arrow" aria-label="Next slide" onClick={()=>setHomeHeroIndex(i=>(i+1)%heroSlides.length)}><ChevronRight size={15}/></button>
         </div>
        )}
       </div>
      </section>
      )}

      {/* 2. Featured Spotlight Grid (if configured and not filtering) */}
      {!isFilteringStore&&spotlightProducts.length>0&&(
       <section className="sf-section">
        <div className="sf-section-head">
         <div>
          <span className="sf-kicker">Curated selection</span>
          <h2>Featured Spotlight</h2>
          <p>Highlighted picks from {shop?.name||'this shop'}.</p>
         </div>
         <button type="button" className="sf-link-action" onClick={()=>navigateBuyerPage('collection/featured-products')}>See all <ChevronRight size={15}/></button>
        </div>
        <div className="sf-spotlight-grid">
         {spotlightProducts.slice(0,4).map(p=>renderProductCard(p,'Featured'))}
        </div>
       </section>
      )}

      {/* 3. Main Storefront Catalogue */}
      <section className="sf-section" id="market-products-grid">
       <div className="sf-section-head">
        <div>
         <span className="sf-kicker">Store catalogue</span>
         <h2>{search.trim()||filter!=='All products'?`Results: ${filter==='All products'?`"${search.trim()}"`:filter}`:'All Products'}</h2>
        </div>
        <button type="button" className="sf-link-action" onClick={()=>{setSearch('');setFilter('All products');setSortOrder('recommended');navigateBuyerPage('collection/all-products')}}>Browse full catalogue <ChevronRight size={15}/></button>
       </div>

       <div className="sf-cat-tabs" role="tablist" aria-label="Shop by category">
        <button type="button" role="tab" aria-selected={filter==='All products'} className={'sf-cat-tab'+(filter==='All products'?' active':'')} onClick={()=>selectStoreCategory('All products')}>All Categories</button>
        {storefrontCategories.map(category=>(
         <button type="button" role="tab" key={category.name} aria-selected={filter===category.name} className={'sf-cat-tab'+(filter===category.name?' active':'')} onClick={()=>selectStoreCategory(category.name)}>{category.name}</button>
        ))}
       </div>

       <div className="sf-toolbar" aria-label="Product filters">
        <div className="sf-toolbar-controls">
         <select className="sf-select" aria-label="Filter products by category" value={filter} onChange={e=>setFilter(e.target.value)}>
          <option value="All products">All categories</option>
          {storefrontCategories.map(category=>(
           <optgroup key={category.name} label={category.name}>
            <option value={category.name}>{category.name}</option>
            {category.subcategories.map(child=><option key={child} value={child}>{child}</option>)}
           </optgroup>
          ))}
         </select>
         <select className="sf-select" aria-label="Sort products" value={sortOrder} onChange={e=>setSortOrder(e.target.value)}>
          <option value="recommended">Recommended</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
          <option value="name">Name: A to Z</option>
         </select>
        </div>
        <p className="sf-result-count">{totalMatchingCount>homeCatalogueList.length?`${homeCatalogueList.length} of ${totalMatchingCount.toLocaleString('en-KE')}`:`${homeCatalogueList.length.toLocaleString('en-KE')} products`}</p>
       </div>

       {loading&&homeCatalogueList.length===0?(
        renderSkeletonGrid(8)
       ):error?(
        <div className="sf-alert error">{error}</div>
       ):homeCatalogueList.length===0?(
        <div className="sf-state-box">
         <h3>No matching products</h3>
         <p>Try clearing your filters or searching another keyword.</p>
         <button type="button" className="sf-btn sf-btn-secondary" onClick={()=>{setSearch('');setFilter('All products')}}>Reset filters</button>
        </div>
       ):(
        <>
         <div className="sf-product-grid">{homeCatalogueList.map((p,idx)=>renderProductCard(p,undefined,idx<8))}</div>
         {catalogueHasMore&&(
          <div className="sf-load-more" ref={catalogueSentinelRef} aria-live="polite">
           <button type="button" className="sf-btn sf-btn-secondary" disabled={loadingMore} onClick={()=>void loadMoreProducts()}>
            {loadingMore?'Loading more products…':`Load more products (${homeCatalogueList.length} of ${totalMatchingCount.toLocaleString('en-KE')})`}
           </button>
          </div>
         )}
        </>
       )}
      </section>

      {/* 4. Helpful Shopping Answers */}
      <section className="sf-section" id="store-faq" style={{paddingBottom:24}}>
       <div className="sf-section-head">
        <div>
         <span className="sf-kicker">Help centre</span>
         <h2>Frequently Asked Questions</h2>
         <p>Helpful answers before you place an order.</p>
        </div>
        <button type="button" className="sf-link-action" onClick={()=>navigateBuyerPage('faqs')}>View all FAQs <ArrowRight size={15}/></button>
       </div>
       <div className="sf-faq-list">
        {marketplaceFaqs.slice(0,6).map(([question,answer])=>(
         <details key={question}>
          <summary>{question}<span>+</span></summary>
          <p>{answer}</p>
         </details>
        ))}
       </div>
      </section>
     </div>

     {totalCartUnits>0&&(
      <div className="sf-mobile-cartbar">
       <div className="sf-mobile-cartbar-meta">
        <strong>{totalCartUnits} item{totalCartUnits===1?'':'s'} in cart</strong>
        <small>KES {total.toLocaleString('en-KE')}</small>
       </div>
       <button type="button" className="sf-btn sf-btn-accent" style={{minHeight:36,padding:'0 14px',fontSize:13}} onClick={()=>navigateBuyerPage('cart')}>
        Go to cart <ArrowRight size={15}/>
       </button>
      </div>
     )}
     {renderFooter()}
    </>
   ):buyerPage.startsWith('collection/')?(
    <>
     {renderShopDrawer()}
     {renderStoreHeader()}
     <div className="sf-container" style={{paddingTop:28,paddingBottom:48}}>
      <div className="sf-flow-head">
       <button type="button" className="sf-back-btn" onClick={()=>navigateBuyerPage('store')}>← Back to shop</button>
       <span className="sf-kicker">{shop?.name||'Store collection'}</span>
       <h1>{collectionTitle}</h1>
       <p className="sf-flow-sub">{collectionKey==='featured-products'?'Explore products highlighted by this shop.':collectionKey==='top-picks'?'Discover highly rated products from this shop.':'Browse the complete product catalogue.'}</p>
      </div>
      <div className="sf-toolbar">
       <div className="sf-toolbar-controls">
        <select className="sf-select" aria-label="Filter collection by category" value={filter} onChange={e=>setFilter(e.target.value)}>
         <option value="All products">All categories</option>
         {storefrontCategories.map(category=>(
          <optgroup key={category.name} label={category.name}>
           <option value={category.name}>{category.name}</option>
           {category.subcategories.map(child=><option key={child} value={child}>{child}</option>)}
          </optgroup>
         ))}
        </select>
        <select className="sf-select" aria-label="Sort collection" value={sortOrder} onChange={e=>setSortOrder(e.target.value)}>
         <option value="recommended">Recommended</option>
         <option value="price-low">Price: Low to High</option>
         <option value="price-high">Price: High to Low</option>
         <option value="name">Name: A to Z</option>
        </select>
       </div>
       <p className="sf-result-count">{totalCollectionCount>collectionSorted.length?`${collectionSorted.length} of ${totalCollectionCount.toLocaleString('en-KE')}`:`${collectionSorted.length.toLocaleString('en-KE')} products`}</p>
      </div>
      {loading&&collectionSorted.length===0?(
       renderSkeletonGrid(8)
      ):collectionSorted.length===0?(
       <div className="sf-state-box">
        <h2>{collectionKey==='featured-products'?'No featured products yet':'No products found'}</h2>
        <p>{collectionKey==='featured-products'?'This shop has not highlighted any products yet. Browse all products instead.':'Try another search or browse the full collection.'}</p>
        <button type="button" className="sf-btn sf-btn-primary" onClick={()=>{setSearch('');navigateBuyerPage('collection/all-products')}}>Browse all products</button>
       </div>
      ):(
       <>
        <div className="sf-product-grid">{collectionSorted.map(p=>renderProductCard(p))}</div>
        {catalogueHasMore&&collectionKey!=='featured-products'&&(
         <div className="sf-load-more" ref={catalogueSentinelRef} aria-live="polite">
          <button type="button" className="sf-btn sf-btn-secondary" disabled={loadingMore} onClick={()=>void loadMoreProducts()}>
           {loadingMore?'Loading more products…':`Load more products (${collectionSorted.length} of ${totalCollectionCount.toLocaleString('en-KE')})`}
          </button>
         </div>
        )}
       </>
      )}
     </div>
     {totalCartUnits>0&&(
      <div className="sf-mobile-cartbar">
       <div className="sf-mobile-cartbar-meta"><strong>{totalCartUnits} item{totalCartUnits===1?'':'s'}</strong><small>KES {total.toLocaleString('en-KE')}</small></div>
       <button type="button" className="sf-btn sf-btn-accent" style={{minHeight:36,padding:'0 14px',fontSize:13}} onClick={()=>navigateBuyerPage('cart')}>Go to cart <ArrowRight size={15}/></button>
      </div>
     )}
     {renderFooter()}
    </>
   ):buyerPage==='product-detail'?(
    <>
     {renderShopDrawer()}
     {renderStoreHeader()}
     {selectedProduct?(
      <StorefrontProductDetail
       product={selectedProduct}
       products={products}
       slug={slug}
       shopName={shop?.name||'This shop'}
       cartQuantity={cart[selectedProduct.id]||0}
       totalCartUnits={totalCartUnits}
       saved={wishlistIds.includes(selectedProduct.id)}
       onToggleSaved={()=>toggleWishlist(selectedProduct.id)}
       onBack={closeProduct}
       onAdd={(quantity)=>setCart(c=>({...c,[selectedProduct.id]:Math.min(99,selectedProduct.stockQuantity!==null&&selectedProduct.stockQuantity>0?selectedProduct.stockQuantity:99,(c[selectedProduct.id]||0)+quantity)}))}
       onOpen={openProduct}
       onGoToCart={()=>navigateBuyerPage('cart')}
      />
     ):(
      <div className="sf-container" style={{paddingTop:28,paddingBottom:48}}>
       <div className="sf-skeleton-pdp" aria-busy="true" aria-label="Loading product">
        <div className="sf-skeleton-block" style={{aspectRatio:'1 / 1',width:'100%'}}/>
        <div style={{display:'flex',flexDirection:'column',gap:14,justifyContent:'center'}}>
         <div className="sf-skeleton-line" style={{height:14,width:'36%'}}/>
         <div className="sf-skeleton-line" style={{height:28,width:'82%'}}/>
         <div className="sf-skeleton-line" style={{height:24,width:'32%'}}/>
         <div className="sf-skeleton-line" style={{height:60,width:'100%'}}/>
         <button type="button" className="sf-btn sf-btn-secondary" style={{width:'max-content'}} onClick={()=>navigateBuyerPage('store')}>← Back to shop</button>
        </div>
       </div>
      </div>
     )}
     {renderFooter()}
    </>
   ):(
    <>
     {renderShopDrawer()}
     {renderStoreHeader(isCheckoutFlowRoute)}
     {!isCheckoutFlowRoute&&(
      <nav className="sf-routebar" aria-label="Store navigation">
       <div className="sf-routebar-inner">
        <div className="sf-routebar-nav">
         <button type="button" className="sf-routebar-link" onClick={()=>navigateBuyerPage('store')}><Home size={15}/> Shop home</button>
         <span style={{color:'var(--sf-muted)'}}>/</span>
         <button type="button" className="sf-routebar-link" onClick={()=>navigateBuyerPage(buyerCustomer?'account':'buyer-login')}><UserRound size={15}/> My account</button>
        </div>
       </div>
      </nav>
     )}
     <Deferred>{renderFlow()}</Deferred>
     {renderFooter()}
    </>
   )}
   {!isBuyerAccountRoute&&!isCheckoutFlowRoute&&buyerPage!=='buyer-login'&&buyerPage!=='buyer-signup'&&<PWAInstallButton variant="floating" label="Install app" appName={shop?.name||'this store'} showFallback />}
    {buyerPage!=='cart'&&!isCheckoutFlowRoute&&shop?.whatsappNumber&&shop.whatsappNumber.replace(/\D/g,'').length>=10&&(
    <a className={'sf-whatsapp-float'+((totalCartUnits>0||buyerPage==='product-detail')?' has-bottom-bar':'')} href={`https://wa.me/${shop.whatsappNumber.replace(/\D/g,'')}?text=Hello%2C%20I%20need%20help%20with%20this%20storefront.`} target="_blank" rel="noopener noreferrer" aria-label={`Contact ${shop?.name||'this shop'} on WhatsApp`}>
     <MessageCircle size={18}/><span>Help</span>
    </a>
   )}
  </main>
 );
}
const money=(n:number)=>'KES '+Number(n||0).toLocaleString('en-KE',{maximumFractionDigits:0});
function SellerOrderPage({order,orderNumber,shop,payoutForm,paymentPromptPhone,paymentPrompting,paymentPromptMessage,orderChatMessages,paymentPromptMethod,onPaymentMethodChange,onBack,onOpenMessages,onPhoneChange,onPrompt,onStatusChange,onDeliveryStatusChange}:{order:any,orderNumber:string,shop:any,payoutForm:any,paymentPromptPhone:string,paymentPromptMethod:string,onPaymentMethodChange:(v:string)=>void,paymentPrompting:boolean,paymentPromptMessage:string,orderChatMessages:any[],onBack:()=>void,onOpenMessages:()=>void,onPhoneChange:(v:string)=>void,onPrompt:()=>void,onStatusChange:(v:string)=>void,onDeliveryStatusChange:(v:string)=>void}){
 if(!order)return <div className="seller-order-route"><div className="seller-order-route-top"><button className="seller-secondary-btn" onClick={onBack}>← Back to orders</button><span>SELLER WORKSPACE / ORDERS</span></div><section className="seller-order-not-found"><span>ORDER NOT FOUND</span><h2>We couldn't find this order</h2><p>The order number <strong>{orderNumber}</strong> may be incorrect, or the order may no longer be available in this store.</p><button className="seller-primary-btn" onClick={onBack}>Return to orders</button></section></div>;
 const paymentState=String(order.payment_status||'unknown').toLowerCase();
 const orderState=String(order.status||'pending').toLowerCase();
 const deliveryState=String(order.delivery_status||'pending_delivery').toLowerCase();
 const paid=['succeeded','success','paid'].includes(paymentState);
 const deliveryLabel=deliveryState==='in_transit'?'In transit':deliveryState==='delivered'?'Delivered':'Pending delivery';
 const paymentMethod=paymentPromptMethod==='paybill'?'PayBill':'Till / Buy Goods';
 const canUseTill=!!(payoutForm.tillPartyB||(payoutForm.defaultPayoutMethod==='till'&&payoutForm.partyB));
 const canUsePaybill=!!(payoutForm.paybillPartyB&&payoutForm.accountReference);
 const placedAt=new Date(order.created_at);
 const updatedAt=order.updated_at?new Date(order.updated_at):null;
 return <div className="seller-order-route">
  <div className="seller-order-route-top"><button className="seller-secondary-btn" onClick={onBack}>← Back to Orders</button><button className="seller-secondary-btn seller-order-print" onClick={()=>window.print()}>▣ <span>Print</span></button></div>
  <article className="seller-order-approved">
   <section className="seller-order-hero">
    <div className="seller-order-hero-icon">✓</div>
    <div className="seller-order-hero-main"><span>ORDER DETAILS</span><h2>Order #{order.order_number}</h2><p>▦ {placedAt.toLocaleDateString('en-KE',{day:'2-digit',month:'short',year:'numeric'})} · {placedAt.toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'})}</p></div>
    <span className={'seller-order-payment-pill '+(paid?'is-paid':'is-unpaid')}>{paid?'✓ Payment: Successful':paymentState==='cancelled'?'Payment: Cancelled':paymentState==='failed'?'Payment: Failed':'Payment: Awaiting'}</span>
    <div className="seller-order-amount"><strong>{money(order.total)}</strong><span>Total Amount</span></div>
   </section>
   <section className="seller-order-customer-payment">
    <div className="seller-order-customer"><span className="seller-order-round-icon">♟</span><div><small>Customer</small><strong>{order.customer_name||'Customer'}</strong><a href={'tel:'+String(order.customer_phone||'').replace(/[^+0-9]/g,'')}>☎ {order.customer_phone||'Phone not provided'}</a></div></div>
    <div className="seller-order-mpesa"><span className="seller-order-round-icon">▣</span><div><small>Payment Method</small><strong>M-PESA</strong><small>Transaction:</small><b className="seller-order-receipt">{order.provider_receipt||'Awaiting M-PESA receipt'}</b></div></div>
   </section>
   <section className="seller-order-state-row">
    <div className="seller-order-fulfilment-pill">🚚 <span>Fulfilment: {deliveryLabel}</span></div>
    <label className="seller-order-status-pill">✓ <span>Order Status:</span><select aria-label="Order status" value={order.status||'pending'} onChange={e=>onStatusChange(e.target.value)}><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="processing">Processing</option><option value="fulfilled">Fulfilled</option><option value="cancelled">Cancelled</option></select>⌄</label>
   </section>
   <section className="seller-order-items seller-order-approved-items">
    <div className="seller-order-approved-section-head"><span>▦</span><h3>Order Items</h3></div>
    <div className="seller-order-approved-items-body"><div className="seller-order-approved-table-head"><span>Product</span><span>Qty</span><span>Unit Price</span><span>Total</span></div>
     {(order.items||[]).map((item:any,i:number)=><div className="seller-order-approved-item" key={i}><div className="seller-order-item-name">{item.imageUrl||item.image_url?<img src={item.imageUrl||item.image_url} alt=""/>:<span className="seller-order-product-placeholder">▣</span>}<div><strong>{item.name}</strong><small>{item.sku?'SKU: '+item.sku:'Product / Service'}</small></div></div><strong>{item.quantity}</strong><strong>{money(Number(item.unitPrice||0)/100)}</strong><strong>{money(Number(item.lineTotal||0)/100)}</strong></div>)}
     <div className="seller-order-approved-total"><strong>Order Total:</strong><strong>{money(order.total)}</strong></div>
    </div>
   </section>
   <section className="seller-delivery-card seller-order-approved-delivery">
    <div className="seller-order-approved-section-head seller-order-delivery-head"><span>📍</span><div><h3>Delivery Information</h3><p>Original delivery instructions submitted by the buyer at checkout.</p></div></div>
    <div className="seller-order-delivery-destination">
     <div><small>Delivery method</small><strong>{order.delivery_method==='pickup'?'Pickup / collection':'Home delivery'}</strong></div>
     {order.delivery_method==='pickup'?<div><small>Preferred pickup station / area</small><strong>{order.pickup_station||'Not provided'}</strong></div>:<>
      <div><small>County</small><strong>{order.delivery_county||'Not provided'}</strong></div>
      <div><small>Sub-county</small><strong>{order.delivery_sub_county||'Not provided'}</strong></div>
      <div><small>Estate / area</small><strong>{order.delivery_estate||'Not provided'}</strong></div>
      <div className="wide"><small>Physical delivery address</small><strong>{order.delivery_address||'Not provided'}</strong></div>
      <div className="wide"><small>Directions / landmarks</small><strong>{order.delivery_directions||'No extra directions provided'}</strong></div>
     </>}
    </div>
   </section>
   <section className="seller-delivery-card seller-order-approved-delivery">
    <div className="seller-order-approved-section-head seller-order-delivery-head"><span>🚚</span><div><h3>Delivery Status</h3><p>Update delivery status to keep the buyer informed.</p></div></div>
    <div className="seller-delivery-progress"><span className="active">◷<b>Pending Delivery</b></span><i className={['in_transit','delivered'].includes(deliveryState)?'active':''}/><span className={['in_transit','delivered'].includes(deliveryState)?'active':''}>🚚<b>In Transit</b></span><i className={deliveryState==='delivered'?'active':''}/><span className={deliveryState==='delivered'?'active':''}>✓<b>Delivered</b></span></div>
    <label>Update delivery status<select aria-label="Update delivery status" value={deliveryState} onChange={e=>onDeliveryStatusChange(e.target.value)}><option value="pending_delivery">Pending delivery</option><option value="in_transit">In transit</option><option value="delivered">Delivered</option></select></label>
   </section>
   <section className="seller-order-prompt seller-order-approved-prompt">
    <div className="seller-order-approved-panel-title"><span>ϟ</span><div><h3>Request Customer Payment</h3><p>Send an STK Push to the customer for {money(order.total)}.</p></div></div>
    <div className="seller-order-phone-field"><span className="seller-order-phone-icon">☎</span><div className="seller-order-phone-copy"><small>Customer M-PESA number</small><div className="seller-order-phone-input"><span className="seller-order-country-code">+254</span><input type="tel" inputMode="tel" autoComplete="tel-national" value={paymentPromptPhone.replace(/^\+?254/,'').replace(/^0/,'')} onChange={e=>onPhoneChange('+254'+e.target.value.replace(/\D/g,'').slice(0,9))} placeholder="7XX XXX XXX" aria-label="Customer M-PESA phone number"/></div></div></div>
    <div className="seller-order-method-picker" role="group" aria-label="Choose M-PESA payment method"><button type="button" className={paymentPromptMethod==='till'?'selected':''} disabled={!canUseTill} onClick={()=>onPaymentMethodChange('till')}><span className="seller-order-method-radio"/><span><strong>Till / Buy Goods</strong><small>{canUseTill?'CustomerBuyGoodsOnline':'Till not configured'}</small></span></button><button type="button" className={paymentPromptMethod==='paybill'?'selected':''} disabled={!canUsePaybill} onClick={()=>onPaymentMethodChange('paybill')}><span className="seller-order-method-radio"/><span><strong>PayBill</strong><small>{canUsePaybill?'CustomerPayBillOnline':'PayBill not configured'}</small></span></button></div>
    <p className="seller-order-daraja-note">ⓘ {paymentMethod} uses its matching saved Daraja credentials and payout destination.</p>
    <button className="seller-order-send-prompt" type="button" disabled={paymentPrompting||paid} onClick={onPrompt}>{paymentPrompting?'Sending payment prompt…':paid?'Payment received':'➤　Send Payment Prompt'}</button>
    {paymentPromptMessage&&<p className="seller-order-prompt-message" role="status">{paymentPromptMessage}</p>}
    {order.payment_message&&['failed','cancelled'].includes(paymentState)&&<p className="seller-order-prompt-message">{order.payment_message}</p>}
   </section>
   <button type="button" className="seller-order-messages-link" onClick={onOpenMessages}>
    <span className="seller-order-messages-icon"><MessageCircle size={21}/></span>
    <span className="seller-order-messages-copy"><strong>Order Messages</strong><small>Private conversation with your customer</small></span>
    <span className="seller-order-message-count" aria-label={orderChatMessages.length+" messages"}>{orderChatMessages.length}</span>
    <ChevronRight size={19}/>
   </button>
   <section className="seller-order-timeline"><div className="seller-order-approved-section-head"><span>◷</span><h3>Order Timeline</h3></div><ol><li className="done"><i>✓</i><div><small>{placedAt.toLocaleString('en-KE')}</small><strong>Order placed · {money(order.total)}</strong></div></li>{paid&&<li className="done"><i>✓</i><div><small>{updatedAt?.toLocaleString('en-KE')||'Payment verified'}</small><strong>Payment received{order.provider_receipt?' · '+order.provider_receipt:''}</strong></div></li>}<li className={['confirmed','processing','fulfilled'].includes(orderState)?'done':''}><i>{['confirmed','processing','fulfilled'].includes(orderState)?'✓':'◷'}</i><div><small>{updatedAt?.toLocaleString('en-KE')||'Awaiting update'}</small><strong>{orderState==='confirmed'?'Order confirmed':orderState==='processing'?'Order processing':orderState==='fulfilled'?'Order fulfilled':orderState==='cancelled'?'Order cancelled':'Awaiting fulfilment'}</strong></div></li>{deliveryState!=='pending_delivery'&&<li className="done"><i>✓</i><div><small>{order.delivery_updated_at?new Date(order.delivery_updated_at).toLocaleString('en-KE'):'Updated'}</small><strong>Delivery {deliveryState==='in_transit'?'in transit':'completed'}</strong></div></li>}</ol>
   </section>
  </article>
  <footer className="seller-order-route-footer"><span>{shop?.name||'Your store'} · DASNET Seller Workspace</span><span>Order information is private to your merchant account.</span></footer>
 </div>;
}
function SellerOrderMessages({order,orderNumber,shop,messages,attachments,draft,sending,error,onBack,onDraftChange,onSubmit,onUpload,onDownload}:{order:any,orderNumber:string,shop:any,messages:any[],attachments:any[],draft:string,sending:boolean,error:string,onBack:()=>void,onDraftChange:(v:string)=>void,onSubmit:(e:any)=>void,onUpload:(file?:File)=>void,onDownload:(id:string)=>void}){
 return <div className="seller-order-messages-page">
  <div className="seller-order-messages-top"><button type="button" className="seller-secondary-btn" onClick={onBack}>← Back to order</button><span>SELLER WORKSPACE / ORDER MESSAGES</span></div>
  <section className="seller-order-messages-panel">
   <header><span className="seller-order-messages-icon"><MessageCircle size={23}/></span><div><span>PRIVATE ORDER CONVERSATION</span><h2>{order?.customer_name||'Customer'}</h2><p>Order #{orderNumber} · {shop?.name||'Your store'}</p></div><b><i/> Live</b></header>
   <div className="seller-order-messages-feed">{messages.map((m:any)=><article key={m.id} className={'seller-chat-message '+(m.sender_type==='merchant'?'mine':'theirs')}><span>{m.sender_type==='merchant'?'Your store':'Customer'}</span><p>{m.message}</p><small>{new Date(m.created_at).toLocaleString('en-KE',{dateStyle:'medium',timeStyle:'short'})}</small></article>)}{!messages.length&&!error&&<div className="seller-order-messages-empty"><MessageCircle size={30}/><strong>No messages yet</strong><p>Send a message to start the conversation with your customer.</p></div>}</div>
   {attachments?.length>0&&<div className="chat-attachments"><strong>Shared files</strong>{attachments.map((a:any)=><button type="button" key={a.id} onClick={()=>onDownload(a.id)}>📎 {a.file_name} · {(Number(a.size_bytes)/1024/1024).toFixed(2)} MB <Download size={14}/></button>)}</div>}
   {error&&<p className="seller-order-prompt-message">{error}</p>}
   <form className="seller-order-messages-compose" onSubmit={onSubmit}><input value={draft} onChange={e=>onDraftChange(e.target.value)} maxLength={2000} placeholder="Write a message to your customer…" aria-label="Message"/><button type="submit" disabled={sending||!draft.trim()}>{sending?'Sending…':<><Send size={17}/> Send</>}</button></form><label className="chat-file-upload"><Plus size={15}/> Attach file <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.webp" onChange={e=>{onUpload(e.target.files?.[0]);e.currentTarget.value=''}}/><small>PDF, Office, TXT or image · max 10 MB</small></label>
  </section>
 </div>;
 }
function SellerSubscriptionsPanel({data,onRefresh,phone,checkoutPlanId,onCheckout,onBack}:{data:any;onRefresh:()=>void;phone?:string;checkoutPlanId?:string;onCheckout:(id:string)=>void;onBack:()=>void}){
 const [selected,setSelected]=useState(checkoutPlanId||''),[mobile,setMobile]=useState(phone||''),[sending,setSending]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[clock,setClock]=useState(Date.now());
 useEffect(()=>{const timer=window.setInterval(()=>setClock(Date.now()),1000);return()=>window.clearInterval(timer)},[]);
 useEffect(()=>{if(phone&&!mobile)setMobile(phone)},[phone]);
 useEffect(()=>{setSelected(checkoutPlanId||'')},[checkoutPlanId]);
 const plans=(data?.plans||[]).filter((p:any)=>p.is_active!==false);
 const lifetimePlan=plans.find((p:any)=>p.code==='lifetime-license');
 const recurringPlans=plans.filter((p:any)=>p.code!=='lifetime-license');
 const trialDays=Math.max(0,Math.min(30,Number(data?.trialDays??7)));
 const current=data?.subscription;
 const ownsLifetime=current?.code==='lifetime-license';
 const trialEnd=current?.trial_ends_at||current?.current_period_end;
 const trialRemaining=Math.max(0,new Date(trialEnd||0).getTime()-clock);
 const trialExpired=current?.status==='trialing'&&trialRemaining<=0;
 const trialCountdown=Math.floor(trialRemaining/86400000)+'d '+Math.floor(trialRemaining%86400000/3600000)+'h '+Math.floor(trialRemaining%3600000/60000)+'m '+Math.floor(trialRemaining%60000/1000)+'s';
 const payment=data?.lastPayment;
 async function pay(){
  if(!selected){setError('Choose a subscription plan first.');return}
  if(!mobile.trim()){setError('Enter the M-PESA phone number to receive the STK prompt.');return}
  setSending(true);setError('');setMessage('');
  try{const r=await fetch('/api/merchant?action=subscription-stk',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({planId:selected,phone:mobile.trim()})});const d=await readApiResponse(r);if(!r.ok)throw Error(d.error||'Could not send M-PESA prompt.');setMessage(d.message||'M-PESA prompt sent. Enter your PIN to complete payment.');onRefresh();}
  catch(e:any){setError(e.message)}finally{setSending(false)}
 }
 useEffect(()=>{if(payment?.status!=='pending'&&payment?.status!=='initiated')return;const timer=window.setInterval(onRefresh,5000);return()=>window.clearInterval(timer)},[payment?.status,onRefresh]);
 return <section className={"seller-subscriptions"+(checkoutPlanId?" is-checkout-route":"")}>
  <div className="seller-page-heading"><div><span className="seller-sub-eyebrow">YOUR SHOP · BILLING</span><h2>Subscription access</h2><p>Choose a recurring subscription or pay once for a lifetime platform-use licence. Hosting, domains and optional maintenance remain separate.</p></div><span className={'seller-sub-status '+(current?.status==='active'?'active':'')}><i/>{current?.status==='active'?'Active subscription':trialExpired?'Trial expired':current?.status==='trialing'?'Free trial':current?.status||'No subscription'}</span></div>
  <div className="seller-sub-trial"><div className="seller-sub-trial-icon"><CreditCard size={21}/></div><div><strong>{trialDays>0?`${trialDays}-day free trial for new sellers`:'No free trial for new sellers'}</strong><p>Your customer sales remain commission-free. Subscription fees are paid separately to DASMARKET.</p></div><span className="seller-sub-trial-tag">0% COMMISSION</span></div>
  {current&&<div className="seller-sub-selection"><div><span>YOUR CURRENT PLAN</span><strong>{current.name} · {ownsLifetime?'Lifetime licence':current.status==='trialing'?'Free trial':current.status==='active'?'Paid subscription':current.status}</strong><small>{ownsLifetime?'One-time payment · lifetime platform-use access':current.status==='trialing'?'Trial ends: '+new Date(current.trial_ends_at||current.current_period_end).toLocaleDateString('en-KE')+(trialExpired?' · expired':' · '+trialCountdown+' remaining'):'Current period ends: '+new Date(current.current_period_end).toLocaleDateString('en-KE')}</small></div><span className="seller-sub-current-price">KSh {(Number(current.price_minor||0)/100).toLocaleString('en-KE')} {ownsLifetime?'· paid once':' / '+(Number(current.interval_days)===30?'month':Number(current.interval_days)===90?'3 months':Number(current.interval_days)===180?'6 months':'year')}</span></div>}
  {payment&&<div className={'seller-sub-payment-status '+payment.status}><strong>Latest payment: {payment.status}</strong><span>{payment.status==='pending'||payment.status==='initiated'?'An M-PESA prompt is awaiting confirmation.':payment.status==='succeeded'?'Receipt: '+(payment.provider_receipt||'Verified'):payment.status==='failed'||payment.status==='cancelled'?'You can try again by selecting a plan.':''}</span></div>}
  <div className="seller-sub-benefits"><div><strong>0%</strong><span>Sales commission</span></div><div><strong>100%</strong><span>Your customer sales belong to you</span></div><div><strong>FULL</strong><span>Access to all features</span></div></div>
  {lifetimePlan&&<article className={'seller-sub-plan featured seller-sub-lifetime-plan '+(ownsLifetime?'selected':'')}><div className="seller-sub-plan-top"><div><h3>Lifetime platform licence</h3><span>One payment. No recurring subscription fee.</span></div><span className="seller-sub-popular">ONE-TIME</span></div><div className="seller-sub-price"><strong>KSh {(Number(lifetimePlan.price_minor||0)/100).toLocaleString('en-KE')}</strong><span>once · lifetime access</span></div><p className="seller-sub-lifetime-copy">A lifetime licence to use the full DASMARKET platform for this shop, including all standard seller tools and features.</p><div className="seller-sub-feature-heading">Included</div><ul><li><Check size={15}/>Full DASMARKET platform access</li><li><Check size={15}/>Unlimited product listings and staff</li><li><Check size={15}/>Custom domains, analytics and promotions</li><li><Check size={15}/>0% sales commission</li></ul><p className="seller-sub-lifetime-exclusions">Hosting, domain renewals, third-party services and optional maintenance are charged separately.</p><button type="button" disabled={ownsLifetime} className={ownsLifetime?'seller-sub-select selected':'seller-sub-select'} onClick={()=>{setError('');setMessage('');onCheckout(lifetimePlan.id)}}>{ownsLifetime?'Lifetime licence active':'Buy lifetime licence'}</button></article>}
  <div className="seller-sub-plan-grid">{recurringPlans.map((plan:any)=><article key={plan.id} className={'seller-sub-plan '+(plan.is_featured?'featured ':'')+(selected===plan.id?'selected':'')}><div className="seller-sub-plan-top"><div><h3>{plan.name}</h3><span>{plan.description||'Subscription plan'}</span></div>{plan.is_featured&&<span className="seller-sub-popular">POPULAR</span>}</div><div className="seller-sub-price"><strong>KSh {(Number(plan.price_minor||0)/100).toLocaleString('en-KE')}</strong><span>/ {Number(plan.interval_days)===30?'month':Number(plan.interval_days)===90?'3 months':Number(plan.interval_days)===180?'6 months':'year'}</span></div><div className="seller-sub-feature-heading">Everything included</div><ul><li><Check size={15}/>All DASMARKET features</li><li><Check size={15}/>Unlimited product listings</li><li><Check size={15}/>Full seller dashboard and tools</li><li><Check size={15}/>0% sales commission</li></ul><button type="button" className={selected===plan.id?'seller-sub-select selected':'seller-sub-select'} onClick={()=>{setError('');setMessage('');onCheckout(plan.id)}}>{selected===plan.id?'Selected plan':'Choose '+plan.name}</button></article>)}</div>
  {checkoutPlanId&&selected&&<section className="seller-sub-checkout-page"><div className="seller-sub-checkout-page-top"><button type="button" className="seller-secondary-btn" onClick={onBack}>← Back to subscription plans</button><span>SECURE BILLING</span></div><div className="seller-sub-checkout-modal seller-sub-checkout-standalone" role="region" aria-labelledby="seller-sub-checkout-title"><header><div><span>{plans.find((p:any)=>p.id===selected)?.code==='lifetime-license'?'ONE-TIME LICENCE CHECKOUT':'SUBSCRIPTION CHECKOUT'}</span><h3 id="seller-sub-checkout-title">{plans.find((p:any)=>p.id===selected)?.code==='lifetime-license'?'Lifetime platform licence':plans.find((p:any)=>p.id===selected)?.name||'Selected plan'}</h3></div></header><div className="seller-sub-checkout-plan"><strong>KSh {(Number(plans.find((p:any)=>p.id===selected)?.price_minor||0)/100).toLocaleString('en-KE')}</strong><span>{plans.find((p:any)=>p.id===selected)?.code==='lifetime-license'?'once · lifetime access':'/ '+(Number(plans.find((p:any)=>p.id===selected)?.interval_days)===30?'month':Number(plans.find((p:any)=>p.id===selected)?.interval_days)===90?'3 months':Number(plans.find((p:any)=>p.id===selected)?.interval_days)===180?'6 months':'year')}</span><small>{plans.find((p:any)=>p.id===selected)?.description||'Subscription plan'}</small></div><label>M-PESA phone number<input type="tel" inputMode="tel" autoComplete="tel" placeholder="07XXXXXXXX or 2547XXXXXXXX" value={mobile} onChange={e=>setMobile(e.target.value)}/></label><button type="button" className="seller-sub-pay-button" disabled={!selected||sending||!data?.payment?.configured} onClick={pay}>{sending?'Sending prompt…':plans.find((p:any)=>p.id===selected)?.code==='lifetime-license'?'Pay once with M-PESA':'Pay with M-PESA'}</button>{!data?.payment?.configured&&<p className="seller-sub-modal-warning">Subscription payment destination is not configured by DASMARKET yet.</p>}{error&&<div className="auth-message error">{error}</div>}{message&&<div className="auth-message success">{message}</div>}<p className="seller-sub-modal-note">Your access is activated only after Safaricom independently confirms the payment.</p></div></section>}
  <div className="seller-sub-footnote"><ShieldCheck size={16}/><p><strong>No sales commission.</strong> Customer payments go directly to the seller. DASMARKET subscription fees are separate.</p></div>
  <p className="seller-sub-review-note">Your subscription is activated or changed only after the M-PESA payment is independently verified.</p>
 </section>;
}

function SellerDashboard({initialOrderNumber='',initialSubscriptionCheckoutPlanId=''}:{initialOrderNumber?:string;initialSubscriptionCheckoutPlanId?:string}){
 const [subscriptionCheckoutPlanId,setSubscriptionCheckoutPlanId]=useState(initialSubscriptionCheckoutPlanId);
 const isSellerEditorRoute=window.location.pathname==='/dashboard/products/new'||window.location.pathname.endsWith('/edit')&&window.location.pathname.startsWith('/dashboard/products/');
 const isSellerDetailRoute=(window.location.pathname.startsWith('/dashboard/products/')&&!isSellerEditorRoute)||window.location.pathname.startsWith('/dashboard/transactions/');
 const [customStoreDomain,setCustomStoreDomain]=useState('');
 const [orderChatMessages,setOrderChatMessages]=useState<any[]>([]),[orderChatAttachments,setOrderChatAttachments]=useState<any[]>([]),[orderChatDraft,setOrderChatDraft]=useState(''),[orderChatSending,setOrderChatSending]=useState(false),[orderChatError,setOrderChatError]=useState(''),[routeMessage,setRouteMessage]=useState(false);
 const [testCatalogBusy,setTestCatalogBusy]=useState(false),[productSearch,setProductSearch]=useState(''),[transactionSearch,setTransactionSearch]=useState(''),[showBulkImporter,setShowBulkImporter]=useState(false);
  const [paymentPromptPhone,setPaymentPromptPhone]=useState(''),[paymentPromptMethod,setPaymentPromptMethod]=useState('till'),[paymentPrompting,setPaymentPrompting]=useState(false),[paymentPromptMessage,setPaymentPromptMessage]=useState('');
 const [sellerInitialReportId,setSellerInitialReportId]=useState(()=>{const p=window.location.pathname;const id=p.startsWith('/dashboard/reports/')?decodeURIComponent(p.slice('/dashboard/reports/'.length).split('/')[0]||''):'';return id&&id!=='new'?id:'';});
 const [subscriptionClock,setSubscriptionClock]=useState(Date.now());useEffect(()=>{const timer=window.setInterval(()=>setSubscriptionClock(Date.now()),1000);return()=>window.clearInterval(timer)},[]);const [loading,setLoading]=useState(true),[user,setUser]=useState<{displayName?:string;phone?:string}|null>(null),[error,setError]=useState(''),[shop,setShop]=useState<{name:string;slug:string;status?:string;description:string;logoUrl?:string;whatsappNumber?:string;contactPhone?:string;contactEmail?:string;termsAndConditions?:string;privacyPolicy?:string;returnPolicy?:string;deliveryPolicy?:string;faqs?:Array<{question:string;answer:string}>;theme?:string}|null>(null),[products,setProducts]=useState<any[]>([]),[orders,setOrders]=useState<any[]>([]),[tab,setTab]=useState<'overview'|'orders'|'products'|'payments'|'transactions'|'payouts'|'api'|'tickets'|'notifications'|'account'|'settings'|'policies'|'coupons'|'reports'|'domains'|'subscriptions'>(()=>{if(window.location.pathname.startsWith('/dashboard/reports'))return 'reports';if(window.location.pathname.startsWith('/dashboard/subscriptions'))return 'subscriptions';const requested=new URLSearchParams(window.location.search).get('tab')||'';return (['overview','orders','products','payments','transactions','payouts','api','tickets','notifications','account','settings','policies','coupons','domains','subscriptions'].includes(requested)?requested:'overview') as any}),[editing,setEditing]=useState<any>(null),[saving,setSaving]=useState(false),[notice,setNotice]=useState(''),[query,setQuery]=useState(''),[orderFilter,setOrderFilter]=useState('all'),[period,setPeriod]=useState('7'),[mobileMenuOpen,setMobileMenuOpen]=useState(false),[profile,setProfile]=useState<any>({displayName:'',email:'',phone:'',avatarUrl:''}),[tickets,setTickets]=useState<any[]>([]),[transactions,setTransactions]=useState<any[]>([]),[selectedDetail,setSelectedDetail]=useState<any>(null),[routeOrderNumber,setRouteOrderNumber]=useState(initialOrderNumber),[ticketForm,setTicketForm]=useState<any>({subject:'',category:'general',message:''}),[credentialForm,setCredentialForm]=useState<any>({accountType:'CustomerBuyGoodsOnline',environment:'production',shortcode:'',consumerKey:'',consumerSecret:'',passkey:''}),[credentialStatus,setCredentialStatus]=useState<any>({till:{configured:false},paybill:{configured:false}}),[emailConfig,setEmailConfig]=useState<any>({fromName:'',fromEmail:'',replyToEmail:'',notificationEmail:'',apiKey:''}),[emailStatus,setEmailStatus]=useState<any>({configured:false,fromEmail:'',replyToEmail:''}),[emailTestTo,setEmailTestTo]=useState(''),[emailTestSending,setEmailTestSending]=useState(false),[payoutForm,setPayoutForm]=useState<any>({tillPartyB:'',paybillPartyB:'',accountReference:'',defaultPayoutMethod:'till'}),[subscriptionData,setSubscriptionData]=useState<any>(null);
 async function load(){setError('');const s=await fetch('/api/auth?action=session',{credentials:'same-origin',cache:'no-store'});const sd=await readApiResponse(s);if(!s.ok){window.location.href='/login';return;}setUser(sd.user);setLoading(false);const [r,o]=await Promise.all([fetch('/api/merchant?action=products',{credentials:'same-origin',cache:'no-store'}),fetch('/api/merchant?action=orders',{credentials:'same-origin',cache:'no-store'})]);const [d,od]=await Promise.all([readApiResponse(r),readApiResponse(o)]);if(!r.ok)throw Error(d.error||'Could not load catalogue');if(!o.ok)throw Error(od.error||'Could not load orders');setShop(d.shop);setProducts(d.products||[]);setOrders(od.orders||[]);setLoading(false);void (async()=>{try{const dr=await fetch('/api/custom-domain',{credentials:'same-origin',cache:'no-store'});const dd=await readApiResponse(dr);if(dr.ok){const activeDomain=(dd.domains||[]).find((domain:any)=>domain.verified&&domain.storefrontVerified!==false);setCustomStoreDomain(activeDomain?.hostname||'');}}catch(domainLoadError){console.warn('Custom storefront domain could not be loaded.',domainLoadError)}try{const sr=await fetch('/api/merchant?action=subscription',{credentials:'same-origin',cache:'no-store'});const sub=await readApiResponse(sr);if(sr.ok)setSubscriptionData(sub);}catch(subscriptionLoadError){console.warn('Subscription status could not be loaded.',subscriptionLoadError)}})();const currentPath=window.location.pathname;const isReportsRoute=currentPath==='/dashboard/reports'||currentPath.startsWith('/dashboard/reports/');const isSubscriptionCheckout=currentPath.startsWith('/dashboard/subscriptions/checkout/');const routeParts=currentPath.replace(/^\/dashboard\/?/,'').split('/').filter(Boolean);const isMessages=!isReportsRoute&&routeParts[routeParts.length-1]==='message';const dashboardTabRoutes=['overview','orders','products','payments','transactions','payouts','api','tickets','notifications','account','settings','domains','policies','coupons','subscriptions'];const isDashboardTabRoute=routeParts.length===1&&dashboardTabRoutes.includes(routeParts[0]);const isSellerEditorRoute=routeParts[0]==='products'&&(routeParts[1]==='new'||routeParts[2]==='edit');const isSellerRecordRoute=routeParts.length===2&&(routeParts[0]==='products'||routeParts[0]==='transactions')&&!isSellerEditorRoute;const activeOrderNumber=(isReportsRoute||isSubscriptionCheckout||isDashboardTabRoute||isSellerRecordRoute)?'':decodeURIComponent(routeParts[isMessages?routeParts.length-2:routeParts.length-1]||'');if(isReportsRoute){setRouteMessage(false);setRouteOrderNumber('');setSelectedDetail(null);const reportPart=currentPath.slice('/dashboard/reports/'.length).split('/')[0]||'';setSellerInitialReportId(reportPart&&reportPart!=='new'?decodeURIComponent(reportPart):'');setTab('reports')}else if(isSubscriptionCheckout){setRouteMessage(false);setRouteOrderNumber('');setSelectedDetail(null);setSubscriptionCheckoutPlanId(decodeURIComponent(routeParts[2]||''));setTab('subscriptions')}else if(isSellerEditorRoute){setRouteMessage(false);setRouteOrderNumber('');setSelectedDetail(null);setSubscriptionCheckoutPlanId('');setTab('products');const productId=routeParts[1]==='new'?'':routeParts[1];const product=(d.products||[]).find((item:any)=>String(item.id)===productId);setEditing(product?{...product,type:product.type,price:String(product.price),stock:product.stockQuantity??'',metadata:product.metadata||{}}:{name:'',description:'',type:'physical',price:'',stock:'',sku:'',images:[],metadata:{}})}else if(isSellerDetailRoute){setRouteMessage(false);setRouteOrderNumber('');setSubscriptionCheckoutPlanId('');const type=routeParts[0]==='products'?'product':'transaction';const record=(type==='product'?d.products||[]:[]).find((item:any)=>String(item.id)===routeParts[1])||(type==='transaction'?[]:[]);setSelectedDetail(record?{type,data:record}:null);setTab(type==='product'?'products':'transactions')}else{setSubscriptionCheckoutPlanId('');setRouteMessage(isMessages);if(activeOrderNumber){const activeOrder=(od.orders||[]).find((item:any)=>item.order_number===activeOrderNumber);if(activeOrder){setSelectedDetail({type:'order',data:activeOrder});setRouteOrderNumber(activeOrderNumber);setPaymentPromptPhone(activeOrder.customer_phone||'');setTab('orders')}else{setSelectedDetail(null);setRouteOrderNumber(activeOrderNumber)}}else{const requested=new URLSearchParams(window.location.search).get('tab')||routeParts[0]||'';const allowedTabs=['overview','orders','reports','products','payments','transactions','payouts','api','tickets','notifications','account','settings','domains','policies','coupons','subscriptions'];setTab((allowedTabs.includes(requested)?requested:'overview') as any)}}try{const urls=['profile','payment-settings','tickets','transactions','api-credentials','email-credentials'];const rs=await Promise.all(urls.map(x=>fetch('/api/store?action='+x,{credentials:'same-origin',cache:'no-store'}).catch(()=>null)));const ds=await Promise.all(rs.map(async r=>r?readApiResponse(r):({})));if(rs[0]?.ok){const personalProfile=ds[0].profile||{};setProfile(personalProfile);if(String(personalProfile.displayName||'').trim())setUser((current:any)=>({...current,displayName:personalProfile.displayName}));}if(rs[1]?.ok){setPaymentPromptMethod(ds[1].defaultPayoutMethod||'till');setPayoutForm({tillPartyB:ds[1].tillPartyB||'',paybillPartyB:ds[1].paybillPartyB||'',accountReference:ds[1].accountReference||'',defaultPayoutMethod:ds[1].defaultPayoutMethod||'till'});setCredentialForm((v:any)=>({...v,shortcode:ds[1].shortcode||'',accountType:ds[1].accountType||'CustomerBuyGoodsOnline',environment:ds[1].environment||'production'}));}if(rs[2]?.ok)setTickets(ds[2].tickets||[]);if(rs[3]?.ok){setTransactions(ds[3].transactions||[]);const route=window.location.pathname.split('/').filter(Boolean);if(route.length===3&&route[0]==='dashboard'&&route[1]==='transactions'){const found=(ds[3].transactions||[]).find((item:any)=>String(item.id)===decodeURIComponent(route[2]));if(found)setSelectedDetail({type:'transaction',data:found});}}if(rs[4]?.ok){const status=ds[4].credentialsByType||{till:{configured:false},paybill:{configured:false}};setCredentialStatus(status);const selected=(ds[1].defaultPayoutMethod==='paybill'?'paybill':'till');setCredentialForm((v:any)=>({...v,shortcode:status[selected]?.shortcode||'',environment:status[selected]?.environment||'production'}));}if(rs[5]?.ok){const status=ds[5]||{};setEmailStatus(status);setEmailConfig((v:any)=>({...v,fromName:shop?.name||'',fromEmail:status.fromEmail||'',replyToEmail:status.replyToEmail||'',notificationEmail:status.notificationEmail||ds[0]?.profile?.email||'',apiKey:''}));}}catch(optionalError){console.warn('Some optional seller dashboard data could not be loaded.',optionalError)}}
 useEffect(()=>{load().catch(e=>setError(e.message)).finally(()=>setLoading(false))},[]);
 useEffect(()=>{if(!routeOrderNumber)return;let active=true,busy=false;const refreshOrder=async()=>{if(busy)return;busy=true;try{const r=await fetch('/api/merchant?action=orders',{credentials:'same-origin',cache:'no-store'});const d=await readApiResponse(r);if(!r.ok)throw Error(d.error||'Could not refresh order');if(!active)return;const latest=(d.orders||[]).find((item:any)=>item.order_number===routeOrderNumber);if(latest){setOrders(d.orders||[]);setSelectedDetail((current:any)=>current?.type==='order'&&current.data.id===latest.id?({...current,data:latest}):current)}}catch(e:any){if(active)setError(e.message)}finally{busy=false}};refreshOrder();const timer=window.setInterval(refreshOrder,5000);return()=>{active=false;window.clearInterval(timer)}},[routeOrderNumber]);
 useEffect(()=>{const syncRoute=()=>{const currentPath=window.location.pathname;const isReportsRoute=currentPath==='/dashboard/reports'||currentPath.startsWith('/dashboard/reports/');if(currentPath.startsWith('/dashboard/subscriptions/checkout/')){setRouteMessage(false);setRouteOrderNumber('');setSelectedDetail(null);setSubscriptionCheckoutPlanId(decodeURIComponent(currentPath.split('/')[4]||''));setTab('subscriptions');return;}const detailParts=currentPath.split('/').filter(Boolean);if(!(detailParts[0]==='dashboard'&&detailParts[1]==='products'&&(detailParts[2]==='new'||detailParts[3]==='edit')))setEditing(null);if(detailParts[0]==='dashboard'&&detailParts[1]==='products'&&(detailParts[2]==='new'||detailParts[3]==='edit')){setSelectedDetail(null);setRouteOrderNumber('');setSubscriptionCheckoutPlanId('');setTab('products');const id=detailParts[2]==='new'?'':detailParts[2];const found=products.find((item:any)=>String(item.id)===decodeURIComponent(id));setEditing(found?{...found,type:found.type,price:String(found.price),stock:found.stockQuantity??'',metadata:found.metadata||{}}:{name:'',description:'',type:'physical',price:'',stock:'',sku:'',images:[],metadata:{}});return;}if(detailParts.length===3&&detailParts[0]==='dashboard'&&['products','transactions'].includes(detailParts[1])){const type=detailParts[1]==='products'?'product':'transaction';const list=type==='product'?products:transactions;const record=list.find((item:any)=>String(item.id)===decodeURIComponent(detailParts[2]));setRouteMessage(false);setRouteOrderNumber('');setSubscriptionCheckoutPlanId('');setSelectedDetail(record?{type,data:record}:null);setTab(type==='product'?'products':'transactions');return;}setSubscriptionCheckoutPlanId('');if(isReportsRoute){setRouteMessage(false);setRouteOrderNumber('');setSelectedDetail(null);const reportPart=currentPath.slice('/dashboard/reports/'.length).split('/')[0]||'';setSellerInitialReportId(reportPart&&reportPart!=='new'?decodeURIComponent(reportPart):'');setTab('reports');return}const parts=currentPath.replace(/^\/dashboard\/?/,'').split('/').filter(Boolean);const isMessages=parts[parts.length-1]==='message';const dashboardTabs=['overview','orders','products','payments','transactions','payouts','api','tickets','notifications','account','settings','domains','policies','coupons','subscriptions'];const isTabRoute=parts.length===1&&dashboardTabs.includes(parts[0]);const number=isTabRoute?'':parts.length?decodeURIComponent(parts[isMessages?parts.length-2:parts.length-1]||''):'';setRouteMessage(isMessages);setRouteOrderNumber(number);if(number){const match=orders.find((item:any)=>item.order_number===number);if(match){setSelectedDetail({type:'order',data:match});setPaymentPromptPhone(match.customer_phone||'')}setTab('orders')}else{setSelectedDetail(null);const requested=new URLSearchParams(window.location.search).get('tab')||parts[0]||'';setTab((['overview','orders','products','payments','transactions','payouts','api','tickets','notifications','account','settings','domains','policies','coupons','subscriptions'].includes(requested)?requested:'overview') as any)}};window.addEventListener('popstate',syncRoute);return()=>window.removeEventListener('popstate',syncRoute)},[orders]); 
 function navigateSellerTab(nextTab:any){if(!['overview','orders','reports','products','payments','transactions','payouts','api','tickets','notifications','account','settings','domains','policies','coupons','subscriptions'].includes(nextTab))return;const target=nextTab==='overview'?'/dashboard':'/dashboard/'+encodeURIComponent(nextTab);if(window.location.pathname+window.location.search!==target)window.history.pushState({sellerTab:nextTab},'',target);setRouteMessage(false);setRouteOrderNumber('');setSelectedDetail(null);setSubscriptionCheckoutPlanId('');setTab(nextTab);setError('');setNotice('');setMobileMenuOpen(false);window.scrollTo(0,0)}
 function openSubscriptionCheckout(planId:string){setSubscriptionCheckoutPlanId(planId);setTab('subscriptions');setRouteMessage(false);setRouteOrderNumber('');setSelectedDetail(null);window.history.pushState({subscriptionCheckoutPlanId:planId},'','/dashboard/subscriptions/checkout/'+encodeURIComponent(planId));window.scrollTo(0,0)}
 function closeSubscriptionCheckout(){setSubscriptionCheckoutPlanId('');window.history.pushState({sellerTab:'subscriptions'},'','/dashboard/subscriptions');setTab('subscriptions');window.scrollTo(0,0)}
 function openProductEditor(product?:any){const next=product?{...product,type:product.type,price:String(product.price),stock:product.stockQuantity??'',metadata:product.metadata||{}}:{name:'',description:'',type:'physical',price:'',stock:'',sku:'',images:[],metadata:{}};setEditing(next);setSelectedDetail(null);setTab('products');const target=product?'/dashboard/products/'+encodeURIComponent(String(product.id))+'/edit':'/dashboard/products/new';window.history.pushState({productEditor:true},'',target);window.scrollTo(0,0)}
 function closeProductEditor(){setEditing(null);window.history.pushState({sellerTab:'products'},'','/dashboard/products');window.scrollTo(0,0)}
 function openSellerDetail(type:'product'|'transaction',data:any){setSelectedDetail({type,data});setTab(type==='product'?'products':'transactions');setRouteOrderNumber('');const target='/dashboard/'+(type==='product'?'products':'transactions')+'/'+encodeURIComponent(String(data.id));if(window.location.pathname!==target)window.history.pushState({sellerDetailType:type,sellerDetailId:data.id},'',target);window.scrollTo(0,0)}
 function closeSellerDetail(){const target='/dashboard/'+(selectedDetail?.type==='transaction'?'transactions':'products');setSelectedDetail(null);window.history.pushState({},'',target);setTab(selectedDetail?.type==='transaction'?'transactions':'products');window.scrollTo(0,0)}
 function openOrder(order:any){const number=String(order.order_number||'');window.history.pushState({orderNumber:number},'', '/dashboard/'+encodeURIComponent(number));setRouteMessage(false);setRouteOrderNumber(number);setTab('orders');setSelectedDetail({type:'order',data:order});setPaymentPromptPhone(order.customer_phone||'');setOrderChatDraft('');setPaymentPromptMessage('')}
 function closeOrder(){window.history.pushState({},'', '/dashboard');setRouteMessage(false);setRouteOrderNumber('');setSelectedDetail(null);setTab('orders')}
 function openOrderMessages(){if(!routeOrderNumber)return;window.history.pushState({},'','/dashboard/'+encodeURIComponent(routeOrderNumber)+'/message');setRouteMessage(true);setOrderChatDraft('')}
 function closeOrderMessages(){window.history.pushState({},'','/dashboard/'+encodeURIComponent(routeOrderNumber));setRouteMessage(false)}
 useEffect(()=>{if(selectedDetail?.type!=='order'){setOrderChatMessages([]);setOrderChatError('');return}let live=true;const refresh=()=>fetch('/api/merchant?action=order-chat&orderId='+encodeURIComponent(selectedDetail.data.id),{credentials:'same-origin',cache:'no-store'}).then(async r=>{const d=await readApiResponse(r);if(!r.ok)throw Error(d.error||'Could not load conversation');if(live){setOrderChatMessages(d.messages||[]);setOrderChatAttachments(d.attachments||[])}}).catch(e=>{if(live)setOrderChatError(e.message)});refresh();const timer=window.setInterval(refresh,5000);return()=>{live=false;window.clearInterval(timer)}},[selectedDetail?.type,selectedDetail?.data?.id]);
 useEffect(()=>{if(selectedDetail?.type==='order')setPaymentPromptPhone(selectedDetail.data.customer_phone||'')},[selectedDetail?.type,selectedDetail?.data?.id]);
 async function sendMerchantMessage(e:any){e.preventDefault();if(!orderChatDraft.trim()||orderChatSending||selectedDetail?.type!=='order')return;setOrderChatSending(true);setOrderChatError('');try{const r=await fetch('/api/merchant?action=order-chat',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({orderId:selectedDetail.data.id,message:orderChatDraft})});const d=await readApiResponse(r);if(!r.ok)throw Error(d.error||'Message could not be sent');setOrderChatMessages(d.messages||[]);setOrderChatDraft('')}catch(e:any){setOrderChatError(e.message)}finally{setOrderChatSending(false)}}


 async function uploadMerchantAttachment(file?:File){if(!file||selectedDetail?.type!=='order')return;if(file.size>10485760){setOrderChatError('Each attachment must be 10 MB or smaller.');return;}setOrderChatError('');try{const sign=await fetch('/api/store?action=chat-attachment',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({orderId:selectedDetail.data.id,mode:'upload',fileName:file.name,contentType:file.type,size:file.size})});const sd=await readApiResponse(sign);if(!sign.ok)throw Error(sd.error||'Could not prepare upload');const put=await fetch(sd.uploadUrl,{method:'PUT',headers:{'Content-Type':file.type},body:file});if(!put.ok)throw Error('File upload failed. Please retry.');const done=await fetch('/api/store?action=chat-attachment',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({orderId:selectedDetail.data.id,mode:'complete',attachmentId:sd.attachmentId})});const dd=await readApiResponse(done);if(!done.ok)throw Error(dd.error||'Could not confirm upload');setOrderChatAttachments(a=>[...a,dd.attachment]);}catch(e:any){setOrderChatError(e.message)}}
 async function downloadMerchantAttachment(id:string){try{const r=await fetch('/api/store?action=chat-attachment',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({orderId:selectedDetail.data.id,mode:'download',attachmentId:id})});const d=await readApiResponse(r);if(!r.ok)throw Error(d.error||'Download unavailable');window.open(d.url,'_blank','noopener,noreferrer')}catch(e:any){setOrderChatError(e.message)}}
 async function logout(){await fetch('/api/auth?action=logout',{method:'POST',credentials:'same-origin'});window.location.href='/login'}
 async function saveProduct(e:any){e.preventDefault();setSaving(true);setNotice('');setError('');try{const r=await fetch('/api/merchant?action=product',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(editing)});const d=await readApiResponse(r);if(!r.ok)throw Error(d.error||'Save failed');setEditing(null);if(window.location.pathname.startsWith('/dashboard/products/')&&(window.location.pathname.endsWith('/edit')||window.location.pathname.endsWith('/new')))window.history.pushState({sellerTab:'products'},'','/dashboard/products');await load();setNotice('Product saved successfully.')}catch(e:any){setError(e.message)}finally{setSaving(false)}}
 async function uploadBulkProductImage(file:File){const sign=await fetch('/api/merchant?action=product-image-upload',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({fileName:file.name,contentType:file.type,size:file.size})});const sd=await readApiResponse(sign);if(!sign.ok)throw Error(sd.error||'Could not prepare image upload');await uploadToObjectStorage(sd.uploadUrl,file,'Product image '+file.name);return String(sd.imageKey);}
 async function removeProduct(id:string){if(!window.confirm('Delete this product? This cannot be undone.'))return;const r=await fetch('/api/merchant?action=product&id='+encodeURIComponent(id),{method:'DELETE',credentials:'same-origin'});const d=await readApiResponse(r);if(!r.ok){setError(d.error||'Delete failed');return}await load();setNotice('Product deleted.')}
 async function setStatus(id:string,active:boolean){const r=await fetch('/api/merchant?action=product-status',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({id,active})});const d=await readApiResponse(r);if(!r.ok){setError(d.error||'Update failed');return}setSelectedDetail((current:any)=>current?.type==='product'&&current.data.id===id?({...current,data:{...current.data,active}}):current);await load();setNotice(active?'Product published.':'Product hidden from your shop.')}
 async function promptOrderPayment(order:any){
  if(paymentPrompting)return;setPaymentPrompting(true);setPaymentPromptMessage('');
  try{const r=await fetch('/api/payments?action=order-prompt',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({orderId:order.id,phone:paymentPromptPhone||order.customer_phone,paymentMethod:paymentPromptMethod})});const d=await readApiResponse(r);if(!r.ok)throw Error(d.error||'Could not send payment prompt');setPaymentPromptMessage(d.message||'STK prompt sent.');setNotice('M-PESA payment prompt sent for '+order.order_number+'.');await load();}
  catch(e:any){setPaymentPromptMessage(e.message||'Payment prompt failed.');}
  finally{setPaymentPrompting(false);}
 }
 async function updateDeliveryStatus(id:string,deliveryStatus:string){const r=await fetch('/api/merchant?action=order-delivery-status',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({id,deliveryStatus})});const d=await readApiResponse(r);if(!r.ok){setError(d.error||'Delivery update failed');return}setSelectedDetail((current:any)=>current?.type==='order'&&current.data.id===id?({...current,data:{...current.data,delivery_status:deliveryStatus}}):current);await load();setNotice('Delivery status updated. The buyer can now see this update.')}
 async function updateOrder(id:string,status:string){const r=await fetch('/api/merchant?action=order-status',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({id,status})});const d=await readApiResponse(r);if(!r.ok){setError(d.error||'Update failed');return}setSelectedDetail((current:any)=>current?.type==='order'&&current.data.id===id?({...current,data:{...current.data,status}}):current);await load();setNotice('Order status updated.')}
 async function saveSettings(e:any){e.preventDefault();setSaving(true);setError('');try{const r=await fetch('/api/merchant?action=settings',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({name:shop?.name,description:shop?.description||'',logoUrl:shop?.logoUrl||'',whatsappNumber:shop?.whatsappNumber||'',theme:shop?.theme||'#e47a13'})});const d=await readApiResponse(r);if(!r.ok)throw Error(d.error||'Settings save failed');setNotice('Shop settings saved.');await load()}catch(e:any){setError(e.message)}finally{setSaving(false)}}
 const money=(n:number)=>'KES '+Number(n||0).toLocaleString('en-KE',{maximumFractionDigits:0});
 const pending=orders.filter(o=>['pending','confirmed','processing'].includes(String(o.status).toLowerCase()));
 const orderValue=orders.reduce((sum,o)=>sum+Number(o.total||0),0);
 const activeProducts=products.filter(p=>p.active);
 const lowStock=products.filter(p=>p.stockQuantity!==null&&Number(p.stockQuantity)<=5&&p.active);
 const filteredOrders=orders.filter(o=>{const q=query.trim().toLowerCase();const matches=!q||[o.order_number,o.customer_name,o.customer_phone,o.status].some(v=>String(v||'').toLowerCase().includes(q));return matches&&(orderFilter==='all'||String(o.status).toLowerCase()===orderFilter)});
 const days=Array.from({length:Number(period)},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(Number(period)-1-i));d.setHours(0,0,0,0);const next=new Date(d);next.setDate(next.getDate()+1);const list=orders.filter(o=>{const t=new Date(o.created_at);return t>=d&&t<next});return {label:d.toLocaleDateString('en-KE',{day:'numeric',month:'short'}),count:list.length,value:list.reduce((s,o)=>s+Number(o.total||0),0)}});
 const maxValue=Math.max(1,...days.map(d=>d.value));
 const categories=['Digital products','Data bundles','Shop products'].map(name=>({name,count:products.filter(p=>p.category===name).length})).filter(x=>x.count>0);
 const notifications=[...orders.slice(0,4).map(o=>({title:'New order '+o.order_number,detail:o.customer_name+' · '+money(o.total),time:o.created_at,kind:'order',data:o})),...lowStock.slice(0,3).map(p=>({title:'Low stock: '+p.name,detail:String(p.stockQuantity)+' remaining',time:'',kind:'stock',data:p}))].slice(0,6);
 function exportOrders(){const rows=[['Order number','Date','Customer','Phone','Total KES','Status'],...filteredOrders.map(o=>[o.order_number,o.created_at,o.customer_name,o.customer_phone,o.total,o.status])];const csv='\ufeff'+rows.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='dasnet-orders-'+new Date().toISOString().slice(0,10)+'.csv';a.click();URL.revokeObjectURL(url);}
 const storeUrl=shop?(customStoreDomain?'https://'+customStoreDomain:'https://'+shop.slug+'.dasmarket.co.ke'):'';
 async function copyStore(){if(!storeUrl)return;try{await navigator.clipboard.writeText(storeUrl);setNotice('Store link copied.')}catch{setNotice(storeUrl)}}
 const nav=[{id:'overview',label:'Overview',icon:LayoutDashboard},{id:'orders',label:'Orders & Sales',icon:ShoppingBag},{id:'reports',label:'Reports & Complaints',icon:MessageCircle},{id:'products',label:'Products',icon:Package},{id:'payments',label:'Payments',icon:WalletCards},{id:'subscriptions',label:'Subscriptions',icon:CreditCard},{id:'coupons',label:'Coupons & Offers',icon:TicketPercent},{id:'policies',label:'Shop Policies',icon:FileText},{id:'transactions',label:'Transactions',icon:WalletCards},{id:'payouts',label:'Payout Settings',icon:Wallet},{id:'api',label:'API Credentials',icon:ShieldCheck},{id:'tickets',label:'Support Tickets',icon:HelpCircle},{id:'notifications',label:'Notifications',icon:Bell},{id:'account',label:'My Account',icon:Store},{id:'settings',label:'Shop Settings',icon:Settings},{id:'domains',label:'Custom Domain',icon:Globe}];
  const title=nav.find(x=>x.id===tab)?.label||'Overview';
  const isSellerPageRoute=Boolean(isSellerDetailRoute||editing||sellerInitialReportId||routeOrderNumber||routeMessage||subscriptionCheckoutPlanId||window.location.pathname==='/dashboard/reports/new');
  return <main className={(mobileMenuOpen?"seller-app mobile-menu-open":"seller-app")+(isSellerPageRoute?" seller-page-route":"")+(isSellerDetailRoute?" seller-record-page":"")+(editing?" seller-product-editor-page":"")} data-theme="light">
  <>{mobileMenuOpen&&<button className="seller-mobile-scrim" aria-label="Close navigation" onClick={()=>setMobileMenuOpen(false)}/>}<aside className="seller-rail">
   <div className="seller-brand"><Brand/></div>
   <div className="seller-profile"><div className="seller-avatar">{(user?.displayName||'S').slice(0,1).toUpperCase()}</div><div className="seller-profile-copy"><strong>{user?.displayName||'Seller'}</strong><span><i/> Verified seller</span><small>Seller workspace</small></div></div>
   <div className="seller-nav-caption">WORKSPACE</div>
   <nav className="seller-nav">{nav.map(item=><button key={item.id} className={tab===item.id?'seller-nav-link active':'seller-nav-link'} onClick={()=>navigateSellerTab(item.id)}><item.icon size={16}/><span>{item.label}</span>{item.id==='orders'&&pending.length>0&&<b>{pending.length}</b>}{item.id==='notifications'&&notifications.length>0&&<b>{notifications.length}</b>}</button>)}</nav>
   <div className="seller-rail-bottom"><PWAInstallButton variant="seller-rail" label="Install Seller App" appName="DASMARKET Seller Dashboard" showFallback /><button className="seller-nav-link" onClick={()=>navigateSellerTab('tickets')}><HelpCircle size={16}/>Help & Support</button><button className="seller-nav-link" onClick={logout}><LogOut size={16}/>Sign out</button><div className="seller-help-card"><strong>Need a hand?</strong><span>Manage your shop with confidence.</span><button onClick={()=>navigateSellerTab('tickets')}>Contact support</button></div><small>DASNET Seller Workspace · v1</small></div>
  </aside></>
  <section className="seller-workarea">
   <header className="seller-topbar"><div className="seller-topbar-title"><button className="seller-mobile-menu-btn" aria-label="Toggle navigation" onClick={()=>setMobileMenuOpen(v=>!v)}>{mobileMenuOpen?<X size={20}/>:<Menu size={20}/>}</button><div><h1>{tab==='overview'?'Seller Dashboard':title}</h1><p>Track your performance and manage your store</p></div></div><div className="seller-top-actions"><PWAInstallButton variant="seller" label="Install Seller App" appName="DASMARKET Seller Dashboard" showFallback /><button className="seller-icon-btn" title="Notifications" onClick={()=>navigateSellerTab('notifications')}><Bell size={17}/></button><button className="seller-icon-btn" title="Refresh dashboard" onClick={()=>{load().catch(e=>setError(e.message))}}><RefreshCw size={17}/></button><button type="button" className="seller-top-user" onClick={()=>navigateSellerTab('account')} aria-label="Open seller account overview"><span>{(user?.displayName||'S').slice(0,1).toUpperCase()}</span><div><strong>{user?.displayName||'Seller'}</strong><small>Seller account</small></div></button></div></header>
   <div className="seller-content">
    {error&&<div className="auth-message error seller-alert">{error}</div>}{notice&&<div className="auth-message success seller-alert">{notice}</div>}
    {loading?<div className="seller-loading"><span className="seller-spinner"/>Loading your workspace…</div>:<>
    {routeOrderNumber?(routeMessage?<SellerOrderMessages order={selectedDetail?.type==='order'?selectedDetail.data:null} orderNumber={routeOrderNumber} shop={shop} messages={orderChatMessages} attachments={orderChatAttachments} onUpload={uploadMerchantAttachment} onDownload={downloadMerchantAttachment} draft={orderChatDraft} sending={orderChatSending} error={orderChatError} onBack={closeOrderMessages} onDraftChange={setOrderChatDraft} onSubmit={sendMerchantMessage}/>:<SellerOrderPage order={selectedDetail?.type==='order'?selectedDetail.data:null} orderNumber={routeOrderNumber} shop={shop} payoutForm={payoutForm} paymentPromptPhone={paymentPromptPhone} paymentPrompting={paymentPrompting} paymentPromptMessage={paymentPromptMessage} orderChatMessages={orderChatMessages} onBack={closeOrder} onOpenMessages={openOrderMessages} onPhoneChange={setPaymentPromptPhone} paymentPromptMethod={paymentPromptMethod} onPaymentMethodChange={setPaymentPromptMethod} onPrompt={()=>selectedDetail?.type==='order'&&promptOrderPayment(selectedDetail.data)} onStatusChange={v=>selectedDetail?.type==='order'&&updateOrder(selectedDetail.data.id,v)} onDeliveryStatusChange={v=>selectedDetail?.type==='order'&&updateDeliveryStatus(selectedDetail.data.id,v)}/>) : <>{tab==='overview'&&<>
     <section className="seller-welcome-strip"><div><strong>Welcome back, {user?.displayName||'Seller'}! <span>✦</span></strong><p>Here’s what’s happening with your store today.</p></div><div className="seller-store-summary"><span className="seller-store-icon"><Store size={19}/></span><div><strong>{shop?.name||'My Store'} <i className={shop?.status==='past_due'?'expired':''}>● {shop?.status==='past_due'?'Offline · payment required':'Active'}</i></strong><a href={storeUrl||'/dashboard'} target="_blank" rel="noreferrer">{storeUrl?storeUrl.replace(/^https:\/\//,''):'Set up your store'}</a></div><button className="seller-primary-btn" onClick={()=>storeUrl&&window.open(storeUrl,'_blank','noopener,noreferrer')}>View Store <ArrowUpRight size={14}/></button></div></section>
     <section className="seller-sub-overview"><div><span>SUBSCRIPTION</span><strong>{subscriptionData?.subscription?.name||'No active plan'}</strong><small>{subscriptionData?.subscription?.status==='trialing'?(new Date(subscriptionData.subscription.trial_ends_at||subscriptionData.subscription.current_period_end||0).getTime()>subscriptionClock?'Free trial · '+(()=>{const ms=Math.max(0,new Date(subscriptionData.subscription.trial_ends_at||subscriptionData.subscription.current_period_end).getTime()-subscriptionClock),d=Math.floor(ms/86400000),h=Math.floor(ms%86400000/3600000),m=Math.floor(ms%3600000/60000),s=Math.floor(ms%60000/1000);return d+'d '+h+'h '+m+'m '+s+'s remaining'})():'Trial expired · choose a paid plan'):subscriptionData?.subscription?.status==='active'?'Active · renews '+(subscriptionData.subscription.current_period_end?new Date(subscriptionData.subscription.current_period_end).toLocaleDateString('en-KE'):'—'):subscriptionData?.subscription?.status||'Choose a plan to activate your shop subscription'}</small></div><button type="button" onClick={()=>navigateSellerTab('subscriptions')}>{subscriptionData?.subscription?'Change plan':'Choose plan'} <ArrowRight size={15}/></button></section>
     <div className="seller-kpis">
      <article><span className="seller-kpi-icon"><WalletCards size={18}/></span><label>Total order value</label><strong>{money(orderValue)}</strong><small>Value of orders recorded</small></article>
      <article><span className="seller-kpi-icon"><ShoppingBag size={18}/></span><label>Orders</label><strong>{orders.length}</strong><small>{pending.length} awaiting fulfilment</small></article>
      <article><span className="seller-kpi-icon"><Package size={18}/></span><label>Products</label><strong>{products.length}</strong><small>{activeProducts.length} published listings</small></article>
      <article><span className="seller-kpi-icon"><CircleAlert size={18}/></span><label>Low stock</label><strong>{lowStock.length}</strong><small>Products with 5 or fewer left</small></article>
     </div>
     <div className="seller-dashboard-grid">
      <section className="seller-panel seller-trend-panel"><div className="seller-panel-head"><div><h2>Order activity</h2><p>Order value recorded over time</p></div><select value={period} onChange={e=>setPeriod(e.target.value)}><option value="7">Last 7 days</option><option value="14">Last 14 days</option><option value="30">Last 30 days</option></select></div>
       <div className="seller-chart">{days.map((d,i)=><div className="seller-chart-col" key={d.label+'-'+i}><div className="seller-chart-bar-wrap"><div className="seller-chart-bar" style={{height:Math.max(4,d.value/maxValue*100)+'%'}} title={money(d.value)+' · '+d.count+' orders'}/></div><small>{d.label}</small></div>)}</div>
       <div className="seller-chart-foot"><strong>{money(days.reduce((s,d)=>s+d.value,0))}</strong><span>{days.reduce((s,d)=>s+d.count,0)} orders in selected period</span></div>
      </section>
      <section className="seller-panel seller-recent-panel"><div className="seller-panel-head"><div><h2>Recent orders</h2><p>Latest customer activity</p></div><button className="seller-text-action" onClick={()=>setTab('orders')}>View all <ArrowRight size={14}/></button></div>
       <div className="seller-mini-table"><div className="seller-mini-head"><span>Order</span><span>Customer</span><span>Amount</span><span>Status</span></div>{orders.slice(0,5).map(o=><div className="seller-mini-row" key={o.id}><strong>{o.order_number}</strong><span>{o.customer_name}</span><span>{money(o.total)}</span><em className={'seller-status '+String(o.status).toLowerCase()}>{o.status}</em></div>)}{orders.length===0&&<p className="seller-empty">No orders yet. Share your shop link to get started.</p>}</div>
      </section>
      <section className="seller-panel seller-products-panel"><div className="seller-panel-head"><div><h2>Top products</h2><p>Your current catalogue</p></div><button className="seller-text-action" onClick={()=>setTab('products')}>View all <ArrowRight size={14}/></button></div>
       {products.slice(0,5).map(p=><div className="seller-product-line" key={p.id}><span className="seller-product-thumb"><Package size={17}/></span><div><strong>{p.name}</strong><small>{p.category}</small></div><b>{money(p.price)}</b><i>{p.active?'Published':'Hidden'}</i></div>)}{products.length===0&&<p className="seller-empty">Add your first product to start building your catalogue.</p>}
      </section>
      <section className="seller-panel seller-category-panel"><div className="seller-panel-head"><div><h2>Catalogue breakdown</h2><p>Listings by product type</p></div></div>
       {categories.length?categories.map((c,i)=><div className="seller-category-row" key={c.name}><span className={'seller-category-dot dot-'+i}/><span>{c.name}</span><b>{c.count}</b><div><i style={{width:(c.count/Math.max(1,products.length)*100)+'%'}}/></div></div>):<p className="seller-empty">Your product categories will appear here.</p>}
      </section>
      <section className="seller-panel seller-quick-panel"><div className="seller-panel-head"><div><h2>Quick actions</h2><p>Common store tasks</p></div></div><button className="seller-quick-primary" onClick={()=>{openProductEditor()}}><Plus size={16}/>Add product</button><button onClick={()=>setTab('orders')}><ShoppingBag size={16}/>View orders</button><button onClick={copyStore}><Store size={16}/>Copy store link</button><button onClick={()=>setTab('payouts')}><Wallet size={16}/>Payout settings</button></section>
      <section className="seller-panel seller-notification-panel"><div className="seller-panel-head"><div><h2>Recent notifications</h2><p>Orders and stock reminders</p></div><button className="seller-text-action" onClick={()=>setTab('notifications')}>View all <ArrowRight size={14}/></button></div>{notifications.map((n,i)=><button type="button" className="seller-notice-row seller-notice-button" key={n.title+i} onClick={()=>{if(n.kind==='order'){setTab('orders');openOrder(n.data)}else{setTab('products');openSellerDetail('product',n.data)}}}><span className={n.kind==='stock'?'stock':'order'}>{n.kind==='stock'?<CircleAlert size={15}/>:<ShoppingBag size={15}/>}</span><span className="seller-notice-copy"><strong>{n.title}</strong><small>{n.detail}</small></span><time>{n.time?new Date(n.time).toLocaleDateString('en-KE'):'Now'}</time><ArrowRight className="seller-notice-arrow" size={15}/></button>)}{notifications.length===0&&<p className="seller-empty">No new notifications.</p>}</section>
     </div>
    </>}
    {tab==='products'&&<>
     <div className="seller-page-heading"><div><h2>Product catalogue</h2><p>Create, edit, publish and manage your listings. {Number(subscriptionData?.subscription?.features?.product_limit??50)>0?products.length+' / '+Number(subscriptionData?.subscription?.features?.product_limit??50)+' products used':'Product limit: unlimited'}</p></div><div className="seller-product-heading-actions"><button type="button" className="seller-secondary-btn" disabled={testCatalogBusy} onClick={async()=>{if(testCatalogBusy)return;setTestCatalogBusy(true);setError('');setNotice('');try{const r=await fetch('/api/merchant?action=products-test-seed',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({})});const d=await readApiResponse(r);if(!r.ok)throw Error(d.error||'Could not generate test products');await load();setNotice(d.message+' Test listings are clearly labelled and do not create orders or sales.')}catch(e:any){setError(e.message)}finally{setTestCatalogBusy(false)}}}>{testCatalogBusy?'Generating…':'Generate 50 test products / category'}</button><button type="button" className={showBulkImporter?'seller-primary-btn':'seller-secondary-btn'} onClick={()=>setShowBulkImporter(v=>!v)}><FileSpreadsheet size={15}/> {showBulkImporter?'Close bulk importer':'Bulk import CSV / JSON'}</button>{Number(subscriptionData?.subscription?.features?.product_limit??50)>0&&products.length>=Number(subscriptionData?.subscription?.features?.product_limit??50)?<button type="button" className="seller-primary-btn" onClick={()=>navigateSellerTab('subscriptions')}>Upgrade plan <ArrowUpRight size={15}/></button>:<button className="seller-primary-btn" onClick={()=>openProductEditor()}><Plus size={15}/> Add product</button>}</div></div>{showBulkImporter&&<BulkCatalogueImporter mode="seller" existingProducts={products} onUploadImage={uploadBulkProductImage} onImported={async()=>{await load();}} onClose={()=>setShowBulkImporter(false)}/>}
     {editing&&<form className="seller-editor seller-editor-route" onSubmit={saveProduct}><div className="seller-editor-route-top"><button type="button" className="seller-secondary-btn" onClick={closeProductEditor}>← Back to products</button><span>PRODUCT EDITOR</span></div><div className="seller-editor-grid"><label>Product name<input required maxLength={120} value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})}/></label><label>Product type<select value={editing.type} onChange={e=>setEditing({...editing,type:e.target.value})}><option value="physical">Shop product</option><option value="data_bundle">Data bundle</option><option value="digital">Digital product</option></select></label><label>Store category<select value={editing.metadata?.category||''} onChange={e=>setEditing({...editing,metadata:{...(editing.metadata||{}),category:e.target.value}})}><option value="">Select a category</option>{sellerCategoryOptions.map(category=><option key={category} value={category}>{category}</option>)}</select><small>Choose the exact category buyers will use to find this listing.</small></label><label className="seller-featured-toggle"><input type="checkbox" checked={!!editing.metadata?.spotlight} onChange={e=>setEditing({...editing,metadata:{...(editing.metadata||{}),spotlight:e.target.checked}})}/> Feature in storefront hero <small>Choose up to five products. Featured items scroll automatically on your shop.</small></label><label>Price (KES)<input required type="number" min="0" step="0.01" value={editing.price} onChange={e=>setEditing({...editing,price:e.target.value})}/></label><label>Stock quantity<input type="number" min="0" step="1" placeholder="Leave blank if not tracked" value={editing.stock??''} onChange={e=>setEditing({...editing,stock:e.target.value})}/></label><label className="wide">Description<textarea maxLength={2000} rows={3} value={editing.description} onChange={e=>setEditing({...editing,description:e.target.value})}/></label><label>SKU<input maxLength={80} value={editing.sku||''} onChange={e=>setEditing({...editing,sku:e.target.value})}/></label><label>Unit of measure<input maxLength={40} placeholder="e.g. piece, kg, pack" value={editing.metadata?.unitOfMeasure||''} onChange={e=>setEditing({...editing,metadata:{...(editing.metadata||{}),unitOfMeasure:e.target.value}})}/></label><label>Purchase cost (KES)<input type="number" min="0" step="0.01" value={editing.metadata?.purchaseCost??''} onChange={e=>setEditing({...editing,metadata:{...(editing.metadata||{}),purchaseCost:e.target.value}})}/></label><label>Tax rate (%)<input type="number" min="0" max="100" step="0.01" value={editing.metadata?.taxRate??''} onChange={e=>setEditing({...editing,metadata:{...(editing.metadata||{}),taxRate:e.target.value}})}/></label><label>Reorder level<input type="number" min="0" step="1" value={editing.metadata?.reorderLevel??''} onChange={e=>setEditing({...editing,metadata:{...(editing.metadata||{}),reorderLevel:e.target.value}})}/></label><label>Preferred vendor<input maxLength={120} value={editing.metadata?.preferredVendor||''} onChange={e=>setEditing({...editing,metadata:{...(editing.metadata||{}),preferredVendor:e.target.value}})}/></label><label>Sales account<input maxLength={80} value={editing.metadata?.salesAccount||''} onChange={e=>setEditing({...editing,metadata:{...(editing.metadata||{}),salesAccount:e.target.value}})}/></label><label>Purchase account<input maxLength={80} value={editing.metadata?.purchaseAccount||''} onChange={e=>setEditing({...editing,metadata:{...(editing.metadata||{}),purchaseAccount:e.target.value}})}/></label><label>Inventory account<input maxLength={80} value={editing.metadata?.inventoryAccount||''} onChange={e=>setEditing({...editing,metadata:{...(editing.metadata||{}),inventoryAccount:e.target.value}})}/></label><label className="wide">Tags<input maxLength={250} value={editing.metadata?.tags||''} onChange={e=>setEditing({...editing,metadata:{...(editing.metadata||{}),tags:e.target.value}})}/></label><label className="wide">Product images<input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={async e=>{const files=Array.from(e.target.files||[]);if(files.length>5){setError('Maximum five images.');return;}try{const images=await Promise.all(files.map(file=>new Promise<string>((resolve,reject)=>{if(file.size>900000){reject(Error('Each image must be under 900 KB.'));return;}const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error('Image read failed'));reader.readAsDataURL(file)})));setEditing((v:any)=>({...v,images}));}catch(err:any){setError(err.message)}}}/><small>PNG, JPEG or WebP · up to 5 images</small><div className="seller-image-preview">{(editing.images||[]).map((src:string,i:number)=><img key={i} src={src} alt={'Product '+(i+1)}/>)}</div></label></div><div className="seller-editor-actions"><button className="seller-primary-btn" disabled={saving}>{saving?'Saving…':'Save product'}</button><button type="button" className="seller-secondary-btn" onClick={closeProductEditor}>Cancel</button></div></form>}
     <div className="seller-table-panel"><div className="seller-table-toolbar"><strong>{products.length} products</strong><span>{activeProducts.length} published · {products.length-activeProducts.length} hidden</span></div><label className="seller-list-search"><Search size={16}/><input value={productSearch} onChange={e=>setProductSearch(e.target.value)} placeholder="Search products by name, SKU or category"/></label><div className="seller-table-scroll"><table className="seller-table"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead><tbody>{products.filter(p=>(p.name+' '+(p.sku||'')+' '+(p.category||'')).toLowerCase().includes(productSearch.toLowerCase())).map(p=><tr key={p.id} className="seller-clickable-row" role="button" tabIndex={0} onClick={()=>openSellerDetail('product',p)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openSellerDetail('product',p)}}}><td><strong>{p.name}</strong><small>{p.testProduct?'TEST LISTING':p.sku||'No SKU'}</small></td><td>{p.category}</td><td>{money(p.price)}</td><td>{p.stockQuantity===null?'Not tracked':p.stockQuantity}</td><td><em className={'seller-status '+(p.active?'published':'hidden')}>{p.active?'Published':'Hidden'}</em></td><td><div className="seller-table-actions"><button onClick={e=>{e.stopPropagation();setEditing({...p,type:p.type,price:String(p.price),stock:p.stockQuantity??'',metadata:p.metadata||{}})}}>Edit</button><button onClick={e=>{e.stopPropagation();setStatus(p.id,!p.active)}}>{p.active?'Hide':'Publish'}</button><button className="danger" onClick={e=>{e.stopPropagation();removeProduct(p.id)}}>Delete</button></div></td></tr>)}</tbody></table>{products.length===0&&<p className="seller-empty">No products yet. Add your first listing.</p>}</div></div>
    </>}
    {tab==='orders'&&<><div className="seller-page-heading"><div><h2>Orders & sales</h2><p>Review customer orders and update fulfilment status.</p></div><button className="seller-secondary-btn" onClick={exportOrders}><Download size={15}/> Export CSV</button></div><div className="seller-orders-toolbar"><input placeholder="Search order, customer or phone" value={query} onChange={e=>setQuery(e.target.value)}/><select value={orderFilter} onChange={e=>setOrderFilter(e.target.value)}><option value="all">All statuses</option><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="processing">Processing</option><option value="fulfilled">Fulfilled</option><option value="cancelled">Cancelled</option></select><button className="seller-secondary-btn" onClick={()=>{load().catch(e=>setError(e.message))}}><RefreshCw size={14}/> Refresh</button></div><div className="seller-table-panel"><div className="seller-table-scroll"><table className="seller-table"><thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th><th>Update status</th></tr></thead><tbody>{filteredOrders.map(o=><tr key={o.id} className="seller-clickable-row" role="button" tabIndex={0} onClick={()=>openOrder(o)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openOrder(o)}}}><td><strong>{o.order_number}</strong><small>{o.customer_phone}</small></td><td>{o.customer_name}</td><td>{new Date(o.created_at).toLocaleDateString('en-KE')}</td><td>{money(o.total)}</td><td><em className={'seller-status '+String(o.status).toLowerCase()}>{o.status}</em></td><td><select value={o.status} onClick={e=>e.stopPropagation()} onChange={e=>{e.stopPropagation();updateOrder(o.id,e.target.value)}}><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="processing">Processing</option><option value="fulfilled">Fulfilled</option><option value="cancelled">Cancelled</option></select></td></tr>)}</tbody></table>{filteredOrders.length===0&&<p className="seller-empty">No orders match your filters.</p>}</div></div></>}
    {tab==='transactions'&&<><div className="seller-page-heading"><div><h2>Transactions</h2><p>Customer payment records for this store.</p></div><button className="seller-secondary-btn" onClick={()=>load()}>Refresh</button></div><div className="seller-table-panel"><label className="seller-list-search"><Search size={16}/><input value={transactionSearch} onChange={e=>setTransactionSearch(e.target.value)} placeholder="Search by order, phone, receipt or status"/></label><div className="seller-table-scroll"><table className="seller-table"><thead><tr><th>Date</th><th>Order</th><th>Phone</th><th>Amount</th><th>Receipt</th><th>Status</th></tr></thead><tbody>{transactions.filter((t:any)=>(String(t.order_number||'')+' '+String(t.phone||'')+' '+String(t.provider_receipt||'')+' '+String(t.status||'')).toLowerCase().includes(transactionSearch.toLowerCase())).map((t:any)=><tr key={t.id} className="seller-clickable-row" role="button" tabIndex={0} onClick={()=>openSellerDetail('transaction',t)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openSellerDetail('transaction',t)}}}><td>{new Date(t.created_at).toLocaleString('en-KE')}</td><td>{t.order_number||'—'}</td><td>{t.phone||'—'}</td><td>{money(t.amount)}</td><td>{t.provider_receipt||'—'}</td><td>{t.status}</td></tr>)}</tbody></table>{!transactions.length&&<p className="seller-empty">No payment transactions recorded yet.</p>}</div></div></>}
    {tab==='payouts'&&<><div className="seller-page-heading"><div><h2>Payout settings</h2><p>Save both merchant collection destinations, then choose which one customers use by default.</p></div></div><form className="seller-editor" onSubmit={async e=>{e.preventDefault();setSaving(true);setError('');try{const r=await fetch('/api/merchant?action=payout-settings',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(payoutForm)}),d=await readApiResponse(r);if(!r.ok)throw Error(d.error||'Could not save payout destinations');setNotice('Payout destinations saved. Default: '+(d.defaultPayoutMethod==='paybill'?'PayBill':'Till')+'.')}catch(err:any){setError(err.message)}finally{setSaving(false)}}}><label>Storefront business name<input value={shop?.name||''} readOnly/></label><label>Till Party B<input inputMode="numeric" pattern="[0-9]{5,12}" placeholder="Enter merchant Till number" value={payoutForm.tillPartyB} onChange={e=>setPayoutForm({...payoutForm,tillPartyB:e.target.value})}/><small>Buy Goods destination. You can save this alongside a PayBill.</small></label><label>PayBill Party B<input inputMode="numeric" pattern="[0-9]{5,12}" placeholder="Enter merchant PayBill number" value={payoutForm.paybillPartyB} onChange={e=>setPayoutForm({...payoutForm,paybillPartyB:e.target.value})}/><small>PayBill destination. It does not overwrite the Till.</small></label><label>PayBill account number / reference<input value={payoutForm.accountReference} onChange={e=>setPayoutForm({...payoutForm,accountReference:e.target.value})} placeholder="Account reference"/><small>Required when a PayBill is configured.</small></label><label>Default customer payment method<select value={payoutForm.defaultPayoutMethod} onChange={e=>setPayoutForm({...payoutForm,defaultPayoutMethod:e.target.value})}><option value="till">Till / Buy Goods</option><option value="paybill">PayBill</option></select><small>This determines the method used for new customer checkouts. Both destinations remain saved.</small></label><p className="seller-muted">Saving payout details only configures the destination. It does not initiate a payout or transfer.</p><button className="seller-primary-btn" disabled={saving}>{saving?'Saving…':'Save payout settings'}</button></form></>}
    {tab==='api'&&<><section className="seller-table-panel" style={{marginBottom:20,padding:20}}><div className="seller-page-heading"><div><h2>Email delivery · Resend</h2><p>Connect your own Resend account so order and delivery emails are sent using your shop's verified sender address.</p></div><span className={emailStatus.configured?'seller-status-pill status-active':'seller-status-pill status-pending'}>{emailStatus.configured?'Connected':'Not connected'}</span></div><form className="seller-editor" onSubmit={async e=>{e.preventDefault();setSaving(true);setError('');setNotice('');try{const r=await fetch('/api/merchant?action=email-credentials',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(emailConfig)}),d=await readApiResponse(r);if(!r.ok)throw Error(d.error||'Could not save Resend settings');setEmailStatus({configured:true,fromEmail:d.fromEmail,replyToEmail:d.replyToEmail,notificationEmail:d.notificationEmail||emailConfig.notificationEmail});setEmailConfig((v:any)=>({...v,apiKey:''}));setNotice('Your Resend API settings have been encrypted and saved. Send a test email to verify the sender.')}catch(err:any){setError(err.message)}finally{setSaving(false)}}}><label>Sender name<input value={emailConfig.fromName} onChange={e=>setEmailConfig({...emailConfig,fromName:e.target.value})} placeholder={shop?.name||'Your shop name'} maxLength={100}/><small>Displayed as the sender name in customer inboxes.</small></label><label>Sender email address<input type="email" required value={emailConfig.fromEmail} onChange={e=>setEmailConfig({...emailConfig,fromEmail:e.target.value})} placeholder="orders@yourdomain.co.ke"/><small>Must belong to a domain or address verified in your Resend account.</small></label><label>Reply-to email address<input type="email" required value={emailConfig.replyToEmail} onChange={e=>setEmailConfig({...emailConfig,replyToEmail:e.target.value})} placeholder="support@yourdomain.co.ke"/><small>Customer replies will be directed here.</small></label><label>Order notification email<input type="email" required value={emailConfig.notificationEmail||''} onChange={e=>setEmailConfig({...emailConfig,notificationEmail:e.target.value})} placeholder={profile.email||'orders@yourdomain.co.ke'}/><small>New order alerts for the seller will be sent to this inbox. This is separate from the sender and reply-to addresses.</small></label><label>Resend API key<input type="password" autoComplete="new-password" value={emailConfig.apiKey} onChange={e=>setEmailConfig({...emailConfig,apiKey:e.target.value})} placeholder={emailStatus.configured?'Saved securely — enter a new key only to replace it':'re_…'} required={!emailStatus.configured}/><small>Generate a sending API key in Resend. It is encrypted on the server and never shown again. Leave blank to keep the saved key.</small></label><button className="seller-primary-btn" disabled={saving}>{saving?'Saving…':'Save email settings'}</button></form><div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) auto',gap:12,alignItems:'end',marginTop:18}}><label>Send test email to<input type="email" value={emailTestTo} onChange={e=>setEmailTestTo(e.target.value)} placeholder={profile.email||'you@example.com'}/></label><button type="button" className="seller-secondary-btn" disabled={!emailStatus.configured||emailTestSending||!emailTestTo.trim()} onClick={async()=>{setEmailTestSending(true);setError('');setNotice('');try{const r=await fetch('/api/merchant?action=email-test',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({to:emailTestTo.trim()})}),d=await readApiResponse(r);if(!r.ok)throw Error(d.error||'Test email failed');setNotice(d.message||'Test email accepted by Resend.')}catch(err:any){setError(err.message)}finally{setEmailTestSending(false)}}}>{emailTestSending?'Sending…':'Send test email'}</button></div><p className="seller-muted">Before sending, add the DNS records Resend gives you and wait until the sender domain is marked verified. DASMARKET platform billing and security emails continue using the platform's own sender.</p></section><div className="seller-page-heading"><div><h2>Payment credentials</h2><p>Configure the payment account used for this shop.</p></div></div><form className="seller-editor" onSubmit={async e=>{e.preventDefault();setSaving(true);try{const r=await fetch('/api/merchant?action=api-credentials',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(credentialForm)}),d=await readApiResponse(r);if(!r.ok)throw Error(d.error||'Credential save failed');setCredentialForm((v:any)=>({...v,consumerKey:'',consumerSecret:'',passkey:''}));const statusResponse=await fetch('/api/merchant?action=api-credentials',{credentials:'same-origin',cache:'no-store'});const statusData=await readApiResponse(statusResponse);if(statusResponse.ok)setCredentialStatus(statusData.credentialsByType||{});setNotice('Credentials for this transaction type encrypted and saved. The other type remains unchanged.')}catch(err:any){setError(err.message)}finally{setSaving(false)}}}><label>Daraja transaction type<select value={credentialForm.accountType} onChange={e=>{const type=e.target.value,method=type==='CustomerPayBillOnline'?'paybill':'till';setCredentialForm((v:any)=>({...v,accountType:type,shortcode:credentialStatus[method]?.shortcode||'',environment:credentialStatus[method]?.environment||'production',consumerKey:'',consumerSecret:'',passkey:''}))}}><option value="CustomerBuyGoodsOnline">CustomerBuyGoodsOnline — Till / Buy Goods</option><option value="CustomerPayBillOnline">CustomerPayBillOnline — PayBill</option></select><small>{credentialStatus[credentialForm.accountType==='CustomerPayBillOnline'?'paybill':'till']?.configured?'Credentials saved for this transaction type.':'No credentials saved for this transaction type yet.'}</small></label><label>Environment<select value={credentialForm.environment} onChange={e=>setCredentialForm({...credentialForm,environment:e.target.value})}><option value="production">Production</option><option value="sandbox">Sandbox</option></select></label><label>Shortcode<input required value={credentialForm.shortcode} onChange={e=>setCredentialForm({...credentialForm,shortcode:e.target.value})}/></label><label>Consumer key<input autoComplete="off" value={credentialForm.consumerKey} onChange={e=>setCredentialForm({...credentialForm,consumerKey:e.target.value})}/></label><label>Consumer secret<input type="password" autoComplete="new-password" value={credentialForm.consumerSecret} onChange={e=>setCredentialForm({...credentialForm,consumerSecret:e.target.value})}/></label><label>Passkey<input type="password" autoComplete="new-password" value={credentialForm.passkey} onChange={e=>setCredentialForm({...credentialForm,passkey:e.target.value})}/></label><p className="seller-muted">Secrets are encrypted at rest. Leave secret fields blank to retain the previously saved values. Credentials are not displayed again.</p><button className="seller-primary-btn" disabled={saving}>Save encrypted credentials</button></form></>}
    {tab==='tickets'&&<><div className="seller-page-heading"><div><h2>Support tickets</h2><p>Contact the DASNET support team or open a ticket.</p></div></div><form className="seller-editor" onSubmit={async e=>{e.preventDefault();setSaving(true);try{const r=await fetch('/api/merchant?action=ticket',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(ticketForm)}),d=await readApiResponse(r);if(!r.ok)throw Error(d.error||'Ticket creation failed');setTickets([d.ticket,...tickets]);setTicketForm({subject:'',category:'general',message:''});setNotice('Support ticket created: '+d.ticket.ticket_number)}catch(err:any){setError(err.message)}finally{setSaving(false)}}}><label>Subject<input required minLength={4} value={ticketForm.subject} onChange={e=>setTicketForm({...ticketForm,subject:e.target.value})}/></label><label>Category<select value={ticketForm.category} onChange={e=>setTicketForm({...ticketForm,category:e.target.value})}><option value="general">General</option><option value="payments">Payments</option><option value="orders">Orders</option><option value="products">Products</option><option value="account">Account</option></select></label><label className="wide">Message<textarea required minLength={10} rows={4} value={ticketForm.message} onChange={e=>setTicketForm({...ticketForm,message:e.target.value})}/></label><button className="seller-primary-btn" disabled={saving}>Submit ticket</button></form><div className="seller-table-panel">{tickets.map((t:any)=><div className="seller-notice-row expanded" key={t.id}><div><strong>{t.ticket_number} · {t.subject}</strong><small>{t.category} · {t.status}</small></div><time>{new Date(t.created_at).toLocaleString('en-KE')}</time></div>)}{!tickets.length&&<p className="seller-empty">No tickets yet.</p>}</div><p>Call <a href="tel:+254758884861">+254 758 884 861</a> or email <a href="mailto:support@dasnet.co.ke">support@dasnet.co.ke</a>.</p></>}
    {tab==='account'&&<><div className="seller-page-heading"><div><h2>My account</h2><p>Your personal details, profile and sign-in security.</p></div></div><section className="seller-account-hero"><div className="seller-account-avatar">{profile.avatarUrl?<img src={profile.avatarUrl} alt="Profile"/>:<span>{(profile.displayName||user?.displayName||'S').slice(0,1).toUpperCase()}</span>}</div><div className="seller-account-identity"><span className="seller-account-eyebrow">SELLER PROFILE</span><h3>{profile.displayName||user?.displayName||'Seller'}</h3><p>{profile.email||'No email address added'} · {profile.phone||user?.phone||'Phone not available'}</p><span className="seller-account-status"><i/> Active seller account</span></div></section><div className="seller-account-grid"><section className="seller-account-card"><div className="seller-account-card-head"><div><span>01</span><div><h3>Personal information</h3><p>Update the details shown on your account.</p></div></div></div><form className="seller-account-form" onSubmit={async e=>{e.preventDefault();setSaving(true);setError('');try{const r=await fetch('/api/merchant?action=profile',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(profile)}),d=await readApiResponse(r);if(!r.ok)throw Error(d.error||'Profile update failed');setUser((current:any)=>({...current,displayName:profile.displayName}));setNotice('Profile updated successfully.')}catch(err:any){setError(err.message)}finally{setSaving(false)}}}><label>Full name<input required maxLength={100} name="seller-personal-display-name" autoComplete="off" autoCorrect="off" spellCheck={false} value={profile.displayName??user?.displayName??''} onChange={e=>setProfile((current:any)=>({...current,displayName:e.target.value}))}/></label><label>Email address<input type="email" value={profile.email||''} onChange={e=>setProfile({...profile,email:e.target.value})}/></label><label>Verified phone number<input readOnly value={profile.phone||user?.phone||''}/><small>For security, contact support to change your verified phone.</small></label><label className="seller-account-upload">Profile photo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>700000){setError('Choose an image under 700 KB.');return;}const rd=new FileReader();rd.onload=()=>setProfile({...profile,avatarUrl:String(rd.result)});rd.readAsDataURL(file)}}/><small>PNG, JPEG or WebP · Maximum 700 KB</small></label><button className="seller-primary-btn" disabled={saving}>{saving?'Saving…':'Save profile changes'}</button></form></section><section className="seller-account-card seller-security-card"><div className="seller-account-card-head"><div><span>02</span><div><h3>Sign-in security</h3><p>Keep your seller workspace protected.</p></div></div></div><form className="seller-account-form" onSubmit={async e=>{e.preventDefault();const form=e.currentTarget;const data=new FormData(form);setSaving(true);setError('');try{const r=await fetch('/api/auth?action=change-password',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({currentPassword:data.get('currentPassword'),newPassword:data.get('newPassword'),confirmPassword:data.get('confirmPassword')})}),d=await readApiResponse(r);if(!r.ok)throw Error(d.error||'Password change failed');form.reset();setNotice('Password changed successfully.')}catch(err:any){setError(err.message)}finally{setSaving(false)}}}><label>Current password<input type="password" name="currentPassword" required autoComplete="current-password"/></label><label>New password<input type="password" name="newPassword" required minLength={10} autoComplete="new-password"/><small>Use at least 10 characters with letters and numbers.</small></label><label>Confirm new password<input type="password" name="confirmPassword" required minLength={10} autoComplete="new-password"/></label><button className="seller-primary-btn" disabled={saving}>{saving?'Updating…':'Update password'}</button></form><a className="seller-recovery-link" href="/reset-password">Forgot your current password? Use secure account recovery <ArrowRight size={14}/></a></section></div><section className="seller-account-support"><HelpCircle size={18}/><div><strong>Need to update your verified phone?</strong><span>Contact DASNET support at <a href="mailto:support@dasnet.co.ke">support@dasnet.co.ke</a> or <a href="tel:+254758884861">+254 758 884 861</a>.</span></div></section></>}
    {selectedDetail&&selectedDetail.type!=='order'&&<div className={isSellerDetailRoute?'seller-detail-overlay seller-detail-route':'seller-detail-overlay'} onClick={()=>isSellerDetailRoute?closeSellerDetail():setSelectedDetail(null)}><section className="seller-detail-card" onClick={e=>e.stopPropagation()}><button className="seller-secondary-btn" onClick={closeSellerDetail}>Back</button><h2>{selectedDetail.type==='order'?'Order details':selectedDetail.type==='product'?'Product details':'Transaction details'}</h2><p className="seller-detail-subtitle">{selectedDetail.type==='order'?'Order and payment information is stored in your merchant workspace.':selectedDetail.type==='product'?'Product and service information is stored in your merchant workspace.':'Payment transaction information and verification details.'}</p>{selectedDetail.type==='order'?<div className="seller-order-document"><header className="seller-order-document-head"><div><span className="seller-order-kicker">ORDER RECORD</span><h3>{selectedDetail.data.order_number}</h3><p>Placed {new Date(selectedDetail.data.created_at).toLocaleString('en-KE')}</p></div><span className={'seller-order-status status-'+String(selectedDetail.data.status||'pending').toLowerCase()}>{String(selectedDetail.data.status||'pending').replace(/_/g,' ')}</span></header><div className="seller-order-info-grid"><section><span>Customer</span><strong>{selectedDetail.data.customer_name||'—'}</strong></section><section><span>Phone number</span><strong>{selectedDetail.data.customer_phone||'—'}</strong><a href={'tel:'+String(selectedDetail.data.customer_phone||'').replace(/[^+0-9]/g,'')}>Call customer</a></section></div><section className="seller-order-payment"><div><span>Order total</span><strong>{money(selectedDetail.data.total)}</strong></div><div><span>Payment status</span><strong className={'payment-'+String(selectedDetail.data.payment_status||'unknown').toLowerCase()}>{String(selectedDetail.data.payment_status||'No payment attempt').replace(/_/g,' ')}</strong></div><div><span>M-PESA receipt</span><strong>{selectedDetail.data.provider_receipt||'Not available'}</strong></div></section><section className="seller-order-prompt"><div className="seller-order-section-title"><div><h3>Request M-PESA payment</h3><p>Send an STK Push for this order's full total using the store's default payout method.</p></div><span className="seller-order-prompt-method">{payoutForm.defaultPayoutMethod==='paybill'?'PayBill':'Till / Buy Goods'}</span></div><label>Customer phone number<input type="tel" value={paymentPromptPhone||selectedDetail.data.customer_phone||''} onChange={e=>setPaymentPromptPhone(e.target.value)} placeholder="07… or +254…"/></label><div className="seller-order-prompt-footer"><div><small>Amount requested</small><strong>{money(selectedDetail.data.total)}</strong></div><button className="button primary" disabled={paymentPrompting||['succeeded','pending','initiated'].includes(String(selectedDetail.data.payment_status||''))} onClick={()=>promptOrderPayment(selectedDetail.data)}>{paymentPrompting?'Sending prompt…':selectedDetail.data.payment_status==='succeeded'?'Payment received':['pending','initiated'].includes(String(selectedDetail.data.payment_status||''))?'Payment awaiting result':'Send STK prompt'}</button></div>{paymentPromptMessage&&<p className="seller-order-prompt-message" role="status">{paymentPromptMessage}</p>}</section><section className="seller-order-items"><div className="seller-order-section-title"><h3>Items ordered</h3><span>{(selectedDetail.data.items||[]).length} line(s)</span></div><div className="seller-order-table"><div className="seller-order-table-head"><span>Product</span><span>Qty</span><span>Unit price</span><span>Line total</span></div>{(selectedDetail.data.items||[]).map((item:any,i:number)=><div className="seller-order-table-row" key={i}><strong>{item.name}</strong><span>{item.quantity}</span><span>{money(Number(item.unitPrice||0)/100)}</span><b>{money(Number(item.lineTotal||0)/100)}</b></div>)}</div><div className="seller-order-total"><span>Total payable</span><strong>{money(selectedDetail.data.total)}</strong></div></section><section className="seller-order-status-editor"><div><h3>Update fulfilment</h3><p>Order fulfilment is separate from payment confirmation.</p></div><div className="seller-order-status-actions"><select aria-label="Fulfilment status" value={selectedDetail.data.status} onChange={e=>updateOrder(selectedDetail.data.id,e.target.value)}><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="processing">Processing</option><option value="fulfilled">Fulfilled</option><option value="cancelled">Cancelled</option></select></div></section><p className="seller-order-security-note">Payment status is verified from the payment record. Updating fulfilment will never mark an M-PESA payment as successful.</p><section className="seller-order-chat"><div className="seller-order-section-title"><div><h3>Customer conversation</h3><p>Messages linked to this order.</p></div><span className="seller-order-prompt-method">In-app chat</span></div><div className="seller-chat-messages">{orderChatMessages.map((m:any)=><div key={m.id} className={'seller-chat-message '+(m.sender_type==='merchant'?'mine':'theirs')}><span>{m.sender_type==='merchant'?'Your store':'Customer'}</span><p>{m.message}</p><small>{new Date(m.created_at).toLocaleString('en-KE')}</small></div>)}</div>{orderChatError&&<p className="seller-order-prompt-message">{orderChatError}</p>}<form className="seller-chat-compose" onSubmit={sendMerchantMessage}><input value={orderChatDraft} onChange={e=>setOrderChatDraft(e.target.value)} maxLength={2000} placeholder="Reply to your customer…"/><button className="button primary" disabled={orderChatSending||!orderChatDraft.trim()}>{orderChatSending?'Sending…':'Send message'}</button></form></section></div>:selectedDetail.type==='product'?<div className="seller-product-detail"><div className="seller-product-detail-head"><div className="seller-product-image">{(selectedDetail.data.images||[])[0]?<img src={selectedDetail.data.images[0]} alt={selectedDetail.data.name}/>:shop?.logoUrl?<img src={shop.logoUrl} alt="Shop logo"/>:<Package size={34}/>}</div><div className="seller-product-title"><span>PRODUCT / SERVICE</span><h3>{selectedDetail.data.name}</h3><div className="seller-product-tags"><em className={selectedDetail.data.active?'active':'inactive'}>{selectedDetail.data.active?'Published':'Inactive'}</em><span>SKU: {selectedDetail.data.sku||'—'}</span><span>{selectedDetail.data.type==='physical'?'Goods':selectedDetail.data.type==='data_bundle'?'Data bundle':'Digital service'}</span><span>{selectedDetail.data.category||'Uncategorised'}</span></div></div><div className="seller-product-actions"><button className="seller-secondary-btn" onClick={()=>{openProductEditor(selectedDetail.data)}}>Edit product</button><button className="seller-primary-btn" onClick={()=>setStatus(selectedDetail.data.id,!selectedDetail.data.active)}>{selectedDetail.data.active?'Disable':'Enable'}</button></div></div><div className="seller-product-metrics"><article><span>Selling price</span><strong>{money(selectedDetail.data.price)}</strong><small>Customer price per unit</small></article><article><span>Stock on hand</span><strong>{selectedDetail.data.stockQuantity===null?'Not tracked':selectedDetail.data.stockQuantity}</strong><small>Reorder level: {selectedDetail.data.metadata?.reorderLevel??'—'}</small></article><article><span>Purchase cost</span><strong>{selectedDetail.data.metadata?.purchaseCost!==null&&selectedDetail.data.metadata?.purchaseCost!==undefined?money(selectedDetail.data.metadata.purchaseCost):'Not recorded'}</strong><small>Recorded unit cost</small></article></div><div className="seller-product-sections"><section><header><span>01</span><h3>Product information</h3></header><dl><div><dt>Item type</dt><dd>{selectedDetail.data.type==='physical'?'Goods':selectedDetail.data.type==='data_bundle'?'Data bundle':'Digital service'}</dd></div><div><dt>Category</dt><dd>{selectedDetail.data.category||'—'}</dd></div><div><dt>SKU</dt><dd>{selectedDetail.data.sku||'—'}</dd></div><div><dt>Unit of measure</dt><dd>{selectedDetail.data.metadata?.unitOfMeasure||'—'}</dd></div><div><dt>Product status</dt><dd>{selectedDetail.data.active?'Published':'Inactive'}</dd></div><div className="wide"><dt>Tags</dt><dd>{selectedDetail.data.metadata?.tags||'—'}</dd></div><div className="wide"><dt>Description</dt><dd>{selectedDetail.data.description||'No description recorded'}</dd></div><div className="wide"><dt>Additional images</dt><dd className="seller-product-gallery">{(selectedDetail.data.images||[]).length?(selectedDetail.data.images||[]).map((src:string,i:number)=><img key={i} src={src} alt={selectedDetail.data.name+' '+(i+1)}/>):'No additional images'}</dd></div></dl></section><section><header><span>02</span><h3>Pricing & tax</h3></header><dl><div><dt>Selling price</dt><dd>{money(selectedDetail.data.price)}</dd></div><div><dt>Currency</dt><dd>{selectedDetail.data.currency||'KES'}</dd></div><div><dt>Purchase cost</dt><dd>{selectedDetail.data.metadata?.purchaseCost!==null&&selectedDetail.data.metadata?.purchaseCost!==undefined?money(selectedDetail.data.metadata.purchaseCost):'Not recorded'}</dd></div><div><dt>Tax rate</dt><dd>{selectedDetail.data.metadata?.taxRate!==null&&selectedDetail.data.metadata?.taxRate!==undefined?selectedDetail.data.metadata.taxRate+'%':'Not configured'}</dd></div></dl></section><section className="wide"><header><span>03</span><h3>Inventory & accounts</h3></header><dl><div><dt>Stock on hand</dt><dd>{selectedDetail.data.stockQuantity===null?'Not tracked':selectedDetail.data.stockQuantity}</dd></div><div><dt>Reorder level</dt><dd>{selectedDetail.data.metadata?.reorderLevel??'—'}</dd></div><div><dt>Preferred vendor</dt><dd>{selectedDetail.data.metadata?.preferredVendor||'—'}</dd></div><div><dt>Sales account</dt><dd>{selectedDetail.data.metadata?.salesAccount||'—'}</dd></div><div><dt>Purchase account</dt><dd>{selectedDetail.data.metadata?.purchaseAccount||'—'}</dd></div><div><dt>Inventory account</dt><dd>{selectedDetail.data.metadata?.inventoryAccount||'—'}</dd></div></dl></section></div></div>:<div className="seller-detail-fields"><p><strong>Order</strong><span>{selectedDetail.data.order_number||'—'}</span></p><p><strong>Phone</strong><span>{selectedDetail.data.phone||'—'}</span></p><p><strong>Amount</strong><span>{money(selectedDetail.data.amount)}</span></p><p><strong>Status</strong><span>{selectedDetail.data.status}</span></p><p><strong>M-PESA receipt</strong><span>{selectedDetail.data.provider_receipt||'Pending'}</span></p><p><strong>Checkout reference</strong><span>{selectedDetail.data.provider_checkout_id||'—'}</span></p><p><strong>Created</strong><span>{new Date(selectedDetail.data.created_at).toLocaleString('en-KE')}</span></p><p><strong>Verified at</strong><span>{selectedDetail.data.verified_at?new Date(selectedDetail.data.verified_at).toLocaleString('en-KE'):'Not verified'}</span></p></div>}</section></div>}
    {tab==='payments'&&<><div className="seller-page-heading"><div><h2>Payments</h2><p>Monitor customer collections and payment readiness.</p></div></div><div className="seller-feature-grid"><article><WalletCards/><strong>M-PESA collections</strong><span>M-PESA STK prompts are available from order details. Payment status is confirmed through the Daraja callback and verified transaction record.</span><em>Order-linked</em></article><article><ShieldCheck/><strong>Payment security</strong><span>Live collections must verify Daraja callbacks, amount, phone and checkout reference before an order is marked paid.</span><em>Required before launch</em></article></div></>}
    {tab==='payouts'&&<><div className="seller-page-heading"><div><h2>Payout settings</h2><p>Settlement preferences and withdrawal history.</p></div></div><div className="seller-feature-grid"><article><Wallet/><strong>Merchant collection destination</strong>{(payoutForm.tillPartyB||payoutForm.paybillPartyB)?<><span>{payoutForm.tillPartyB?'Till / Buy Goods: '+payoutForm.tillPartyB:''}{payoutForm.tillPartyB&&payoutForm.paybillPartyB?' · ':''}{payoutForm.paybillPartyB?'PayBill: '+payoutForm.paybillPartyB:''}</span><span>Default for new checkouts: {payoutForm.defaultPayoutMethod==='paybill'?'PayBill':'Till / Buy Goods'}</span><em className="seller-configured-label">Destination saved</em></>:<><span>No merchant collection destination has been saved yet.</span><em>Setup required</em></>}</article><article><Activity/><strong>Payout history</strong><span>There is no payout ledger or automated transfer workflow connected yet. Customer collection settings do not enable seller withdrawals.</span><em>Not enabled</em></article></div></>}
    {tab==='api'&&<><div className="seller-page-heading"><div><h2>API credentials</h2><p>Secure integrations for your shop.</p></div></div><div className="seller-feature-grid"><article><ShieldCheck/><strong>Payment processing</strong><span>Payment processing is configured securely for your shop.</span><em>Managed</em></article><article><Activity/><strong>Integrations</strong><span>Additional integration options will appear here when available.</span><em>Coming later</em></article></div></>}
    {tab==='reports'&&shop?.slug&&<Deferred><DisputesPanel slug={shop.slug} viewerRole="seller" initialReportId={sellerInitialReportId==='new'?'':sellerInitialReportId} onRouteChange={setSellerInitialReportId} orders={orders.map(o=>({id:o.id,label:o.order_number}))}/></Deferred>}
    {tab==='notifications'&&<><div className="seller-page-heading"><div><h2>Notifications</h2><p>Recent order activity, stock alerts and report verdicts from DASNET support.</p></div><button className="seller-icon-btn" title="Refresh notifications" onClick={()=>load().catch(e=>setError(e.message))}><RefreshCw size={17}/></button></div>{shop?.slug&&<Deferred><DisputesPanel slug={shop.slug} viewerRole="seller" embedded compactNotifications onOpenReport={(id)=>{setSellerInitialReportId(id);navigateSellerTab('reports')}} orders={orders.map(o=>({id:o.id,label:o.order_number}))}/></Deferred>}<div className="seller-table-panel">{notifications.map((n,i)=><button type="button" className="seller-notice-row expanded seller-notice-button" key={n.title+i} onClick={()=>{if(n.kind==='order'){setTab('orders');openOrder(n.data)}else{openSellerDetail('product',n.data)}}}><span className={n.kind==='stock'?'stock':'order'}>{n.kind==='stock'?<CircleAlert size={16}/>:<ShoppingBag size={16}/>}</span><span className="seller-notice-copy"><strong>{n.title}</strong><small>{n.detail}</small></span><time>{n.time?new Date(n.time).toLocaleString('en-KE'):'Just now'}</time><ArrowRight className="seller-notice-arrow" size={15}/></button>)}{notifications.length===0&&<p className="seller-empty">You're all caught up.</p>}</div></>}
    {(tab==='policies'||tab==='coupons')&&<Deferred><SellerShopControls section={tab} shopName={shop?.name||"Your shop"} shopWhatsappNumber={shop?.contactPhone||shop?.whatsappNumber||""} shopContactEmail={shop?.contactEmail||""} onNotice={setNotice}/></Deferred>}
    {tab==='subscriptions'&&<SellerSubscriptionsPanel data={subscriptionData} phone={user?.phone} checkoutPlanId={subscriptionCheckoutPlanId} onCheckout={openSubscriptionCheckout} onBack={closeSubscriptionCheckout} onRefresh={()=>fetch('/api/merchant?action=subscription',{credentials:'same-origin',cache:'no-store'}).then(readApiResponse).then(d=>setSubscriptionData(d)).catch(e=>setError(e.message))}/>}{tab==='domains'&&<><div className="seller-page-heading"><div><h2>Custom domain</h2><p>Connect a domain you own to your storefront.</p></div></div><Deferred><SellerDomains/></Deferred></>}
    {tab==='settings'&&<><div className="seller-page-heading"><div><h2>Shop settings</h2><p>Update your public shop identity and description.</p></div></div><form className="seller-editor seller-settings-form" onSubmit={saveSettings}><label>Shop name<input required maxLength={100} value={shop?.name||''} onChange={e=>setShop(s=>s?{...s,name:e.target.value}:s)}/></label><label>Shop description<textarea maxLength={1000} rows={4} value={shop?.description||''} onChange={e=>setShop(s=>s?{...s,description:e.target.value}:s)}/></label><label>WhatsApp number<input type="tel" inputMode="tel" autoComplete="tel" placeholder="0712 345 678 or +254712345678" value={shop?.whatsappNumber||''} onChange={e=>setShop(s=>s?{...s,whatsappNumber:e.target.value}:s)}/><small>Customers will use this number to contact your shop from the floating WhatsApp button. Use a Kenyan mobile number.</small></label><div className="seller-theme-picker"><div className="seller-theme-picker-heading"><strong>Store theme colour</strong><small>Choose an accent colour for buttons, links and highlights. Your storefront layout and template stay the same.</small></div><div className="seller-colour-options" role="group" aria-label="Store theme colour">{storeAccentColors.map(color=><button type="button" key={color.value} title={color.name} aria-label={color.name} aria-pressed={(shop?.theme||'#e47a13')===color.value} className={'seller-colour-option '+((shop?.theme||'#e47a13')===color.value?'selected':'')} style={{'--swatch':color.value} as any} onClick={()=>setShop(s=>s?{...s,theme:color.value}:s)}><span/><small>{color.name}</small></button>)}</div><label className="seller-custom-colour">Custom colour<input type="color" value={/^#[0-9a-f]{6}$/i.test(shop?.theme||'')?shop!.theme!:'#e47a13'} onChange={e=>setShop(s=>s?{...s,theme:e.target.value}:s)}/><code>{shop?.theme||'#e47a13'}</code></label></div><label>Store logo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>700000){setError('Choose a logo under 700 KB.');return;}const rd=new FileReader();rd.onload=()=>setShop(s=>s?{...s,logoUrl:String(rd.result)}:s);rd.readAsDataURL(file)}}/><small>PNG, JPEG or WebP · max 700 KB</small>{shop?.logoUrl&&<img className="seller-shop-logo-preview" src={shop.logoUrl} alt="Store logo preview"/>}</label><label>Shop slug<input readOnly value={shop?.slug||''}/><small>Your unique shop address. Contact support if you need to change the slug.</small></label><label>Public store link<div className="seller-copy-field"><input readOnly value={shop?'https://'+shop.slug+'.dasmarket.co.ke':''}/><button type="button" onClick={copyStore}>Copy</button></div></label><button className="seller-primary-btn" disabled={saving}>{saving?'Saving…':'Save settings'}</button></form></>}
    </>}</>}
   </div>
  </section>
  <nav className="seller-mobile-bottom" aria-label="Seller shortcuts">{[{id:'overview',label:'Home',icon:LayoutDashboard},{id:'orders',label:'Orders',icon:ShoppingBag},{id:'products',label:'Products',icon:Package},{id:'reports',label:'Reports',icon:MessageCircle},{id:'account',label:'Account',icon:Store}].map(x=><button type="button" key={x.id} className={tab===x.id?'active':''} onClick={()=>navigateSellerTab(x.id)}><x.icon size={18}/><span>{x.label}</span></button>)}</nav>
 {shop?.whatsappNumber&&<a className="seller-whatsapp-float" href={`https://wa.me/${shop.whatsappNumber.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" aria-label={`Chat with ${shop.name} on WhatsApp`}><MessageCircle size={23}/></a>}
 </main>;
}
function PlatformAdmin(){
 const [data,setData]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(''),[tab,setTab]=useState<'overview'|'daraja'>('overview'),[daraja,setDaraja]=useState<any>({consumerKey:'',consumerSecret:'',passkey:'',shortcode:'',partyB:'',accountType:'CustomerPayBillOnline',environment:'production'}),[darajaStatus,setDarajaStatus]=useState<any>(null),[savingDaraja,setSavingDaraja]=useState(false),[notice,setNotice]=useState('');
 async function load(){const r=await fetch('/api/platform-admin',{credentials:'same-origin'}),d=await readApiResponse(r);if(!r.ok)throw Error(d.error||'Admin access unavailable');setData(d);setDarajaStatus(d.daraja||null)}
 useEffect(()=>{load().catch(e=>setError(e.message))},[]);
 async function change(id:string,status:string){setBusy(id);setError('');try{const r=await fetch('/api/platform-admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tenantId:id,status})}),d=await readApiResponse(r);if(!r.ok)throw Error(d.error||'Update failed');await load()}catch(e:any){setError(e.message)}finally{setBusy('')}}
 async function saveDaraja(e:any){e.preventDefault();setSavingDaraja(true);setError('');setNotice('');try{const r=await fetch('/api/platform-admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save_daraja',...daraja})}),d=await readApiResponse(r);if(!r.ok)throw Error(d.error||'Could not save Daraja settings');setDaraja({consumerKey:'',consumerSecret:'',passkey:'',shortcode:'',partyB:'',accountType:daraja.accountType,environment:daraja.environment});setNotice('Central Daraja settings saved securely. Secret values are not displayed again.');await load()}catch(e:any){setError(e.message)}finally{setSavingDaraja(false)}}
 return <main className="account-page"><nav className="nav shell"><Brand/><a className="nav-quiet" href="/dashboard">Seller dashboard</a></nav><section className="account-card" style={{width:'min(1080px,calc(100% - 28px))',margin:'34px auto'}}><div className="eyebrow">DASNET PLATFORM ADMIN</div><h1>Platform administration</h1><div className="dashboard-actions"><button className={tab==='overview'?'button primary':'button secondary'} onClick={()=>setTab('overview')}>Overview</button><button className={tab==='daraja'?'button primary':'button secondary'} onClick={()=>setTab('daraja')}>Central Daraja settings</button></div>{error&&<div className="auth-message error">{error}</div>}{notice&&<div className="auth-message success">{notice}</div>}{tab==='daraja'?<><h2>Central M-PESA Daraja credentials</h2><p>Configure the platform collection account here. Credentials are encrypted before storage and never returned to the browser. Do not enter these values in chat.</p><div className="seller-feature-card"><strong>{darajaStatus?.configured?'Credentials saved':'Setup required'}</strong><span>{darajaStatus?.shortcode?('Shortcode: '+darajaStatus.shortcode+' · '+darajaStatus.environment):'No central Daraja account configured.'}</span><small>Secret fields are write-only. Leave a field blank to keep its saved value.</small></div><form className="auth-form" onSubmit={saveDaraja}><label>Consumer Key<input autoComplete="off" value={daraja.consumerKey} onChange={e=>setDaraja({...daraja,consumerKey:e.target.value})}/></label><label>Consumer Secret<input type="password" autoComplete="new-password" value={daraja.consumerSecret} onChange={e=>setDaraja({...daraja,consumerSecret:e.target.value})}/></label><label>Passkey<input type="password" autoComplete="new-password" value={daraja.passkey} onChange={e=>setDaraja({...daraja,passkey:e.target.value})}/></label><label>Shortcode<input value={daraja.shortcode} onChange={e=>setDaraja({...daraja,shortcode:e.target.value})}/></label><label>Party B<input value={daraja.partyB} onChange={e=>setDaraja({...daraja,partyB:e.target.value})}/></label><label>Account type<select value={daraja.accountType} onChange={e=>setDaraja({...daraja,accountType:e.target.value})}><option value="CustomerPayBillOnline">CustomerPayBillOnline</option><option value="CustomerBuyGoodsOnline">CustomerBuyGoodsOnline</option></select></label><label>Environment<select value={daraja.environment} onChange={e=>setDaraja({...daraja,environment:e.target.value})}><option value="sandbox">Sandbox</option><option value="production">Production</option></select></label><button className="button primary" disabled={savingDaraja}>{savingDaraja?'Saving securely…':'Save central Daraja settings'}</button></form><p className="catalogue-note">Saving credentials does not by itself activate customer charges. STK Push and callback verification must be implemented and tested separately.</p></>:!data?<p>Loading admin data…</p>:<><div className="metric-grid">{Object.entries(data.summary).map(([k,v])=><div className="metric" key={k}><span>{k.replaceAll('_',' ')}</span><strong>{String(v)}</strong></div>)}</div><h2>Seller accounts</h2>{data.tenants.map((t:any)=><div className="setup-panel" key={t.id} style={{flexWrap:'wrap'}}><div className="setup-copy" style={{flex:1}}><strong>{t.name} · /{t.slug}</strong><span>{t.owner_name||'Owner'} · {t.owner_phone||'No phone'} · {t.products} products · {t.orders} orders · {t.status}</span></div>{t.status==='suspended'?<button className="button primary" disabled={busy===t.id} onClick={()=>change(t.id,'active')}>Reactivate</button>:<button className="button secondary" disabled={busy===t.id} onClick={()=>change(t.id,'suspended')}>Suspend</button>}</div>)}</>}</section></main>;
}
export default function App() {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
  const hostname = window.location.hostname.toLowerCase();
  useEffect(() => {
    const privateRoute = hostname.startsWith("adm.") || ["login", "signup", "reset-password", "dashboard", "platform-admin"].includes(path) || path.startsWith("dashboard/") || path.startsWith("platform-admin/");
    if (privateRoute) {
      document.title = path === "signup" ? "Create your seller account | DASMARKET" : path === "login" ? "Sign in | DASMARKET" : "Account | DASMARKET";
      let robots = document.head.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
      if (!robots) { robots = document.createElement("meta"); robots.name = "robots"; document.head.appendChild(robots); }
      robots.content = "noindex,follow";
      document.head.querySelector('link[rel="canonical"]')?.remove();
    }
  }, [path]);
  const tenantSubdomain = hostname.endsWith('.dasmarket.co.ke') && !['www','app','mambu'].includes(hostname.split('.')[0]) ? hostname.split('.')[0] : '';
  const isPlatformHost=hostname==='dasmarket.co.ke'||hostname==='www.dasmarket.co.ke'||hostname==='app.dasmarket.co.ke'||hostname==='mambu.dasmarket.co.ke'||hostname.endsWith('.vercel.app')||hostname.endsWith('.run.app')||hostname.endsWith('.googleusercontent.com')||hostname.endsWith('.aistudio.google.com')||hostname==='localhost'||hostname==='127.0.0.1';
  const isCustomDomain=!isPlatformHost&&!tenantSubdomain;
  const isAdminCustomHost=hostname.startsWith('adm.')&&isCustomDomain;
  // Warm the storefront UI chunks while the shop data request is in flight.
  useEffect(()=>{if(tenantSubdomain){import('./StorefrontFlow').catch(()=>{});import('./BuyerAuthPage').catch(()=>{});}},[tenantSubdomain]);
  useEffect(()=>{if(hostname==='mambu.dasmarket.co.ke'||hostname.startsWith('adm.')||path==='dashboard'||path.startsWith('dashboard/')||path==='platform-admin')import('./mambu-admin.css').catch(()=>{});},[hostname,path]);
  let viewContent: any = null;
  if (hostname === 'mambu.dasmarket.co.ke') {
    if (path === 'login') viewContent = <Deferred><AuthPage initial="login" /></Deferred>;
    else if (path === 'reset-password') viewContent = <Deferred><AuthPage initial="reset" /></Deferred>;
    else viewContent = <Deferred><PlatformAdminDashboard /></Deferred>;
  } else if (isAdminCustomHost) {
    // The seller app's root is an authentication entry point, never the public
    // DASMARKET marketing page. Successful login continues to /dashboard.
    if (!path || path === 'login') viewContent = <Deferred><AuthPage initial="login" /></Deferred>;
    else if (path === 'reset-password') viewContent = <Deferred><AuthPage initial="reset" /></Deferred>;
    else viewContent = <SellerDashboard initialOrderNumber={path.startsWith('dashboard/')&&!path.startsWith('dashboard/subscriptions/')&&!path.startsWith('dashboard/reports/')?decodeURIComponent(path.slice('dashboard/'.length)):''} initialSubscriptionCheckoutPlanId={path.startsWith('dashboard/subscriptions/checkout/')?decodeURIComponent(path.slice('dashboard/subscriptions/checkout/'.length)):''} />;
  } else if (tenantSubdomain) {
    viewContent = <MerchantStore slug={tenantSubdomain} initialBuyerPage={path||'store'} />;
  } else if (isCustomDomain) {
    viewContent = <MerchantStore slug="" initialBuyerPage={path||'store'} />;
  } else if (isPlatformHost && isPlatformSeoPath(path)) {
    viewContent = <PlatformSeoPage slug={path} />;
  } else if (!path) {
    viewContent = <LandingPage />;
  } else if (path === 'signup') {
    viewContent = <Deferred><AuthPage initial="signup" /></Deferred>;
  } else if (path === 'login') {
    viewContent = <Deferred><AuthPage initial="login" /></Deferred>;
  } else if (path === 'reset-password') {
    viewContent = <Deferred><AuthPage initial="reset" /></Deferred>;
  } else if (path === 'dashboard' || path.startsWith('dashboard/')) {
    const dashboardSubpath=path.slice('dashboard/'.length); const isReportRoute=dashboardSubpath==='reports'||dashboardSubpath.startsWith('reports/'); const isSubscriptionRoute=dashboardSubpath.startsWith('subscriptions/');
    viewContent = <SellerDashboard initialOrderNumber={path.startsWith('dashboard/')&&!isReportRoute&&!isSubscriptionRoute?decodeURIComponent(dashboardSubpath):''} initialSubscriptionCheckoutPlanId={dashboardSubpath.startsWith('subscriptions/checkout/')?decodeURIComponent(dashboardSubpath.slice('subscriptions/checkout/'.length)):''} />;
  } else if (path === 'platform-admin' || path.startsWith('platform-admin/')) {
    viewContent = <PlatformAdmin />;
  } else {
    const storePathParts=path.split('/');
    viewContent = <MerchantStore slug={storePathParts[0]} initialBuyerPage={storePathParts.slice(1).join('/')||'store'} />;
  }
  return <>{viewContent}<OfflineIndicator /></>;
}