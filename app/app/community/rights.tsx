import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useI18n } from '@/lib/i18n/I18nContext';
import { colors, fonts, card } from '@/lib/theme';
import { getRightsCards, searchRights, getFederalResources } from '@/lib/services/advocacyService';

export default function RightsScreen() {
  const { t, locale } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const isEs = locale === 'es';

  const rights = searchQuery ? searchRights(searchQuery) : getRightsCards();
  const federalResources = getFederalResources();

  const handlePhonePress = useCallback((phone: string) => {
    const tel = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${tel}`).catch(() => {
      // If tel: link fails (e.g. simulator), offer to copy instead
      Alert.alert(
        t('rights.callUnavailable'),
        t('rights.copyPhonePrompt'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('rights.copyNumber'),
            onPress: () => Clipboard.setStringAsync(phone),
          },
        ]
      );
    });
  }, [t]);

  const handleCopyPhone = useCallback(async (phone: string) => {
    await Clipboard.setStringAsync(phone);
    Alert.alert(t('rights.copied'), phone);
  }, [t]);

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('rights.searchPlaceholder')}
          placeholderTextColor={colors.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={t('a11y.rights.searchLabel')}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.clearButtonText}>{'\u2715'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoIcon} accessible={false} importantForAccessibility="no">{'\u2696\uFE0F'}</Text>
          <Text style={styles.infoText}>{t('rights.infoMessage')}</Text>
        </View>

        {/* Rights Cards */}
        {rights.map(right => (
          <View key={right.id} style={styles.rightCard}>
            <View style={styles.rightHeader}>
              <Text style={styles.rightIcon} accessible={false} importantForAccessibility="no">{right.icon}</Text>
              <Text style={styles.rightTitle}>{isEs ? right.titleEs : right.title}</Text>
            </View>
            <Text style={styles.rightContent}>{isEs ? right.contentEs : right.content}</Text>
          </View>
        ))}

        {rights.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('rights.noResults')}</Text>
          </View>
        )}

        {/* Federal Resources */}
        <View style={styles.resourcesSection}>
          <Text style={styles.sectionTitle} accessibilityRole="header">{t('rights.federalResources')}</Text>
          {federalResources.map(resource => (
            <View key={resource.phone} style={styles.resourceCard}>
              <Text style={styles.resourceName}>{isEs ? resource.nameEs : resource.name}</Text>
              <View style={styles.phoneRow}>
                <TouchableOpacity
                  onPress={() => handlePhonePress(resource.phone)}
                  accessibilityRole="link"
                  accessibilityLabel={`${t('rights.call')} ${resource.phone}`}
                  style={styles.phoneButton}
                >
                  <Text style={styles.phoneIcon} accessible={false}>📞</Text>
                  <Text style={styles.resourcePhoneLink}>{resource.phone}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleCopyPhone(resource.phone)}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('rights.copyNumber')} ${resource.phone}`}
                  style={styles.copyButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.copyButtonText}>{t('rights.copy')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.screenBg },
  searchContainer: { backgroundColor: colors.cardBg, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' },
  searchInput: { flex: 1, backgroundColor: colors.screenBg, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: colors.navy },
  clearButton: { position: 'absolute', right: 24, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  clearButtonText: { fontSize: 16, color: colors.muted },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  infoBanner: { flexDirection: 'row', backgroundColor: colors.cardBg, padding: 16, borderRadius: 12, marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  infoIcon: { fontSize: 24, marginRight: 12 },
  infoText: { flex: 1, fontSize: 14, color: colors.navy, lineHeight: 20 },
  rightCard: { ...card, marginBottom: 12 },
  rightHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  rightIcon: { fontSize: 24, marginRight: 10 },
  rightTitle: { fontSize: 16, fontWeight: '600', color: colors.navy, flex: 1 },
  rightContent: { fontSize: 14, color: colors.muted, lineHeight: 22 },
  emptyContainer: { padding: 20, alignItems: 'center' },
  emptyText: { fontSize: 16, color: colors.muted, fontStyle: 'italic' },
  resourcesSection: { marginTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.navy, marginBottom: 12 },
  resourceCard: { backgroundColor: colors.cardBg, borderRadius: 12, padding: 16, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: colors.navy },
  resourceName: { fontSize: 15, fontWeight: '600', color: colors.navy, marginBottom: 8 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  phoneButton: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  phoneIcon: { fontSize: 16, marginRight: 6 },
  resourcePhoneLink: { fontSize: 15, color: colors.header, fontWeight: '600', textDecorationLine: 'underline' },
  copyButton: { backgroundColor: colors.screenBg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, marginLeft: 8 },
  copyButtonText: { fontSize: 12, fontWeight: '600', color: colors.muted },
});
