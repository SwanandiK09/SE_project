import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate, useLocation
} from 'react-router-dom';
import {
  ShoppingCart, LogOut, Trash2, UserCheck, CheckCircle2,
  Package, Truck, Eye, Edit2, AlertCircle, X, Check, XCircle
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
const STATUS_ORDER = ['Pending', 'Accepted', 'Preparing', 'Shipped', 'Delivered', 'Cancelled'];

function statusBadgeClass(s) {
  const m = {
    Pending: 'pending',
    Accepted: 'accepted',
    Preparing: 'preparing',
    Shipped: 'shipped',
    Delivered: 'delivered',
    Cancelled: 'danger',
    'In Progress': 'info',
    Responded: 'accepted',
    Resolved: 'delivered'
  };
  return `badge badge-${m[s] || 'info'}`;
}

const AUTHORIZED_EMAIL_DOMAINS = [
  'gmail.com', 'google.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.in', 'yahoo.co.uk',
  'yahoo.ca', 'yahoo.com.au', 'yahoo.fr', 'yahoo.de', 'outlook.com', 'hotmail.com',
  'live.com', 'msn.com', 'icloud.com', 'me.com', 'mac.com', 'aol.com', 'zoho.com',
  'proton.me', 'protonmail.com', 'rediffmail.com', 'example.com'
];

function validateEmailAddress(email) {
  if (!email || typeof email !== 'string') return { valid: false, msg: 'Email address is required' };
  const trimmed = email.trim().toLowerCase();
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(trimmed)) return { valid: false, msg: 'Please enter a valid email format' };
  const parts = trimmed.split('@');
  if (parts.length !== 2) return { valid: false, msg: 'Please enter a valid email address' };
  const domain = parts[1];
  const blocked = ['email.com', 'test.com', 'tempmail.com', 'fake.com', 'mailinator.com', 'dummy.com', '123.com'];
  if (blocked.includes(domain)) {
    return {
      valid: false,
      msg: `The email domain "${domain}" is not authorized. Please use a real email provider like Google (@gmail.com / @google.com), Yahoo, Outlook, or iCloud.`
    };
  }
  const isAuth = AUTHORIZED_EMAIL_DOMAINS.includes(domain) || domain.endsWith('.edu') || domain.endsWith('.ac.in');
  if (!isAuth) {
    return {
      valid: false,
      msg: `Email domain "${domain}" is not authorized. Only legitimate providers like Google (@gmail.com / @google.com), Yahoo (@yahoo.com), Outlook, or iCloud are allowed.`
    };
  }
  return { valid: true, email: trimmed };
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

// ─── ORDER TRACKING MODAL ─────────────────────────────────────────────────────
function OrderTrackerModal({ order, onClose, onCancelOrder }) {
  if (!order) return null;

  const steps = [
    { key: 'Pending', label: 'Order Placed', desc: 'Order received & confirmed' },
    { key: 'Accepted', label: 'Accepted', desc: 'Artisan confirmed your order' },
    { key: 'Preparing', label: 'Preparing', desc: 'Handcrafted with care' },
    { key: 'Shipped', label: 'Shipped', desc: 'Dispatched with courier' },
    { key: 'Delivered', label: 'Delivered', desc: 'Delivered to your address' }
  ];

  const isCancelled = order.status === 'Cancelled';
  const isShippedOrDelivered = order.status === 'Shipped' || order.status === 'Delivered';
  const currentIndex = steps.findIndex(s => s.key === order.status);
  const activeIndex = currentIndex >= 0 ? currentIndex : 0;
  const progressPercent = isCancelled ? 0 : (activeIndex / (steps.length - 1)) * 100;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3><Truck size={20} color="var(--color-primary)" /> Track Order #{order.order_id}</h3>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Placed On</div>
              <strong>{new Date(order.order_date).toLocaleString()}</strong>
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', textAlign: 'right' }}>Current Status</div>
              <span className={statusBadgeClass(order.status)} style={{ fontSize: '0.9rem', padding: '0.3rem 0.8rem' }}>
                {order.status}
              </span>
            </div>
          </div>

          {isCancelled ? (
            <div className="tracker-cancelled-notice">
              <AlertCircle size={24} style={{ flexShrink: 0 }} />
              <div>
                <strong>Order Cancelled</strong>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
                  This order has been cancelled and any payment has been refunded to your original payment method.
                </p>
              </div>
            </div>
          ) : (
            <div className="order-tracker-card">
              <div className="tracker-stepper">
                <div className="tracker-line-bar">
                  <div className="tracker-line-progress" style={{ width: `${progressPercent}%` }} />
                </div>
                {steps.map((st, i) => {
                  const isCompleted = !isCancelled && i < activeIndex;
                  const isActive = !isCancelled && i === activeIndex;
                  return (
                    <div
                      key={st.key}
                      className={`tracker-step-item ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}
                    >
                      <div className="tracker-node">
                        {isCompleted ? <Check size={18} /> : i + 1}
                      </div>
                      <div className="tracker-label">{st.label}</div>
                    </div>
                  );
                })}
              </div>

              <div style={{ textAlign: 'center', marginTop: '1rem', padding: '0.75rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)' }}>
                <strong style={{ color: 'var(--color-primary)' }}>
                  {steps[activeIndex]?.label}:
                </strong>{' '}
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                  {steps[activeIndex]?.desc}
                </span>
              </div>
            </div>
          )}

          <div style={{ marginTop: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div style={{ background: 'var(--color-surface-warm)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>📍 Delivery Address</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--color-text-main)' }}>{order.shipping_address || 'Standard Delivery Address'}</div>
            </div>
            <div style={{ background: 'var(--color-surface-warm)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>💳 Payment Method</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--color-text-main)' }}>
                {order.payment_method || 'Online Payment'} • <strong>₹{Number(order.total_amount).toFixed(2)}</strong>
              </div>
            </div>
          </div>

          {isShippedOrDelivered && (
            <div style={{ marginTop: '1.25rem', padding: '0.75rem 1rem', background: 'rgba(74, 158, 226, 0.12)', border: '1px solid rgba(74, 158, 226, 0.3)', borderRadius: 'var(--radius-sm)', fontSize: '0.86rem', color: '#8AC5F8' }}>
              🔒 <strong>Cancellation Locked:</strong> This order has already been {order.status.toLowerCase()} and can no longer be cancelled.
            </div>
          )}
        </div>

        <div className="modal-footer">
          {!isCancelled && !isShippedOrDelivered && onCancelOrder && (
            <button
              onClick={() => onCancelOrder(order.order_id)}
              className="btn btn-outline"
              style={{ color: '#FFA199', borderColor: '#E05345', marginRight: 'auto' }}
            >
              Cancel Order
            </button>
          )}
          <button onClick={onClose} className="btn btn-primary btn-sm">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── ORDER DETAILS MODAL ──────────────────────────────────────────────────────
function OrderDetailsModal({ order, onClose, onCancelOrder, onTrackOrder, isSeller = false }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!order) return;
    if (order.items && Array.isArray(order.items)) {
      setItems(order.items);
      setLoading(false);
      return;
    }
    api.get(`/orders/${order.order_id}`)
      .then(res => {
        if (res.data?.items) setItems(res.data.items);
      })
      .catch(() => {
        api.get(`/orders/${order.order_id}/items`)
          .then(res => setItems(res.data || []))
          .catch(() => setItems([]));
      })
      .finally(() => setLoading(false));
  }, [order]);

  if (!order) return null;

  const isShippedOrDelivered = order.status === 'Shipped' || order.status === 'Delivered';
  const isCancelled = order.status === 'Cancelled';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3><Package size={20} color="var(--color-primary)" /> Order #{order.order_id} Details</h3>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Status</div>
              <span className={statusBadgeClass(order.status)}>{order.status}</span>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Date Placed</div>
              <div><strong>{new Date(order.order_date).toLocaleDateString()}</strong> {new Date(order.order_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Payment Method</div>
              <div>{order.payment_method || 'Online Payment'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Total Amount</div>
              <div style={{ color: 'var(--color-primary)', fontSize: '1.1rem', fontWeight: '700' }}>
                ₹{Number(order.total_amount).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Customer Info (shown for Seller) */}
          {isSeller && (
            <div style={{ background: 'var(--color-surface-warm)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem' }}>
              <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: 'var(--color-primary)' }}>👤 Customer Information</h4>
              <div style={{ fontSize: '0.88rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
                <div><strong>Name:</strong> {order.customer_name || 'Customer'}</div>
                <div><strong>Email:</strong> {order.customer_email || '—'}</div>
                <div><strong>Phone:</strong> {order.customer_phone || '—'}</div>
              </div>
            </div>
          )}

          {/* Shipping Address */}
          <div style={{ background: 'var(--color-surface-warm)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>📦 Shipping Destination</div>
            <div style={{ fontSize: '0.9rem' }}>{order.shipping_address || 'Standard Delivery'}</div>
          </div>

          {/* Items breakdown */}
          <h4 style={{ margin: '1rem 0 0.5rem', fontSize: '0.95rem' }}>Order Items ({items.length})</h4>
          {loading ? (
            <Spinner />
          ) : items.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>No items found for this order.</p>
          ) : (
            <div className="order-detail-items">
              {items.map(item => (
                <div key={item.item_id || item.product_id} className="order-detail-item-row">
                  {item.image && (
                    <img src={item.image} alt={item.name} className="order-detail-img" />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '0.92rem' }}>{item.name}</div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                      Qty: {item.quantity} × ₹{Number(item.price).toFixed(2)}
                    </div>
                  </div>
                  <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>
                    ₹{(item.quantity * item.price).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {isShippedOrDelivered && (
            <div style={{ marginTop: '1rem', padding: '0.6rem 0.9rem', background: 'rgba(74, 158, 226, 0.1)', border: '1px solid rgba(74, 158, 226, 0.25)', borderRadius: 'var(--radius-sm)', fontSize: '0.84rem', color: '#8AC5F8' }}>
              🔒 Shipped orders cannot be cancelled by customer.
            </div>
          )}
        </div>

        <div className="modal-footer">
          {onTrackOrder && (
            <button onClick={() => { onClose(); onTrackOrder(order); }} className="btn btn-outline btn-sm">
              <Truck size={14} /> Track Order
            </button>
          )}
          {!isSeller && !isCancelled && !isShippedOrDelivered && onCancelOrder && (
            <button
              onClick={() => { onClose(); onCancelOrder(order.order_id); }}
              className="btn btn-outline btn-sm"
              style={{ color: '#FFA199', borderColor: '#E05345' }}
            >
              Cancel Order
            </button>
          )}
          <button onClick={onClose} className="btn btn-primary btn-sm">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── SELLER EDIT ORDER DETAILS MODAL ─────────────────────────────────────────
function SellerEditOrderModal({ order, onClose, onSave }) {
  const [status, setStatus] = useState(order.status || 'Pending');
  const [address, setAddress] = useState(order.shipping_address || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await onSave(order.order_id, {
        status,
        shipping_address: address
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.msg || err.message || 'Failed to update order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3><Edit2 size={20} color="var(--color-primary)" /> Update Order #{order.order_id}</h3>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <Alert type="error" msg={error} onClose={() => setError('')} />

            <div className="form-group">
              <label className="form-label">Order Status</label>
              <select
                className="form-input"
                value={status}
                onChange={e => setStatus(e.target.value)}
              >
                {STATUS_ORDER.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <small style={{ color: 'var(--color-text-muted)', display: 'block', marginTop: '0.3rem', fontSize: '0.8rem' }}>
                * Marking as "Shipped" or "Delivered" locks customer cancellation. Marking as "Cancelled" will automatically restock items.
              </small>
            </div>

            <div className="form-group">
              <label className="form-label">Shipping / Delivery Address & Notes</label>
              <textarea
                className="form-input"
                rows={3}
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Enter customer shipping address or delivery instructions..."
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-outline btn-sm">Cancel</button>
            <button type="submit" disabled={submitting} className="btn btn-primary btn-sm">
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
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
      const emailCheck = validateEmailAddress(form.email);
      if (!emailCheck.valid) {
        throw new Error(emailCheck.msg);
      }

      if (isLogin) {
        // Sign In
        const res = await api.post('/auth/login', {
          email: emailCheck.email,
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
        if (!form.password) throw new Error('Please enter a password');

        const res = await api.post('/auth/register', {
          name: form.name.trim(),
          email: emailCheck.email,
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
              placeholder="you@gmail.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
            <small style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', display: 'block', marginTop: '0.35rem' }}>
              ✓ Only authentic email domains allowed (e.g. @gmail.com, @google.com, @yahoo.com, @outlook.com, @icloud.com). Placeholder domains like @email.com are rejected.
            </small>
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

  const [selectedDetailsOrder, setSelectedDetailsOrder] = useState(null);
  const [selectedTrackingOrder, setSelectedTrackingOrder] = useState(null);
  const [actionMsg, setActionMsg] = useState({ type: 'success', text: '' });

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

  const handleCancelOrder = async (order_id) => {
    if (!window.confirm(`Are you sure you want to cancel Order #${order_id}? Any payment will be refunded immediately.`)) {
      return;
    }
    try {
      const res = await api.post(`/orders/${order_id}/cancel`);
      setActionMsg({ type: 'success', text: res.data.msg || `Order #${order_id} was successfully cancelled.` });
      if (selectedDetailsOrder?.order_id === order_id) {
        setSelectedDetailsOrder(prev => prev ? { ...prev, status: 'Cancelled' } : null);
      }
      if (selectedTrackingOrder?.order_id === order_id) {
        setSelectedTrackingOrder(prev => prev ? { ...prev, status: 'Cancelled' } : null);
      }
      fetchData();
      setTimeout(() => setActionMsg({ type: 'success', text: '' }), 5000);
    } catch (err) {
      setActionMsg({ type: 'error', text: err.response?.data?.msg || 'Could not cancel order.' });
      setTimeout(() => setActionMsg({ type: 'error', text: '' }), 6000);
    }
  };

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
      {/* Modals */}
      {selectedTrackingOrder && (
        <OrderTrackerModal
          order={selectedTrackingOrder}
          onClose={() => setSelectedTrackingOrder(null)}
          onCancelOrder={handleCancelOrder}
        />
      )}
      {selectedDetailsOrder && (
        <OrderDetailsModal
          order={selectedDetailsOrder}
          onClose={() => setSelectedDetailsOrder(null)}
          onCancelOrder={handleCancelOrder}
          onTrackOrder={(o) => {
            setSelectedDetailsOrder(null);
            setSelectedTrackingOrder(o);
          }}
          isSeller={false}
        />
      )}

      <div className="page-header">
        <div>
          <h2>👤 {user ? `${user.name}'s Dashboard` : 'My Dashboard'}</h2>
          <p style={{ color: 'var(--color-text-muted)' }}>Customer Account • {user?.email}</p>
        </div>
        <Link to="/products" className="btn btn-primary btn-sm">Shop More</Link>
      </div>

      {actionMsg.text && (
        <div style={{ marginBottom: '1.5rem' }}>
          <Alert type={actionMsg.type} msg={actionMsg.text} onClose={() => setActionMsg({ type: 'success', text: '' })} />
        </div>
      )}

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
                  <th>Order Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.order_id}>
                    <td><strong>#{o.order_id}</strong></td>
                    <td>{new Date(o.order_date).toLocaleDateString()}</td>
                    <td><strong>₹{Number(o.total_amount).toFixed(2)}</strong></td>
                    <td><span className={statusBadgeClass(o.status)}>{o.status}</span></td>
                    <td style={{ maxWidth: '240px', color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>
                      {o.shipping_address || 'Standard Delivery'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => setSelectedDetailsOrder(o)}
                          className="btn btn-outline btn-sm"
                          title="View complete order details & items"
                          style={{ padding: '0.25rem 0.55rem', fontSize: '0.78rem' }}
                        >
                          <Eye size={13} /> Details
                        </button>
                        <button
                          onClick={() => setSelectedTrackingOrder(o)}
                          className="btn btn-outline btn-sm"
                          title="Track delivery progress"
                          style={{ padding: '0.25rem 0.55rem', fontSize: '0.78rem' }}
                        >
                          <Truck size={13} /> Track
                        </button>
                        {o.status === 'Cancelled' ? (
                          <span style={{ fontSize: '0.75rem', color: '#FFA199', fontWeight: '600', padding: '0.2rem 0.4rem' }}>
                            Cancelled
                          </span>
                        ) : o.status === 'Shipped' || o.status === 'Delivered' ? (
                          <span
                            title="Cannot cancel order once it has been shipped or delivered"
                            style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', padding: '0.2rem 0.45rem', border: '1px dashed var(--color-border)', borderRadius: '4px' }}
                          >
                            🔒 {o.status}
                          </span>
                        ) : (
                          <button
                            onClick={() => handleCancelOrder(o.order_id)}
                            className="btn btn-outline btn-sm"
                            title="Cancel order before shipping"
                            style={{ padding: '0.25rem 0.55rem', fontSize: '0.78rem', color: '#FFA199', borderColor: 'rgba(224, 83, 69, 0.4)' }}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
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
  const [placedOrder, setPlacedOrder] = useState(null);
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [cancelFeedback, setCancelFeedback] = useState('');

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
      const orderInfo = res.data.order || {
        order_id: res.data.order_id,
        shipping_address: address,
        payment_method: paymentMethod,
        total_amount: total,
        status: 'Pending',
        order_date: new Date().toISOString(),
        items: [...items]
      };
      setPlacedOrder(orderInfo);
      setSuccessOrder(res.data.order_id);
      if (onCartChange) onCartChange();
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  const handleCancelPlacedOrder = async () => {
    if (!placedOrder) return;
    if (!window.confirm(`Are you sure you want to cancel Order #${placedOrder.order_id}? Payment of ₹${Number(placedOrder.total_amount).toFixed(2)} will be refunded.`)) {
      return;
    }
    try {
      const res = await api.post(`/orders/${placedOrder.order_id}/cancel`);
      setPlacedOrder(prev => ({ ...prev, status: 'Cancelled' }));
      setCancelFeedback(res.data.msg || 'Order has been successfully cancelled.');
    } catch (err) {
      setCancelFeedback(err.response?.data?.msg || 'Could not cancel order.');
    }
  };

  if (loading) return <Spinner />;

  if (placedOrder) {
    const isCancelled = placedOrder.status === 'Cancelled';
    const isShipped = placedOrder.status === 'Shipped' || placedOrder.status === 'Delivered';

    return (
      <div className="animate-fade-in" style={{ padding: '2rem 1rem' }}>
        {trackingModalOpen && (
          <OrderTrackerModal
            order={placedOrder}
            onClose={() => setTrackingModalOpen(false)}
            onCancelOrder={handleCancelPlacedOrder}
          />
        )}

        <div className="order-receipt-card">
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>{isCancelled ? '❌' : '🎉'}</div>
            <h2>{isCancelled ? 'Order Cancelled' : 'Order Placed Successfully!'}</h2>
            <p style={{ color: 'var(--color-text-muted)' }}>
              Order <strong>#{placedOrder.order_id}</strong> • Placed on {new Date(placedOrder.order_date).toLocaleDateString()}
            </p>
            <div style={{ marginTop: '0.75rem' }}>
              <span className={statusBadgeClass(placedOrder.status)} style={{ fontSize: '0.92rem', padding: '0.35rem 0.9rem' }}>
                Status: {placedOrder.status}
              </span>
            </div>
          </div>

          {cancelFeedback && (
            <div style={{ marginBottom: '1.25rem' }}>
              <Alert type={isCancelled ? 'info' : 'error'} msg={cancelFeedback} onClose={() => setCancelFeedback('')} />
            </div>
          )}

          {/* Mini Stepper Preview */}
          {!isCancelled && (
            <div style={{ background: 'var(--color-surface-warm)', padding: '1.2rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: '600', fontSize: '0.92rem' }}>🚚 Order Progress Tracker</span>
                <button
                  onClick={() => setTrackingModalOpen(true)}
                  className="btn btn-outline btn-sm"
                  style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}
                >
                  <Truck size={13} /> Full Tracker View
                </button>
              </div>
              <div style={{ fontSize: '0.86rem', color: 'var(--color-text-muted)' }}>
                Current Stage: <strong style={{ color: 'var(--color-primary)' }}>{placedOrder.status}</strong> — Handcrafting in progress. Artisan will dispatch shortly.
              </div>
            </div>
          )}

          {/* Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ background: 'var(--color-surface-warm)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.3rem' }}>📍 Delivery Destination</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--color-text-main)' }}>{placedOrder.shipping_address}</div>
            </div>
            <div style={{ background: 'var(--color-surface-warm)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.3rem' }}>💳 Payment Method</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--color-text-main)' }}>
                {placedOrder.payment_method} • <strong>{isCancelled ? 'Refunded ✓' : 'Completed ✓'}</strong>
              </div>
            </div>
          </div>

          {/* Items Breakdown */}
          <h4 style={{ margin: '1.5rem 0 0.75rem', fontSize: '1.05rem' }}>Items Ordered ({placedOrder.items?.length || 0})</h4>
          <div className="order-detail-items">
            {(placedOrder.items || []).map((item, idx) => (
              <div key={item.product_id || idx} className="order-detail-item-row">
                {item.image && (
                  <img src={item.image} alt={item.name} className="order-detail-img" />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '0.94rem' }}>{item.name}</div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                    Qty: {item.quantity} × ₹{Number(item.price).toFixed(2)}
                  </div>
                </div>
                <div style={{ fontWeight: '700', fontSize: '1rem' }}>
                  ₹{(item.quantity * item.price).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '2px solid var(--color-border)' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: '700' }}>Grand Total Paid:</span>
            <span style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--color-primary)' }}>
              ₹{Number(placedOrder.total_amount).toFixed(2)}
            </span>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
            <button
              onClick={() => setTrackingModalOpen(true)}
              className="btn btn-primary"
            >
              <Truck size={16} /> Track Order Live
            </button>

            {!isCancelled && !isShipped && (
              <button
                onClick={handleCancelPlacedOrder}
                className="btn btn-outline"
                style={{ color: '#FFA199', borderColor: '#E05345' }}
              >
                Cancel Order
              </button>
            )}

            <Link to="/customer" className="btn btn-outline" style={{ marginLeft: 'auto' }}>
              My Orders
            </Link>
            <Link to="/products" className="btn btn-outline">
              Continue Shopping
            </Link>
          </div>
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

  const [viewOrderModal, setViewOrderModal] = useState(null);
  const [editOrderModal, setEditOrderModal] = useState(null);
  const [sellerOrderFeedback, setSellerOrderFeedback] = useState({ type: 'success', msg: '' });

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
      setSellerOrderFeedback({ type: 'success', msg: `Order #${order_id} status updated to ${newStatus}` });
      fetchSellerData();
      setTimeout(() => setSellerOrderFeedback({ type: 'success', msg: '' }), 4000);
    } catch (err) {
      setSellerOrderFeedback({ type: 'error', msg: err.response?.data?.msg || 'Failed to update status' });
      setTimeout(() => setSellerOrderFeedback({ type: 'error', msg: '' }), 5000);
    }
  };

  const handleUpdateOrderDetails = async (order_id, data) => {
    try {
      await api.put(`/orders/${order_id}`, data);
      setSellerOrderFeedback({ type: 'success', msg: `Order #${order_id} updated successfully!` });
      fetchSellerData();
      setTimeout(() => setSellerOrderFeedback({ type: 'success', msg: '' }), 4000);
    } catch (err) {
      setSellerOrderFeedback({ type: 'error', msg: err.response?.data?.msg || 'Failed to update order details' });
      setTimeout(() => setSellerOrderFeedback({ type: 'error', msg: '' }), 5000);
    }
  };

  const handleDeleteOrder = async (order_id) => {
    if (!window.confirm(`Are you sure you want to delete Order #${order_id}? This will permanently remove this order and its records.`)) {
      return;
    }
    try {
      const res = await api.delete(`/orders/${order_id}`);
      setSellerOrderFeedback({ type: 'success', msg: res.data.msg || `Order #${order_id} deleted successfully.` });
      fetchSellerData();
      setTimeout(() => setSellerOrderFeedback({ type: 'success', msg: '' }), 5000);
    } catch (err) {
      setSellerOrderFeedback({ type: 'error', msg: err.response?.data?.msg || 'Failed to delete order' });
      setTimeout(() => setSellerOrderFeedback({ type: 'error', msg: '' }), 6000);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Seller Order Modals */}
      {viewOrderModal && (
        <OrderDetailsModal
          order={viewOrderModal}
          onClose={() => setViewOrderModal(null)}
          isSeller={true}
        />
      )}
      {editOrderModal && (
        <SellerEditOrderModal
          order={editOrderModal}
          onClose={() => setEditOrderModal(null)}
          onSave={handleUpdateOrderDetails}
        />
      )}

      <div className="page-header">
        <div>
          <h2>Artisan Studio: {user.name}</h2>
          <p style={{ color: 'var(--color-text-muted)' }}>Manage handcrafted product listings and fulfill customer orders</p>
        </div>
      </div>

      {sellerOrderFeedback.msg && (
        <div style={{ marginBottom: '1.5rem' }}>
          <Alert
            type={sellerOrderFeedback.type}
            msg={sellerOrderFeedback.msg}
            onClose={() => setSellerOrderFeedback({ type: 'success', msg: '' })}
          />
        </div>
      )}

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
                  <th>Customer Info</th>
                  <th>Delivery Address</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.order_id}>
                    <td>
                      <strong>#{o.order_id}</strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                        {new Date(o.order_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <div><strong>{o.customer_name || 'Customer'}</strong></div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        {o.customer_email || '—'}
                      </div>
                      {o.customer_phone && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                          📞 {o.customer_phone}
                        </div>
                      )}
                    </td>
                    <td style={{ maxWidth: '200px', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      {o.shipping_address || 'Standard Delivery'}
                    </td>
                    <td>
                      <strong style={{ color: 'var(--color-primary)' }}>
                        ₹{Number(o.total_amount).toFixed(2)}
                      </strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {o.payment_method || 'Online'}
                      </div>
                    </td>
                    <td>
                      <select
                        className="form-input"
                        style={{ width: 'auto', padding: '0.35rem 0.6rem', fontSize: '0.82rem' }}
                        value={o.status}
                        onChange={e => handleUpdateOrderStatus(o.order_id, e.target.value)}
                      >
                        {STATUS_ORDER.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => setViewOrderModal(o)}
                          className="btn btn-outline btn-sm"
                          title="View order items"
                          style={{ padding: '0.25rem 0.55rem', fontSize: '0.78rem' }}
                        >
                          <Eye size={13} /> Items
                        </button>
                        <button
                          onClick={() => setEditOrderModal(o)}
                          className="btn btn-outline btn-sm"
                          title="Edit order status and address"
                          style={{ padding: '0.25rem 0.55rem', fontSize: '0.78rem' }}
                        >
                          <Edit2 size={13} /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(o.order_id)}
                          className="btn btn-outline btn-sm"
                          title="Delete Order"
                          style={{ padding: '0.25rem 0.55rem', fontSize: '0.78rem', color: '#FFA199', borderColor: 'rgba(224, 83, 69, 0.4)' }}
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
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
