import { useState, useMemo, useEffect, useCallback } from 'react';
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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useI18n } from '@/lib/i18n/I18nContext';
import { colors, card } from '@/lib/theme';
import {
  getAllTips,
  getTipsByCategory,
  searchTips,
  TIP_CATEGORIES,
  TipCategory,
  CommunityTip,
  getCommunityTips,
  voteTip,
  flagTip,
} from '@/lib/services/tipsService';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function TipsScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const isEs = locale === 'es';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TipCategory | 'all'>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Community tips state
  const [communityTips, setCommunityTips] = useState<CommunityTip[]>([]);
  const [loadingCommunity, setLoadingCommunity] = useState(true);
  const [votingIds, setVotingIds] = useState<Set<number>>(new Set());

  const fetchCommunityTips = useCallback(async () => {
    setLoadingCommunity(true);
    try {
      const category = selectedCategory !== 'all' ? selectedCategory : undefined;
      const result = await getCommunityTips(category);
      setCommunityTips(result.tips);
    } catch {
      setCommunityTips([]);
    } finally {
      setLoadingCommunity(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    fetchCommunityTips();
  }, [fetchCommunityTips]);

  // Bundled tips
  const bundledTips = useMemo(() => {
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

  const handleVote = async (tipId: number, voteType: 'up' | 'down') => {
    if (votingIds.has(tipId)) return;
    setVotingIds(prev => new Set(prev).add(tipId));
    try {
      const result = await voteTip(tipId, voteType, 'app-user');
      if (result.success) {
        // Refresh community tips to get updated scores
        fetchCommunityTips();
      }
    } catch {
      // silent fail
    } finally {
      setVotingIds(prev => {
        const next = new Set(prev);
        next.delete(tipId);
        return next;
      });
    }
  };

  const handleFlag = (tipId: number) => {
    Alert.alert(
      t('communityTips.flagTitle'),
      t('communityTips.flagMessage'),
      [
        { text: t('communityTips.cancel'), style: 'cancel' },
        {
          text: t('communityTips.flagConfirm'),
          style: 'destructive',
          onPress: async () => {
            const result = await flagTip(tipId, 'app-user', 'Reported by user');
            if (result.success) {
              Alert.alert(t('communityTips.flaggedTitle'), t('communityTips.flaggedMessage'));
              fetchCommunityTips();
            } else if (result.error) {
              Alert.alert(t('communityTips.errorTitle'), result.error);
            }
          },
        },
      ]
    );
  };

  const handleAddTip = () => {
    router.push('/community/add-tip');
  };

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder={t('tips.searchPlaceholder')}
          placeholderTextColor={colors.muted}
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
            {t('tips.resultsFor', { count: bundledTips.length, query: searchQuery })}
          </Text>
        )}

        {bundledTips.length === 0 && communityTips.length === 0 && !loadingCommunity && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? t('tips.noSearchResults') : t('tips.noTipsInCategory')}
            </Text>
          </View>
        )}

        {/* Bundled (Official) Tips */}
        {bundledTips.map(tip => {
          const expanded = expandedIds.has(tip.id);
          return (
            <TouchableOpacity
              key={`bundled-${tip.id}`}
              style={styles.tipCard}
              onPress={() => toggleExpanded(tip.id)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
            >
              <View style={styles.tipHeader}>
                <View style={styles.tipTitleRow}>
                  <Text style={styles.tipTitle}>{isEs ? tip.titleEs : tip.title}</Text>
                  <View style={styles.officialBadge}>
                    <Text style={styles.officialBadgeText}>{t('communityTips.official')}</Text>
                  </View>
                </View>
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

        {/* Community Tips Section */}
        {!searchQuery && (
          <>
            {communityTips.length > 0 && (
              <Text style={styles.sectionHeader}>{t('communityTips.sectionTitle')}</Text>
            )}

            {loadingCommunity && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.header} />
              </View>
            )}

            {communityTips.map(tip => {
              const expanded = expandedIds.has(`community-${tip.id}`);
              return (
                <TouchableOpacity
                  key={`community-${tip.id}`}
                  style={styles.tipCard}
                  onPress={() => toggleExpanded(`community-${tip.id}`)}
                  onLongPress={() => handleFlag(tip.id)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  accessibilityHint={t('communityTips.longPressToFlag')}
                >
                  <View style={styles.tipHeader}>
                    <View style={styles.tipTitleRow}>
                      <Text style={styles.tipTitle}>{tip.title}</Text>
                      <View style={styles.communityBadge}>
                        <Text style={styles.communityBadgeText}>{t('communityTips.community')}</Text>
                      </View>
                    </View>
                    <View style={[styles.expandIcon, expanded && styles.expandIconRotated]}>
                      <Text style={styles.expandIconText}>{'\u25BC'}</Text>
                    </View>
                  </View>
                  {expanded && (
                    <View style={styles.tipContent} accessibilityLiveRegion="polite">
                      <Text style={styles.tipText}>{tip.content}</Text>
                      {/* Vote Row */}
                      <View style={styles.voteRow}>
                        <TouchableOpacity
                          style={styles.voteButton}
                          onPress={() => handleVote(tip.id, 'up')}
                          disabled={votingIds.has(tip.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityLabel={t('communityTips.upvote')}
                          accessibilityRole="button"
                        >
                          <Text style={styles.voteButtonText}>{'\u25B2'}</Text>
                        </TouchableOpacity>
                        <Text style={styles.voteScore}>{tip.netScore}</Text>
                        <TouchableOpacity
                          style={styles.voteButton}
                          onPress={() => handleVote(tip.id, 'down')}
                          disabled={votingIds.has(tip.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityLabel={t('communityTips.downvote')}
                          accessibilityRole="button"
                        >
                          <Text style={styles.voteButtonText}>{'\u25BC'}</Text>
                        </TouchableOpacity>
                        <Text style={styles.voteInfo}>
                          {t('communityTips.votes', { up: tip.upvotes, down: tip.downvotes })}
                        </Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* Bottom spacer for FAB */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB — Submit a Tip */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddTip}
        accessibilityRole="button"
        accessibilityLabel={t('communityTips.addTip')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.screenBg },
  searchContainer: { backgroundColor: colors.cardBg, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' },
  searchInput: { flex: 1, backgroundColor: colors.screenBg, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: colors.navy },
  clearButton: { position: 'absolute', right: 24, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  clearButtonText: { fontSize: 16, color: colors.muted },
  chipScroll: { backgroundColor: colors.cardBg, borderBottomWidth: 1, borderBottomColor: colors.border, maxHeight: 56 },
  chipRow: { paddingHorizontal: 12, paddingVertical: 12, gap: 8, alignItems: 'center' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.screenBg, marginHorizontal: 4, height: 36, justifyContent: 'center' },
  chipSelected: { backgroundColor: colors.header },
  chipText: { fontSize: 13, fontWeight: '500', color: colors.muted },
  chipTextSelected: { color: colors.white },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  resultsText: { fontSize: 14, color: colors.muted, marginBottom: 12 },
  emptyContainer: { padding: 20, alignItems: 'center' },
  emptyText: { fontSize: 16, color: colors.muted, fontStyle: 'italic' },
  sectionHeader: { fontSize: 16, fontWeight: '600', color: colors.navy, marginTop: 20, marginBottom: 12 },
  loadingContainer: { padding: 20, alignItems: 'center' },
  tipCard: { ...card, padding: 0, marginBottom: 12, overflow: 'hidden' },
  tipHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  tipTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  tipTitle: { fontSize: 16, fontWeight: '600', color: colors.navy, lineHeight: 22, flexShrink: 1 },
  expandIcon: { marginLeft: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  expandIconRotated: { transform: [{ rotate: '180deg' }] },
  expandIconText: { fontSize: 12, color: colors.muted },
  tipContent: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: colors.borderLight },
  tipText: { fontSize: 14, color: colors.muted, lineHeight: 22, marginTop: 12 },

  // Badges
  officialBadge: { backgroundColor: colors.header, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  officialBadgeText: { fontSize: 10, fontWeight: '600', color: colors.white },
  communityBadge: { backgroundColor: colors.dustyBlue, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  communityBadgeText: { fontSize: 10, fontWeight: '600', color: colors.white },

  // Vote row
  voteRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
  voteButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.screenBg, alignItems: 'center', justifyContent: 'center' },
  voteButtonText: { fontSize: 14, color: colors.navy },
  voteScore: { fontSize: 16, fontWeight: '700', color: colors.navy, minWidth: 24, textAlign: 'center' },
  voteInfo: { fontSize: 12, color: colors.muted, marginLeft: 8 },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.header,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  fabText: {
    fontSize: 28,
    fontWeight: '300',
    color: colors.white,
    marginTop: -2,
  },
});
