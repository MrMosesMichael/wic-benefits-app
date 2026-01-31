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

export default function HelpScreen() {
  const router = useRouter();
  const { faqId } = useLocalSearchParams<{ faqId?: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FAQCategory | 'all'>('all');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);
  
  // Handle deep linking to specific FAQ
  useEffect(() => {
    if (faqId) {
      const faq = getFAQById(faqId);
      if (faq) {
        // Set the category to show the FAQ and mark it for expansion
        setSelectedCategory(faq.category);
        setExpandedFaqId(faqId);
        setSearchQuery('');
      }
    }
  }, [faqId]);
  
  const categories = useMemo(() => getCategoriesWithCounts(), []);
  
  const displayedFAQs = useMemo(() => {
    // If searching, use search results
    if (searchQuery.trim()) {
      return searchFAQs(searchQuery).map((r) => r.item);
    }
    
    // If category selected, filter by category
    if (selectedCategory !== 'all') {
      return getFAQsByCategory(selectedCategory);
    }
    
    // Otherwise show all
    return getAllFAQs();
  }, [searchQuery, selectedCategory]);
  
  const handleCategoryPress = (category: FAQCategory | 'all') => {
    setSelectedCategory(category);
    setSearchQuery(''); // Clear search when switching categories
  };
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Help & FAQ</Text>
        <Text style={styles.subtitle}>Find answers to common questions</Text>
      </View>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search FAQs..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
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
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === 'all' && styles.categoryChipTextSelected,
              ]}
            >
              All
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
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === cat.id && styles.categoryChipTextSelected,
                ]}
              >
                {cat.icon} {cat.label} ({cat.count})
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
              {displayedFAQs.length} result{displayedFAQs.length !== 1 ? 's' : ''} for "{searchQuery}"
            </Text>
          </View>
        ) : null}
        
        <FAQList
          items={displayedFAQs}
          showCategories={selectedCategory === 'all' || !!searchQuery}
          emptyMessage={
            searchQuery
              ? 'No FAQs match your search. Try different keywords.'
              : 'No FAQs available in this category.'
          }
          initialExpandedId={expandedFaqId}
        />
        
        {/* Contact Support */}
        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Still need help?</Text>
          <Text style={styles.contactText}>
            Contact your local WIC office for questions about your specific benefits or eligibility.
          </Text>
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>Michigan WIC:</Text>
            <Text style={styles.contactValue}>1-800-26-BIRTH (1-800-262-4784)</Text>
          </View>
        </View>
      </ScrollView>
      
      {/* Back Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
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
});
