import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useI18n } from '@/lib/i18n/I18nContext';
import { getAllTips, getTipsByCategory, searchTips, TIP_CATEGORIES, Tip, TipCategory } from '@/lib/services/tipsService';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function TipsScreen() {
  const { t, locale } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TipCategory | 'all'>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const displayedTips = useMemo(() => {
    if (searchQuery.trim()) {
      return searchTips(searchQuery);
    }
    if (selectedCategory !== 'all') {
      return getTipsByCategory(selectedCategory);
    }
    return getAllTips();
  }, [searchQuery, selectedCategory]);

  const toggleExpanded = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isEs = locale === 'es';

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('tips.searchPlaceholder')}
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={t('a11y.tips.searchLabel')}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.clearButtonText}>{'\u2715'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Category Chips */}
      {!searchQuery && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
          <TouchableOpacity
            style={[styles.chip, selectedCategory === 'all' && styles.chipSelected]}
            onPress={() => setSelectedCategory('all')}
            accessibilityRole="tab"
            accessibilityState={{ selected: selectedCategory === 'all' }}
          >
            <Text style={[styles.chipText, selectedCategory === 'all' && styles.chipTextSelected]}>
              {t('tips.allCategories')}
            </Text>
          </TouchableOpacity>
          {TIP_CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.chip, selectedCategory === cat.id && styles.chipSelected, selectedCategory === cat.id && { backgroundColor: cat.color }]}
              onPress={() => setSelectedCategory(cat.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: selectedCategory === cat.id }}
            >
              <Text style={[styles.chipText, selectedCategory === cat.id && styles.chipTextSelected]}>
                {cat.icon} {t(cat.labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Tips List */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {searchQuery && (
          <Text style={styles.resultsText}>
            {t('tips.resultsFor', { count: displayedTips.length, query: searchQuery })}
          </Text>
        )}

        {displayedTips.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? t('tips.noSearchResults') : t('tips.noTipsInCategory')}
            </Text>
          </View>
        )}

        {displayedTips.map(tip => {
          const expanded = expandedIds.has(tip.id);
          return (
            <TouchableOpacity
              key={tip.id}
              style={styles.tipCard}
              onPress={() => toggleExpanded(tip.id)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
            >
              <View style={styles.tipHeader}>
                <Text style={styles.tipTitle}>{isEs ? tip.titleEs : tip.title}</Text>
                <View style={[styles.expandIcon, expanded && styles.expandIconRotated]}>
                  <Text style={styles.expandIconText}>{'\u25BC'}</Text>
                </View>
              </View>
              {expanded && (
                <View style={styles.tipContent} accessibilityLiveRegion="polite">
                  <Text style={styles.tipText}>{isEs ? tip.contentEs : tip.content}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  searchContainer: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' },
  searchInput: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: '#333' },
  clearButton: { position: 'absolute', right: 24, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  clearButtonText: { fontSize: 16, color: '#999' },
  chipScroll: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  chipRow: { paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f0f0', marginHorizontal: 4 },
  chipSelected: { backgroundColor: '#2E7D32' },
  chipText: { fontSize: 13, fontWeight: '500', color: '#666' },
  chipTextSelected: { color: '#fff' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  resultsText: { fontSize: 14, color: '#666', marginBottom: 12 },
  emptyContainer: { padding: 20, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#666', fontStyle: 'italic' },
  tipCard: { backgroundColor: '#fff', marginBottom: 12, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2, overflow: 'hidden' },
  tipHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  tipTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: '#333', lineHeight: 22 },
  expandIcon: { marginLeft: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  expandIconRotated: { transform: [{ rotate: '180deg' }] },
  expandIconText: { fontSize: 12, color: '#666' },
  tipContent: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  tipText: { fontSize: 14, color: '#555', lineHeight: 22, marginTop: 12 },
});
