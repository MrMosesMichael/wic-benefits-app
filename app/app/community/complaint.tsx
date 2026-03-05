import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useI18n } from '@/lib/i18n/I18nContext';
import { colors, fonts, card } from '@/lib/theme';
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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
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
            placeholderTextColor={colors.muted}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.screenBg },
  content: { padding: 16 },
  privacyBanner: { flexDirection: 'row', backgroundColor: colors.cardBg, padding: 14, borderRadius: 12, marginBottom: 20, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  privacyIcon: { fontSize: 20, marginRight: 10 },
  privacyText: { flex: 1, fontSize: 13, color: colors.dustyBlue, lineHeight: 18 },
  stepTitle: { fontSize: 16, fontWeight: '700', color: colors.navy, marginBottom: 12 },
  typeCard: { backgroundColor: colors.cardBg, borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 2, borderColor: colors.border },
  typeCardSelected: { borderColor: colors.danger, backgroundColor: colors.screenBg },
  typeText: { fontSize: 15, color: colors.navy, fontWeight: '500' },
  typeTextSelected: { color: colors.danger, fontWeight: '600' },
  detailsInput: { backgroundColor: colors.white, borderRadius: 10, padding: 14, fontSize: 15, color: colors.navy, minHeight: 100, borderWidth: 1, borderColor: colors.border },
  templateCard: { ...card },
  templateText: { fontSize: 14, color: colors.navy, lineHeight: 22, marginBottom: 12 },
  copyButton: { backgroundColor: colors.danger, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  copyButtonText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  contactCard: { backgroundColor: colors.cardBg, borderRadius: 12, padding: 16, marginTop: 20, borderLeftWidth: 4, borderLeftColor: colors.danger },
  contactTitle: { fontSize: 14, fontWeight: '600', color: colors.muted, marginBottom: 8 },
  contactName: { fontSize: 16, fontWeight: 'bold', color: colors.navy, marginBottom: 4 },
  contactPhone: { fontSize: 16, color: colors.danger, fontWeight: '600', marginBottom: 4 },
  contactEmail: { fontSize: 14, color: colors.muted, marginBottom: 8 },
  contactNote: { fontSize: 13, color: colors.muted, fontStyle: 'italic', lineHeight: 18 },
});
