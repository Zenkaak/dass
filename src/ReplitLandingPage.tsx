import { useState } from 'react';
import './replit-landing.css';
import { ArrowDown, ArrowRight, ArrowUp, Check, CheckCircle2, CircleHelp, Globe2, Menu, Plus, ShoppingBag, Sparkles, Store, WandSparkles, X, ShieldCheck, MessageCircle, FileText } from 'lucide-react';

const faqs = [
  { q: 'How do I create my shop?', a: 'Create a seller account, choose a shop name, and follow the setup steps in your dashboard. You can add products and prepare your storefront before sharing it with customers.' },
  { q: 'Do I need a website or technical experience?', a: 'No. DASMARKET provides a storefront and seller dashboard. You can manage your products and orders without building a website from scratch.' },
  { q: 'What web address does my shop get?', a: 'Your shop starts with its own address under dasmarket.co.ke, such as yourshop.dasmarket.co.ke. You can share that link with customers.' },
  { q: 'Can I connect a domain I already own?', a: 'Yes. Open Domains in your seller dashboard, add the domain you own, and follow the DNS instructions shown there. Your existing DASMARKET address remains available while you set up the custom domain.' },
  { q: 'How long does a custom domain take to work?', a: 'After you update the DNS records, verification and propagation can take some time. The dashboard should show the connection status; do not remove your original shop address while the new one is being verified.' },
  { q: 'Can I manage my shop from my phone?', a: 'Yes. The seller workspace is designed to be usable on mobile as well as desktop, so you can check orders and manage your shop while away from your computer.' },
  { q: 'How do customers pay?', a: 'Available payment methods are shown during checkout for each shop. Customers should follow the checkout instructions and wait for payment confirmation before treating an order as paid.' },
  { q: 'When is an order marked as paid?', a: 'An order should only be treated as paid after the payment status has been confirmed. A payment prompt or pending message by itself is not proof of a successful payment.' },
  { q: 'Can I set delivery, returns and privacy policies?', a: 'Sellers can publish shop policies so customers can review important information before ordering. Keep delivery timelines, return conditions and contact details clear and current.' },
  { q: 'What if there is a problem with an order?', a: 'Buyers and sellers can use the order reporting and support process to raise an issue and share relevant details. Keep your order reference and any supporting evidence available.' },
  { q: 'How do I keep my account secure?', a: 'Use a unique password, keep your sign-in details private, and sign out on shared devices. Never share a one-time verification code with someone who contacts you unexpectedly.' },
  { q: 'What does it cost to use DASMARKET?', a: 'Any applicable plan charges or transaction fees should be reviewed on the current pricing or plan information shown during registration and in your account. Check those details before publishing.' },
  { q: 'Can I change my shop name and appearance?', a: 'You can manage your shop details and available storefront settings from your seller dashboard. Some address changes may affect the link customers already have, so review the confirmation carefully.' },
  { q: 'How do I contact DASMARKET support?', a: 'Use the support contact options published on the DASMARKET website or inside your account. For an order issue, include the order reference so the team can locate the right transaction.' },
];

function Brand({ footer = false }: { footer?: boolean }) {
  return (
    <a className="rm-brand" href="/" aria-label="DASMARKET home" data-testid="link-brand-home">
      <span className="rm-brand-mark">d.</span>
      <span>DASMARKET</span>
      {footer && <span className="rm-eyebrow" style={{ fontSize: 8, marginLeft: 2 }}>YOUR SHOP. YOUR BRAND.</span>}
    </a>
  );
}

export function ReplitLandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="rm-page-shell" id="top">
      <header className="rm-nav-wrap">
        <nav className="rm-nav rm-container" aria-label="Main navigation">
          <Brand />
          <button className="rm-mobile-toggle" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} data-testid="button-mobile-menu">
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
          <div className={`rm-nav-links${menuOpen ? " rm-open" : ""}`}>
            <a href="#how-it-works" onClick={closeMenu} data-testid="link-how-it-works">How it works</a>
            <a href="#your-brand" onClick={closeMenu} data-testid="link-your-brand">Your brand</a>
            <a href="#domains" onClick={closeMenu} data-testid="link-domains">Domains</a><a href="#seller-dashboard" onClick={closeMenu}>Dashboard</a><a href="#trust-safety" onClick={closeMenu}>Trust &amp; Safety</a>
            <a href="#faq" onClick={closeMenu} data-testid="link-faq">FAQ</a>
          </div>
          <div className="rm-nav-actions">
            <a className="rm-nav-login" href="/login" data-testid="link-sign-in">Sign in</a>
            <a className="rm-button rm-button-dark" href="/signup" data-testid="button-nav-start">Open your shop <ArrowRight size={14} /></a>
          </div>
        </nav>
      </header>

      <main>
        <section className="rm-hero" aria-labelledby="hero-title">
          <div className="rm-container rm-hero-grid">
            <div className="rm-hero-copy">
              <div className="rm-hero-kicker rm-eyebrow rm-reveal"><span className="rm-kicker-dot" /> A home for the things you make</div>
              <h1 className="rm-display rm-reveal rm-reveal-delay" id="hero-title">Your shop,<br />all in one place.</h1>
              <p className="rm-reveal rm-reveal-delay-2">Bring your products together in a storefront made for your brand. Every shop gets its own shareable DASMARKET address from day one.</p>
              <ul className="rm-hero-benefits rm-reveal rm-reveal-delay-2">
                <li><CheckCircle2 size={16} /> Your own branded storefront</li>
                <li><CheckCircle2 size={16} /> A DASMARKET subdomain, ready to share</li>
                <li><CheckCircle2 size={16} /> Connect a custom domain from settings</li>
              </ul>
              <div className="rm-hero-ctas rm-reveal rm-reveal-delay-2">
                <a className="rm-button rm-button-coral" href="/signup" data-testid="button-start-shop">Create your shop <ArrowRight size={15} /></a>
                <a className="rm-button rm-button-outline" href="#how-it-works" data-testid="button-see-how">See how it works <ArrowDown size={14} /></a>
              </div>
            </div>
          </div>
        </section>

        <div className="rm-ticker" aria-label="Included with every DASMARKET shop">
          <div className="rm-ticker-track">
            <div className="rm-ticker-item"><span className="rm-ticker-icon"><Store size={18} /></span><span><strong>Your own storefront</strong><small>Built around your brand</small></span></div>
            <div className="rm-ticker-item"><span className="rm-ticker-icon"><Globe2 size={18} /></span><span><strong>DASMARKET address</strong><small>Ready with your shop</small></span></div>
            <div className="rm-ticker-item"><span className="rm-ticker-icon"><ArrowUp size={18} /></span><span><strong>Your own domain</strong><small>Connect it when you’re ready</small></span></div>
          </div>
        </div>

        <section className="rm-section" id="how-it-works">
          <div className="rm-container">
            <div className="rm-section-intro">
              <div><div className="rm-eyebrow rm-section-label">01 / Getting started</div><h2>From “I’ve got an idea” to “it’s open.”</h2></div>
              <p>No web developer, launch checklist, or perfect plan required. Just bring what you make. We’ll help you put it on the map.</p>
            </div>
            <div className="rm-steps-grid">
              <article className="rm-step"><div className="rm-step-num">01</div><div><div className="rm-step-icon"><Store size={19} /></div><h3>Give your shop a name</h3><p>Claim your own little corner of the internet. Your shareable DASMARKET address is ready with your shop.</p></div></article>
              <article className="rm-step"><div className="rm-step-num">02</div><div><div className="rm-step-icon"><ShoppingBag size={19} /></div><h3>Bring your best things</h3><p>Add products, tell people what makes them special, and arrange your storefront to feel like you.</p></div></article>
              <article className="rm-step"><div className="rm-step-num">03</div><div><div className="rm-step-icon"><Sparkles size={19} /></div><h3>Open the doors</h3><p>Share your shop with the world. Keep building your brand as your customers and ideas grow.</p></div></article>
            </div>
            <div className="rm-steps-foot"><span>A small start is still a start.</span><a href="/signup" data-testid="link-start-from-steps">Start setting up <ArrowRight size={14} /></a></div>
          </div>
        </section>

        <section className="rm-section rm-brand-section" id="your-brand">
          <div className="rm-container">
            <div className="rm-section-intro">
              <div><div className="rm-eyebrow rm-section-label">02 / Your storefront</div><h2>A shop that feels like your brand.</h2></div>
              <p>Give your products a clear, welcoming home online. Start with the essentials and shape your storefront as your business grows.</p>
            </div>
            <div className="rm-storefront-showcase">
              <div className="rm-storefront-copy">
                <div className="rm-eyebrow">Made for independent sellers</div>
                <h3>Make room for the good things you make.</h3>
                <p>Your shop starts with a name and a shareable address. Add your products, tell your story, and make the storefront your own.</p>
                <a className="rm-button rm-button-dark" href="#domains" data-testid="link-storefront-domains">Explore domain options <ArrowRight size={14} /></a>
              </div>
              <div className="rm-storefront-preview" aria-label="Example of a DASMARKET seller storefront">
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
                      <div className="rm-product-tile"><img src="/images/hero-market.jpg" alt="" /><span className="rm-product-label">The Sunday Vase · KES 4,800</span></div>
                      <div className="rm-product-tile"><img src="/images/maker-story.jpg" alt="" /><span className="rm-product-label">Soft Form Bowl · KES 3,600</span></div>
                      <div className="rm-product-tile"><img src="/images/hero-market.jpg" alt="" /><span className="rm-product-label">Little Glow · KES 2,400</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="rm-perks">
              <div className="rm-perk"><WandSparkles size={17} /><div><strong>A storefront with your signature</strong><span>Bring your colors, products, and point of view into the picture.</span></div></div>
              <div className="rm-perk"><Store size={17} /><div><strong>One home for your products</strong><span>Give your collection a considered place to live and grow.</span></div></div>
              <div className="rm-perk"><ArrowUp size={17} /><div><strong>More room as you grow</strong><span>Your first shop link is only the beginning of your brand.</span></div></div>
            </div>
          </div>
        </section>

        <section className="rm-section rm-domain-section" id="domains">
          <div className="rm-container rm-domain-layout">
            <div className="rm-domain-copy">
              <div className="rm-eyebrow rm-section-label">03 / Your address, your pace</div>
              <h2>Your shop deserves an address of its own.</h2>
              <p>Open with a ready-to-share DASMARKET address. When your brand is ready for its own domain, connect it from your seller dashboard—without having to build a website or start over.</p>
              <div className="rm-domain-journey">
                <div className="rm-domain-stage"><span className="rm-domain-stage-no">01</span><div><small>START HERE</small><strong>yourshop.dasmarket.co.ke</strong><p>Your shop link is ready as part of setup.</p></div><span className="rm-domain-stage-tag">Included</span></div>
                <div className="rm-domain-journey-line"><span /></div>
                <div className="rm-domain-stage"><span className="rm-domain-stage-no">02</span><div><small>WHEN YOU’RE READY</small><strong>www.yourbrand.co.ke</strong><p>Connect a domain you already own in your dashboard.</p></div><span className="rm-domain-stage-tag">Your choice</span></div>
              </div>
              <a className="rm-button rm-button-dark" href="/signup" data-testid="button-domain-start">Create your shop <ArrowRight size={14} /></a>
              <p className="rm-domain-footnote">Keep your original DASMARKET link while your custom domain is being connected.</p>
            </div>
            <div className="rm-domain-art" aria-label="Illustration of a shop moving from a DASMARKET address to a custom domain">
              <div className="rm-domain-art-kicker">A BRAND THAT GROWS WITH YOU</div>
              <div className="rm-domain-browser">
                <div className="rm-domain-browser-top"><i/><i/><i/><span>YOUR ONLINE SHOP</span></div>
                <div className="rm-domain-browser-body">
                  <div className="rm-domain-mini-brand"><span>d.</span><b>YOUR BRAND</b><small>SHOP&nbsp;&nbsp; ABOUT&nbsp;&nbsp; CONTACT</small></div>
                  <div className="rm-domain-visual"><div className="rm-domain-visual-copy"><small>MADE BY YOU</small><b>A home for<br/>your best work.</b><span>Explore the collection <ArrowRight size={12}/></span></div><div className="rm-domain-visual-shape"><div/><i/></div></div>
                  <div className="rm-domain-browser-url"><Globe2 size={13}/> yourshop.dasmarket.co.ke <span>LIVE SHOP LINK</span></div>
                </div>
              </div>
              <div className="rm-domain-custom-note"><Globe2 size={17}/><span><b>Later, make it yours.</b><small>Connect your own domain when the time feels right.</small></span><CheckCircle2 size={17}/></div>
            </div>
          </div>
        </section>

        <section className="rm-dashboard-section" id="seller-dashboard">
          <div className="rm-container">
            <div className="rm-section-intro"><div><div className="rm-eyebrow rm-section-label">04 / Your seller dashboard</div><h2>See your whole shop at a glance.</h2></div><p>Products, orders, payments and performance—together in one workspace. The example below uses illustrative Kenyan shop data.</p></div>
            <div className="rm-dashboard-window">
              <div className="rm-dash-top"><b><span className="rm-dash-mark">d.</span> DASMARKET <small>SELLER WORKSPACE</small></b><span>● DEMO STORE</span></div>
              <div className="rm-dash-layout"><aside><b>▦ &nbsp; Overview</b><span>▤ &nbsp; Products</span><span>▣ &nbsp; Orders</span><span>↗ &nbsp; Payments</span><span>◎ &nbsp; Domains</span><span>⚙ &nbsp; Settings</span></aside>
                <div className="rm-dash-main">
                  <div className="rm-dash-greeting"><div><small>KINGSLEY HOME &amp; LIVING · NAIROBI, KENYA</small><h3>Good morning, James</h3><p>Here’s what’s happening in your shop.</p></div><span>Last 7 days⌄</span></div>
                  <div className="rm-dash-stats"><article><small>Total sales</small><b>KES 248,650</b><em>↑ 18.6% this week</em></article><article><small>Orders</small><b>126</b><em>12 new today</em></article><article><small>Products</small><b>84</b><em>6 low in stock</em></article><article><small>To fulfil</small><b>18</b><em>Needs attention</em></article></div>
                  <div className="rm-dash-content"><div className="rm-dash-chart"><div><b>Sales overview</b><small>KES · 7 days</small></div><strong>KES 248,650 <em>+18.6%</em></strong><div className="rm-dash-bars"><i style={{height:'36%'}}/><i style={{height:'51%'}}/><i style={{height:'42%'}}/><i style={{height:'66%'}}/><i style={{height:'49%'}}/><i style={{height:'78%'}}/><i style={{height:'60%'}}/><i style={{height:'46%'}}/><i style={{height:'73%'}}/><i style={{height:'58%'}}/><i style={{height:'88%'}}/><i style={{height:'67%'}}/><i style={{height:'95%'}}/><i style={{height:'75%'}}/></div><div className="rm-dash-days"><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span></div></div>
                    <div className="rm-dash-products"><b>Top products</b><div><img src="https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=100&h=100&fit=crop" alt="Accent lounge chair"/><span><strong>Accent lounge chair</strong><small>32 sold</small></span><b>KES 8,500</b></div><div><img src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100&h=100&fit=crop" alt="Classic wristwatch"/><span><strong>Classic wristwatch</strong><small>24 sold</small></span><b>KES 3,200</b></div><div><img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&h=100&fit=crop" alt="Wireless headphones"/><span><strong>Wireless headphones</strong><small>19 sold</small></span><b>KES 4,800</b></div></div></div>
                  <div className="rm-dash-orders"><b>Recent orders</b><div className="rm-order-head"><span>ORDER</span><span>CUSTOMER</span><span>AMOUNT</span><span>STATUS</span></div><div><b>#DM-1048</b><span>Mary Wanjiku</span><b>KES 12,700</b><em>Paid</em></div><div><b>#DM-1047</b><span>Brian Otieno</span><b>KES 8,500</b><em className="rm-processing">Processing</em></div><div><b>#DM-1046</b><span>Faith Njeri</span><b>KES 3,200</b><em>Paid</em></div></div>
                </div>
              </div><div className="rm-dash-foot"><span>✓ Your shop. Your brand.</span><span>Illustrative dashboard · Demo data</span></div>
            </div>
            <div className="rm-dash-mobile"><div className="rm-dash-mobile-head"><b>DASMARKET</b><span>☰</span></div><small>KINGSLEY HOME &amp; LIVING</small><h3>Overview</h3><article><small>Total sales</small><b>KES 248,650</b><em>↑ 18.6% this week</em></article><section><div><small>Orders</small><b>126</b></div><div><small>Products</small><b>84</b></div></section><article className="rm-phone-chart"><b>Sales activity</b><div><i style={{height:'34%'}}/><i style={{height:'52%'}}/><i style={{height:'43%'}}/><i style={{height:'68%'}}/><i style={{height:'49%'}}/><i style={{height:'86%'}}/><i style={{height:'72%'}}/></div></article><article><b>Latest order · #DM-1048</b><p>Mary Wanjiku · KES 12,700</p><em>Paid</em></article><nav>⌂ Home　 ▦ Products　 ▤ Orders　 ◉ Account</nav></div>
            <p className="rm-dash-disclaimer">All sales figures, customers, order numbers and product performance shown are sample demo data.</p>
          </div>
        </section>

        <section className="rm-section rm-features-section">
          <div className="rm-container rm-feature-layout">
            <div className="rm-feature-heading">
              <div className="rm-eyebrow rm-section-label">05 / The essentials, handled</div>
              <h2>All the useful stuff. None of the fuss.</h2>
              <p>Spend less energy piecing together a website and more time doing the thing you came here to do.</p>
              <a className="rm-button rm-button-outline" href="/signup" data-testid="button-feature-cta">Find your starting point <ArrowRight size={14} /></a>
            </div>
            <div className="rm-feature-list">
              <article className="rm-feature-row"><span className="rm-feature-index">01</span><div><h3>A place to show off your work</h3><p>Give every product a clear, inviting home, and make it easy for people to see what you make.</p></div><Check size={17} /></article>
              <article className="rm-feature-row"><span className="rm-feature-index">02</span><div><h3>Your own shop, under your name</h3><p>Start with a DASMARKET web address that’s simple to share and yours from day one.</p></div><Check size={17} /></article>
              <article className="rm-feature-row"><span className="rm-feature-index">03</span><div><h3>Control from one dashboard</h3><p>Keep the everyday details of your shop together, from products to your storefront settings.</p></div><Check size={17} /></article>
              <article className="rm-feature-row"><span className="rm-feature-index">04</span><div><h3>Space to make your brand bigger</h3><p>Connect a custom domain later and give your growing business its own address on the web.</p></div><Check size={17} /></article>
              <article className="rm-feature-row"><span className="rm-feature-index">05</span><div><h3>Easy to keep moving</h3><p>Start with what you have now. Add more to your shop when you’re ready for what’s next.</p></div><Check size={17} /></article>
            </div>
          </div>
        </section>

        <section className="rm-quote-band" aria-label="A note for independent sellers">
          <div className="rm-container rm-quote-inner"><div className="rm-quote-mark">“</div><div className="rm-quote-copy">The best time to open your shop isn’t when everything is perfect. It’s when you’re ready to begin.</div><div className="rm-quote-byline">A NOTE FROM DASMARKET</div></div>
        </section>

        <section className="rm-trust-section" id="trust-safety">
          <div className="rm-container">
            <div className="rm-trust-intro"><div><div className="rm-eyebrow rm-section-label">06 / Trust &amp; safety</div><h2>Clear steps. Safer shopping.</h2></div><p>Trust is built through transparent information, careful payment checks and a clear way to raise concerns. Here’s what buyers and sellers should know.</p></div>
            <div className="rm-trust-grid">
              <article className="rm-trust-card rm-trust-featured"><span className="rm-trust-icon"><ShieldCheck size={21}/></span><small>01 / PAYMENT CLARITY</small><h3>Confirmation matters.</h3><p>A payment prompt is not the same as a completed payment. Orders should only be treated as paid after the payment status is confirmed.</p><span className="rm-trust-card-foot">Check the status before fulfilment</span></article>
              <article className="rm-trust-card"><span className="rm-trust-icon"><MessageCircle size={21}/></span><small>02 / ORDER SUPPORT</small><h3>A route to raise issues.</h3><p>Buyers and sellers can report an order concern and provide relevant order details and supporting information.</p></article>
              <article className="rm-trust-card"><span className="rm-trust-icon"><FileText size={21}/></span><small>03 / SHOP POLICIES</small><h3>Know what to expect.</h3><p>Review a shop’s delivery, returns and privacy information before placing an order. Sellers should keep these details accurate.</p></article>
              <article className="rm-trust-card"><span className="rm-trust-icon"><CheckCircle2 size={21}/></span><small>04 / ACCOUNT CARE</small><h3>Protect your sign-in.</h3><p>Use a strong unique password, keep verification codes private and avoid signing in on devices you do not trust.</p></article>
            </div>
            <div className="rm-trust-reminder"><ShieldCheck size={18}/><p><b>Stay alert.</b> DASMARKET will never need you to share your password or one-time verification code in a chat. If something feels wrong, pause and contact support through the official channels.</p></div>
          </div>
        </section>

        <section className="rm-section rm-faq-section" id="faq">
          <div className="rm-container rm-faq-layout">
            <div className="rm-faq-heading">
              <div className="rm-eyebrow rm-section-label">07 / Good questions</div>
              <h2>Before you open the door.</h2>
              <p>Starting something new comes with questions. Here are a few of the things sellers ask us.</p>
              <a href="/signup" data-testid="link-faq-help"><CircleHelp size={15} /> Still wondering? Start here.</a>
            </div>
            <div className="rm-faq-list">
              {faqs.map((faq, index) => (
                <div className="rm-faq-item" key={faq.q}>
                  <button className="rm-faq-question" type="button" aria-expanded={openFaq === index} aria-controls={`faq-answer-${index}`} onClick={() => setOpenFaq(openFaq === index ? null : index)} data-testid={`button-faq-${index}`}>
                    {faq.q}<Plus size={17} />
                  </button>
                  {openFaq === index && <div className="rm-faq-answer" id={`faq-answer-${index}`} data-testid={`text-faq-answer-${index}`}>{faq.a}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rm-final-cta" id="start">
          <div className="rm-container rm-cta-inner">
            <div>
              <div className="rm-eyebrow">Your next chapter is yours to make</div>
              <h2>Make a little room for what’s next.</h2>
              <p>Your shop can be up and taking shape today. Start with your name and your idea.</p>
            </div>
            <div className="rm-cta-actions"><a className="rm-button rm-button-coral" href="/signup">Create your shop <ArrowRight size={15}/></a><a className="rm-button rm-button-outline" href="/login">Already have an account? Log in</a></div>
          </div>
        </section>
      </main>

      <a className="rm-whatsapp-float" href="https://wa.me/?text=Hello%20DASMARKET%20support%2C%20I%20need%20some%20help." target="_blank" rel="noreferrer" aria-label="Contact DASMARKET on WhatsApp"><MessageCircle size={21}/><span>Chat with support</span></a>

      <footer className="rm-footer">
        <div className="rm-container rm-footer-inner">
          <Brand footer />
          <div className="rm-footer-copy">An independent shop starts with an idea. © 2026 DASMARKET</div>
          <div className="rm-footer-links"><a href="#how-it-works" data-testid="link-footer-how">How it works</a><a href="#domains" data-testid="link-footer-domains">Domains</a><a href="#trust-safety">Trust &amp; Safety</a><a href="#faq" data-testid="link-footer-faq">FAQ</a></div>
          <a className="rm-back-top" href="#top" data-testid="link-back-to-top">Back to top <ArrowUp size={12} /></a>
        </div>
      </footer>
    </div>
  );
}

export default ReplitLandingPage;
