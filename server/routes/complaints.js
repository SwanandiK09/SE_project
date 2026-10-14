const express = require('express');
const db = require('../database/db');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// File a complaint (Customer)
router.post('/', authMiddleware, (req, res) => {
    const { order_id, description } = req.body;
    const customer_id = req.user.id;

    if (!description || !description.trim()) {
        return res.status(400).json({ msg: 'Please provide a complaint description' });
    }

    db.run(
        'INSERT INTO complaints (customer_id, order_id, description, status) VALUES (?, ?, ?, ?)',
        [customer_id, order_id || null, description.trim(), 'Pending'],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({
                msg: 'Complaint submitted successfully',
                complaint_id: this.lastID
            });
        }
    );
});

// Get current customer's complaints
router.get('/my', authMiddleware, (req, res) => {
    const customer_id = req.user.id;

    db.all(
        `SELECT c.*, o.total_amount, o.status as order_status 
         FROM complaints c
         LEFT JOIN orders o ON c.order_id = o.order_id
         WHERE c.customer_id = ?
         ORDER BY c.date DESC`,
        [customer_id],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// Get all complaints (Support & Admin)
router.get('/', authMiddleware, roleMiddleware(['SUPPORT', 'ADMIN']), (req, res) => {
    db.all(
        `SELECT c.*, u.name as customer_name, u.email as customer_email, u.phone as customer_phone,
                o.total_amount, o.status as order_status
         FROM complaints c
         JOIN users u ON c.customer_id = u.user_id
         LEFT JOIN orders o ON c.order_id = o.order_id
         ORDER BY 
            CASE c.status 
                WHEN 'Pending' THEN 1 
                WHEN 'In Progress' THEN 2 
                WHEN 'Responded' THEN 3 
                ELSE 4 
            END,
            c.date DESC`,
        [],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// Update complaint status / response (Support & Admin)
router.put('/:id', authMiddleware, roleMiddleware(['SUPPORT', 'ADMIN']), (req, res) => {
    const { status, response } = req.body;
    const complaint_id = req.params.id;

    if (!status && !response) {
        return res.status(400).json({ msg: 'Provide status or response to update' });
    }

    db.get('SELECT * FROM complaints WHERE complaint_id = ?', [complaint_id], (err, complaint) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!complaint) return res.status(404).json({ msg: 'Complaint not found' });

        const updatedStatus = status || complaint.status;
        const updatedResponse = response !== undefined ? response : complaint.response;

        db.run(
            'UPDATE complaints SET status = ?, response = ? WHERE complaint_id = ?',
            [updatedStatus, updatedResponse, complaint_id],
            function (updateErr) {
                if (updateErr) return res.status(500).json({ error: updateErr.message });
                res.json({ msg: 'Complaint updated successfully', complaint_id, status: updatedStatus, response: updatedResponse });
            }
        );
    });
});

module.exports = router;
