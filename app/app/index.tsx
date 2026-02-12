import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/lib/i18n/I18nContext';

export default function Home() {
  const router = useRouter();
  const t = useTranslation();

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.container}>
      <Text style={styles.title} accessibilityRole="header">{t('app.title')}</Text>
      <Text style={styles.subtitle}>{t('app.subtitle')}</Text>

      <View style={styles.buttonContainer}>
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

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/scanner')}
          accessibilityRole="button"
          accessibilityHint={t('a11y.home.scanHint')}
        >
          <Text style={styles.buttonText}>{t('home.scanProduct')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/benefits')}
          accessibilityRole="button"
          accessibilityHint={t('a11y.home.benefitsHint')}
        >
          <Text style={styles.buttonText}>{t('home.viewBenefits')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cartButton}
          onPress={() => router.push('/cart')}
          accessibilityRole="button"
          accessibilityHint={t('a11y.home.cartHint')}
        >
          <Text style={styles.buttonText}>{t('home.shoppingCart')}</Text>
        </TouchableOpacity>

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
          <Text style={styles.settingsButtonText}>📍 Location Settings</Text>
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 40,
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
  secondaryButton: {
    backgroundColor: '#1976D2',
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
