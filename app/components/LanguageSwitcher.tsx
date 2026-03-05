import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList, Pressable } from 'react-native';
import { useState } from 'react';
import { useI18n } from '@/lib/i18n/I18nContext';
import { colors } from '@/lib/theme';

interface LanguageSwitcherProps {
  /** Compact mode shows just a small button with current language code */
  compact?: boolean;
}

/**
 * Language switcher component
 * Shows current language and allows user to change it
 */
export function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const { locale, setLanguage, languages, t } = useI18n();
  const [modalVisible, setModalVisible] = useState(false);

  const currentLanguage = languages.find(lang => lang.code === locale);

  const handleSelectLanguage = async (code: string) => {
    await setLanguage(code);
    setModalVisible(false);
  };

  if (compact) {
    return (
      <>
        <TouchableOpacity
          style={styles.compactButton}
          onPress={() => setModalVisible(true)}
          accessibilityLabel={t('settings.selectLanguage')}
          accessibilityRole="button"
          accessibilityHint={t('a11y.languageSwitcher.hint')}
          hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
        >
          <Text style={styles.compactButtonText}>{locale.toUpperCase()}</Text>
        </TouchableOpacity>

        <LanguageModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          currentLocale={locale}
          languages={languages}
          onSelect={handleSelectLanguage}
          t={t}
        />
      </>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={styles.fullButton}
        onPress={() => setModalVisible(true)}
        accessibilityLabel={t('settings.selectLanguage')}
        accessibilityRole="button"
        accessibilityHint={t('a11y.languageSwitcher.hint')}
      >
        <View style={styles.buttonContent}>
          <Text style={styles.buttonLabel}>{t('settings.language')}</Text>
          <View style={styles.currentLanguage}>
            <Text style={styles.languageName}>{currentLanguage?.nativeName}</Text>
            <Text style={styles.chevron} accessible={false} importantForAccessibility="no">›</Text>
          </View>
        </View>
      </TouchableOpacity>

      <LanguageModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        currentLocale={locale}
        languages={languages}
        onSelect={handleSelectLanguage}
        t={t}
      />
    </>
  );
}

interface LanguageModalProps {
  visible: boolean;
  onClose: () => void;
  currentLocale: string;
  languages: Array<{ code: string; name: string; nativeName: string }>;
  onSelect: (code: string) => void;
  t: (key: string) => string;
}

function LanguageModal({ visible, onClose, currentLocale, languages, onSelect, t }: LanguageModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalContent} accessibilityViewIsModal={true}>
          <Text style={styles.modalTitle}>{t('settings.selectLanguage')}</Text>
          
          <FlatList
            data={languages}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.languageOption,
                  item.code === currentLocale && styles.languageOptionSelected,
                ]}
                onPress={() => onSelect(item.code)}
                accessibilityRole="radio"
                accessibilityState={{ checked: item.code === currentLocale }}
                accessibilityLabel={item.nativeName + ', ' + item.name}
              >
                <View style={styles.languageOptionContent}>
                  <Text style={[
                    styles.languageOptionNative,
                    item.code === currentLocale && styles.languageOptionTextSelected,
                  ]}>
                    {item.nativeName}
                  </Text>
                  <Text style={[
                    styles.languageOptionName,
                    item.code === currentLocale && styles.languageOptionSubtextSelected,
                  ]}>
                    {item.name}
                  </Text>
                </View>
                {item.code === currentLocale && (
                  <Text style={styles.checkmark} accessible={false}>✓</Text>
                )}
              </TouchableOpacity>
            )}
          />

          <TouchableOpacity style={styles.closeButton} onPress={onClose} accessibilityRole="button" accessibilityLabel={t('a11y.languageSwitcher.closeLabel')}>
            <Text style={styles.closeButtonText}>{t('common.close')}</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Compact button styles
  compactButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  compactButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },

  // Full button styles
  fullButton: {
    backgroundColor: colors.cardBg,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buttonLabel: {
    fontSize: 16,
    color: colors.navy,
    fontWeight: '500',
  },
  currentLanguage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  languageName: {
    fontSize: 16,
    color: colors.header,
    fontWeight: '500',
  },
  chevron: {
    fontSize: 20,
    color: colors.muted,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.navy,
    marginBottom: 16,
    textAlign: 'center',
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: colors.screenBg,
  },
  languageOptionSelected: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: colors.header,
  },
  languageOptionContent: {
    flex: 1,
  },
  languageOptionNative: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.navy,
  },
  languageOptionName: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  languageOptionTextSelected: {
    color: colors.header,
  },
  languageOptionSubtextSelected: {
    color: colors.success,
  },
  checkmark: {
    fontSize: 20,
    color: colors.header,
    fontWeight: 'bold',
  },
  closeButton: {
    marginTop: 8,
    padding: 14,
    borderRadius: 8,
    backgroundColor: colors.screenBg,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.muted,
  },
});

export default LanguageSwitcher;
