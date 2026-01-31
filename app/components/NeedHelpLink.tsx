/**
 * NeedHelpLink Component
 * A reusable link to the Help & FAQ screen
 * Can optionally deep link to a specific FAQ item
 */
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/lib/i18n/I18nContext';

interface NeedHelpLinkProps {
  /** Optional FAQ ID to deep link to */
  faqId?: string;
  /** Optional custom label (defaults to "Need Help?") */
  label?: string;
  /** Style variant */
  variant?: 'default' | 'card' | 'inline';
  /** Optional context hint shown below the link */
  contextHint?: string;
}

export default function NeedHelpLink({
  faqId,
  label,
  variant = 'default',
  contextHint,
}: NeedHelpLinkProps) {
  const router = useRouter();
  const t = useTranslation();
  
  const displayLabel = label || t('help.needHelp');
  
  const handlePress = () => {
    if (faqId) {
      router.push(`/help?faqId=${faqId}`);
    } else {
      router.push('/help');
    }
  };
  
  if (variant === 'card') {
    return (
      <TouchableOpacity
        style={styles.cardContainer}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          <Text style={styles.cardIcon}>❓</Text>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardLabel}>{displayLabel}</Text>
            {contextHint && (
              <Text style={styles.cardHint}>{contextHint}</Text>
            )}
          </View>
        </View>
        <Text style={styles.cardArrow}>→</Text>
      </TouchableOpacity>
    );
  }
  
  if (variant === 'inline') {
    return (
      <TouchableOpacity
        style={styles.inlineContainer}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Text style={styles.inlineText}>❓ {displayLabel}</Text>
      </TouchableOpacity>
    );
  }
  
  // Default variant
  return (
    <TouchableOpacity
      style={styles.defaultContainer}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text style={styles.defaultText}>❓ {displayLabel}</Text>
      {contextHint && (
        <Text style={styles.defaultHint}>{contextHint}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Default variant
  defaultContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  defaultText: {
    fontSize: 15,
    color: '#1976D2',
    fontWeight: '500',
  },
  defaultHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  
  // Card variant
  cardContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#1976D2',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  cardHint: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  cardArrow: {
    fontSize: 18,
    color: '#1976D2',
    fontWeight: '600',
  },
  
  // Inline variant
  inlineContainer: {
    paddingVertical: 8,
  },
  inlineText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '500',
  },
});
