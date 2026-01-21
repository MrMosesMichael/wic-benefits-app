# OCR Benefit Statement Scanner - Implementation Guide

## Overview

The OCR benefit statement scanner allows users to photograph their WIC benefit statements and automatically extract benefit amounts. This feature is part of R3.1 implementation.

## Current Implementation (MVP)

The current implementation provides a **mock OCR service** that simulates the extraction process. This allows the feature to be tested end-to-end while the actual OCR integration is developed.

### Files Created

1. **Frontend**: `app/app/benefits/scan-statement.tsx`
   - Camera interface for capturing benefit statements
   - Photo preview and review UI
   - Extracted benefits display with confidence scores
   - Edit and confirmation workflow

2. **API Service**: `app/lib/services/api.ts`
   - `uploadBenefitStatement()` function
   - OCR types: `OCRBenefit`, `OCRResult`

3. **Backend Route**: `backend/src/routes/benefits.ts`
   - POST `/api/v1/benefits/ocr` endpoint
   - Accepts base64 encoded image
   - Returns extracted benefits

4. **Backend Service**: `backend/src/services/ocr-parser.ts`
   - `extractBenefitsFromImage()` function
   - Pattern matching for benefit extraction
   - Confidence scoring logic

## Mock Implementation

The current implementation returns hardcoded mock data:

```typescript
{
  benefits: [
    { category: 'milk', amount: 4, unit: 'gal', confidence: 95 },
    { category: 'cheese', amount: 1, unit: 'lb', confidence: 92 },
    { category: 'eggs', amount: 2, unit: 'doz', confidence: 98 },
    { category: 'fruits_vegetables', amount: 11, unit: 'dollars', confidence: 88 },
    { category: 'whole_grains', amount: 16, unit: 'oz', confidence: 90 },
    { category: 'juice', amount: 144, unit: 'oz', confidence: 85 },
    { category: 'peanut_butter', amount: 18, unit: 'oz', confidence: 82 },
  ],
  rawText: 'MOCK OCR TEXT - WIC BENEFITS STATEMENT...',
  periodStart: '2026-01-20T...',
  periodEnd: '2026-02-20T...',
}
```

This allows testing of:
- Camera capture workflow
- UI/UX for reviewing extracted benefits
- Confidence score display
- Edit and save workflows

## Production Implementation Options

### Option 1: Tesseract.js (Client-Side, Free)

**Pros:**
- Completely free and open source
- No API costs
- Privacy-first (processing on device)
- Works offline

**Cons:**
- Lower accuracy than cloud services
- Slower processing
- Larger app bundle size
- Limited to Latin scripts

**Installation:**
```bash
npm install tesseract.js
```

**Implementation:**
```typescript
import Tesseract from 'tesseract.js';

async function extractBenefitsFromImage(base64Image: string): Promise<OCRResult> {
  const { data: { text } } = await Tesseract.recognize(
    base64Image,
    'eng',
    {
      logger: m => console.log(m)
    }
  );

  return parseBenefitsFromText(text);
}
```

### Option 2: Google Cloud Vision API (Recommended)

**Pros:**
- High accuracy (95%+ for printed text)
- Fast processing (< 2 seconds)
- Handles various image qualities
- Document understanding features

**Cons:**
- Costs money ($1.50 per 1000 requests)
- Requires API key management
- Internet connection required
- Privacy considerations (data sent to Google)

**Installation:**
```bash
npm install @google-cloud/vision
```

**Implementation:**
```typescript
import vision from '@google-cloud/vision';

const client = new vision.ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

async function extractBenefitsFromImage(base64Image: string): Promise<OCRResult> {
  const [result] = await client.textDetection({
    image: { content: Buffer.from(base64Image, 'base64') }
  });

  const text = result.fullTextAnnotation?.text || '';
  return parseBenefitsFromText(text);
}
```

**Pricing (as of 2026):**
- First 1,000 units/month: Free
- 1,001-5,000,000 units: $1.50 per 1,000
- For 10,000 users scanning 1x/month: ~$15/month

### Option 3: AWS Textract

**Pros:**
- Excellent for forms and tables
- Integrated with AWS ecosystem
- Can extract structured data
- High accuracy

**Cons:**
- More expensive than Vision API
- Requires AWS setup
- Internet required

**Pricing:**
- Detect Document Text API: $1.50 per 1,000 pages
- Analyze Document API: $50 per 1,000 pages (with form/table extraction)

### Option 4: Microsoft Azure Computer Vision

**Pros:**
- Good accuracy
- Read API optimized for documents
- Competitive pricing

**Cons:**
- Requires Azure account
- Internet required

**Pricing:**
- OCR: $1.00 per 1,000 transactions

## Recommended Approach

**Phase 1 (Current):** Mock implementation for testing UI/UX

**Phase 2:** Implement Tesseract.js for MVP
- Free and privacy-first
- Good enough for initial users
- Can be improved later

**Phase 3:** Add Google Cloud Vision API as optional upgrade
- Better accuracy for users who need it
- Keep Tesseract as fallback for offline use
- Monitor usage and costs

## Text Parsing Implementation

The `parseBenefitsFromText()` function uses regex patterns to extract benefits:

```typescript
const patterns = [
  {
    regex: /milk[:\s]+(\d+(?:\.\d+)?)\s*(gal|gallon)/i,
    category: 'milk',
    unit: 'gal'
  },
  {
    regex: /cheese[:\s]+(\d+(?:\.\d+)?)\s*(lb|pound)/i,
    category: 'cheese',
    unit: 'lb'
  },
  // ... more patterns
];
```

### State-Specific Formats

Different states may format benefit statements differently:

**Michigan:**
```
WIC FOOD BENEFITS
Milk: 4 gallons
Cheese: 1 pound
Eggs: 2 dozen
```

**North Carolina:**
```
BENEFIT PERIOD: 01/01/26 - 01/31/26
Whole Milk - 4 gal
Natural Cheese - 16 oz
```

The parser should handle multiple formats and be extensible for state-specific variations.

## Integration Steps

1. **Install OCR library** (Tesseract.js or cloud SDK)
2. **Update `ocr-parser.ts`** to use real OCR instead of mock
3. **Add error handling** for OCR failures
4. **Implement retry logic** for network issues
5. **Add analytics** to track accuracy
6. **Create feedback mechanism** for users to report incorrect extractions

## Testing

### Unit Tests
- Test pattern matching with various text formats
- Test date extraction
- Test confidence scoring

### Integration Tests
- Test with real WIC benefit statement images
- Test with various image qualities (blurry, angled, poor lighting)
- Test with state-specific formats

### E2E Tests
- Camera capture → OCR → review → save workflow
- Error handling paths
- Retry flows

## Privacy & Security

- ✅ Images processed on backend, not stored permanently
- ✅ Base64 transmission over HTTPS
- ✅ No long-term retention of benefit images
- ✅ User controls when to scan
- ⚠️ Consider on-device processing (Tesseract.js) for maximum privacy

## Future Enhancements

1. **ML-based extraction**: Train custom model on WIC statements
2. **Multi-language support**: Spanish benefit statements
3. **Batch processing**: Multiple pages/statements at once
4. **Historical comparison**: Detect changes month-to-month
5. **Auto-save**: Automatically save to benefits after review
6. **Smart cropping**: Automatically detect document boundaries
7. **Quality validation**: Warn user if image quality is too low

## Performance Optimization

- Resize images before upload (max 1024x1024 for OCR)
- Compress images (JPEG quality 80%)
- Cache OCR results
- Implement request debouncing
- Show progress indicators

## Cost Optimization

If using cloud OCR services:

1. **Rate limiting**: Limit scans per user per month
2. **Image preprocessing**: Enhance images client-side before upload
3. **Caching**: Don't re-process identical images
4. **Compression**: Reduce image size before upload
5. **Batch processing**: Process multiple scans together if API supports it

## Monitoring & Analytics

Track:
- OCR success rate
- Average confidence scores
- Processing time
- Error types
- User corrections (how often users edit extracted data)
- Cost per scan (if using paid service)

This data helps improve the parser and identify which states/formats need work.
