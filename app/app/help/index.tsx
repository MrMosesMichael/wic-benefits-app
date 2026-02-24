/**
 * Help & FAQ Screen
 * Main help center with searchable FAQs organized by category
 * Supports deep linking to specific FAQ items via ?faqId=xxx
 */
import { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import FAQList from '@/components/FAQList';
import {
  getAllFAQs,
  getFAQsByCategory,
  searchFAQs,
  getCategoriesWithCounts,
  getFAQById,
} from '@/lib/services/faqService';
import type { FAQCategory } from '@/lib/types/faq';
import { useI18n } from '@/lib/i18n/I18nContext';

export default function HelpScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { faqId } = useLocalSearchParams<{ faqId?: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FAQCategory | 'all'>('all');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  // Handle deep linking to specific FAQ
  useEffect(() => {
    if (faqId) {
      const faq = getFAQById(faqId);
      if (faq) {
        setSelectedCategory(faq.category);
        setExpandedFaqId(faqId);
        setSearchQuery('');
      }
    }
  }, [faqId]);

  const categories = useMemo(() => getCategoriesWithCounts(), []);

  const displayedFAQs = useMemo(() => {
    let items;
    if (searchQuery.trim()) {
      items = searchFAQs(searchQuery).map((r) => r.item);
    } else if (selectedCategory !== 'all') {
      items = getFAQsByCategory(selectedCategory);
    } else {
      items = getAllFAQs();
    }
    // Apply i18n localization — falls back to English if translation missing
    return items.map((item) => ({
      ...item,
      question: t(`faq.${item.id}.question`),
      answer: t(`faq.${item.id}.answer`),
    }));
  }, [searchQuery, selectedCategory, t]);

  const handleCategoryPress = (category: FAQCategory | 'all') => {
    setSelectedCategory(category);
    setSearchQuery('');
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('help.searchPlaceholder')}
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={t('a11y.help.searchLabel')}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.help.clearSearchLabel')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter */}
      {!searchQuery && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScrollView}
          contentContainerStyle={styles.categoryContainer}
        >
          <TouchableOpacity
            style={[
              styles.categoryChip,
              selectedCategory === 'all' && styles.categoryChipSelected,
            ]}
            onPress={() => handleCategoryPress('all')}
            accessibilityRole="tab"
            accessibilityState={{ selected: selectedCategory === 'all' }}
            hitSlop={{ top: 6, bottom: 6 }}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === 'all' && styles.categoryChipTextSelected,
              ]}
            >
              {t('help.allCategories')}
            </Text>
          </TouchableOpacity>

          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                selectedCategory === cat.id && styles.categoryChipSelected,
                selectedCategory === cat.id && { backgroundColor: cat.color },
              ]}
              onPress={() => handleCategoryPress(cat.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: selectedCategory === cat.id }}
              hitSlop={{ top: 6, bottom: 6 }}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === cat.id && styles.categoryChipTextSelected,
                ]}
              >
                {cat.icon} {t(`faqCategories.${cat.id}`) || cat.label} ({cat.count})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* FAQ List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {searchQuery ? (
          <View style={styles.searchResultsHeader}>
            <Text style={styles.searchResultsText}>
              {t('help.resultsFor', { count: displayedFAQs.length, query: searchQuery })}
            </Text>
          </View>
        ) : null}

        <FAQList
          items={displayedFAQs}
          showCategories={selectedCategory === 'all' || !!searchQuery}
          emptyMessage={
            searchQuery
              ? t('help.noSearchResults')
              : t('help.noFaqsInCategory')
          }
          initialExpandedId={expandedFaqId}
        />

        {/* Contact Support */}
        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>{t('help.stillNeedHelp')}</Text>
          <Text style={styles.contactText}>
            {t('help.contactLocalWic')}
          </Text>
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>Michigan WIC:</Text>
            <Text style={styles.contactValue} accessibilityRole="link">1-800-26-BIRTH (1-800-262-4784)</Text>
          </View>
        </View>

        {/* Send Feedback */}
        <TouchableOpacity
          style={styles.privacyLink}
          onPress={() => router.push('/feedback')}
          accessibilityRole="link"
          accessibilityHint={t('a11y.help.feedbackHint')}
        >
          <Text style={styles.privacyLinkIcon} accessible={false} importantForAccessibility="no">✉</Text>
          <View style={styles.privacyLinkContent}>
            <Text style={styles.privacyLinkTitle}>{t('help.sendFeedback')}</Text>
            <Text style={styles.privacyLinkText}>
              {t('help.sendFeedbackDesc')}
            </Text>
          </View>
          <Text style={styles.privacyLinkArrow} accessible={false} importantForAccessibility="no">→</Text>
        </TouchableOpacity>

        {/* Privacy & Data */}
        <TouchableOpacity
          style={styles.privacyLink}
          onPress={() => router.push('/settings/privacy')}
          accessibilityRole="link"
          accessibilityHint={t('a11y.help.privacyHint')}
        >
          <Text style={styles.privacyLinkIcon} accessible={false} importantForAccessibility="no">🔒</Text>
          <View style={styles.privacyLinkContent}>
            <Text style={styles.privacyLinkTitle}>{t('help.privacyData')}</Text>
            <Text style={styles.privacyLinkText}>
              {t('help.privacyDataDesc')}
            </Text>
          </View>
          <Text style={styles.privacyLinkArrow} accessible={false} importantForAccessibility="no">→</Text>
        </TouchableOpacity>
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  searchContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    position: 'absolute',
    right: 24,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    color: '#999',
  },
  categoryScrollView: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoryContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 4,
  },
  categoryChipSelected: {
    backgroundColor: '#2E7D32',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  categoryChipTextSelected: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  searchResultsHeader: {
    marginBottom: 12,
  },
  searchResultsText: {
    fontSize: 14,
    color: '#666',
  },
  contactSection: {
    marginTop: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  contactInfo: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
  },
  contactLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  contactValue: {
    fontSize: 16,
    color: '#2E7D32',
    fontWeight: '600',
    marginTop: 4,
  },
  footer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  backButton: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  privacyLink: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  privacyLinkIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  privacyLinkContent: {
    flex: 1,
  },
  privacyLinkTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  privacyLinkText: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  privacyLinkArrow: {
    fontSize: 18,
    color: '#999',
  },
});
