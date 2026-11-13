import { useEffect } from 'react';
import { ArrowRight, CheckCircle2, Globe2, LayoutDashboard } from 'lucide-react';

type SeoPage = {
  title: string; description: string; heading: string; intro: string; eyebrow: string;
  sections: { heading: string; body: string; points?: string[] }[];
  faqs: { q: string; a: string }[];
};
const pages: Record<string, SeoPage> = {
  'create-online-store': {
    title: 'Online Store Builder in Kenya | DASMARKET',
    description: 'Create an online shop in Kenya with DASMARKET. Build your branded online store, add products, manage orders, configure supported payments and share your shop with customers.',
    eyebrow: 'START SELLING ONLINE',
    heading: 'Create an online shop in Kenya with your own branded storefront.',
    intro: 'DASMARKET gives Kenyan businesses a practical way to establish a dedicated online shop without having to build an ecommerce system from the ground up. Set up your seller account, organise your products and publish a storefront customers can visit from their phones or computers.',
    sections: [
      { heading: 'A shop built around your business', body: 'Your storefront is the public home of your business online. Present your own products, prices, images and shop information in one place. Customers can browse your catalogue, add items to a cart and place orders through your shop.' },
      { heading: 'Keep daily operations together', body: 'Use the seller workspace to update products and stock, review incoming orders, follow fulfilment and manage shop settings. Instead of treating your website and order process as separate tasks, run them from one account.', points: ['Add and organise products with images and prices', 'Review orders and delivery information', 'Set customer-facing shop policies', 'Connect a domain you already own when ready'] },
      { heading: 'Choose how your customers pay', body: 'Configure the payment and payout options available to your shop. Where supported, you can set your own merchant Till or Paybill details so payments are directed according to your configured merchant setup. Check each transaction status before fulfilling an order.' }
    ],
    faqs: [
      { q: 'How do I start an online store?', a: 'Create a seller account, choose your shop name, add your products and complete the shop setup in your dashboard. You can then publish and share your shop address.' },
      { q: 'Do I need to build a website myself?', a: 'DASMARKET provides the storefront and the ecommerce workflow, so you do not need to develop a shop system from scratch.' },
      { q: 'Can I use my own domain name?', a: 'Yes. Start with your DASMARKET shop address and connect a domain you own through the seller dashboard.' }
    ]
  },
  'ecommerce-platform': {
    title: 'Ecommerce Platform in Kenya for Businesses | DASMARKET',
    description: 'DASMARKET is an ecommerce platform for Kenyan businesses. Run a branded online store, manage products and orders, connect your own domain and configure seller payments.',
    eyebrow: 'ONE PLATFORM FOR YOUR SHOP',
    heading: 'An ecommerce platform for Kenyan businesses that want their own shop.',
    intro: 'DASMARKET brings the customer-facing shop and the seller tools behind it into one connected platform. It is designed for retailers, wholesalers, independent brands and growing businesses that want to sell through their own online storefront.',
    sections: [
      { heading: 'From product catalogue to customer order', body: 'Publish a catalogue with product descriptions, images, prices and stock information. Customers use your storefront to browse and place orders, while you review those orders in your seller workspace.' },
      { heading: 'A connected seller workspace', body: 'Manage the work that follows a sale without switching between disconnected tools. Review order details, update inventory, maintain shop information and configure customer-facing policies from your dashboard.', points: ['Product and inventory controls', 'Order review and fulfilment information', 'Shop branding and domain settings', 'Payment configuration and transaction visibility'] },
      { heading: 'Your business remains your business', body: 'Each seller operates a branded shop with its own products, customer-facing information and configured payment destination. DASMARKET supplies the ecommerce infrastructure; you remain responsible for your products, service, fulfilment and shop policies.' }
    ],
    faqs: [
      { q: 'Who can use DASMARKET?', a: 'Retailers, wholesalers, independent brands and other businesses that want to operate a dedicated online shop can create a seller account.' },
      { q: 'Does DASMARKET include order management?', a: 'Yes. Sellers can review and manage orders from the seller workspace, alongside products, stock and shop settings.' },
      { q: 'Can each business have its own branded shop?', a: 'Yes. Each seller storefront can present the seller’s own shop identity, catalogue and customer-facing policies.' }
    ]
  },
  'sell-online-with-mpesa': {
    title: 'M-PESA Payments for Online Shops in Kenya | DASMARKET',
    description: 'Sell online in Kenya with a branded shop and supported M-PESA merchant payment options. Configure your Till or Paybill and manage customer orders with DASMARKET.',
    eyebrow: 'PAYMENTS FOR YOUR ONLINE SHOP',
    heading: 'Sell online in Kenya with supported M-PESA merchant payments.',
    intro: 'A useful online shop needs more than a product page. Customers need a clear checkout, and sellers need to know whether a payment has been confirmed. DASMARKET connects your storefront, order workflow and configured payment options in one place.',
    sections: [
      { heading: 'Configure your merchant payment details', body: 'Set up the payment destination for your shop in seller settings. Supported M-PESA merchant configurations can use the relevant Till or Paybill details. The payment route depends on the merchant details and options configured for your shop.' },
      { heading: 'Follow payment and order status', body: 'Review the transaction status associated with an order before preparing or dispatching it. Keeping payment confirmation and order fulfilment as separate checks helps reduce mistakes when handling customer orders.', points: ['Configure supported merchant payment details', 'Review payment status against the order', 'Keep order references for follow-up', 'Use the order reporting process if a payment or order needs attention'] },
      { heading: 'Keep the checkout connected to your shop', body: 'Customers order from your branded storefront. The seller workspace gives you the order information needed to process the sale and coordinate delivery according to your shop policies.' }
    ],
    faqs: [
      { q: 'Can I connect my own M-PESA Till or Paybill?', a: 'DASMARKET supports seller payment configuration for supported merchant Till and Paybill setups. Configure the merchant details available to your shop in seller settings.' },
      { q: 'Do payments automatically mean an order is ready to dispatch?', a: 'No. Check the confirmed payment status and the order details before fulfilment.' },
      { q: 'Can I manage orders and payments in one place?', a: 'The seller workspace brings order management and payment status visibility together with your other shop controls.' }
    ]
  },
  'custom-domain-online-store': {
    title: 'Custom Domain for Your Online Store | DASMARKET',
    description: 'Connect a custom domain to your DASMARKET online shop. Start with a shop subdomain, then use a domain you own to build your brand online.',
    eyebrow: 'YOUR BRAND, YOUR WEB ADDRESS',
    heading: 'Connect your own domain to your online shop.',
    intro: 'A domain that matches your business name makes your shop easier to recognise and share. With DASMARKET, you can begin with the shop address provided during setup and connect a domain you own when you are ready.',
    sections: [
      { heading: 'Start with a shop address', body: 'When you create a shop, DASMARKET provides a shareable shop address on the DASMARKET domain. You can use it while preparing your catalogue and introducing your online store to customers.' },
      { heading: 'Move to a domain you own', body: 'If you already own a domain, use the domain connection process in your seller dashboard. Follow the DNS instructions shown for your shop and allow time for the domain configuration to take effect. Keep your original DASMARKET shop address available as a fallback.' },
      { heading: 'Keep the storefront connected', body: 'Your custom domain points customers to your existing shop. Product management, order handling and shop configuration remain available through your DASMARKET seller account.', points: ['Use a domain that reflects your business name', 'Follow the DNS records provided in your dashboard', 'Check the domain connection status before sharing widely'] }
    ],
    faqs: [
      { q: 'Do I need to buy a domain before creating a shop?', a: 'No. You can start with the DASMARKET shop address and connect a domain you own later.' },
      { q: 'Where do I connect my domain?', a: 'Use the domain settings in your seller dashboard and follow the DNS instructions displayed for your shop.' },
      { q: 'Will I lose my shop if I connect a custom domain?', a: 'Your shop remains managed from the same seller account. The original DASMARKET address remains available.' }
    ]
  },
  'online-store-management': {
    title: 'Online Store Management for Sellers | DASMARKET',
    description: 'Manage your online store from one seller dashboard. Update products and stock, process orders, review payments, coordinate delivery and manage shop policies.',
    eyebrow: 'RUN YOUR SHOP DAY TO DAY',
    heading: 'Manage products, orders and shop operations in one workspace.',
    intro: 'Launching a storefront is only the beginning. A business also needs a reliable way to keep its catalogue current, review orders, coordinate delivery and maintain clear information for customers. DASMARKET brings these everyday shop tasks into one seller workspace.',
    sections: [
      { heading: 'Keep your catalogue up to date', body: 'Add products, maintain descriptions and images, adjust prices and update stock information as your range changes. An accurate catalogue helps customers understand what your shop offers before they order.' },
      { heading: 'Work through orders with clarity', body: 'Review incoming orders and the information needed to fulfil them. Check payment status, confirm delivery arrangements and keep the order reference available if a customer needs help.', points: ['Review and update product information', 'Track incoming orders and fulfilment details', 'Configure payment and payout settings', 'Maintain delivery, return and privacy policies'] },
      { heading: 'Give customers useful shop information', body: 'Use your storefront and shop policies to explain delivery arrangements, returns and how customers can contact your business. Clear expectations help customers make informed decisions before checkout.' }
    ],
    faqs: [
      { q: 'Can I update products after publishing my shop?', a: 'Yes. Product information and stock can be managed from the seller workspace.' },
      { q: 'Can I manage customer orders?', a: 'Yes. The seller dashboard provides order information and tools for handling fulfilment.' },
      { q: 'Can I add my shop policies?', a: 'Yes. Sellers can maintain customer-facing shop policies, including delivery, returns and privacy information.' }
    ]
  }
};

const pageLinks = [
  ['create-online-store', 'Create an online store'],
  ['ecommerce-platform', 'Ecommerce platform'],
  ['sell-online-with-mpesa', 'M-PESA for online sales'],
  ['custom-domain-online-store', 'Custom domains'],
  ['online-store-management', 'Store management']
] as const;

export function isPlatformSeoPath(path: string) { return Object.prototype.hasOwnProperty.call(pages, path); }

export default function PlatformSeoPage({ slug }: { slug: string }) {
  const page = pages[slug];
  useEffect(() => {
    if (!page) return;
    document.title = page.title;
    const setMeta = (selector: string, attr: string, value: string) => {
      let element = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!element) { element = document.createElement('meta'); document.head.appendChild(element); }
      element.setAttribute(attr, value);
    };
    setMeta('meta[name="description"]', 'name', 'description');
    const description = document.head.querySelector('meta[name="description"]');
    description?.setAttribute('content', page.description);
    let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = 'https://dasmarket.co.ke/' + slug;
    setMeta('meta[property="og:title"]', 'property', 'og:title');
    document.head.querySelector('meta[property="og:title"]')?.setAttribute('content', page.title);
    setMeta('meta[property="og:description"]', 'property', 'og:description');
    document.head.querySelector('meta[property="og:description"]')?.setAttribute('content', page.description);
    setMeta('meta[property="og:url"]', 'property', 'og:url');
    document.head.querySelector('meta[property="og:url"]')?.setAttribute('content', 'https://dasmarket.co.ke/' + slug);
    const schema = { '@context': 'https://schema.org', '@graph': [ { '@type': 'Organization', '@id': 'https://dasmarket.co.ke/#organization', name: 'DASMARKET', alternateName: 'DASMARKET', url: 'https://dasmarket.co.ke/', brand: { '@type': 'Brand', name: 'DASMARKET' } }, { '@type': 'WebSite', '@id': 'https://dasmarket.co.ke/#website', name: 'DASMARKET', alternateName: 'DASMARKET', url: 'https://dasmarket.co.ke/', publisher: { '@id': 'https://dasmarket.co.ke/#organization' } }, { '@type': 'WebPage', name: page.title, description: page.description, url: 'https://dasmarket.co.ke/' + slug, isPartOf: { '@id': 'https://dasmarket.co.ke/#website' } } ] };
    let script = document.getElementById('dasmarket-seo-schema') as HTMLScriptElement | null;
    if (!script) { script = document.createElement('script'); script.id = 'dasmarket-seo-schema'; script.type = 'application/ld+json'; document.head.appendChild(script); }
    script.textContent = JSON.stringify(schema);
  }, [page, slug]);

  if (!page) return null;
  return <main className="platform-seo-page">
    <style>{`
      .platform-seo-page{min-height:100vh;background:#f8fafc;color:#142033;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      .ps-nav{height:72px;background:#fff;border-bottom:1px solid #e6ebf1;display:flex;align-items:center;justify-content:space-between;padding:0 max(22px,calc((100vw - 1160px)/2));gap:20px}
      .ps-brand{font-weight:850;letter-spacing:-.04em;color:#142033;text-decoration:none;font-size:21px}.ps-brand span{display:inline-grid;place-items:center;background:#f4bd28;color:#142033;width:31px;height:31px;border-radius:9px;margin-right:9px}
      .ps-nav-links{display:flex;gap:22px;align-items:center;flex-wrap:wrap}.ps-nav-links a,.ps-footer a{color:#475569;text-decoration:none;font-size:13px;font-weight:650}.ps-nav-links a:hover,.ps-footer a:hover{color:#b45309}
      .ps-cta{display:inline-flex;align-items:center;justify-content:center;gap:9px;padding:12px 18px;border-radius:9px;background:#f3b82b;color:#182230;text-decoration:none;font-weight:800;font-size:14px;white-space:nowrap}
      .ps-wrap{width:min(1080px,calc(100% - 40px));margin:auto}.ps-hero{padding:76px 0 64px;background:linear-gradient(120deg,#fff 0%,#f8fafc 65%,#fff7e5 100%);border-bottom:1px solid #e8edf3}
      .ps-eyebrow{font-size:11px;letter-spacing:.16em;font-weight:800;color:#a16207}.ps-hero h1{font-size:clamp(34px,5.3vw,58px);line-height:1.06;letter-spacing:-.055em;max-width:820px;margin:18px 0;color:#111c2e}.ps-intro{font-size:18px;line-height:1.75;color:#526174;max-width:800px;margin:0}.ps-hero-actions{display:flex;gap:13px;align-items:center;flex-wrap:wrap;margin-top:27px}.ps-secondary{font-size:14px;font-weight:750;color:#334155;text-decoration:none;padding:12px 3px}
      .ps-proof{display:flex;gap:22px;flex-wrap:wrap;margin-top:35px;color:#536174;font-size:13px}.ps-proof span{display:flex;align-items:center;gap:7px}
      .ps-section{padding:54px 0;border-bottom:1px solid #e8edf3}.ps-section h2{font-size:clamp(24px,3vw,32px);letter-spacing:-.035em;margin:0 0 13px;color:#152238}.ps-section>div>p{max-width:800px;color:#5b687a;line-height:1.8;margin:0 0 24px}
      .ps-feature-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.ps-feature{background:#fff;border:1px solid #e5eaf0;border-radius:14px;padding:23px;min-width:0}.ps-feature h3{font-size:18px;margin:0 0 10px}.ps-feature p{font-size:14px;line-height:1.75;color:#64748b;margin:0}.ps-feature ul{padding-left:18px;color:#536174;font-size:13px;line-height:1.9}
      .ps-faq{max-width:850px}.ps-faq-item{padding:19px 0;border-bottom:1px solid #e2e8f0}.ps-faq-item h3{font-size:16px;margin:0 0 8px}.ps-faq-item p{font-size:14px;line-height:1.75;color:#5b687a;margin:0}
      .ps-related{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}.ps-related a{padding:9px 12px;border:1px solid #dbe3ec;border-radius:999px;color:#40516a;text-decoration:none;font-size:12px;font-weight:700;background:#fff}
      .ps-bottom{background:#142033;color:#fff;padding:48px 0}.ps-bottom h2{font-size:30px;letter-spacing:-.04em;margin:0 0 10px}.ps-bottom p{color:#cbd5e1;line-height:1.7;margin:0 0 20px;max-width:650px}.ps-footer{background:#fff;padding:24px 0;border-top:1px solid #e5eaf0}.ps-footer-inner{display:flex;justify-content:space-between;gap:18px;align-items:center;flex-wrap:wrap}.ps-footer small{color:#64748b}
      @media(max-width:760px){.ps-nav{height:auto;min-height:64px;padding:13px 18px;flex-wrap:wrap}.ps-nav-links{order:3;width:100%;gap:10px 17px}.ps-nav-links a{font-size:12px}.ps-nav>.ps-cta{padding:10px 12px;font-size:12px}.ps-wrap{width:min(100% - 34px,1080px)}.ps-hero{padding:53px 0 46px}.ps-intro{font-size:16px}.ps-proof{gap:12px;flex-direction:column}.ps-feature-grid{grid-template-columns:1fr}.ps-section{padding:42px 0}.ps-footer-inner{align-items:flex-start;flex-direction:column}}
    `}</style>
    <header className="ps-nav">
      <a className="ps-brand" href="/"><span>D</span>DASMARKET</a>
      <nav className="ps-nav-links" aria-label="Platform information">
        <a href="/create-online-store">Create a shop</a><a href="/ecommerce-platform">Platform</a><a href="/sell-online-with-mpesa">Payments</a><a href="/custom-domain-online-store">Domains</a>
      </nav>
      <a className="ps-cta" href="/signup">Create your shop <ArrowRight size={15}/></a>
    </header>
    <section className="ps-hero"><div className="ps-wrap">
      <div className="ps-eyebrow">{page.eyebrow}</div><h1>{page.heading}</h1><p className="ps-intro">{page.intro}</p>
      <div className="ps-hero-actions"><a className="ps-cta" href="/signup">Get started on DASMARKET <ArrowRight size={16}/></a><a className="ps-secondary" href="/login">Already have a seller account? Sign in</a></div>
      <div className="ps-proof"><span><CheckCircle2 size={16}/> Your own branded storefront</span><span><LayoutDashboard size={16}/> Seller tools in one workspace</span><span><Globe2 size={16}/> Option to connect your domain</span></div>
    </div></section>
    <section className="ps-section"><div className="ps-wrap"><div className="ps-feature-grid">
      {page.sections.map((section, index) => <article className="ps-feature" key={section.heading}>
        <div className="ps-eyebrow">0{index + 1} / DASMARKET</div><h3>{section.heading}</h3><p>{section.body}</p>
        {section.points && <ul>{section.points.map(point => <li key={point}>{point}</li>)}</ul>}
      </article>)}
    </div></div></section>
    <section className="ps-section"><div className="ps-wrap"><h2>Questions about this part of your online shop?</h2><div className="ps-faq">
      {page.faqs.map(faq => <article className="ps-faq-item" key={faq.q}><h3>{faq.q}</h3><p>{faq.a}</p></article>)}
    </div><div className="ps-related" aria-label="Related DASMARKET guides">{pageLinks.filter(([key]) => key !== slug).map(([key, label]) => <a key={key} href={'/' + key}>{label}</a>)}</div></div></section>
    <section className="ps-bottom"><div className="ps-wrap"><h2>Build your shop around your business.</h2><p>Set up your seller account, prepare your catalogue and publish a storefront customers can reach online.</p><a className="ps-cta" href="/signup">Create your shop <ArrowRight size={16}/></a></div></section>
    <footer className="ps-footer"><div className="ps-wrap ps-footer-inner"><a className="ps-brand" href="/"><span>D</span>DASMARKET</a><small>© 2026 DASMARKET. Your shop, your brand.</small><div className="ps-related"><a href="/">Home</a><a href="/login">Sign in</a><a href="/signup">Create a shop</a></div></div></footer>
  </main>;
}
