import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './translations/en.json';
import es from './translations/es.json';

// Storage key for language preference
const LANGUAGE_KEY = 'wic_app_language';

// Create i18n instance with translations
const i18n = new I18n({
  en,
  es,
});

// Set default locale from device, fallback to English
i18n.defaultLocale = 'en';
i18n.enableFallback = true;

// Initialize locale from device settings
const deviceLocale = Localization.getLocales()[0]?.languageCode || 'en';
i18n.locale = deviceLocale.startsWith('es') ? 'es' : 'en';

// Available languages
export const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
];

/**
 * Load saved language preference from storage
 * Call this on app startup
 */
export async function loadSavedLanguage(): Promise<string> {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'es')) {
      i18n.locale = savedLanguage;
      return savedLanguage;
    }
  } catch (error) {
    console.error('Failed to load saved language:', error);
  }
  return i18n.locale;
}

/**
 * Set and persist language preference
 */
export async function setLanguage(languageCode: string): Promise<void> {
  if (languageCode !== 'en' && languageCode !== 'es') {
    console.warn(`Unsupported language: ${languageCode}`);
    return;
  }
  
  i18n.locale = languageCode;
  
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, languageCode);
  } catch (error) {
    console.error('Failed to save language preference:', error);
  }
}

/**
 * Get current language code
 */
export function getCurrentLanguage(): string {
  return i18n.locale;
}

/**
 * Translation function
 * Usage: t('nav.home') or t('common.itemCount', { count: 5 })
 */
export function t(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, options);
}

export { i18n };
export default i18n;
