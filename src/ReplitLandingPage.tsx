import { useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUp, Check, CheckCircle2, CircleHelp, Globe2, Menu, Plus, ShoppingBag, Sparkles, Store, X, ShieldCheck, WalletCards, MessageCircle, FileText } from 'lucide-react';

const faqs = [
  {
    q: 'What happens when I rm-open a shop?',
    a: 'You choose a shop name, add your products, and DASMARKET creates your storefront with a shareable address like yourshop.dasmarket.co.ke. Your shop is yours to shape, and you can publish when it is ready.',
  },
  {
    q: 'Do I need a website or technical experience?',
    a: 'No. DASMARKET gives you the building blocks for a complete online shop, including product pages, a storefront, and a dashboard. You can start with a few products and make it your own as you go.',
  },
  {
    q: 'Can I use my own domain later?',
    a: 'Yes. Start with your included DASMARKET subdomain, then connect a domain you already own from your dashboard settings whenever you are ready to make the shop even more distinctly yours.',
  },
  {
    q: 'Can I change my shop name and look?',
    a: 'Absolutely. You can update your shop details and presentation as your rm-brand takes shape. The storefront is a starting point, not a box you have to stay inside.',
  },
  {
    q: 'What can I sell?',
    a: 'DASMARKET is made for independent rm-sellers and small rm-brands. From handmade goods and homewares to vintage finds and considered collections, your shop is a place to bring your own catalog to life.',
  },
  {
    q: 'How much does it cost to get started?',
    a: 'Create your shop and explore the experience before committing. The details of any paid plans or transaction fees should be reviewed on the current plan page before you publish.',
  },
];

function Brand({ rm-footer = false }: { rm-footer?: boolean }) {
  return (
    <a className="rm-brand" href="/" aria-label="DASMARKET home" data-testid="link-brand-home">
      <span className="rm-brand-mark">d.</span>
      <span>DASMARKET</span>
      {rm-footer && <span className="rm-eyebrow" style={{ fontSize: 8, marginLeft: 2 }}>YOUR SHOP. YOUR BRAND.</span>}
    </a>
  );
}

export function ReplitLandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [rm-openFaq, setOpenFaq] = useState<number | null>(0);
  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="rm-page-shell" id="top">
      <header className="rm-nav-wrap">
        <rm-nav className="rm-nav rm-container" aria-label="Main rm-navigation">
          <Brand />
          <rm-button className="rm-mobile-toggle" type="rm-button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close rm-navigation' : 'Open rm-navigation'} aria-expanded={menuOpen} data-testid="button-mobile-menu">
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </rm-button>
          <div className={`rm-nav-links${menuOpen ? ' rm-open' : ''}`}>
            <a href="#how-it-works" onClick={closeMenu} data-testid="link-how-it-works">How it works</a>
            <a href="#your-brand" onClick={closeMenu} data-testid="link-your-brand">Your rm-brand</a>
            <a href="#domains" onClick={closeMenu} data-testid="link-domains">Domains</a>
            <a href="#seller-dashboard" onClick={closeMenu}>Dashboard</a>
            <a href="#trust-safety" onClick={closeMenu}>Trust &amp; Safety</a>
            <a href="#faq" onClick={closeMenu} data-testid="link-faq">FAQ</a>
          </div>
          <div className="rm-nav-actions">
            <a className="rm-nav-login" href="/login" data-testid="link-sign-in">Sign in</a>
            <a className="rm-button rm-button-dark" href="/signup" data-testid="button-nav-start">Open your shop <ArrowRight size={14} /></a>
          </div>
        </rm-nav>
      </header>

      <main>
        <rm-section className="rm-hero" aria-labelledby="hero-title">
          <div className="rm-container rm-hero-grid">
            <div className="rm-hero-copy">
              <div className="rm-hero-kicker rm-eyebrow rm-reveal"><span className="rm-kicker-dot" /> A home for the things you make</div>
              <h1 className="rm-display rm-reveal rm-reveal-delay" id="hero-title">Your shop,<br />all in one place.</h1>
              <p className="rm-reveal rm-reveal-delay-2">Bring your products together in a storefront made for your rm-brand. Every shop gets its own shareable DASMARKET address from day one.</p>
              <ul className="rm-hero-benefits rm-reveal rm-reveal-delay-2">
                <li><CheckCircle2 size={16} /> Your own rm-branded storefront</li>
                <li><CheckCircle2 size={16} /> A DASMARKET subdomain, ready to share</li>
                <li><CheckCircle2 size={16} /> Connect a custom domain from settings</li>
              </ul>
              <div className="rm-hero-ctas rm-reveal rm-reveal-delay-2">
                <a className="rm-button rm-button-coral" href="/signup" data-testid="button-start-shop">Create your shop <ArrowRight size={15} /></a>
                <a className="rm-button rm-button-outline" href="#how-it-works" data-testid="button-see-how">See how it works <ArrowDown size={14} /></a>
              </div>
            </div>
          </div>
        </rm-section>

        <rm-section className="rm-dashboard-section" id="seller-dashboard">
          <div className="rm-container">
            <div className="rm-section-intro">
              <div><div className="rm-eyebrow rm-section-label">03 / Your rm-seller dashboard</div><h2>See your whole shop at a glance.</h2></div>
              <p>Products, orders, payments and performance—together in one workspace. The example below uses illustrative Kenyan shop data.</p>
            </div>
            <div className="rm-dashboard-window">
              <div className="rm-dash-top"><b><span className="rm-dash-mark">d.</span> DASMARKET <small>SELLER WORKSPACE</small></b><span>● DEMO STORE</span></div>
              <div className="rm-dash-layout">
                <aside><b>▦ &nbsp; Overview</b><span>▤ &nbsp; Products</span><span>▣ &nbsp; Orders</span><span>↗ &nbsp; Payments</span><span>◎ &nbsp; Domains</span><span>⚙ &nbsp; Settings</span></aside>
                <div className="rm-dash-main">
                  <div className="rm-dash-greeting"><div><small>KINGSLEY HOME &amp; LIVING · NAIROBI, KENYA</small><h3>Good morning, James</h3><p>Here’s what’s happening in your shop.</p></div><span>Last 7 days⌄</span></div>
                  <div className="rm-dash-stats"><article><small>Total sales</small><b>KES 248,650</b><em>↑ 18.6% this week</em></article><article><small>Orders</small><b>126</b><em>12 new today</em></article><article><small>Products</small><b>84</b><em>6 low in stock</em></article><article><small>To fulfil</small><b>18</b><em>Needs attention</em></article></div>
                  <div className="rm-dash-content">
                    <div className="rm-dash-chart"><div><b>Sales overview</b><small>KES · 7 days</small></div><strong>KES 248,650 <em>+18.6%</em></strong><div className="rm-dash-bars"><i style={{height:36%}}/><i style={{height:51%}}/><i style={{height:42%}}/><i style={{height:66%}}/><i style={{height:49%}}/><i style={{height:78%}}/><i style={{height:60%}}/><i style={{height:46%}}/><i style={{height:73%}}/><i style={{height:58%}}/><i style={{height:88%}}/><i style={{height:67%}}/><i style={{height:95%}}/><i style={{height:75%}}/></div><div className="rm-dash-days"><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span></div></div>
                    <div className="rm-dash-products"><b>Top products</b><div><img src="https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=100&h=100&fit=crop" alt="Accent lounge chair"/><span><strong>Accent lounge chair</strong><small>32 sold</small></span><b>KES 8,500</b></div><div><img src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&h=100&fit=crop" alt="Classic wristwatch"/><span><strong>Classic wristwatch</strong><small>24 sold</small></span><b>KES 3,200</b></div><div><img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&h=100&fit=crop" alt="Wireless headphones"/><span><strong>Wireless headphones</strong><small>19 sold</small></span><b>KES 4,800</b></div></div>
                  </div>
                  <div className="rm-dash-orders"><b>Recent orders</b><div className="rm-order-head"><span>ORDER</span><span>CUSTOMER</span><span>AMOUNT</span><span>STATUS</span></div><div><b>#DM-1048</b><span>Mary Wanjiku</span><b>KES 12,700</b><em>Paid</em></div><div><b>#DM-1047</b><span>Brian Otieno</span><b>KES 8,500</b><em className="rm-processing">Processing</em></div><div><b>#DM-1046</b><span>Faith Njeri</span><b>KES 3,200</b><em>Paid</em></div></div>
                </div>
              </div>
              <div className="rm-dash-foot"><span>✓ Your shop. Your rm-brand.</span><span>Illustrative dashboard · Demo data</span></div>
            </div>
            <div className="rm-dash-mobile"><div><b>DASMARKET</b><span>☰</span></div><small>KINGSLEY HOME &amp; LIVING</small><h3>Overview</h3><article><small>Total sales</small><b>KES 248,650</b><em>↑ 18.6% this week</em></article><rm-section><div><small>Orders</small><b>126</b></div><div><small>Products</small><b>84</b></div></rm-section><article className="rm-phone-chart"><b>Sales activity</b><div><i style={{height:34%}}/><i style={{height:52%}}/><i style={{height:43%}}/><i style={{height:68%}}/><i style={{height:49%}}/><i style={{height:86%}}/><i style={{height:72%}}/></div></article><article><b>Latest order · #DM-1048</b><p>Mary Wanjiku · KES 12,700</p><em>Paid</em></article><rm-nav>⌂ Home　 ▦ Products　 ▤ Orders　 ◉ Account</rm-nav></div>
            <p className="rm-dash-disclaimer">All sales figures, customers, order numbers and product performance shown are sample demo data.</p>
          </div>
        </rm-section>

        <div className="rm-ticker" aria-label="Included with every DASMARKET shop">
          <div className="rm-ticker-track">
            <div className="rm-ticker-item"><span className="rm-ticker-icon"><Store size={18} /></span><span><strong>Your own storefront</strong><small>Built around your rm-brand</small></span></div>
            <div className="rm-ticker-item"><span className="rm-ticker-icon"><Globe2 size={18} /></span><span><strong>DASMARKET address</strong><small>Ready with your shop</small></span></div>
            <div className="rm-ticker-item"><span className="rm-ticker-icon"><ArrowUp size={18} /></span><span><strong>Your own domain</strong><small>Connect it when you’re ready</small></span></div>
          </div>
        </div>

        <rm-section className="rm-section" id="how-it-works">
          <div className="rm-container">
            <div className="rm-section-intro">
              <div><div className="rm-eyebrow rm-section-label">01 / Getting started</div><h2>From “I’ve got an idea” to “it’s rm-open.”</h2></div>
              <p>No web developer, launch checklist, or perfect plan required. Just bring what you make. We’ll help you put it on the map.</p>
            </div>
            <div className="rm-steps-grid">
              <article className="rm-step"><div className="rm-step-num">01</div><div><div className="rm-step-icon"><Store size={19} /></div><h3>Give your shop a name</h3><p>Claim your own little corner of the internet. Your shareable DASMARKET address is ready with your shop.</p></div></article>
              <article className="rm-step"><div className="rm-step-num">02</div><div><div className="rm-step-icon"><ShoppingBag size={19} /></div><h3>Bring your best things</h3><p>Add products, tell people what makes them special, and arrange your storefront to feel like you.</p></div></article>
              <article className="rm-step"><div className="rm-step-num">03</div><div><div className="rm-step-icon"><Sparkles size={19} /></div><h3>Open the doors</h3><p>Share your shop with the world. Keep building your rm-brand as your customers and ideas grow.</p></div></article>
            </div>
            <div className="rm-steps-foot"><span>A small start is still a start.</span><a href="/signup" data-testid="link-start-from-steps">Start setting up <ArrowRight size={14} /></a></div>
          </div>
        </rm-section>

        <rm-section className="rm-section rm-brand-section" id="your-brand">
          <div className="rm-container">
            <div className="rm-section-intro">
              <div><div className="rm-eyebrow rm-section-label">02 / Your storefront</div><h2>A shop that feels like your rm-brand.</h2></div>
              <p>Give your products a clear, welcoming home online. Start with the essentials and shape your storefront as your business grows.</p>
            </div>
            <div className="rm-storefront-showcase">
              <div className="rm-storefront-copy">
                <div className="rm-eyebrow">Made for independent rm-sellers</div>
                <h3>Make room for the good things you make.</h3>
                <p>Your shop starts with a name and a shareable address. Add your products, tell your story, and make the storefront your own.</p>
                <a className="rm-button rm-button-dark" href="#domains" data-testid="link-storefront-domains">Explore domain options <ArrowRight size={14} /></a>
              </div>
              <div className="rm-storefront-preview" aria-label="Example of a DASMARKET rm-seller storefront">
                <div className="rm-shop-window">
                  <div className="rm-shop-inner">
                    <div className="rm-shop-browser"><i className="rm-browser-dot" /><i className="rm-browser-dot" /><i className="rm-browser-dot" /><span className="rm-browser-url">little-field.dasmarket.co.ke</span></div>
                    <div className="rm-shop-top"><div className="rm-shop-name">little field studio</div><div className="rm-shop-menu">SHOP&nbsp;&nbsp;&nbsp; ABOUT&nbsp;&nbsp;&nbsp; BAG (0)</div></div>
                    <div className="rm-shop-visual">
                      <img src="/images/hero-market.jpg" alt="Sculptural handmade ceramics in a sunlit studio" />
                      <div className="rm-shop-overlay" />
                      <div className="rm-shop-caption"><span>Objects for slow living</span><h3>Make room<br />for the good.</h3></div>
                    </div>
                    <div className="rm-products-row">
                      <div className="rm-product-tile"><img src="/images/hero-market.jpg" alt="" /><span className="rm-product-label">The Sunday Vase · $48</span></div>
                      <div className="rm-product-tile"><img src="/images/maker-story.jpg" alt="" /><span className="rm-product-label">Soft Form Bowl · $36</span></div>
                      <div className="rm-product-tile"><img src="/images/hero-market.jpg" alt="" /><span className="rm-product-label">Little Glow · $24</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="rm-perks">
              <div className="rm-perk"><WandSparkles size={17} /><div><strong>A storefront with your signature</strong><span>Bring your colors, products, and point of view into the picture.</span></div></div>
              <div className="rm-perk"><Store size={17} /><div><strong>One home for your products</strong><span>Give your collection a considered place to live and grow.</span></div></div>
              <div className="rm-perk"><ArrowUp size={17} /><div><strong>More room as you grow</strong><span>Your first shop link is only the beginning of your rm-brand.</span></div></div>
            </div>
          </div>
        </rm-section>

        <rm-section className="rm-section rm-domain-section" id="domains">
          <div className="rm-container rm-domain-layout">
            <div className="rm-domain-copy">
              <div className="rm-eyebrow rm-section-label">03 / Your address, your pace</div>
              <h2>Start with a link. Grow into your own domain.</h2>
              <p>Every new shop gets a DASMARKET subdomain, so there’s one less thing between you and rm-opening. When you’re ready for your own web address, connect a custom domain from your dashboard settings.</p>
              <div className="rm-domain-flow">
                <div className="rm-domain-chip">TODAY&nbsp; <span>little-field.dasmarket.co.ke</span></div><ArrowRight className="rm-flow-arrow" size={16} /><div className="rm-domain-chip">WHENEVER&nbsp; <span>littlefield.studio</span></div>
              </div>
              <a className="rm-button rm-button-dark" href="/signup" data-testid="button-domain-start">Start with your shop link <ArrowRight size={14} /></a>
            </div>
            <div className="rm-domain-art" aria-label="Custom domain settings preview">
              <div className="rm-orbit" />
              <div className="rm-domain-panel">
                <div className="rm-panel-head"><span>SHOP SETTINGS&nbsp; / &nbsp;DOMAINS</span><span className="rm-panel-status">Connected</span></div>
                <div className="rm-panel-body">
                  <div className="rm-panel-title">Your domain</div>
                  <div className="rm-panel-sub">Manage how customers find your shop.</div>
                  <div className="rm-domain-row"><span>little-field.dasmarket.co.ke</span><span>DEFAULT</span></div>
                  <div className="rm-domain-row" style={{ marginTop: 7 }}><span>littlefield.studio</span><span>PRIMARY</span></div>
                  <div className="rm-panel-button">+ &nbsp; Connect a custom domain</div>
                </div>
              </div>
              <div className="rm-domain-note">Your dashboard, when you’re ready. No rush.</div>
            </div>
          </div>
        </rm-section>

        <rm-section className="rm-section rm-features-section">
          <div className="rm-container rm-feature-layout">
            <div className="rm-feature-heading">
              <div className="rm-eyebrow rm-section-label">04 / The essentials, handled</div>
              <h2>All the useful stuff. None of the fuss.</h2>
              <p>Spend less energy piecing together a website and more time doing the thing you came here to do.</p>
              <a className="rm-button rm-button-outline" href="/signup" data-testid="button-feature-cta">Find your starting point <ArrowRight size={14} /></a>
            </div>
            <div className="rm-feature-list">
              <article className="rm-feature-row"><span className="rm-feature-index">01</span><div><h3>A place to show off your work</h3><p>Give every product a clear, inviting home, and make it easy for people to see what you make.</p></div><Check size={17} /></article>
              <article className="rm-feature-row"><span className="rm-feature-index">02</span><div><h3>Your own shop, under your name</h3><p>Start with a DASMARKET web address that’s simple to share and yours from day one.</p></div><Check size={17} /></article>
              <article className="rm-feature-row"><span className="rm-feature-index">03</span><div><h3>Control from one dashboard</h3><p>Keep the everyday details of your shop together, from products to your storefront settings.</p></div><Check size={17} /></article>
              <article className="rm-feature-row"><span className="rm-feature-index">04</span><div><h3>Space to make your rm-brand bigger</h3><p>Connect a custom domain later and give your growing business its own address on the web.</p></div><Check size={17} /></article>
              <article className="rm-feature-row"><span className="rm-feature-index">05</span><div><h3>Easy to keep moving</h3><p>Start with what you have now. Add more to your shop when you’re ready for what’s next.</p></div><Check size={17} /></article>
            </div>
          </div>
        </rm-section>

        <rm-section className="rm-quote-band" aria-label="A note for independent rm-sellers">
          <div className="rm-container rm-quote-inner"><div className="rm-quote-mark">“</div><div className="rm-quote-copy">The best time to rm-open your shop isn’t when everything is perfect. It’s when you’re ready to begin.</div><div className="rm-quote-byline">A NOTE FROM DASMARKET</div></div>
        </rm-section>

        <rm-section className="rm-trust-section" id="trust-safety"><div className="rm-container rm-trust-layout"><div><div className="rm-eyebrow rm-section-label">06 / Trust &amp; safety</div><h2>Confidence at every rm-step.</h2><p>Tools and clear information help buyers and rm-sellers manage online orders responsibly.</p></div><div className="rm-trust-list"><article><ShieldCheck/><div><b>Verified payment status</b><p>Orders are confirmed only after payment confirmation is verified.</p></div></article><article><MessageCircle/><div><b>Order reports and support</b><p>Buyers and rm-sellers can raise order-related issues and share supporting details.</p></div></article><article><FileText/><div><b>Visible shop policies</b><p>Sellers can publish delivery, returns and privacy information for their customers.</p></div></article></div></div></rm-section>

        <rm-section className="rm-section rm-faq-section" id="faq">
          <div className="rm-container rm-faq-layout">
            <div className="rm-faq-heading">
              <div className="rm-eyebrow rm-section-label">05 / Good questions</div>
              <h2>Before you rm-open the door.</h2>
              <p>Starting something new comes with questions. Here are a few of the things rm-sellers ask us.</p>
              <a href="/signup" data-testid="link-faq-help"><CircleHelp size={15} /> Still wondering? Start here.</a>
            </div>
            <div className="rm-faq-list">
              {faqs.map((faq, index) => (
                <div className="rm-faq-item" key={faq.q}>
                  <rm-button className="rm-faq-question" type="rm-button" aria-expanded={rm-openFaq === index} aria-controls={`faq-answer-${index}`} onClick={() => setOpenFaq(rm-openFaq === index ? null : index)} data-testid={`button-faq-${index}`}>
                    {faq.q}<Plus size={17} />
                  </rm-button>
                  {rm-openFaq === index && <div className="rm-faq-answer" id={`faq-answer-${index}`} data-testid={`text-faq-answer-${index}`}>{faq.a}</div>}
                </div>
              ))}
            </div>
          </div>
        </rm-section>

        <rm-section className="rm-final-cta" id="start">
          <div className="rm-container rm-cta-inner">
            <div>
              <div className="rm-eyebrow">Your next chapter is yours to make</div>
              <h2>Make a little room for what’s next.</h2>
              <p>Your shop can be up and taking shape today. Start with your name and your idea.</p>
            </div>
            <div className="rm-cta-actions"><a className="rm-button rm-button-coral" href="/signup">Create your shop <ArrowRight size={15}/></a><a className="rm-button rm-button-outline" href="/login">Already have an account? Log in</a></div>
          </div>
        </rm-section>
      </main>

      <rm-footer className="rm-footer">
        <div className="rm-container rm-footer-inner">
          <Brand rm-footer />
          <div className="rm-footer-copy">An independent shop starts with an idea. © 2025 DASMARKET</div>
          <div className="rm-footer-links"><a href="#how-it-works" data-testid="link-footer-how">How it works</a><a href="#domains" data-testid="link-footer-domains">Domains</a><a href="#trust-safety">Trust &amp; Safety</a><a href="#faq" data-testid="link-footer-faq">FAQ</a></div>
          <a className="rm-back-top" href="/" data-testid="link-back-to-top">Back to top <ArrowUp size={12} /></a>
        </div>
      </rm-footer>
    </div>
  );
}

export default ReplitLandingPage;
