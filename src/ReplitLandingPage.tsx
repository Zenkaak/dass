import { useRef, useState } from 'react';
import './replit-landing.css';
import { ArrowDown, ArrowRight, ArrowUp, CheckCircle2, CircleHelp, Globe2, Menu, Plus, ShoppingBag, Sparkles, Store, X, ShieldCheck, MessageCircle, FileText } from 'lucide-react';

const faqs = [
  { q: 'How do I create a shop?', a: 'Create a seller account, choose a shop name and follow the setup steps in your dashboard. Add your products and prepare your storefront before sharing it with customers.' },
  { q: 'Do I need technical experience?', a: 'No. DASMARKET provides the storefront and seller workspace. You can manage products and orders without building a website from scratch.' },
  { q: 'Can I use my own domain?', a: 'Yes. Your shop starts with a DASMARKET subdomain. You can connect a domain you own from the seller dashboard; your original shop address remains available.' },
  { q: 'Where do payments from my sales go?', a: 'Configure your shop payout destination in seller settings, such as your Till, Paybill or bank account. Keep those details current and review transaction status before fulfilment.' },
  { q: 'Can customers see my delivery and return policies?', a: 'Yes. Add your shop policies so customers can review delivery, returns and privacy information before placing an order.' },
  { q: 'What if there is a problem with an order?', a: 'Buyers and sellers can use the order reporting process to raise an issue and share relevant details. Include the order reference and supporting evidence.' }
];

function Brand({ footer = false }: { footer?: boolean }) {
  return (
    <a className="rm-brand" href="/" aria-label="DASMARKET home" data-testid="link-brand-home">
      <span className="rm-brand-mark" aria-hidden="true">D</span>
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
            <a href="#domains" onClick={closeMenu} data-testid="link-domains">Domains</a><a href="#seller-dashboard" onClick={closeMenu}>Seller tools</a><a href="#trust-safety" onClick={closeMenu}>Trust &amp; Safety</a>
            <a href="#faq" onClick={closeMenu} data-testid="link-faq">FAQ</a>
          </div>
          <div className="rm-nav-actions">
            <a className="rm-nav-login" href="/login" data-testid="link-sign-in">Sign in</a>
          </div>
        </nav>
      </header>

      <main>
        <section className="rm-hero" aria-labelledby="hero-title">
          <div className="rm-container rm-hero-grid">
            <div className="rm-hero-copy">
              <div className="rm-hero-kicker rm-eyebrow rm-reveal"><span className="rm-kicker-dot" /> A home for the things you make</div>
              <h1 className="rm-display rm-reveal rm-reveal-delay" id="hero-title">Your online shop.<br />Managed in one place.</h1>
              <p className="rm-reveal rm-reveal-delay-2">Launch a branded online store, manage orders and products, and connect your own domain—all from one seller account.</p>
              <ul className="rm-hero-benefits rm-reveal rm-reveal-delay-2">
                <li><CheckCircle2 size={16} /> A branded online storefront</li>
                <li><CheckCircle2 size={16} /> A shop address included</li>
                <li><CheckCircle2 size={16} /> Optional custom domain connection</li>
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
              <div><div className="rm-eyebrow rm-section-label">01 / Getting started</div><h2>Launch your online shop in three steps.</h2></div>

            </div>
            <div className="rm-steps-grid">
              <article className="rm-step"><div className="rm-step-num">01</div><div><div className="rm-step-icon"><Store size={19} /></div><h3>Create your seller account</h3><p>Choose your shop name and get a shareable DASMARKET web address.</p></div></article>
              <article className="rm-step"><div className="rm-step-num">02</div><div><div className="rm-step-icon"><ShoppingBag size={19} /></div><h3>Add your products</h3><p>Upload product details, images, prices and stock information.</p></div></article>
              <article className="rm-step"><div className="rm-step-num">03</div><div><div className="rm-step-icon"><Sparkles size={19} /></div><h3>Publish your storefront</h3><p>Publish your shop and share its link with customers.</p></div></article>
            </div>

          </div>
        </section>

        <section className="rm-section rm-domain-section" id="domains">
          <div className="rm-container rm-domain-layout">
            <div className="rm-domain-copy">
              <div className="rm-eyebrow rm-section-label">YOUR SHOP ADDRESS</div>
              <h2>A dedicated web address for your shop.</h2>
              <p>Every shop starts with a DASMARKET subdomain. You can connect a domain you already own from your seller dashboard whenever you’re ready.</p>
              <div className="rm-domain-journey">
                <div className="rm-domain-stage"><span className="rm-domain-stage-no">01</span><div><small>START HERE</small><strong>yourshop.dasmarket.co.ke</strong><p>Included when you create your shop.</p></div><span className="rm-domain-stage-tag">Included</span></div>
                <div className="rm-domain-journey-line"><span /></div>
                <div className="rm-domain-stage"><span className="rm-domain-stage-no">02</span><div><small>WHEN YOU’RE READY</small><strong>www.yourbrand.co.ke</strong><p>Connect a domain you own from your seller dashboard.</p></div><span className="rm-domain-stage-tag">Your choice</span></div>
              </div>
              <a className="rm-button rm-button-dark" href="/signup" data-testid="button-domain-start">Create your shop <ArrowRight size={14} /></a>
              <p className="rm-domain-footnote">Your DASMARKET address remains available when you connect a custom domain.</p>
            </div>
          </div>
        </section>

        <section className="rm-section rm-tools-section" id="seller-dashboard">
          <div className="rm-container">
            <div className="rm-section-intro">
              <div><div className="rm-eyebrow rm-section-label">04 / Run your shop</div><h2>Manage your shop from one workspace.</h2></div>

            </div>
            <div className="rm-dashboard-showcase">
              <div className="rm-dashboard-showcase-copy">
                <span className="rm-dashboard-tag">THE SELLER WORKSPACE</span>
                <h3>Your shop, at a glance.</h3>
                <p>Orders, sales, products, stock and store settings come together in one clear desktop workspace.</p>
                <ul>
                  <li><CheckCircle2 size={16}/> Track orders and sales</li>
                  <li><CheckCircle2 size={16}/> Manage products and inventory</li>
                  <li><CheckCircle2 size={16}/> Control payouts and your domain</li>
                </ul>
                <a className="rm-button rm-button-coral" href="/signup">Create your shop <ArrowRight size={15}/></a>
              </div>
              <div className="rm-dashboard-photo">
                <div className="rm-browser-bar"><span/><span/><span/><b>dashboard.dasmarket.co.ke</b><i>•••</i></div>
                <img src="/images/Manage%20Your%20Shop%20in%20One%20Workspace.png" alt="DASMARKET demo seller dashboard displayed on a laptop, showing orders, sales, products and shop management" loading="lazy"/>
                <div className="rm-dashboard-photo-caption"><span><i/> DASHBOARD DEMO</span><b>One workspace. Your whole business.</b></div>
              </div>
            </div>
            <div className="rm-tools-grid">
              <article><span>01</span><div><ShoppingBag size={20}/><h3>Products &amp; stock</h3><p>Add products, update prices, organise categories and keep stock information current.</p></div></article>
              <article><span>02</span><div><FileText size={20}/><h3>Orders &amp; delivery</h3><p>Review incoming orders, track fulfilment and keep delivery details organised.</p></div></article>
              <article><span>03</span><div><ArrowUp size={20}/><h3>Payments &amp; payouts</h3><p>Review transaction status and configure the payout destination for your shop.</p></div></article>
              <article><span>04</span><div><Globe2 size={20}/><h3>Domains &amp; branding</h3><p>Use your DASMARKET shop address and connect a domain you own when ready.</p></div></article>
              <article><span>05</span><div><MessageCircle size={20}/><h3>Customer support</h3><p>Manage customer questions and use the order-reporting process when something goes wrong.</p></div></article>
              <article><span>06</span><div><ShieldCheck size={20}/><h3>Shop policies</h3><p>Publish clear delivery, returns and privacy information for customers before checkout.</p></div></article>
            </div>

          </div>
        </section>

        <section className="rm-trust-section" id="trust-safety">
          <div className="rm-container">
            <div className="rm-trust-intro">
              <div><div className="rm-eyebrow rm-section-label">06 / Trust &amp; safety</div><h2>Clear information. Safer transactions.</h2></div>

            </div>
            <div className="rm-trust-list">
              <article className="rm-trust-row"><span className="rm-trust-number">01</span><span className="rm-trust-row-icon"><ShieldCheck size={22}/></span><div className="rm-trust-row-title"><small>PAYMENTS</small><h3>Confirm payment before fulfilment.</h3></div><p>Check the confirmed transaction and order status before dispatching goods.</p></article>
              <article className="rm-trust-row"><span className="rm-trust-number">02</span><span className="rm-trust-row-icon"><MessageCircle size={22}/></span><div className="rm-trust-row-title"><small>SUPPORT</small><h3>Report order problems.</h3></div><p>Buyers and sellers can report an issue using the order reference and supporting details.</p></article>
              <article className="rm-trust-row"><span className="rm-trust-number">03</span><span className="rm-trust-row-icon"><FileText size={22}/></span><div className="rm-trust-row-title"><small>SECURITY</small><h3>Keep account details private.</h3></div><p>Never share your password, M-PESA PIN or one-time verification code.</p></article>
            </div>
          </div>
        </section>

        <section className="rm-section rm-faq-section" id="faq">
          <div className="rm-container rm-faq-layout">
            <div className="rm-faq-heading">
              <div className="rm-eyebrow rm-section-label">HELP</div>
              <h2>Frequently asked questions</h2>

              <a href="/signup" data-testid="link-faq-help"><CircleHelp size={15} /> Need help? Contact support.</a>
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
              <div className="rm-eyebrow">READY TO GET STARTED</div>
              <h2>Set up your shop on DASMARKET.</h2>
              <p>Create your seller account and begin setting up your online store.</p>
            </div>
            <div className="rm-cta-actions"><a className="rm-button rm-button-coral" href="/signup">Create your shop <ArrowRight size={15}/></a><a className="rm-button rm-button-outline" href="/login">Already have an account? Log in</a></div>
          </div>
        </section>
      </main>

      <a className="rm-whatsapp-float" href="https://wa.me/254758884861?text=Hello%20DASMARKET%20support%2C%20I%20need%20some%20help." target="_blank" rel="noreferrer" aria-label="Drag to move. Talk to DASMARKET support on WhatsApp" title="Drag to move" style={{left:supportPosition.x,top:supportPosition.y,right:'auto',bottom:'auto',touchAction:'none'}} onPointerDown={e=>{supportDrag.current={pointerX:e.clientX,pointerY:e.clientY,x:supportPosition.x,y:supportPosition.y,moved:false};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={moveSupportButton} onPointerUp={finishSupportDrag} onPointerCancel={finishSupportDrag} onClick={e=>{if(supportWasDragged.current){e.preventDefault();supportWasDragged.current=false;}}}><MessageCircle size={24}/><span>Talk to us</span><i aria-hidden="true">↕</i></a>

      <footer className="rm-footer">
        <div className="rm-container rm-footer-inner">
          <Brand footer />
          <div className="rm-footer-copy">© 2026 DASMARKET. All rights reserved.</div>
          <div className="rm-footer-links"><a href="#how-it-works" data-testid="link-footer-how">How it works</a><a href="#domains" data-testid="link-footer-domains">Domains</a><a href="#trust-safety">Trust &amp; Safety</a><a href="#faq" data-testid="link-footer-faq">FAQ</a></div>
          <a className="rm-back-top" href="#top" data-testid="link-back-to-top">Back to top <ArrowUp size={12} /></a>
        </div>
      </footer>
    </div>
  );
}

export default ReplitLandingPage;
