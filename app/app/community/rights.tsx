import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useI18n } from '@/lib/i18n/I18nContext';
import { getRightsCards, searchRights, getFederalResources } from '@/lib/services/advocacyService';

export default function RightsScreen() {
  const { t, locale } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const isEs = locale === 'es';

  const rights = searchQuery ? searchRights(searchQuery) : getRightsCards();
  const federalResources = getFederalResources();

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('rights.searchPlaceholder')}
          placeholderTextColor="#999"
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
              <Text style={styles.resourcePhone}>{resource.phone}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  searchContainer: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' },
  searchInput: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: '#333' },
  clearButton: { position: 'absolute', right: 24, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  clearButtonText: { fontSize: 16, color: '#999' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  infoBanner: { flexDirection: 'row', backgroundColor: '#F3E5F5', padding: 16, borderRadius: 12, marginBottom: 16, alignItems: 'center' },
  infoIcon: { fontSize: 24, marginRight: 12 },
  infoText: { flex: 1, fontSize: 14, color: '#6A1B9A', lineHeight: 20 },
  rightCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  rightHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  rightIcon: { fontSize: 24, marginRight: 10 },
  rightTitle: { fontSize: 16, fontWeight: '600', color: '#333', flex: 1 },
  rightContent: { fontSize: 14, color: '#555', lineHeight: 22 },
  emptyContainer: { padding: 20, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#666', fontStyle: 'italic' },
  resourcesSection: { marginTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  resourceCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#9C27B0' },
  resourceName: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 4 },
  resourcePhone: { fontSize: 14, color: '#9C27B0', fontWeight: '600' },
});
