import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function ScanResult() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const isEligible = params.eligible === 'true';
  const upc = params.upc as string;
  const name = params.name as string;
  const brand = params.brand as string;
  const category = params.category as string;
  const reason = params.reason as string;

  return (
    <ScrollView style={styles.container}>
      {/* Result Header */}
      <View style={[styles.resultCard, isEligible ? styles.eligible : styles.notEligible]}>
        <View style={styles.statusBadge}>
          <Text style={styles.statusIcon}>{isEligible ? '✓' : '✗'}</Text>
        </View>
        <Text style={styles.statusText}>
          {isEligible ? 'WIC Approved' : 'Not WIC Approved'}
        </Text>
        <Text style={styles.statusSubtext}>Michigan</Text>
      </View>

      {/* Product Details */}
      <View style={styles.detailsCard}>
        <Text style={styles.productName}>{name}</Text>
        {brand && <Text style={styles.productBrand}>{brand}</Text>}
        <Text style={styles.upcLabel}>UPC: {upc}</Text>

        {category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{category.toUpperCase()}</Text>
          </View>
        )}

        {reason && (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonText}>{reason}</Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            router.back();
            // Small delay to allow navigation to complete before re-enabling scanner
            setTimeout(() => router.back(), 100);
          }}
        >
          <Text style={styles.primaryButtonText}>Scan Another Product</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/benefits')}
        >
          <Text style={styles.secondaryButtonText}>View My Benefits</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.textButton}
          onPress={() => router.push('/')}
        >
          <Text style={styles.textButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>

      {/* Help Text */}
      {!isEligible && (
        <View style={styles.helpBox}>
          <Text style={styles.helpTitle}>Why isn't this approved?</Text>
          <Text style={styles.helpText}>
            This product may not be on Michigan's WIC Approved Product List (APL).
            Check the product size, brand, or category - even small differences can affect eligibility.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  resultCard: {
    margin: 20,
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eligible: {
    backgroundColor: '#2E7D32',
  },
  notEligible: {
    backgroundColor: '#C62828',
  },
  statusBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIcon: {
    fontSize: 48,
    color: '#fff',
    fontWeight: 'bold',
  },
  statusText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statusSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  detailsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  productName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  productBrand: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  upcLabel: {
    fontSize: 14,
    color: '#999',
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginBottom: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
  },
  reasonBox: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
  },
  reasonText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  buttonContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#1976D2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  textButton: {
    padding: 12,
    alignItems: 'center',
  },
  textButtonText: {
    color: '#666',
    fontSize: 14,
  },
  helpBox: {
    backgroundColor: '#FFF3CD',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFECB5',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
});
