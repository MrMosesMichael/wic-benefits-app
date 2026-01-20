import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { getBenefits, Household } from '@/lib/services/api';

export default function Benefits() {
  const router = useRouter();
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBenefits();
  }, []);

  const loadBenefits = async () => {
    try {
      setError(null);
      const data = await getBenefits();
      setHousehold(data);
    } catch (err) {
      console.error('Failed to load benefits:', err);
      setError('Failed to load benefits. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadBenefits();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Loading benefits...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadBenefits}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!household || household.participants.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No benefits data available</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>My Benefits</Text>
        <Text style={styles.subtitle}>Michigan WIC</Text>
      </View>

      {household.participants.map((participant) => (
        <View key={participant.id} style={styles.participantSection}>
          <View style={styles.participantHeader}>
            <Text style={styles.participantName}>{participant.name}</Text>
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>{participant.type}</Text>
            </View>
          </View>

          <View style={styles.benefitsList}>
            {participant.benefits.length === 0 ? (
              <Text style={styles.noBenefitsText}>No active benefits</Text>
            ) : (
              participant.benefits.map((benefit, index) => {
                const consumed = parseFloat(benefit.consumed);
                const inCart = parseFloat(benefit.inCart);
                const available = parseFloat(benefit.available);
                const total = parseFloat(benefit.total);

                return (
                  <View key={index} style={styles.benefitCard}>
                    <Text style={styles.categoryName}>{benefit.categoryLabel}</Text>

                    {/* Three-state progress bar */}
                    <View style={styles.progressBarContainer}>
                      <View style={styles.progressBar}>
                        {consumed > 0 && (
                          <View style={[styles.progressSegment, styles.consumedSegment, { flex: consumed }]} />
                        )}
                        {inCart > 0 && (
                          <View style={[styles.progressSegment, styles.inCartSegment, { flex: inCart }]} />
                        )}
                        {available > 0 && (
                          <View style={[styles.progressSegment, styles.availableSegment, { flex: available }]} />
                        )}
                      </View>
                    </View>

                    {/* State labels */}
                    <View style={styles.stateLabels}>
                      <View style={styles.stateLabel}>
                        <View style={[styles.stateDot, styles.consumedDot]} />
                        <Text style={styles.stateLabelText}>Used: {benefit.consumed} {benefit.unit}</Text>
                      </View>
                      <View style={styles.stateLabel}>
                        <View style={[styles.stateDot, styles.inCartDot]} />
                        <Text style={styles.stateLabelText}>In Cart: {benefit.inCart} {benefit.unit}</Text>
                      </View>
                      <View style={styles.stateLabel}>
                        <View style={[styles.stateDot, styles.availableDot]} />
                        <Text style={styles.stateLabelText}>Available: {benefit.available} {benefit.unit}</Text>
                      </View>
                    </View>

                    <Text style={styles.total}>
                      Total: {benefit.total} {benefit.unit}
                    </Text>

                    {benefit.periodEnd && (
                      <Text style={styles.expiration}>
                        Expires: {new Date(benefit.periodEnd).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </View>
      ))}

      <View style={styles.notice}>
        <Text style={styles.noticeText}>
          💡 Benefits shown are for the current period. Unused benefits do not roll over to the next month.
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => router.push('/scanner')}
        >
          <Text style={styles.scanButtonText}>Scan Products</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => router.back()}
        >
          <Text style={styles.homeButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#C62828',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  participantSection: {
    marginTop: 16,
  },
  participantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  participantName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  typeBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976D2',
    textTransform: 'capitalize',
  },
  benefitsList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  noBenefitsText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  benefitCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  progressBarContainer: {
    marginVertical: 12,
  },
  progressBar: {
    flexDirection: 'row',
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E0E0E0',
  },
  progressSegment: {
    height: '100%',
  },
  consumedSegment: {
    backgroundColor: '#9E9E9E',
  },
  inCartSegment: {
    backgroundColor: '#FFA000',
  },
  availableSegment: {
    backgroundColor: '#2E7D32',
  },
  stateLabels: {
    marginTop: 8,
    gap: 4,
  },
  stateLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stateDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  consumedDot: {
    backgroundColor: '#9E9E9E',
  },
  inCartDot: {
    backgroundColor: '#FFA000',
  },
  availableDot: {
    backgroundColor: '#2E7D32',
  },
  stateLabelText: {
    fontSize: 12,
    color: '#666',
  },
  amounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 4,
  },
  available: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  total: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
  },
  expiration: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  notice: {
    margin: 16,
    padding: 12,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFECB5',
  },
  noticeText: {
    fontSize: 12,
    color: '#856404',
    lineHeight: 18,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 12,
  },
  scanButton: {
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  homeButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  homeButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    minWidth: 200,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
