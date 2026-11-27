import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ArrowUpDown, Baby, Bell, Briefcase, Building2, Car, Check, ChevronDown, ChevronRight, Download, Dumbbell, Flag, Gamepad2, Heart, HelpCircle, Home, Laptop, LogOut, MapPin, Menu, MessageCircle, Package, PawPrint, Plus, Refrigerator, Search, ShieldCheck, Shirt, ShoppingBag, ShoppingCart, SlidersHorizontal, Smartphone, Sofa, Sparkles, Sprout, Star, Store, TicketPercent, Tv, UserCheck, UserRound, Wrench, X } from 'lucide-react';
import { storefrontCategories } from './storefrontCatalog';
import { marketplaceFaqs } from './marketplaceFaqs';
import { StorefrontProductDetail, fallbackProductImage, type LiveProduct } from './StorefrontProductDetail';
import { StorefrontHeroCarousel } from './StorefrontHeroCarousel';
import { StorefrontQuickView } from './StorefrontQuickView';
import './storefront-redesign.css';


const StorefrontFlow = lazy(()=>import('./StorefrontFlow').then(m=>({default:m.StorefrontFlow})));
const BuyerAuthPage = lazy(()=>import('./BuyerAuthPage').then(m=>({default:m.BuyerAuthPage})));
const PlatformAdminDashboard = lazy(()=>import('./PlatformAdminDashboard').then(m=>({default:m.PlatformAdminDashboard})));
const SellerDashboard = lazy(()=>import('./SellerDashboard').then(m=>({default:m.SellerDashboard})));
const AuthPage = lazy(()=>import('./AuthPage').then(m=>({default:m.AuthPage})));
const ReplitLandingPage = lazy(()=>import('./ReplitLandingPage'));
const PlatformSeoPage = lazy(()=>import('./PlatformSeoPage'));
const PLATFORM_SEO_PATHS = new Set(['create-online-store','ecommerce-platform','sell-online-with-mpesa','custom-domain-online-store','online-store-management']);
function isPlatformSeoPath(path: string){return PLATFORM_SEO_PATHS.has(path.replace(/^\/+|\/+$/g,''));}
function Deferred({children}:{children:any}) {
 return <Suspense fallback={<div className="dasnet-route-loading" role="status">Loading…</div>}>{children}</Suspense>;
}



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

function LandingPage() { return <Deferred><ReplitLandingPage/></Deferred>; }
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
function isHostScopedDomain(){const host=window.location.hostname.toLowerCase();const tenantSubdomain=host.endsWith('.dasmarket.co.ke')&&!['www','app','mambu'].includes(host.split('.')[0]);const isPlatformHost=host==='dasmarket.co.ke'||host==='www.dasmarket.co.ke'||host==='app.dasmarket.co.ke'||host==='mambu.dasmarket.co.ke'||host.endsWith('.vercel.app')||host.endsWith('.run.app')||host.endsWith('.googleusercontent.com')||host.endsWith('.aistudio.google.com')||host==='localhost'||host==='127.0.0.1';return Boolean(tenantSubdomain||(!isPlatformHost&&!tenantSubdomain));}
function getCartScopeKey(slug:string){return slug.trim()||('host:'+window.location.hostname.toLowerCase());}
function sanitizeCartMap(saved:any):Record<string,number>{if(!saved||typeof saved!=='object'||Array.isArray(saved))return {};return Object.fromEntries(Object.entries(saved).filter(([id,q])=>typeof id==='string'&&id.trim().length>0&&Number.isInteger(q)&&Number(q)>0).map(([id,q])=>[id,Math.min(99,Number(q))]));}
function readBuyerSessionHint(scopeKey:string){try{const raw=sessionStorage.getItem('dasnet-buyer-session-'+scopeKey);if(!raw)return null;const parsed=JSON.parse(raw);return parsed&&typeof parsed==='object'&&parsed.phone?parsed:null;}catch{return null;}}
function readCachedStorefront(slug:string){if(!slug)return null;try{const raw=localStorage.getItem('dasnet-storefront-cache-'+slug);if(!raw)return null;const value=JSON.parse(raw);if(!value||!Array.isArray(value.products)||!value.shop)return null;/* A legacy partial cache without totalProducts must never make a large catalogue look complete. */if(value.products.length<35&&value.totalProducts===undefined)return null;return {shop:value.shop,products:value.products.slice(0,60) as LiveProduct[],totalProducts:Number(value.totalProducts??value.products.length)}}catch{return null}}
function MerchantStore({ slug: initialSlug, initialBuyerPage = 'store' }: { slug: string; initialBuyerPage?: string }) {
 const [slug,setSlug]=useState(initialSlug);
 const slugRef=useRef<string>(initialSlug);
 slugRef.current=slug;
 const initialCartScope=getCartScopeKey(initialSlug);
 const cartScopeRef=useRef<string>(initialCartScope);
 const cachedStorefront=useMemo(()=>readCachedStorefront(slug),[slug]);
 const [reconnectTick,setReconnectTick]=useState(0);
 useEffect(()=>{const bump=()=>setReconnectTick(t=>t+1);window.addEventListener('online',bump);return()=>window.removeEventListener('online',bump)},[]);
 useEffect(()=>{
  try{
   for(let i=localStorage.length-1;i>=0;i--){
    const key=localStorage.key(i);
    if(key&&(key.startsWith('dasnet-cart-')||key.startsWith('dasnet-cart-items-')||key.startsWith('dasnet-delivery-pref-')))localStorage.removeItem(key);
   }
  }catch{}
 },[]);
 const previousPaymentStatus=useRef<string|null>(null);const [chatToken,setChatToken]=useState(''),[chatOrderId,setChatOrderId]=useState(''),[chatOrderNumber,setChatOrderNumber]=useState(''),[chatOrder,setChatOrder]=useState<any>(null),[chatMessages,setChatMessages]=useState<any[]>([]),[chatAttachments,setChatAttachments]=useState<any[]>([]),[chatDraft,setChatDraft]=useState(''),[chatSending,setChatSending]=useState(false),[paymentCelebration,setPaymentCelebration]=useState(false),[chatError,setChatError]=useState('');
 const [filter,setFilter]=useState('All products'),[search,setSearch]=useState(''),[sortOrder,setSortOrder]=useState('recommended'),[priceBand,setPriceBand]=useState<'all'|'under-1000'|'1000-5000'|'5000-15000'|'15000-plus'>('all'),[inStockOnly,setInStockOnly]=useState(false),[collectionSheet,setCollectionSheet]=useState<null|'sort'|'filter'>(null),[products,setProducts]=useState<LiveProduct[]>(()=>cachedStorefront?.products||[]);
 const [catalogueOffset,setCatalogueOffset]=useState(cachedStorefront?.products.length||0),[catalogueTotal,setCatalogueTotal]=useState(cachedStorefront?.totalProducts||0),[catalogueHasMore,setCatalogueHasMore]=useState(true),[loadingMore,setLoadingMore]=useState(false);const catalogueSentinelRef=useRef<HTMLDivElement|null>(null);const [shop,setShop]=useState<{name:string;description:string;logoUrl?:string;whatsappNumber?:string;contactPhone?:string;contactEmail?:string;termsAndConditions?:string;privacyPolicy?:string;returnPolicy?:string;deliveryPolicy?:string;deliveryHomeFee?:number;deliveryPickupFee?:number;cashOnDeliveryEnabled?:boolean;cashOnPickupEnabled?:boolean;faqs?:Array<{question:string;answer:string}>;theme?:string}|null>(()=>cachedStorefront?.shop||null),[loading,setLoading]=useState(!cachedStorefront),[error,setError]=useState(''),[notFound,setNotFound]=useState(false),[cart,setCart]=useState<Record<string,number>>({}),[cartHydrating,setCartHydrating]=useState(false),[selectedProduct,setSelectedProduct]=useState<LiveProduct|null>(null),[quickViewProduct,setQuickViewProduct]=useState<LiveProduct|null>(null),[mobileSidebarOpen,setMobileSidebarOpen]=useState(false),[desktopSidebarOpen,setDesktopSidebarOpen]=useState(false),[buyerMobileNavOpen,setBuyerMobileNavOpen]=useState(false);
 const cartRef=useRef<Record<string,number>>({});
 const guestPendingCartRef=useRef<Record<string,number>>({});
 const cartHydratedForUserRef=useRef<string>('');
 const cartSyncQueueRef=useRef<Promise<void>>(Promise.resolve());
 const cartSyncPendingCountRef=useRef<number>(0);
 useEffect(()=>{if(!notFound)return;const previousTitle=document.title;const robots=document.head.querySelector('meta[name="robots"]') as HTMLMetaElement|null;const previousRobots=robots?.content||'';const meta=robots||document.createElement('meta');meta.name='robots';meta.content='noindex,nofollow';if(!robots)document.head.appendChild(meta);const canonical=document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement|null;const previousCanonical=canonical?.href||'';canonical?.remove();document.title='Shop not found | DASMARKET';return()=>{document.title=previousTitle;if(previousRobots){meta.content=previousRobots}else{meta.remove()}if(previousCanonical){const restored=document.createElement('link');restored.rel='canonical';restored.href=previousCanonical;document.head.appendChild(restored)}}},[notFound]);
  useEffect(()=>{
    if(!mobileSidebarOpen&&!desktopSidebarOpen&&!buyerMobileNavOpen)return;
    const closeOnEscape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setMobileSidebarOpen(false);setDesktopSidebarOpen(false);setBuyerMobileNavOpen(false);}};
    document.addEventListener('keydown',closeOnEscape);
    return()=>document.removeEventListener('keydown',closeOnEscape);
  },[mobileSidebarOpen,desktopSidebarOpen,buyerMobileNavOpen]);
 const [buyerPage,setBuyerPage]=useState(initialBuyerPage||'store'),[expandedCategory,setExpandedCategory]=useState('');
 const emailOrderNumber=useRef(new URLSearchParams(window.location.search).get('order')||'');
  const [wishlistIds,setWishlistIds]=useState<string[]>(()=>{try{const saved=JSON.parse(localStorage.getItem('dasnet-wishlist-'+initialCartScope)||'[]');return Array.isArray(saved)?saved.filter((id:any)=>typeof id==='string'):[]}catch{return[]}});
  useEffect(()=>{if(cartScopeRef.current!==getCartScopeKey(slug))return;try{localStorage.setItem('dasnet-wishlist-'+cartScopeRef.current,JSON.stringify(wishlistIds))}catch{}},[wishlistIds,slug]);
  function toggleWishlist(id:string){
  setWishlistIds(current=>{
    const enabled=!current.includes(id);
    if(buyerCustomer?.phone&&slug)fetch('/api/buyer?action=buyer-wishlist',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug,productId:id,enabled})}).then(async response=>{if(!response.ok){const data=await response.json().catch(()=>({}));throw Error(data.error||'Wishlist could not be synced.');}}).catch(error=>console.warn('Buyer wishlist sync failed:',error));
    return enabled?[...current,id]:current.filter(value=>value!==id);
  });
}
 const [buyerCustomer,setBuyerCustomer]=useState<any>(()=>readBuyerSessionHint(initialCartScope)),[buyerAuthChecked,setBuyerAuthChecked]=useState(false),[buyerReturnPage,setBuyerReturnPage]=useState<string>(()=>{try{return sessionStorage.getItem('dasnet-buyer-return-'+initialCartScope)||'account';}catch{return 'account';}});
 const buyerCustomerRef=useRef<any>(buyerCustomer);
 buyerCustomerRef.current=buyerCustomer;
 const buyerAuthCheckedRef=useRef<boolean>(buyerAuthChecked);
 buyerAuthCheckedRef.current=buyerAuthChecked;
 const updateBuyerReturnPage=(next:string)=>{setBuyerReturnPage(next);try{sessionStorage.setItem('dasnet-buyer-return-'+getCartScopeKey(slug),next);}catch{}};
 async function hydrateServerCart(targetSlug:string,guestItemsToMerge?:Record<string,number>,forUserPhone?:string){
  if(!targetSlug)return;
  const cleanMerge=sanitizeCartMap(guestItemsToMerge);
  const hasMerge=Object.keys(cleanMerge).length>0;
  setCartHydrating(true);
  try{
   const response=await fetch(
    '/api/buyer?action=buyer-cart'+(hasMerge?'':'&slug='+encodeURIComponent(targetSlug)),
    hasMerge
     ?{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug:targetSlug,mode:'merge',cart:cleanMerge})}
     :{credentials:'same-origin',cache:'no-store'}
   );
   if(response.status===401||response.status===403)return;
   const data=await readApiResponse(response);
   if(!response.ok)throw Error(data.error||'Could not load saved cart.');
   const serverCart=sanitizeCartMap(data.cart);
   if(hasMerge||cartSyncPendingCountRef.current===0){
    cartRef.current=serverCart;
    setCart(serverCart);
   }
   const serverProducts:LiveProduct[]=Array.isArray(data.items)
    ?data.items.map((entry:any)=>entry?.product).filter((p:any):p is LiveProduct=>Boolean(p&&p.id))
    :[];
   if(serverProducts.length){
    setProducts((current:LiveProduct[])=>{
     const byId=new Map(current.map((p:LiveProduct)=>[p.id,p]));
     for(const sp of serverProducts)byId.set(sp.id,sp);
     return Array.from(byId.values());
    });
   }
   const userKey=forUserPhone||buyerCustomerRef.current?.phone;
   if(userKey)cartHydratedForUserRef.current=`${targetSlug}:${userKey}`;
  }catch(err){
   console.warn('Database cart sync unavailable:',err);
  }finally{
   setCartHydrating(false);
  }
 }
 function updateCart(nextOrUpdater:Record<string,number>|((prev:Record<string,number>)=>Record<string,number>)){
  const resolvedNext=sanitizeCartMap(typeof nextOrUpdater==='function'?nextOrUpdater(cartRef.current):nextOrUpdater);
  cartRef.current=resolvedNext;
  setCart(resolvedNext);
  const activeCustomer=buyerCustomerRef.current;
  const activeSlug=slugRef.current;
  if(activeCustomer?.phone&&activeSlug){
   guestPendingCartRef.current={};
   cartSyncPendingCountRef.current+=1;
   const snapshot={...resolvedNext};
   cartSyncQueueRef.current=cartSyncQueueRef.current
    .catch(()=>{})
    .then(async()=>{
     try{
      const isEmpty=Object.keys(snapshot).length===0;
      const response=await fetch('/api/buyer?action=buyer-cart',{
       method:'POST',
       credentials:'same-origin',
       headers:{'Content-Type':'application/json'},
       body:JSON.stringify(isEmpty?{slug:activeSlug,mode:'clear'}:{slug:activeSlug,mode:'sync',cart:snapshot}),
      });
      if(!response.ok){
       const d=await response.json().catch(()=>({}));
       throw Error(d.error||'Could not save cart.');
      }
     }catch(err){
      console.warn('Cart database sync failed:',err);
     }finally{
      cartSyncPendingCountRef.current=Math.max(0,cartSyncPendingCountRef.current-1);
     }
    });
  }else{
   guestPendingCartRef.current={...resolvedNext};
  }
 }
 function signOutBuyer(){
  const activeSlug=slugRef.current;
  fetch('/api/buyer-auth?action=logout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug:activeSlug}),credentials:'same-origin'})
   .finally(()=>{
    const scope=getCartScopeKey(activeSlug);
    try{
     sessionStorage.removeItem('dasnet-buyer-session-'+scope);
     sessionStorage.removeItem('dasnet-buyer-return-'+scope);
    }catch{}
    cartHydratedForUserRef.current='';
    guestPendingCartRef.current={};
    cartRef.current={};
    setCart({});
    buyerCustomerRef.current=null;
    setBuyerCustomer(null);
    navigateBuyerPage('store');
   });
 }
  useEffect(()=>{
    let live=true;
    if(!buyerCustomer?.phone||!buyerAuthChecked||!slug)return;
    fetch('/api/buyer?action=buyer-account-data&slug='+encodeURIComponent(slug),{credentials:'same-origin',cache:'no-store'})
      .then(async response=>{const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.error||'Could not load buyer account data.');return data;})
      .then(data=>{if(live&&Array.isArray(data.wishlist))setWishlistIds(data.wishlist.map((item:any)=>String(item.id)));})
      .catch(error=>console.warn('Buyer account sync unavailable:',error));
    return()=>{live=false;};
  },[slug,buyerCustomer?.phone,buyerAuthChecked]);
  useEffect(()=>{
   if(!buyerAuthChecked||!slug)return;
   if(!buyerCustomer?.phone){
    cartHydratedForUserRef.current='';
    return;
   }
   const key=`${slug}:${buyerCustomer.phone}`;
   if(cartHydratedForUserRef.current!==key){
    const pending=sanitizeCartMap(guestPendingCartRef.current);
    guestPendingCartRef.current={};
    void hydrateServerCart(slug,Object.keys(pending).length?pending:undefined,buyerCustomer.phone);
   }
  },[slug,buyerAuthChecked,buyerCustomer?.phone]);
  useEffect(()=>{
   if(!slug)return;
   const refreshFromServer=()=>{
    if(document.visibilityState==='hidden')return;
    if(!buyerAuthCheckedRef.current||!buyerCustomerRef.current?.phone)return;
    if(cartSyncPendingCountRef.current>0)return;
    void hydrateServerCart(slugRef.current);
   };
   window.addEventListener('focus',refreshFromServer);
   document.addEventListener('visibilitychange',refreshFromServer);
   return()=>{
    window.removeEventListener('focus',refreshFromServer);
    document.removeEventListener('visibilitychange',refreshFromServer);
   };
  },[slug]);

 const [buyerNotifications,setBuyerNotifications]=useState<any[]>([]),[buyerNotificationsOpen,setBuyerNotificationsOpen]=useState(false),[buyerInitialReportId,setBuyerInitialReportId]=useState('');
 const [recentlyViewed,setRecentlyViewed]=useState<string[]>(()=>{try{const saved=JSON.parse(localStorage.getItem('dasnet-recently-viewed-'+initialCartScope)||'[]');return Array.isArray(saved)?saved:[]}catch{return[]}});
 const isHostScoped=isHostScopedDomain();
 const storeBasePath=isHostScoped?'':`/${slug}`;
 const buyerPath=(page:string)=>page==='store'?(storeBasePath||'/'):`${storeBasePath}/${page}`||`/${page}`;
 function navigateBuyerPage(page:string,preserveFilters=false){setQuickViewProduct(null);if(page==='reports'||page==='report-shop')page='my-reports';if(['recently-viewed','followed-shops','notification-settings','public-profile','newsletter'].includes(page))page='account';if((['account','profile','orders','order-detail','order-tracking','inbox','wishlist','recently-viewed','address-book','address-book/edit','vouchers','reviews','notifications','my-reports','followed-shops','newsletter','notification-settings','public-profile','account-management','close-account'].includes(page)||page.startsWith('orders/')||page.startsWith('my-reports/'))&&!buyerCustomer){updateBuyerReturnPage(page);page='buyer-login'}if((page==='checkout/delivery'||page==='checkout/payment'||page==='checkout/review')&&!buyerCustomer){updateBuyerReturnPage(page);page='buyer-login'}if(page==='store'&&!preserveFilters){setFilter('All products');setSearch('');setPriceBand('all');setInStockOnly(false);setExpandedCategory('');setSelectedProduct(null)}setCollectionSheet(null);setBuyerPage(page);if(page!=='product-detail')setSelectedProduct(null);setMobileSidebarOpen(false);setDesktopSidebarOpen(false);setBuyerMobileNavOpen(false);setBuyerNotificationsOpen(false);const nextPath=buyerPath(page);if(window.location.pathname!==nextPath)window.history.pushState({buyerPage:page},'',nextPath);if((page==='cart'||page.startsWith('checkout/'))&&buyerCustomerRef.current?.phone&&buyerAuthCheckedRef.current&&slugRef.current&&cartSyncPendingCountRef.current===0){void hydrateServerCart(slugRef.current);}window.scrollTo({top:0,behavior:'instant' as ScrollBehavior})}
 function selectStoreCategory(category:string){setQuickViewProduct(null);const parent=storefrontCategories.find(c=>c.name===category||c.subcategories.includes(category));const filterValue=category.startsWith('All ')?(parent?.name||category):category;setFilter(filterValue);setSearch('');setSelectedProduct(null);setCatalogueOffset(0);setCatalogueHasMore(false);setLoadingMore(false);setBuyerPage('store');setMobileSidebarOpen(false);setDesktopSidebarOpen(false);const nextPath=buyerPath('store');if(window.location.pathname!==nextPath)window.history.replaceState({buyerPage:'store'},'',nextPath)}
 function openProduct(product:LiveProduct){setQuickViewProduct(null);setSelectedProduct(product);setBuyerPage('product-detail');setMobileSidebarOpen(false);const parent=storefrontCategories.find(c=>c.name===product.category||c.subcategories.includes(product.category));const route=(parent?categorySlug(parent.name):'products')+'/'+(parent&&product.category!==parent.name?categorySlug(product.category).replace(/-/g,''):'products')+'/'+encodeURIComponent(product.sku||product.id);window.history.pushState({productSku:product.sku||product.id},'',(storeBasePath||'')+'/'+route);window.scrollTo({top:0,left:0,behavior:'instant' as ScrollBehavior})}
 function closeProduct(){const route=categoryRoute(selectedProduct?.category||'');if(selectedProduct?.category)setFilter(selectedProduct.category);setBuyerPage('store');setSelectedProduct(null);window.history.pushState({},'',route?(storeBasePath+'/'+route):buyerPath('store'))}
 // Migrate temporary host-scoped storefront preferences when custom-domain storefront resolves its slug.
 useEffect(()=>{
  const nextScope=getCartScopeKey(slug);
  const prevScope=cartScopeRef.current;
  if(nextScope===prevScope)return;
  cartScopeRef.current=nextScope;
  const resolvedWish=(()=>{try{const s=JSON.parse(localStorage.getItem('dasnet-wishlist-'+nextScope)||'[]');return Array.isArray(s)?s.filter((id:any)=>typeof id==='string'):[];}catch{return[];}})();
  if(resolvedWish.length)setWishlistIds(current=>Array.from(new Set([...resolvedWish,...current])));
  const resolvedRecent=(()=>{try{const s=JSON.parse(localStorage.getItem('dasnet-recently-viewed-'+nextScope)||'[]');return Array.isArray(s)?s:[];}catch{return[];}})();
  if(resolvedRecent.length)setRecentlyViewed(current=>Array.from(new Set([...current,...resolvedRecent])).slice(0,12));
  try{const savedRet=sessionStorage.getItem('dasnet-buyer-return-'+nextScope);if(savedRet)setBuyerReturnPage(savedRet);}catch{}
  const cachedForResolved=readCachedStorefront(nextScope);
  setProducts(current=>{
   const known=new Set(current.map(p=>p.id));
   const cachedItems=(cachedForResolved?.products||[]).filter(p=>!known.has(p.id));
   return [...current,...cachedItems];
  });
  const resolvedHint=readBuyerSessionHint(nextScope);
  if(resolvedHint&&!buyerCustomerRef.current)setBuyerCustomer(resolvedHint);
  try{if(prevScope.startsWith('host:'))sessionStorage.removeItem('dasnet-buyer-session-'+prevScope);}catch{}
 },[slug]);
 // Restore cart products outside the first catalogue page if missing from active product list.
 useEffect(()=>{let live=true;const missing=Object.keys(cart).filter(id=>cart[id]>0&&!products.some((product:LiveProduct)=>product.id===id)).slice(0,50);if(!slug||!missing.length)return()=>{live=false};const params=new URLSearchParams({limit:String(missing.length),offset:'0',ids:missing.join(',')});fetch('/api/storefront?slug='+encodeURIComponent(slug)+'&'+params.toString()).then(async response=>{const data=await readApiResponse(response);if(!response.ok)throw Error(data.error||'Could not restore saved cart items');if(!live)return;const restored:LiveProduct[]=Array.isArray(data.products)?data.products:[];if(restored.length)setProducts((current:LiveProduct[])=>{const known=new Set(current.map((product:LiveProduct)=>product.id));return [...current,...restored.filter((product:LiveProduct)=>!known.has(product.id))]});}).catch(error=>console.warn('Saved cart restoration failed:',error));return()=>{live=false}},[cart,products,slug,reconnectTick]);
  useEffect(()=>{
    let live=true;
    // Custom-domain storefronts start with an empty slug until /api/storefront resolves
    // the domain mapping. Do not treat that temporary state as a signed-out session.
    if(!slug){
      const hint=readBuyerSessionHint(cartScopeRef.current);
      if(hint)setBuyerCustomer(hint);
      setBuyerAuthChecked(false);
      return()=>{live=false};
    }
    const scope=getCartScopeKey(slug);
    const cachedHint=readBuyerSessionHint(scope);
    if(cachedHint)setBuyerCustomer((current:any)=>current||cachedHint);
    setBuyerAuthChecked(false);
    fetch('/api/buyer-auth?action=session&slug='+encodeURIComponent(slug),{credentials:'same-origin',cache:'no-store'})
      .then(async r=>{
        if(r.status===401||r.status===403)return {confirmed:true,customer:null};
        if(!r.ok)throw new Error('HTTP_'+r.status);
        const d=await r.json();
        return {confirmed:true,customer:d.customer||null};
      })
      .then(res=>{
        if(!live)return;
        setBuyerCustomer(res.customer);
        try{
          if(res.customer)sessionStorage.setItem('dasnet-buyer-session-'+scope,JSON.stringify({id:res.customer.id,name:res.customer.name,phone:res.customer.phone,email:res.customer.email,address:res.customer.address,alternativePhone:res.customer.alternativePhone}));
          else sessionStorage.removeItem('dasnet-buyer-session-'+scope);
        }catch{}
        setBuyerAuthChecked(true);
      })
      .catch(()=>{
        // Network loss or transient 5xx must not sign out the buyer or kick them off checkout.
        if(!live)return;
        if(cachedHint){
          setBuyerCustomer((current:any)=>current||cachedHint);
          setBuyerAuthChecked(true);
        }else if(!buyerPage.startsWith('checkout/')){
          setBuyerCustomer(null);
          setBuyerAuthChecked(true);
        }
      });
    return()=>{live=false};
  },[slug,reconnectTick]);
 useEffect(()=>{if(!buyerAuthChecked||buyerCustomer)return;const protectedPage=['account','profile','orders','order-detail','order-tracking','inbox','wishlist','recently-viewed','address-book','vouchers','reviews','notifications','my-reports','report-shop','followed-shops','newsletter','notification-settings','public-profile','account-management','close-account','checkout/delivery','checkout/payment','checkout/review'];if(protectedPage.includes(buyerPage)||buyerPage.startsWith('my-reports/')||buyerPage.startsWith('address-book/')){updateBuyerReturnPage(buyerPage);setBuyerPage('buyer-login');const next=buyerPath('buyer-login');if(window.location.pathname!==next)window.history.replaceState({buyerPage:'buyer-login'},'',next)}},[buyerAuthChecked,buyerCustomer,buyerPage]);
 useEffect(()=>{let live=true;const syncBuyerPage=()=>{const parts=window.location.pathname.replace(/^\/+|\/+$/g,'').split('/').filter(Boolean);const hostIsScoped=isHostScopedDomain();const routeParts=hostIsScoped?parts:(parts[0]===slug?parts.slice(1):[]);if(routeParts.length>=3){const key=decodeURIComponent(routeParts[routeParts.length-1]);const found=products.find(p=>p.sku===key||p.id===key);if(found){setSelectedProduct(found);setBuyerPage('product-detail');return}if(!slug)return;fetch('/api/storefront?slug='+encodeURIComponent(slug)+'&limit=1&productKey='+encodeURIComponent(key),{cache:'no-store'}).then(async response=>{const data=await readApiResponse(response);if(!response.ok)throw Error(data.error||'Product unavailable');return data.products?.[0] as LiveProduct|undefined}).then((product:LiveProduct|undefined)=>{if(live&&product){setProducts(current=>current.some(item=>item.id===product.id)?current:[...current,product]);setSelectedProduct(product);setBuyerPage('product-detail')}}).catch(error=>console.warn('Direct product link could not be restored:',error));return}if(routeParts.length>=1){const parent=storefrontCategories.find(c=>categorySlug(c.name)===routeParts[0]);if(parent){setFilter('All products');setBuyerPage('store');setSelectedProduct(null);const homePath=buyerPath('store');if(window.location.pathname!==homePath)window.history.replaceState({buyerPage:'store'},'',homePath);return}}const routeKey=routeParts.map(part=>part.toLowerCase()).join('/');if(routeKey==='buyer-login'&&buyerCustomer?.phone){setBuyerPage('store');setSelectedProduct(null);const homePath=buyerPath('store');if(window.location.pathname!==homePath)window.history.replaceState({buyerPage:'store'},'',homePath);return}if(routeKey==='my-reports/reports/new'||routeKey==='my-reports/reports'){setBuyerInitialReportId('');setBuyerPage('my-reports');setSelectedProduct(null);return}const retiredBuyerRoutes:Record<string,string>={'recently-viewed':'account','followed-shops':'account','notification-settings':'account','public-profile':'account','newsletter':'account'};const canonicalRoute=retiredBuyerRoutes[routeKey]||routeKey;if(canonicalRoute!==routeKey)window.history.replaceState({buyerPage:canonicalRoute},'',buyerPath(canonicalRoute));if(!canonicalRoute)setFilter('All products');setBuyerPage(canonicalRoute==='orders/ongoing'||canonicalRoute==='orders/delivered'||canonicalRoute==='orders/cancelled'?canonicalRoute:canonicalRoute||'store');setSelectedProduct(null)};syncBuyerPage();window.addEventListener('popstate',syncBuyerPage);return()=>{live=false;window.removeEventListener('popstate',syncBuyerPage)}},[slug,buyerCustomer?.phone]); useEffect(()=>{if(!selectedProduct||cartScopeRef.current!==getCartScopeKey(slug))return;setRecentlyViewed(current=>{const next=[selectedProduct.id,...current.filter(id=>id!==selectedProduct.id)].slice(0,12);try{localStorage.setItem('dasnet-recently-viewed-'+cartScopeRef.current,JSON.stringify(next))}catch{}return next})},[selectedProduct?.id,slug]);
 // Check the floating WhatsApp shortcut after navigation and viewport changes.
 // Avoid a document-wide MutationObserver: scanning every link/button after every
 // React DOM mutation becomes expensive on stores with large catalogues.
 useEffect(()=>{
  let rafId=0;
  const checkOverlap=()=>{
   rafId=0;
   const floating=document.querySelector<HTMLElement>('.sf-whatsapp-float');
   if(!floating)return;
   const a=floating.getBoundingClientRect(),pad=5;
   const targets=document.querySelectorAll<HTMLElement>('.sf-mobile-cartbar,.sf-collection-floating-bar,.sf-checkout-footer-bar,.sf-footer a,.sf-footer button');
   const overlaps=Array.from(targets).some(el=>{
    if(el===floating||floating.contains(el)||el.getAttribute('aria-hidden')==='true')return false;
    const b=el.getBoundingClientRect();
    if(b.width<=0||b.height<=0||a.left>=b.right+pad||a.right<=b.left-pad||a.top>=b.bottom+pad||a.bottom<=b.top-pad)return false;
    const style=window.getComputedStyle(el);
    return style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)!==0;
   });
   floating.classList.toggle('is-obscured',overlaps);
  };
  const scheduleCheck=()=>{if(!rafId)rafId=window.requestAnimationFrame(checkOverlap);};
  scheduleCheck();
  window.addEventListener('resize',scheduleCheck,{passive:true});
  window.addEventListener('scroll',scheduleCheck,{passive:true});
  return()=>{if(rafId)window.cancelAnimationFrame(rafId);window.removeEventListener('resize',scheduleCheck);window.removeEventListener('scroll',scheduleCheck)};
 },[buyerPage,shop?.whatsappNumber]);
 // Customer conversations belong in the customer workspace, not on the public storefront.
 useEffect(()=>{if(!chatToken&&!chatOrderId)return;let live=true;const query=chatToken?'token='+encodeURIComponent(chatToken):'orderId='+encodeURIComponent(chatOrderId)+'&slug='+encodeURIComponent(slug);const refresh=()=>fetch('/api/buyer?action=customer-chat&'+query,{credentials:'same-origin',cache:'no-store'}).then(async r=>{const d=await readApiResponse(r);if(!r.ok)throw Error(d.error||'Could not load conversation');if(live){setChatMessages(d.messages||[]);setChatAttachments(d.attachments||[]);setChatOrder(d.order||null)}}).catch(e=>{if(live)setChatError(e.message)});refresh();const timer=window.setInterval(refresh,5000);return()=>{live=false;window.clearInterval(timer)}},[chatToken,chatOrderId,slug]);
 useEffect(()=>{const status=String(chatOrder?.paymentStatus||'');if(previousPaymentStatus.current&&previousPaymentStatus.current!=='succeeded'&&status==='succeeded'){setPaymentCelebration(true);const timer=window.setTimeout(()=>setPaymentCelebration(false),5200);previousPaymentStatus.current=status;return()=>window.clearTimeout(timer)}if(status)previousPaymentStatus.current=status},[chatOrder?.paymentStatus]);

 async function sendCustomerMessage(e:any){e.preventDefault();if(!chatDraft.trim()||chatSending)return;setChatSending(true);setChatError('');try{const r=await fetch('/api/buyer?action=customer-chat',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(chatToken?{token:chatToken,message:chatDraft}:{orderId:chatOrderId,slug,message:chatDraft})});const d=await readApiResponse(r);if(!r.ok)throw Error(d.error||'Message could not be sent');setChatMessages(d.messages||[]);setChatDraft('')}catch(e:any){setChatError(e.message)}finally{setChatSending(false)}}

 async function uploadCustomerAttachment(file?:File){if(!file||(!chatToken&&!chatOrderId))return;if(file.size>10485760){setChatError('Each attachment must be 10 MB or smaller.');return;}setChatError('');try{const sign=await fetch('/api/buyer?action=chat-attachment',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(chatToken?{token:chatToken,mode:'upload',fileName:file.name,contentType:file.type,size:file.size}:{orderId:chatOrderId,slug,mode:'upload',fileName:file.name,contentType:file.type,size:file.size})});const sd=await readApiResponse(sign);if(!sign.ok)throw Error(sd.error||'Could not prepare upload');await uploadToObjectStorage(sd.uploadUrl,file,'Chat attachment');const done=await fetch('/api/buyer?action=chat-attachment',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(chatToken?{token:chatToken,mode:'complete',attachmentId:sd.attachmentId}:{orderId:chatOrderId,slug,mode:'complete',attachmentId:sd.attachmentId})});const dd=await readApiResponse(done);if(!done.ok)throw Error(dd.error||'Could not confirm upload');setChatAttachments(a=>[...a,dd.attachment]);}catch(e:any){setChatError(e.message)}}
 async function downloadCustomerAttachment(id:string){try{const r=await fetch('/api/buyer?action=chat-attachment',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(chatToken?{token:chatToken,mode:'download',attachmentId:id}:{orderId:chatOrderId,slug,mode:'download',attachmentId:id})});const d=await readApiResponse(r);if(!r.ok)throw Error(d.error||'Download unavailable');window.open(d.url,'_blank','noopener,noreferrer')}catch(e:any){setChatError(e.message)}}
 useEffect(()=>{const w=window as any;let timer=0;let idle=0;const warm=()=>{void import('./StorefrontFlow');void import('./BuyerAuthPage');};if(typeof w.requestIdleCallback==='function'){idle=w.requestIdleCallback(warm,{timeout:2500});}else{timer=window.setTimeout(warm,1800);}return()=>{if(idle&&typeof w.cancelIdleCallback==='function')w.cancelIdleCallback(idle);if(timer)window.clearTimeout(timer);};},[]);
 useEffect(()=>{let live=true;const runFetch=()=>{setNotFound(false);if(!cachedStorefront&&!products.length)setLoading(true);const params=new URLSearchParams({limit:'24',offset:'0'});if(filter.trim()&&filter.trim().toLocaleLowerCase()!=='all products')params.set('category',categoryApiFilter(filter.trim()));if(search.trim())params.set('search',search.trim());const base=slug?'/api/storefront?slug='+encodeURIComponent(slug)+'&':'/api/storefront?';fetch(base+params.toString()).then(async r=>{const d=await readApiResponse(r);if(!r.ok){if(r.status===400||r.status===404){setNotFound(true);setCatalogueHasMore(false);setCatalogueTotal(0);setProducts([]);setShop(null)}throw Error(d.error||'Shop unavailable')}if(!live)return;const nextProducts:LiveProduct[]=Array.isArray(d.products)?d.products:[];const resolvedSlug=String(d.shop?.slug||slug||'').trim();setShop(d.shop);if(!slug&&resolvedSlug)setSlug(resolvedSlug);setProducts((current:LiveProduct[])=>{const incomingIds=new Set(nextProducts.map((p:LiveProduct)=>p.id));const preservedCartProducts=current.filter((p:LiveProduct)=>cartRef.current[p.id]>0&&!incomingIds.has(p.id));return [...nextProducts,...preservedCartProducts];});setCatalogueOffset(Number(d.nextOffset||nextProducts.length));setCatalogueTotal(Number(d.totalProducts??nextProducts.length));setCatalogueHasMore(Boolean(d.hasMore));const requestedProduct=new URLSearchParams(window.location.search).get('product');if(requestedProduct){const match=nextProducts.find((product:any)=>product.id===requestedProduct||product.sku===requestedProduct||product.slug===requestedProduct);if(match){setSelectedProduct(match);setBuyerPage('product-detail')}}setError('');if(resolvedSlug&&filter.trim().toLocaleLowerCase()==='all products'&&!search.trim()){try{localStorage.setItem('dasnet-storefront-cache-'+resolvedSlug,JSON.stringify({shop:d.shop,products:nextProducts.slice(0,24),totalProducts:Number(d.totalProducts??nextProducts.length),cachedAt:Date.now()}))}catch{}}}).catch(e=>{if(live)setError(e.message)}).finally(()=>{if(live)setLoading(false)})};if(!search.trim()){runFetch();return()=>{live=false};}const timer=window.setTimeout(runFetch,180);return()=>{live=false;window.clearTimeout(timer)}},[slug,filter,search,reconnectTick,cachedStorefront]);
  // Contact details refresh with the storefront request; avoid polling the full catalogue.
  useEffect(()=>{let live=true;const refresh=async()=>{if(!buyerCustomer||!slug){if(live)setBuyerNotifications([]);return}try{if(localStorage.getItem('dasnet-buyer-notifications-'+slug)==='false'){if(live)setBuyerNotifications([]);return}const r=await fetch('/api/buyer?action=buyer-notifications&slug='+encodeURIComponent(slug),{credentials:'same-origin',cache:'no-store'});if(!r.ok)return;const d=await r.json();if(live)setBuyerNotifications(Array.isArray(d.notifications)?d.notifications:[])}catch{}};refresh();const timer=window.setInterval(refresh,15000);return()=>{live=false;window.clearInterval(timer)}},[slug,buyerCustomer?.id]);
    async function loadMoreProducts(){if(loadingMore||!catalogueHasMore)return;setLoadingMore(true);try{const base=slug?'/api/storefront?slug='+encodeURIComponent(slug)+'&':'/api/storefront?';const params=new URLSearchParams({limit:'40',offset:String(catalogueOffset)});if(filter.trim()&&filter.trim().toLocaleLowerCase()!=='all products')params.set('category',categoryApiFilter(filter.trim()));if(search.trim())params.set('search',search.trim());const response=await fetch(base+params.toString());const data=await readApiResponse(response);if(!response.ok){const failure:any=new Error(data.error||'Could not load more products');failure.status=response.status;if(response.status===400||response.status===404)setCatalogueHasMore(false);throw failure;}const incoming=Array.isArray(data.products)?data.products:[];setProducts((current:LiveProduct[])=>{const known=new Set(current.map((p:LiveProduct)=>p.id));return [...current,...incoming.filter((p:LiveProduct)=>!known.has(p.id))]});setCatalogueOffset(Number(data.nextOffset||catalogueOffset+incoming.length));if(data.totalProducts!==undefined)setCatalogueTotal(Number(data.totalProducts));setCatalogueHasMore(Boolean(data.hasMore));}catch(error:any){if(error?.status===404||error?.status===400){setNotFound(true);setCatalogueHasMore(false);setProducts([]);setShop(null)}setError(error.message||'Could not load more products')}finally{setLoadingMore(false)}}
 useEffect(()=>{const node=catalogueSentinelRef.current;const isCollection=buyerPage.startsWith('collection/')&&buyerPage!=='collection/featured-products';if(!node||!catalogueHasMore||loadingMore||(buyerPage!=='store'&&!isCollection))return;const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting))void loadMoreProducts()},{rootMargin:'900px 0px'});observer.observe(node);return()=>observer.disconnect()},[catalogueHasMore,loadingMore,loading,catalogueOffset,buyerPage]);
 const normalizedFilter=filter.trim().toLocaleLowerCase();
 const normalizedSearch=search.trim().toLocaleLowerCase();
 const categoryMatches=(productCategoryValue:string,selectedValue:string,parentCategoryValue='')=>{const productCategory=String(productCategoryValue||'').trim().toLocaleLowerCase();const parentCategory=String(parentCategoryValue||'').trim().toLocaleLowerCase();const categoryParts=productCategory.split('>').map(part=>part.trim()).filter(Boolean);if(!selectedValue||selectedValue==='all products')return true;const parent=storefrontCategories.find(group=>group.name.toLocaleLowerCase()===selectedValue);if(parent){const allowed=[parent.name,...parent.subcategories.filter(child=>!child.startsWith('All '))].map(value=>value.toLocaleLowerCase());return allowed.includes(parentCategory)||allowed.includes(productCategory)||categoryParts.some(part=>allowed.includes(part));}return parentCategory===selectedValue||productCategory===selectedValue||categoryParts.includes(selectedValue);};
 const visible=useMemo(()=>products.filter(p=>{const haystack=[p.name,p.description,p.category,p.parentCategory,p.sku].filter(Boolean).join(' ').toLocaleLowerCase();return categoryMatches(p.category,normalizedFilter,p.parentCategory)&&haystack.includes(normalizedSearch)}),[products,normalizedFilter,normalizedSearch]);
 const sortedVisible=useMemo(()=>[...visible].sort((a,b)=>sortOrder==='price-low'?a.price-b.price:sortOrder==='price-high'?b.price-a.price:sortOrder==='name'?a.name.localeCompare(b.name):0),[visible,sortOrder]);
 const mixedProducts=sortedVisible;
 const collectionKey=buyerPage.startsWith('collection/')?buyerPage.slice('collection/'.length):'';
 const collectionTitle=collectionKey==='featured-products'?'Featured Products':collectionKey==='top-picks'?'Top Picks':'All Products';
 const collectionSorted=useMemo(()=>{
  const collectionBase=collectionKey==='featured-products'?(products.some(p=>p.spotlight)?products.filter(p=>p.spotlight):products.filter(p=>Boolean(p.images?.[0]||p.imageUrl)).slice(0,5)):collectionKey==='top-picks'?[...products].sort((a,b)=>(b.ratingAverage||0)-(a.ratingAverage||0)||(b.ratingCount||0)-(a.ratingCount||0)):products;
  const matchesPriceBand=(price:number)=>{if(priceBand==='under-1000')return price<1000;if(priceBand==='1000-5000')return price>=1000&&price<=5000;if(priceBand==='5000-15000')return price>5000&&price<=15000;if(priceBand==='15000-plus')return price>15000;return true;};
  const filtered=collectionBase.filter(p=>{const queryMatch=[p.name,p.description,p.category,p.parentCategory,p.sku].filter(Boolean).join(' ').toLocaleLowerCase().includes(normalizedSearch);const stockMatch=!inStockOnly||p.stockQuantity!==0;return categoryMatches(p.category,normalizedFilter,p.parentCategory)&&queryMatch&&stockMatch&&matchesPriceBand(Number(p.price||0));});
  return [...filtered].sort((a,b)=>sortOrder==='price-low'?a.price-b.price:sortOrder==='price-high'?b.price-a.price:sortOrder==='rating'?(b.ratingAverage||0)-(a.ratingAverage||0)||(b.ratingCount||0)-(a.ratingCount||0):sortOrder==='name'?a.name.localeCompare(b.name):0);
 },[products,collectionKey,normalizedSearch,inStockOnly,normalizedFilter,priceBand,sortOrder]);
 const storePreviewProducts=useMemo(()=>{const groups=new Map<string,typeof products>();for(const product of products){const key=String(product.category||'Other').trim()||'Other';if(!groups.has(key))groups.set(key,[]);groups.get(key)!.push(product)}const buckets=[...groups.values()];const mixed:typeof products=[];for(let index=0;buckets.some(bucket=>bucket.length>index);index++){for(const bucket of buckets){if(bucket[index])mixed.push(bucket[index])}}return mixed},[products]);
 const spotlightProducts=useMemo(()=>products.filter(p=>Boolean((p as any).spotlight)).slice(0,5),[products]);
 const heroSlides=useMemo(()=>{const homeHeroProducts=(spotlightProducts.length?spotlightProducts:products.filter(p=>Boolean(p.images?.[0]||p.imageUrl))).slice(0,5);return homeHeroProducts.length?homeHeroProducts:(products[0]?[products[0]]:[])},[spotlightProducts,products]);
 const {total,totalCartUnits}=useMemo(()=>{const entries=Object.entries(cart).filter(([,q])=>q>0);const priceById=new Map(products.map(p=>[p.id,p.price]));let sum=0,units=0;for(const [id,q] of entries){sum+=(priceById.get(id)||0)*q;units+=q;}return {total:sum,totalCartUnits:units};},[cart,products]);
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

 if(buyerPage==='buyer-login'||buyerPage==='buyer-signup') return <Deferred><BuyerAuthPage slug={slug} shopName={shop?.name||'This shop'} initial={buyerPage==='buyer-signup'?'signup':'login'} onBack={()=>navigateBuyerPage('store')} onPolicyNavigate={(page)=>navigateBuyerPage(page)} onAuthenticated={(customer)=>{buyerCustomerRef.current=customer;setBuyerCustomer(customer);buyerAuthCheckedRef.current=true;setBuyerAuthChecked(true);try{const scope=getCartScopeKey(slug);if(customer)sessionStorage.setItem('dasnet-buyer-session-'+scope,JSON.stringify({id:customer.id,name:customer.name,phone:customer.phone,email:customer.email,address:customer.address,alternativePhone:customer.alternativePhone}));}catch{}const guestPending=sanitizeCartMap(guestPendingCartRef.current);guestPendingCartRef.current={};if(slug&&customer?.phone)void hydrateServerCart(slug,Object.keys(guestPending).length?guestPending:undefined,customer.phone);const target=buyerReturnPage||'account';try{sessionStorage.removeItem('dasnet-buyer-return-'+getCartScopeKey(slug));}catch{}setBuyerPage(target);const next=buyerPath(target);if(window.location.pathname!==next)window.history.replaceState({buyerPage:target},'',next)}}/></Deferred>;

 const addSingleToCart=(productId:string,stockQuantity:number|null)=>{
  updateCart(c=>({...c,[productId]:Math.min(99,stockQuantity??99,(c[productId]||0)+1)}));
 };

 const renderProductCard=(p:LiveProduct,tag?:string,eager=false)=>{
  const outOfStock=p.stockQuantity===0||(p.stockQuantity!==null&&(cart[p.id]||0)>=p.stockQuantity);
  const inCart=Boolean(cart[p.id]);
  const saved=wishlistIds.includes(p.id);
  return (
   <article className="sf-card" key={p.id}>
    <button type="button" className={'sf-card-fav'+(saved?' active':'')} aria-label="Toggle wishlist" aria-pressed={saved} onClick={()=>toggleWishlist(p.id)}>
     <Heart size={16} fill={saved?'currentColor':'none'}/>
    </button>
    <button type="button" className="sf-card-media sf-card-thumb-btn" aria-label={`Quick view ${p.name}`} onClick={()=>setQuickViewProduct(p)}>
     <img src={p.images?.[0]||p.imageUrl||fallbackProductImage(p.name)} alt={p.name} loading={eager?'eager':'lazy'} decoding="async" fetchPriority={eager?'high':undefined} onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src=fallbackProductImage(p.name)}}/>
     {tag&&<span className="sf-card-tag">{tag}</span>}
     <span className="sf-thumb-qv" aria-hidden="true">Quick view</span>
    </button>
    <button type="button" className="sf-card-open sf-card-body-btn" onClick={()=>openProduct(p)}>
     <div className="sf-card-body">
      <span className="sf-card-cat">{p.category||'Shop'}</span>
      <span className="sf-card-title">{p.name}</span>
      {(p.ratingCount??0)>0&&<span className="sf-card-rating"><Star size={12} fill="currentColor"/> {Number(p.ratingAverage||0).toFixed(1)} ({p.ratingCount})</span>}
      <div className="sf-card-meta-row">
       <strong className="sf-card-price">KES {p.price.toLocaleString('en-KE')}</strong>
       <small className={'sf-card-stock'+(p.stockQuantity===0?' out':'')}>{p.stockQuantity===0?'Out of stock':p.stockQuantity===null?'Available':`${p.stockQuantity} left`}</small>
      </div>
     </div>
    </button>
    <div className="sf-card-foot">
     <button type="button" className={'sf-card-add'+(inCart?' in-cart':'')} disabled={outOfStock} onClick={()=>addSingleToCart(p.id,p.stockQuantity)}>
      {p.stockQuantity===0?'Out of stock':inCart?`In cart (${cart[p.id]})`:'Add to cart'}
     </button>
    </div>
   </article>
  );
 };

  const renderCollectionCard=(p:LiveProduct,eager=false)=>{
   const outOfStock=p.stockQuantity===0||(p.stockQuantity!==null&&(cart[p.id]||0)>=p.stockQuantity);
   const qtyInCart=cart[p.id]||0;
   const saved=wishlistIds.includes(p.id);
   const cardBadge=p.stockQuantity===0?'Out of stock':p.stockQuantity!==null&&p.stockQuantity<=5?`Only ${p.stockQuantity} left`:p.spotlight?'Featured':'';
   return (
    <article className="sf-collection-card" key={p.id}>
     <button type="button" className={'sf-card-fav sf-collection-fav'+(saved?' active':'')} aria-label="Toggle wishlist" aria-pressed={saved} onClick={()=>toggleWishlist(p.id)}>
      <Heart size={16} fill={saved?'currentColor':'none'}/>
     </button>
     <button type="button" className="sf-collection-card-media sf-card-thumb-btn" aria-label={`Quick view ${p.name}`} onClick={()=>setQuickViewProduct(p)}>
      <img src={p.images?.[0]||p.imageUrl||fallbackProductImage(p.name)} alt={p.name} loading={eager?'eager':'lazy'} decoding="async" fetchPriority={eager?'high':undefined} onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src=fallbackProductImage(p.name)}}/>
      {cardBadge&&<span className={'sf-collection-media-tag'+(p.stockQuantity===0?' is-out':'')}>{cardBadge}</span>}
      <span className="sf-thumb-qv" aria-hidden="true">Quick view</span>
     </button>
     <button type="button" className="sf-collection-card-open sf-card-body-btn" onClick={()=>openProduct(p)}>
      <div className="sf-collection-card-body">
       <span className="sf-collection-card-title">{p.name}</span>
       {(p.ratingCount??0)>0&&(
        <span className="sf-collection-card-rating">
         <Star size={12} fill="currentColor"/>
         <strong>{Number(p.ratingAverage||0).toFixed(1)}</strong>
         <span>({p.ratingCount})</span>
        </span>
       )}
       <strong className="sf-collection-card-price sf-num">KES {p.price.toLocaleString('en-KE')}</strong>
      </div>
     </button>
     <div className="sf-collection-card-foot">
      <div className="sf-collection-card-meta">
       <span className="sf-collection-card-store">{p.category||shop?.name||'Store'}</span>
       <small className={p.stockQuantity===0?'is-out':''}>
        {p.stockQuantity===0?'Out of stock':p.stockQuantity===null?'In stock':`${p.stockQuantity} available`}
       </small>
      </div>
      <button
       type="button"
       className={'sf-collection-add-btn'+(qtyInCart>0?' in-cart':'')}
       disabled={outOfStock}
       aria-label={outOfStock?`${p.name} is out of stock`:qtyInCart>0?`Add another ${p.name} (${qtyInCart} in cart)`:`Add ${p.name} to cart`}
       onClick={()=>addSingleToCart(p.id,p.stockQuantity)}
      >
       <Plus size={18} strokeWidth={2.4}/>
       {qtyInCart>0&&<span className="sf-collection-add-count sf-num">{qtyInCart}</span>}
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
      <a className="sf-brand" href={buyerPath('store')} aria-label={shop?.name||'Store home'} title={shop?.name||'Store'} onClick={e=>{e.preventDefault();navigateBuyerPage('store')}}>
       <strong className="sf-brand-name">{(()=>{const words=String(shop?.name||'').trim().split(/\s+/).filter(Boolean);if(!words.length)return 'STORE';return words[0].toLowerCase()==='the'&&words.length>1?words[1]:words[0];})()}</strong>
       <span className={'sf-brand-badge'+(shop?.logoUrl?' has-logo':'')} aria-hidden="true">
        {shop?.logoUrl?<img src={shop.logoUrl} alt=""/>:<Star size={12} fill="#ffffff" strokeWidth={2}/>}
       </span>
      </a>
     </div>
     {!compact&&(
      <form className={'sf-search-form'+(buyerPage.startsWith('collection/')?' is-pill-search':'')} onSubmit={e=>{e.preventDefault();if(document.activeElement instanceof HTMLElement)document.activeElement.blur();if(buyerPage==='store'){window.setTimeout(()=>document.getElementById('market-products-grid')?.scrollIntoView({behavior:'smooth',block:'start'}),60);}else if(!buyerPage.startsWith('collection/')){setFilter('All products');navigateBuyerPage('collection/all-products',true);}}}>
       <button type="submit" className="sf-search-submit" aria-label="Search products"><Search size={18}/></button>
       <input type="search" enterKeyHint="search" aria-label="Search products" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search products, categories and brands"/>
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
      <button type="button" className="sf-drawer-logout" onClick={signOutBuyer}>
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
   productsLoading={loading}
   storeError={error}
   onRetryConnection={()=>setReconnectTick(t=>t+1)}
   recentlyViewed={recentlyViewed}
   cart={cart}
   cartLoading={cartHydrating}
   onCartChange={updateCart}
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
   onSignOut={signOutBuyer}
   chatPanel={chatPanel}
   onOpenChat={(token,orderNumber,orderId)=>{setChatToken(token||'');setChatOrderId(orderId||'');setChatOrderNumber(orderNumber);setChatMessages([]);setChatAttachments([]);setChatOrder(null);setChatDraft('');setChatError('');}}
   onOrderCreated={(token,orderNumber)=>{setChatToken(token);setChatOrderId('');setChatOrderNumber(orderNumber);setChatError('');}}
  />
 );

 const homeCatalogueList=filter==='All products'&&!search.trim()&&sortOrder==='recommended'&&!buyerPage.startsWith('collection/')
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
       <button type="button" className="sf-account-logout" onClick={signOutBuyer}>
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
      {/* 1. Editorial Hero Showcase */}
      <StorefrontHeroCarousel
       slides={heroSlides}
       shopName={shop?.name}
       shopDescription={shop?.description}
       active={buyerPage==='store'}
       onOpenProduct={openProduct}
       onShopCollection={()=>selectStoreCategory('All products')}
      />

      {/* 2. Featured Spotlight Grid (if configured) */}
      {spotlightProducts.length>0&&(
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
         {spotlightProducts.slice(0,4).map((p:LiveProduct)=>renderProductCard(p,'Featured'))}
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
         <div className="sf-product-grid">{homeCatalogueList.map((p:LiveProduct,idx:number)=>renderProductCard(p,undefined,idx<4))}</div>
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
      <section className="sf-section sf-faq-compact" id="store-faq">
       <div className="sf-section-head">
        <h2>Frequently Asked Questions</h2>
        <button type="button" className="sf-link-action" onClick={()=>navigateBuyerPage('faqs')}>View all FAQs <ArrowRight size={15}/></button>
       </div>
       <div className="sf-faq-list">
        {marketplaceFaqs.slice(0,4).map(([question,answer])=>(
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
     <div className="sf-collection-page">
      <div className="sf-collection-breadcrumb-bar">
       <div className="sf-collection-container sf-collection-breadcrumb-inner">
        <nav className="sf-collection-breadcrumb" aria-label="Breadcrumb">
         <button type="button" onClick={()=>navigateBuyerPage('store')}>Home</button>
         <ChevronRight size={14} aria-hidden="true"/>
         <span aria-current="page">{collectionTitle}</span>
        </nav>
        <span className="sf-collection-count-desktop sf-num">
         {totalCollectionCount>collectionSorted.length?`${collectionSorted.length} of ${totalCollectionCount.toLocaleString('en-KE')} products`:`${collectionSorted.length.toLocaleString('en-KE')} ${collectionSorted.length===1?'product':'products'}`}
        </span>
       </div>
      </div>

      <div className="sf-collection-chips-bar">
       <div className="sf-collection-container sf-collection-chips">
        <button
         type="button"
         className={'sf-filter-chip'+(inStockOnly?' is-active':'')}
         aria-pressed={inStockOnly}
         onClick={()=>setInStockOnly(v=>!v)}
        >
         <Package size={14}/>
         <span>In Stock</span>
        </button>

        <div className={'sf-filter-chip-select'+(filter!=='All products'?' is-active':'')}>
         <select aria-label="Filter collection by category" value={filter} onChange={e=>setFilter(e.target.value)}>
          <option value="All products">Category</option>
          {storefrontCategories.map(category=>(
           <optgroup key={category.name} label={category.name}>
            <option value={category.name}>{category.name}</option>
            {category.subcategories.map(child=><option key={child} value={child}>{child}</option>)}
           </optgroup>
          ))}
         </select>
         <ChevronDown size={14} aria-hidden="true"/>
        </div>

        <div className={'sf-filter-chip-select'+(priceBand!=='all'?' is-active':'')}>
         <select aria-label="Filter collection by price" value={priceBand} onChange={e=>setPriceBand(e.target.value as any)}>
          <option value="all">Price</option>
          <option value="under-1000">Under KES 1,000</option>
          <option value="1000-5000">KES 1,000 – 5,000</option>
          <option value="5000-15000">KES 5,000 – 15,000</option>
          <option value="15000-plus">KES 15,000+</option>
         </select>
         <ChevronDown size={14} aria-hidden="true"/>
        </div>

        <div className={'sf-filter-chip-select sf-collection-desktop-sort'+(sortOrder!=='recommended'?' is-active':'')}>
         <select aria-label="Sort collection" value={sortOrder} onChange={e=>setSortOrder(e.target.value)}>
          <option value="recommended">Sort: Recommended</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
          <option value="rating">Top Rated</option>
          <option value="name">Name: A to Z</option>
         </select>
         <ChevronDown size={14} aria-hidden="true"/>
        </div>

        {(filter!=='All products'||priceBand!=='all'||inStockOnly||search.trim()!==''||sortOrder!=='recommended')&&(
         <button
          type="button"
          className="sf-filter-chip sf-filter-reset"
          onClick={()=>{setFilter('All products');setPriceBand('all');setInStockOnly(false);setSearch('');setSortOrder('recommended');}}
         >
          <X size={13}/>
          <span>Clear</span>
         </button>
        )}
       </div>
      </div>

      <div className="sf-collection-container sf-collection-body">
       {loading&&collectionSorted.length===0?(
        renderSkeletonGrid(8)
       ):collectionSorted.length===0?(
        <div className="sf-state-box">
         <h2>{collectionKey==='featured-products'?'No featured products yet':'No matching products'}</h2>
         <p>{collectionKey==='featured-products'?'This shop has not highlighted any products yet. Browse all products instead.':'Try clearing a filter or searching another keyword.'}</p>
         <button type="button" className="sf-btn sf-btn-primary" onClick={()=>{setSearch('');setFilter('All products');setPriceBand('all');setInStockOnly(false);setSortOrder('recommended');navigateBuyerPage('collection/all-products')}}>Reset &amp; browse all</button>
        </div>
       ):(
        <>
         <div className="sf-collection-grid">{collectionSorted.map((p:LiveProduct,idx:number)=>renderCollectionCard(p,idx<4))}</div>
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

      <div className="sf-collection-floating-bar" role="region" aria-label="Sort and filter products">
       <button type="button" onClick={()=>setCollectionSheet('sort')}>
        <span>Sort by</span>
        <ArrowUpDown size={15}/>
       </button>
       <span className="sf-collection-floating-sep" aria-hidden="true"/>
       <button type="button" onClick={()=>setCollectionSheet('filter')}>
        <span>Filter{(filter!=='All products'||priceBand!=='all'||inStockOnly)?` (${(filter!=='All products'?1:0)+(priceBand!=='all'?1:0)+(inStockOnly?1:0)})`:''}</span>
        <SlidersHorizontal size={15}/>
       </button>
      </div>

      {collectionSheet&&(
       <>
        <button type="button" className="sf-scrim" aria-label="Close options" onClick={()=>setCollectionSheet(null)}/>
        <section className="sf-collection-sheet" role="dialog" aria-modal="true" aria-label={collectionSheet==='sort'?'Sort products':'Filter products'}>
         <div className="sf-collection-sheet-head">
          <strong>{collectionSheet==='sort'?'Sort products':'Filter products'}</strong>
          <button type="button" className="sf-icon-btn" aria-label="Close" onClick={()=>setCollectionSheet(null)}><X size={16}/></button>
         </div>
         {collectionSheet==='sort'?(
          <div className="sf-collection-sheet-list">
           {[['recommended','Recommended'],['price-low','Price: Low to High'],['price-high','Price: High to Low'],['rating','Top Rated'],['name','Name: A to Z']].map(([val,label])=>(
            <button
             type="button"
             key={val}
             className={'sf-collection-sheet-option'+(sortOrder===val?' is-active':'')}
             onClick={()=>{setSortOrder(val);setCollectionSheet(null);}}
            >
             <span>{label}</span>
             {sortOrder===val&&<Check size={16}/>}
            </button>
           ))}
          </div>
         ):(
          <div className="sf-collection-sheet-filters">
           <label className="sf-collection-toggle-row">
            <span>In stock only</span>
            <input type="checkbox" checked={inStockOnly} onChange={e=>setInStockOnly(e.target.checked)}/>
           </label>
           <div className="sf-collection-filter-group">
            <span>Price range</span>
            <div className="sf-collection-price-grid">
             {[['all','All prices'],['under-1000','Under 1,000'],['1000-5000','1,000 – 5,000'],['5000-15000','5,000 – 15,000'],['15000-plus','15,000+']].map(([val,label])=>(
              <button
               type="button"
               key={val}
               className={'sf-filter-chip'+(priceBand===val?' is-active':'')}
               onClick={()=>setPriceBand(val as any)}
              >
               {label}
              </button>
             ))}
            </div>
           </div>
           <label className="sf-collection-filter-group">
            <span>Category</span>
            <select className="sf-select" style={{maxWidth:'none',width:'100%'}} value={filter} onChange={e=>setFilter(e.target.value)}>
             <option value="All products">All categories</option>
             {storefrontCategories.map(category=>(
              <optgroup key={category.name} label={category.name}>
               <option value={category.name}>{category.name}</option>
               {category.subcategories.map(child=><option key={child} value={child}>{child}</option>)}
              </optgroup>
             ))}
            </select>
           </label>
           <div className="sf-collection-sheet-actions">
            <button type="button" className="sf-btn sf-btn-secondary" onClick={()=>{setFilter('All products');setPriceBand('all');setInStockOnly(false);}}>Reset</button>
            <button type="button" className="sf-btn sf-btn-accent" onClick={()=>setCollectionSheet(null)}>Show {collectionSorted.length} products</button>
           </div>
          </div>
         )}
        </section>
       </>
      )}
     </div>
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
       saved={wishlistIds.includes(selectedProduct.id)}
       onToggleSaved={()=>toggleWishlist(selectedProduct.id)}
       onBack={closeProduct}
       onAdd={(quantity)=>updateCart(c=>({...c,[selectedProduct.id]:Math.min(99,selectedProduct.stockQuantity??99,(c[selectedProduct.id]||0)+quantity)}))}
       onOpen={openProduct}
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
     {totalCartUnits>0&&(
      <div className="sf-mobile-cartbar">
       <div className="sf-mobile-cartbar-meta"><strong>{totalCartUnits} item{totalCartUnits===1?'':'s'}</strong><small>KES {total.toLocaleString('en-KE')}</small></div>
       <button type="button" className="sf-btn sf-btn-accent" style={{minHeight:36,padding:'0 14px',fontSize:13}} onClick={()=>navigateBuyerPage('cart')}>Go to cart <ArrowRight size={15}/></button>
      </div>
     )}
     {renderFooter()}
    </>
   ):isCheckoutFlowRoute?(
    <Deferred>{renderFlow()}</Deferred>
   ):(
    <>
     {renderShopDrawer()}
     {renderStoreHeader(false)}
     {buyerPage!=='cart'&&(
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
   {buyerPage!=='cart'&&!isCheckoutFlowRoute&&shop?.whatsappNumber&&shop.whatsappNumber.replace(/\D/g,'').length>=10&&(
    <a className="sf-whatsapp-float" href={`https://wa.me/${shop.whatsappNumber.replace(/\D/g,'')}?text=Hello%2C%20I%20need%20help%20with%20this%20storefront.`} target="_blank" rel="noopener noreferrer" aria-label={`Contact ${shop?.name||'this shop'} on WhatsApp`}>
     <MessageCircle size={18}/><span>Help</span>
    </a>
   )}
   <StorefrontQuickView
    product={quickViewProduct}
    shopName={shop?.name||'This shop'}
    cartQuantity={quickViewProduct?(cart[quickViewProduct.id]||0):0}
    saved={quickViewProduct?wishlistIds.includes(quickViewProduct.id):false}
    onClose={()=>setQuickViewProduct(null)}
    onAdd={(quantity)=>{
     if(!quickViewProduct)return;
     updateCart(c=>({...c,[quickViewProduct.id]:Math.min(99,quickViewProduct.stockQuantity??99,(c[quickViewProduct.id]||0)+quantity)}));
    }}
    onToggleSaved={()=>{if(quickViewProduct)toggleWishlist(quickViewProduct.id);}}
    onOpenFullDetails={(product)=>openProduct(product)}
   />
  </main>
 );
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
  if (hostname === 'mambu.dasmarket.co.ke') {
    if (path === 'login') return <Deferred><AuthPage initial="login" /></Deferred>;
    if (path === 'reset-password') return <Deferred><AuthPage initial="reset" /></Deferred>;
    return <Deferred><PlatformAdminDashboard /></Deferred>;
  }
  if (isAdminCustomHost) { if (path === 'login') return <Deferred><AuthPage initial="login" /></Deferred>; if (path === 'reset-password') return <Deferred><AuthPage initial="reset" /></Deferred>; return <Deferred><SellerDashboard initialOrderNumber={path.startsWith('dashboard/')&&!path.startsWith('dashboard/subscriptions/')&&!path.startsWith('dashboard/reports/')?decodeURIComponent(path.slice('dashboard/'.length)):''} initialSubscriptionCheckoutPlanId={path.startsWith('dashboard/subscriptions/checkout/')?decodeURIComponent(path.slice('dashboard/subscriptions/checkout/'.length)):''} /></Deferred>; }
  if (tenantSubdomain) return <MerchantStore slug={tenantSubdomain} initialBuyerPage={path||'store'} />;
  if (isCustomDomain) return <MerchantStore slug="" initialBuyerPage={path||'store'} />;
  if (isPlatformHost && isPlatformSeoPath(path)) return <Deferred><PlatformSeoPage slug={path} /></Deferred>;
  if (!path) return <LandingPage />;
  if (path === 'signup') return <Deferred><AuthPage initial="signup" /></Deferred>;
  if (path === 'login') return <Deferred><AuthPage initial="login" /></Deferred>;
  if (path === 'reset-password') return <Deferred><AuthPage initial="reset" /></Deferred>;
  if (path === 'dashboard' || path.startsWith('dashboard/')) { const dashboardSubpath=path.slice('dashboard/'.length); const isReportRoute=dashboardSubpath==='reports'||dashboardSubpath.startsWith('reports/'); const isSubscriptionRoute=dashboardSubpath.startsWith('subscriptions/'); return <Deferred><SellerDashboard initialOrderNumber={path.startsWith('dashboard/')&&!isReportRoute&&!isSubscriptionRoute?decodeURIComponent(dashboardSubpath):''} initialSubscriptionCheckoutPlanId={dashboardSubpath.startsWith('subscriptions/checkout/')?decodeURIComponent(dashboardSubpath.slice('subscriptions/checkout/'.length)):''} /></Deferred>; }
  if (path === 'platform-admin' || path.startsWith('platform-admin/')) return <Deferred><PlatformAdminDashboard /></Deferred>;
  const storePathParts=path.split('/');
  return <MerchantStore slug={storePathParts[0]} initialBuyerPage={storePathParts.slice(1).join('/')||'store'} />;
}