const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
require('dotenv').config();

const router = express.Router();

// Register a new user
router.post('/register', async (req, res) => {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password || !role) {
        return res.status(400).json({ msg: 'Please enter all required fields' });
    }

    try {
        // Check if user already exists
        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (row) return res.status(400).json({ msg: 'User already exists' });

            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Insert new user
            db.run(
                'INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
                [name, email, hashedPassword, phone, role],
                function (err) {
                    if (err) return res.status(500).json({ error: err.message });
                    
                    const userId = this.lastID;
                    
                    // Create token
                    const token = jwt.sign(
                        { id: userId, role: role },
                        process.env.JWT_SECRET,
                        { expiresIn: '1d' }
                    );

                    res.status(201).json({
                        token,
                        user: { id: userId, name, email, role }
                    });
                }
            );
        });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Login User
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ msg: 'Please enter all fields' });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

        // Validate password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

        // Create token
        const token = jwt.sign(
            { id: user.user_id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            token,
            user: {
                id: user.user_id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    });
});

module.exports = router;
