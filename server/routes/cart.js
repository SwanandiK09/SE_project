const express = require('express');
const db = require('../database/db');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get customer cart
router.get('/', authMiddleware, roleMiddleware(['CUSTOMER']), (req, res) => {
    const customer_id = req.user.id;
    const query = `
        SELECT c.cart_id, c.quantity, p.product_id, p.name, p.price, p.image, p.seller_id 
        FROM cart c 
        JOIN products p ON c.product_id = p.product_id 
        WHERE c.customer_id = ?
    `;

    db.all(query, [customer_id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Add item to cart
router.post('/', authMiddleware, roleMiddleware(['CUSTOMER']), (req, res) => {
    const customer_id = req.user.id;
    const { product_id, quantity } = req.body;

    if (!product_id || !quantity) return res.status(400).json({ msg: 'Product ID and quantity are required' });

    // Check stock
    db.get('SELECT quantity FROM products WHERE product_id = ?', [product_id], (err, product) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!product) return res.status(404).json({ msg: 'Product not found' });
        if (product.quantity < quantity) return res.status(400).json({ msg: 'Not enough stock available' });

        // Check if item already in cart
        db.get('SELECT * FROM cart WHERE customer_id = ? AND product_id = ?', [customer_id, product_id], (err, row) => {
            if (row) {
                // Update quantity
                db.run('UPDATE cart SET quantity = quantity + ? WHERE cart_id = ?', [quantity, row.cart_id], function(err) {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ msg: 'Cart updated successfully' });
                });
            } else {
                // Insert new
                db.run('INSERT INTO cart (customer_id, product_id, quantity) VALUES (?, ?, ?)', [customer_id, product_id, quantity], function(err) {
                    if (err) return res.status(500).json({ error: err.message });
                    res.status(201).json({ msg: 'Added to cart successfully' });
                });
            }
        });
    });
});

// Remove item from cart
router.delete('/:id', authMiddleware, roleMiddleware(['CUSTOMER']), (req, res) => {
    const cart_id = req.params.id;
    const customer_id = req.user.id;

    db.run('DELETE FROM cart WHERE cart_id = ? AND customer_id = ?', [cart_id, customer_id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ msg: 'Item removed from cart' });
    });
});

module.exports = router;
