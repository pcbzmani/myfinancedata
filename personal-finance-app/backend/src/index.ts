import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import transactionRoutes from './routes/transactions';
import investmentRoutes from './routes/investments';
import insuranceRoutes from './routes/insurance';
import dashboardRoutes from './routes/dashboard';
import settingsRoutes from './routes/settings';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());

app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/investments', investmentRoutes);
app.use('/api/v1/insurance', insuranceRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/settings', settingsRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`✅ Backend running at http://localhost:${PORT}`);
  console.log(`📊 Data stored in Google Sheets (configure URL in Settings)`);
});
