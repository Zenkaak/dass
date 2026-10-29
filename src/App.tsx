import { useEffect, useMemo, useState } from 'react';
import { AuthPage } from './AuthPage';
import { ArrowRight, Check, ChevronDown, Globe2, Layers3, Search, ShieldCheck, ShoppingBag, Store, WalletCards, Zap } from 'lucide-react';

type Product = { id: number; name: string; category: 'Data bundles' | 'Shop products'; detail: string; price: number; icon: string; color: string };

const starterProducts: Product[] = [
  { id: 1, name: 'Daily Data Bundle', category: 'Data bundles', detail: 'Affordable daily internet bundle', price: 50, icon: '◉', color: 'blue' },
  { id: 2, name: 'Weekly Data Bundle', category: 'Data bundles', detail: 'Stay connected all week', price: 250, icon: '⌁', color: 'violet' },
  { id: 3, name: 'Monthly Data Bundle', category: 'Data bundles', detail: 'Internet for the whole month', price: 1000, icon: '◎', color: 'mint' },
  { id: 4, name: 'Wireless Earbuds', category: 'Shop products', detail: 'Everyday wireless audio', price: 1800, icon: '♫', color: 'violet' },
  { id: 5, name: 'Everyday Backpack', category: 'Shop products', detail: 'A practical bag for work and travel', price: 2200, icon: '▤', color: 'blue' },
  { id: 6, name: 'Phone Charger', category: 'Shop products', detail: 'Compact charging accessory', price: 850, icon: 'ϟ', color: 'mint' },
];

const features = [
  { icon: Store, title: 'Your own online shop', text: 'Start with a ready-to-customise storefront at your own unique DAS link.' },
  { icon: ShoppingBag, title: 'Two kinds of products', text: 'Sell data bundles and digital offers alongside everyday physical products.' },
  { icon: WalletCards, title: 'Your own M-PESA', text: 'Configure your business payment connection securely when setup is available.' },
  { icon: ShieldCheck, title: 'Separate seller workspace', text: 'Each merchant gets their own catalogue, orders, settings and customer experience.' },
];

function Brand() {
  return <a className="brand" href="/" aria-label="DAS.co.ke home"><span className="brand-mark">D</span><span>DAS<span className="brand-dot">.</span>co.ke</span></a>;
}

function LandingPage() {
  return (
    <main>
      <nav className="nav shell">
        <Brand />
        <div className="nav-links"><a href="#how-it-works">How it works</a><a href="#features">Features</a><a href="#payments">Payments</a></div>
        <div className="nav-actions"><a className="nav-quiet" href="/dashboard">Go to dashboard</a><a className="nav-cta" href="/signup">Sign up <ArrowRight size={16} /></a></div>
      </nav>
      <section className="hero shell" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span className="pulse" /> SELL ONLINE WITH DAS</div>
          <h1>Your shop online.<br /><span>Your business, growing.</span></h1>
          <p className="hero-text">Create your own online shop in minutes. List data bundles, digital offers and everyday products, manage orders in one dashboard, and prepare to receive customer payments through your business M-PESA setup.</p>
          <div className="hero-actions"><a className="button primary" href="/signup">Create your shop <ArrowRight size={17} /></a><a className="button secondary" href="/dashboard">Go to dashboard</a></div>
          <div className="trust-row"><span><Check size={15} /> Your own shop link</span><span><Check size={15} /> Products and orders</span><span><Check size={15} /> Seller-first tools</span></div>
        </div>
        <div className="preview-wrap" aria-label="Illustrative seller dashboard preview">
          <div className="preview-glow" />
          <div className="dashboard-card">
            <div className="dash-top"><div><span className="dash-label">SELLER WORKSPACE</span><h3>Your shop overview</h3></div><span className="live-pill"><span /> Platform preview</span></div>
            <div className="metric-grid"><div className="metric"><span>Your storefront</span><strong>das.co.ke/your-shop</strong><small>Your unique shop address</small></div><div className="metric"><span>Catalogue</span><strong>Two product types</strong><small>Digital and physical goods</small></div></div>
            <div className="setup-panel"><div className="setup-icon"><Layers3 size={19} /></div><div className="setup-copy"><strong>Everything in one place</strong><span>Storefront · Products · Orders · Payments</span></div><ArrowRight size={18} className="setup-arrow" /></div>
            <div className="checklist"><div className="check-row"><span className="check-circle"><Check size={12} /></span><span>Seller shop and unique slug</span><span className="status-text">First release</span></div><div className="check-row"><span className="check-circle muted"><ShoppingBag size={12} /></span><span>Data and physical products</span><span className="status-text">First release</span></div><div className="check-row"><span className="check-circle muted"><WalletCards size={12} /></span><span>Live payment verification</span><span className="status-text">Before launch</span></div></div>
            <div className="dash-foot"><span className="foot-dot" /> One seller · one dedicated shop</div>
          </div>
          <div className="floating-chip"><span className="chip-icon"><ShieldCheck size={17} /></span><span><strong>Your shop, your identity</strong><small>Merchant catalogues stay separate</small></span></div>
        </div>
      </section>
      <section className="value-strip"><div className="shell value-inner"><span>YOUR OWN SHOP LINK</span><b /><span>DIGITAL + PHYSICAL</span><b /><span>ORDERS IN ONE PLACE</span><b /><span>SELLER CONTROL</span></div></section>
      <section className="features shell" id="features"><div className="section-heading"><div className="eyebrow">MADE FOR SELLERS</div><h2>Start simple.<br /><span>Grow when you’re ready.</span></h2><p>DAS gives each seller a shop page and the essential tools to begin selling online.</p></div><div className="feature-grid">{features.map(({ icon: Icon, title, text }) => <article className="feature-card" key={title}><div className="feature-icon"><Icon size={21} /></div><h3>{title}</h3><p>{text}</p><span className="feature-line" /></article>)}</div></section>
      <section className="how-section" id="how-it-works"><div className="shell"><div className="section-heading"><div className="eyebrow">HOW DAS WORKS</div><h2>From sign-up to <span>your shop link.</span></h2><p>A straightforward start for sellers who want to get online without building a website from scratch.</p></div><div className="steps-grid"><article><span className="step-number">01</span><h3>Create an account</h3><p>Sign up and choose a unique shop name for your business.</p></article><article><span className="step-number">02</span><h3>Set up your catalogue</h3><p>Start with available listings, then add or edit your own products and prices.</p></article><article><span className="step-number">03</span><h3>Share your shop</h3><p>Your shop is available at <strong>das.co.ke/your-slug</strong> so customers can browse your listings.</p></article><article><span className="step-number">04</span><h3>Manage orders</h3><p>Use your seller dashboard to organise orders and configure payment settings as they become available.</p></article></div></div></section>
      <section className="payments-section" id="payments"><div className="shell payments-inner"><div><div className="eyebrow">PAYMENTS THAT BELONG TO YOU</div><h2>Your business.<br /><span>Your M-PESA setup.</span></h2><p>The platform is designed for each seller to configure their own Daraja connection. Payment credentials must stay server-side, with verified callbacks and duplicate-payment protection tested before live transactions are enabled.</p><div className="payment-points"><span><Check size={16} /> Merchant-specific payment settings</span><span><Check size={16} /> Verified callback handling</span><span><Check size={16} /> Order and payment records</span></div></div><div className="payment-visual"><div className="payment-orbit orbit-one" /><div className="payment-orbit orbit-two" /><div className="mpesa-card"><div className="mpesa-mark">M</div><div><strong>M-PESA Daraja</strong><span>Per-seller payment setup</span></div><span className="connection-state">SETUP REQUIRED</span></div><div className="secure-note"><ShieldCheck size={18} /><span><strong>Security first</strong><small>Credentials are not shown publicly</small></span></div></div></div></section>
      <section className="security shell"><div className="security-icon"><ShieldCheck size={24} /></div><div><div className="eyebrow">BUILT IN STAGES</div><h2>Useful first. More powerful over time.</h2><p>The first release focuses on seller registration, unique shop pages, catalogues and order management. Subdomains and advanced features can follow once the core flow is working.</p></div><div className="security-tag">Live payments disabled until tested</div></section>
      <section className="final-cta shell"><div><div className="eyebrow">READY TO START?</div><h2>Give your business <span>a home online.</span></h2><p>Create your seller account and start setting up your shop.</p></div><div className="hero-actions"><a className="button primary" href="/signup">Sign up <ArrowRight size={17} /></a><a className="button secondary" href="/dashboard">Go to dashboard</a></div></section>
      <footer className="footer shell"><Brand /><span>Business, online.</span><span>© {new Date().getFullYear()} DAS.co.ke</span></footer>
    </main>
  );
}

function MerchantStore({ slug }: { slug: string }) {
  const [filter, setFilter] = useState<'All products' | 'Data bundles' | 'Shop products'>('All products');
  const [search, setSearch] = useState('');
  const products = useMemo(() => starterProducts.filter((p) => (filter === 'All products' || p.category === filter) && (p.name + ' ' + p.detail).toLowerCase().includes(search.toLowerCase())), [filter, search]);
  const storeName = slug.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  return <main className="store-page">
    <nav className="nav shell store-nav"><Brand /><a className="nav-quiet" href="/">About DAS</a><a className="nav-cta" href="/dashboard">Seller dashboard <ArrowRight size={16} /></a></nav>
    <section className="store-hero shell"><div className="store-kicker"><Store size={15} /> SELLER STORE</div><h1>Welcome to <span>{storeName}</span></h1><p>Browse digital offers and everyday products from this shop.</p><div className="store-url"><Globe2 size={16} /> das.co.ke/{slug}</div></section>
    <section className="catalogue shell"><div className="catalogue-heading"><div><div className="eyebrow">THE CATALOGUE</div><h2>Shop products</h2><p>Digital offers and physical products, together in one store.</p></div><span className="catalogue-count">{products.length} listings</span></div>
      <div className="catalogue-tools"><label className="search-box"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search this shop" /></label><div className="filter-wrap"><ChevronDown size={15} /><select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}><option>All products</option><option>Data bundles</option><option>Shop products</option></select></div></div>
      <div className="product-grid">{products.map((product) => <article className="product-card" key={product.id}><div className={'product-art ' + product.color}><span>{product.icon}</span><small>{product.category}</small></div><div className="product-info"><h3>{product.name}</h3><p>{product.detail}</p><div className="product-buy"><strong>KES {product.price.toLocaleString('en-KE')}</strong><button type="button" onClick={() => window.alert('Checkout will be enabled after the seller catalogue and payment backend are connected.')}>View item <ArrowRight size={14} /></button></div></div></article>)}</div>
      <p className="catalogue-note"><Zap size={15} /> Starter catalogue preview. Products shown here belong to this shop page, not the DAS.co.ke landing page. Real listings will be loaded from the tenant-scoped database when the backend is connected.</p>
    </section>
    <footer className="footer shell"><Brand /><span>{storeName} · Seller storefront</span><span>Powered by DAS.co.ke</span></footer>
  </main>;
}

function SellerDashboard(){
 const [loading,setLoading]=useState(true); const [user,setUser]=useState<{displayName?:string;phone?:string}|null>(null); const [error,setError]=useState('');
 useEffect(()=>{fetch('/api/auth?action=session',{credentials:'same-origin'}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok){window.location.href='/login';return;}setUser(d.user);setLoading(false)}).catch(()=>{setError('Could not connect to the account service.');setLoading(false)})},[]);
 async function logout(){await fetch('/api/auth?action=logout',{method:'POST',credentials:'same-origin'});window.location.href='/'}
 return <main className="account-page"><nav className="nav shell"><Brand/><button className="nav-quiet" onClick={logout}>Sign out</button></nav><section className="account-card"><div className="account-icon"><Layers3 size={24}/></div><div className="eyebrow">SELLER WORKSPACE</div><h1>{loading?'Loading your workspace…':'Welcome, '+(user?.displayName||'seller')+'.'}</h1><p>{loading?'Checking your secure session.':'Your seller account is connected. Product catalogue and order management are the next integration step.'}</p>{error&&<div className="auth-message error">{error}</div>}{user&&<div className="account-notice"><ShieldCheck size={17}/><span>Signed in as {user.phone||'verified seller'}. Your session is active.</span></div>}<div className="dashboard-actions"><a className="button secondary" href="/">View DAS.co.ke</a><button className="button primary" onClick={logout}>Sign out</button></div></section></main>;
}
export default function App() {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
  if (!path) return <LandingPage />;
  if (path === 'signup') return <AuthPage initial="signup" />;
  if (path === 'login') return <AuthPage initial="login" />;
  if (path === 'reset-password') return <AuthPage initial="reset" />;
  if (path === 'dashboard') return <SellerDashboard />;
  return <MerchantStore slug={path.split('/')[0]} />;
}
