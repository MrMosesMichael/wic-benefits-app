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
import { colors, fonts, card } from '@/lib/theme';

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
          <ActivityIndicator size="large" color={colors.dustyBlue} />
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
    backgroundColor: colors.screenBg,
  },
  header: {
    backgroundColor: colors.header,
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
    color: colors.white,
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
    color: colors.muted,
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
    color: colors.navy,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: colors.dustyBlue,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
  },
  primaryCard: {
    ...card,
    margin: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.dustyBlue,
  },
  primaryLabel: {
    fontSize: 12,
    color: colors.muted,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  primaryBrand: {
    fontSize: 14,
    color: colors.muted,
    textTransform: 'uppercase',
  },
  primaryName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.navy,
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
    color: colors.muted,
  },
  contractBadge: {
    backgroundColor: colors.dustyBlue,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  contractBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
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
    color: colors.navy,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 24,
  },
});
