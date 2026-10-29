import { ArrowRight, Check, Globe2, Layers3, ShieldCheck, ShoppingBag, Store, WalletCards } from 'lucide-react';

const features = [
  { icon: Store, title: 'Your own business site', text: 'Create a branded storefront or business website without building from scratch.' },
  { icon: ShoppingBag, title: 'Products and orders', text: 'Manage your catalogue, track orders, and keep your customer activity in one place.' },
  { icon: WalletCards, title: 'M-PESA for your business', text: 'Connect your own Daraja account. Payment credentials stay private and server-side.' },
  { icon: ShieldCheck, title: 'Built for separation', text: 'Merchant data and settings are isolated by tenant and checked by the backend.' },
];

export default function App() {
  return (
    <main>
      <nav className="nav shell">
        <a className="brand" href="#top" aria-label="DAS.co.ke home"><span className="brand-mark">D</span><span>DAS<span className="brand-dot">.</span>co.ke</span></a>
        <div className="nav-links"><a href="#platform">Platform</a><a href="#payments">Payments</a><a href="#security">Security</a></div>
        <a className="nav-cta" href="mailto:hello@das.co.ke?subject=DAS.co.ke%20early%20access">Get started <ArrowRight size={16} /></a>
      </nav>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span className="pulse" /> BUILT FOR KENYAN BUSINESSES</div>
          <h1>Your business online.<br /><span>On your terms.</span></h1>
          <p className="hero-text">Launch a professional website or online shop, manage orders, and receive payments through your own M-PESA setup — all from one workspace.</p>
          <div className="hero-actions"><a className="button primary" href="mailto:hello@das.co.ke?subject=DAS.co.ke%20early%20access">Join early access <ArrowRight size={17} /></a><a className="button secondary" href="#platform">Explore the platform</a></div>
          <div className="trust-row"><span><Check size={15} /> Your own brand</span><span><Check size={15} /> Your own payments</span><span><Check size={15} /> Tenant isolation</span></div>
        </div>
        <div className="preview-wrap" aria-label="Illustrative merchant dashboard preview">
          <div className="preview-glow" />
          <div className="dashboard-card">
            <div className="dash-top"><div><span className="dash-label">MERCHANT WORKSPACE</span><h3>Business overview</h3></div><span className="live-pill"><span /> Workspace preview</span></div>
            <div className="metric-grid"><div className="metric"><span>Store status</span><strong>Ready to build</strong><small>Set up your storefront</small></div><div className="metric"><span>Payments</span><strong>Connect M-PESA</strong><small>Use your Daraja account</small></div></div>
            <div className="setup-panel"><div className="setup-icon"><Layers3 size={19} /></div><div className="setup-copy"><strong>Your business, your workspace</strong><span>Products · Orders · Website · Payments</span></div><ArrowRight size={18} className="setup-arrow" /></div>
            <div className="checklist"><div className="check-row"><span className="check-circle"><Check size={12} /></span><span>Tenant workspace architecture</span><span className="status-text">Planned</span></div><div className="check-row"><span className="check-circle muted"><Globe2 size={12} /></span><span>Custom domain and subdomain</span><span className="status-text">In build</span></div><div className="check-row"><span className="check-circle muted"><WalletCards size={12} /></span><span>Verified M-PESA callbacks</span><span className="status-text">Not live</span></div></div>
            <div className="dash-foot"><span className="foot-dot" /> New platform · built from scratch</div>
          </div>
          <div className="floating-chip"><span className="chip-icon"><ShieldCheck size={17} /></span><span><strong>Privacy by design</strong><small>Merchant data stays separate</small></span></div>
        </div>
      </section>

      <section className="value-strip"><div className="shell value-inner"><span>ONE WORKSPACE</span><b /> <span>YOUR BRAND</span><b /> <span>YOUR M-PESA</span><b /> <span>YOUR CUSTOMERS</span></div></section>

      <section className="features shell" id="platform"><div className="section-heading"><div className="eyebrow">THE DAS PLATFORM</div><h2>Everything your business needs<br /><span>to move forward.</span></h2><p>A shared platform foundation with a separate workspace for every business.</p></div><div className="feature-grid">{features.map(({ icon: Icon, title, text }) => <article className="feature-card" key={title}><div className="feature-icon"><Icon size={21} /></div><h3>{title}</h3><p>{text}</p><span className="feature-line" /></article>)}</div></section>

      <section className="payments-section" id="payments"><div className="shell payments-inner"><div><div className="eyebrow">PAYMENTS THAT BELONG TO YOU</div><h2>Connect your M-PESA.<br /><span>Keep control.</span></h2><p>Each merchant will configure their own Daraja credentials in a secure settings flow. The platform will verify callbacks server-side, prevent duplicate processing, and record payment events for reconciliation.</p><div className="payment-points"><span><Check size={16} /> Merchant-specific credentials</span><span><Check size={16} /> Idempotent payment callbacks</span><span><Check size={16} /> Auditable transaction records</span></div></div><div className="payment-visual"><div className="payment-orbit orbit-one"/><div className="payment-orbit orbit-two"/><div className="mpesa-card"><div className="mpesa-mark">M</div><div><strong>M-PESA Daraja</strong><span>Merchant payment connection</span></div><span className="connection-state">SETUP REQUIRED</span></div><div className="secure-note"><ShieldCheck size={18} /><span><strong>Server-side only</strong><small>Secrets are never exposed to the browser</small></span></div></div></div></section>

      <section className="security shell" id="security"><div className="security-icon"><ShieldCheck size={24} /></div><div><div className="eyebrow">SECURITY BEFORE LIVE PAYMENTS</div><h2>Built carefully. Launched responsibly.</h2><p>Live payment processing stays disabled until merchant credentials, public callback reachability, database access controls, and end-to-end payment verification have passed testing.</p></div><div className="security-tag">Live payments disabled during build</div></section>

      <footer className="footer shell"><a className="brand" href="#top"><span className="brand-mark">D</span><span>DAS<span className="brand-dot">.</span>co.ke</span></a><span>Business, online.</span><span>© {new Date().getFullYear()} DAS.co.ke</span></footer>
    </main>
  );
}
