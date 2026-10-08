const express = require('express');
const db = require('../database/db');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// Place an order (Customer)
router.post('/', authMiddleware, roleMiddleware(['CUSTOMER']), (req, res) => {
    const customer_id = req.user.id;
    const { shipping_address, payment_method } = req.body;

    if (!shipping_address || !payment_method) {
        return res.status(400).json({ msg: 'Shipping address and payment method required' });
    }

    // 1. Get cart items
    db.all('SELECT c.cart_id, c.quantity, p.product_id, p.price, p.quantity as stock FROM cart c JOIN products p ON c.product_id = p.product_id WHERE c.customer_id = ?', [customer_id], (err, cartItems) => {
        if (err) return res.status(500).json({ error: err.message });
        if (cartItems.length === 0) return res.status(400).json({ msg: 'Cart is empty' });

        // 2. Check stock availability for all items
        for (let item of cartItems) {
            if (item.quantity > item.stock) {
                return res.status(400).json({ msg: `Product ID ${item.product_id} does not have enough stock` });
            }
        }

        // 3. Calculate total
        const total_amount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // 4. Create Order
        db.run('INSERT INTO orders (customer_id, total_amount, shipping_address, status) VALUES (?, ?, ?, ?)', [customer_id, total_amount, shipping_address, 'Pending'], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            const order_id = this.lastID;

            // 5. Create Order Items & Update Stock & Clear Cart & Create Payment
            cartItems.forEach(item => {
                db.run('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)', [order_id, item.product_id, item.quantity, item.price]);
                db.run('UPDATE products SET quantity = quantity - ? WHERE product_id = ?', [item.quantity, item.product_id]);
            });
            
            db.run('DELETE FROM cart WHERE customer_id = ?', [customer_id]);
            
            db.run('INSERT INTO payments (order_id, amount, payment_method, status) VALUES (?, ?, ?, ?)', [order_id, total_amount, payment_method, 'Completed']);

            res.status(201).json({ msg: 'Order placed successfully', order_id });
        });
    });
});

// Get orders (Customer or Seller or Admin)
router.get('/', authMiddleware, (req, res) => {
    const user_id = req.user.id;
    const role = req.user.role;

    if (role === 'CUSTOMER') {
        db.all('SELECT * FROM orders WHERE customer_id = ? ORDER BY order_date DESC', [user_id], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    } else if (role === 'SELLER') {
        const query = `
            SELECT DISTINCT o.* 
            FROM orders o 
            JOIN order_items oi ON o.order_id = oi.order_id 
            JOIN products p ON oi.product_id = p.product_id 
            WHERE p.seller_id = ? ORDER BY o.order_date DESC
        `;
        db.all(query, [user_id], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    } else if (role === 'ADMIN') {
        db.all('SELECT * FROM orders ORDER BY order_date DESC', [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    } else {
        res.status(403).json({ msg: 'Not authorized' });
    }
});

// Update order status (Seller only)
router.put('/:id/status', authMiddleware, roleMiddleware(['SELLER', 'ADMIN']), (req, res) => {
    const order_id = req.params.id;
    const { status } = req.body;
    
    // Simplification: In a real app we'd verify the seller owns items in this order
    db.run('UPDATE orders SET status = ? WHERE order_id = ?', [status, order_id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ msg: 'Order status updated successfully' });
    });
});

module.exports = router;
