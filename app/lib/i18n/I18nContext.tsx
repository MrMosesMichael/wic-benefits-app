import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { i18n, loadSavedLanguage, setLanguage as setI18nLanguage, getCurrentLanguage, t, LANGUAGES } from './index';

interface I18nContextValue {
  /** Current language code */
  locale: string;
  /** Change the app language */
  setLanguage: (code: string) => Promise<void>;
  /** Translation function */
  t: (key: string, options?: Record<string, unknown>) => string;
  /** Available languages */
  languages: typeof LANGUAGES;
  /** Whether i18n is still initializing */
  isLoading: boolean;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

interface I18nProviderProps {
  children: ReactNode;
}

/**
 * Provider component that wraps the app and provides i18n context
 */
export function I18nProvider({ children }: I18nProviderProps) {
  const [locale, setLocale] = useState(getCurrentLanguage());
  const [isLoading, setIsLoading] = useState(true);

  // Load saved language preference on mount
  useEffect(() => {
    loadSavedLanguage().then((savedLocale) => {
      setLocale(savedLocale);
      setIsLoading(false);
    });
  }, []);

  // Change language handler
  const setLanguage = useCallback(async (code: string) => {
    await setI18nLanguage(code);
    setLocale(code);
  }, []);

  // Translation function that uses current locale
  const translate = useCallback((key: string, options?: Record<string, unknown>) => {
    return t(key, options);
  }, [locale]); // Re-create when locale changes

  const value: I18nContextValue = {
    locale,
    setLanguage,
    t: translate,
    languages: LANGUAGES,
    isLoading,
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

/**
 * Hook to access i18n functions
 * 
 * @example
 * const { t, locale, setLanguage } = useI18n();
 * console.log(t('nav.home')); // "WIC Benefits" or "Beneficios WIC"
 */
export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  
  return context;
}

/**
 * Convenience hook that just returns the translation function
 * 
 * @example
 * const t = useTranslation();
 * return <Text>{t('common.cancel')}</Text>;
 */
export function useTranslation() {
  const { t } = useI18n();
  return t;
}
