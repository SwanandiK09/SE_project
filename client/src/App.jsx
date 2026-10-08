import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, User, LogOut } from 'lucide-react';
import axios from 'axios';

// API Config
const API_URL = 'http://localhost:5000/api';

function App() {
  const [user, setUser] = useState(null);
  
  // On mount, check if user is logged in
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <Router>
      <div className="app-container">
        {/* Navigation Bar */}
        <nav className="navbar">
          <Link to="/" className="nav-brand">
            🌿 Artisan Marketplace
          </Link>
          
          <div className="nav-links">
            <Link to="/" className="nav-item">Home</Link>
            <Link to="/products" className="nav-item">Products</Link>
            {user?.role === 'SELLER' && <Link to="/seller" className="nav-item">Seller Dashboard</Link>}
            {user?.role === 'CUSTOMER' && <Link to="/cart" className="nav-item"><ShoppingCart size={20} /></Link>}
            
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ color: 'var(--color-primary)', fontWeight: '500' }}>Hi, {user.name}</span>
                <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.4rem 0.8rem' }}>
                  <LogOut size={16} /> Logout
                </button>
              </div>
            ) : (
              <Link to="/login" className="btn btn-primary">Login / Register</Link>
            )}
          </div>
        </nav>

        {/* Main Content Routing */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/login" element={<Login setUser={setUser} />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

// ---------------- PAGES ----------------

function Home() {
  return (
    <div className="animate-fade-in">
      <div className="hero">
        <h1>Handcrafted Goods, Straight from the Artisan</h1>
        <p>Discover unique, authentic, and beautifully crafted products from independent sellers around the world.</p>
        <Link to="/products" className="btn btn-primary">Shop Now</Link>
      </div>
      
      <h2 style={{ textAlign: 'center', margin: '3rem 0 2rem' }}>Featured Categories</h2>
      <div className="product-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        {['Ceramics & Pottery', 'Leather Goods', 'Jewelry', 'Woodwork'].map((cat, i) => (
          <div key={i} className="card" style={{ padding: '2rem', textAlign: 'center', cursor: 'pointer' }}>
            <h3>{cat}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}

function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get(`${API_URL}/products`);
        setProducts(res.data);
      } catch (error) {
        console.error("Error fetching products", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  return (
    <div className="animate-fade-in">
      <h2>All Artisan Products</h2>
      {loading ? (
        <p>Loading beautifully crafted goods...</p>
      ) : (
        <div className="product-grid">
          {products.map(p => (
            <div key={p.product_id} className="card">
              <img src={p.image || 'https://via.placeholder.com/300?text=No+Image'} alt={p.name} className="card-image" />
              <div className="card-content">
                <span className="badge badge-info" style={{ marginBottom: '0.5rem', display: 'inline-block' }}>
                  {p.category_name}
                </span>
                <h3 className="card-title">{p.name}</h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>By {p.seller_name}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="card-price">${p.price.toFixed(2)}</span>
                  <button className="btn btn-primary">Add to Cart</button>
                </div>
              </div>
            </div>
          ))}
          {products.length === 0 && <p>No products found.</p>}
        </div>
      )}
    </div>
  );
}

function Login({ setUser }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: 'CUSTOMER'
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const res = await axios.post(`${API_URL}${endpoint}`, formData);
      
      // Save user & token
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.msg || 'An error occurred');
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '400px', margin: '0 auto', background: 'var(--color-surface)', padding: '2rem', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)' }}>
      <h2 style={{ textAlign: 'center' }}>{isLogin ? 'Welcome Back' : 'Join the Marketplace'}</h2>
      
      {error && <div style={{ background: '#FFEBEE', color: '#C62828', padding: '0.8rem', borderRadius: '4px', marginBottom: '1rem' }}>{error}</div>}
      
      <form onSubmit={handleSubmit}>
        {!isLogin && (
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input type="text" name="name" className="form-input" required onChange={handleChange} />
          </div>
        )}
        
        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input type="email" name="email" className="form-input" required onChange={handleChange} />
        </div>
        
        <div className="form-group">
          <label className="form-label">Password</label>
          <input type="password" name="password" className="form-input" required onChange={handleChange} />
        </div>

        {!isLogin && (
          <div className="form-group">
            <label className="form-label">I want to register as a:</label>
            <select name="role" className="form-input" onChange={handleChange}>
              <option value="CUSTOMER">Customer (Buy Products)</option>
              <option value="SELLER">Artisan (Sell Products)</option>
            </select>
          </div>
        )}
        
        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.8rem' }}>
          {isLogin ? 'Sign In' : 'Create Account'}
        </button>
      </form>
      
      <p style={{ textAlign: 'center', marginTop: '1.5rem' }}>
        {isLogin ? "Don't have an account? " : "Already have an account? "}
        <span style={{ color: 'var(--color-primary)', cursor: 'pointer', fontWeight: '500' }} onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? 'Register here' : 'Login here'}
        </span>
      </p>
    </div>
  );
}

export default App;
