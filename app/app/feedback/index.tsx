/**
 * Feedback Screen
 * Submit bug reports, feature requests, or questions
 * Posts to backend which creates GitHub Issues
 */
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { submitFeedback } from '@/lib/services/api';
import { useI18n } from '@/lib/i18n/I18nContext';

type FeedbackCategory = 'bug' | 'feature' | 'question';

const CATEGORY_IDS: { id: FeedbackCategory; icon: string }[] = [
  { id: 'bug', icon: '!' },
  { id: 'feature', icon: '+' },
  { id: 'question', icon: '?' },
];

export default function FeedbackScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [description, setDescription] = useState('');
  const [includeDeviceInfo, setIncludeDeviceInfo] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = category && description.trim().length >= 10;

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;

    setSubmitting(true);

    try {
      const deviceInfo = includeDeviceInfo
        ? {
            platform: Platform.OS,
            osVersion: Platform.Version?.toString() || 'unknown',
            appVersion: Constants.expoConfig?.version || '1.0.0',
          }
        : undefined;

      await submitFeedback({
        category: category!,
        description: description.trim(),
        deviceInfo,
        source: 'app',
      });

      setSubmitted(true);
    } catch (error: any) {
      Alert.alert(
        t('feedback.errorTitle'),
        t('feedback.errorMessage'),
        [{ text: 'OK' }]
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successTitle}>{t('feedback.successTitle')}</Text>
          <Text style={styles.successText}>
            {t('feedback.successText')}
          </Text>
          <TouchableOpacity
            style={styles.successButton}
            onPress={() => {
              setSubmitted(false);
              setCategory(null);
              setDescription('');
            }}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.feedback.submitAnotherLabel')}
          >
            <Text style={styles.successButtonText}>{t('feedback.submitAnother')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButtonAlt}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.feedback.backToHelpLabel')}
          >
            <Text style={styles.backButtonAltText}>{t('feedback.backToHelp')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Category Selection */}
        <Text style={styles.sectionLabel}>{t('feedback.categoryLabel')}</Text>
        <View style={styles.categoryContainer}>
          {CATEGORY_IDS.map((cat) => {
            const labelKey = cat.id === 'bug' ? 'bugReport' : cat.id === 'feature' ? 'featureRequest' : 'question';
            const descKey = cat.id === 'bug' ? 'bugDescription' : cat.id === 'feature' ? 'featureDescription' : 'questionDescription';
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryCard,
                  category === cat.id && styles.categoryCardSelected,
                ]}
                onPress={() => setCategory(cat.id)}
                accessibilityRole="radio"
                accessibilityLabel={cat.id === 'bug' ? 'Bug report' : cat.id === 'feature' ? 'Feature request' : 'Question'}
                accessibilityState={{ selected: category === cat.id }}
              >
                <View style={[
                  styles.categoryIcon,
                  category === cat.id && styles.categoryIconSelected,
                ]}>
                  <Text style={[
                    styles.categoryIconText,
                    category === cat.id && styles.categoryIconTextSelected,
                  ]}>
                    {cat.icon}
                  </Text>
                </View>
                <View style={styles.categoryContent}>
                  <Text style={[
                    styles.categoryLabel,
                    category === cat.id && styles.categoryLabelSelected,
                  ]}>
                    {t(`feedback.${labelKey}`)}
                  </Text>
                  <Text style={styles.categoryDescription}>{t(`feedback.${descKey}`)}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Description */}
        <Text style={styles.sectionLabel}>
          {category === 'bug' ? t('feedback.describeIssue') : category === 'feature' ? t('feedback.describeIdea') : t('feedback.describeQuestion')}
        </Text>
        <TextInput
          style={styles.textInput}
          multiline
          numberOfLines={6}
          placeholder={
            category === 'bug'
              ? t('feedback.placeholderBug')
              : category === 'feature'
                ? t('feedback.placeholderFeature')
                : t('feedback.placeholderQuestion')
          }
          placeholderTextColor="#999"
          value={description}
          onChangeText={setDescription}
          maxLength={4000}
          textAlignVertical="top"
          accessibilityLabel={t('a11y.feedback.descriptionLabel')}
        />
        <Text style={styles.charCount}>
          {description.length}/4000
        </Text>

        {/* Device Info Toggle */}
        <TouchableOpacity
          style={styles.deviceInfoToggle}
          onPress={() => setIncludeDeviceInfo(!includeDeviceInfo)}
          accessibilityRole="checkbox"
          accessibilityLabel={t('a11y.feedback.includeDeviceLabel')}
          accessibilityState={{ checked: includeDeviceInfo }}
        >
          <View style={[styles.checkbox, includeDeviceInfo && styles.checkboxChecked]}>
            {includeDeviceInfo && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <View style={styles.deviceInfoContent}>
            <Text style={styles.deviceInfoLabel}>{t('feedback.includeDeviceInfo')}</Text>
            <Text style={styles.deviceInfoDetail}>
              {Platform.OS} {Platform.Version} / App v{Constants.expoConfig?.version || '1.0.0'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Privacy Note */}
        <Text style={styles.privacyNote}>
          {t('feedback.privacyNote')}
        </Text>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.feedback.submitLabel')}
          accessibilityState={{ disabled: !canSubmit || submitting }}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>{t('feedback.submitFeedback')}</Text>
          )}
        </TouchableOpacity>

        {!canSubmit && description.length > 0 && description.length < 10 && (
          <Text style={styles.validationHint}>
            {t('feedback.minChars')}
          </Text>
        )}
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    marginTop: 4,
  },
  categoryContainer: {
    gap: 10,
    marginBottom: 20,
  },
  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  categoryCardSelected: {
    borderColor: '#2E7D32',
    backgroundColor: '#f0f9f0',
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryIconSelected: {
    backgroundColor: '#2E7D32',
  },
  categoryIconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
  },
  categoryIconTextSelected: {
    color: '#fff',
  },
  categoryContent: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  categoryLabelSelected: {
    color: '#2E7D32',
  },
  categoryDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#333',
    minHeight: 140,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 16,
  },
  deviceInfoToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  deviceInfoContent: {
    flex: 1,
  },
  deviceInfoLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  deviceInfoDetail: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  privacyNote: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  submitButton: {
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  validationHint: {
    fontSize: 12,
    color: '#F44336',
    textAlign: 'center',
    marginTop: 8,
  },
  footer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  backButton: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  successIcon: {
    fontSize: 48,
    color: '#2E7D32',
    fontWeight: 'bold',
    marginBottom: 16,
    width: 80,
    height: 80,
    lineHeight: 80,
    textAlign: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 40,
    overflow: 'hidden',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 12,
  },
  successText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  successButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  successButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButtonAlt: {
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  backButtonAltText: {
    color: '#666',
    fontSize: 16,
  },
});
