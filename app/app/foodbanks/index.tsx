import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useTranslation } from '@/lib/i18n/I18nContext';

// API base URL - would come from config
const API_BASE = __DEV__
  ? 'http://192.168.12.94:3000/api/v1'
  : 'https://mdmichael.com/wic/api/v1';

interface FoodBank {
  id: string;
  name: string;
  organizationType: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  location: {
    latitude: number;
    longitude: number;
  };
  phone?: string;
  website?: string;
  hours: Array<{ day: string; hours: string }>;
  hoursNotes?: string;
  services: string[];
  eligibilityNotes?: string;
  requiredDocuments: string[];
  acceptsWicParticipants: boolean;
  distanceMiles: number;
  isOpenNow: boolean;
}

const SERVICE_ICONS: Record<string, string> = {
  groceries: '🛒',
  produce: '🥬',
  meat: '🥩',
  dairy: '🥛',
  hot_meals: '🍲',
  baby_supplies: '👶',
  diapers: '🧷',
  formula: '🍼',
};

const SERVICE_LABELS: Record<string, string> = {
  groceries: 'Groceries',
  produce: 'Fresh Produce',
  meat: 'Meat',
  dairy: 'Dairy',
  hot_meals: 'Hot Meals',
  baby_supplies: 'Baby Supplies',
  diapers: 'Diapers',
  formula: 'Infant Formula',
};

export default function FoodBankFinderScreen() {
  const router = useRouter();
  const t = useTranslation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [foodBanks, setFoodBanks] = useState<FoodBank[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [searchRadius, setSearchRadius] = useState(25);
  const [showOpenOnly, setShowOpenOnly] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    await requestLocation();
  };

  const requestLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError(t('foodBanks.locationPermissionDenied'));
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords = {
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      };
      setLocation(coords);
      setLocationError(null);

      // Search with location
      await searchFoodBanks(coords);
    } catch (error) {
      console.error('Failed to get location:', error);
      setLocationError(t('foodBanks.locationError'));
      setLoading(false);
    }
  };

  const searchFoodBanks = async (coords: { lat: number; lng: number }) => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        lat: coords.lat.toString(),
        lng: coords.lng.toString(),
        radius: searchRadius.toString(),
        openNow: showOpenOnly.toString(),
      });

      if (selectedServices.length > 0) {
        params.append('services', selectedServices.join(','));
      }

      const response = await fetch(`${API_BASE}/foodbanks?${params}`);
      const data = await response.json();

      if (data.success) {
        setFoodBanks(data.foodBanks);
      }
    } catch (error) {
      console.error('Failed to search food banks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = useCallback(() => {
    if (location) {
      setRefreshing(true);
      searchFoodBanks(location);
    }
  }, [location, searchRadius, showOpenOnly, selectedServices]);

  const handleSearch = () => {
    if (location) {
      searchFoodBanks(location);
    }
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleDirections = (foodBank: FoodBank) => {
    const address = `${foodBank.address.street}, ${foodBank.address.city}, ${foodBank.address.state} ${foodBank.address.zipCode}`;
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(address)}`,
      android: `geo:0,0?q=${encodeURIComponent(address)}`,
    });
    if (url) Linking.openURL(url);
  };

  const handleWebsite = (website: string) => {
    let url = website;
    if (!url.startsWith('http')) {
      url = `https://${url}`;
    }
    Linking.openURL(url);
  };

  const toggleService = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service]
    );
  };

  const getOrganizationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      food_bank: t('foodBanks.types.foodBank'),
      food_pantry: t('foodBanks.types.foodPantry'),
      soup_kitchen: t('foodBanks.types.soupKitchen'),
      mobile_pantry: t('foodBanks.types.mobilePantry'),
      community_center: t('foodBanks.types.communityCenter'),
    };
    return labels[type] || type;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← {t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('foodBanks.title')}</Text>
        <Text style={styles.subtitle}>{t('foodBanks.subtitle')}</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* De-stigmatizing Message */}
        <View style={styles.messageCard}>
          <Text style={styles.messageIcon}>💚</Text>
          <Text style={styles.messageText}>{t('foodBanks.supportMessage')}</Text>
        </View>

        {/* Filters */}
        <View style={styles.filtersCard}>
          <Text style={styles.filterTitle}>{t('foodBanks.searchRadius')}</Text>
          <View style={styles.radiusButtons}>
            {[10, 25, 50].map((radius) => (
              <TouchableOpacity
                key={radius}
                style={[
                  styles.radiusButton,
                  searchRadius === radius && styles.radiusButtonActive,
                ]}
                onPress={() => setSearchRadius(radius)}
              >
                <Text
                  style={[
                    styles.radiusButtonText,
                    searchRadius === radius && styles.radiusButtonTextActive,
                  ]}
                >
                  {radius} mi
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Open Now Toggle */}
          <TouchableOpacity
            style={[styles.toggleButton, showOpenOnly && styles.toggleButtonActive]}
            onPress={() => setShowOpenOnly(!showOpenOnly)}
          >
            <Text
              style={[
                styles.toggleButtonText,
                showOpenOnly && styles.toggleButtonTextActive,
              ]}
            >
              {showOpenOnly ? '✓ ' : ''}
              {t('foodBanks.openNow')}
            </Text>
          </TouchableOpacity>

          {/* Service Filters */}
          <Text style={[styles.filterTitle, { marginTop: 12 }]}>
            {t('foodBanks.filterByServices')}
          </Text>
          <View style={styles.serviceFilters}>
            {['groceries', 'baby_supplies', 'formula', 'hot_meals'].map((service) => (
              <TouchableOpacity
                key={service}
                style={[
                  styles.serviceChip,
                  selectedServices.includes(service) && styles.serviceChipActive,
                ]}
                onPress={() => toggleService(service)}
              >
                <Text style={styles.serviceChipIcon}>{SERVICE_ICONS[service]}</Text>
                <Text
                  style={[
                    styles.serviceChipText,
                    selectedServices.includes(service) && styles.serviceChipTextActive,
                  ]}
                >
                  {SERVICE_LABELS[service]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>{t('foodBanks.search')}</Text>
          </TouchableOpacity>
        </View>

        {/* Loading */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>{t('foodBanks.searching')}</Text>
          </View>
        )}

        {/* Location Error */}
        {locationError && !loading && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>📍</Text>
            <Text style={styles.errorText}>{locationError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={requestLocation}>
              <Text style={styles.retryButtonText}>{t('common.tryAgain')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Results */}
        {!loading && !locationError && foodBanks.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏠</Text>
            <Text style={styles.emptyTitle}>{t('foodBanks.noResults')}</Text>
            <Text style={styles.emptyText}>{t('foodBanks.noResultsMessage')}</Text>
          </View>
        )}

        {!loading && foodBanks.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsHeader}>
              {t('foodBanks.foundCount', { count: foodBanks.length })}
            </Text>

            {foodBanks.map((foodBank) => {
              const isExpanded = expandedCard === foodBank.id;

              return (
                <TouchableOpacity
                  key={foodBank.id}
                  style={styles.foodBankCard}
                  onPress={() => setExpandedCard(isExpanded ? null : foodBank.id)}
                  activeOpacity={0.7}
                >
                  {/* Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.cardTitleRow}>
                      <Text style={styles.foodBankName}>{foodBank.name}</Text>
                      {foodBank.isOpenNow && (
                        <View style={styles.openBadge}>
                          <Text style={styles.openBadgeText}>{t('foodBanks.openNow')}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.cardMetaRow}>
                      <Text style={styles.organizationType}>
                        {getOrganizationTypeLabel(foodBank.organizationType)}
                      </Text>
                      <Text style={styles.distance}>
                        {foodBank.distanceMiles} {t('result.miles')}
                      </Text>
                    </View>
                  </View>

                  {/* Address */}
                  <Text style={styles.address}>
                    {foodBank.address.street}, {foodBank.address.city}, {foodBank.address.state}{' '}
                    {foodBank.address.zipCode}
                  </Text>

                  {/* Services */}
                  <View style={styles.servicesRow}>
                    {foodBank.services.slice(0, 4).map((service) => (
                      <View key={service} style={styles.serviceBadge}>
                        <Text style={styles.serviceBadgeIcon}>{SERVICE_ICONS[service] || '📦'}</Text>
                        <Text style={styles.serviceBadgeText}>
                          {SERVICE_LABELS[service] || service}
                        </Text>
                      </View>
                    ))}
                    {foodBank.services.length > 4 && (
                      <Text style={styles.moreServices}>
                        +{foodBank.services.length - 4}
                      </Text>
                    )}
                  </View>

                  {/* WIC Badge */}
                  {foodBank.acceptsWicParticipants && (
                    <View style={styles.wicBadge}>
                      <Text style={styles.wicBadgeText}>{t('foodBanks.welcomesWic')}</Text>
                    </View>
                  )}

                  {/* Expanded Details */}
                  {isExpanded && (
                    <View style={styles.expandedContent}>
                      {/* Hours */}
                      <View style={styles.hoursSection}>
                        <Text style={styles.sectionTitle}>{t('foodBanks.hours')}</Text>
                        {foodBank.hours.map((h) => (
                          <View key={h.day} style={styles.hoursRow}>
                            <Text style={styles.hoursDay}>{h.day}</Text>
                            <Text style={styles.hoursTime}>{h.hours}</Text>
                          </View>
                        ))}
                        {foodBank.hoursNotes && (
                          <Text style={styles.hoursNotes}>{foodBank.hoursNotes}</Text>
                        )}
                      </View>

                      {/* Eligibility */}
                      {foodBank.eligibilityNotes && (
                        <View style={styles.eligibilitySection}>
                          <Text style={styles.sectionTitle}>{t('foodBanks.eligibility')}</Text>
                          <Text style={styles.eligibilityText}>{foodBank.eligibilityNotes}</Text>
                        </View>
                      )}

                      {/* Required Documents */}
                      {foodBank.requiredDocuments.length > 0 && (
                        <View style={styles.documentsSection}>
                          <Text style={styles.sectionTitle}>{t('foodBanks.requiredDocs')}</Text>
                          {foodBank.requiredDocuments.map((doc) => (
                            <Text key={doc} style={styles.documentItem}>
                              • {doc.replace(/_/g, ' ')}
                            </Text>
                          ))}
                        </View>
                      )}

                      {/* Actions */}
                      <View style={styles.actionsRow}>
                        {foodBank.phone && (
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleCall(foodBank.phone!)}
                          >
                            <Text style={styles.actionButtonText}>📞 {t('foodBanks.call')}</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleDirections(foodBank)}
                        >
                          <Text style={styles.actionButtonText}>🗺️ {t('foodBanks.directions')}</Text>
                        </TouchableOpacity>
                        {foodBank.website && (
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleWebsite(foodBank.website!)}
                          >
                            <Text style={styles.actionButtonText}>🌐 {t('foodBanks.website')}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Expand indicator */}
                  <Text style={styles.expandIndicator}>
                    {isExpanded ? t('foodBanks.tapToCollapse') : t('foodBanks.tapToExpand')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>{t('foodBanks.aboutTitle')}</Text>
          <Text style={styles.infoText}>{t('foodBanks.aboutText')}</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4CAF50',
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  messageCard: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  messageIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  messageText: {
    flex: 1,
    fontSize: 14,
    color: '#2E7D32',
    lineHeight: 20,
  },
  filtersCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  radiusButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  radiusButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  radiusButtonActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  radiusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  radiusButtonTextActive: {
    color: '#4CAF50',
  },
  toggleButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleButtonActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  toggleButtonTextActive: {
    color: '#4CAF50',
  },
  serviceFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#fff',
  },
  serviceChipActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  serviceChipIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  serviceChipText: {
    fontSize: 13,
    color: '#666',
  },
  serviceChipTextActive: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  searchButton: {
    backgroundColor: '#4CAF50',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
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
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  resultsContainer: {
    marginBottom: 16,
  },
  resultsHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  foodBankCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    marginBottom: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  foodBankName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  openBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  openBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
  },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  organizationType: {
    fontSize: 13,
    color: '#666',
  },
  distance: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
  },
  address: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  servicesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  serviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  serviceBadgeIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  serviceBadgeText: {
    fontSize: 11,
    color: '#666',
  },
  moreServices: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    alignSelf: 'center',
    marginLeft: 4,
  },
  wicBadge: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  wicBadgeText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '600',
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  hoursSection: {
    marginBottom: 16,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  hoursDay: {
    fontSize: 13,
    color: '#666',
  },
  hoursTime: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  hoursNotes: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  eligibilitySection: {
    marginBottom: 16,
  },
  eligibilityText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  documentsSection: {
    marginBottom: 16,
  },
  documentItem: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  expandIndicator: {
    fontSize: 12,
    color: '#4CAF50',
    textAlign: 'center',
    marginTop: 12,
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
