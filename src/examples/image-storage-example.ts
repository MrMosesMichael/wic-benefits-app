/**
 * Product Image Storage Examples
 *
 * Demonstrates how to use the image storage service
 */

import { ImageStorageService } from '../services/product/ImageStorageService';
import { ProductImageSyncService } from '../../backend/src/services/ProductImageSyncService';
import { ProductRepository } from '../database/ProductRepository';
import { getImageStorageConfig } from '../services/product/image-storage.config';

/**
 * Example 1: Upload image from URL
 */
async function uploadImageExample() {
  const imageService = new ImageStorageService(getImageStorageConfig());

  const result = await imageService.uploadFromUrl(
    'https://images.openfoodfacts.org/images/products/016000/275287/front_en.jpg',
    '016000275287'
  );

  console.log('Image uploaded successfully!');
  console.log('Thumbnail:', result.thumbnailUrl);
  console.log('Medium:', result.mediumUrl);
  console.log('Full:', result.fullUrl);
  console.log('File size:', result.fileSize, 'bytes');
  console.log('Dimensions:', result.dimensions);
}

/**
 * Example 2: Proxy external image
 */
async function proxyImageExample() {
  const imageService = new ImageStorageService(getImageStorageConfig());

  const originalUrl = 'https://external-cdn.com/product-image.jpg';
  const cachedUrl = await imageService.proxyImage(originalUrl);

  console.log('Original URL:', originalUrl);
  console.log('Cached URL:', cachedUrl);
}

/**
 * Example 3: Generate presigned upload URL
 */
async function presignedUploadExample() {
  const imageService = new ImageStorageService(getImageStorageConfig());

  const uploadUrl = await imageService.generateUploadUrl('012345678901', 3600);

  console.log('Use this URL to upload image directly from mobile app:');
  console.log(uploadUrl);

  // In mobile app:
  // fetch(uploadUrl, {
  //   method: 'PUT',
  //   body: imageFile,
  //   headers: { 'Content-Type': 'image/jpeg' }
  // });
}

/**
 * Example 4: Sync all product images
 */
async function syncAllImagesExample() {
  const repository = new ProductRepository({
    host: 'localhost',
    port: 5432,
    database: 'wic_benefits',
    user: 'postgres',
    password: '',
  });

  const imageService = new ImageStorageService(getImageStorageConfig());

  const syncService = new ProductImageSyncService(repository, imageService, {
    batchSize: 50,
    concurrency: 3,
    skipExisting: true,
  });

  const stats = await syncService.syncAll();

  console.log('Sync complete!');
  console.log('Total processed:', stats.totalProcessed);
  console.log('Success:', stats.successCount);
  console.log('Failed:', stats.failureCount);
  console.log('Duration:', stats.duration, 'seconds');
}

/**
 * Example 5: Sync specific product
 */
async function syncSingleProductExample() {
  const repository = new ProductRepository({
    host: 'localhost',
    port: 5432,
    database: 'wic_benefits',
    user: 'postgres',
    password: '',
  });

  const imageService = new ImageStorageService(getImageStorageConfig());

  const syncService = new ProductImageSyncService(repository, imageService);

  const stats = await syncService.syncProducts(['016000275287']);

  console.log('Sync result:', stats);
}

/**
 * Example 6: Get sync statistics
 */
async function getSyncStatsExample() {
  const repository = new ProductRepository({
    host: 'localhost',
    port: 5432,
    database: 'wic_benefits',
    user: 'postgres',
    password: '',
  });

  const imageService = new ImageStorageService(getImageStorageConfig());

  const syncService = new ProductImageSyncService(repository, imageService);

  const stats = await syncService.getSyncStats();

  console.log('Product image coverage:');
  console.log('Total products:', stats.totalProducts);
  console.log('Products with images:', stats.productsWithImages);
  console.log('Products without images:', stats.productsWithoutImages);
  console.log('Coverage:', stats.coveragePercentage.toFixed(2) + '%');
}

/**
 * Example 7: Integration with ProductServiceWithDB
 */
async function productServiceIntegrationExample() {
  const repository = new ProductRepository({
    host: 'localhost',
    port: 5432,
    database: 'wic_benefits',
    user: 'postgres',
    password: '',
  });

  const imageService = new ImageStorageService(getImageStorageConfig());

  // When a product is fetched from external API
  const externalProduct = {
    upc: '016000275287',
    name: 'Cheerios',
    brand: 'General Mills',
    imageUrl: 'https://images.openfoodfacts.org/images/products/016000/275287/front_en.jpg',
  };

  // Upload image to our CDN
  const imageResult = await imageService.uploadFromUrl(
    externalProduct.imageUrl,
    externalProduct.upc
  );

  // Update product with CDN URLs
  const productWithCdnImages = {
    ...externalProduct,
    imageUrl: imageResult.fullUrl,
    thumbnailUrl: imageResult.thumbnailUrl,
  };

  // Save to database
  await repository.create(productWithCdnImages as any);

  console.log('Product saved with CDN images!');
}

/**
 * Example 8: Mobile app usage
 */
async function mobileAppExample() {
  // In React Native app:

  const API_BASE_URL = 'http://localhost:3000/api/v1';

  // Get product image URLs
  const response = await fetch(`${API_BASE_URL}/product-images/016000275287`);
  const data = await response.json();

  console.log('Use these URLs in your mobile app:');
  console.log('Thumbnail (for lists):', data.data.thumbnailUrl);
  console.log('Medium (for details):', data.data.mediumUrl);
  console.log('Full (for zoom):', data.data.fullUrl);

  // Example React Native component:
  // <Image
  //   source={{ uri: data.data.thumbnailUrl }}
  //   style={{ width: 100, height: 100 }}
  //   resizeMode="cover"
  // />
}

// Export examples
export {
  uploadImageExample,
  proxyImageExample,
  presignedUploadExample,
  syncAllImagesExample,
  syncSingleProductExample,
  getSyncStatsExample,
  productServiceIntegrationExample,
  mobileAppExample,
};

// Run example if called directly
if (require.main === module) {
  console.log('Product Image Storage Examples\n');
  console.log('Choose an example to run:');
  console.log('1. Upload image from URL');
  console.log('2. Proxy external image');
  console.log('3. Generate presigned upload URL');
  console.log('4. Sync all product images');
  console.log('5. Sync single product');
  console.log('6. Get sync statistics');
  console.log('7. Product service integration');
  console.log('8. Mobile app usage\n');

  const exampleNumber = process.argv[2] || '1';

  const examples = [
    uploadImageExample,
    proxyImageExample,
    presignedUploadExample,
    syncAllImagesExample,
    syncSingleProductExample,
    getSyncStatsExample,
    productServiceIntegrationExample,
    mobileAppExample,
  ];

  const example = examples[parseInt(exampleNumber) - 1];

  if (example) {
    console.log(`Running example ${exampleNumber}...\n`);
    example()
      .then(() => console.log('\nExample complete!'))
      .catch(error => console.error('\nExample failed:', error));
  } else {
    console.error('Invalid example number');
  }
}
