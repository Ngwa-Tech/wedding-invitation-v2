require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- MongoDB connection (cached across serverless invocations) ---
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/wedding';

async function connectDB() {
  if (mongoose.connection.readyState === 1) return; // already connected
  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000
  });
  console.log('✅ MongoDB connected to database:', mongoose.connection.name);
}

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// RSVP Schema
const rsvpSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  attending: { type: Boolean, required: true },
  message: { type: String, default: '', trim: true },
  maybeResponseDate: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
}, { collection: 'rsvps' });

const RSVP = mongoose.models.RSVP || mongoose.model('RSVP', rsvpSchema);

// --- Simple admin authentication (Basic Auth) ---
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Wedding Admin"');
    return res.status(401).send('Authentication required.');
  }
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const [user, pass] = credentials.split(':');
  if (user === process.env.ADMIN_USER && pass === process.env.ADMIN_PASS) {
    return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="Wedding Admin"');
  return res.status(401).send('Invalid credentials.');
}

// TEMPORARY DIAGNOSTIC — remove after debugging
app.get('/api/debug-env', (req, res) => {
  res.json({
    hasMongoUri: !!process.env.MONGODB_URI,
    mongoUriLength: process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 0,
    hasAdminUser: !!process.env.ADMIN_USER,
    hasAdminPass: !!process.env.ADMIN_PASS
  });
});

// POST /api/rsvp
// POST /api/rsvp
app.post('/api/rsvp', async (req, res) => {
  try {
    console.log('📨 Received RSVP:', req.body);
    const { name, attending, message, maybeResponseDate } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (typeof attending !== 'boolean') {
      return res.status(400).json({ error: 'Attending must be true/false' });
    }
    if (!attending && maybeResponseDate && !maybeResponseDate.trim()) {
      return res.status(400).json({ error: 'Please provide an expected response date' });
    }

    const newRsvp = new RSVP({
      name: name.trim(),
      attending,
      message: message ? message.trim() : '',
      maybeResponseDate: maybeResponseDate || ''
    });
    const saved = await newRsvp.save();
    console.log('💾 Saved RSVP with _id:', saved._id);
    res.status(201).json({ success: true, message: 'RSVP saved successfully' });
  } catch (error) {
    console.error('❌ Error saving RSVP:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// GET /api/rsvp (protected)
app.get('/api/rsvp', requireAdmin, async (req, res) => {
  try {
    const rsvps = await RSVP.find().sort({ createdAt: -1 });
    res.json(rsvps);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin dashboard (protected)
app.get('/admin', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;