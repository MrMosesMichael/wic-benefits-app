import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { crossStoreSearch, getFormulaBrands, getWicFormulas } from '@/lib/services/api';
import CrossStoreSearchResults from '@/components/CrossStoreSearchResults';
import FormulaStoreMap from '@/components/FormulaStoreMap';
import FormulaSightingModal from '@/components/FormulaSightingModal';
import LocationPrompt from '@/components/LocationPrompt';
import { useLocation } from '@/lib/hooks/useLocation';
import type { CrossStoreResult, CrossStoreSearchRequest, WicFormula, FormulaBrand, FormulaType } from '@/lib/types';
import { useTranslation } from '@/lib/i18n/I18nContext';

type ViewMode = 'list' | 'map';

type SearchMode = 'text' | 'brand' | 'type';

const FORMULA_TYPE_VALUES: { value: FormulaType; icon: string }[] = [
  { value: 'standard', icon: '🍼' },
  { value: 'sensitive', icon: '💚' },
  { value: 'gentle', icon: '🌸' },
  { value: 'hypoallergenic', icon: '🏥' },
  { value: 'soy', icon: '🌱' },
  { value: 'organic', icon: '🌿' },
  { value: 'specialty', icon: '⭐' },
];

export default function CrossStoreSearchScreen() {
  const router = useRouter();
  const t = useTranslation();
  const params = useLocalSearchParams<{
    upc?: string;
    brand?: string;
    formulaType?: string;
    autoSearch?: string;
  }>();

  // Location from centralized hook
  const { location: userLocation, loading: loadingLocation, error: locationError, refresh: refreshLocation, setZipCode } = useLocation();
  const location = userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : null;

  // Search state
  const [searchMode, setSearchMode] = useState<SearchMode>('text');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string | null>(params.brand || null);
  const [selectedType, setSelectedType] = useState<FormulaType | null>(
    (params.formulaType as FormulaType) || null
  );
  const [searchRadius, setSearchRadius] = useState(25);
  const [inStockOnly, setInStockOnly] = useState(false);

  // Results state
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CrossStoreResult[]>([]);
  const [matchedFormulas, setMatchedFormulas] = useState<any[]>([]);
  const [searchPerformed, setSearchPerformed] = useState(false);

  // Brands for autocomplete
  const [brands, setBrands] = useState<FormulaBrand[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(true);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Sighting modal
  const [sightingModalVisible, setSightingModalVisible] = useState(false);

  // Initialize
  useEffect(() => {
    initializeScreen();
  }, []);

  // Auto-search if params provided
  useEffect(() => {
    if (params.autoSearch === 'true' && location) {
      handleSearch();
    }
  }, [location, params.autoSearch]);

  const initializeScreen = async () => {
    await loadBrands();
  };

  const loadBrands = async () => {
    try {
      setLoadingBrands(true);
      const result = await getFormulaBrands();
      setBrands(result);
    } catch (error) {
      console.error('Failed to load brands:', error);
    } finally {
      setLoadingBrands(false);
    }
  };

  const handleSearch = async () => {
    if (!location) {
      Alert.alert(t('crossStoreSearch.locationRequired'), t('crossStoreSearch.locationRequiredMessage'));
      return;
    }

    // Build search request
    const request: CrossStoreSearchRequest = {
      lat: location.lat,
      lng: location.lng,
      radiusMiles: searchRadius,
      inStockOnly,
    };

    // Add search criteria based on mode
    if (params.upc) {
      request.upc = params.upc;
    } else if (searchMode === 'text' && searchQuery.trim()) {
      request.searchQuery = searchQuery.trim();
    } else if (searchMode === 'brand' && selectedBrand) {
      request.brand = selectedBrand;
    } else if (searchMode === 'type' && selectedType) {
      request.formulaType = selectedType;
    } else if (!params.upc) {
      Alert.alert(t('crossStoreSearch.searchRequired'), t('crossStoreSearch.searchRequiredMessage'));
      return;
    }

    try {
      setLoading(true);
      setSearchPerformed(true);

      const response = await crossStoreSearch(request);
      setResults(response.stores);
      setMatchedFormulas(response.matchedFormulas);
    } catch (error) {
      console.error('Search failed:', error);
      Alert.alert(t('crossStoreSearch.searchFailed'), t('crossStoreSearch.searchFailedMessage'));
    } finally {
      setLoading(false);
    }
  };

  const handleStorePress = (store: CrossStoreResult) => {
    // Could navigate to store detail or open actions menu
    console.log('Store pressed:', store.name);
  };

  const renderSearchModeSelector = () => (
    <View style={styles.modeSelector}>
      <TouchableOpacity
        style={[styles.modeButton, searchMode === 'text' && styles.modeButtonActive]}
        onPress={() => setSearchMode('text')}
        accessibilityRole="tab"
        accessibilityLabel={t('a11y.crossStoreSearch.searchByTextLabel')}
        accessibilityState={{ selected: searchMode === 'text' }}
        hitSlop={{ top: 4, bottom: 4 }}
      >
        <Text style={[styles.modeButtonText, searchMode === 'text' && styles.modeButtonTextActive]}>
          🔍 {t('crossStoreSearch.searchMode')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.modeButton, searchMode === 'brand' && styles.modeButtonActive]}
        onPress={() => setSearchMode('brand')}
        accessibilityRole="tab"
        accessibilityLabel={t('a11y.crossStoreSearch.searchByBrandLabel')}
        accessibilityState={{ selected: searchMode === 'brand' }}
        hitSlop={{ top: 4, bottom: 4 }}
      >
        <Text style={[styles.modeButtonText, searchMode === 'brand' && styles.modeButtonTextActive]}>
          🏷️ {t('crossStoreSearch.byBrand')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.modeButton, searchMode === 'type' && styles.modeButtonActive]}
        onPress={() => setSearchMode('type')}
        accessibilityRole="tab"
        accessibilityLabel={t('a11y.crossStoreSearch.searchByTypeLabel')}
        accessibilityState={{ selected: searchMode === 'type' }}
        hitSlop={{ top: 4, bottom: 4 }}
      >
        <Text style={[styles.modeButtonText, searchMode === 'type' && styles.modeButtonTextActive]}>
          📋 {t('crossStoreSearch.byType')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderSearchInput = () => {
    if (searchMode === 'text') {
      return (
        <View style={styles.searchInputContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder={t('crossStoreSearch.searchByName')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            placeholderTextColor="#9E9E9E"
            accessibilityLabel={t('a11y.crossStoreSearch.searchInputLabel')}
            accessibilityRole="search"
          />
        </View>
      );
    }

    if (searchMode === 'brand') {
      return (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipContainer}
        >
          {loadingBrands ? (
            <ActivityIndicator size="small" color="#1976D2" />
          ) : (
            brands.map((brand) => (
              <TouchableOpacity
                key={brand.name}
                style={[
                  styles.chip,
                  selectedBrand === brand.name && styles.chipActive
                ]}
                onPress={() => setSelectedBrand(brand.name)}
                accessibilityRole="radio"
                accessibilityLabel={`${brand.name}, ${brand.formulaCount} formulas`}
                accessibilityState={{ selected: selectedBrand === brand.name }}
              >
                <Text style={[
                  styles.chipText,
                  selectedBrand === brand.name && styles.chipTextActive
                ]}>
                  {brand.name}
                </Text>
                <Text style={styles.chipCount}>{brand.formulaCount}</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      );
    }

    if (searchMode === 'type') {
      return (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipContainer}
        >
          {FORMULA_TYPE_VALUES.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.chip,
                selectedType === type.value && styles.chipActive
              ]}
              onPress={() => setSelectedType(type.value)}
              accessibilityRole="radio"
              accessibilityLabel={t(`formulaTypes.${type.value}`)}
              accessibilityState={{ selected: selectedType === type.value }}
            >
              <Text style={styles.chipIcon} accessible={false} importantForAccessibility="no">{type.icon}</Text>
              <Text style={[
                styles.chipText,
                selectedType === type.value && styles.chipTextActive
              ]}>
                {t(`formulaTypes.${type.value}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      );
    }

    return null;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Location Prompt */}
      {!location && !loadingLocation && (
        <LocationPrompt
          onGPS={refreshLocation}
          onZipCode={setZipCode}
          loading={loadingLocation}
          error={locationError}
        />
      )}

      {/* Search Section */}
      <View style={styles.searchSection}>
        {!params.upc && renderSearchModeSelector()}
        {!params.upc && renderSearchInput()}

        {/* If UPC provided, show formula info */}
        {params.upc && matchedFormulas.length > 0 && (
          <View style={styles.formulaInfoCard}>
            <Text style={styles.formulaInfoLabel}>{t('crossStoreSearch.searchingFor')}</Text>
            <Text style={styles.formulaInfoName}>
              {matchedFormulas[0].brand} {matchedFormulas[0].productName}
            </Text>
          </View>
        )}

        {/* Filters */}
        <View style={styles.filtersRow}>
          {/* Radius */}
          <View style={styles.radiusSelector}>
            {[10, 25, 50].map((radius) => (
              <TouchableOpacity
                key={radius}
                style={[
                  styles.radiusButton,
                  searchRadius === radius && styles.radiusButtonActive
                ]}
                onPress={() => setSearchRadius(radius)}
                accessibilityRole="radio"
                accessibilityLabel={t('a11y.crossStoreSearch.radiusLabel', { radius })}
                accessibilityState={{ selected: searchRadius === radius }}
                hitSlop={{ top: 6, bottom: 6 }}
              >
                <Text style={[
                  styles.radiusButtonText,
                  searchRadius === radius && styles.radiusButtonTextActive
                ]}>
                  {radius}mi
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* In Stock Toggle */}
          <TouchableOpacity
            style={[
              styles.filterToggle,
              inStockOnly && styles.filterToggleActive
            ]}
            onPress={() => setInStockOnly(!inStockOnly)}
            accessibilityRole="switch"
            accessibilityLabel={t('a11y.crossStoreSearch.inStockOnlyLabel')}
            accessibilityState={{ checked: inStockOnly }}
            hitSlop={{ top: 6, bottom: 6 }}
          >
            <Text style={[
              styles.filterToggleText,
              inStockOnly && styles.filterToggleTextActive
            ]}>
              {t('crossStoreSearch.inStockOnly')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Button */}
        <TouchableOpacity
          style={[
            styles.searchButton,
            (loading || loadingLocation || !location) && styles.searchButtonDisabled
          ]}
          onPress={handleSearch}
          disabled={loading || loadingLocation || !location}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.crossStoreSearch.searchStoresLabel')}
          accessibilityState={{ disabled: loading || loadingLocation || !location }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.searchButtonText}>
              {loadingLocation ? t('crossStoreSearch.gettingLocation') : t('crossStoreSearch.searchButton')}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* View Toggle (only show after search) */}
      {searchPerformed && results.length > 0 && (
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.viewToggleButton, viewMode === 'list' && styles.viewToggleButtonActive]}
            onPress={() => setViewMode('list')}
            accessibilityRole="tab"
            accessibilityState={{ selected: viewMode === 'list' }}
          >
            <Text style={[styles.viewToggleText, viewMode === 'list' && styles.viewToggleTextActive]}>
              {t('crossStoreSearch.listView')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleButton, viewMode === 'map' && styles.viewToggleButtonActive]}
            onPress={() => setViewMode('map')}
            accessibilityRole="tab"
            accessibilityState={{ selected: viewMode === 'map' }}
          >
            <Text style={[styles.viewToggleText, viewMode === 'map' && styles.viewToggleTextActive]}>
              {t('crossStoreSearch.mapView')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Results */}
      <View style={styles.resultsContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1976D2" />
            <Text style={styles.loadingText}>{t('crossStoreSearch.searchingStores')}</Text>
          </View>
        ) : searchPerformed ? (
          viewMode === 'map' && results.length > 0 ? (
            <FormulaStoreMap
              results={results}
              userLocation={location}
              onStorePress={handleStorePress}
            />
          ) : (
            <CrossStoreSearchResults
              results={results}
              onStorePress={handleStorePress}
              emptyMessage={
                inStockOnly
                  ? t('crossStoreSearch.noStoresInStock')
                  : t('crossStoreSearch.noStoresFound')
              }
            />
          )
        ) : (
          <View style={styles.initialState}>
            <Text style={styles.initialIcon} accessible={false} importantForAccessibility="no">🍼</Text>
            <Text style={styles.initialTitle}>{t('crossStoreSearch.initialTitle')}</Text>
            <Text style={styles.initialText}>
              {t('crossStoreSearch.initialText')}
            </Text>
          </View>
        )}
      </View>

      {/* Matched Formulas Info */}
      {matchedFormulas.length > 1 && (
        <View style={styles.matchedInfo}>
          <Text style={styles.matchedInfoText}>
            {t('crossStoreSearch.matchedFormulas', { count: matchedFormulas.length })}
          </Text>
        </View>
      )}

      {/* Quick Report Button (if single formula matched) */}
      {searchPerformed && matchedFormulas.length === 1 && (
        <TouchableOpacity
          style={styles.quickReportButton}
          onPress={() => setSightingModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.crossStoreSearch.reportLabel')}
          accessibilityHint={t('a11y.crossStoreSearch.reportHint')}
        >
          <Text style={styles.quickReportButtonText}>
            Found This Formula? Report It!
          </Text>
        </TouchableOpacity>
      )}

      {/* Formula Sighting Modal */}
      {matchedFormulas.length === 1 && (
        <FormulaSightingModal
          visible={sightingModalVisible}
          onClose={() => setSightingModalVisible(false)}
          formulaUpc={matchedFormulas[0].upc}
          formulaName={`${matchedFormulas[0].brand} ${matchedFormulas[0].productName}`}
        />
      )}
    </KeyboardAvoidingView>
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
  },
  backButton: {
    marginBottom: 8,
  },
  backButtonText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  locationError: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF3E0',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
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
  searchSection: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#E3F2FD',
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#757575',
  },
  modeButtonTextActive: {
    color: '#1976D2',
  },
  searchInputContainer: {
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#333',
  },
  chipScroll: {
    marginBottom: 16,
  },
  chipContainer: {
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    gap: 6,
  },
  chipActive: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#1976D2',
  },
  chipIcon: {
    fontSize: 16,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#616161',
  },
  chipTextActive: {
    color: '#1976D2',
    fontWeight: '600',
  },
  chipCount: {
    fontSize: 12,
    color: '#9E9E9E',
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  radiusSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  radiusButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#F5F5F5',
  },
  radiusButtonActive: {
    backgroundColor: '#1976D2',
  },
  radiusButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#757575',
  },
  radiusButtonTextActive: {
    color: '#fff',
  },
  filterToggle: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterToggleActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  filterToggleText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#757575',
  },
  filterToggleTextActive: {
    color: '#2E7D32',
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
  formulaInfoCard: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  formulaInfoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  formulaInfoName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
  },
  viewToggle: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 2,
  },
  viewToggleButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  viewToggleButtonActive: {
    backgroundColor: '#1976D2',
  },
  viewToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#757575',
  },
  viewToggleTextActive: {
    color: '#fff',
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 16,
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
  initialState: {
    alignItems: 'center',
    padding: 40,
  },
  initialIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  initialTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  initialText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  matchedInfo: {
    backgroundColor: '#E3F2FD',
    padding: 10,
    alignItems: 'center',
  },
  matchedInfoText: {
    fontSize: 13,
    color: '#1565C0',
  },
  quickReportButton: {
    backgroundColor: '#4CAF50',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  quickReportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
