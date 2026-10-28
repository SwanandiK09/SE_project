const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
require('dotenv').config();

const router = express.Router();

// List of legitimate, authorized email provider domains
const AUTHORIZED_DOMAINS = new Set([
    'gmail.com',
    'googlemail.com',
    'google.com',
    'yahoo.com',
    'yahoo.co.in',
    'yahoo.co.uk',
    'yahoo.ca',
    'yahoo.com.au',
    'yahoo.fr',
    'yahoo.de',
    'ymail.com',
    'outlook.com',
    'hotmail.com',
    'live.com',
    'msn.com',
    'icloud.com',
    'me.com',
    'mac.com',
    'aol.com',
    'zoho.com',
    'proton.me',
    'protonmail.com',
    'rediffmail.com',
    'example.com' // for automated testing & demo seeds
]);

// Helper to validate and authorize email addresses
function validateAuthorizedEmail(email) {
    if (!email || typeof email !== 'string') {
        return { valid: false, msg: 'Email address is required' };
    }
    const trimmed = email.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmed)) {
        return { valid: false, msg: 'Please enter a valid email format' };
    }
    const parts = trimmed.split('@');
    if (parts.length !== 2) {
        return { valid: false, msg: 'Invalid email address' };
    }
    const domain = parts[1];

    // Explicit blacklist for placeholder/fake domains like email.com
    const BLOCKED_DOMAINS = ['email.com', 'test.com', 'tempmail.com', 'fake.com', 'mailinator.com', 'dummy.com', '123.com'];
    if (BLOCKED_DOMAINS.includes(domain)) {
        return {
            valid: false,
            msg: `The domain "${domain}" is not authorized. Please use a real email provider like Gmail (google.com/gmail.com), Yahoo, Outlook, or iCloud.`
        };
    }

    const isAuthorized = AUTHORIZED_DOMAINS.has(domain) || domain.endsWith('.edu') || domain.endsWith('.ac.in');
    if (!isAuthorized) {
        return {
            valid: false,
            msg: `Email domain "${domain}" is not authorized. Only legitimate providers like Google (@gmail.com / @google.com), Yahoo (@yahoo.com), Outlook (@outlook.com), or iCloud (@icloud.com) are allowed.`
        };
    }

    return { valid: true, normalizedEmail: trimmed };
}

// Register a new user
router.post('/register', async (req, res) => {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password || !role) {
        return res.status(400).json({ msg: 'Please enter all required fields' });
    }

    const emailCheck = validateAuthorizedEmail(email);
    if (!emailCheck.valid) {
        return res.status(400).json({ msg: emailCheck.msg });
    }

    const cleanEmail = emailCheck.normalizedEmail;

    try {
        // Check if user already exists
        db.get('SELECT * FROM users WHERE email = ?', [cleanEmail], async (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            if (row) return res.status(400).json({ msg: 'User already exists' });

            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Insert new user
            db.run(
                'INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
                [name, cleanEmail, hashedPassword, phone, role],
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
                        user: { id: userId, name, email: cleanEmail, role }
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

    const emailCheck = validateAuthorizedEmail(email);
    if (!emailCheck.valid) {
        return res.status(400).json({ msg: emailCheck.msg });
    }

    const cleanEmail = emailCheck.normalizedEmail;

    db.get('SELECT * FROM users WHERE email = ?', [cleanEmail], async (err, user) => {
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
