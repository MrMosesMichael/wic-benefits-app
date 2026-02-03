import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { searchFormulaStores, getFormulaShortages, getParticipantFormula, getFormulaByUpc } from '@/lib/services/api';
import StoreResultCard from '@/components/StoreResultCard';
import FormulaSightingModal from '@/components/FormulaSightingModal';
import FormulaAlertButton from '@/components/FormulaAlertButton';
import type { StoreResult, WicFormula, ParticipantFormula } from '@/lib/types';
import Constants from 'expo-constants';

interface FormulaShortage {
  id: string;
  productName: string;
  severity: 'moderate' | 'severe' | 'critical';
  outOfStockPercentage: number;
  totalStoresChecked: number;
  trend: 'worsening' | 'stable' | 'improving';
  detectedAt: string;
}

export default function FormulaFinder() {
  const router = useRouter();
  const params = useLocalSearchParams<{ selectedUpc?: string; selectedName?: string }>();

  // State
  const [searchRadius, setSearchRadius] = useState(10);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [storeResults, setStoreResults] = useState<StoreResult[]>([]);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [shortages, setShortages] = useState<FormulaShortage[]>([]);
  const [loadingShortages, setLoadingShortages] = useState(true);
  const [sightingModalVisible, setSightingModalVisible] = useState(false);

  // Location state
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Formula state
  const [assignedFormula, setAssignedFormula] = useState<{
    upc: string;
    name: string;
    details?: WicFormula;
  } | null>(null);
  const [loadingFormula, setLoadingFormula] = useState(true);

  // Demo participant ID (replace with actual user's infant participant)
  const DEMO_INFANT_PARTICIPANT_ID = '3';

  // User ID for notifications (using device ID as user identifier)
  const USER_ID = Constants.deviceId || Constants.sessionId || 'demo-user';

  // Initialize on mount
  useEffect(() => {
    initializeScreen();
  }, []);

  // Handle formula selection from params
  useEffect(() => {
    if (params.selectedUpc && params.selectedName) {
      setAssignedFormula({
        upc: params.selectedUpc,
        name: params.selectedName,
      });
      // Load formula details
      loadFormulaDetails(params.selectedUpc);
    }
  }, [params.selectedUpc, params.selectedName]);

  const initializeScreen = async () => {
    await Promise.all([
      requestLocation(),
      loadAssignedFormula(),
      loadShortages(),
    ]);
  };

  const requestLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied. Enable location to find nearby stores.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      });
      setLocationError(null);
    } catch (error) {
      console.error('Failed to get location:', error);
      setLocationError('Could not get your location. Please try again.');
    }
  };

  const loadAssignedFormula = async () => {
    try {
      setLoadingFormula(true);
      const formula = await getParticipantFormula(DEMO_INFANT_PARTICIPANT_ID);
      if (formula) {
        setAssignedFormula({
          upc: formula.upc,
          name: formula.name || 'Unknown Formula',
          details: formula.details ? {
            ...formula.details,
            id: 0,
            upc: formula.upc,
            stateContractBrand: false,
            statesApproved: null,
            manufacturer: null,
            active: true,
          } as WicFormula : undefined,
        });
      }
    } catch (error) {
      console.error('Failed to load assigned formula:', error);
    } finally {
      setLoadingFormula(false);
    }
  };

  const loadFormulaDetails = async (upc: string) => {
    try {
      const details = await getFormulaByUpc(upc);
      if (details) {
        setAssignedFormula(prev => prev ? { ...prev, details } : null);
      }
    } catch (error) {
      console.error('Failed to load formula details:', error);
    }
  };

  const loadShortages = async () => {
    try {
      setLoadingShortages(true);
      const result = await getFormulaShortages('Michigan');
      setShortages(result);
    } catch (error) {
      console.error('Failed to load shortages:', error);
    } finally {
      setLoadingShortages(false);
    }
  };

  const handleSearch = async () => {
    if (!location) {
      Alert.alert('Location Required', 'Please enable location services to search for nearby stores.');
      return;
    }

    if (!assignedFormula) {
      Alert.alert('Select Formula', 'Please select your assigned formula first.');
      router.push('/formula/select');
      return;
    }

    try {
      setLoading(true);
      setSearchPerformed(true);

      const { results } = await searchFormulaStores(
        assignedFormula.upc,
        location.lat,
        location.lng,
        searchRadius,
        assignedFormula.details?.formulaType
      );

      setStoreResults(results);
    } catch (error) {
      console.error('Formula search failed:', error);
      Alert.alert('Search Failed', 'Unable to search for formula. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      loadShortages(),
      searchPerformed ? handleSearch() : Promise.resolve(),
    ]);
    setRefreshing(false);
  }, [searchPerformed]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#C62828';
      case 'severe': return '#E65100';
      case 'moderate': return '#F57C00';
      default: return '#757575';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const hours = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${Math.round(hours)}h ago`;
    return `${Math.round(hours / 24)}d ago`;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Formula Finder</Text>
        <Text style={styles.subtitle}>Find infant formula at nearby stores</Text>
      </View>

      {/* Assigned Formula Card */}
      <View style={styles.formulaCard}>
        <View style={styles.formulaCardHeader}>
          <Text style={styles.sectionTitle}>Finding Formula</Text>
          <TouchableOpacity onPress={() => router.push('/formula/select')}>
            <Text style={styles.editLink}>{assignedFormula ? 'Change' : 'Select'}</Text>
          </TouchableOpacity>
        </View>

        {loadingFormula ? (
          <ActivityIndicator size="small" color="#1976D2" />
        ) : assignedFormula ? (
          <View style={styles.selectedFormula}>
            <Text style={styles.formulaBrand}>
              {assignedFormula.details?.brand || assignedFormula.name.split(' ')[0]}
            </Text>
            <Text style={styles.formulaName}>
              {assignedFormula.details?.productName || assignedFormula.name}
            </Text>
            {assignedFormula.details && (
              <Text style={styles.formulaMeta}>
                {assignedFormula.details.form} • {assignedFormula.details.size}
              </Text>
            )}
            {/* View Alternatives Button */}
            <TouchableOpacity
              style={styles.alternativesButton}
              onPress={() => router.push({
                pathname: '/formula/alternatives',
                params: {
                  upc: assignedFormula.upc,
                  name: assignedFormula.name,
                  brand: assignedFormula.details?.brand || assignedFormula.name.split(' ')[0]
                }
              })}
            >
              <Text style={styles.alternativesButtonText}>
                🔄 View Alternative Formulas
              </Text>
            </TouchableOpacity>

            {/* Formula Alert Button */}
            <FormulaAlertButton
              userId={USER_ID}
              upc={assignedFormula.upc}
              formulaName={assignedFormula.details?.productName || assignedFormula.name}
              radius={searchRadius}
            />

            {/* Manage Alerts Link */}
            <TouchableOpacity
              style={styles.manageAlertsLink}
              onPress={() => router.push('/formula/alerts')}
            >
              <Text style={styles.manageAlertsLinkText}>
                Manage All Formula Alerts →
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.selectFormulaButton}
            onPress={() => router.push('/formula/select')}
          >
            <Text style={styles.selectFormulaButtonText}>
              Tap to select your assigned formula
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Location Status */}
      {locationError && (
        <View style={styles.locationError}>
          <Text style={styles.locationErrorText}>{locationError}</Text>
          <TouchableOpacity onPress={requestLocation}>
            <Text style={styles.retryLink}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Shortage Alerts */}
      {!loadingShortages && shortages.length > 0 && (
        <View style={styles.shortageAlertsContainer}>
          {shortages.slice(0, 2).map((shortage) => {
            // Check if this is the user's assigned formula
            const isAssignedFormula = assignedFormula &&
              shortage.productName.toLowerCase().includes(assignedFormula.name.toLowerCase());

            return (
              <View
                key={shortage.id}
                style={[
                  styles.shortageAlert,
                  { borderLeftColor: getSeverityColor(shortage.severity) }
                ]}
              >
                <View style={[
                  styles.severityBadge,
                  { backgroundColor: getSeverityColor(shortage.severity) }
                ]}>
                  <Text style={styles.severityBadgeText}>
                    {shortage.severity.charAt(0).toUpperCase() + shortage.severity.slice(1)} Shortage
                  </Text>
                </View>
                <Text style={styles.shortageProductName}>{shortage.productName}</Text>
                <Text style={styles.shortageStatText}>
                  {shortage.outOfStockPercentage}% of stores out of stock
                </Text>

                {/* Show alternatives button if this is user's formula */}
                {isAssignedFormula && assignedFormula && (
                  <TouchableOpacity
                    style={styles.shortageAlternativesButton}
                    onPress={() => router.push({
                      pathname: '/formula/alternatives',
                      params: {
                        upc: assignedFormula.upc,
                        name: assignedFormula.name,
                        brand: assignedFormula.details?.brand || assignedFormula.name.split(' ')[0]
                      }
                    })}
                  >
                    <Text style={styles.shortageAlternativesButtonText}>
                      View Alternative Formulas →
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Search Controls */}
      <View style={styles.searchCard}>
        <Text style={styles.sectionTitle}>Search Radius</Text>
        <View style={styles.radiusButtons}>
          {[5, 10, 25, 50].map(radius => (
            <TouchableOpacity
              key={radius}
              style={[
                styles.radiusButton,
                searchRadius === radius && styles.radiusButtonActive
              ]}
              onPress={() => setSearchRadius(radius)}
            >
              <Text style={[
                styles.radiusButtonText,
                searchRadius === radius && styles.radiusButtonTextActive
              ]}>
                {radius} mi
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.searchButton,
            (loading || !location || !assignedFormula) && styles.searchButtonDisabled
          ]}
          onPress={handleSearch}
          disabled={loading || !location || !assignedFormula}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.searchButtonText}>Find Formula Now</Text>
          )}
        </TouchableOpacity>

        {!location && (
          <Text style={styles.helpText}>
            Waiting for location...
          </Text>
        )}
      </View>

      {/* Results */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>Searching nearby stores...</Text>
        </View>
      )}

      {!loading && searchPerformed && storeResults.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📍</Text>
          <Text style={styles.emptyTitle}>No Stores Found</Text>
          <Text style={styles.emptyText}>
            No stores found within {searchRadius} miles that carry this formula.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => setSearchRadius(50)}
          >
            <Text style={styles.emptyButtonText}>Expand Search to 50 Miles</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && storeResults.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsHeader}>
            {storeResults.length} store{storeResults.length !== 1 ? 's' : ''} nearby
          </Text>

          {storeResults.map((store) => (
            <StoreResultCard key={store.storeId} store={store} />
          ))}

          <View style={styles.reportPrompt}>
            <Text style={styles.reportPromptText}>
              Found formula? Help others by reporting it!
            </Text>
            <TouchableOpacity
              style={styles.reportPromptButton}
              onPress={() => router.push('/formula/report')}
            >
              <Text style={styles.reportPromptButtonText}>Report Formula</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Advanced Search Link */}
      <TouchableOpacity
        style={styles.advancedSearchCard}
        onPress={() => router.push('/formula/cross-store-search')}
      >
        <View style={styles.advancedSearchContent}>
          <Text style={styles.advancedSearchIcon}>🔍</Text>
          <View style={styles.advancedSearchText}>
            <Text style={styles.advancedSearchTitle}>Advanced Cross-Store Search</Text>
            <Text style={styles.advancedSearchSubtitle}>
              Search by brand, type, or name across all stores
            </Text>
          </View>
        </View>
        <Text style={styles.advancedSearchArrow}>→</Text>
      </TouchableOpacity>

      {/* Info Section */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>About Formula Finder</Text>
        <Text style={styles.infoText}>
          Results combine store availability data with community reports. Stores shown
          "usually" or "always" carry this formula type, while confirmed reports show
          actual recent availability.
        </Text>
        <Text style={[styles.infoText, { marginTop: 12 }]}>
          Always call ahead to verify before traveling.
        </Text>
      </View>

      {/* Quick Report Button */}
      <TouchableOpacity
        style={styles.floatingReportButton}
        onPress={() => {
          if (assignedFormula) {
            setSightingModalVisible(true);
          } else {
            Alert.alert('Select Formula', 'Please select your assigned formula first.');
          }
        }}
        disabled={!assignedFormula}
      >
        <Text style={styles.floatingReportButtonText}>
          {assignedFormula ? 'Quick Report - I Found This!' : 'Select Formula to Report'}
        </Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />

      {/* Formula Sighting Modal */}
      {assignedFormula && (
        <FormulaSightingModal
          visible={sightingModalVisible}
          onClose={() => setSightingModalVisible(false)}
          formulaUpc={assignedFormula.upc}
          formulaName={assignedFormula.name}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1976D2',
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  formulaCard: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formulaCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  editLink: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '600',
  },
  selectedFormula: {
    padding: 8,
  },
  formulaBrand: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
  },
  formulaName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  formulaMeta: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
  alternativesButton: {
    marginTop: 12,
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  alternativesButtonText: {
    color: '#E65100',
    fontSize: 14,
    fontWeight: '600',
  },
  selectFormulaButton: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1976D2',
    borderStyle: 'dashed',
  },
  selectFormulaButtonText: {
    color: '#1976D2',
    fontSize: 15,
    fontWeight: '600',
  },
  manageAlertsLink: {
    marginTop: 12,
    alignItems: 'center',
  },
  manageAlertsLinkText: {
    color: '#1976D2',
    fontSize: 14,
    fontWeight: '500',
  },
  locationError: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF3E0',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
  },
  locationErrorText: {
    flex: 1,
    color: '#E65100',
    fontSize: 13,
  },
  retryLink: {
    color: '#1976D2',
    fontWeight: '600',
    marginLeft: 8,
  },
  shortageAlertsContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  shortageAlert: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  severityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  severityBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  shortageProductName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  shortageStatText: {
    fontSize: 12,
    color: '#666',
  },
  shortageAlternativesButton: {
    marginTop: 10,
    backgroundColor: '#1976D2',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  shortageAlternativesButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  searchCard: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 8,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  radiusButtons: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 16,
  },
  radiusButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  radiusButtonActive: {
    borderColor: '#1976D2',
    backgroundColor: '#E3F2FD',
  },
  radiusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  radiusButtonTextActive: {
    color: '#1976D2',
  },
  searchButton: {
    backgroundColor: '#1976D2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  searchButtonDisabled: {
    backgroundColor: '#90CAF9',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  helpText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
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
  emptyState: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 32,
    borderRadius: 12,
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
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#1976D2',
    padding: 14,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    margin: 16,
  },
  resultsHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  reportPrompt: {
    backgroundColor: '#E3F2FD',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  reportPromptText: {
    fontSize: 16,
    color: '#1976D2',
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  reportPromptButton: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  reportPromptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  floatingReportButton: {
    backgroundColor: '#4CAF50',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  floatingReportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  advancedSearchCard: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#E3F2FD',
    borderStyle: 'dashed',
  },
  advancedSearchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  advancedSearchIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  advancedSearchText: {
    flex: 1,
  },
  advancedSearchTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
  },
  advancedSearchSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  advancedSearchArrow: {
    fontSize: 20,
    color: '#1976D2',
    fontWeight: 'bold',
  },
});
