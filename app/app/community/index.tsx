import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useI18n } from '@/lib/i18n/I18nContext';
import { colors, fonts, card } from '@/lib/theme';

const NAV_CARDS = [
  { route: '/community/tips', icon: '\u{1F4A1}', titleKey: 'community.shoppingTips', descKey: 'community.shoppingTipsDesc', color: colors.dustyBlue },
  { route: '/community/recipes', icon: '\u{1F373}', titleKey: 'community.recipes', descKey: 'community.recipesDesc', color: colors.wheat },
  { route: '/community/rights', icon: '\u2696\uFE0F', titleKey: 'community.knowYourRights', descKey: 'community.knowYourRightsDesc', color: colors.navy },
  { route: '/community/wic-offices', icon: '\u{1F3E2}', titleKey: 'community.wicOffices', descKey: 'community.wicOfficesDesc', color: colors.header },
  { route: '/community/complaint', icon: '\u{1F4DD}', titleKey: 'community.fileComplaint', descKey: 'community.fileComplaintDesc', color: colors.danger },
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
    backgroundColor: colors.screenBg,
  },
  content: {
    padding: 16,
  },
  headerCard: {
    flexDirection: 'row',
    backgroundColor: colors.cardBg,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
    fontSize: 14,
    color: colors.navy,
    lineHeight: 20,
  },
  navCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
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
    color: colors.navy,
    marginBottom: 3,
  },
  navDesc: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
  navArrow: {
    fontSize: 18,
    color: colors.muted,
    marginLeft: 8,
  },
});
