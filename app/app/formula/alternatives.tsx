import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getFormulaAlternatives } from '@/lib/services/api';
import FormulaAlternatives from '@/components/FormulaAlternatives';
import { useLocation } from '@/lib/hooks/useLocation';
import type { FormulaAlternative, FormulaAlternativesResponse } from '@/lib/types';
import { useTranslation } from '@/lib/i18n/I18nContext';

export default function FormulaAlternativesScreen() {
  const router = useRouter();
  const t = useTranslation();
  const params = useLocalSearchParams<{
    upc: string;
    name?: string;
    brand?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FormulaAlternativesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { location: userLocation } = useLocation();
  const location = userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : null;
  const detectedState = userLocation?.state || 'MI';

  useEffect(() => {
    initialize();
  }, [userLocation]);

  const initialize = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getFormulaAlternatives(
        params.upc,
        detectedState,
        location || undefined,
        25
      );

      setData(response);
    } catch (err) {
      console.error('Failed to load alternatives:', err);
      setError(t('alternatives.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleAlternativePress = (alternative: FormulaAlternative) => {
    // Navigate to cross-store search for this alternative
    router.push({
      pathname: '/formula/cross-store-search',
      params: {
        upc: alternative.upc,
        brand: alternative.brand,
        autoSearch: 'true',
      },
    });
  };

  const handleRetry = () => {
    initialize();
  };

  return (
    <View style={styles.container}>
      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>{t('alternatives.searchingAlternatives')}</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon} accessible={false} importantForAccessibility="no">⚠️</Text>
          <Text style={styles.errorTitle}>{t('alternatives.failedToLoad')}</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry} accessibilityRole="button" accessibilityLabel={t('a11y.alternatives.retryLabel')}>
            <Text style={styles.retryButtonText}>{t('alternatives.tryAgain')}</Text>
          </TouchableOpacity>
        </View>
      ) : data ? (
        <View style={styles.contentContainer}>
          {/* Primary Formula Info */}
          {data.primary && (
            <View style={styles.primaryCard}>
              <Text style={styles.primaryLabel}>{t('alternatives.searchingFor')}</Text>
              <Text style={styles.primaryBrand}>{data.primary.brand}</Text>
              <Text style={styles.primaryName}>{data.primary.productName}</Text>
              <View style={styles.primaryDetails}>
                <Text style={styles.primaryDetailText}>
                  {data.primary.form} • {data.primary.size}
                </Text>
                {data.primary.stateContractBrand && (
                  <View style={styles.contractBadge}>
                    <Text style={styles.contractBadgeText}>
                      {t('alternatives.wicContractBrand')}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Alternatives List */}
          <ScrollView style={styles.scrollView}>
            <FormulaAlternatives
              alternatives={data.alternatives}
              onAlternativePress={handleAlternativePress}
              showAvailability={location !== null}
            />
          </ScrollView>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon} accessible={false} importantForAccessibility="no">🍼</Text>
          <Text style={styles.emptyTitle}>{t('alternatives.noAlternativesTitle')}</Text>
          <Text style={styles.emptyText}>{t('alternatives.noAlternativesMessage')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1976D2',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 24,
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    lineHeight: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
  },
  primaryCard: {
    backgroundColor: '#fff',
    padding: 16,
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#1976D2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  primaryBrand: {
    fontSize: 14,
    color: '#666',
    textTransform: 'uppercase',
  },
  primaryName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
    marginBottom: 8,
  },
  primaryDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  primaryDetailText: {
    fontSize: 13,
    color: '#666',
  },
  contractBadge: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  contractBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});
