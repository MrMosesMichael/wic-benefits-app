import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from '@/lib/i18n/I18nContext';
import { loadHousehold } from '@/lib/services/householdStorage';
import type { Household } from '@/lib/services/householdStorage';

/** Build a short benefit summary string, e.g. "Eggs, Cereal, Milk, and 9 other items" */
function buildBalanceSummary(
  household: Household,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  // Deduplicate by category so the same item type isn't listed twice
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
  // Use translation key for category name; fall back to stored categoryLabel if key missing
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

  // Reload WIC balance whenever screen comes into focus
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

      {/* UI1: WIC Balance Summary (replaces title + subtitle) */}
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
        {/* UI2+UI3: Scan Product first, with camera icon */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/scanner')}
          accessibilityRole="button"
          accessibilityHint={t('a11y.home.scanHint')}
        >
          <Text style={styles.buttonText}>📷 {t('home.scanProduct')}</Text>
        </TouchableOpacity>

        {/* UI2: Find Formula second */}
        <TouchableOpacity
          style={styles.formulaButton}
          onPress={() => router.push('/formula')}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.home.findFormulaLabel')}
          accessibilityHint={t('a11y.home.findFormulaHint')}
        >
          <Text style={styles.buttonText}>🍼 {t('home.findFormula')}</Text>
          <Text style={styles.buttonSubtext}>{t('home.findFormulaSubtext')}</Text>
        </TouchableOpacity>

        {/* UI2: Shopping Cart third */}
        <TouchableOpacity
          style={styles.cartButton}
          onPress={() => router.push('/cart')}
          accessibilityRole="button"
          accessibilityHint={t('a11y.home.cartHint')}
        >
          <Text style={styles.buttonText}>🛒 {t('home.shoppingCart')}</Text>
        </TouchableOpacity>

        {/* UI4: View Benefits removed — WIC Balance card at top replaces it */}

        {/* Remaining cards in original order */}
        <TouchableOpacity
          style={styles.foodBankButton}
          onPress={() => router.push('/foodbanks')}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.home.foodBanksLabel')}
          accessibilityHint={t('a11y.home.foodBanksHint')}
        >
          <Text style={styles.buttonText}>🏠 {t('home.findFoodBanks')}</Text>
          <Text style={styles.buttonSubtext}>{t('home.findFoodBanksSubtext')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.catalogButton}
          onPress={() => router.push('/catalog')}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.home.catalogLabel')}
          accessibilityHint={t('a11y.home.catalogHint')}
        >
          <Text style={styles.buttonText}>📋 {t('home.productCatalog')}</Text>
          <Text style={styles.buttonSubtext}>{t('home.productCatalogSubtext')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.storeFinderButton}
          onPress={() => router.push('/stores')}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.home.storeFinderLabel')}
          accessibilityHint={t('a11y.home.storeFinderHint')}
        >
          <Text style={styles.buttonText}>🗺️ {t('home.storeFinder')}</Text>
          <Text style={styles.buttonSubtext}>{t('home.storeFinderSubtext')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.communityButton}
          onPress={() => router.push('/community')}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.home.communityLabel')}
          accessibilityHint={t('a11y.home.communityHint')}
        >
          <Text style={styles.buttonText}>🤝 {t('home.communityHub')}</Text>
          <Text style={styles.buttonSubtext}>{t('home.communityHubSubtext')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.helpButton}
          onPress={() => router.push('/help')}
          accessibilityRole="button"
          accessibilityHint={t('a11y.home.helpHint')}
        >
          <Text style={styles.helpButtonText}>❓ {t('home.helpFaq')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push('/settings/location')}
          accessibilityRole="button"
          accessibilityHint={t('a11y.home.locationHint')}
        >
          <Text style={styles.settingsButtonText}>{t('home.locationSettings')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>{t('app.version')}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    alignItems: 'center',
    padding: 20,
    paddingTop: 24,
  },
  // UI1: WIC Balance — text-based, stands apart from card buttons
  balanceCard: {
    width: '100%',
    paddingVertical: 4,
    paddingBottom: 20,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  balanceTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 4,
  },
  balanceSummary: {
    fontSize: 15,
    fontWeight: '500',
    color: '#999',
    lineHeight: 22,
  },
  balanceExpiry: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
  },
  balanceSetup: {
    fontSize: 16,
    color: '#2E7D32',
    fontWeight: '500',
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cartButton: {
    backgroundColor: '#FFA000',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  foodBankButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  catalogButton: {
    backgroundColor: '#00897B',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  storeFinderButton: {
    backgroundColor: '#546E7A',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  communityButton: {
    backgroundColor: '#7B1FA2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  formulaButton: {
    backgroundColor: '#E91E63',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#AD1457',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    marginTop: 4,
  },
  helpButton: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1976D2',
  },
  helpButtonText: {
    color: '#1976D2',
    fontSize: 16,
    fontWeight: '600',
  },
  settingsButton: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#666',
  },
  settingsButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    marginTop: 40,
    fontSize: 12,
    color: '#999',
  },
});
