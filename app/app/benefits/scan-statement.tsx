import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import { BenefitCategory, BenefitUnit } from '@/lib/types';
import { uploadBenefitStatement, OCRResult } from '@/lib/services/api';

// OCR extracted benefit line item
interface ExtractedBenefit {
  category: BenefitCategory | null;
  amount: string;
  unit: BenefitUnit;
  confidence: number; // 0-100
}

export default function ScanStatement() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedBenefits, setExtractedBenefits] = useState<ExtractedBenefit[]>([]);
  const [periodDates, setPeriodDates] = useState<{start?: string; end?: string}>({});
  const cameraRef = useRef<CameraView>(null);

  // Take photo of benefit statement
  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (photo?.uri) {
        setCapturedImage(photo.uri);
        // If we have base64, send to OCR service
        if (photo.base64) {
          await processImageWithOCR(photo.base64);
        }
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    }
  };

  // Send image to OCR service
  const processImageWithOCR = async (base64Image: string) => {
    setIsProcessing(true);

    try {
      // Call backend OCR service
      const result: OCRResult = await uploadBenefitStatement(base64Image);

      // Convert OCR result to ExtractedBenefit format
      const benefits: ExtractedBenefit[] = result.benefits.map(b => ({
        category: b.category as BenefitCategory,
        amount: b.amount.toString(),
        unit: b.unit as BenefitUnit,
        confidence: b.confidence,
      }));

      setExtractedBenefits(benefits);
      setPeriodDates({
        start: result.periodStart,
        end: result.periodEnd,
      });
    } catch (error) {
      console.error('OCR processing error:', error);
      Alert.alert(
        'Processing Error',
        'Could not extract benefits from the image. Please try again or enter manually.',
        [
          { text: 'Retry', onPress: () => setCapturedImage(null) },
          { text: 'Manual Entry', onPress: () => router.push('/benefits/manual-entry') },
        ]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Retake photo
  const retakePicture = () => {
    setCapturedImage(null);
    setExtractedBenefits([]);
    setPeriodDates({});
  };

  // Confirm and save extracted benefits
  const confirmBenefits = async () => {
    if (extractedBenefits.length === 0) {
      Alert.alert('No Benefits', 'No benefits were extracted. Please try again.');
      return;
    }

    // TODO: Save benefits to backend
    // For now, show success message
    Alert.alert(
      'Success',
      `Extracted ${extractedBenefits.length} benefit categories from statement.`,
      [
        {
          text: 'View Benefits',
          onPress: () => router.push('/benefits'),
        },
      ]
    );
  };

  // Edit extracted benefit
  const editBenefit = (index: number) => {
    Alert.alert(
      'Edit Benefit',
      'Editing benefits will be available in the confirmation screen.',
      [{ text: 'OK' }]
    );
    // TODO: Navigate to edit screen or show inline editor
  };

  // Get category label for display
  const getCategoryLabel = (category: BenefitCategory | null): string => {
    const labels: Record<BenefitCategory, string> = {
      milk: 'Milk',
      cheese: 'Cheese',
      eggs: 'Eggs',
      fruits_vegetables: 'Fruits & Vegetables',
      whole_grains: 'Whole Grains',
      juice: 'Juice',
      peanut_butter: 'Peanut Butter/Beans',
      infant_formula: 'Infant Formula',
      cereal: 'Infant Cereal',
      infant_food: 'Infant Food',
      baby_food_meat: 'Baby Food Meat',
      yogurt: 'Yogurt',
      fish: 'Fish',
    };
    return category ? labels[category] : 'Unknown';
  };

  // Format date for display
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Not detected';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Camera permission handling
  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.message}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.title}>Camera Access Required</Text>
          <Text style={styles.message}>
            To scan your benefit statement, we need access to your camera.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Camera Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.manualEntryButton}
            onPress={() => router.push('/benefits/manual-entry')}
          >
            <Text style={styles.manualEntryButtonText}>Enter Manually Instead</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Show captured image and extracted benefits
  if (capturedImage) {
    return (
      <ScrollView style={styles.container}>
        {/* Captured image preview */}
        <View style={styles.imagePreview}>
          <Image source={{ uri: capturedImage }} style={styles.previewImage} />
        </View>

        {isProcessing ? (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color="#2E7D32" />
            <Text style={styles.processingText}>Extracting benefits from image...</Text>
            <Text style={styles.processingSubtext}>This may take a few seconds</Text>
          </View>
        ) : (
          <>
            {/* Extracted benefit period */}
            <View style={styles.periodSection}>
              <Text style={styles.sectionTitle}>Benefit Period</Text>
              <View style={styles.periodRow}>
                <View style={styles.periodItem}>
                  <Text style={styles.periodLabel}>Start Date</Text>
                  <Text style={styles.periodValue}>{formatDate(periodDates.start)}</Text>
                </View>
                <View style={styles.periodItem}>
                  <Text style={styles.periodLabel}>End Date</Text>
                  <Text style={styles.periodValue}>{formatDate(periodDates.end)}</Text>
                </View>
              </View>
            </View>

            {/* Extracted benefits list */}
            <View style={styles.benefitsSection}>
              <Text style={styles.sectionTitle}>
                Extracted Benefits ({extractedBenefits.length})
              </Text>

              {extractedBenefits.map((benefit, index) => (
                <View key={index} style={styles.benefitCard}>
                  <View style={styles.benefitHeader}>
                    <View style={styles.benefitInfo}>
                      <Text style={styles.benefitCategory}>
                        {getCategoryLabel(benefit.category)}
                      </Text>
                      <Text style={styles.benefitAmount}>
                        {benefit.amount} {benefit.unit}
                      </Text>
                    </View>
                    <View style={styles.benefitActions}>
                      <View
                        style={[
                          styles.confidenceBadge,
                          benefit.confidence >= 90
                            ? styles.confidenceHigh
                            : benefit.confidence >= 75
                            ? styles.confidenceMedium
                            : styles.confidenceLow,
                        ]}
                      >
                        <Text style={styles.confidenceText}>{benefit.confidence}%</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => editBenefit(index)}
                      >
                        <Text style={styles.editButtonText}>Edit</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}

              <View style={styles.helpBox}>
                <Text style={styles.helpText}>
                  💡 Review the extracted amounts carefully. You can edit any incorrect values
                  before saving.
                </Text>
              </View>
            </View>

            {/* Action buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.confirmButton} onPress={confirmBenefits}>
                <Text style={styles.confirmButtonText}>Confirm & Save</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.retakeButton} onPress={retakePicture}>
                <Text style={styles.retakeButtonText}>Retake Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => router.back()}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    );
  }

  // Camera view for capturing statement
  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing={facing}
      >
        {/* Camera overlay with instructions */}
        <View style={styles.cameraOverlay}>
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.topBarTitle}>Scan Benefit Statement</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.centerContent}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </View>

            <View style={styles.instructionsBox}>
              <Text style={styles.instructionsTitle}>Position your benefit statement</Text>
              <Text style={styles.instructionsText}>
                • Ensure all text is visible and in focus{'\n'}
                • Avoid shadows and glare{'\n'}
                • Keep the paper flat and straight
              </Text>
            </View>
          </View>

          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.flipButton}
              onPress={() => setFacing(current => (current === 'back' ? 'front' : 'back'))}
            >
              <Text style={styles.flipButtonText}>🔄 Flip</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.manualLinkButton}
              onPress={() => router.push('/benefits/manual-entry')}
            >
              <Text style={styles.manualLinkText}>Manual</Text>
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
  },
  permissionButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  manualEntryButton: {
    marginTop: 12,
    paddingVertical: 12,
  },
  manualEntryButtonText: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  topBarTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  scanFrame: {
    width: 300,
    height: 400,
    position: 'relative',
    marginBottom: 30,
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#2E7D32',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instructionsBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 16,
    borderRadius: 8,
    maxWidth: 320,
  },
  instructionsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  instructionsText: {
    color: '#ddd',
    fontSize: 14,
    lineHeight: 20,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 50,
    paddingHorizontal: 20,
  },
  flipButton: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 30,
  },
  flipButtonText: {
    fontSize: 24,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#2E7D32',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2E7D32',
  },
  manualLinkButton: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 30,
  },
  manualLinkText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  imagePreview: {
    width: '100%',
    height: 250,
    backgroundColor: '#000',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  processingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  processingText: {
    fontSize: 16,
    color: '#333',
    marginTop: 16,
    fontWeight: '600',
  },
  processingSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  periodSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 12,
  },
  periodRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  periodItem: {
    alignItems: 'center',
  },
  periodLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  periodValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  benefitsSection: {
    padding: 16,
  },
  benefitCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  benefitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  benefitInfo: {
    flex: 1,
  },
  benefitCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  benefitAmount: {
    fontSize: 14,
    color: '#666',
  },
  benefitActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  confidenceHigh: {
    backgroundColor: '#E8F5E9',
  },
  confidenceMedium: {
    backgroundColor: '#FFF9C4',
  },
  confidenceLow: {
    backgroundColor: '#FFEBEE',
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E3F2FD',
    borderRadius: 4,
  },
  editButtonText: {
    fontSize: 12,
    color: '#1565C0',
    fontWeight: '600',
  },
  helpBox: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBDEFB',
    marginTop: 8,
  },
  helpText: {
    fontSize: 12,
    color: '#1565C0',
    lineHeight: 18,
  },
  buttonContainer: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  confirmButton: {
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  retakeButton: {
    backgroundColor: '#1565C0',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  retakeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});
