import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/database';
import eligibilityRoutes from './routes/eligibility';
import benefitsRoutes from './routes/benefits';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
}));
app.use(express.json());

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', database: 'disconnected' });
  }
});

// API routes
app.use('/api/v1/eligibility', eligibilityRoutes);
app.use('/api/v1/benefits', benefitsRoutes);

// Start server
app.listen(port, () => {
  console.log(`🚀 WIC Benefits API server running on port ${port}`);
  console.log(`📍 http://localhost:${port}`);
  console.log(`🏥 Health check: http://localhost:${port}/health`);
});
