import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import transactionRoutes from './routes/transactions';
import investmentRoutes from './routes/investments';
import insuranceRoutes from './routes/insurance';
import dashboardRoutes from './routes/dashboard';
import settingsRoutes from './routes/settings';
import aiRoutes from './routes/ai';
import marketRoutes from './routes/market';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security headers
app.use(helmet());

// CORS — only allow the configured frontend origin
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));

app.use(express.json({ limit: '50kb' })); // Prevent large payload attacks

// General rate limit: 100 requests per 15 min per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api', generalLimiter);

// Stricter rate limit for AI endpoint: 10 per minute
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests, please wait a moment.' },
});
app.use('/api/v1/ai', aiLimiter);

app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/investments', investmentRoutes);
app.use('/api/v1/insurance', insuranceRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/market', marketRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`✅ Backend running at http://localhost:${PORT}`);
  console.log(`📊 Data stored in Google Sheets (configure URL in Settings)`);
});
