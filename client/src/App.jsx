import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate, useLocation
} from 'react-router-dom';
import {
  ShoppingCart, LogOut, Trash2, UserCheck, CheckCircle2
} from 'lucide-react';
import axios from 'axios';

// ─── API Config (Port 5001 avoids macOS AirTunes port 5000 conflict) ───────────
const API_URL = 'http://localhost:5001/api';

const api = axios.create({ baseURL: API_URL });
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_ORDER = ['Pending', 'Accepted', 'Preparing', 'Shipped', 'Delivered'];

function statusBadgeClass(s) {
  const m = {
    Pending: 'pending',
    Accepted: 'accepted',
    Preparing: 'preparing',
    Shipped: 'shipped',
    Delivered: 'delivered',
    'In Progress': 'info',
    Responded: 'accepted',
    Resolved: 'delivered'
  };
  return `badge badge-${m[s] || 'info'}`;
}

function Alert({ type = 'error', msg, onClose }) {
  if (!msg) return null;
  return (
    <div className={`alert alert-${type}`}>
      <span style={{ flex: 1 }}>{msg}</span>
      {onClose && (
        <button
          onClick={onClose}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '1.1rem' }}
        >
          ×
        </button>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div className="loading-center">
      <div className="spinner" />
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });
  const [cartCount, setCartCount] = useState(0);

  const refreshCartCount = useCallback(async () => {
    if (!localStorage.getItem('token')) return setCartCount(0);
    try {
      const res = await api.get('/cart');
      setCartCount(res.data.reduce((s, i) => s + i.quantity, 0));
    } catch {
      setCartCount(0);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'CUSTOMER') refreshCartCount();
  }, [user, refreshCartCount]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCartCount(0);
  };

  return (
    <Router>
      <div className="app-container">
        {/* ── Navbar ── */}
        <nav className="navbar">
          <Link to="/" className="nav-brand">🌿 Artisan Marketplace</Link>
          <div className="nav-links">
            <Link to="/" className="nav-item">Home</Link>
            <Link to="/products" className="nav-item">Products</Link>
            {user?.role === 'SELLER' && <Link to="/seller" className="nav-item">Seller Dashboard</Link>}
            {user?.role === 'CUSTOMER' && <Link to="/customer" className="nav-item">My Orders</Link>}
            {(user?.role === 'SUPPORT' || user?.role === 'ADMIN') && (
              <Link to="/support" className="nav-item" style={{ color: 'var(--color-primary)', fontWeight: '700' }}>
                🎧 Support Desk
              </Link>
            )}
            {user?.role === 'CUSTOMER' && (
              <Link to="/cart" className="nav-item cart-badge">
                <ShoppingCart size={20} />
                {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
              </Link>
            )}
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ color: 'var(--color-primary)', fontWeight: '600' }}>
                  Hi, {user.name.split(' ')[0]} ({user.role})
                </span>
                <button onClick={handleLogout} className="btn btn-outline btn-sm">
                  <LogOut size={15} /> Logout
                </button>
              </div>
            ) : (
              <Link to="/login" className="btn btn-primary">Login / Register</Link>
            )}
          </div>
        </nav>

        {/* ── Routes ── */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage onCartChange={refreshCartCount} />} />
            <Route path="/products" element={<ProductsPage user={user} onCartChange={refreshCartCount} />} />
            <Route path="/login" element={<LoginPage setUser={setUser} />} />
            <Route
              path="/cart"
              element={user?.role === 'CUSTOMER' ? <CartPage onCartChange={refreshCartCount} /> : <Navigate to="/login" />}
            />
            <Route
              path="/checkout"
              element={user?.role === 'CUSTOMER' ? <CheckoutPage onCartChange={refreshCartCount} /> : <Navigate to="/login" />}
            />
            <Route
              path="/seller"
              element={user?.role === 'SELLER' ? <SellerDashboard user={user} /> : <Navigate to="/login" />}
            />
            <Route
              path="/customer"
              element={user?.role === 'CUSTOMER' ? <CustomerDashboard user={user} /> : <Navigate to="/login" />}
            />
            <Route
              path="/support"
              element={(user?.role === 'SUPPORT' || user?.role === 'ADMIN') ? <SupportDashboard user={user} /> : <Navigate to="/login" />}
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

// ─── HOME PAGE (Restored Original with Handcrafted Artifacts) ─────────────────
function HomePage({ onCartChange }) {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // All 6 Original Categories
  const categories = [
    { icon: '🏺', name: 'Ceramics & Pottery', desc: 'Hand-thrown stoneware, terracotta planters & clay cookware' },
    { icon: '👜', name: 'Leather Goods', desc: 'Hand-stitched journals, genuine saddle wallets & accessories' },
    { icon: '💍', name: 'Jewelry', desc: 'Oxidized silver jhumkas, terracotta pendants & tribal jewelry' },
    { icon: '🪵', name: 'Woodwork', desc: 'Carved sheesham spice boxes, teak trays & wooden artifacts' },
    { icon: '🧵', name: 'Textiles & Tapestries', desc: 'Handwoven macrame wall hangings & block-printed stoles' },
    { icon: '🕯️', name: 'Home Decor', desc: 'Botanical soy candles, brass peacock incense burners & artifacts' }
  ];

  useEffect(() => {
    api.get('/products')
      .then(res => setFeaturedProducts(res.data.slice(0, 6)))
      .catch(() => setFeaturedProducts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fade-in">
      {/* ── Hero Banner ── */}
      <div className="hero">
        <div className="hero-tag">✦ 100% Authentic Handcrafts • Direct From Studio Artisans</div>
        <h1>Handcrafted Goods & Artifacts, <em>Straight from the Artisan</em></h1>
        <p>
          Discover authentic hand-thrown ceramics, carved woodwork, genuine leather goods, handloom tapestries, and artisan jewelry crafted by independent makers.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/products" className="btn btn-primary btn-lg">Explore Handcrafted Artifacts →</Link>
          <a href="#categories" className="btn btn-outline btn-lg">Browse Categories ↓</a>
        </div>
      </div>

      {/* ── Browse Categories (All 6 Original Categories) ── */}
      <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Browse Categories</h2>
      <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginBottom: '2.5rem' }}>
        Select a craft to discover unique handmade treasures
      </p>

      <div id="categories" className="product-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', marginBottom: '4rem' }}>
        {categories.map((c, i) => (
          <Link
            to={`/products?category=${encodeURIComponent(c.name)}`}
            key={i}
            className="card category-art-card"
          >
            <div className="category-art-icon-wrap">{c.icon}</div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.4rem' }}>{c.name}</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', lineHeight: 1.5, flex: 1 }}>{c.desc}</p>
            <div className="category-explore-link">Explore Craft →</div>
          </Link>
        ))}
      </div>

      {/* ── Featured Sample Products with Prices ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.8rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ marginBottom: '0.2rem' }}>Featured Handcrafted Products</h2>
          <p style={{ color: 'var(--color-text-muted)' }}>Popular handmade items with prices</p>
        </div>
        <Link to="/products" className="btn btn-outline btn-sm">View All Products →</Link>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="product-grid">
          {featuredProducts.map((p) => (
            <ProductItemCard key={p.product_id} product={p} onCartChange={onCartChange} />
          ))}
        </div>
      )}

      {/* ── Artisan Callout Banner ── */}
      <div style={{ textAlign: 'center', marginTop: '4rem', padding: '3.5rem 2rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--color-border)', boxShadow: 'var(--shadow-sm)' }}>
        <h2>Are you an Artisan or Maker?</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.8rem', maxWidth: '600px', margin: '0 auto 1.8rem' }}>
          Join our artisan marketplace to showcase your pottery, leather craft, jewelry, or woodwork directly to appreciative customers.
        </p>
        <Link to="/login" className="btn btn-secondary btn-lg">Start Selling Today</Link>
      </div>
    </div>
  );
}

// ─── PRODUCT CARD COMPONENT ──────────────────────────────────────────────────
function ProductItemCard({ product, onCartChange }) {
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState(false);
  const navigate = useNavigate();

  const handleAddToCart = async () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return navigate('/login');
    const user = JSON.parse(userStr);
    if (user.role !== 'CUSTOMER') {
      alert('Only customers can purchase products. Please log in with a customer account.');
      return;
    }

    setAdding(true);
    try {
      await api.post('/cart', { product_id: product.product_id, quantity: 1 });
      setMsg(true);
      if (onCartChange) onCartChange();
      setTimeout(() => setMsg(false), 2000);
    } catch (err) {
      alert(err.response?.data?.msg || 'Could not add to cart');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <img src={product.image} alt={product.name} className="card-image" />
      <div className="card-content" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-primary)', fontWeight: 700, marginBottom: '0.3rem' }}>
          {product.category_name || 'Artisan Craft'}
        </div>
        <h3 className="card-title">{product.name}</h3>
        <p style={{ fontSize: '0.86rem', color: 'var(--color-text-muted)', marginBottom: '1rem', flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {product.description}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.8rem', borderTop: '1px solid var(--color-border)' }}>
          <div>
            <div className="card-price">₹{Number(product.price).toFixed(0)}</div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 600 }}>Stock: {product.quantity}</span>
          </div>
          <button
            onClick={handleAddToCart}
            className="btn btn-primary btn-sm"
            disabled={adding || product.quantity <= 0}
          >
            {msg ? '✓ Added' : adding ? 'Adding...' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PRODUCTS PAGE ───────────────────────────────────────────────────────────
function ProductsPage({ onCartChange }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');

  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cat = params.get('category');
    if (cat) setCatFilter(cat);
  }, [location.search]);

  useEffect(() => {
    Promise.all([
      api.get('/products'),
      api.get('/categories')
    ]).then(([p, c]) => {
      setProducts(p.data);
      setCategories(c.data);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                        p.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter
      ? p.category_name?.toLowerCase() === catFilter.toLowerCase()
      : true;
    return matchSearch && matchCat;
  });

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h2>Handcrafted Products Catalog</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem' }}>
            Discover handmade pottery, leatherwork, jewelry, tapestries, woodwork, and decor
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="search-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Search handcrafted products or descriptions..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="form-input"
          style={{ width: 'auto', minWidth: '220px' }}
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
        >
          <option value="">All Categories ({products.length})</option>
          {categories.map(c => (
            <option key={c.category_id} value={c.category_name}>{c.category_name}</option>
          ))}
        </select>
        {catFilter && (
          <button onClick={() => setCatFilter('')} className="btn btn-outline btn-sm">
            Clear Filter
          </button>
        )}
      </div>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏺</div>
          <h3>No handcrafted products found</h3>
          <p>Try searching for a different item or clear your category filter</p>
          <button onClick={() => { setCatFilter(''); setSearch(''); }} className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Show All Products
          </button>
        </div>
      ) : (
        <div className="product-grid">
          {filtered.map(p => (
            <ProductItemCard key={p.product_id} product={p} onCartChange={onCartChange} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── LOGIN & REGISTER PAGE WITH DEMO ACCOUNTS ────────────────────────────────
function LoginPage({ setUser }) {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({
    name: '',
    email: 'customer@example.com',
    password: 'password123',
    phone: '',
    role: 'CUSTOMER'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeDemo, setActiveDemo] = useState('customer@example.com');
  const navigate = useNavigate();

  const demoAccounts = [
    {
      role: 'CUSTOMER',
      badge: 'Customer',
      badgeColor: 'rgba(74, 158, 226, 0.20)',
      textColor: '#8AC5F8',
      name: 'Alice Customer',
      email: 'customer@example.com',
      password: 'password123',
      desc: 'Browse, buy products, place orders & raise complaints'
    },
    {
      role: 'SELLER',
      badge: 'Artisan / Seller',
      badgeColor: 'rgba(217, 107, 67, 0.22)',
      textColor: '#F5A687',
      name: 'Bob Artisan',
      email: 'seller@example.com',
      password: 'password123',
      desc: 'List products, manage inventory & ship customer orders'
    },
    {
      role: 'SUPPORT',
      badge: 'Customer Support Executive',
      badgeColor: 'rgba(226, 161, 74, 0.22)',
      textColor: '#F5BE70',
      name: 'Charlie Support',
      email: 'support@example.com',
      password: 'password123',
      desc: 'View & resolve customer complaints and inquiries'
    },
    {
      role: 'ADMIN',
      badge: 'Administrator',
      badgeColor: 'rgba(61, 174, 113, 0.20)',
      textColor: '#8BE8B3',
      name: 'Diana Admin',
      email: 'admin@example.com',
      password: 'password123',
      desc: 'Platform administration & marketplace oversight'
    }
  ];

  const handleSelectDemo = (acc) => {
    setActiveDemo(acc.email);
    setForm({
      ...form,
      name: acc.name,
      email: acc.email,
      password: acc.password,
      role: acc.role
    });
    setError('');
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Sign In
        const res = await api.post('/auth/login', {
          email: form.email,
          password: form.password
        });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setUser(res.data.user);

        if (res.data.user.role === 'SELLER') navigate('/seller');
        else if (res.data.user.role === 'SUPPORT' || res.data.user.role === 'ADMIN') navigate('/support');
        else navigate('/customer');
      } else {
        // Register Account
        if (!form.name.trim()) throw new Error('Please enter your full name');
        if (!form.email.trim()) throw new Error('Please enter your email address');
        if (!form.password) throw new Error('Please enter a password');

        const res = await api.post('/auth/register', {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          phone: form.phone || null,
          role: form.role
        });

        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setUser(res.data.user);

        if (res.data.user.role === 'SELLER') navigate('/seller');
        else if (res.data.user.role === 'SUPPORT') navigate('/support');
        else navigate('/customer');
      }
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '480px', margin: '2rem auto' }}>
      <div className="card" style={{ padding: '2.5rem' }}>
        {/* Tab Switcher between Sign In and Register */}
        <div className="auth-tabs">
          <div
            className={`auth-tab ${isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(true); setError(''); }}
          >
            Sign In
          </div>
          <div
            className={`auth-tab ${!isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(false); setError(''); }}
          >
            Register Here
          </div>
        </div>

        <h2 style={{ textAlign: 'center', marginBottom: '0.4rem' }}>
          {isLogin ? '👋 Welcome Back' : '🌿 Join the Marketplace'}
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginBottom: '1.8rem' }}>
          {isLogin ? 'Sign in to your account' : 'Create a new buyer, artisan or support account'}
        </p>

        <Alert type="error" msg={error} onClose={() => setError('')} />

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="Your full name"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              className="form-input"
              required
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password *</label>
            <input
              type="password"
              className="form-input"
              required
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Register as: *</label>
              <select
                className="form-input"
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
              >
                <option value="CUSTOMER">🛍️ Customer (Buy Handcrafted Goods)</option>
                <option value="SELLER">🎨 Artisan / Seller (List & Sell Creations)</option>
                <option value="SUPPORT">🎧 Customer Support Executive (Handle Inquiries)</option>
              </select>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: '0.8rem' }}>
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--color-text-muted)' }}>
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <span
            style={{ color: 'var(--color-primary)', cursor: 'pointer', fontWeight: '600' }}
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
          >
            {isLogin ? 'Register here' : 'Login here'}
          </span>
        </p>

        {/* ── Demo Accounts Section Right Below Login ── */}
        <div className="demo-logins-box">
          <div className="demo-title">
            <UserCheck size={18} color="var(--color-primary)" />
            <span>Click Any Demo Account to Auto-Fill & Test:</span>
          </div>

          <div className="demo-accounts-grid">
            {demoAccounts.map(acc => {
              const isSelected = activeDemo === acc.email;
              return (
                <div
                  key={acc.email}
                  className={`demo-acc-card ${isSelected ? 'active' : ''}`}
                  onClick={() => handleSelectDemo(acc)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="demo-badge" style={{ background: acc.badgeColor, color: acc.textColor }}>
                      {acc.badge}
                    </span>
                    {isSelected && <CheckCircle2 size={16} color="var(--color-primary)" />}
                  </div>
                  <div className="demo-email">{acc.email}</div>
                  <div className="demo-pwd">Password: <strong>{acc.password}</strong></div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>
                    {acc.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CUSTOMER SUPPORT EXECUTIVE DASHBOARD ────────────────────────────────────
function SupportDashboard({ user }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [replyText, setReplyText] = useState({});
  const [statusUpdates, setStatusUpdates] = useState({});
  const [msg, setMsg] = useState('');

  const fetchComplaints = useCallback(() => {
    setLoading(true);
    api.get('/complaints')
      .then(res => setComplaints(res.data))
      .catch(() => setComplaints([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const stats = useMemo(() => {
    return {
      total: complaints.length,
      pending: complaints.filter(c => c.status === 'Pending').length,
      inProgress: complaints.filter(c => c.status === 'In Progress').length,
      resolved: complaints.filter(c => c.status === 'Resolved' || c.status === 'Responded').length
    };
  }, [complaints]);

  const filteredTickets = useMemo(() => {
    if (filter === 'All') return complaints;
    if (filter === 'Pending') return complaints.filter(c => c.status === 'Pending');
    if (filter === 'In Progress') return complaints.filter(c => c.status === 'In Progress');
    if (filter === 'Resolved') return complaints.filter(c => c.status === 'Resolved' || c.status === 'Responded');
    return complaints;
  }, [complaints, filter]);

  const handleUpdateComplaint = async (complaintId) => {
    const response = replyText[complaintId];
    const status = statusUpdates[complaintId] || 'Responded';

    try {
      await api.put(`/complaints/${complaintId}`, { status, response });
      setMsg(`Ticket #${complaintId} updated successfully.`);
      fetchComplaints();
      setTimeout(() => setMsg(''), 3000);
    } catch {
      setMsg('Failed to update ticket.');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h2>🎧 Customer Support Executive Desk</h2>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Logged in as <strong>{user.name}</strong> (Customer Support Executive)
          </p>
        </div>
        <button onClick={fetchComplaints} className="btn btn-outline btn-sm">
          Refresh Tickets
        </button>
      </div>

      <Alert type="success" msg={msg} onClose={() => setMsg('')} />

      {/* KPI Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{stats.total}</div>
          <div className="stat-label">Total Tickets</div>
        </div>
        <div className="stat-card">
          <div className="stat-number" style={{ color: 'var(--color-warning)' }}>{stats.pending}</div>
          <div className="stat-label">Pending Action</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.inProgress}</div>
          <div className="stat-label">In Progress</div>
        </div>
        <div className="stat-card">
          <div className="stat-number" style={{ color: 'var(--color-success)' }}>{stats.resolved}</div>
          <div className="stat-label">Resolved / Responded</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['All', 'Pending', 'In Progress', 'Resolved'].map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`btn btn-sm ${filter === tab ? 'btn-primary' : 'btn-outline'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : filteredTickets.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">✓</div>
          <h3>No customer tickets in "{filter}"</h3>
          <p>All complaints and inquiries in this filter have been answered.</p>
        </div>
      ) : (
        <div>
          {filteredTickets.map(t => (
            <div key={t.complaint_id} className="ticket-item-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>Ticket #{t.complaint_id}</span>
                    <span className={statusBadgeClass(t.status)}>{t.status}</span>
                    {t.order_id && (
                      <span className="badge badge-accepted">
                        Order #{t.order_id} (₹{t.total_amount || '—'})
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    Customer: <strong>{t.customer_name}</strong> • {t.customer_email} • {t.customer_phone || 'No phone'}
                  </div>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  {new Date(t.date).toLocaleString()}
                </div>
              </div>

              {/* Inquiry description */}
              <div className="ticket-desc-box">
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.2rem' }}>
                  CUSTOMER INQUIRY / COMPLAINT:
                </div>
                {t.description}
              </div>

              {/* Response */}
              {t.response && (
                <div className="ticket-reply-box">
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-success)', marginBottom: '0.2rem' }}>
                    CURRENT SUPPORT RESPONSE:
                  </div>
                  {t.response}
                </div>
              )}

              {/* Action Form */}
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                <label className="form-label" style={{ fontSize: '0.85rem' }}>
                  {t.response ? 'Update Resolution / Response:' : 'Type Response to Customer:'}
                </label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="Provide helpful response, shipping ETA, resolution details..."
                  value={replyText[t.complaint_id] !== undefined ? replyText[t.complaint_id] : (t.response || '')}
                  onChange={e => setReplyText({ ...replyText, [t.complaint_id]: e.target.value })}
                />

                <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <select
                    className="form-input"
                    style={{ width: 'auto', minWidth: '150px' }}
                    value={statusUpdates[t.complaint_id] || t.status}
                    onChange={e => setStatusUpdates({ ...statusUpdates, [t.complaint_id]: e.target.value })}
                  >
                    <option value="Pending">Status: Pending</option>
                    <option value="In Progress">Status: In Progress</option>
                    <option value="Responded">Status: Responded</option>
                    <option value="Resolved">Status: Resolved</option>
                  </select>

                  <button
                    onClick={() => handleUpdateComplaint(t.complaint_id)}
                    className="btn btn-primary btn-sm"
                  >
                    Save & Update Ticket
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CUSTOMER DASHBOARD (Orders + Support Inquiries) ─────────────────────────
function CustomerDashboard({ user }) {
  const [orders, setOrders] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders');

  const [ticketOrder, setTicketOrder] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketMsg, setTicketMsg] = useState('');

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/orders'),
      api.get('/complaints/my')
    ]).then(([oRes, cRes]) => {
      setOrders(oRes.data);
      setComplaints(cRes.data);
    }).catch(() => {
      setOrders([]);
      setComplaints([]);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRaiseComplaint = async (e) => {
    e.preventDefault();
    if (!ticketDesc.trim()) return;

    try {
      await api.post('/complaints', {
        order_id: ticketOrder ? Number(ticketOrder) : null,
        description: ticketDesc.trim()
      });
      setTicketMsg('Your support inquiry has been submitted! A Customer Support Executive will respond shortly.');
      setTicketDesc('');
      setTicketOrder('');
      fetchData();
      setTimeout(() => setTicketMsg(''), 4000);
    } catch (err) {
      setTicketMsg(err.response?.data?.msg || 'Could not submit inquiry');
    }
  };

  const stats = useMemo(() => {
    return {
      total: orders.length,
      spent: orders.reduce((s, o) => s + (o.total_amount || 0), 0),
      tickets: complaints.length
    };
  }, [orders, complaints]);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h2>👤 {user ? `${user.name}'s Dashboard` : 'My Dashboard'}</h2>
          <p style={{ color: 'var(--color-text-muted)' }}>Customer Account • {user?.email}</p>
        </div>
        <Link to="/products" className="btn btn-primary btn-sm">Shop More</Link>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{stats.total}</div>
          <div className="stat-label">Total Orders</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">₹{stats.spent.toFixed(0)}</div>
          <div className="stat-label">Total Spent</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.tickets}</div>
          <div className="stat-label">Support Tickets</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--color-border)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('orders')}
          className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`}
          style={{ fontSize: '1rem', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          📦 My Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('support')}
          className={`nav-item ${activeTab === 'support' ? 'active' : ''}`}
          style={{ fontSize: '1rem', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          🎧 Support & Inquiries ({complaints.length})
        </button>
      </div>

      {activeTab === 'orders' ? (
        loading ? (
          <Spinner />
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <h3>No orders yet</h3>
            <p>Start exploring unique handcrafted pottery, leather goods, and jewelry</p>
            <Link to="/products" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Shipping Address</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.order_id}>
                    <td><strong>#{o.order_id}</strong></td>
                    <td>{new Date(o.order_date).toLocaleDateString()}</td>
                    <td><strong>₹{Number(o.total_amount).toFixed(2)}</strong></td>
                    <td><span className={statusBadgeClass(o.status)}>{o.status}</span></td>
                    <td style={{ maxWidth: '280px', color: 'var(--color-text-muted)' }}>{o.shipping_address || 'Standard Delivery'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        /* Support Inquiries Tab */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
          <div className="card" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>💬 Need Help? Contact Customer Support</h3>
            <Alert type="success" msg={ticketMsg} onClose={() => setTicketMsg('')} />
            <form onSubmit={handleRaiseComplaint}>
              <div className="form-group">
                <label className="form-label">Related Order (Optional)</label>
                <select
                  className="form-input"
                  value={ticketOrder}
                  onChange={e => setTicketOrder(e.target.value)}
                >
                  <option value="">General Question (Not order-specific)</option>
                  {orders.map(o => (
                    <option key={o.order_id} value={o.order_id}>
                      Order #{o.order_id} — ₹{o.total_amount} ({o.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">How can our support team help you? *</label>
                <textarea
                  className="form-input"
                  rows={4}
                  required
                  placeholder="Describe your inquiry, delivery question, custom artifact request or return..."
                  value={ticketDesc}
                  onChange={e => setTicketDesc(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary btn-full">
                Submit Inquiry to Support
              </button>
            </form>
          </div>

          <div>
            <h3 style={{ marginBottom: '1rem' }}>Inquiries & Executive Responses</h3>
            {complaints.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)' }}>You haven't filed any support inquiries yet.</p>
            ) : (
              complaints.map(c => (
                <div key={c.complaint_id} className="ticket-item-card" style={{ padding: '1.2rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span className={statusBadgeClass(c.status)}>{c.status}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                      {new Date(c.date).toLocaleDateString()}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.92rem', marginBottom: '0.6rem' }}>{c.description}</p>
                  {c.response ? (
                    <div className="ticket-reply-box" style={{ margin: 0, padding: '0.8rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-success)', marginBottom: '0.2rem' }}>
                        EXECUTIVE RESPONSE:
                      </div>
                      {c.response}
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-warning)' }}>
                      ⏳ A Customer Support Executive is reviewing your ticket.
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CART PAGE ───────────────────────────────────────────────────────────────
function CartPage({ onCartChange }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCart = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/cart');
      setItems(res.data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const updateQuantity = async (cart_id, quantity) => {
    try {
      if (quantity <= 0) {
        await api.delete(`/cart/${cart_id}`);
      } else {
        await api.put(`/cart/${cart_id}`, { quantity });
      }
      fetchCart();
      if (onCartChange) onCartChange();
    } catch (err) {
      alert(err.response?.data?.msg || 'Update failed');
    }
  };

  const total = items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);

  if (loading) return <Spinner />;

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🛒</div>
        <h3>Your cart is empty</h3>
        <p style={{ margin: '0.8rem 0 1.5rem', color: 'var(--color-text-muted)' }}>
          Explore our handcrafted pottery, leather goods, jewelry and woodwork
        </p>
        <Link to="/products" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h2>Shopping Cart ({items.length})</h2>
        <Link to="/products" className="btn btn-outline btn-sm">Continue Shopping</Link>
      </div>

      <div className="cart-layout">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Quantity</th>
                <th>Subtotal</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.cart_id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <img src={item.image} alt={item.name} style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} />
                      <div>
                        <strong>{item.name}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Artisan: {item.seller_name}</div>
                      </div>
                    </div>
                  </td>
                  <td>₹{Number(item.price).toFixed(0)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button onClick={() => updateQuantity(item.cart_id, item.quantity - 1)} className="btn btn-outline btn-sm" style={{ padding: '0.2rem 0.5rem' }}>-</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.cart_id, item.quantity + 1)} className="btn btn-outline btn-sm" style={{ padding: '0.2rem 0.5rem' }}>+</button>
                    </div>
                  </td>
                  <td><strong>₹{(item.price * item.quantity).toFixed(0)}</strong></td>
                  <td>
                    <button onClick={() => updateQuantity(item.cart_id, 0)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Order Summary */}
        <div className="card" style={{ padding: '2rem', height: 'fit-content' }}>
          <h3 style={{ marginBottom: '1.2rem' }}>Order Summary</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
            <span>Subtotal</span>
            <strong>₹{total.toFixed(0)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem', color: 'var(--color-success)' }}>
            <span>Shipping</span>
            <span>FREE</span>
          </div>
          <div className="divider" />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem' }}>
            <span>Total</span>
            <span style={{ color: 'var(--color-primary)' }}>₹{total.toFixed(0)}</span>
          </div>

          <Link to="/checkout" className="btn btn-primary btn-full btn-lg">
            Proceed to Checkout →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── CHECKOUT PAGE ───────────────────────────────────────────────────────────
function CheckoutPage({ onCartChange }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState('102 Lotus Enclave, MG Road, Bengaluru, Karnataka - 560001');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [placing, setPlacing] = useState(false);
  const [successOrder, setSuccessOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/cart')
      .then(r => setItems(r.data))
      .finally(() => setLoading(false));
  }, []);

  const total = items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!address.trim()) return setError('Please enter a delivery address');

    setPlacing(true);
    setError('');
    try {
      const res = await api.post('/orders', {
        shipping_address: address,
        payment_method: paymentMethod
      });
      setSuccessOrder(res.data.order_id);
      if (onCartChange) onCartChange();
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  if (loading) return <Spinner />;

  if (successOrder) {
    return (
      <div className="animate-fade-in" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div style={{ fontSize: '4.5rem', marginBottom: '1rem' }}>🎉</div>
        <h2>Order Placed Successfully!</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          Order <strong>#{successOrder}</strong> has been confirmed.
        </p>
        <div className="alert alert-success" style={{ maxWidth: '440px', margin: '1.5rem auto' }}>
          Payment of ₹{total.toFixed(0)} via {paymentMethod} completed ✓
        </div>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
          <Link to="/customer" className="btn btn-primary">View My Orders</Link>
          <Link to="/products" className="btn btn-outline">Continue Shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h2>🔒 Checkout</h2>
        <Link to="/cart" className="btn btn-outline btn-sm">← Back to Cart</Link>
      </div>

      <form onSubmit={handlePlaceOrder} className="checkout-layout">
        <div>
          <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>📦 Shipping Address</h3>
            <Alert type="error" msg={error} onClose={() => setError('')} />
            <div className="form-group">
              <label className="form-label">Full Delivery Address *</label>
              <textarea
                className="form-input"
                rows={3}
                required
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="House/Flat No., Street, City, State, PIN Code"
              />
            </div>
          </div>

          <div className="card" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>💳 Payment Method</h3>
            <div className="payment-methods">
              {['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Cash on Delivery'].map(m => (
                <div
                  key={m}
                  onClick={() => setPaymentMethod(m)}
                  className={`demo-acc-card ${paymentMethod === m ? 'active' : ''}`}
                  style={{ textAlign: 'center', padding: '1rem' }}
                >
                  <div style={{ fontWeight: 600 }}>{m}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Order review */}
        <div className="card" style={{ padding: '2rem', height: 'fit-content' }}>
          <h3 style={{ marginBottom: '1.2rem' }}>Review Items</h3>
          {items.map(i => (
            <div key={i.cart_id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', fontSize: '0.9rem' }}>
              <span>{i.quantity}x {i.name}</span>
              <strong>₹{(i.price * i.quantity).toFixed(0)}</strong>
            </div>
          ))}
          <div className="divider" />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem' }}>
            <span>Total:</span>
            <span style={{ color: 'var(--color-primary)' }}>₹{total.toFixed(0)}</span>
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={placing}>
            {placing ? 'Placing Order...' : 'Confirm & Place Order'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── SELLER DASHBOARD ────────────────────────────────────────────────────────
function SellerDashboard({ user }) {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products');

  const [newProd, setNewProd] = useState({
    name: '',
    category_id: 1,
    description: '',
    price: '',
    quantity: 10,
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80'
  });
  const [addMsg, setAddMsg] = useState('');

  const fetchSellerData = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/products/my'),
      api.get('/orders'),
      api.get('/categories')
    ]).then(([pRes, oRes, cRes]) => {
      setProducts(pRes.data);
      setOrders(oRes.data);
      setCategories(cRes.data);
    }).catch(() => {
      setProducts([]);
      setOrders([]);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchSellerData();
  }, [fetchSellerData]);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      await api.post('/products', {
        ...newProd,
        price: parseFloat(newProd.price),
        quantity: parseInt(newProd.quantity, 10),
        category_id: parseInt(newProd.category_id, 10)
      });
      setAddMsg('Product listed successfully in marketplace!');
      setNewProd({
        name: '',
        category_id: 1,
        description: '',
        price: '',
        quantity: 10,
        image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80'
      });
      fetchSellerData();
      setTimeout(() => setAddMsg(''), 3000);
    } catch (err) {
      setAddMsg(err.response?.data?.msg || 'Could not add product');
    }
  };

  const handleUpdateOrderStatus = async (order_id, newStatus) => {
    try {
      await api.put(`/orders/${order_id}/status`, { status: newStatus });
      fetchSellerData();
    } catch {
      alert('Failed to update status');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h2>Artisan Studio: {user.name}</h2>
          <p style={{ color: 'var(--color-text-muted)' }}>Manage handcrafted product listings and fulfill customer orders</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{products.length}</div>
          <div className="stat-label">Active Listings</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{orders.length}</div>
          <div className="stat-label">Total Orders</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">
            ₹{orders.reduce((s, o) => s + (o.total_amount || 0), 0).toFixed(0)}
          </div>
          <div className="stat-label">Total Revenue</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', borderBottom: '2px solid var(--color-border)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('products')}
          className={`nav-item ${activeTab === 'products' ? 'active' : ''}`}
          style={{ fontSize: '1rem', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          🏺 My Listings ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('add')}
          className={`nav-item ${activeTab === 'add' ? 'active' : ''}`}
          style={{ fontSize: '1rem', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          ➕ List New Artifact
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`}
          style={{ fontSize: '1rem', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          📦 Incoming Orders ({orders.length})
        </button>
      </div>

      {activeTab === 'products' && (
        loading ? <Spinner /> : products.length === 0 ? (
          <div className="empty-state">
            <h3>No products listed yet</h3>
            <button onClick={() => setActiveTab('add')} className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Add Your First Product
            </button>
          </div>
        ) : (
          <div className="product-grid">
            {products.map(p => (
              <ProductItemCard key={p.product_id} product={p} />
            ))}
          </div>
        )
      )}

      {activeTab === 'add' && (
        <div className="card" style={{ maxWidth: '640px', margin: '0 auto', padding: '2.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>List a New Handcrafted Item</h3>
          <Alert type="success" msg={addMsg} onClose={() => setAddMsg('')} />
          <form onSubmit={handleCreateProduct}>
            <div className="form-group">
              <label className="form-label">Product Name *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="e.g. Hand-Carved Teak Wood Coasters"
                value={newProd.name}
                onChange={e => setNewProd({ ...newProd, name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Category *</label>
              <select
                className="form-input"
                value={newProd.category_id}
                onChange={e => setNewProd({ ...newProd, category_id: e.target.value })}
              >
                {categories.map(c => (
                  <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Price (₹ INR) *</label>
              <input
                type="number"
                step="1"
                className="form-input"
                required
                placeholder="499"
                value={newProd.price}
                onChange={e => setNewProd({ ...newProd, price: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Stock Quantity *</label>
              <input
                type="number"
                className="form-input"
                required
                value={newProd.quantity}
                onChange={e => setNewProd({ ...newProd, quantity: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Image URL</label>
              <input
                type="url"
                className="form-input"
                value={newProd.image}
                onChange={e => setNewProd({ ...newProd, image: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description & Craft Details *</label>
              <textarea
                className="form-input"
                rows={3}
                required
                placeholder="Describe the materials, hand-made process, and dimensions..."
                value={newProd.description}
                onChange={e => setNewProd({ ...newProd, description: e.target.value })}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full btn-lg">
              Publish Artifact
            </button>
          </form>
        </div>
      )}

      {activeTab === 'orders' && (
        loading ? <Spinner /> : orders.length === 0 ? (
          <div className="empty-state">
            <h3>No customer orders received yet</h3>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Update Order Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.order_id}>
                    <td><strong>#{o.order_id}</strong></td>
                    <td>{o.customer_name || 'Customer'}</td>
                    <td><strong>₹{Number(o.total_amount).toFixed(0)}</strong></td>
                    <td><span className={statusBadgeClass(o.status)}>{o.status}</span></td>
                    <td>
                      <select
                        className="form-input"
                        style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                        value={o.status}
                        onChange={e => handleUpdateOrderStatus(o.order_id, e.target.value)}
                      >
                        {STATUS_ORDER.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
