/**
 * FAQ List Component
 * Displays a list of FAQ items with expandable answers
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import type { FAQItem, FAQCategory } from '@/lib/types/faq';
import { getCategoryInfo } from '@/lib/services/faqService';
import { useTranslation } from '@/lib/i18n/I18nContext';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FAQListItemProps {
  item: FAQItem;
  expanded: boolean;
  onToggle: () => void;
  showCategory?: boolean;
}

function FAQListItem({ item, expanded, onToggle, showCategory = false }: FAQListItemProps) {
  const t = useTranslation();
  const categoryInfo = getCategoryInfo(item.category);
  
  return (
    <View style={styles.itemContainer}>
      <TouchableOpacity
        style={styles.questionRow}
        onPress={onToggle}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityHint={expanded ? t('a11y.faqList.collapseHint') : t('a11y.faqList.expandHint')}
      >
        <View style={styles.questionContent}>
          {showCategory && categoryInfo && (
            <View style={[styles.categoryBadge, { backgroundColor: categoryInfo.color }]}>
              <Text style={styles.categoryBadgeText}>
                {categoryInfo.icon} {categoryInfo.label}
              </Text>
            </View>
          )}
          <Text style={styles.questionText}>{item.question}</Text>
        </View>
        <View style={[styles.expandIcon, expanded && styles.expandIconRotated]} accessible={false} importantForAccessibility="no">
          <Text style={styles.expandIconText}>▼</Text>
        </View>
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.answerContainer} accessibilityLiveRegion="polite">
          <Text style={styles.answerText}>{item.answer}</Text>
        </View>
      )}
    </View>
  );
}

interface FAQListProps {
  items: FAQItem[];
  showCategories?: boolean;
  emptyMessage?: string;
  /** ID of FAQ item to expand initially (for deep linking) */
  initialExpandedId?: string | null;
}

export default function FAQList({ 
  items, 
  showCategories = false,
  emptyMessage = 'No FAQs found',
  initialExpandedId,
}: FAQListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    // Initialize with the deep-linked FAQ expanded
    return initialExpandedId ? new Set([initialExpandedId]) : new Set();
  });
  
  // Update expanded state when initialExpandedId changes
  React.useEffect(() => {
    if (initialExpandedId) {
      setExpandedIds((prev) => new Set([...prev, initialExpandedId]));
    }
  }, [initialExpandedId]);
  
  const toggleExpanded = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {items.map((item) => (
        <FAQListItem
          key={item.id}
          item={item}
          expanded={expandedIds.has(item.id)}
          onToggle={() => toggleExpanded(item.id)}
          showCategory={showCategories}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  itemContainer: {
    backgroundColor: '#fff',
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  questionContent: {
    flex: 1,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  categoryBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    lineHeight: 22,
  },
  expandIcon: {
    marginLeft: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandIconRotated: {
    transform: [{ rotate: '180deg' }],
  },
  expandIconText: {
    fontSize: 12,
    color: '#666',
  },
  answerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  answerText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
    marginTop: 12,
  },
});
