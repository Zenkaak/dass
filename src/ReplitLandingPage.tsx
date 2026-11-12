import { useState } from 'react';
import './replit-landing.css';
import { ArrowRight, CheckCircle2, CreditCard, Globe2, Menu, ShoppingBag, Store, X } from 'lucide-react';

function Brand() {
  return <a className="rm-brand" href="/" aria-label="DASMARKET home"><span className="rm-brand-mark" aria-hidden="true">D</span><span>DASMARKET</span></a>;
}

export function ReplitLandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  return (
    <div className="rm-page-shell rm-home-simple" id="top">
      <header className="rm-nav-wrap">
        <nav className="rm-nav rm-container" aria-label="Main navigation">
          <Brand />
          <button className="rm-mobile-toggle" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} data-testid="button-mobile-menu">{menuOpen ? <X size={21} /> : <Menu size={21} />}</button>
          <div className={menuOpen ? "rm-nav-links rm-open" : "rm-nav-links"}>
            <a href="#features" onClick={closeMenu}>Features</a><a href="#how-it-works" onClick={closeMenu}>How it works</a><a href="/contact/" onClick={closeMenu}>Contact</a>
          </div>
          <div className="rm-nav-actions"><a className="rm-nav-login" href="/login" data-testid="link-sign-in">Sign in</a><a className="rm-button rm-button-coral rm-nav-get-started" href="/signup">Create your shop</a></div>
        </nav>
      </header>
      <main>
        <section className="rm-hero rm-home-hero" aria-labelledby="hero-title">
          <div className="rm-container rm-hero-grid"><div className="rm-hero-copy">
            <div className="rm-hero-kicker rm-eyebrow"><span className="rm-kicker-dot" /> YOUR BUSINESS, ONLINE</div>
            <h1 className="rm-display" id="hero-title">Your online shop.<br />All in one place.</h1>
            <p>Create a professional online store for your business. Showcase your products, manage orders and accept payments through the options configured for your shop.</p>
            <div className="rm-hero-ctas"><a className="rm-button rm-button-coral" href="/signup" data-testid="button-start-shop">Create your shop <ArrowRight size={15} /></a><a className="rm-button rm-button-outline" href="/login" data-testid="button-hero-sign-in">Sign in <ArrowRight size={14} /></a></div>
            <div className="rm-home-proof"><span><CheckCircle2 size={15}/> Your own branded storefront</span><span><CheckCircle2 size={15}/> Products and orders in one workspace</span><span><CheckCircle2 size={15}/> Connect a domain you own</span></div>
          </div></div>
        </section>
        <section className="rm-section rm-home-features" id="features"><div className="rm-container">
          <div className="rm-home-section-heading"><div className="rm-eyebrow rm-section-label">THE DASMARKET PLATFORM</div><h2>Everything you need to run your online shop.</h2><p>One straightforward workspace for your storefront and day-to-day selling.</p></div>
          <div className="rm-home-feature-grid">
            <article className="rm-home-feature"><span className="rm-home-feature-icon"><Store size={21}/></span><h3>Your online storefront</h3><p>Present your business with your shop name, products and brand identity.</p></article>
            <article className="rm-home-feature"><span className="rm-home-feature-icon"><ShoppingBag size={21}/></span><h3>Products &amp; orders</h3><p>Add products, manage stock and keep customer orders organised.</p></article>
            <article className="rm-home-feature"><span className="rm-home-feature-icon"><CreditCard size={21}/></span><h3>Checkout &amp; payments</h3><p>Configure supported payment options for customers shopping in your store.</p></article>
            <article className="rm-home-feature"><span className="rm-home-feature-icon"><Globe2 size={21}/></span><h3>Your own domain</h3><p>Start with your shop address and connect a domain you already own.</p></article>
          </div>
        </div></section>
        <section className="rm-section rm-home-workspace"><div className="rm-container rm-home-workspace-grid">
          <div className="rm-home-workspace-copy"><div className="rm-eyebrow rm-section-label">YOUR SELLER WORKSPACE</div><h2>Stay in control of your shop.</h2><p>Manage the essentials from one place, without juggling separate tools.</p>
            <ul><li><CheckCircle2 size={16}/> Review and manage incoming orders</li><li><CheckCircle2 size={16}/> Update products, prices and stock</li><li><CheckCircle2 size={16}/> Manage shop settings and domain</li></ul>
            <a className="rm-button rm-button-dark" href="/signup">Create your shop <ArrowRight size={14}/></a>
          </div>
          <div className="rm-home-workspace-image"><img src="/images/Manage%20Your%20Shop%20in%20One%20Workspace.png" alt="DASMARKET seller workspace for managing a shop" loading="lazy"/></div>
        </div></section>
        <section className="rm-section rm-home-steps" id="how-it-works"><div className="rm-container">
          <div className="rm-home-section-heading"><div className="rm-eyebrow rm-section-label">GET STARTED</div><h2>Open your shop in three steps.</h2></div>
          <div className="rm-home-step-grid">
            <article><span>01</span><div><h3>Create your account</h3><p>Register and choose a name for your shop.</p></div></article>
            <article><span>02</span><div><h3>Add your products</h3><p>Upload product photos, descriptions, prices and stock.</p></div></article>
            <article><span>03</span><div><h3>Publish and share</h3><p>Make your storefront available and share it with customers.</p></div></article>
          </div>
        </div></section>
        <section className="rm-final-cta rm-home-final"><div className="rm-container rm-cta-inner">
          <div><div className="rm-eyebrow">READY WHEN YOU ARE</div><h2>Bring your shop online.</h2><p>Create your DASMARKET seller account and get started.</p></div>
          <div className="rm-cta-actions"><a className="rm-button rm-button-coral" href="/signup">Create your shop <ArrowRight size={15}/></a><a className="rm-button rm-button-outline" href="/login">Sign in</a></div>
        </div></section>
      </main>
      <footer className="rm-footer"><div className="rm-container rm-footer-inner">
        <div className="rm-footer-top rm-home-footer-top"><Brand/>
          <div className="rm-footer-contact"><strong>Contact</strong><a href="mailto:support@dasmarket.co.ke">support@dasmarket.co.ke</a><a href="tel:+254758884861">+254 758 884 861</a><a href="https://wa.me/254758884861" target="_blank" rel="noreferrer">WhatsApp</a></div>
          <div className="rm-footer-group"><strong>Company</strong><a href="/contact/">Contact us</a><a href="/terms/">Terms &amp; Conditions</a><a href="/privacy/">Privacy Policy</a></div>
          <div className="rm-footer-group"><strong>Get started</strong><a href="/signup">Create your shop</a><a href="/login">Sign in</a><a href="#features">Features</a></div>
        </div>
        <div className="rm-footer-bottom"><span className="rm-footer-copy">© 2026 DASMARKET. All rights reserved.</span><a className="rm-back-top" href="#top">Back to top <ArrowRight size={12}/></a></div>
      </div></footer>
    </div>
  );
}
export default ReplitLandingPage;
