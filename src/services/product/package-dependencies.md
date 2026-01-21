# Package Dependencies for Image Storage

Required npm packages for A2.4 implementation.

## Production Dependencies

```bash
npm install --save @aws-sdk/client-s3
npm install --save @aws-sdk/s3-request-presigner
npm install --save sharp
npm install --save node-fetch
```

### Package Details

#### @aws-sdk/client-s3
- **Version:** ^3.x
- **Purpose:** AWS S3 client for upload/download operations
- **License:** Apache-2.0
- **Size:** ~500KB

#### @aws-sdk/s3-request-presigner
- **Version:** ^3.x
- **Purpose:** Generate presigned URLs for client-side uploads
- **License:** Apache-2.0
- **Size:** ~100KB

#### sharp
- **Version:** ^0.33.x
- **Purpose:** High-performance image processing (resize, compress, format conversion)
- **License:** Apache-2.0
- **Size:** ~10MB (includes native binaries)
- **Note:** Requires node-gyp for native compilation

#### node-fetch
- **Version:** ^3.x
- **Purpose:** Fetch images from external URLs
- **License:** MIT
- **Size:** ~50KB

## Development Dependencies

```bash
npm install --save-dev @types/node
npm install --save-dev @types/sharp
```

## Installation

### Full Installation

```bash
# Install all dependencies
cd /Users/moses/projects/wic_project
npm install --save @aws-sdk/client-s3 @aws-sdk/s3-request-presigner sharp node-fetch

# Install dev dependencies
npm install --save-dev @types/node @types/sharp
```

### Verify Installation

```bash
# Check installed versions
npm list @aws-sdk/client-s3
npm list sharp
npm list node-fetch
```

## Platform-Specific Notes

### macOS (ARM64 - M1/M2)
Sharp includes prebuilt binaries for Apple Silicon. No additional setup needed.

```bash
# If sharp fails to install, try:
npm install --platform=darwin --arch=arm64 sharp
```

### macOS (Intel)
```bash
npm install --platform=darwin --arch=x64 sharp
```

### Linux (Ubuntu/Debian)
```bash
# Install build dependencies
sudo apt-get install build-essential libvips-dev

# Then install packages
npm install
```

### Docker
```dockerfile
# Include in Dockerfile
FROM node:18-alpine

# Install build dependencies for sharp
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    vips-dev

# Copy and install packages
COPY package*.json ./
RUN npm install
```

## Alternative Packages (If Issues Arise)

### If sharp fails to install

**Option 1:** Use Jimp (pure JavaScript, slower)
```bash
npm install jimp
```

**Option 2:** Use imagemagick wrapper
```bash
npm install imagemagick
```

### If AWS SDK issues

**Option 1:** Use older SDK v2
```bash
npm install aws-sdk
```

**Option 2:** Use MinIO client (S3-compatible)
```bash
npm install minio
```

## Package.json Scripts

Add these to `backend/package.json`:

```json
{
  "scripts": {
    "sync-images": "ts-node src/scripts/sync-product-images.ts",
    "sync-images:all": "ts-node src/scripts/sync-product-images.ts --all",
    "sync-images:stats": "ts-node src/scripts/sync-product-images.ts --stats"
  }
}
```

## TypeScript Configuration

Ensure `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "esModuleInterop": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "types": ["node"]
  }
}
```

## Testing Dependencies

```bash
# For testing image processing
npm install --save-dev jest
npm install --save-dev @types/jest
npm install --save-dev ts-jest

# For mocking AWS SDK
npm install --save-dev aws-sdk-client-mock
```

## Size Impact

Total package size added:
- Production: ~11MB (mostly sharp native binaries)
- Development: ~100KB (types only)

Build artifact size:
- No significant impact (packages are backend-only)
- Mobile app not affected

## Security Considerations

### sharp
- Well-maintained, actively developed
- No known critical vulnerabilities
- Regular security updates

### AWS SDK
- Official AWS package
- Regularly updated
- Follow AWS security best practices

### node-fetch
- Widely used, stable
- Prefer v3.x for ESM support

## Performance

### sharp vs alternatives

| Package | Speed | Memory | File Size |
|---------|-------|--------|-----------|
| sharp | Fast (libvips) | Low | 10MB |
| jimp | Slow (JS) | High | 2MB |
| imagemagick | Medium | Medium | Varies |

**Recommendation:** Use sharp for production performance.

## Troubleshooting

### Error: "Cannot find module 'sharp'"

```bash
# Rebuild native modules
npm rebuild sharp

# Or reinstall
npm uninstall sharp
npm install sharp
```

### Error: "dyld: Library not loaded"

```bash
# macOS: Install Homebrew vips
brew install vips

# Then reinstall sharp
npm rebuild sharp
```

### Error: AWS SDK connection timeout

```bash
# Check AWS credentials
echo $AWS_ACCESS_KEY_ID
echo $AWS_SECRET_ACCESS_KEY

# Test connectivity
aws s3 ls s3://wic-benefits-product-images
```

## Version Compatibility

| Package | Min Node Version | Recommended |
|---------|------------------|-------------|
| @aws-sdk/client-s3 | 14.x | 18.x+ |
| sharp | 14.15.0 | 18.x+ |
| node-fetch | 12.20.0 | 18.x+ |

**Current project:** Node 18.x ✅

## License Compliance

All packages use permissive licenses:
- Apache-2.0: AWS SDK, sharp
- MIT: node-fetch

No GPL or restrictive licenses. Safe for commercial use.
