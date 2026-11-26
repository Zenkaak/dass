import { useState } from 'react';
import './replit-landing.css';
import {
  DashboardSnapshotExplorer,
  OverviewSnapshot,
  type SnapshotTabId,
} from './DashboardSnapshotPreview';
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  CreditCard,
  Globe2,
  Menu,
  PackageCheck,
  ShoppingBag,
  Store,
  Truck,
  X,
} from 'lucide-react';

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <a className={compact ? 'dm-brand dm-brand-compact' : 'dm-brand'} href="/" aria-label="DASMARKET home">
      <svg className="dm-brand-mark" viewBox="0 0 40 40" role="img" aria-label="DASMARKET mark">
        <rect x="1" y="1" width="38" height="38" rx="9" fill="#0f52ba" />
        <path
          d="M11 10h8.8c6.7 0 11.2 4.1 11.2 10s-4.5 10-11.2 10H11V10Zm8.3 15.6c3.8 0 6.1-2 6.1-5.6s-2.3-5.6-6.1-5.6h-2.8v11.2h2.8Z"
          fill="#ffffff"
        />
        <rect x="28" y="9" width="3.2" height="8" rx="1" fill="#f59e0b" />
      </svg>
      <span className="dm-brand-word">DASMARKET</span>
    </a>
  );
}

const SNAPSHOT_TABS: Array<{
  id: SnapshotTabId;
  index: string;
  label: string;
  summary: string;
}> = [
  {
    id: 'overview',
    index: '01',
    label: 'Overview',
    summary: 'Daily order value, pending fulfilment counts, 7-day sales chart, and recent customer orders at a glance.',
  },
  {
    id: 'orders',
    index: '02',
    label: 'Orders & M-PESA',
    summary: 'Inspect buyer Nairobi & countrywide delivery instructions, M-PESA receipts, and Till or PayBill STK prompts.',
  },
  {
    id: 'products',
    index: '03',
    label: 'Product catalogue',
    summary: 'Publish listings, track remaining stock counts, bulk import via CSV, and search products by SKU or category.',
  },
  {
    id: 'domains',
    index: '04',
    label: 'Custom domain',
    summary: 'Link a .co.ke or .com domain with guided A and CNAME records for both your storefront and seller admin URL.',
  },
];

const CAPABILITIES = [
  {
    num: '01',
    icon: Store,
    title: 'Dedicated storefront',
    body: 'Share a focused online shop built for mobile browsing from WhatsApp, Instagram, or search without marketplace clutter.',
  },
  {
    num: '02',
    icon: ShoppingBag,
    title: 'Catalogue & inventory',
    body: 'Update product photos, variants, KES pricing, and available stock in seconds whenever inventory changes.',
  },
  {
    num: '03',
    icon: CreditCard,
    title: 'M-PESA & Paystack setup',
    body: 'Configure the supported M-PESA Till, PayBill, or card payment details enabled for your shop and confirm before packing.',
  },
  {
    num: '04',
    icon: Truck,
    title: 'Kenyan delivery capture',
    body: 'Collect pickup preference, county, sub-county, estate, and landmark notes cleanly with every customer order.',
  },
  {
    num: '05',
    icon: PackageCheck,
    title: 'Structured order ledger',
    body: 'Follow each order from checkout to delivery confirmation with full buyer contact details and order references.',
  },
  {
    num: '06',
    icon: Globe2,
    title: 'Your own domain name',
    body: 'Start on a DASMARKET subdomain and point your .co.ke or .com domain straight to your live shop with guided DNS.',
  },
] as const;

const STEPS = [
  {
    num: '01',
    title: 'Register your shop',
    body: 'Create your seller account, enter your shop name, and claim your initial DASMARKET storefront address.',
  },
  {
    num: '02',
    title: 'Add products & payments',
    body: 'Upload photos, set KES prices and stock, configure supported M-PESA or Paystack options, and set delivery zones.',
  },
  {
    num: '03',
    title: 'Publish & sell cleanly',
    body: 'Share your storefront link or connected custom domain with buyers and track every order from one dashboard.',
  },
] as const;

const GUIDES = [
  { href: '/create-online-store', label: 'How to create an online store' },
  { href: '/ecommerce-platform', label: 'DASMARKET ecommerce platform' },
  { href: '/sell-online-with-mpesa', label: 'M-PESA merchant payment setup' },
  { href: '/custom-domain-online-store', label: 'Connecting a custom domain' },
  { href: '/online-store-management', label: 'Managing products and orders' },
] as const;

const FAQS = [
  {
    q: 'How do I create an online shop in Kenya?',
    a: 'Create a DASMARKET seller account, choose your shop name, add products and shop details, configure supported payment options, then publish and share your storefront address.',
  },
  {
    q: 'Can I use my own domain for my online store?',
    a: 'Yes. You start with a shareable DASMARKET shop address immediately and can connect a domain you already own anytime inside your seller dashboard.',
  },
  {
    q: 'Can customers pay with M-PESA?',
    a: 'Sellers can configure supported M-PESA merchant Till or PayBill details for their shop. Available payment methods at checkout depend on your shop configuration.',
  },
  {
    q: 'Can I manage products and orders from one dashboard?',
    a: 'Yes. Your seller workspace keeps products, stock levels, customer orders, payment status, shop policies, and domain settings together under one account.',
  },
] as const;

export function ReplitLandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSnapshot, setActiveSnapshot] = useState<SnapshotTabId>('overview');
  const [openFaq, setOpenFaq] = useState<number>(0);

  const closeMenu = () => setMenuOpen(false);
  const currentTab = SNAPSHOT_TABS.find((t) => t.id === activeSnapshot) || SNAPSHOT_TABS[0];

  return (
    <div className="dm-land" id="top">
      <header className="dm-nav-wrap">
        <nav className="dm-nav dm-container" aria-label="Primary navigation">
          <Brand />

          <div className={menuOpen ? 'dm-nav-links is-open' : 'dm-nav-links'}>
            <a href="#workflow" onClick={closeMenu}>Dashboard</a>
            <a href="#features" onClick={closeMenu}>Capabilities</a>
            <a href="#how-it-works" onClick={closeMenu}>How it works</a>
            <a href="#faq" onClick={closeMenu}>FAQ</a>
            <a href="/login" onClick={closeMenu} data-testid="link-sign-in">Sign in</a>
            <a className="dm-mobile-cta" href="/signup" onClick={closeMenu}>
              Create your shop <ArrowRight size={15} />
            </a>
          </div>

          <div className="dm-nav-action-zone">
            <a className="dm-btn dm-btn-primary dm-nav-cta" href="/signup">
              Create your shop
            </a>
            <button
              className="dm-mobile-toggle"
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={menuOpen}
              data-testid="button-mobile-menu"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>
      </header>

      <main>
        {/* 1. Proposition / Editorial Hero with Actual Dashboard Overview Snapshot */}
        <section className="dm-hero" aria-labelledby="hero-title">
          <div className="dm-container dm-hero-grid">
            <div className="dm-hero-copy">
              <p className="dm-kicker">KENYAN E-COMMERCE INFRASTRUCTURE</p>
              <h1 id="hero-title">
                Your online shop.
                <span>Built to sell cleanly.</span>
              </h1>
              <p className="dm-hero-lead">
                Launch a branded online storefront without building software from scratch.
                Manage products, verify M-PESA or Paystack payments, track delivery orders,
                and connect your own domain from one seller dashboard.
              </p>

              <div className="dm-hero-actions">
                <a className="dm-btn dm-btn-primary" href="/signup" data-testid="button-start-shop">
                  Create your shop <ArrowRight size={16} />
                </a>
                <a className="dm-text-link" href="/login" data-testid="button-hero-sign-in">
                  Already have a shop? Sign in <ArrowRight size={14} />
                </a>
              </div>

              <dl className="dm-hero-specs" aria-label="Platform highlights">
                <div>
                  <dt>Storefront</dt>
                  <dd>yourshop.dasmarket.co.ke or custom domain</dd>
                </div>
                <div>
                  <dt>Checkout</dt>
                  <dd>M-PESA Till, PayBill &amp; Paystack ready</dd>
                </div>
                <div>
                  <dt>Fulfilment</dt>
                  <dd>County, estate &amp; pickup order ledger</dd>
                </div>
              </dl>
            </div>

            <div className="dm-hero-snapshot" aria-label="Live preview of the DASMARKET seller dashboard with demo data">
              <OverviewSnapshot compact />
              <div className="dm-hero-caption">
                <span>Actual Seller Overview layout · Sample Kenyan store data</span>
                <a href="#workflow" className="dm-caption-link">
                  Explore all 4 screens <ArrowRight size={12} />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Exact Interactive Dashboard Snapshots Explorer */}
        <section className="dm-workflow-section" id="workflow" aria-labelledby="workflow-heading">
          <div className="dm-container">
            <div className="dm-section-head dm-section-head-split">
              <div>
                <p className="dm-eyebrow">ACTUAL SELLER WORKSPACE</p>
                <h2 id="workflow-heading">Inspect the dashboard screens before you open a shop.</h2>
              </div>
              <p>
                Switch between views—or click directly inside the sidebar—to see how your
                overview, M-PESA order details, product catalogue, and custom DNS work.
              </p>
            </div>

            <div className="dm-snap-explorer">
              <div className="dm-workflow-tabs" role="tablist" aria-label="Seller dashboard snapshots">
                {SNAPSHOT_TABS.map((item) => {
                  const selected = item.id === currentTab.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      className={selected ? 'dm-workflow-tab is-active' : 'dm-workflow-tab'}
                      onClick={() => setActiveSnapshot(item.id)}
                    >
                      <span className="dm-mono">{item.index}</span>
                      <strong>{item.label}</strong>
                    </button>
                  );
                })}
              </div>

              <div className="dm-snap-stage-note">
                <p>{currentTab.summary}</p>
                <a className="dm-inline-cta" href="/signup">
                  Open this workspace <ArrowRight size={14} />
                </a>
              </div>

              <div className="dm-snap-stage" role="tabpanel">
                <DashboardSnapshotExplorer
                  activeTab={activeSnapshot}
                  onSelectTab={setActiveSnapshot}
                />
              </div>
            </div>
          </div>
        </section>

        {/* 3. Architectural Capabilities Grid */}
        <section className="dm-features-section" id="features" aria-labelledby="features-heading">
          <div className="dm-container">
            <div className="dm-section-head dm-section-head-split">
              <div>
                <p className="dm-eyebrow">CORE CAPABILITIES</p>
                <h2 id="features-heading">Everything needed to run a dedicated online store.</h2>
              </div>
              <p>
                Built for practical day-to-day retail operations—catalogue accuracy, clean
                checkout, Kenyan delivery fields, and domain control without clutter.
              </p>
            </div>

            <div className="dm-cap-matrix">
              {CAPABILITIES.map((cap) => {
                const Icon = cap.icon;
                return (
                  <article key={cap.num} className="dm-cap-cell">
                    <div className="dm-cap-top">
                      <span className="dm-mono dm-cap-num">{cap.num}</span>
                      <span className="dm-cap-icon" aria-hidden="true">
                        <Icon size={17} />
                      </span>
                    </div>
                    <h3>{cap.title}</h3>
                    <p>{cap.body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* 4. Three Practical Steps */}
        <section className="dm-steps-section" id="how-it-works" aria-labelledby="steps-heading">
          <div className="dm-container">
            <div className="dm-section-head">
              <p className="dm-eyebrow">GETTING STARTED</p>
              <h2 id="steps-heading">Open your online shop in three clear steps.</h2>
            </div>

            <div className="dm-steps-grid">
              {STEPS.map((step) => (
                <article key={step.num} className="dm-step-card">
                  <div className="dm-step-head">
                    <span className="dm-mono dm-step-index">{step.num}</span>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 5. FAQ & Platform Guides */}
        <section className="dm-faq-section" id="faq" aria-labelledby="faq-heading">
          <div className="dm-container dm-faq-layout">
            <div className="dm-faq-intro">
              <p className="dm-eyebrow">COMMON QUESTIONS</p>
              <h2 id="faq-heading">Clear answers before you open your storefront.</h2>
              <p>
                DASMARKET supplies your online store infrastructure; your business retains control
                of its catalogue, pricing, customer policies, and fulfilment.
              </p>

              <div className="dm-guide-links" aria-label="Platform guides">
                <strong>Platform guides</strong>
                {GUIDES.map((guide) => (
                  <a key={guide.href} href={guide.href}>
                    <span>{guide.label}</span>
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>

            <div className="dm-faq-list">
              {FAQS.map((item, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <article key={item.q} className={isOpen ? 'dm-faq-item is-open' : 'dm-faq-item'}>
                    <button
                      type="button"
                      className="dm-faq-trigger"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                    >
                      <span>{item.q}</span>
                      <ChevronDown size={18} aria-hidden="true" />
                    </button>
                    {isOpen && <p className="dm-faq-answer">{item.a}</p>}
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* 6. Streamlined Closing CTA */}
        <section className="dm-cta-band" aria-labelledby="cta-heading">
          <div className="dm-container dm-cta-box">
            <div className="dm-cta-copy">
              <p className="dm-eyebrow dm-eyebrow-light">READY TO LAUNCH</p>
              <h2 id="cta-heading">Bring your business online with DASMARKET.</h2>
              <p>
                Set up your storefront, list your catalogue, and run orders from one seller workspace.
              </p>
            </div>
            <div className="dm-cta-actions">
              <a className="dm-btn dm-btn-contrast" href="/signup">
                Create your shop <ArrowRight size={16} />
              </a>
              <a className="dm-cta-secondary" href="/contact/">
                Talk to support
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Compact, Quiet Footer */}
      <footer className="dm-footer">
        <div className="dm-container">
          <div className="dm-footer-top">
            <div className="dm-footer-id">
              <Brand compact />
              <span className="dm-footer-summary">
                Online storefronts &amp; M-PESA checkout for Kenyan merchants · Nairobi, Kenya
              </span>
            </div>

            <div className="dm-footer-contact" aria-label="Support channels">
              <a href="mailto:support@dasmarket.co.ke">support@dasmarket.co.ke</a>
              <a href="tel:+254758884861">+254 758 884 861</a>
              <a href="https://wa.me/254758884861" target="_blank" rel="noreferrer">
                WhatsApp
              </a>
            </div>
          </div>

          <div className="dm-footer-bottom">
            <span>© 2026 DASMARKET</span>
            <nav className="dm-footer-nav" aria-label="Footer links">
              <a href="/contact/">Contact</a>
              <a href="/terms/">Terms</a>
              <a href="/privacy/">Privacy</a>
              <a href="/login">Sign in</a>
              <a href="#top">Back to top</a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default ReplitLandingPage;
