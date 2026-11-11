import { useRef, useState } from 'react';
import './replit-landing.css';
import { ArrowDown, ArrowRight, ArrowUp, Check, CheckCircle2, CircleHelp, Globe2, Menu, Plus, ShoppingBag, Sparkles, Store, WandSparkles, X, ShieldCheck, MessageCircle, FileText } from 'lucide-react';

const faqs = [
  { q: 'How do I create my shop?', a: 'Create a seller account, choose a shop name, and follow the setup steps in your dashboard. You can add products and prepare your storefront before sharing it with customers.' },
  { q: 'Do I need a website or technical experience?', a: 'No. DASMARKET provides a storefront and seller dashboard. You can manage your products and orders without building a website from scratch.' },
  { q: 'What web address does my shop get?', a: 'Your shop starts with its own address under dasmarket.co.ke, such as yourshop.dasmarket.co.ke. You can share that link with customers.' },
  { q: 'Can I connect a domain I already own?', a: 'Yes. Open Domains in your seller dashboard, add the domain you own, and follow the DNS instructions shown there. Your existing DASMARKET address remains available while you set up the custom domain.' },
  { q: 'Can I manage my shop from my phone?', a: 'Yes. The seller workspace is designed to be usable on mobile as well as desktop, so you can check orders and manage your shop while away from your computer.' },
  { q: 'Where do payments from my sales go?', a: 'Payments from completed sales are sent directly to the payout destination you configure for your shop, such as your Till, Paybill or bank account. Keep your payout details up to date in your seller settings.' },
  { q: 'How do customers pay?', a: 'Available payment methods are shown during checkout for each shop. Customers should follow the checkout instructions and wait for payment confirmation before treating an order as paid.' },
  { q: 'When is an order marked as paid?', a: 'An order should only be treated as paid after the payment status has been confirmed. A payment prompt or pending message by itself is not proof of a successful payment.' },
  { q: 'Can I set delivery, returns and privacy policies?', a: 'Sellers can publish shop policies so customers can review important information before ordering. Keep delivery timelines, return conditions and contact details clear and current.' },
  { q: 'What if there is a problem with an order?', a: 'Buyers and sellers can use the order reporting and support process to raise an issue and share relevant details. Keep your order reference and any supporting evidence available.' },
  { q: 'How do I keep my account secure?', a: 'Use a unique password, keep your sign-in details private, and sign out on shared devices. Never share a one-time verification code with someone who contacts you unexpectedly.' },
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
  const [supportPosition, setSupportPosition] = useState(() => {
    try { const saved = localStorage.getItem('dasmarket-support-position'); if (saved) return JSON.parse(saved); } catch {}
    return { x: Math.max(12, window.innerWidth - 174), y: Math.max(12, window.innerHeight - 86) };
  });
  const supportDrag = useRef<{ pointerX:number; pointerY:number; x:number; y:number; moved:boolean } | null>(null);
  function moveSupportButton(event: React.PointerEvent<HTMLAnchorElement>) {
    if (!supportDrag.current) return;
    const drag = supportDrag.current;
    const dx = event.clientX - drag.pointerX, dy = event.clientY - drag.pointerY;
    if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
    if (drag.moved) setSupportPosition({
      x: Math.max(8, Math.min(window.innerWidth - 142, drag.x + dx)),
      y: Math.max(8, Math.min(window.innerHeight - 64, drag.y + dy))
    });
  }
  function finishSupportDrag() {
    if (!supportDrag.current) return;
    const moved = supportDrag.current.moved;
    supportDrag.current = null;
    try { localStorage.setItem('dasmarket-support-position', JSON.stringify(supportPosition)); } catch {}
    if (moved) supportWasDragged.current = true;
  }
  const supportWasDragged = useRef(false);
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
            <div className="rm-domain-art" aria-label="Your shop address options">
              <div className="rm-address-card">
                <div className="rm-address-card-head"><span className="rm-address-live-dot"/> YOUR SHOP IS LIVE</div>
                <div className="rm-address-card-label">YOUR DASMARKET ADDRESS</div>
                <strong>yourshop.dasmarket.co.ke</strong>
                <p>Ready to share as soon as your shop is set up.</p>
                <div className="rm-address-card-status"><CheckCircle2 size={16}/> Included with your shop</div>
              </div>
              <div className="rm-address-connector"><span/><small>WHEN YOUR BUSINESS IS READY</small><span/></div>
              <div className="rm-address-card rm-address-card-custom">
                <div className="rm-address-card-head"><Globe2 size={15}/> YOUR OWN DOMAIN</div>
                <strong>www.yourbrand.co.ke</strong>
                <p>Connect a domain you own from your seller dashboard. Your original shop link keeps working.</p>
                <div className="rm-address-card-status"><ArrowRight size={15}/> Optional · Connect later</div>
              </div>
            </div>
          </div>
        </section>

        <section className="rm-section rm-tools-section" id="seller-dashboard">
          <div className="rm-container">
            <div className="rm-section-intro">
              <div><div className="rm-eyebrow rm-section-label">04 / Run your shop</div><h2>The tools behind your storefront.</h2></div>
              <p>Manage the work that happens after your shop goes live—from adding products to fulfilling orders and keeping customers informed.</p>
            </div>
            <div className="rm-tools-grid">
              <article><span>01</span><div><ShoppingBag size={20}/><h3>Products &amp; stock</h3><p>Add products, update prices, organise categories and keep stock information current.</p></div></article>
              <article><span>02</span><div><FileText size={20}/><h3>Orders &amp; delivery</h3><p>Review incoming orders, track fulfilment and keep delivery details organised.</p></div></article>
              <article><span>03</span><div><ArrowUp size={20}/><h3>Payments &amp; payouts</h3><p>Review transaction status and configure the payout destination for your shop.</p></div></article>
              <article><span>04</span><div><Globe2 size={20}/><h3>Domains &amp; branding</h3><p>Use your DASMARKET shop address and connect a domain you own when ready.</p></div></article>
              <article><span>05</span><div><MessageCircle size={20}/><h3>Customer support</h3><p>Manage customer questions and use the order-reporting process when something goes wrong.</p></div></article>
              <article><span>06</span><div><ShieldCheck size={20}/><h3>Shop policies</h3><p>Publish clear delivery, returns and privacy information for customers before checkout.</p></div></article>
            </div>
            <div className="rm-tools-note"><CheckCircle2 size={17}/><p><b>One seller account, one shop workspace.</b> Keep your shop operations together and manage them from desktop or mobile.</p></div>
          </div>
        </section>

        <section className="rm-trust-section" id="trust-safety">
          <div className="rm-container">
            <div className="rm-trust-intro">
              <div><div className="rm-eyebrow rm-section-label">06 / Trust &amp; safety</div><h2>Know what happens.<br/>Know how you’re protected.</h2></div>
              <p>Clear payment records, shop information and a way to raise concerns help everyone trade with confidence. These are the practical checks to make before and after an order.</p>
            </div>
            <div className="rm-trust-list">
              <article className="rm-trust-row"><span className="rm-trust-number">01</span><span className="rm-trust-row-icon"><ShieldCheck size={22}/></span><div className="rm-trust-row-title"><small>PAYMENTS</small><h3>Only confirmed payments count.</h3></div><p>A payment prompt is not proof of payment. Check the confirmed transaction and order status before handing over goods or arranging delivery.</p></article>
              <article className="rm-trust-row"><span className="rm-trust-number">02</span><span className="rm-trust-row-icon"><MessageCircle size={22}/></span><div className="rm-trust-row-title"><small>ORDER SUPPORT</small><h3>There’s a clear way to report a problem.</h3></div><p>Buyers and sellers can raise an order report, share the order reference and provide supporting information for review.</p></article>
              <article className="rm-trust-row"><span className="rm-trust-number">03</span><span className="rm-trust-row-icon"><FileText size={22}/></span><div className="rm-trust-row-title"><small>SHOP INFORMATION</small><h3>Check the shop’s terms first.</h3></div><p>Review delivery charges, timelines, returns and privacy information before you place an order. Sellers should keep these details current.</p></article>
              <article className="rm-trust-row"><span className="rm-trust-number">04</span><span className="rm-trust-row-icon"><CheckCircle2 size={22}/></span><div className="rm-trust-row-title"><small>ACCOUNT SECURITY</small><h3>Keep your account in your hands.</h3></div><p>Use a unique password. Never share your password, M-PESA PIN or one-time verification code with anyone.</p></article>
            </div>
            <div className="rm-trust-reminder"><ShieldCheck size={20}/><p><b>A quick safety reminder</b><span>DASMARKET support will never ask you to disclose your password, M-PESA PIN or OTP. If a message feels suspicious, stop and contact us through the official support channel.</span></p></div>
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

      <a className="rm-whatsapp-float" href="https://wa.me/254758884861?text=Hello%20DASMARKET%20support%2C%20I%20need%20some%20help." target="_blank" rel="noreferrer" aria-label="Drag to move. Talk to DASMARKET support on WhatsApp" title="Drag to move" style={{left:supportPosition.x,top:supportPosition.y,right:'auto',bottom:'auto',touchAction:'none'}} onPointerDown={e=>{supportDrag.current={pointerX:e.clientX,pointerY:e.clientY,x:supportPosition.x,y:supportPosition.y,moved:false};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={moveSupportButton} onPointerUp={finishSupportDrag} onPointerCancel={finishSupportDrag} onClick={e=>{if(supportWasDragged.current){e.preventDefault();supportWasDragged.current=false;}}}><MessageCircle size={24}/><span>Talk to us</span><i aria-hidden="true">↕</i></a>

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
