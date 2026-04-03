const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'studysphere_super_secret_key_123', { expiresIn: '30d' });
};

// @route   POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Please provide name, email and password' });

        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ success: false, message: 'User already exists' });

        const user = await User.create({ name, email, password });
        if (user) {
            res.status(201).json({
                success: true,
                _id: user._id,
                name: user.name,
                email: user.email,
                token: generateToken(user._id)
            });
        } else {
            res.status(400).json({ success: false, message: 'Invalid user data' });
        }
    } catch (err) {
         res.status(500).json({ success: false, message: err.message });
    }
});

// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
         const { email, password } = req.body;
         const user = await User.findOne({ email });

         if (user && (await user.matchPassword(password))) {
             res.json({
                 success: true,
                 _id: user._id,
                 name: user.name,
                 email: user.email,
                 token: generateToken(user._id)
             });
         } else {
             res.status(401).json({ success: false, message: 'Invalid email or password' });
         }
    } catch (err) {
         res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
