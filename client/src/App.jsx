import React, { useState, useEffect, useCallback } from 'react';
import {
  BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate
} from 'react-router-dom';
import {
  ShoppingCart, Package, LogOut, Home, List, PlusCircle,
  Truck, CheckCircle, Clock, Star, Trash2, Eye, Edit
} from 'lucide-react';
import axios from 'axios';

// ─── API Config ───────────────────────────────────────────────────────────────
const API_URL = 'http://localhost:5000/api';

const api = axios.create({ baseURL: API_URL });
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_ORDER = ['Pending', 'Accepted', 'Preparing', 'Shipped', 'Delivered'];

function statusBadgeClass(s) {
  const m = { Pending:'pending', Accepted:'accepted', Preparing:'preparing', Shipped:'shipped', Delivered:'delivered' };
  return `badge badge-${m[s] || 'info'}`;
}

function Alert({ type = 'error', msg, onClose }) {
  if (!msg) return null;
  return (
    <div className={`alert alert-${type}`}>
      {msg}
      {onClose && <button onClick={onClose} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', fontWeight:'700' }}>×</button>}
    </div>
  );
}

function Spinner() { return <div className="loading-center"><div className="spinner"/></div>; }

// ─── App Root ─────────────────────────────────────────────────────────────────
function App() {
  const [user, setUser]       = useState(null);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) setUser(JSON.parse(u));
  }, []);

  const refreshCartCount = useCallback(async () => {
    if (!localStorage.getItem('token')) return setCartCount(0);
    try {
      const res = await api.get('/cart');
      setCartCount(res.data.reduce((s, i) => s + i.quantity, 0));
    } catch { setCartCount(0); }
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
            {user?.role === 'SELLER'   && <Link to="/seller"   className="nav-item">Seller Dashboard</Link>}
            {user?.role === 'CUSTOMER' && <Link to="/customer" className="nav-item">My Orders</Link>}
            {user?.role === 'CUSTOMER' && (
              <Link to="/cart" className="nav-item cart-badge">
                <ShoppingCart size={20} />
                {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
              </Link>
            )}
            {user ? (
              <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                <span style={{ color:'var(--color-primary)', fontWeight:'600' }}>Hi, {user.name.split(' ')[0]}</span>
                <button onClick={handleLogout} className="btn btn-outline btn-sm">
                  <LogOut size={15}/> Logout
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
            <Route path="/"        element={<HomePage />} />
            <Route path="/products" element={<ProductsPage user={user} onCartChange={refreshCartCount} />} />
            <Route path="/login"   element={<LoginPage setUser={setUser} />} />
            <Route path="/cart"    element={user?.role === 'CUSTOMER' ? <CartPage onCartChange={refreshCartCount} /> : <Navigate to="/login"/>} />
            <Route path="/checkout" element={user?.role === 'CUSTOMER' ? <CheckoutPage onCartChange={refreshCartCount} /> : <Navigate to="/login"/>} />
            <Route path="/seller"  element={user?.role === 'SELLER'   ? <SellerDashboard user={user} /> : <Navigate to="/login"/>} />
            <Route path="/customer" element={user?.role === 'CUSTOMER' ? <CustomerDashboard user={user} /> : <Navigate to="/login"/>} />
            <Route path="*"        element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

// ─── HOME PAGE ────────────────────────────────────────────────────────────────
function HomePage() {
  const categories = [
    { icon:'🏺', name:'Ceramics & Pottery' },
    { icon:'👜', name:'Leather Goods' },
    { icon:'💍', name:'Jewelry' },
    { icon:'🪵', name:'Woodwork' },
    { icon:'🧵', name:'Textiles' },
    { icon:'🕯️', name:'Home Decor' },
  ];
  return (
    <div className="animate-fade-in">
      <div className="hero">
        <h1>Handcrafted Goods, Straight from the Artisan</h1>
        <p>Discover unique, authentic, and beautifully crafted products from independent sellers around the world.</p>
        <Link to="/products" className="btn btn-primary btn-lg">Shop Now →</Link>
      </div>

      <h2 style={{ textAlign:'center', marginBottom:'2rem' }}>Browse Categories</h2>
      <div className="product-grid" style={{ gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))' }}>
        {categories.map((c, i) => (
          <Link to="/products" key={i} className="card" style={{ padding:'2rem', textAlign:'center', cursor:'pointer' }}>
            <div style={{ fontSize:'3rem', marginBottom:'0.8rem' }}>{c.icon}</div>
            <h3 style={{ fontSize:'1rem', marginBottom:0 }}>{c.name}</h3>
          </Link>
        ))}
      </div>

      <div style={{ textAlign:'center', marginTop:'4rem', padding:'3rem', background:'rgba(178,106,77,0.05)', borderRadius:'var(--radius-lg)' }}>
        <h2>Are you an Artisan?</h2>
        <p style={{ color:'var(--color-text-muted)', marginBottom:'1.5rem' }}>Join our marketplace and start selling your handcrafted creations today.</p>
        <Link to="/login" className="btn btn-secondary btn-lg">Start Selling</Link>
      </div>
    </div>
  );
}

// ─── PRODUCTS PAGE ────────────────────────────────────────────────────────────
function ProductsPage({ user, onCartChange }) {
  const [products, setProducts]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [catFilter, setCatFilter]   = useState('');
  const [adding, setAdding]         = useState(null);
  const [msg, setMsg]               = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get('/products'),
      api.get('/categories'),
    ]).then(([p, c]) => {
      setProducts(p.data);
      setCategories(c.data);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat    = catFilter ? String(p.category_id) === catFilter : true;
    return matchSearch && matchCat;
  });

  const addToCart = async (product) => {
    if (!user) return navigate('/login');
    if (user.role !== 'CUSTOMER') return setMsg('Only customers can add to cart.');
    setAdding(product.product_id);
    try {
      await api.post('/cart', { product_id: product.product_id, quantity: 1 });
      setMsg(`"${product.name}" added to cart!`);
      onCartChange();
    } catch (e) {
      setMsg(e.response?.data?.msg || 'Failed to add to cart');
    } finally {
      setAdding(null);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h2>All Artisan Products</h2>
        <span style={{ color:'var(--color-text-muted)' }}>{filtered.length} items</span>
      </div>

      {msg && <Alert type={msg.includes('added') ? 'success' : 'error'} msg={msg} onClose={() => setMsg('')} />}

      <div className="search-bar">
        <input className="search-input" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="form-input" style={{ width:'auto' }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : (
        filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <h3>No products found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="product-grid">
            {filtered.map(p => (
              <div key={p.product_id} className="card">
                <img
                  src={p.image || `https://picsum.photos/seed/${p.product_id}/400/300`}
                  alt={p.name}
                  className="card-image"
                  onError={e => { e.target.src = `https://picsum.photos/seed/${p.product_id+10}/400/300`; }}
                />
                <div className="card-content">
                  <span className="badge badge-info" style={{ marginBottom:'0.6rem', display:'inline-block' }}>
                    {p.category_name}
                  </span>
                  <h3 className="card-title">{p.name}</h3>
                  <p style={{ color:'var(--color-text-muted)', fontSize:'0.85rem', marginBottom:'0.5rem' }}>By {p.seller_name}</p>
                  <p style={{ fontSize:'0.82rem', color:'var(--color-text-muted)', marginBottom:'1rem' }}>
                    {p.quantity > 0 ? `${p.quantity} in stock` : <span style={{ color:'var(--color-danger)' }}>Out of stock</span>}
                  </p>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span className="card-price">₹{p.price.toFixed(2)}</span>
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={p.quantity === 0 || adding === p.product_id}
                      onClick={() => addToCart(p)}
                    >
                      {adding === p.product_id ? '...' : '+ Cart'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ─── LOGIN / REGISTER ─────────────────────────────────────────────────────────
function LoginPage({ setUser }) {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm]       = useState({ name:'', email:'', password:'', role:'CUSTOMER' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const ep  = isLogin ? '/auth/login' : '/auth/register';
      const res = await api.post(ep, form);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      navigate(res.data.user.role === 'SELLER' ? '/seller' : '/');
    } catch (e) {
      setError(e.response?.data?.msg || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth:'420px', margin:'2rem auto' }}>
      <div className="upload-card">
        <h2 style={{ textAlign:'center', marginBottom:'0.5rem' }}>
          {isLogin ? '👋 Welcome Back' : '🌿 Join the Marketplace'}
        </h2>
        <p style={{ textAlign:'center', color:'var(--color-text-muted)', marginBottom:'2rem' }}>
          {isLogin ? 'Sign in to your account' : 'Create a new account'}
        </p>

        <Alert type="error" msg={error} onClose={() => setError('')} />

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input type="text" className="form-input" required value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Your full name" />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input type="email" className="form-input" required value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-input" required value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
          </div>
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Register as:</label>
              <select className="form-input" value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="CUSTOMER">Customer (Buy Products)</option>
                <option value="SELLER">Artisan / Seller</option>
              </select>
            </div>
          )}
          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <p style={{ textAlign:'center', marginTop:'1.5rem', color:'var(--color-text-muted)' }}>
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <span style={{ color:'var(--color-primary)', cursor:'pointer', fontWeight:'600' }}
            onClick={() => { setIsLogin(!isLogin); setError(''); }}>
            {isLogin ? 'Register here' : 'Login here'}
          </span>
        </p>

        {isLogin && (
          <div style={{ marginTop:'1.5rem', padding:'1rem', background:'#F9F6F2', borderRadius:'var(--radius-sm)', fontSize:'0.85rem' }}>
            <strong>Demo accounts (password: password123)</strong><br/>
            Customer: customer@example.com<br/>
            Seller: seller@example.com
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CART PAGE ────────────────────────────────────────────────────────────────
function CartPage({ onCartChange }) {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(null);
  const navigate = useNavigate();

  const fetchCart = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get('/cart'); setItems(r.data); }
    catch { setItems([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const removeItem = async (cart_id) => {
    setRemoving(cart_id);
    try {
      await api.delete(`/cart/${cart_id}`);
      await fetchCart();
      onCartChange();
    } finally { setRemoving(null); }
  };

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

  if (loading) return <Spinner />;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h2>🛒 My Cart</h2>
        <Link to="/products" className="btn btn-outline btn-sm">← Continue Shopping</Link>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🛒</div>
          <h3>Your cart is empty</h3>
          <p>Add some beautiful handcrafted items!</p>
          <Link to="/products" className="btn btn-primary" style={{ marginTop:'1rem' }}>Browse Products</Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div>
            {items.map(item => (
              <div key={item.cart_id} className="cart-item animate-slide-in">
                <img
                  src={item.image || `https://picsum.photos/seed/${item.product_id}/200/200`}
                  alt={item.name}
                  className="cart-item-img"
                  onError={e => { e.target.src = `https://picsum.photos/seed/${item.product_id+5}/200/200`; }}
                />
                <div className="cart-item-info">
                  <p className="cart-item-name">{item.name}</p>
                  <p className="cart-item-price">₹{item.price.toFixed(2)} each</p>
                  <div className="qty-control">
                    <span style={{ fontSize:'0.85rem', color:'var(--color-text-muted)' }}>Qty:</span>
                    <span className="qty-value">{item.quantity}</span>
                  </div>
                  <p style={{ fontSize:'0.9rem', fontWeight:'600', marginTop:'0.3rem' }}>
                    Subtotal: <span style={{ color:'var(--color-primary)' }}>₹{(item.price * item.quantity).toFixed(2)}</span>
                  </p>
                </div>
                <button
                  className="btn btn-danger btn-sm"
                  style={{ alignSelf:'flex-start' }}
                  disabled={removing === item.cart_id}
                  onClick={() => removeItem(item.cart_id)}
                >
                  <Trash2 size={14} /> {removing === item.cart_id ? '...' : 'Remove'}
                </button>
              </div>
            ))}
          </div>

          <div className="order-summary">
            <h3>Order Summary</h3>
            {items.map(i => (
              <div key={i.cart_id} className="summary-row">
                <span>{i.name} ×{i.quantity}</span>
                <span>₹{(i.price * i.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="divider"/>
            <div className="summary-row">
              <span>Shipping</span><span style={{ color:'var(--color-success)' }}>Free</span>
            </div>
            <div className="summary-row total">
              <span>Total</span><span>₹{total.toFixed(2)}</span>
            </div>
            <button className="btn btn-primary btn-full btn-lg" style={{ marginTop:'1rem' }}
              onClick={() => navigate('/checkout')}>
              Proceed to Checkout →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CHECKOUT PAGE ────────────────────────────────────────────────────────────
function CheckoutPage({ onCartChange }) {
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [placing, setPlacing]     = useState(false);
  const [success, setSuccess]     = useState(null);
  const [error, setError]         = useState('');
  const [payMethod, setPayMethod] = useState('UPI');
  const [address, setAddress]     = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/cart')
      .then(r => setItems(r.data))
      .finally(() => setLoading(false));
  }, []);

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

  const placeOrder = async e => {
    e.preventDefault();
    if (!address.trim()) return setError('Please enter a shipping address.');
    setPlacing(true); setError('');
    try {
      const res = await api.post('/orders', { shipping_address: address, payment_method: payMethod });
      setSuccess(res.data.order_id);
      onCartChange();
    } catch (e) {
      setError(e.response?.data?.msg || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  if (loading) return <Spinner />;

  if (success) return (
    <div className="animate-fade-in" style={{ textAlign:'center', padding:'4rem 2rem' }}>
      <div style={{ fontSize:'5rem', marginBottom:'1rem' }}>🎉</div>
      <h2>Order Placed Successfully!</h2>
      <p style={{ color:'var(--color-text-muted)', marginBottom:'0.5rem' }}>Order #{success} has been confirmed.</p>
      <div className="alert alert-success" style={{ maxWidth:'400px', margin:'1.5rem auto' }}>
        Payment of ₹{total.toFixed(2)} via {payMethod} — Completed ✓
      </div>
      <div style={{ display:'flex', gap:'1rem', justifyContent:'center', flexWrap:'wrap', marginTop:'2rem' }}>
        <Link to="/customer" className="btn btn-primary">View My Orders</Link>
        <Link to="/products" className="btn btn-outline">Continue Shopping</Link>
      </div>
    </div>
  );

  if (items.length === 0) return (
    <div className="empty-state">
      <div className="empty-state-icon">🛒</div>
      <h3>Your cart is empty</h3>
      <Link to="/products" className="btn btn-primary" style={{ marginTop:'1rem' }}>Browse Products</Link>
    </div>
  );

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h2>🔒 Checkout</h2>
        <Link to="/cart" className="btn btn-outline btn-sm">← Back to Cart</Link>
      </div>

      <div className="checkout-layout">
        <form onSubmit={placeOrder}>
          <div className="upload-card" style={{ marginBottom:'1.5rem' }}>
            <h3 style={{ marginBottom:'1.5rem' }}>📦 Shipping Information</h3>
            <Alert type="error" msg={error} onClose={() => setError('')} />
            <div className="form-group">
              <label className="form-label">Full Delivery Address *</label>
              <textarea className="form-input" rows={3} required value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="House/Flat No., Street, City, State, PIN Code" />
            </div>
          </div>

          <div className="upload-card" style={{ marginBottom:'1.5rem' }}>
            <h3 style={{ marginBottom:'1.5rem' }}>💳 Payment Method</h3>
            <div className="payment-methods">
              {['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'COD', 'Wallet'].map(m => (
                <button type="button" key={m}
                  className={`payment-option ${payMethod === m ? 'selected' : ''}`}
                  onClick={() => setPayMethod(m)}>
                  {m === 'UPI' && '📱 '}{m === 'Credit Card' && '💳 '}{m === 'Debit Card' && '🏦 '}
                  {m === 'Net Banking' && '🌐 '}{m === 'COD' && '💵 '}{m === 'Wallet' && '👛 '}
                  {m}
                </button>
              ))}
            </div>
            <div className="alert alert-info" style={{ marginTop:'0.5rem', marginBottom:0 }}>
              ✓ This is a demo. No real payment will be processed.
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={placing}>
            {placing ? '⏳ Placing Order...' : `✓ Place Order — ₹${total.toFixed(2)}`}
          </button>
        </form>

        <div className="order-summary">
          <h3>Order Summary</h3>
          {items.map(i => (
            <div key={i.cart_id} className="summary-row">
              <span style={{ maxWidth:'200px' }}>{i.name} ×{i.quantity}</span>
              <span>₹{(i.price * i.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="divider"/>
          <div className="summary-row"><span>Subtotal</span><span>₹{total.toFixed(2)}</span></div>
          <div className="summary-row"><span>Shipping</span><span style={{ color:'var(--color-success)' }}>Free</span></div>
          <div className="summary-row"><span>Tax (0%)</span><span>₹0.00</span></div>
          <div className="summary-row total"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
          <div className="divider"/>
          <div style={{ fontSize:'0.85rem', color:'var(--color-text-muted)' }}>
            <p>🔒 Secure checkout</p>
            <p style={{ marginTop:'0.3rem' }}>Payment: <strong>{payMethod}</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CUSTOMER DASHBOARD ───────────────────────────────────────────────────────
function CustomerDashboard({ user }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get('/orders')
      .then(r => setOrders(r.data))
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'Pending').length,
    delivered: orders.filter(o => o.status === 'Delivered').length,
    spent: orders.reduce((s, o) => s + o.total_amount, 0),
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h2>👤 My Dashboard</h2>
        <Link to="/products" className="btn btn-primary btn-sm">Shop More</Link>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{stats.total}</div>
          <div className="stat-label">Total Orders</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.pending}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.delivered}</div>
          <div className="stat-label">Delivered</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">₹{stats.spent.toFixed(0)}</div>
          <div className="stat-label">Total Spent</div>
        </div>
      </div>

      <h3 className="section-title">My Orders</h3>
      {loading ? <Spinner /> : orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <h3>No orders yet</h3>
          <Link to="/products" className="btn btn-primary" style={{ marginTop:'1rem' }}>Start Shopping</Link>
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
                <th>Shipping To</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.order_id}>
                  <td><strong>#{o.order_id}</strong></td>
                  <td>{new Date(o.order_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</td>
                  <td><strong>₹{o.total_amount.toFixed(2)}</strong></td>
                  <td><span className={statusBadgeClass(o.status)}>{o.status}</span></td>
                  <td style={{ maxWidth:'200px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                    {o.shipping_address}
                  </td>
                  <td>
                    <button className="btn btn-outline btn-sm" onClick={() => setSelected(o)}>
                      <Eye size={14}/> Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && <OrderDetailModal order={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// ─── ORDER DETAIL MODAL ───────────────────────────────────────────────────────
function OrderDetailModal({ order, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/orders/${order.order_id}/items`)
      .then(r => setItems(r.data))
      .finally(() => setLoading(false));
  }, [order.order_id]);

  const idx = STATUS_ORDER.indexOf(order.status);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth:'560px' }}>
        <div className="modal-header">
          <h3>Order #{order.order_id}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div style={{ marginBottom:'1.5rem' }}>
          <div className="status-timeline">
            {STATUS_ORDER.map((s, i) => (
              <div key={s} className={`status-step ${i <= idx ? 'done' : ''} ${i === idx ? 'current' : ''}`}>
                <div className="status-dot">{i < idx ? '✓' : i+1}</div>
                <div className="status-label">{s}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="summary-row">
          <span>Order Date</span>
          <span>{new Date(order.order_date).toLocaleString('en-IN')}</span>
        </div>
        <div className="summary-row">
          <span>Shipping Address</span>
          <span style={{ textAlign:'right', maxWidth:'250px' }}>{order.shipping_address}</span>
        </div>
        <div className="divider"/>

        <h4 style={{ marginBottom:'1rem' }}>Items Ordered</h4>
        {loading ? <Spinner /> : items.map(item => (
          <div key={item.item_id} className="summary-row">
            <span>{item.name} × {item.quantity}</span>
            <span>₹{(item.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
        <div className="divider"/>
        <div className="summary-row total">
          <span>Total Paid</span>
          <span>₹{order.total_amount.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── SELLER DASHBOARD ─────────────────────────────────────────────────────────
function SellerDashboard({ user }) {
  const [tab, setTab] = useState('overview');

  const tabs = [
    { id:'overview',  label:'Overview',       icon:<Home size={16}/> },
    { id:'products',  label:'My Products',    icon:<Package size={16}/> },
    { id:'upload',    label:'Upload Product', icon:<PlusCircle size={16}/> },
    { id:'orders',    label:'Orders',         icon:<List size={16}/> },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h2>🏪 Seller Dashboard</h2>
        <span style={{ color:'var(--color-text-muted)' }}>Welcome, {user.name}</span>
      </div>

      <div className="dashboard-layout">
        <aside className="sidebar">
          <div className="sidebar-title">Dashboard</div>
          <nav className="sidebar-nav">
            {tabs.map(t => (
              <button key={t.id} className={`sidebar-item ${tab === t.id ? 'active' : ''}`}
                onClick={() => setTab(t.id)}>
                {t.icon} {t.label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="dashboard-content">
          {tab === 'overview'  && <SellerOverview />}
          {tab === 'products'  && <SellerProducts setTab={setTab} />}
          {tab === 'upload'    && <UploadProduct onSuccess={() => setTab('products')} />}
          {tab === 'orders'    && <SellerOrders />}
        </div>
      </div>
    </div>
  );
}

function SellerOverview() {
  const [data, setData] = useState({ products:[], orders:[] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/products/my'), api.get('/orders')])
      .then(([p, o]) => setData({ products: p.data, orders: o.data }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const revenue  = data.orders.reduce((s, o) => s + o.total_amount, 0);
  const pending  = data.orders.filter(o => o.status === 'Pending').length;
  const delivered = data.orders.filter(o => o.status === 'Delivered').length;

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{data.products.length}</div>
          <div className="stat-label">Total Products</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{data.orders.length}</div>
          <div className="stat-label">Total Orders</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{pending}</div>
          <div className="stat-label">Pending Orders</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">₹{revenue.toFixed(0)}</div>
          <div className="stat-label">Total Revenue</div>
        </div>
      </div>

      <h3 className="section-title">Recent Orders</h3>
      {data.orders.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">📋</div><h3>No orders yet</h3></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Order #</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {data.orders.slice(0, 5).map(o => (
                <tr key={o.order_id}>
                  <td><strong>#{o.order_id}</strong></td>
                  <td>{new Date(o.order_date).toLocaleDateString('en-IN')}</td>
                  <td>₹{o.total_amount.toFixed(2)}</td>
                  <td><span className={statusBadgeClass(o.status)}>{o.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SellerProducts({ setTab }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [msg, setMsg]           = useState('');
  const [editProduct, setEditProduct] = useState(null);

  const fetch = useCallback(() => {
    setLoading(true);
    api.get('/products/my')
      .then(r => setProducts(r.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const deleteProduct = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    setDeleting(id);
    try {
      await api.delete(`/products/${id}`);
      setMsg('Product deleted.');
      fetch();
    } catch (e) {
      setMsg(e.response?.data?.msg || 'Error deleting');
    } finally { setDeleting(null); setTimeout(() => setMsg(''), 3000); }
  };

  return (
    <div>
      <div className="page-header">
        <h3 style={{ marginBottom:0 }}>My Products ({products.length})</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setTab('upload')}>
          <PlusCircle size={15}/> Add Product
        </button>
      </div>

      {msg && <Alert type={msg.includes('deleted') ? 'success' : 'error'} msg={msg} onClose={() => setMsg('')} />}

      {loading ? <Spinner /> : products.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <h3>No products yet</h3>
          <button className="btn btn-primary" style={{ marginTop:'1rem' }} onClick={() => setTab('upload')}>
            Upload First Product
          </button>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Image</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.product_id}>
                  <td>
                    <img
                      src={p.image || `https://picsum.photos/seed/${p.product_id}/60/60`}
                      alt={p.name}
                      style={{ width:50, height:50, objectFit:'cover', borderRadius:6 }}
                      onError={e => { e.target.src=`https://picsum.photos/seed/${p.product_id+3}/60/60`; }}
                    />
                  </td>
                  <td><strong>{p.name}</strong><br/><small style={{ color:'var(--color-text-muted)' }}>{p.description?.slice(0,40)}...</small></td>
                  <td><span className="badge badge-info">{p.category_name}</span></td>
                  <td><strong>₹{p.price.toFixed(2)}</strong></td>
                  <td>
                    <span style={{ color: p.quantity < 5 ? 'var(--color-danger)' : 'var(--color-success)', fontWeight:600 }}>
                      {p.quantity}
                    </span>
                  </td>
                  <td style={{ display:'flex', gap:'0.5rem' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => setEditProduct(p)}>
                      <Edit size={13}/> Edit
                    </button>
                    <button className="btn btn-danger btn-sm"
                      disabled={deleting === p.product_id}
                      onClick={() => deleteProduct(p.product_id)}>
                      <Trash2 size={13}/> {deleting === p.product_id ? '...' : 'Del'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editProduct && <EditProductModal product={editProduct} onClose={() => { setEditProduct(null); fetch(); }} />}
    </div>
  );
}

function UploadProduct({ onSuccess }) {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name:'', description:'', price:'', quantity:'', category_id:'', image:'' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/categories').then(r => setCategories(r.data));
  }, []);

  const handleSubmit = async e => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/products', {
        ...form,
        price: parseFloat(form.price),
        quantity: parseInt(form.quantity),
        category_id: parseInt(form.category_id),
      });
      setMsg('Product uploaded successfully! 🎉');
      setForm({ name:'', description:'', price:'', quantity:'', category_id:'', image:'' });
      setTimeout(onSuccess, 1500);
    } catch (e) {
      setError(e.response?.data?.msg || 'Failed to upload product');
    } finally { setLoading(false); }
  };

  return (
    <div>
      <h3 className="section-title">Upload New Product</h3>
      <div className="upload-card">
        {msg && <Alert type="success" msg={msg} />}
        {error && <Alert type="error" msg={error} onClose={() => setError('')} />}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Product Name *</label>
            <input className="form-input" required value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Hand-painted Ceramic Mug" />
          </div>

          <div className="form-group">
            <label className="form-label">Category *</label>
            <select className="form-input" required value={form.category_id}
              onChange={e => setForm({ ...form, category_id: e.target.value })}>
              <option value="">Select category</option>
              {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Describe your product..." />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
            <div className="form-group">
              <label className="form-label">Price (₹) *</label>
              <input type="number" min="0" step="0.01" className="form-input" required
                value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
                placeholder="0.00" />
            </div>
            <div className="form-group">
              <label className="form-label">Stock Quantity *</label>
              <input type="number" min="0" className="form-input" required
                value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })}
                placeholder="10" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Image URL</label>
            <input className="form-input" value={form.image}
              onChange={e => setForm({ ...form, image: e.target.value })}
              placeholder="https://example.com/image.jpg (optional)" />
            {form.image && (
              <img src={form.image} alt="preview" className="image-preview"
                onError={e => { e.target.style.display='none'; }} />
            )}
          </div>

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            {loading ? '⏳ Uploading...' : '✓ Upload Product'}
          </button>
        </form>
      </div>
    </div>
  );
}

function EditProductModal({ product, onClose }) {
  const [form, setForm] = useState({
    name: product.name,
    description: product.description || '',
    price: product.price,
    quantity: product.quantity,
    image: product.image || '',
    category_id: product.category_id,
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { api.get('/categories').then(r => setCategories(r.data)); }, []);

  const handleSubmit = async e => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      await api.put(`/products/${product.product_id}`, {
        ...form,
        price: parseFloat(form.price),
        quantity: parseInt(form.quantity),
        category_id: parseInt(form.category_id),
      });
      onClose();
    } catch (e) {
      setError(e.response?.data?.msg || 'Update failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth:'500px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Product</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        {error && <Alert type="error" msg={error} onClose={() => setError('')} />}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-input" value={form.category_id}
              onChange={e => setForm({ ...form, category_id: e.target.value })}>
              {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
            <div className="form-group">
              <label className="form-label">Price (₹)</label>
              <input type="number" step="0.01" className="form-input" value={form.price}
                onChange={e => setForm({ ...form, price: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Stock</label>
              <input type="number" className="form-input" value={form.quantity}
                onChange={e => setForm({ ...form, quantity: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Image URL</label>
            <input className="form-input" value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} />
          </div>
          <div style={{ display:'flex', gap:'1rem' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '⏳ Saving...' : '✓ Save Changes'}
            </button>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SellerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [msg, setMsg] = useState('');

  const fetchOrders = useCallback(() => {
    setLoading(true);
    api.get('/orders').then(r => setOrders(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const updateStatus = async (order_id, status) => {
    setUpdating(order_id);
    try {
      await api.put(`/orders/${order_id}/status`, { status });
      setMsg(`Order #${order_id} updated to "${status}"`);
      fetchOrders();
    } catch (e) {
      setMsg('Failed to update status');
    } finally {
      setUpdating(null);
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const nextStatus = (current) => {
    const idx = STATUS_ORDER.indexOf(current);
    return idx < STATUS_ORDER.length - 1 ? STATUS_ORDER[idx + 1] : null;
  };

  return (
    <div>
      <div className="page-header">
        <h3 style={{ marginBottom:0 }}>Received Orders ({orders.length})</h3>
      </div>
      {msg && <Alert type={msg.includes('Failed') ? 'error' : 'success'} msg={msg} onClose={() => setMsg('')} />}
      {loading ? <Spinner /> : orders.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>No orders yet</h3>
          <p>Orders from customers will appear here</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Order #</th><th>Date</th><th>Amount</th><th>Status</th><th>Shipping To</th><th>Update Status</th></tr>
            </thead>
            <tbody>
              {orders.map(o => {
                const next = nextStatus(o.status);
                return (
                  <tr key={o.order_id}>
                    <td><strong>#{o.order_id}</strong></td>
                    <td>{new Date(o.order_date).toLocaleDateString('en-IN')}</td>
                    <td><strong>₹{o.total_amount.toFixed(2)}</strong></td>
                    <td><span className={statusBadgeClass(o.status)}>{o.status}</span></td>
                    <td style={{ maxWidth:'180px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {o.shipping_address}
                    </td>
                    <td>
                      {next ? (
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={updating === o.order_id}
                          onClick={() => updateStatus(o.order_id, next)}>
                          {updating === o.order_id ? '...' : `→ ${next}`}
                        </button>
                      ) : (
                        <span className="badge badge-success">✓ Complete</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default App;
