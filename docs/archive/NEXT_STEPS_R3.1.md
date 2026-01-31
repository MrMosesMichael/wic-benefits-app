# Next Steps After R3.1 Implementation

## Immediate Actions (Before Testing)

### 1. Add Navigation Link
The scan-statement screen is created but not linked from the benefits index.

**Add to:** `app/app/benefits/index.tsx`

```tsx
<TouchableOpacity
  style={styles.scanButton}
  onPress={() => router.push('/benefits/scan-statement')}
>
  <Text style={styles.scanButtonText}>📷 Scan Benefit Statement</Text>
</TouchableOpacity>
```

### 2. Run Database Migration
```bash
cd backend
psql -d wic_benefits -f migrations/013_add_ocr_fields.sql
```

### 3. Test Backend Compilation
```bash
cd backend
npm run build  # or npm run dev
```

### 4. Test Frontend Compilation
```bash
cd app
npm start
```

## Testing Checklist

### Backend Testing
```bash
# 1. Start backend server
cd backend
npm run dev

# 2. Test OCR endpoint with curl
curl -X POST http://localhost:3000/api/v1/benefits/ocr \
  -H "Content-Type: application/json" \
  -d '{"image":"test-base64-data"}'

# Expected response:
# {
#   "success": true,
#   "data": {
#     "benefits": [...],
#     "rawText": "...",
#     "periodStart": "...",
#     "periodEnd": "..."
#   }
# }
```

### Frontend Testing (iOS/Android)
```bash
# 1. Start Expo dev server
cd app
npm start

# 2. Test on device:
# - Navigate to Benefits screen
# - Look for "Scan Benefit Statement" button
# - Tap button
# - Grant camera permission
# - Take photo of any document (for testing)
# - Verify mock data displays correctly
```

## Production Readiness Tasks

### 1. Integrate Real OCR Service

#### Option A: Google Cloud Vision (Recommended)
```bash
npm install @google-cloud/vision
```

**Update:** `backend/src/services/ocr-parser.ts`
```typescript
import vision from '@google-cloud/vision';

const client = new vision.ImageAnnotatorClient({
  keyFilename: './google-cloud-key.json'
});

export async function extractBenefitsFromImage(base64Image: string) {
  const [result] = await client.textDetection({
    image: { content: base64Image }
  });

  const rawText = result.fullTextAnnotation?.text || '';
  // Then parse rawText with existing patterns...
}
```

#### Option B: Tesseract.js (Open Source)
```bash
npm install tesseract.js
```

**Update:** `backend/src/services/ocr-parser.ts`
```typescript
import { createWorker } from 'tesseract.js';

export async function extractBenefitsFromImage(base64Image: string) {
  const worker = await createWorker('eng');
  const { data: { text } } = await worker.recognize(base64Image);
  await worker.terminate();

  // Parse text with existing patterns...
}
```

### 2. Enhance Text Parsing
Test with real WIC statements from:
- Michigan
- North Carolina
- Florida
- Oregon

Update regex patterns in `ocr-parser.ts` based on actual statement formats.

### 3. Implement Edit Functionality

**Update:** `app/app/benefits/scan-statement.tsx`

Add edit modal or inline editing for extracted benefits:
```tsx
const [editingIndex, setEditingIndex] = useState<number | null>(null);

const editBenefit = (index: number) => {
  setEditingIndex(index);
  // Show modal with TextInputs for amount and unit
};
```

### 4. Connect Save Flow to Database

**Update:** `app/app/benefits/scan-statement.tsx`

```tsx
import { saveManualBenefits } from '@/lib/services/api';

const confirmBenefits = async () => {
  try {
    for (const benefit of extractedBenefits) {
      await saveManualBenefits({
        participantId: currentParticipantId,
        category: benefit.category,
        amount: parseFloat(benefit.amount),
        unit: benefit.unit,
        periodStart: periodDates.start,
        periodEnd: periodDates.end,
        source: 'ocr',
        confidence: benefit.confidence
      });
    }

    Alert.alert('Success', 'Benefits saved!');
    router.push('/benefits');
  } catch (error) {
    Alert.alert('Error', 'Failed to save benefits');
  }
};
```

### 5. Add Image Quality Validation

Before sending to OCR, check:
- Image resolution (min 1024x768)
- File size (max 5MB)
- Brightness/contrast

```tsx
const validateImage = (imageUri: string) => {
  // Check dimensions, size, quality
  // Return true/false or show tips
};
```

### 6. Performance Optimization

**Image Compression:**
```tsx
import * as ImageManipulator from 'expo-image-manipulator';

const compressImage = async (uri: string) => {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1024 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result;
};
```

## Security Considerations

1. **API Rate Limiting**
   - Add rate limiting to OCR endpoint
   - Prevent abuse/excessive API calls

2. **Image Size Limits**
   - Limit base64 payload size
   - Prevent DoS attacks

3. **Data Privacy**
   - Don't store raw images
   - Only store extracted data
   - Add option to delete OCR history

## Monitoring & Analytics

Track OCR performance:
```typescript
// Add to backend
interface OCRMetrics {
  timestamp: Date;
  processingTime: number;
  confidence: number;
  benefitsExtracted: number;
  success: boolean;
}
```

## Cost Estimation (Production)

### Google Cloud Vision API
- Free tier: 1,000 units/month
- After free tier: $1.50 per 1,000 images
- Expected cost for 10K users: ~$150/month

### AWS Textract
- $1.50 per 1,000 pages
- Similar cost to Google Vision

### Tesseract.js (Free)
- No API costs
- Higher server CPU usage
- Lower accuracy than cloud services

## Documentation Updates Needed

1. User guide: How to take good photos
2. Support FAQ: What if OCR doesn't work?
3. API documentation: OCR endpoint specs
4. Developer guide: How to add new benefit patterns

## Code Review Checklist

Before merging to main:
- [ ] TypeScript compiles without errors
- [ ] Backend route is registered correctly
- [ ] Database migration runs successfully
- [ ] Camera permissions work on iOS/Android
- [ ] Error handling covers all cases
- [ ] Mock data displays correctly
- [ ] Navigation flow works end-to-end
- [ ] Documentation is complete
- [ ] Tests added (if test framework exists)

## Files to Review

1. `app/app/benefits/scan-statement.tsx` - Main UI component
2. `backend/src/routes/ocr-benefits.ts` - API endpoint
3. `backend/src/services/ocr-parser.ts` - OCR logic
4. `backend/migrations/013_add_ocr_fields.sql` - Schema changes
5. `backend/src/index.ts` - Route registration

## Known Limitations (MVP)

1. **Mock OCR**: Currently returns hardcoded sample data
2. **No Edit**: Can't edit extracted values yet
3. **No Save**: Doesn't persist to database yet
4. **Single Page**: Only handles single-page statements
5. **English Only**: No multi-language support
6. **No Rotation**: Doesn't auto-correct image orientation

## Success Criteria

R3.1 is complete when:
- [x] User can open camera
- [x] User can capture image
- [x] Image is sent to backend
- [x] Backend processes with OCR (mock)
- [x] Extracted benefits display
- [x] Confidence scores shown
- [ ] User can edit values (future)
- [ ] User can save to database (future)
- [ ] Integration with real OCR service (future)

---

**Current Status:** MVP implementation complete with mock OCR.
**Production Ready:** After integrating real OCR service and implementing save flow.
