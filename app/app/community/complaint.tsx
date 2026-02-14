import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useI18n } from '@/lib/i18n/I18nContext';
import { useLocation } from '@/lib/hooks/useLocation';
import { getComplaintTypes, getWicOffice, ComplaintType } from '@/lib/services/advocacyService';

export default function ComplaintScreen() {
  const { t, locale } = useI18n();
  const { location } = useLocation();
  const isEs = locale === 'es';

  const complaintTypes = getComplaintTypes();
  const state = location?.state || 'MI';
  const office = getWicOffice(state);

  const [selectedType, setSelectedType] = useState<ComplaintType | null>(null);
  const [details, setDetails] = useState('');
  const [copied, setCopied] = useState(false);

  const getTemplate = () => {
    if (!selectedType) return '';
    const template = isEs ? selectedType.templateEs : selectedType.template;
    return details ? template.replace('[Describe what happened]', details)
      .replace('[Describa lo que pasó]', details)
      .replace('[Describe the discriminatory behavior or treatment you experienced]', details)
      .replace('[Describa el comportamiento discriminatorio]', details)
      .replace('[Describe the issue]', details)
      .replace('[Describa el problema]', details)
      .replace('[List items]', details)
      .replace('[Lista]', details)
      : template;
  };

  const handleCopy = async () => {
    const text = getTemplate();
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Privacy Notice */}
      <View style={styles.privacyBanner}>
        <Text style={styles.privacyIcon} accessible={false} importantForAccessibility="no">{'\u{1F512}'}</Text>
        <Text style={styles.privacyText}>{t('complaint.privacyNotice')}</Text>
      </View>

      {/* Step 1: Select Type */}
      <Text style={styles.stepTitle}>{t('complaint.step1')}</Text>
      {complaintTypes.map(ct => (
        <TouchableOpacity
          key={ct.id}
          style={[styles.typeCard, selectedType?.id === ct.id && styles.typeCardSelected]}
          onPress={() => setSelectedType(ct)}
          accessibilityRole="radio"
          accessibilityState={{ selected: selectedType?.id === ct.id }}
        >
          <Text style={[styles.typeText, selectedType?.id === ct.id && styles.typeTextSelected]}>
            {isEs ? ct.labelEs : ct.label}
          </Text>
        </TouchableOpacity>
      ))}

      {/* Step 2: Enter Details */}
      {selectedType && (
        <>
          <Text style={[styles.stepTitle, { marginTop: 20 }]}>{t('complaint.step2')}</Text>
          <TextInput
            style={styles.detailsInput}
            placeholder={t('complaint.detailsPlaceholder')}
            placeholderTextColor="#999"
            value={details}
            onChangeText={setDetails}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            accessibilityLabel={t('a11y.complaint.detailsLabel')}
          />

          {/* Step 3: Generated Template */}
          <Text style={[styles.stepTitle, { marginTop: 20 }]}>{t('complaint.step3')}</Text>
          <View style={styles.templateCard}>
            <Text style={styles.templateText}>{getTemplate()}</Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={handleCopy}
              accessibilityRole="button"
              accessibilityLabel={t('a11y.complaint.copyLabel')}
            >
              <Text style={styles.copyButtonText}>
                {copied ? t('complaint.copied') : t('complaint.copyText')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Contact Info */}
          {office && (
            <View style={styles.contactCard}>
              <Text style={styles.contactTitle}>{t('complaint.contactTitle')}</Text>
              <Text style={styles.contactName}>{office.name}</Text>
              <Text style={styles.contactPhone}>{office.phone}</Text>
              {office.email ? <Text style={styles.contactEmail}>{office.email}</Text> : null}
              <Text style={styles.contactNote}>{t('complaint.contactNote')}</Text>
            </View>
          )}
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16 },
  privacyBanner: { flexDirection: 'row', backgroundColor: '#E3F2FD', padding: 14, borderRadius: 12, marginBottom: 20, alignItems: 'center' },
  privacyIcon: { fontSize: 20, marginRight: 10 },
  privacyText: { flex: 1, fontSize: 13, color: '#1565C0', lineHeight: 18 },
  stepTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 12 },
  typeCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 2, borderColor: '#E0E0E0' },
  typeCardSelected: { borderColor: '#F44336', backgroundColor: '#FFEBEE' },
  typeText: { fontSize: 15, color: '#333', fontWeight: '500' },
  typeTextSelected: { color: '#C62828', fontWeight: '600' },
  detailsInput: { backgroundColor: '#fff', borderRadius: 10, padding: 14, fontSize: 15, color: '#333', minHeight: 100, borderWidth: 1, borderColor: '#E0E0E0' },
  templateCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E0E0E0' },
  templateText: { fontSize: 14, color: '#333', lineHeight: 22, marginBottom: 12 },
  copyButton: { backgroundColor: '#F44336', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  copyButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  contactCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 20, borderLeftWidth: 4, borderLeftColor: '#F44336' },
  contactTitle: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8 },
  contactName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  contactPhone: { fontSize: 16, color: '#F44336', fontWeight: '600', marginBottom: 4 },
  contactEmail: { fontSize: 14, color: '#666', marginBottom: 8 },
  contactNote: { fontSize: 13, color: '#666', fontStyle: 'italic', lineHeight: 18 },
});
