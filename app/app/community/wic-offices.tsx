import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useI18n } from '@/lib/i18n/I18nContext';
import { useLocation } from '@/lib/hooks/useLocation';
import { getAllWicOffices, WicOffice } from '@/lib/services/advocacyService';

const STATES = ['MI', 'NC', 'NY', 'OR'];

export default function WicOfficesScreen() {
  const { t } = useI18n();
  const { location } = useLocation();
  const detectedState = location?.state || 'MI';

  const [selectedState, setSelectedState] = useState(
    STATES.includes(detectedState) ? detectedState : 'MI'
  );

  const offices = getAllWicOffices();
  const currentOffice = offices.find(o => o.state === selectedState);

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/[^\d]/g, '')}`);
  };

  const handleWebsite = (website: string) => {
    Linking.openURL(website);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* State Selector */}
      <Text style={styles.sectionTitle} accessibilityRole="header">{t('wicOffices.selectState')}</Text>
      <View style={styles.stateRow}>
        {STATES.map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.stateBtn, selectedState === s && styles.stateBtnActive]}
            onPress={() => setSelectedState(s)}
            accessibilityRole="radio"
            accessibilityState={{ selected: selectedState === s }}
          >
            <Text style={[styles.stateBtnText, selectedState === s && styles.stateBtnTextActive]}>
              {s}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Office Card */}
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
              <Text style={styles.actionButtonPrimaryText}>🌐 {t('wicOffices.visitWebsite')}</Text>
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
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12 },
  stateRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  stateBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 2, borderColor: '#E0E0E0', alignItems: 'center' },
  stateBtnActive: { borderColor: '#00897B', backgroundColor: '#E0F2F1' },
  stateBtnText: { fontSize: 16, fontWeight: '700', color: '#666' },
  stateBtnTextActive: { color: '#00897B' },
  officeCard: { backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  officeName: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 16 },
  infoRow: { marginBottom: 12 },
  infoLabel: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 2, textTransform: 'uppercase' },
  infoValue: { fontSize: 15, color: '#333' },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  actionButton: { flex: 1, backgroundColor: '#F5F5F5', padding: 14, borderRadius: 8, alignItems: 'center' },
  actionButtonText: { fontSize: 14, fontWeight: '600', color: '#333' },
  actionButtonPrimary: { flex: 1, backgroundColor: '#00897B', padding: 14, borderRadius: 8, alignItems: 'center' },
  actionButtonPrimaryText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  infoCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  infoCardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  infoCardText: { fontSize: 14, color: '#666', lineHeight: 20 },
});
