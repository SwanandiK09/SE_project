const express = require('express');
const db = require('../database/db');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET all products
router.get('/', (req, res) => {
    const { category, search } = req.query;
    let query = 'SELECT p.*, c.category_name, u.name as seller_name FROM products p JOIN categories c ON p.category_id = c.category_id JOIN users u ON p.seller_id = u.user_id WHERE 1=1';
    let params = [];

    if (category) {
        query += ' AND p.category_id = ?';
        params.push(category);
    }
    if (search) {
        query += ' AND p.name LIKE ?';
        params.push(`%${search}%`);
    }

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// GET a single product
router.get('/:id', (req, res) => {
    const { id } = req.params;
    db.get('SELECT p.*, c.category_name, u.name as seller_name FROM products p JOIN categories c ON p.category_id = c.category_id JOIN users u ON p.seller_id = u.user_id WHERE p.product_id = ?', [id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ msg: 'Product not found' });
        res.json(row);
    });
});

// POST - Add a product (SELLER only)
router.post('/', authMiddleware, roleMiddleware(['SELLER']), (req, res) => {
    const { category_id, name, description, price, quantity, image } = req.body;
    const seller_id = req.user.id;

    if (!category_id || !name || !price) {
        return res.status(400).json({ msg: 'Please provide category_id, name, and price' });
    }

    db.run(
        'INSERT INTO products (seller_id, category_id, name, description, price, quantity, image) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [seller_id, category_id, name, description, price, quantity || 0, image || ''],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ msg: 'Product added successfully', product_id: this.lastID });
        }
    );
});

// PUT - Update a product (SELLER only, must be owner)
router.put('/:id', authMiddleware, roleMiddleware(['SELLER']), (req, res) => {
    const { id } = req.params;
    const { category_id, name, description, price, quantity, image } = req.body;
    const seller_id = req.user.id;

    // First check if product belongs to seller
    db.get('SELECT * FROM products WHERE product_id = ? AND seller_id = ?', [id, seller_id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(403).json({ msg: 'Not authorized to update this product' });

        db.run(
            'UPDATE products SET category_id = COALESCE(?, category_id), name = COALESCE(?, name), description = COALESCE(?, description), price = COALESCE(?, price), quantity = COALESCE(?, quantity), image = COALESCE(?, image) WHERE product_id = ?',
            [category_id, name, description, price, quantity, image, id],
            function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ msg: 'Product updated successfully' });
            }
        );
    });
});

// DELETE - Delete a product (SELLER only, must be owner)
router.delete('/:id', authMiddleware, roleMiddleware(['SELLER', 'ADMIN']), (req, res) => {
    const { id } = req.params;
    const user_id = req.user.id;
    const role = req.user.role;

    let query = 'DELETE FROM products WHERE product_id = ?';
    let params = [id];

    if (role === 'SELLER') {
        query += ' AND seller_id = ?';
        params.push(user_id);
    }

    db.run(query, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ msg: 'Product not found or unauthorized' });
        res.json({ msg: 'Product deleted successfully' });
    });
});

module.exports = router;
