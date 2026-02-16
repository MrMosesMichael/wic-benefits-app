import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useI18n } from '@/lib/i18n/I18nContext';
import StoreProductList from '@/components/StoreProductList';

export default function StoreDetailScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{
    name: string;
    chain: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
    wicAuthorized: string;
    lat: string;
    lng: string;
    distance: string;
    storeId: string;
  }>();

  const isWic = params.wicAuthorized === '1';
  const fullAddress = `${params.street}, ${params.city}, ${params.state} ${params.zip}`;

  const handleCall = () => {
    if (params.phone) {
      Linking.openURL(`tel:${params.phone.replace(/[^\d]/g, '')}`);
    }
  };

  const handleDirections = () => {
    const url = Platform.select({
      ios: `maps://app?daddr=${encodeURIComponent(fullAddress)}`,
      android: `geo:${params.lat},${params.lng}?q=${encodeURIComponent(fullAddress)}`,
    });
    if (url) Linking.openURL(url);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Store Info */}
      <View style={styles.headerCard}>
        <Text style={styles.storeName}>{params.name}</Text>
        <Text style={styles.chain}>{params.chain}</Text>

        {isWic && (
          <View style={styles.wicBadge}>
            <Text style={styles.wicBadgeText}>{t('storeFinder.wicAuthorized')}</Text>
          </View>
        )}

        {params.distance && (
          <Text style={styles.distance}>{params.distance} {t('units.mi')} {t('storeFinder.away')}</Text>
        )}
      </View>

      {/* Address */}
      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>{t('storeFinder.address')}</Text>
        <Text style={styles.infoText}>{fullAddress}</Text>
      </View>

      {/* Phone */}
      {params.phone ? (
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>{t('storeFinder.phone')}</Text>
          <Text style={styles.infoText}>{params.phone}</Text>
        </View>
      ) : null}

      {/* Actions */}
      <View style={styles.actionsCard}>
        {params.phone ? (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleCall}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.storeFinder.callLabel')}
          >
            <Text style={styles.actionButtonText}>📞 {t('storeFinder.call')}</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={styles.actionButtonPrimary}
          onPress={handleDirections}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.storeFinder.directionsLabel')}
        >
          <Text style={styles.actionButtonPrimaryText}>🗺️ {t('storeFinder.directions')}</Text>
        </TouchableOpacity>
      </View>

      {/* Products at This Store */}
      {params.storeId && (
        <View style={styles.productsSection}>
          <Text style={styles.sectionTitle}>{t('storeProducts.title')}</Text>
          <StoreProductList storeId={params.storeId} chain={params.chain || ''} />
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
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  storeName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  chain: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  wicBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 8,
  },
  wicBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  distance: {
    fontSize: 14,
    color: '#546E7A',
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  infoText: {
    fontSize: 16,
    color: '#333',
  },
  actionsCard: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  actionButtonPrimary: {
    flex: 1,
    backgroundColor: '#546E7A',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonPrimaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  productsSection: {
    marginTop: 20,
  },
});
