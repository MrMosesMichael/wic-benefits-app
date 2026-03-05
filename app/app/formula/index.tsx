import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { searchFormulaStores, getFormulaShortages, getParticipantFormula, getFormulaByUpc } from '@/lib/services/api';
import StoreResultCard from '@/components/StoreResultCard';
import FormulaSightingModal from '@/components/FormulaSightingModal';
import FormulaAlertButton from '@/components/FormulaAlertButton';
import LocationPrompt from '@/components/LocationPrompt';
import { useLocation } from '@/lib/hooks/useLocation';
import type { StoreResult, WicFormula, ParticipantFormula } from '@/lib/types';
import Constants from 'expo-constants';
import { useI18n } from '@/lib/i18n/I18nContext';
import { colors, fonts, card } from '@/lib/theme';

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
  const { t } = useI18n();
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

  // Location from centralized hook
  const { location: userLocation, loading: locationLoading, error: locationError, refresh: refreshLocation, setZipCode } = useLocation();
  const location = userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : null;
  const detectedState = userLocation?.state || 'MI';

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
      loadAssignedFormula(),
      loadShortages(),
    ]);
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
      const stateNames: Record<string, string> = { MI: 'Michigan', NC: 'North Carolina', FL: 'Florida', OR: 'Oregon', NY: 'New York' };
      const result = await getFormulaShortages(stateNames[detectedState] || 'Michigan');
      setShortages(result);
    } catch (error) {
      console.error('Failed to load shortages:', error);
    } finally {
      setLoadingShortages(false);
    }
  };

  const handleSearch = async () => {
    if (!location) {
      Alert.alert(t('formula.locationRequired'), t('formula.locationRequiredMsg'));
      return;
    }

    if (!assignedFormula) {
      Alert.alert(t('formula.selectFormulaAlert'), t('formula.selectFormulaAlertMsg'));
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
      Alert.alert(t('formula.searchFailed'), t('formula.searchFailedMsg'));
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
      case 'critical': return colors.danger;
      case 'severe': return colors.warning;
      case 'moderate': return colors.wheat;
      default: return colors.muted;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const hours = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60);
    if (hours < 1) return t('formula.justNow');
    if (hours < 24) return t('formula.hoursAgo', { hours: Math.round(hours) });
    return t('formula.daysAgo', { days: Math.round(hours / 24) });
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Assigned Formula Card */}
      <View style={styles.formulaCard}>
        <View style={styles.formulaCardHeader}>
          <Text style={styles.sectionTitle}>{t('formula.findingFormula')}</Text>
          <TouchableOpacity
            onPress={() => router.push('/formula/select')}
            accessibilityRole="link"
            accessibilityHint={t('a11y.formula.changeHint')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.editLink}>{assignedFormula ? t('formula.change') : t('formula.select')}</Text>
          </TouchableOpacity>
        </View>

        {loadingFormula ? (
          <ActivityIndicator size="small" color={colors.dustyBlue} />
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
              accessibilityRole="button"
            >
              <Text style={styles.alternativesButtonText}>
                {t('formula.viewAlternatives')}
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
              accessibilityRole="link"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.manageAlertsLinkText}>
                {t('formula.manageAlerts')} →
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.selectFormulaButton}
            onPress={() => router.push('/formula/select')}
            accessibilityRole="button"
            accessibilityHint={t('a11y.formula.selectHint')}
          >
            <Text style={styles.selectFormulaButtonText}>
              {t('formula.selectFormula')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Location Prompt */}
      {!location && !locationLoading && (
        <LocationPrompt
          onGPS={refreshLocation}
          onZipCode={setZipCode}
          loading={locationLoading}
          error={locationError}
        />
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
                    {shortage.severity.charAt(0).toUpperCase() + shortage.severity.slice(1)} {t('formula.shortage')}
                  </Text>
                </View>
                <Text style={styles.shortageProductName}>{shortage.productName}</Text>
                <Text style={styles.shortageStatText}>
                  {t('formula.ofStoresOut', { percent: shortage.outOfStockPercentage })}
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
                    accessibilityRole="button"
                    hitSlop={{ top: 6, bottom: 6 }}
                  >
                    <Text style={styles.shortageAlternativesButtonText}>
                      {t('formula.viewAlternativeFormulas')} →
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
        <Text style={styles.sectionTitle}>{t('formula.searchRadius')}</Text>
        <View style={styles.radiusButtons}>
          {[5, 10, 25, 50].map(radius => (
            <TouchableOpacity
              key={radius}
              style={[
                styles.radiusButton,
                searchRadius === radius && styles.radiusButtonActive
              ]}
              onPress={() => setSearchRadius(radius)}
              accessibilityRole="radio"
              accessibilityState={{ selected: searchRadius === radius }}
            >
              <Text style={[
                styles.radiusButtonText,
                searchRadius === radius && styles.radiusButtonTextActive
              ]}>
                {radius} {t('units.mi')}
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
          accessibilityRole="button"
          accessibilityState={{ disabled: loading || !location || !assignedFormula }}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.searchButtonText}>{t('formula.findFormulaNow')}</Text>
          )}
        </TouchableOpacity>

        {!location && (
          <Text style={styles.helpText}>
            {t('formula.waitingForLocation')}
          </Text>
        )}
      </View>

      {/* Results */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.dustyBlue} />
          <Text style={styles.loadingText}>{t('formula.searchingStores')}</Text>
        </View>
      )}

      {!loading && searchPerformed && storeResults.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon} accessible={false} importantForAccessibility="no">📍</Text>
          <Text style={styles.emptyTitle}>{t('formula.noStoresFound')}</Text>
          <Text style={styles.emptyText}>
            {t('formula.noStoresMessage', { radius: searchRadius })}
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => setSearchRadius(50)}
            accessibilityRole="button"
          >
            <Text style={styles.emptyButtonText}>{t('formula.expandSearch')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && storeResults.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsHeader}>
            {t('formula.storesNearby', { count: storeResults.length })}
          </Text>

          {storeResults.map((store) => (
            <StoreResultCard key={store.storeId} store={store} />
          ))}

          <View style={styles.reportPrompt}>
            <Text style={styles.reportPromptText}>
              {t('formula.foundFormulaHelp')}
            </Text>
            <TouchableOpacity
              style={styles.reportPromptButton}
              onPress={() => router.push('/formula/report')}
              accessibilityRole="button"
            >
              <Text style={styles.reportPromptButtonText}>{t('formula.reportFormula')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Advanced Search Link */}
      <TouchableOpacity
        style={styles.advancedSearchCard}
        onPress={() => router.push('/formula/cross-store-search')}
        accessibilityRole="link"
        accessibilityHint={t('a11y.formula.crossStoreHint')}
      >
        <View style={styles.advancedSearchContent}>
          <Text style={styles.advancedSearchIcon} accessible={false} importantForAccessibility="no">🔍</Text>
          <View style={styles.advancedSearchText}>
            <Text style={styles.advancedSearchTitle}>{t('formula.advancedSearch')}</Text>
            <Text style={styles.advancedSearchSubtitle}>
              {t('formula.advancedSearchDesc')}
            </Text>
          </View>
        </View>
        <Text style={styles.advancedSearchArrow} accessible={false}>→</Text>
      </TouchableOpacity>

      {/* Info Section */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>{t('formula.aboutTitle')}</Text>
        <Text style={styles.infoText}>
          {t('formula.aboutText')}
        </Text>
        <Text style={[styles.infoText, { marginTop: 12 }]}>
          {t('formula.callAhead')}
        </Text>
      </View>

      {/* Quick Report Button */}
      <TouchableOpacity
        style={styles.floatingReportButton}
        onPress={() => {
          if (assignedFormula) {
            setSightingModalVisible(true);
          } else {
            router.push('/formula/select');
          }
        }}
        accessibilityRole="button"
      >
        <Text style={styles.floatingReportButtonText}>
          {assignedFormula ? t('formula.quickReport') : t('formula.selectFormulaToReport')}
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
    backgroundColor: colors.screenBg,
  },
  header: {
    backgroundColor: colors.header,
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  formulaCard: {
    ...card,
    margin: 16,
    marginBottom: 8,
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
    color: colors.muted,
    textTransform: 'uppercase',
  },
  editLink: {
    fontSize: 14,
    color: colors.dustyBlue,
    fontWeight: '600',
  },
  selectedFormula: {
    padding: 8,
  },
  formulaBrand: {
    fontSize: 12,
    color: colors.muted,
    textTransform: 'uppercase',
  },
  formulaName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.navy,
    marginTop: 2,
  },
  formulaMeta: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 4,
  },
  alternativesButton: {
    marginTop: 12,
    backgroundColor: colors.cardBg,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.warning,
  },
  alternativesButtonText: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: '600',
  },
  selectFormulaButton: {
    backgroundColor: colors.screenBg,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.dustyBlue,
    borderStyle: 'dashed',
  },
  selectFormulaButtonText: {
    color: colors.dustyBlue,
    fontSize: 15,
    fontWeight: '600',
  },
  manageAlertsLink: {
    marginTop: 12,
    alignItems: 'center',
  },
  manageAlertsLinkText: {
    color: colors.dustyBlue,
    fontSize: 14,
    fontWeight: '500',
  },
  locationError: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBg,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
  },
  locationErrorText: {
    flex: 1,
    color: colors.warning,
    fontSize: 13,
  },
  retryLink: {
    color: colors.dustyBlue,
    fontWeight: '600',
    marginLeft: 8,
  },
  shortageAlertsContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  shortageAlert: {
    backgroundColor: colors.cardBg,
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
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  shortageProductName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 4,
  },
  shortageStatText: {
    fontSize: 12,
    color: colors.muted,
  },
  shortageAlternativesButton: {
    marginTop: 10,
    backgroundColor: colors.dustyBlue,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  shortageAlternativesButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  searchCard: {
    ...card,
    margin: 16,
    marginTop: 8,
    padding: 20,
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
    borderColor: colors.border,
    alignItems: 'center',
  },
  radiusButtonActive: {
    borderColor: colors.dustyBlue,
    backgroundColor: colors.screenBg,
  },
  radiusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
  },
  radiusButtonTextActive: {
    color: colors.dustyBlue,
  },
  searchButton: {
    backgroundColor: colors.dustyBlue,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  searchButtonDisabled: {
    backgroundColor: colors.border,
  },
  searchButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  helpText: {
    fontSize: 13,
    color: colors.muted,
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
    color: colors.muted,
  },
  emptyState: {
    ...card,
    margin: 16,
    padding: 32,
    alignItems: 'center',
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
  },
  emptyText: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: colors.dustyBlue,
    padding: 14,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    margin: 16,
  },
  resultsHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.navy,
    marginBottom: 16,
  },
  reportPrompt: {
    backgroundColor: colors.screenBg,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  reportPromptText: {
    fontSize: 16,
    color: colors.dustyBlue,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  reportPromptButton: {
    backgroundColor: colors.dustyBlue,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  reportPromptButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    ...card,
    margin: 16,
    padding: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.navy,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
  floatingReportButton: {
    backgroundColor: colors.success,
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
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  advancedSearchCard: {
    ...card,
    margin: 16,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    color: colors.dustyBlue,
  },
  advancedSearchSubtitle: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  advancedSearchArrow: {
    fontSize: 20,
    color: colors.dustyBlue,
    fontWeight: 'bold',
  },
});
