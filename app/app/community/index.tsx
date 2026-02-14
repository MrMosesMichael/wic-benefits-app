import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useI18n } from '@/lib/i18n/I18nContext';

const NAV_CARDS = [
  { route: '/community/tips', icon: '\u{1F4A1}', titleKey: 'community.shoppingTips', descKey: 'community.shoppingTipsDesc', color: '#2196F3' },
  { route: '/community/recipes', icon: '\u{1F373}', titleKey: 'community.recipes', descKey: 'community.recipesDesc', color: '#FF9800' },
  { route: '/community/rights', icon: '\u2696\uFE0F', titleKey: 'community.knowYourRights', descKey: 'community.knowYourRightsDesc', color: '#9C27B0' },
  { route: '/community/wic-offices', icon: '\u{1F3E2}', titleKey: 'community.wicOffices', descKey: 'community.wicOfficesDesc', color: '#00897B' },
  { route: '/community/complaint', icon: '\u{1F4DD}', titleKey: 'community.fileComplaint', descKey: 'community.fileComplaintDesc', color: '#F44336' },
];

export default function CommunityHubScreen() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Empowering Header */}
      <View style={styles.headerCard}>
        <Text style={styles.headerIcon} accessible={false} importantForAccessibility="no">🤝</Text>
        <Text style={styles.headerText}>{t('community.headerMessage')}</Text>
      </View>

      {/* Navigation Cards */}
      {NAV_CARDS.map(card => (
        <TouchableOpacity
          key={card.route}
          style={[styles.navCard, { borderLeftColor: card.color }]}
          onPress={() => router.push(card.route as any)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t(card.titleKey)}
          accessibilityHint={t(card.descKey)}
        >
          <Text style={styles.navIcon} accessible={false} importantForAccessibility="no">{card.icon}</Text>
          <View style={styles.navContent}>
            <Text style={styles.navTitle}>{t(card.titleKey)}</Text>
            <Text style={styles.navDesc}>{t(card.descKey)}</Text>
          </View>
          <Text style={styles.navArrow} accessible={false} importantForAccessibility="no">{'\u2192'}</Text>
        </TouchableOpacity>
      ))}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  headerCard: {
    flexDirection: 'row',
    backgroundColor: '#F3E5F5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
    fontSize: 14,
    color: '#6A1B9A',
    lineHeight: 20,
  },
  navCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  navIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  navContent: {
    flex: 1,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  navDesc: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  navArrow: {
    fontSize: 18,
    color: '#999',
    marginLeft: 8,
  },
});
