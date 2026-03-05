import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import Constants from 'expo-constants';
import { useTranslation } from '@/lib/i18n/I18nContext';
import { loadHousehold } from '@/lib/services/householdStorage';
import type { Household } from '@/lib/services/householdStorage';
import { colors, fonts, card } from '@/lib/theme';

const appVersion = Constants.expoConfig?.version ?? '?';

/** Build a short benefit summary string, e.g. "Eggs, Cereal, Milk, and 9 other items" */
function buildBalanceSummary(
  household: Household,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  const seen = new Set<string>();
  const unique = household.participants
    .flatMap(p => p.benefits)
    .filter(b => {
      if (parseFloat(b.available) <= 0) return false;
      if (seen.has(b.category)) return false;
      seen.add(b.category);
      return true;
    });
  if (unique.length === 0) return '';
  const MAX_NAMED = 3;
  const named = unique.slice(0, MAX_NAMED).map(b => {
    const key = `home.balance.categories.${b.category}`;
    const translated = t(key);
    return translated.startsWith('[missing') ? b.categoryLabel : translated;
  });
  const rest = unique.length - named.length;
  if (rest === 0) {
    if (named.length === 1) return named[0];
    return named.slice(0, -1).join(', ') + ' and ' + named[named.length - 1];
  }
  return named.join(', ') + ', ' + t('home.balance.andOthers', { count: rest });
}

/** Get earliest expiry date string */
function getEarliestExpiry(household: Household): string | null {
  const dates = household.participants
    .flatMap(p => p.benefits)
    .filter(b => b.periodEnd)
    .map(b => b.periodEnd!);
  if (dates.length === 0) return null;
  dates.sort();
  return new Date(dates[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Home() {
  const router = useRouter();
  const t = useTranslation();
  const [household, setHousehold] = useState<Household | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadHousehold().then(h => setHousehold(h));
    }, [])
  );

  const hasHousehold = household && household.participants.some(p => p.benefits.length > 0);
  const balanceSummary = household ? buildBalanceSummary(household, t) : '';
  const expiryDate = household ? getEarliestExpiry(household) : null;

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.container}>

      {/* WIC Balance Summary */}
      <TouchableOpacity
        style={styles.balanceCard}
        onPress={() => router.push('/benefits')}
        accessibilityRole="button"
        accessibilityLabel={hasHousehold ? t('a11y.home.balanceLabel', { items: balanceSummary }) : t('a11y.home.balanceSetupLabel')}
        accessibilityHint={t('a11y.home.balanceHint')}
      >
        <Text style={styles.balanceTitle}>{t('home.balance.title')}</Text>
        {hasHousehold ? (
          <>
            <Text style={styles.balanceSummary} numberOfLines={2}>
              {t('home.balance.youHave', { items: balanceSummary })}
            </Text>
            {expiryDate && (
              <Text style={styles.balanceExpiry}>{t('home.balance.useBy', { date: expiryDate })}</Text>
            )}
          </>
        ) : (
          <Text style={styles.balanceSetup}>
            {t('home.balance.setup')}
          </Text>
        )}
      </TouchableOpacity>

      <View style={styles.buttonContainer}>
        {/* Scan — forest green (the cornucopia horn) */}
        <TouchableOpacity
          style={[styles.cardButton, { borderLeftColor: '#3A7D5C', borderLeftWidth: 4 }]}
          onPress={() => router.push('/scanner')}
          accessibilityRole="button"
          accessibilityHint={t('a11y.home.scanHint')}
        >
          <Text style={styles.cardEmoji}>📷</Text>
          <View style={styles.cardTextWrap}>
            <Text style={styles.cardTitle}>{t('home.scanProduct')}</Text>
          </View>
        </TouchableOpacity>

        {/* Formula — coral (the apple) */}
        <TouchableOpacity
          style={[styles.cardButton, styles.formulaCard]}
          onPress={() => router.push('/formula')}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.home.findFormulaLabel')}
          accessibilityHint={t('a11y.home.findFormulaHint')}
        >
          <Text style={styles.cardEmoji}>🍼</Text>
          <View style={styles.cardTextWrap}>
            <Text style={styles.cardTitle}>{t('home.findFormula')}</Text>
            <Text style={styles.cardSubtext}>{t('home.findFormulaSubtext')}</Text>
          </View>
        </TouchableOpacity>

        {/* Cart — golden wheat (the banana) */}
        <TouchableOpacity
          style={[styles.cardButton, { borderLeftColor: colors.wheat, borderLeftWidth: 4 }]}
          onPress={() => router.push('/cart')}
          accessibilityRole="button"
          accessibilityHint={t('a11y.home.cartHint')}
        >
          <Text style={styles.cardEmoji}>🛒</Text>
          <View style={styles.cardTextWrap}>
            <Text style={styles.cardTitle}>{t('home.shoppingCart')}</Text>
          </View>
        </TouchableOpacity>

        {/* Food Banks — warm orange (the carrot) */}
        <TouchableOpacity
          style={[styles.cardButton, { borderLeftColor: '#D4874D', borderLeftWidth: 4 }]}
          onPress={() => router.push('/foodbanks')}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.home.foodBanksLabel')}
          accessibilityHint={t('a11y.home.foodBanksHint')}
        >
          <Text style={styles.cardEmoji}>🏠</Text>
          <View style={styles.cardTextWrap}>
            <Text style={styles.cardTitle}>{t('home.findFoodBanks')}</Text>
            <Text style={styles.cardSubtext}>{t('home.findFoodBanksSubtext')}</Text>
          </View>
        </TouchableOpacity>

        {/* Catalog — teal (horn stripe) */}
        <TouchableOpacity
          style={[styles.cardButton, { borderLeftColor: colors.dustyBlue, borderLeftWidth: 4 }]}
          onPress={() => router.push('/catalog')}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.home.catalogLabel')}
          accessibilityHint={t('a11y.home.catalogHint')}
        >
          <Text style={styles.cardEmoji}>📋</Text>
          <View style={styles.cardTextWrap}>
            <Text style={styles.cardTitle}>{t('home.productCatalog')}</Text>
            <Text style={styles.cardSubtext}>{t('home.productCatalogSubtext')}</Text>
          </View>
        </TouchableOpacity>

        {/* Store Finder — deep green (broccoli) */}
        <TouchableOpacity
          style={[styles.cardButton, { borderLeftColor: '#2D6B4F', borderLeftWidth: 4 }]}
          onPress={() => router.push('/stores')}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.home.storeFinderLabel')}
          accessibilityHint={t('a11y.home.storeFinderHint')}
        >
          <Text style={styles.cardEmoji}>🗺️</Text>
          <View style={styles.cardTextWrap}>
            <Text style={styles.cardTitle}>{t('home.storeFinder')}</Text>
            <Text style={styles.cardSubtext}>{t('home.storeFinderSubtext')}</Text>
          </View>
        </TouchableOpacity>

        {/* Community — warm amber (golden light) */}
        <TouchableOpacity
          style={[styles.cardButton, { borderLeftColor: colors.amber, borderLeftWidth: 4 }]}
          onPress={() => router.push('/community')}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.home.communityLabel')}
          accessibilityHint={t('a11y.home.communityHint')}
        >
          <Text style={styles.cardEmoji}>🤝</Text>
          <View style={styles.cardTextWrap}>
            <Text style={styles.cardTitle}>{t('home.communityHub')}</Text>
            <Text style={styles.cardSubtext}>{t('home.communityHubSubtext')}</Text>
          </View>
        </TouchableOpacity>

        {/* Help — dusty blue (milk carton) */}
        <TouchableOpacity
          style={[styles.cardButton, { borderLeftColor: colors.dustyBlue, borderLeftWidth: 4 }]}
          onPress={() => router.push('/help')}
          accessibilityRole="button"
          accessibilityHint={t('a11y.home.helpHint')}
        >
          <Text style={styles.cardEmoji}>❓</Text>
          <View style={styles.cardTextWrap}>
            <Text style={styles.cardTitle}>{t('home.helpFaq')}</Text>
          </View>
        </TouchableOpacity>

        {/* Location — muted sage */}
        <TouchableOpacity
          style={[styles.cardButton, { borderLeftColor: colors.muted, borderLeftWidth: 4 }]}
          onPress={() => router.push('/settings/location')}
          accessibilityRole="button"
          accessibilityHint={t('a11y.home.locationHint')}
        >
          <Text style={styles.cardEmoji}>📍</Text>
          <View style={styles.cardTextWrap}>
            <Text style={styles.cardTitle}>{t('home.locationSettings')}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>{t('app.version', { version: appVersion })}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: colors.screenBg,
  },
  container: {
    alignItems: 'center',
    padding: 20,
    paddingTop: 24,
  },
  // WIC Balance — text-based header area
  balanceCard: {
    width: '100%',
    paddingVertical: 4,
    paddingBottom: 20,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  balanceTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.header,
    marginBottom: 4,
  },
  balanceSummary: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.dustyBlue,
    lineHeight: 22,
  },
  balanceExpiry: {
    fontSize: 13,
    color: colors.amber,
    marginTop: 4,
  },
  balanceSetup: {
    fontSize: 16,
    color: colors.dustyBlue,
    fontWeight: '500',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  // Outlined / soft fill card buttons
  cardButton: {
    ...card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  cardEmoji: {
    fontSize: 24,
  },
  cardTextWrap: {
    flex: 1,
  },
  cardTitle: {
    ...fonts.button,
  },
  cardSubtext: {
    ...fonts.secondary,
    marginTop: 2,
  },
  // Formula — coral accent, slightly more prominent
  formulaCard: {
    borderLeftColor: '#E07B5F',
    borderLeftWidth: 4,
    borderColor: '#E07B5F',
    borderWidth: 1.5,
  },
  footer: {
    marginTop: 40,
    ...fonts.secondary,
  },
});
