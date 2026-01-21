import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/database';
import eligibilityRoutes from './routes/eligibility';
import benefitsRoutes from './routes/benefits';
import cartRoutes from './routes/cart';
import sightingsRoutes from './routes/sightings';
import formulaRoutes from './routes/formula';
import inventoryRoutes from './routes/inventory';
import formulaProductsRoutes from './routes/formula-products';
import storesRoutes from './routes/stores';
import formulaFinderRoutes from './routes/formula-finder';
import manualBenefitsRoutes from './routes/manual-benefits';
import ocrBenefitsRoutes from './routes/ocr-benefits';
import productsRoutes from './routes/products';
import productImagesRoutes from './routes/product-images';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
}));
app.use(express.json());

// Static file serving for local images (development)
if (process.env.NODE_ENV === 'development') {
  app.use('/images', express.static(process.env.LOCAL_IMAGE_PATH || './storage/images'));
}

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
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/sightings', sightingsRoutes);
app.use('/api/v1/formula', formulaRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/formula-products', formulaProductsRoutes);
app.use('/api/v1/stores', storesRoutes);
app.use('/api/v1/formula-finder', formulaFinderRoutes);
app.use('/api/v1/manual-benefits', manualBenefitsRoutes);
app.use('/api/v1/benefits/ocr', ocrBenefitsRoutes);
app.use('/api/v1/products', productsRoutes);
app.use('/api/v1/product-images', productImagesRoutes);

// Start server
app.listen(port, () => {
  console.log(`🚀 WIC Benefits API server running on port ${port}`);
  console.log(`📍 http://localhost:${port}`);
  console.log(`🏥 Health check: http://localhost:${port}/health`);
});
