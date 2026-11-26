import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Calendar,
  Check,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  Globe,
  LayoutDashboard,
  MapPin,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShoppingBag,
  Store,
  Truck,
  UserRound,
  Wallet,
  WalletCards,
  Zap,
} from 'lucide-react';

export type SnapshotTabId = 'overview' | 'orders' | 'products' | 'domains';

const DEMO_BARS = [
  { label: '20 Nov', orders: 4, value: 18200, pct: 46 },
  { label: '21 Nov', orders: 6, value: 24500, pct: 62 },
  { label: '22 Nov', orders: 5, value: 21400, pct: 54 },
  { label: '23 Nov', orders: 8, value: 34800, pct: 88 },
  { label: '24 Nov', orders: 5, value: 19900, pct: 50 },
  { label: '25 Nov', orders: 9, value: 39600, pct: 100 },
  { label: '26 Nov', orders: 5, value: 26250, pct: 66 },
] as const;

const DEMO_ORDERS = [
  { num: '#DM-4821', customer: 'Brian Otieno', total: 'KES 4,850', status: 'processing' },
  { num: '#DM-4820', customer: 'Faith Njeri', total: 'KES 2,300', status: 'confirmed' },
  { num: '#DM-4819', customer: 'Kevin Mwangi', total: 'KES 6,400', status: 'fulfilled' },
  { num: '#DM-4818', customer: 'Amina Hassan', total: 'KES 1,950', status: 'pending' },
] as const;

const DEMO_PRODUCTS = [
  {
    name: 'Mt. Kenya AA Single Origin',
    sku: 'SKU-KNY-01',
    category: 'Coffee & Tea',
    price: 'KES 1,450',
    stock: '34',
    status: 'published',
    label: 'Published',
  },
  {
    name: 'Handwoven Kiondo Tote',
    sku: 'SKU-ART-08',
    category: 'Home Goods',
    price: 'KES 2,900',
    stock: '4',
    status: 'published',
    label: 'Published',
  },
  {
    name: 'Ceramic Pour-Over Set',
    sku: 'SKU-KNY-14',
    category: 'Kitchenware',
    price: 'KES 3,800',
    stock: '18',
    status: 'published',
    label: 'Published',
  },
  {
    name: 'Kenyan Acacia Honey 500g',
    sku: 'SKU-PAN-11',
    category: 'Pantry',
    price: 'KES 950',
    stock: '22',
    status: 'published',
    label: 'Published',
  },
  {
    name: 'Cold Brew Bottle 500ml',
    sku: 'SKU-BEV-03',
    category: 'Coffee & Tea',
    price: 'KES 650',
    stock: '0',
    status: 'hidden',
    label: 'Hidden',
  },
] as const;

const NAV_ITEMS: Array<{
  id: SnapshotTabId | string;
  label: string;
  icon: typeof LayoutDashboard;
  group: 'Storefront' | 'Catalogue & Sales' | 'Billing & Settings';
  badge?: string;
}> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, group: 'Storefront' },
  { id: 'domains', label: 'Custom Domain', icon: Globe, group: 'Storefront' },
  { id: 'settings', label: 'Shop Settings', icon: Settings, group: 'Storefront' },
  { id: 'policies', label: 'Shop Policies', icon: FileText, group: 'Storefront' },
  { id: 'products', label: 'Products', icon: Package, group: 'Catalogue & Sales' },
  { id: 'orders', label: 'Orders & Sales', icon: ShoppingBag, group: 'Catalogue & Sales', badge: '4' },
  { id: 'paystack', label: 'Paystack Card Payments', icon: CreditCard, group: 'Billing & Settings' },
  { id: 'payouts', label: 'Payout Settings', icon: Wallet, group: 'Billing & Settings' },
];

const TITLES: Record<SnapshotTabId, string> = {
  overview: 'Overview',
  orders: 'Orders & Sales',
  products: 'Products',
  domains: 'Custom Domain',
};

const URL_SUFFIX: Record<SnapshotTabId, string> = {
  overview: 'adm.kileleroast.co.ke/dashboard',
  orders: 'adm.kileleroast.co.ke/dashboard/DM-4821',
  products: 'adm.kileleroast.co.ke/dashboard/products',
  domains: 'adm.kileleroast.co.ke/dashboard/domains',
};

function SnapshotChrome({
  activeTab,
  compact = false,
  onSelectTab,
  children,
}: {
  activeTab: SnapshotTabId;
  compact?: boolean;
  onSelectTab?: (tab: SnapshotTabId) => void;
  children: React.ReactNode;
}) {
  return (
    <div className={compact ? 'sd-snap-window is-compact' : 'sd-snap-window'}>
      <div className="sd-snap-browser-bar">
        <div className="sd-snap-url sd-mono">
          <span>https://{URL_SUFFIX[activeTab]}</span>
        </div>
        <span className="sd-snap-demo-tag sd-mono">DEMO DATA</span>
      </div>

      <div className="sd-snap-shell">
        <aside className="sd-snap-rail" aria-label="Dashboard navigation preview">
          <div className="sd-snap-brand">
            <span className="sd-snap-brand-mark">D</span>
            <strong>DASMARKET</strong>
          </div>

          <div className="sd-snap-profile">
            <div className="sd-snap-avatar">W</div>
            <div>
              <strong>Wanjiku Kamau</strong>
              <span>Active merchant</span>
              <small>Kilele Home &amp; Roast</small>
            </div>
          </div>

          {(['Storefront', 'Catalogue & Sales', 'Billing & Settings'] as const).map((group) => (
            <div key={group} className="sd-snap-nav-group">
              <div className="sd-snap-nav-cap">{group}</div>
              <div className="sd-snap-nav-list">
                {NAV_ITEMS.filter((item) => item.group === group).map((item) => {
                  const Icon = item.icon;
                  const isActive = item.id === activeTab;
                  const clickable =
                    onSelectTab &&
                    (item.id === 'overview' ||
                      item.id === 'orders' ||
                      item.id === 'products' ||
                      item.id === 'domains');
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={isActive ? 'sd-snap-nav-btn is-active' : 'sd-snap-nav-btn'}
                      onClick={clickable ? () => onSelectTab(item.id as SnapshotTabId) : undefined}
                      tabIndex={clickable ? 0 : -1}
                    >
                      <Icon size={13} aria-hidden="true" />
                      <span>{item.label}</span>
                      {item.badge && <b>{item.badge}</b>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </aside>

        <div className="sd-snap-workarea">
          <div className="sd-snap-topbar">
            <div>
              <strong>{TITLES[activeTab]}</strong>
              <span>Kilele Home &amp; Roast</span>
            </div>
            <div className="sd-snap-top-actions">
              <span className="sd-snap-icon-btn" aria-hidden="true">
                <Bell size={14} />
                <b>3</b>
              </span>
              <span className="sd-snap-icon-btn" aria-hidden="true">
                <RefreshCw size={14} />
              </span>
              <span className="sd-snap-user-chip">
                <b>W</b>
                <span>
                  <strong>Wanjiku Kamau</strong>
                  <small>Seller account</small>
                </span>
              </span>
            </div>
          </div>

          <div className="sd-snap-body">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function OverviewSnapshot({ compact = false }: { compact?: boolean }) {
  return (
    <SnapshotChrome activeTab="overview" compact={compact}>
      <div className="sd-snap-welcome">
        <div>
          <strong>Welcome back, Wanjiku Kamau</strong>
          <p>
            Kilele Home &amp; Roast · Manage catalogue listings, customer orders, payouts and domains.
          </p>
        </div>
        <div className="sd-snap-store-box">
          <span className="sd-snap-store-ic" aria-hidden="true">
            <Store size={15} />
          </span>
          <div>
            <strong>
              Kilele Home &amp; Roast <em>· Live</em>
            </strong>
            <span>kileleroast.co.ke</span>
          </div>
          <span className="sd-snap-btn-dark">
            Visit store <ArrowUpRight size={12} />
          </span>
        </div>
      </div>

      {!compact && (
        <div className="sd-snap-sub-strip">
          <span>
            Plan: <strong>Standard Plan</strong> · Renews 18 Dec 2026
          </span>
          <span className="sd-snap-btn-outline">Manage plan</span>
        </div>
      )}

      <div className="sd-snap-kpis">
        <div className="sd-snap-kpi">
          <span className="sd-snap-kpi-ic" aria-hidden="true">
            <WalletCards size={14} />
          </span>
          <label>Total order value</label>
          <strong className="sd-mono">KES 184,650</strong>
          <small>Value of orders recorded</small>
        </div>
        <div className="sd-snap-kpi">
          <span className="sd-snap-kpi-ic" aria-hidden="true">
            <ShoppingBag size={14} />
          </span>
          <label>Orders</label>
          <strong className="sd-mono">42</strong>
          <small>4 awaiting fulfilment</small>
        </div>
        <div className="sd-snap-kpi">
          <span className="sd-snap-kpi-ic" aria-hidden="true">
            <Package size={14} />
          </span>
          <label>Products</label>
          <strong className="sd-mono">28</strong>
          <small>26 published listings</small>
        </div>
        <div className="sd-snap-kpi">
          <span className="sd-snap-kpi-ic" aria-hidden="true">
            <Truck size={14} />
          </span>
          <label>Low stock</label>
          <strong className="sd-mono">2</strong>
          <small>Products with 5 or fewer left</small>
        </div>
      </div>

      <div className="sd-snap-ov-grid">
        <div className="sd-snap-panel sd-snap-trend">
          <div className="sd-snap-panel-head">
            <div>
              <h3>Order activity</h3>
              <p>Order value recorded over time</p>
            </div>
            <span className="sd-snap-select-mock">Last 7 days</span>
          </div>
          <div className="sd-snap-chart">
            {DEMO_BARS.map((bar) => (
              <div key={bar.label} className="sd-snap-chart-col">
                <div className="sd-snap-bar-wrap">
                  <div
                    className="sd-snap-bar"
                    style={{ height: `${bar.pct}%` }}
                    title={`${bar.label}: KES ${bar.value.toLocaleString('en-KE')} (${bar.orders} orders)`}
                  />
                </div>
                <small>{bar.label}</small>
              </div>
            ))}
          </div>
          <div className="sd-snap-chart-foot">
            <strong className="sd-mono">KES 184,650</strong>
            <span>42 orders in selected period</span>
          </div>
        </div>

        <div className="sd-snap-panel sd-snap-recent">
          <div className="sd-snap-panel-head">
            <div>
              <h3>Recent orders</h3>
              <p>Latest customer activity</p>
            </div>
            <span className="sd-snap-text-act">
              View all <ArrowRight size={12} />
            </span>
          </div>
          <div className="sd-snap-mini-table">
            <div className="sd-snap-mini-head">
              <span>Order</span>
              <span>Customer</span>
              <span>Amount</span>
              <span>Status</span>
            </div>
            {DEMO_ORDERS.map((order) => (
              <div key={order.num} className="sd-snap-mini-row">
                <strong className="sd-mono">{order.num}</strong>
                <span>{order.customer}</span>
                <span className="sd-mono">{order.total}</span>
                <em className={`sd-snap-status is-${order.status}`}>{order.status}</em>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SnapshotChrome>
  );
}

export function DashboardSnapshotExplorer({
  activeTab,
  onSelectTab,
}: {
  activeTab: SnapshotTabId;
  onSelectTab: (tab: SnapshotTabId) => void;
}) {
  if (activeTab === 'overview') {
    return (
      <SnapshotChrome activeTab="overview" onSelectTab={onSelectTab}>
        <div className="sd-snap-welcome">
          <div>
            <strong>Welcome back, Wanjiku Kamau</strong>
            <p>
              Kilele Home &amp; Roast · Manage catalogue listings, customer orders, payouts and domains.
            </p>
          </div>
          <div className="sd-snap-store-box">
            <span className="sd-snap-store-ic" aria-hidden="true">
              <Store size={15} />
            </span>
            <div>
              <strong>
                Kilele Home &amp; Roast <em>· Live</em>
              </strong>
              <span>kileleroast.co.ke</span>
            </div>
            <span className="sd-snap-btn-dark">
              Visit store <ArrowUpRight size={12} />
            </span>
          </div>
        </div>

        <div className="sd-snap-sub-strip">
          <span>
            Plan: <strong>Standard Plan</strong> · Renews 18 Dec 2026
          </span>
          <span className="sd-snap-btn-outline">Manage plan</span>
        </div>

        <div className="sd-snap-kpis">
          <div className="sd-snap-kpi">
            <span className="sd-snap-kpi-ic" aria-hidden="true">
              <WalletCards size={14} />
            </span>
            <label>Total order value</label>
            <strong className="sd-mono">KES 184,650</strong>
            <small>Value of orders recorded</small>
          </div>
          <div className="sd-snap-kpi">
            <span className="sd-snap-kpi-ic" aria-hidden="true">
              <ShoppingBag size={14} />
            </span>
            <label>Orders</label>
            <strong className="sd-mono">42</strong>
            <small>4 awaiting fulfilment</small>
          </div>
          <div className="sd-snap-kpi">
            <span className="sd-snap-kpi-ic" aria-hidden="true">
              <Package size={14} />
            </span>
            <label>Products</label>
            <strong className="sd-mono">28</strong>
            <small>26 published listings</small>
          </div>
          <div className="sd-snap-kpi">
            <span className="sd-snap-kpi-ic" aria-hidden="true">
              <Truck size={14} />
            </span>
            <label>Low stock</label>
            <strong className="sd-mono">2</strong>
            <small>Products with 5 or fewer left</small>
          </div>
        </div>

        <div className="sd-snap-ov-grid">
          <div className="sd-snap-panel sd-snap-trend">
            <div className="sd-snap-panel-head">
              <div>
                <h3>Order activity</h3>
                <p>Order value recorded over time</p>
              </div>
              <span className="sd-snap-select-mock">Last 7 days</span>
            </div>
            <div className="sd-snap-chart">
              {DEMO_BARS.map((bar) => (
                <div key={bar.label} className="sd-snap-chart-col">
                  <div className="sd-snap-bar-wrap">
                    <div className="sd-snap-bar" style={{ height: `${bar.pct}%` }} />
                  </div>
                  <small>{bar.label}</small>
                </div>
              ))}
            </div>
            <div className="sd-snap-chart-foot">
              <strong className="sd-mono">KES 184,650</strong>
              <span>42 orders in selected period</span>
            </div>
          </div>

          <div className="sd-snap-panel sd-snap-recent">
            <div className="sd-snap-panel-head">
              <div>
                <h3>Recent orders</h3>
                <p>Latest customer activity</p>
              </div>
              <span className="sd-snap-text-act">
                View all <ArrowRight size={12} />
              </span>
            </div>
            <div className="sd-snap-mini-table">
              <div className="sd-snap-mini-head">
                <span>Order</span>
                <span>Customer</span>
                <span>Amount</span>
                <span>Status</span>
              </div>
              {DEMO_ORDERS.map((order) => (
                <div key={order.num} className="sd-snap-mini-row">
                  <strong className="sd-mono">{order.num}</strong>
                  <span>{order.customer}</span>
                  <span className="sd-mono">{order.total}</span>
                  <em className={`sd-snap-status is-${order.status}`}>{order.status}</em>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SnapshotChrome>
    );
  }

  if (activeTab === 'orders') {
    return (
      <SnapshotChrome activeTab="orders" onSelectTab={onSelectTab}>
        <div className="sd-snap-order-page">
          <div className="sd-snap-order-hero">
            <div className="sd-snap-order-hero-ic" aria-hidden="true">
              <Check size={16} />
            </div>
            <div className="sd-snap-order-hero-main">
              <span className="sd-mono">ORDER DETAILS</span>
              <h3>Order #DM-4821</h3>
              <p>
                <Calendar size={12} aria-hidden="true" /> 26 Nov 2026 · 14:22
              </p>
            </div>
            <span className="sd-snap-status is-fulfilled">
              <Check size={12} /> Payment: Successful
            </span>
            <div className="sd-snap-order-amt">
              <strong className="sd-mono">KES 4,850</strong>
              <span>Total Amount</span>
            </div>
          </div>

          <div className="sd-snap-order-two-col">
            <div className="sd-snap-panel">
              <div className="sd-snap-cust-row">
                <span className="sd-snap-round-ic" aria-hidden="true">
                  <UserRound size={14} />
                </span>
                <div>
                  <small>Customer</small>
                  <strong>Brian Otieno</strong>
                  <span>
                    <Phone size={11} aria-hidden="true" /> +254 712 489 310
                  </span>
                </div>
              </div>
              <div className="sd-snap-cust-row">
                <span className="sd-snap-round-ic" aria-hidden="true">
                  <CreditCard size={14} />
                </span>
                <div>
                  <small>Payment Method</small>
                  <strong>M-PESA · Till / Buy Goods</strong>
                  <span className="sd-mono">Receipt: SLK89X42MP</span>
                </div>
              </div>
            </div>

            <div className="sd-snap-panel">
              <div className="sd-snap-panel-head">
                <div>
                  <h3>
                    <MapPin size={13} aria-hidden="true" /> Delivery Information
                  </h3>
                  <p>Submitted by buyer at checkout</p>
                </div>
              </div>
              <div className="sd-snap-deliv-grid">
                <div>
                  <small>Method</small>
                  <strong>Home delivery</strong>
                </div>
                <div>
                  <small>County / Area</small>
                  <strong>Nairobi · Westlands</strong>
                </div>
                <div>
                  <small>Address / Landmark</small>
                  <strong>Rhapta Rd, Apt 4B (near TotalEnergies)</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="sd-snap-order-two-col">
            <div className="sd-snap-panel">
              <div className="sd-snap-panel-head">
                <div>
                  <h3>
                    <Package size={13} aria-hidden="true" /> Order Items
                  </h3>
                </div>
                <span className="sd-snap-mono-label sd-mono">2 LINE ITEMS</span>
              </div>
              <div className="sd-snap-items-list">
                <div className="sd-snap-item-row">
                  <div>
                    <strong>Mt. Kenya AA Single Origin (250g)</strong>
                    <small className="sd-mono">SKU-KNY-01 · Qty 2</small>
                  </div>
                  <strong className="sd-mono">KES 2,900</strong>
                </div>
                <div className="sd-snap-item-row">
                  <div>
                    <strong>Handwoven Sisal Serving Tray</strong>
                    <small className="sd-mono">SKU-ART-04 · Qty 1</small>
                  </div>
                  <strong className="sd-mono">KES 1,950</strong>
                </div>
              </div>
            </div>

            <div className="sd-snap-panel">
              <div className="sd-snap-panel-head">
                <div>
                  <h3>
                    <Zap size={13} aria-hidden="true" /> Request Customer Payment
                  </h3>
                  <p>M-PESA STK Push configuration</p>
                </div>
              </div>
              <div className="sd-snap-stk-methods">
                <div className="sd-snap-stk-opt is-selected">
                  <strong>Till / Buy Goods</strong>
                  <small className="sd-mono">CustomerBuyGoodsOnline · 842910</small>
                </div>
                <div className="sd-snap-stk-opt">
                  <strong>PayBill</strong>
                  <small className="sd-mono">CustomerPayBillOnline</small>
                </div>
              </div>
              <div className="sd-snap-stk-foot">
                <span className="sd-snap-phone-chip sd-mono">+254 712 489 310</span>
                <span className="sd-snap-btn-success">
                  <Send size={12} /> Payment verified
                </span>
              </div>
            </div>
          </div>
        </div>
      </SnapshotChrome>
    );
  }

  if (activeTab === 'products') {
    return (
      <SnapshotChrome activeTab="products" onSelectTab={onSelectTab}>
        <div className="sd-snap-page-head">
          <div>
            <h3>Product catalogue</h3>
            <p>Create, edit, publish and manage your listings · 28 / 50 products used</p>
          </div>
          <div className="sd-snap-head-acts">
            <span className="sd-snap-btn-outline">
              <Download size={12} /> CSV template
            </span>
            <span className="sd-snap-btn-dark">
              <Plus size={12} /> Add product
            </span>
          </div>
        </div>

        <div className="sd-snap-panel">
          <div className="sd-snap-toolbar">
            <strong>28 products</strong>
            <span>26 published · 2 hidden</span>
          </div>
          <div className="sd-snap-search-mock">
            <Search size={13} aria-hidden="true" />
            <span>Search products by name, SKU or category</span>
          </div>
          <div className="sd-snap-table-wrap">
            <table className="sd-snap-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th className="sd-right">Price</th>
                  <th className="sd-right">Stock</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_PRODUCTS.map((p) => (
                  <tr key={p.sku}>
                    <td>
                      <strong>{p.name}</strong>
                      <small className="sd-mono">{p.sku}</small>
                    </td>
                    <td>{p.category}</td>
                    <td className="sd-right sd-mono">{p.price}</td>
                    <td className="sd-right sd-mono">{p.stock}</td>
                    <td>
                      <em className={`sd-snap-status is-${p.status}`}>{p.label}</em>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </SnapshotChrome>
    );
  }

  return (
    <SnapshotChrome activeTab="domains" onSelectTab={onSelectTab}>
      <div className="sd-snap-page-head">
        <div>
          <h3>Custom domain</h3>
          <p>
            Connect your domain once to publish both your storefront and your seller dashboard.
          </p>
        </div>
      </div>

      <div className="sd-snap-panel sd-snap-domain-add">
        <div className="sd-snap-input-mock sd-mono">yourbusiness.co.ke</div>
        <span className="sd-snap-btn-dark">
          <Plus size={12} /> Connect domain
        </span>
      </div>

      <div className="sd-snap-domain-row">
        <div className="sd-snap-domain-main">
          <Globe size={16} aria-hidden="true" />
          <div>
            <strong>kileleroast.co.ke</strong>
            <small>Primary domain · Storefront: ready · Dashboard: ready</small>
          </div>
          <em className="sd-snap-status is-fulfilled">Connected</em>
        </div>
        <div className="sd-snap-domain-links">
          <span>
            <ExternalLink size={12} /> Storefront
          </span>
          <span>
            <ExternalLink size={12} /> Dashboard
          </span>
        </div>
      </div>

      <div className="sd-snap-panel">
        <div className="sd-snap-panel-head">
          <div>
            <h3>Connect kileleroast.co.ke</h3>
            <p>Add the DNS records below at your domain provider.</p>
          </div>
          <span className="sd-snap-mono-label sd-mono">3 RECORDS</span>
        </div>

        <table className="sd-snap-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Host / Name</th>
              <th>Value / Points to</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <span className="sd-snap-dns-type sd-mono">A</span>
              </td>
              <td className="sd-mono">@</td>
              <td>
                <div className="sd-snap-dns-val">
                  <code className="sd-mono">76.76.21.21</code>
                  <Copy size={12} aria-hidden="true" />
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <span className="sd-snap-dns-type sd-mono">CNAME</span>
              </td>
              <td className="sd-mono">www</td>
              <td>
                <div className="sd-snap-dns-val">
                  <code className="sd-mono">cname.dasmarket.co.ke</code>
                  <Copy size={12} aria-hidden="true" />
                </div>
              </td>
            </tr>
            <tr>
              <td>
                <span className="sd-snap-dns-type sd-mono">CNAME</span>
              </td>
              <td className="sd-mono">adm</td>
              <td>
                <div className="sd-snap-dns-val">
                  <code className="sd-mono">cname.dasmarket.co.ke</code>
                  <Copy size={12} aria-hidden="true" />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </SnapshotChrome>
  );
}
