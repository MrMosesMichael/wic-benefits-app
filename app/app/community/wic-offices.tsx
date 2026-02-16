import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useI18n } from '@/lib/i18n/I18nContext';
import { useLocation } from '@/lib/hooks/useLocation';
import { getAllWicOffices, WicOffice } from '@/lib/services/advocacyService';
import { getNearbyWicClinics } from '@/lib/services/api';
import LocationPrompt from '@/components/LocationPrompt';

interface WicClinic {
  id: number;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    county: string | null;
  };
  location: {
    latitude: number;
    longitude: number;
  };
  phone: string | null;
  website: string | null;
  appointmentUrl: string | null;
  hours: Array<{ day: string; hours: string }>;
  hoursNotes: string | null;
  services: string[];
  languages: string[];
  distanceMiles: number;
}

const STATES = ['MI', 'NC', 'NY', 'OR'];

export default function WicOfficesScreen() {
  const { t } = useI18n();
  const {
    location,
    loading: locationLoading,
    error: locationError,
    refresh: refreshLocation,
    setZipCode,
  } = useLocation();
  const detectedState = location?.state || 'MI';

  const [selectedState, setSelectedState] = useState(
    STATES.includes(detectedState) ? detectedState : 'MI'
  );
  const [clinics, setClinics] = useState<WicClinic[]>([]);
  const [loadingClinics, setLoadingClinics] = useState(false);
  const [expandedClinic, setExpandedClinic] = useState<number | null>(null);

  const offices = getAllWicOffices();
  const currentOffice = offices.find((o) => o.state === selectedState);

  useEffect(() => {
    if (location) {
      loadClinics();
    }
  }, [location?.lat, location?.lng]);

  const loadClinics = async () => {
    if (!location) return;
    try {
      setLoadingClinics(true);
      const result = await getNearbyWicClinics(location.lat, location.lng, 25);
      setClinics(result || []);
    } catch (error) {
      console.error('Failed to load WIC clinics:', error);
      setClinics([]);
    } finally {
      setLoadingClinics(false);
    }
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/[^\d]/g, '')}`);
  };

  const handleWebsite = (website: string) => {
    let url = website;
    if (!url.startsWith('http')) url = `https://${url}`;
    Linking.openURL(url);
  };

  const handleDirections = (clinic: WicClinic) => {
    const address = `${clinic.address.street}, ${clinic.address.city}, ${clinic.address.state} ${clinic.address.zipCode}`;
    const url = Platform.select({
      ios: `maps://app?daddr=${encodeURIComponent(address)}`,
      android: `geo:${clinic.location.latitude},${clinic.location.longitude}?q=${encodeURIComponent(address)}`,
    });
    if (url) Linking.openURL(url);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Nearby Clinics Section */}
      <Text style={styles.sectionHeader} accessibilityRole="header">
        {t('wicOffices.nearbyClinics')}
      </Text>

      {!location && !locationLoading && (
        <LocationPrompt
          onGPS={refreshLocation}
          onZipCode={setZipCode}
          loading={locationLoading}
          error={locationError}
        />
      )}

      {loadingClinics && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#00897B" />
          <Text style={styles.loadingText}>{t('wicOffices.searchingClinics')}</Text>
        </View>
      )}

      {!loadingClinics && location && clinics.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('wicOffices.noClinicsFound')}</Text>
        </View>
      )}

      {!loadingClinics && clinics.length > 0 && (
        <View style={styles.clinicsContainer}>
          <Text style={styles.resultsCount}>
            {t('wicOffices.clinicsFound', { count: clinics.length })}
          </Text>
          {clinics.map((clinic) => {
            const isExpanded = expandedClinic === clinic.id;
            return (
              <TouchableOpacity
                key={clinic.id}
                style={styles.clinicCard}
                onPress={() => setExpandedClinic(isExpanded ? null : clinic.id)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${clinic.name}, ${clinic.distanceMiles} miles`}
              >
                <View style={styles.clinicHeader}>
                  <Text style={styles.clinicName}>{clinic.name}</Text>
                  <Text style={styles.clinicDistance}>
                    {clinic.distanceMiles} {t('units.mi')}
                  </Text>
                </View>

                <Text style={styles.clinicAddress}>
                  {clinic.address.street}, {clinic.address.city}, {clinic.address.state}
                </Text>

                {clinic.languages.length > 0 && (
                  <View style={styles.languagesRow}>
                    {clinic.languages.map((lang) => (
                      <View key={lang} style={styles.langBadge}>
                        <Text style={styles.langBadgeText}>{lang}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {isExpanded && (
                  <View style={styles.expandedContent}>
                    {clinic.hours.length > 0 && (
                      <View style={styles.hoursSection}>
                        <Text style={styles.detailLabel}>{t('wicOffices.hours')}</Text>
                        {clinic.hours.map((h) => (
                          <View key={h.day} style={styles.hoursRow}>
                            <Text style={styles.hoursDay}>{h.day}</Text>
                            <Text style={styles.hoursTime}>{h.hours}</Text>
                          </View>
                        ))}
                        {clinic.hoursNotes && (
                          <Text style={styles.hoursNotes}>{clinic.hoursNotes}</Text>
                        )}
                      </View>
                    )}

                    <View style={styles.clinicActions}>
                      {clinic.phone && (
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleCall(clinic.phone!)}
                          accessibilityRole="button"
                        >
                          <Text style={styles.actionButtonText}>
                            📞 {t('wicOffices.call')}
                          </Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.actionButtonPrimary}
                        onPress={() => handleDirections(clinic)}
                        accessibilityRole="button"
                      >
                        <Text style={styles.actionButtonPrimaryText}>
                          🗺️ {t('wicOffices.directions')}
                        </Text>
                      </TouchableOpacity>
                      {clinic.website && (
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleWebsite(clinic.website!)}
                          accessibilityRole="button"
                        >
                          <Text style={styles.actionButtonText}>
                            🌐 {t('wicOffices.visitWebsite')}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}

                <Text style={styles.expandIndicator}>
                  {isExpanded ? t('wicOffices.tapToCollapse') : t('wicOffices.tapToExpand')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* State HQ Section */}
      <Text style={[styles.sectionHeader, { marginTop: 24 }]} accessibilityRole="header">
        {t('wicOffices.stateHQ')}
      </Text>

      <View style={styles.stateRow}>
        {STATES.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.stateBtn, selectedState === s && styles.stateBtnActive]}
            onPress={() => setSelectedState(s)}
            accessibilityRole="radio"
            accessibilityState={{ selected: selectedState === s }}
          >
            <Text
              style={[
                styles.stateBtnText,
                selectedState === s && styles.stateBtnTextActive,
              ]}
            >
              {s}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {currentOffice && (
        <View style={styles.officeCard}>
          <Text style={styles.officeName}>{currentOffice.name}</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('wicOffices.phone')}</Text>
            <Text style={styles.infoValue}>{currentOffice.phone}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('wicOffices.hours')}</Text>
            <Text style={styles.infoValue}>{currentOffice.hours}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('wicOffices.address')}</Text>
            <Text style={styles.infoValue}>{currentOffice.address}</Text>
          </View>

          {currentOffice.email ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('wicOffices.email')}</Text>
              <Text style={styles.infoValue}>{currentOffice.email}</Text>
            </View>
          ) : null}

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleCall(currentOffice.phone)}
              accessibilityRole="button"
              accessibilityLabel={`${t('wicOffices.call')} ${currentOffice.name}`}
            >
              <Text style={styles.actionButtonText}>📞 {t('wicOffices.call')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButtonPrimary}
              onPress={() => handleWebsite(currentOffice.website)}
              accessibilityRole="button"
              accessibilityLabel={`${t('wicOffices.visitWebsite')} ${currentOffice.name}`}
            >
              <Text style={styles.actionButtonPrimaryText}>
                🌐 {t('wicOffices.visitWebsite')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoCardTitle}>{t('wicOffices.aboutTitle')}</Text>
        <Text style={styles.infoCardText}>{t('wicOffices.aboutText')}</Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16 },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: '#666',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  clinicsContainer: {
    marginBottom: 8,
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  clinicCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  clinicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  clinicName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  clinicDistance: {
    fontSize: 13,
    fontWeight: '600',
    color: '#00897B',
  },
  clinicAddress: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  languagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 4,
  },
  langBadge: {
    backgroundColor: '#E0F2F1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  langBadgeText: {
    fontSize: 11,
    color: '#00897B',
    fontWeight: '500',
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  hoursSection: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
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
    marginTop: 6,
  },
  clinicActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  expandIndicator: {
    fontSize: 12,
    color: '#00897B',
    textAlign: 'center',
    marginTop: 8,
  },
  stateRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  stateBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  stateBtnActive: {
    borderColor: '#00897B',
    backgroundColor: '#E0F2F1',
  },
  stateBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#666',
  },
  stateBtnTextActive: {
    color: '#00897B',
  },
  officeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  officeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  infoRow: { marginBottom: 12 },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  infoValue: { fontSize: 15, color: '#333' },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  actionButtonPrimary: {
    flex: 1,
    backgroundColor: '#00897B',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  infoCardText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
