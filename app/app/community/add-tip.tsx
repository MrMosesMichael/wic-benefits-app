import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useI18n } from '@/lib/i18n/I18nContext';
import { colors } from '@/lib/theme';
import { TIP_CATEGORIES, TipCategory, submitTip } from '@/lib/services/tipsService';

export default function AddTipScreen() {
  const { t } = useI18n();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<TipCategory | ''>('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = title.trim().length > 0 && content.trim().length > 0 && category !== '';

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);

    const result = await submitTip(title.trim(), content.trim(), category);

    setSubmitting(false);

    if (result.success) {
      Alert.alert(
        t('communityTips.addSuccess'),
        t('communityTips.addSuccessMessage'),
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } else {
      Alert.alert(
        t('communityTips.errorTitle'),
        result.error || t('communityTips.addErrorMessage')
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Title */}
        <Text style={styles.label}>{t('communityTips.titleLabel')}</Text>
        <TextInput
          style={styles.input}
          placeholder={t('communityTips.titlePlaceholder')}
          placeholderTextColor={colors.muted}
          value={title}
          onChangeText={setTitle}
          maxLength={100}
          accessibilityLabel={t('communityTips.titleLabel')}
        />
        <Text style={styles.charCount}>{title.length}/100</Text>

        {/* Content */}
        <Text style={styles.label}>{t('communityTips.contentLabel')}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder={t('communityTips.contentPlaceholder')}
          placeholderTextColor={colors.muted}
          value={content}
          onChangeText={setContent}
          maxLength={500}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          accessibilityLabel={t('communityTips.contentLabel')}
        />
        <Text style={styles.charCount}>{content.length}/500</Text>

        {/* Category */}
        <Text style={styles.label}>{t('communityTips.categoryLabel')}</Text>
        <View style={styles.categoryGrid}>
          {TIP_CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                category === cat.id && styles.categoryChipSelected,
                category === cat.id && { backgroundColor: cat.color },
              ]}
              onPress={() => setCategory(cat.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: category === cat.id }}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  category === cat.id && styles.categoryChipTextSelected,
                ]}
              >
                {cat.icon} {t(cat.labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, (!canSubmit || submitting) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
          accessibilityRole="button"
          accessibilityLabel={t('communityTips.submit')}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? t('communityTips.submitting') : t('communityTips.submit')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.screenBg },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  label: { fontSize: 15, fontWeight: '600', color: colors.navy, marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: colors.cardBg,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.navy,
  },
  textArea: { minHeight: 120 },
  charCount: { fontSize: 12, color: colors.muted, textAlign: 'right', marginTop: 4 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipSelected: { borderColor: 'transparent' },
  categoryChipText: { fontSize: 13, fontWeight: '500', color: colors.muted },
  categoryChipTextSelected: { color: colors.white },
  submitButton: {
    backgroundColor: colors.header,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 28,
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { fontSize: 17, fontWeight: '600', color: colors.white },
});
