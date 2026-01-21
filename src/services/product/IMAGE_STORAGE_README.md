# Product Image Storage & CDN

Implementation of A2.4 - Product image storage/CDN

## Overview

This system manages product images with CDN delivery for fast, reliable access in the mobile app.

**Key Features:**
- Multi-variant image generation (thumbnail, medium, full)
- S3 storage with CloudFront CDN delivery
- Image optimization (resize, compress, format conversion)
- External URL proxy with caching
- Presigned URLs for direct mobile uploads
- Background sync jobs

## Architecture

```
External Image → Fetch → Process → S3 Upload → CloudFront CDN → Mobile App
     ↓                      ↓
  Open Food Facts      Resize/Compress
  UPC Database         Format Convert
  Retailer Feeds       Quality Optimize
```

### Data Flow

1. **Image Ingestion**
   - Fetch from external URL (Open Food Facts, etc.)
   - Validate and sanitize
   - Generate variants (thumbnail/medium/full)

2. **Processing**
   - Resize to max dimensions
   - Compress with quality settings
   - Convert to optimal format (JPEG/WebP)

3. **Storage**
   - Upload to S3 with cache headers
   - Organize by UPC: `product-images/{upc}/{hash}_{variant}.jpg`
   - Set public read permissions

4. **Delivery**
   - Serve via CloudFront CDN
   - 1-year cache headers
   - HTTPS only

## Image Variants

| Variant   | Max Size  | Quality | Use Case               |
|-----------|-----------|---------|------------------------|
| Thumbnail | 150x150px | 80%     | Lists, search results  |
| Medium    | 600x600px | 85%     | Product details        |
| Full      | 1200x1200px | 90%   | Zoom, high-res viewing |

## Configuration

### Environment Variables

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET=wic-benefits-product-images

# CDN Configuration
CDN_BASE_URL=https://d1234567890.cloudfront.net

# Local Development Fallback
NODE_ENV=development
LOCAL_IMAGE_PATH=./storage/images
```

### AWS Setup

#### 1. Create S3 Bucket

```bash
aws s3api create-bucket \
  --bucket wic-benefits-product-images \
  --region us-east-1

# Enable public read access
aws s3api put-bucket-policy \
  --bucket wic-benefits-product-images \
  --policy file://bucket-policy.json
```

**bucket-policy.json:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::wic-benefits-product-images/*"
    }
  ]
}
```

#### 2. Create CloudFront Distribution

```bash
aws cloudfront create-distribution \
  --origin-domain-name wic-benefits-product-images.s3.amazonaws.com \
  --default-root-object index.html
```

**Key Settings:**
- Origin: S3 bucket
- Cache behavior: Cache based on query string
- Viewer protocol: Redirect HTTP to HTTPS
- Compress objects: Yes
- Price class: Use only North America and Europe

#### 3. IAM Permissions

Create IAM user with this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::wic-benefits-product-images",
        "arn:aws:s3:::wic-benefits-product-images/*"
      ]
    }
  ]
}
```

## Usage

### API Endpoints

#### Upload Image from URL

```bash
POST /api/v1/product-images/upload/:upc
Content-Type: application/json

{
  "imageUrl": "https://external.com/product.jpg"
}
```

**Response:**
```json
{
  "data": {
    "originalUrl": "https://external.com/product.jpg",
    "thumbnailUrl": "https://cdn.../product-images/012345678901/abc123_thumbnail.jpg",
    "mediumUrl": "https://cdn.../product-images/012345678901/abc123_medium.jpg",
    "fullUrl": "https://cdn.../product-images/012345678901/abc123_full.jpg",
    "s3Key": "product-images/012345678901/abc123",
    "fileSize": 125678,
    "dimensions": { "width": 800, "height": 600 }
  }
}
```

#### Get Image URLs

```bash
GET /api/v1/product-images/:upc
```

#### Proxy External Image

```bash
GET /api/v1/product-images/proxy?url=https://external.com/image.jpg
```

#### Generate Upload URL (Mobile)

```bash
POST /api/v1/product-images/upload-direct/:upc
```

Returns presigned URL for direct S3 upload from mobile app.

### Background Sync

Sync product images from external sources:

```bash
# Sync all products with missing images
npm run sync-images

# Force sync all products
npm run sync-images -- --all

# Sync specific product
npm run sync-images -- --upc 012345678901

# Show statistics
npm run sync-images -- --stats

# Custom batch size and concurrency
npm run sync-images -- --batch-size 50 --concurrency 3
```

### Programmatic Usage

```typescript
import { ImageStorageService } from './ImageStorageService';

const imageService = new ImageStorageService({
  region: 'us-east-1',
  bucket: 'wic-benefits-product-images',
  keyPrefix: 'product-images',
  cdnBaseUrl: 'https://d1234567890.cloudfront.net',
  enableLocalFallback: false,
});

// Upload from URL
const result = await imageService.uploadFromUrl(
  'https://images.openfoodfacts.org/images/products/016000/275287/front_en.jpg',
  '016000275287'
);

console.log(result.thumbnailUrl);
// https://d1234567890.cloudfront.net/product-images/016000275287/abc123_thumbnail.jpg

// Proxy external URL
const cachedUrl = await imageService.proxyImage(
  'https://external.com/image.jpg'
);
```

## Local Development

In development mode, images are stored locally:

```bash
NODE_ENV=development
LOCAL_IMAGE_PATH=./storage/images
```

File structure:
```
./storage/images/
  product-images/
    012345678901/
      abc123_thumbnail.jpg
      abc123_medium.jpg
      abc123_full.jpg
```

Served via Express static middleware:
```typescript
app.use('/images', express.static('./storage/images'));
```

## Performance Considerations

### Optimization

- **Lazy Loading**: Images loaded on-demand in mobile app
- **Progressive JPEG**: Faster rendering on slow connections
- **WebP Support**: Modern format for smaller file sizes
- **CDN Caching**: 1-year cache reduces origin requests

### Cost Optimization

- **Storage**: ~$0.023/GB/month (S3 Standard)
- **Transfer**: Free via CloudFront to users
- **Requests**: ~$0.005 per 10,000 requests

**Estimated costs for 100K products:**
- Storage: ~50GB × $0.023 = $1.15/month
- Transfer: Free (via CloudFront)
- **Total**: ~$2-5/month

## Monitoring

### CloudWatch Metrics

- S3 bucket size
- Request count
- 4xx/5xx errors
- Data transfer

### Application Metrics

```typescript
const stats = await syncService.getSyncStats();

console.log(stats);
// {
//   totalProducts: 150000,
//   productsWithImages: 142500,
//   productsWithoutImages: 7500,
//   coveragePercentage: 95.0
// }
```

## Troubleshooting

### Images not loading

1. Check S3 bucket permissions
2. Verify CloudFront distribution is active
3. Check CORS configuration
4. Verify CDN_BASE_URL environment variable

### Slow uploads

1. Increase concurrency in sync job
2. Use smaller batch sizes
3. Check network bandwidth
4. Enable image compression

### Missing images

1. Run sync job: `npm run sync-images`
2. Check external URLs are valid
3. Review sync error logs
4. Verify Open Food Facts API access

## Future Improvements

- [ ] Automatic format detection (WebP for modern browsers)
- [ ] Image quality adaptive to network speed
- [ ] Crowdsourced image uploads from users
- [ ] Machine learning for image quality scoring
- [ ] Alternative CDN providers (Cloudflare R2, Bunny CDN)
- [ ] Image similarity detection to deduplicate
- [ ] Automatic watermark removal
- [ ] OCR for extracting product info from images
