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
import { colors, fonts, card } from '@/lib/theme';
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
          <ActivityIndicator size="small" color={colors.header} />
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
  container: { flex: 1, backgroundColor: colors.screenBg },
  content: { padding: 16 },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.navy,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 12,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: colors.muted,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
  clinicsContainer: {
    marginBottom: 8,
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 12,
  },
  clinicCard: {
    ...card,
    marginBottom: 12,
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
    color: colors.navy,
    flex: 1,
    marginRight: 8,
  },
  clinicDistance: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.header,
  },
  clinicAddress: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 8,
  },
  languagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 4,
  },
  langBadge: {
    backgroundColor: colors.screenBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  langBadgeText: {
    fontSize: 11,
    color: colors.header,
    fontWeight: '500',
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  hoursSection: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
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
    color: colors.muted,
  },
  hoursTime: {
    fontSize: 13,
    color: colors.navy,
    fontWeight: '500',
  },
  hoursNotes: {
    fontSize: 12,
    color: colors.muted,
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
    color: colors.header,
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
    borderColor: colors.border,
    alignItems: 'center',
  },
  stateBtnActive: {
    borderColor: colors.header,
    backgroundColor: colors.cardBg,
  },
  stateBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.muted,
  },
  stateBtnTextActive: {
    color: colors.header,
  },
  officeCard: {
    ...card,
    padding: 20,
    marginBottom: 16,
  },
  officeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.navy,
    marginBottom: 16,
  },
  infoRow: { marginBottom: 12 },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  infoValue: { fontSize: 15, color: colors.navy },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.screenBg,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.navy,
  },
  actionButtonPrimary: {
    flex: 1,
    backgroundColor: colors.header,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  infoCard: {
    ...card,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.navy,
    marginBottom: 8,
  },
  infoCardText: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
});
