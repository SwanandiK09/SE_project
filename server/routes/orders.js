const express = require('express');
const db = require('../database/db');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

const VALID_STATUSES = ['Pending', 'Accepted', 'Preparing', 'Shipped', 'Delivered', 'Cancelled'];

// Helper to verify if seller owns products in an order
function verifySellerOrderAccess(order_id, seller_id, callback) {
    const query = `
        SELECT 1 FROM order_items oi
        JOIN products p ON oi.product_id = p.product_id
        WHERE oi.order_id = ? AND p.seller_id = ?
        LIMIT 1
    `;
    db.get(query, [order_id, seller_id], (err, row) => {
        if (err) return callback(err);
        callback(null, !!row);
    });
}

// ─── 1. PLACE AN ORDER (Customer) ──────────────────────────────────────────
router.post('/', authMiddleware, roleMiddleware(['CUSTOMER']), (req, res) => {
    const customer_id = req.user.id;
    const { shipping_address, payment_method } = req.body;

    if (!shipping_address || !payment_method) {
        return res.status(400).json({ msg: 'Shipping address and payment method required' });
    }

    // 1. Get cart items with product names and images
    const cartQuery = `
        SELECT c.cart_id, c.quantity, p.product_id, p.name, p.image, p.price, p.quantity as stock 
        FROM cart c 
        JOIN products p ON c.product_id = p.product_id 
        WHERE c.customer_id = ?
    `;
    db.all(cartQuery, [customer_id], (err, cartItems) => {
        if (err) return res.status(500).json({ error: err.message });
        if (cartItems.length === 0) return res.status(400).json({ msg: 'Cart is empty' });

        // 2. Check stock availability for all items
        for (let item of cartItems) {
            if (item.quantity > item.stock) {
                return res.status(400).json({ msg: `Product "${item.name}" does not have enough stock` });
            }
        }

        // 3. Calculate total
        const total_amount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // 4. Create Order
        db.run(
            'INSERT INTO orders (customer_id, total_amount, shipping_address, status) VALUES (?, ?, ?, ?)',
            [customer_id, total_amount, shipping_address, 'Pending'],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                const order_id = this.lastID;

                // 5. Use db.serialize to guarantee all writes happen in order
                db.serialize(() => {
                    cartItems.forEach(item => {
                        db.run(
                            'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                            [order_id, item.product_id, item.quantity, item.price]
                        );
                        db.run(
                            'UPDATE products SET quantity = quantity - ? WHERE product_id = ?',
                            [item.quantity, item.product_id]
                        );
                    });

                    // Clear the customer's cart
                    db.run('DELETE FROM cart WHERE customer_id = ?', [customer_id]);

                    // Record payment
                    db.run(
                        'INSERT INTO payments (order_id, amount, payment_method, status) VALUES (?, ?, ?, ?)',
                        [order_id, total_amount, payment_method, 'Completed'],
                        function(payErr) {
                            if (payErr) return res.status(500).json({ error: payErr.message });

                            // Return complete order details for customer confirmation screen
                            res.status(201).json({
                                msg: 'Order placed successfully',
                                order_id,
                                order: {
                                    order_id,
                                    customer_id,
                                    total_amount,
                                    shipping_address,
                                    payment_method,
                                    status: 'Pending',
                                    order_date: new Date().toISOString(),
                                    items: cartItems.map(item => ({
                                        product_id: item.product_id,
                                        name: item.name,
                                        image: item.image,
                                        price: item.price,
                                        quantity: item.quantity
                                    }))
                                }
                            });
                        }
                    );
                });
            }
        );
    });
});

// ─── 2. GET ORDERS (Customer or Seller or Admin) ───────────────────────────
router.get('/', authMiddleware, (req, res) => {
    const user_id = req.user.id;
    const role = req.user.role;

    if (role === 'CUSTOMER') {
        const query = `
            SELECT o.*, pay.payment_method, pay.status as payment_status
            FROM orders o
            LEFT JOIN payments pay ON o.order_id = pay.order_id
            WHERE o.customer_id = ? 
            ORDER BY o.order_date DESC
        `;
        db.all(query, [user_id], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    } else if (role === 'SELLER') {
        const query = `
            SELECT DISTINCT 
                o.order_id, o.customer_id, o.order_date, o.status, o.total_amount, o.shipping_address,
                u.name as customer_name, u.email as customer_email, u.phone as customer_phone,
                pay.payment_method, pay.status as payment_status
            FROM orders o 
            JOIN order_items oi ON o.order_id = oi.order_id 
            JOIN products p ON oi.product_id = p.product_id 
            LEFT JOIN users u ON o.customer_id = u.user_id
            LEFT JOIN payments pay ON o.order_id = pay.order_id
            WHERE p.seller_id = ? 
            ORDER BY o.order_date DESC
        `;
        db.all(query, [user_id], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    } else if (role === 'ADMIN') {
        const query = `
            SELECT o.*, u.name as customer_name, u.email as customer_email, u.phone as customer_phone,
                   pay.payment_method, pay.status as payment_status
            FROM orders o
            LEFT JOIN users u ON o.customer_id = u.user_id
            LEFT JOIN payments pay ON o.order_id = pay.order_id
            ORDER BY o.order_date DESC
        `;
        db.all(query, [], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    } else {
        res.status(403).json({ msg: 'Not authorized' });
    }
});

// ─── 3. GET SINGLE ORDER DETAILS (Customer, Seller, Admin) ─────────────────
router.get('/:id', authMiddleware, (req, res) => {
    const order_id = req.params.id;
    const user_id = req.user.id;
    const role = req.user.role;

    const query = `
        SELECT o.*, u.name as customer_name, u.email as customer_email, u.phone as customer_phone,
               pay.payment_method, pay.status as payment_status, pay.payment_date
        FROM orders o
        LEFT JOIN users u ON o.customer_id = u.user_id
        LEFT JOIN payments pay ON o.order_id = pay.order_id
        WHERE o.order_id = ?
    `;

    db.get(query, [order_id], (err, order) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!order) return res.status(404).json({ msg: 'Order not found' });

        if (role === 'CUSTOMER' && order.customer_id !== user_id) {
            return res.status(403).json({ msg: 'Not authorized to view this order' });
        }

        const itemsQuery = `
            SELECT oi.*, p.name, p.image, p.seller_id, s.name as seller_name
            FROM order_items oi
            JOIN products p ON oi.product_id = p.product_id
            LEFT JOIN users s ON p.seller_id = s.user_id
            WHERE oi.order_id = ?
        `;
        db.all(itemsQuery, [order_id], (itemErr, items) => {
            if (itemErr) return res.status(500).json({ error: itemErr.message });

            if (role === 'SELLER') {
                const ownsItem = items.some(item => item.seller_id === user_id);
                if (!ownsItem) {
                    return res.status(403).json({ msg: 'Not authorized to view this order' });
                }
            }

            res.json({
                ...order,
                items
            });
        });
    });
});

// ─── 4. GET ORDER ITEMS FOR SPECIFIC ORDER ────────────────────────────────
router.get('/:id/items', authMiddleware, (req, res) => {
    const order_id = req.params.id;
    const query = `
        SELECT oi.*, p.name, p.image
        FROM order_items oi
        JOIN products p ON oi.product_id = p.product_id
        WHERE oi.order_id = ?
    `;
    db.all(query, [order_id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ─── 5. CANCEL ORDER (Customer or Admin) ────────────────────────────────────
// Rule: Cannot cancel once shipped or delivered
router.post('/:id/cancel', authMiddleware, (req, res) => {
    const order_id = req.params.id;
    const user_id = req.user.id;
    const role = req.user.role;

    db.get('SELECT * FROM orders WHERE order_id = ?', [order_id], (err, order) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!order) return res.status(404).json({ msg: 'Order not found' });

        // Authorization check
        if (role === 'CUSTOMER' && order.customer_id !== user_id) {
            return res.status(403).json({ msg: 'Not authorized to cancel this order' });
        }

        if (order.status === 'Cancelled') {
            return res.status(400).json({ msg: 'This order is already cancelled' });
        }

        // Enforcement: Cannot cancel once shipped or delivered
        if (order.status === 'Shipped' || order.status === 'Delivered') {
            return res.status(400).json({
                msg: `Order cannot be cancelled because it has already been ${order.status.toLowerCase()}.`
            });
        }

        // Restore stock for all items in this order
        db.all('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [order_id], (itemErr, items) => {
            if (itemErr) return res.status(500).json({ error: itemErr.message });

            db.serialize(() => {
                if (items && items.length > 0) {
                    items.forEach(item => {
                        db.run(
                            'UPDATE products SET quantity = quantity + ? WHERE product_id = ?',
                            [item.quantity, item.product_id]
                        );
                    });
                }

                // Update status to Cancelled
                db.run('UPDATE orders SET status = ? WHERE order_id = ?', ['Cancelled', order_id]);

                // Update payment record to Refunded
                db.run("UPDATE payments SET status = 'Refunded' WHERE order_id = ?", [order_id], (payErr) => {
                    if (payErr) return res.status(500).json({ error: payErr.message });
                    res.json({
                        msg: 'Order cancelled successfully and payment refunded',
                        order_id,
                        status: 'Cancelled'
                    });
                });
            });
        });
    });
});

// ─── 6. UPDATE ORDER DETAILS (Seller or Admin) ──────────────────────────────
router.put('/:id', authMiddleware, roleMiddleware(['SELLER', 'ADMIN']), (req, res) => {
    const order_id = req.params.id;
    const user_id = req.user.id;
    const role = req.user.role;
    const { status, shipping_address } = req.body;

    db.get('SELECT * FROM orders WHERE order_id = ?', [order_id], (err, order) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!order) return res.status(404).json({ msg: 'Order not found' });

        const proceedWithUpdate = () => {
            const newStatus = status || order.status;
            if (status && !VALID_STATUSES.includes(status)) {
                return res.status(400).json({ msg: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
            }

            const newAddress = shipping_address !== undefined ? shipping_address : order.shipping_address;

            db.serialize(() => {
                // If transitioning to Cancelled from another status, restore stock
                if (newStatus === 'Cancelled' && order.status !== 'Cancelled') {
                    db.all('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [order_id], (itemErr, items) => {
                        if (!itemErr && items) {
                            items.forEach(item => {
                                db.run(
                                    'UPDATE products SET quantity = quantity + ? WHERE product_id = ?',
                                    [item.quantity, item.product_id]
                                );
                            });
                        }
                    });
                    db.run("UPDATE payments SET status = 'Refunded' WHERE order_id = ?", [order_id]);
                }

                db.run(
                    'UPDATE orders SET status = ?, shipping_address = ? WHERE order_id = ?',
                    [newStatus, newAddress, order_id],
                    function(updateErr) {
                        if (updateErr) return res.status(500).json({ error: updateErr.message });
                        res.json({
                            msg: 'Order details updated successfully',
                            order: {
                                order_id,
                                status: newStatus,
                                shipping_address: newAddress
                            }
                        });
                    }
                );
            });
        };

        if (role === 'ADMIN') {
            proceedWithUpdate();
        } else {
            verifySellerOrderAccess(order_id, user_id, (vErr, hasAccess) => {
                if (vErr) return res.status(500).json({ error: vErr.message });
                if (!hasAccess) return res.status(403).json({ msg: 'Not authorized to modify this order' });
                proceedWithUpdate();
            });
        }
    });
});

// ─── 7. UPDATE ORDER STATUS (Legacy endpoint for Seller/Admin) ─────────────
router.put('/:id/status', authMiddleware, roleMiddleware(['SELLER', 'ADMIN']), (req, res) => {
    const order_id = req.params.id;
    const { status } = req.body;
    const user_id = req.user.id;
    const role = req.user.role;

    if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ msg: `Invalid status. Allowed: ${VALID_STATUSES.join(', ')}` });
    }

    db.get('SELECT * FROM orders WHERE order_id = ?', [order_id], (err, order) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!order) return res.status(404).json({ msg: 'Order not found' });

        const applyStatusUpdate = () => {
            db.serialize(() => {
                if (status === 'Cancelled' && order.status !== 'Cancelled') {
                    db.all('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [order_id], (itemErr, items) => {
                        if (!itemErr && items) {
                            items.forEach(item => {
                                db.run(
                                    'UPDATE products SET quantity = quantity + ? WHERE product_id = ?',
                                    [item.quantity, item.product_id]
                                );
                            });
                        }
                    });
                    db.run("UPDATE payments SET status = 'Refunded' WHERE order_id = ?", [order_id]);
                }

                db.run('UPDATE orders SET status = ? WHERE order_id = ?', [status, order_id], function(updateErr) {
                    if (updateErr) return res.status(500).json({ error: updateErr.message });
                    res.json({ msg: 'Order status updated successfully', status });
                });
            });
        };

        if (role === 'ADMIN') {
            applyStatusUpdate();
        } else {
            verifySellerOrderAccess(order_id, user_id, (vErr, hasAccess) => {
                if (vErr) return res.status(500).json({ error: vErr.message });
                if (!hasAccess) return res.status(403).json({ msg: 'Not authorized to modify this order' });
                applyStatusUpdate();
            });
        }
    });
});

// ─── 8. DELETE ORDER (Seller or Admin) ──────────────────────────────────────
router.delete('/:id', authMiddleware, roleMiddleware(['SELLER', 'ADMIN']), (req, res) => {
    const order_id = req.params.id;
    const user_id = req.user.id;
    const role = req.user.role;

    db.get('SELECT * FROM orders WHERE order_id = ?', [order_id], (err, order) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!order) return res.status(404).json({ msg: 'Order not found' });

        const executeDelete = () => {
            db.serialize(() => {
                db.run('DELETE FROM payments WHERE order_id = ?', [order_id]);
                db.run('UPDATE complaints SET order_id = NULL WHERE order_id = ?', [order_id]);
                db.run('DELETE FROM order_items WHERE order_id = ?', [order_id]);
                db.run('DELETE FROM orders WHERE order_id = ?', [order_id], function(delErr) {
                    if (delErr) return res.status(500).json({ error: delErr.message });
                    res.json({ msg: `Order #${order_id} deleted successfully`, order_id });
                });
            });
        };

        if (role === 'ADMIN') {
            executeDelete();
        } else {
            verifySellerOrderAccess(order_id, user_id, (vErr, hasAccess) => {
                if (vErr) return res.status(500).json({ error: vErr.message });
                if (!hasAccess) return res.status(403).json({ msg: 'Not authorized to delete this order' });
                executeDelete();
            });
        }
    });
});

module.exports = router;
