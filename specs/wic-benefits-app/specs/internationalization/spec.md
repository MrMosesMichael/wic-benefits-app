# Internationalization Specification

## Purpose

Ensure the app is accessible to all WIC participants regardless of primary language. 40% of WIC participants are Latinx - language barriers equal exclusion from benefits. Spanish support is **inclusion**, not polish.

## Guiding Principles

1. **Inclusion from Day 1** - Spanish is a launch requirement, not a future feature
2. **Quality over Machine Translation** - Human-reviewed translations for accuracy
3. **Cultural Sensitivity** - Not just words, but appropriate cultural context
4. **Consistent Experience** - Same features and quality in all languages
5. **Easy Switching** - Users can switch languages anytime without friction

---

## Requirements

### Requirement: Language Selection

The system SHALL allow users to select their preferred language.

#### Scenario: Initial language detection
- GIVEN user opens app for first time
- WHEN app launches
- THEN device language setting is detected
- AND if device is set to Spanish, app displays in Spanish
- AND if device is set to unsupported language, default to English
- AND language can be changed in settings

#### Scenario: Change language in settings
- GIVEN user wants to change language
- WHEN user navigates to Settings > Language
- THEN available languages are shown:
  ```
  Language / Idioma

  ○ English
  ○ Español (Spanish)

  More languages coming soon.
  [Request a language]
  ```
- AND selection takes effect immediately
- AND no app restart required
- AND preference is saved to profile

#### Scenario: Language persistence
- GIVEN user selected a language
- WHEN user closes and reopens app
- THEN selected language is preserved
- AND if user logs out and back in, language preference syncs

#### Scenario: Onboarding language selection
- GIVEN new user is onboarding
- WHEN first screen appears
- THEN language selector is prominently shown:
  ```
  Welcome / Bienvenido

  Select your language / Seleccione su idioma

  [English] [Español]
  ```
- AND selection affects all subsequent onboarding screens
- AND can be changed later in settings

---

### Requirement: UI String Translation

The system SHALL translate all user interface text.

#### Scenario: Complete UI translation
- GIVEN user selected Spanish
- WHEN user navigates throughout app
- THEN ALL UI elements are in Spanish:
  - Navigation labels
  - Button text
  - Form labels and placeholders
  - Error messages
  - Success messages
  - Empty states
  - Loading states
  - Tooltips and hints
  - Settings labels
  - Notifications (in-app)

#### Scenario: Product names remain in English
- GIVEN product names come from external databases
- WHEN displaying product information
- THEN product names remain as-is (usually English)
- AND category names are translated
- AND eligibility status is translated
- AND size/quantity descriptions are translated

#### Scenario: Numeric and date formatting
- GIVEN different locales format dates/numbers differently
- WHEN displaying dates
- THEN locale-appropriate format is used:
  - English: January 15, 2024 / 1/15/2024
  - Spanish: 15 de enero de 2024 / 15/1/2024
- AND numbers use appropriate separators:
  - English: 1,234.56
  - Spanish: 1.234,56 (varies by region)

#### Scenario: Pluralization rules
- GIVEN different languages have different plural rules
- WHEN displaying counts
- THEN correct pluralization is used:
  - English: "1 item" / "2 items"
  - Spanish: "1 artículo" / "2 artículos"
- AND this applies to all countable nouns

---

### Requirement: FAQ Content Translation

The system SHALL translate all FAQ and help content.

#### Scenario: FAQ available in Spanish
- GIVEN user has Spanish selected
- WHEN user opens FAQ/Help
- THEN all FAQ content is in Spanish:
  - Question text
  - Answer text
  - Examples and scenarios
  - Tips and warnings
- AND tone is appropriate and helpful

#### Scenario: WIC-specific term translation
- GIVEN WIC has specific terminology
- WHEN translating FAQ content
- THEN terms are translated accurately:
  | English | Spanish |
  |---------|---------|
  | WIC benefits | beneficios de WIC |
  | eWIC card | tarjeta eWIC |
  | Approved Product List | Lista de Productos Aprobados |
  | formula | fórmula |
  | eligible | elegible |
  | benefit period | período de beneficios |
  | checkout | pago / caja |
- AND glossary is available for reference

#### Scenario: State-specific FAQ in Spanish
- GIVEN some FAQ content varies by state
- WHEN user views state-specific FAQ
- THEN state-specific content is also translated:
  - Contract formula brand info
  - State-specific rules
  - WIC office contact information

---

### Requirement: Error Message Translation

The system SHALL translate all error and system messages.

#### Scenario: Scan errors in Spanish
- GIVEN user selected Spanish
- WHEN scan fails or product not found
- THEN error displays in Spanish:
  ```
  Producto no encontrado

  No pudimos encontrar este producto en
  nuestra base de datos.

  [Ingresar manualmente] [Intentar de nuevo]
  ```

#### Scenario: Network errors in Spanish
- WHEN network connection fails
- THEN error displays in Spanish:
  ```
  Sin conexión

  No hay conexión a internet.
  Algunas funciones no están disponibles.

  Los datos guardados todavía funcionan.

  [Reintentar]
  ```

#### Scenario: Benefit warnings in Spanish
- WHEN benefit limit is reached
- THEN warning displays in Spanish:
  ```
  ⚠️ Límite de beneficio alcanzado

  Ya has usado todos tus beneficios
  de leche para este mes.

  Próximo período: 1 de febrero

  [Entendido]
  ```

---

### Requirement: Push Notification Translation

The system SHALL send push notifications in user's preferred language.

#### Scenario: Formula alert in Spanish
- GIVEN user has Spanish selected
- AND user has formula alerts enabled
- WHEN formula becomes available
- THEN notification is in Spanish:
  ```
  🍼 ¡Fórmula disponible!

  Similac Pro-Advance está en stock
  en Walmart (3.7 km)

  [Ver detalles]
  ```

#### Scenario: Benefit reminder in Spanish
- WHEN benefits are expiring
- THEN reminder is in Spanish:
  ```
  ⏰ Beneficios por vencer

  Tienes beneficios sin usar que
  vencen en 3 días.

  [Ver beneficios]
  ```

---

### Requirement: Accessibility in Multiple Languages

The system SHALL support accessibility features in all languages.

#### Scenario: Screen reader in Spanish
- GIVEN user uses VoiceOver/TalkBack
- AND user has Spanish selected
- WHEN navigating the app
- THEN screen reader announces in Spanish
- AND all accessibility labels are translated
- AND pronunciation is appropriate

#### Scenario: Voice input in Spanish
- GIVEN user wants to use voice features
- AND user has Spanish selected
- WHEN using voice search or input
- THEN Spanish voice recognition is active
- AND results match Spanish queries

---

### Requirement: RTL and Future Language Support

The system SHALL be architected for future language expansion.

#### Scenario: Language addition framework
- GIVEN new language may be added
- WHEN development team adds a language
- THEN process is straightforward:
  1. Add translation file
  2. Review by native speaker
  3. QA in all screens
  4. Deploy with app update
- AND existing architecture supports this

#### Scenario: RTL language preparation
- GIVEN Arabic, Hebrew may be future languages
- WHEN building UI
- THEN layout supports RTL flipping:
  - Flexbox direction reversible
  - Icons flip appropriately
  - Text alignment adapts
- AND this doesn't affect LTR languages

---

## Translation Requirements

### Translation Quality Standards

1. **Human Translation** - No machine translation for production
2. **Native Speaker Review** - All translations reviewed by native speakers
3. **WIC Context** - Translators understand WIC program context
4. **Regional Variation** - Use neutral Spanish (understood across regions)
5. **Consistent Terminology** - Glossary enforced across all content

### Priority Strings for Spanish

**Phase 1 (MVP):**
- All navigation labels
- All button text
- Scan result screens
- Benefits tracking screens
- Cart and checkout flows
- Critical error messages
- Core FAQ (formula, sizes, checkout)

**Phase 2:**
- All remaining FAQ content
- Tips and community content
- Settings and preferences
- Onboarding flows
- Accessibility labels

### Glossary (English → Spanish)

| English | Spanish | Notes |
|---------|---------|-------|
| WIC | WIC | Keep as-is (known acronym) |
| eWIC card | tarjeta eWIC | |
| benefits | beneficios | |
| eligible | elegible | |
| not eligible | no elegible | |
| scan | escanear | |
| barcode | código de barras | |
| checkout | pago | or "caja" for register |
| cart | carrito | |
| household | hogar | |
| participant | participante | |
| infant | bebé / infante | |
| formula | fórmula | |
| available | disponible | |
| in stock | en stock / disponible | |
| out of stock | agotado | |
| store | tienda | |
| settings | configuración | |
| help | ayuda | |
| search | buscar | |

---

## Data Requirements

### Translation File Structure

```typescript
// i18n/locales/en.json
{
  "common": {
    "loading": "Loading...",
    "error": "Something went wrong",
    "retry": "Try again",
    "cancel": "Cancel",
    "save": "Save",
    "done": "Done"
  },
  "navigation": {
    "home": "Home",
    "scan": "Scan",
    "benefits": "Benefits",
    "stores": "Stores",
    "settings": "Settings"
  },
  "scan": {
    "title": "Scan Product",
    "instruction": "Point camera at barcode",
    "manualEntry": "Enter manually",
    "eligible": "WIC Eligible",
    "notEligible": "Not Eligible",
    "addToCart": "Add to Cart"
  },
  // ... etc
}

// i18n/locales/es.json
{
  "common": {
    "loading": "Cargando...",
    "error": "Algo salió mal",
    "retry": "Intentar de nuevo",
    "cancel": "Cancelar",
    "save": "Guardar",
    "done": "Listo"
  },
  "navigation": {
    "home": "Inicio",
    "scan": "Escanear",
    "benefits": "Beneficios",
    "stores": "Tiendas",
    "settings": "Configuración"
  },
  "scan": {
    "title": "Escanear Producto",
    "instruction": "Apunta la cámara al código de barras",
    "manualEntry": "Ingresar manualmente",
    "eligible": "Elegible para WIC",
    "notEligible": "No Elegible",
    "addToCart": "Agregar al Carrito"
  },
  // ... etc
}
```

### Interpolation and Plurals

```typescript
// Using ICU Message Format
{
  "benefits": {
    "remaining": "{count, plural, =0 {No remaining} =1 {1 {unit} remaining} other {{count} {unit}s remaining}}",
    "expiresIn": "Expires in {days, plural, =1 {1 day} other {{days} days}}"
  }
}

// Spanish version
{
  "benefits": {
    "remaining": "{count, plural, =0 {Ninguno restante} =1 {1 {unit} restante} other {{count} {unit}s restantes}}",
    "expiresIn": "Vence en {days, plural, =1 {1 día} other {{days} días}}"
  }
}
```

### User Language Preference

```typescript
interface UserPreferences {
  language: 'en' | 'es';
  // Future: 'zh' | 'vi' | 'ko' | 'ar' | etc.
}
```

---

## Implementation Requirements

### i18n Framework

Use React Native i18n library (react-i18next recommended):

```typescript
// App.tsx setup
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from './locales/en.json';
import es from './locales/es.json';

i18n
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, es: { translation: es } },
    lng: Localization.locale.split('-')[0],
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
  });
```

### Component Usage

```typescript
// Component example
import { useTranslation } from 'react-i18next';

function ScanResult({ product, eligible }) {
  const { t } = useTranslation();

  return (
    <View>
      <Text>{product.name}</Text>
      <Text>
        {eligible ? t('scan.eligible') : t('scan.notEligible')}
      </Text>
      <Button title={t('scan.addToCart')} />
    </View>
  );
}
```

### Translation Keys Convention

- Use dot notation: `section.subsection.key`
- Keep keys short but descriptive
- Use lowercase with camelCase
- Group by feature/screen

---

## Testing Requirements

### Translation Coverage

- Automated test to verify all keys have translations
- CI check that fails on missing translations
- Screenshot tests in both languages

### Native Speaker Review

- All strings reviewed by native Spanish speaker
- Review includes:
  - Accuracy of translation
  - Cultural appropriateness
  - Consistent terminology
  - Natural phrasing (not translated word-for-word)

### Visual Testing

- All screens tested in both languages
- Text truncation checked
- Layout tested with longer Spanish strings
- RTL preparation verified

---

## Accessibility Requirements

- All accessibility labels translated
- Screen reader tested in both languages
- Voice Over / TalkBack compatible
- Semantic HTML/ARIA labels translated

---

## Future Languages (Phase 7+)

Priority based on WIC demographics:
1. Spanish (Phase 1) ✓
2. Chinese (Simplified/Traditional)
3. Vietnamese
4. Korean
5. Arabic
6. Haitian Creole
7. Russian
8. Portuguese

Each additional language requires:
- Professional translation
- Native speaker review
- Complete QA pass
- Accessibility testing
