const path = require('path');
const dotenv = require('dotenv');

// Load env vars before anything reads process.env
dotenv.config({ path: path.join(__dirname, '.env') });

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const User = require('./models/User');
const { UPLOAD_DIR, isCloudinaryEnabled } = require('./utils/fileStorage');

// Running as a serverless function on Vercel (no long-lived process, no writable disk)
const IS_SERVERLESS = !!process.env.VERCEL;

// ── Required configuration ────────────────────────────────────────────────────
const REQUIRED_ENV = ['MONGO_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  console.error('Copy backend/.env.example to backend/.env (local) or set them in your host dashboard.');
  // A normal server stops; on Vercel the API answers with a clear error instead (see below)
  if (!IS_SERVERLESS) process.exit(1);
}

// ── Database connection (shared by every request; reused between serverless calls) ──
let connectPromise = null;
let lastDbError = null; // shown on /api/health to help diagnose hosting problems

const connectDB = () => {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (!connectPromise) {
    connectPromise = mongoose
      .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 })
      .then(async () => {
        lastDbError = null;
        console.log(`MongoDB connected (${mongoose.connection.name})`);
        await ensureDefaultAdmin().catch((err) => console.log('Admin bootstrap error:', err.message));
      })
      .catch((err) => {
        // Never expose the password: strip anything between "//" and "@"
        lastDbError = String(err.message || err).replace(/\/\/[^@\s]*@/g, '//***@').slice(0, 300);
        connectPromise = null; // allow a retry on the next request
        throw err;
      });
  }
  return connectPromise;
};

const app = express();
app.set('trust proxy', 1); // correct client IPs behind Render/Railway/Vercel proxies

// ── Middleware ────────────────────────────────────────────────────────────────
// CORS_ORIGIN can be a comma-separated list; mobile apps don't send an Origin so they're always allowed
const allowedOrigins = (process.env.CORS_ORIGIN || '*').split(',').map((o) => o.trim());
app.use(
  cors({
    origin: allowedOrigins.includes('*') ? true : allowedOrigins,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOAD_DIR)); // locally stored images/files

if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// ── Default admin bootstrap ──────────────────────────────────────────────────
const ensureDefaultAdmin = async () => {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || 'System Admin';

  if (!adminEmail || !adminPassword) return;

  const email = adminEmail.toLowerCase().trim();
  const existingAdmin = await User.findOne({ email });
  if (existingAdmin) return;

  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  await User.create({ name: adminName, email, password: hashedPassword, role: 'admin' });
  console.log(`Default admin user created: ${email}`);
};

// ── Health / test routes ─────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ name: 'MediCare Clinic API', status: 'ok', docs: '/api/health' });
});

app.get(['/api/health', '/api/test'], async (req, res) => {
  if (!missing.length) await connectDB().catch(() => {});
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    message: 'Backend API is running successfully',
    database: states[mongoose.connection.readyState] || 'unknown',
    ...(mongoose.connection.readyState !== 1 && lastDbError ? { databaseError: lastDbError } : {}),
    ...(mongoose.connection.readyState !== 1 && process.env.MONGO_URI
      ? { mongoUriLooksLike: process.env.MONGO_URI.replace(/\/\/[^@\s]*@/, '//***@').slice(0, 60) + '…' }
      : {}),
    fileStorage: isCloudinaryEnabled() ? 'cloudinary' : IS_SERVERLESS ? 'not configured (add Cloudinary keys)' : 'local',
    time: new Date().toISOString(),
  });
});

// ── Make sure the database is connected before any API route runs ─────────────
app.use('/api', async (req, res, next) => {
  if (missing.length) {
    return res.status(500).json({ message: `Server is missing configuration: ${missing.join(', ')}` });
  }
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    res.status(503).json({ message: 'Database unavailable. Please try again shortly.' });
  }
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/doctors', require('./routes/doctorRoutes'));
app.use('/api/appointments', require('./routes/appointmentRoutes'));
app.use('/api/patients', require('./routes/patientRoutes'));
app.use('/api/billing', require('./routes/billingRoutes'));
app.use('/api/prescriptions', require('./routes/prescriptionRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/medical-records', require('./routes/medicalRecordRoutes'));
app.use('/api/settings', require('./routes/settingRoutes'));
app.use('/api/holidays', require('./routes/holidayRoutes'));

app.use(notFound);
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB();
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    console.error('Check MONGO_URI and that Atlas Network Access allows this server (0.0.0.0/0 for cloud hosts).');
    process.exit(1);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
};

if (require.main === module) {
  start();
}

module.exports = app;
