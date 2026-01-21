# OCR Benefit Statement Scanning

## Overview

This feature allows WIC participants to scan their printed benefit statements using their phone's camera. The app uses OCR (Optical Character Recognition) to automatically extract benefit amounts, categories, and period dates.

## Files

### Frontend
- `app/app/benefits/scan-statement.tsx` - Camera interface for scanning benefit statements
- `app/lib/services/api.ts` - API client with `uploadBenefitStatement()` function

### Backend
- `backend/src/routes/ocr-benefits.ts` - OCR processing endpoint
- `backend/migrations/013_add_ocr_fields.sql` - Database migration for OCR support

## User Flow

1. User navigates to Benefits section
2. User taps "Scan Statement" button
3. Camera view opens with positioning guide
4. User takes photo of benefit statement
5. Image is sent to backend OCR service
6. Backend extracts benefit data (category, amount, unit, confidence)
7. User reviews extracted data
8. User can edit any incorrect values
9. User confirms and saves to database

## Implementation Status

### ✅ Completed (MVP)
- Frontend camera interface with expo-camera
- Image capture and preview
- Mock OCR processing for development
- Extracted benefits display with confidence scores
- Integration with existing benefits flow
- Backend OCR endpoint structure

### 🚧 TODO (Production)
- Integrate real OCR service (Google Cloud Vision, AWS Textract, or Tesseract)
- Implement OCR text parsing logic (extract categories, amounts, units from raw text)
- Add benefit period date extraction
- Implement edit functionality for extracted benefits
- Connect save flow to database
- Add error handling for low-quality images
- Add tips for taking good photos

## OCR Service Options

The backend is designed to work with multiple OCR providers:

### 1. Google Cloud Vision API (Recommended)
- Best accuracy for printed documents
- Easy integration with Node.js
- Cost: $1.50 per 1000 images (first 1000/month free)

```javascript
const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient();
const [result] = await client.textDetection({ image: { content: base64Image } });
```

### 2. AWS Textract
- Good for forms and tables
- Integrated with AWS ecosystem
- Cost: $1.50 per 1000 pages

### 3. Tesseract.js (Open Source)
- Free, runs locally
- Lower accuracy than cloud services
- Good for MVP/development

### 4. Azure Computer Vision
- Microsoft's OCR service
- Good accuracy
- Cost: $1 per 1000 images

## Text Parsing Logic

After OCR extracts raw text, we need to parse it to identify:

### Category Patterns
```
Milk: 4 gallons → { category: 'milk', amount: 4, unit: 'gal' }
Eggs: 2 dozen → { category: 'eggs', amount: 2, unit: 'doz' }
CVV: $11.00 → { category: 'fruits_vegetables', amount: 11, unit: 'dollars' }
Cheese: 1 lb → { category: 'cheese', amount: 1, unit: 'lb' }
```

### Date Patterns
```
Valid from: 01/15/2026 to 02/14/2026
Period: Jan 15 - Feb 14, 2026
1/15/26 - 2/14/26
```

## Database Schema

```sql
CREATE TABLE manual_benefits (
  id SERIAL PRIMARY KEY,
  participant_id INTEGER REFERENCES participants(id),
  category VARCHAR(50),
  amount DECIMAL(10,2),
  unit VARCHAR(20),
  benefit_period_start DATE,
  benefit_period_end DATE,
  source VARCHAR(20) DEFAULT 'manual',  -- 'manual', 'ocr', 'ewic'
  confidence INTEGER,  -- 0-100, NULL for manual entries
  category_label VARCHAR(100),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## API Endpoint

### POST /api/v1/benefits/ocr

**Request:**
```json
{
  "image": "base64-encoded-image-string",
  "participantId": 123  // Optional, for auto-save
}
```

**Response:**
```json
{
  "success": true,
  "benefits": [
    {
      "category": "milk",
      "amount": 4,
      "unit": "gal",
      "confidence": 95
    },
    {
      "category": "eggs",
      "amount": 2,
      "unit": "doz",
      "confidence": 98
    }
  ],
  "periodStart": "2026-01-15T00:00:00.000Z",
  "periodEnd": "2026-02-14T00:00:00.000Z"
}
```

## Testing

### Test Images Needed
1. Michigan WIC benefit statement (various formats)
2. North Carolina WIC statement
3. Florida WIC statement
4. Oregon WIC statement
5. Low-quality images (to test error handling)
6. Images with glare/shadows
7. Rotated/skewed images

### Test Cases
1. ✅ Camera permission flow
2. ✅ Image capture
3. ✅ Preview captured image
4. ✅ Display extracted benefits
5. ✅ Show confidence scores
6. ⏳ Edit extracted values
7. ⏳ Save to database
8. ⏳ Handle OCR failures gracefully
9. ⏳ Retry on error

## Future Enhancements

1. **Auto-rotation** - Detect and correct image orientation
2. **Image enhancement** - Pre-process images to improve OCR accuracy
3. **Multi-page support** - Handle statements with multiple pages
4. **Smart cropping** - Auto-detect benefit table area
5. **Historical tracking** - Track OCR accuracy over time
6. **User feedback** - Allow users to report incorrect extractions
7. **Batch processing** - Scan multiple statements at once
8. **eWIC integration** - Verify OCR results against eWIC balance
