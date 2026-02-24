import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getBenefits, addToCart, Participant, getSightings, reportSighting } from '@/lib/services/api';
import type { ProductSighting, StockLevel } from '@/lib/types';
import { useTranslation } from '@/lib/i18n/I18nContext';
import NeedHelpLink from '@/components/NeedHelpLink';

export default function ScanResult() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const t = useTranslation();

  const isEligible = params.eligible === 'true';
  const upc = params.upc as string;
  const name = params.name as string;
  const brand = params.brand as string;
  const size = params.size as string;
  const category = params.category as string;
  const reason = params.reason as string;
  const scanMode = (params.scanMode as string) || 'check';
  const isPlu = params.isPlu === 'true';

  const [eligibleParticipants, setEligibleParticipants] = useState<Participant[]>([]);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  // D2: Track whether household prompt has been dismissed
  const [cartPreferenceDismissed, setCartPreferenceDismissed] = useState(false);
  // Whether the user has any household set up at all (separate from eligible participants)
  const [hasHousehold, setHasHousehold] = useState(false);
  const [fallbackParticipantId, setFallbackParticipantId] = useState<string>('1');

  // Sightings state
  const [sightings, setSightings] = useState<ProductSighting[]>([]);
  const [loadingSightings, setLoadingSightings] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportStoreName, setReportStoreName] = useState('');
  const [reportStockLevel, setReportStockLevel] = useState<StockLevel>('plenty');
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    if (isEligible && category && !isPlu) {
      loadEligibleParticipants();
    }
    if (!isPlu) {
      loadSightings();
    }
    // D2: Load cart preference
    AsyncStorage.getItem('@wic_cart_preference').then(v => {
      if (v === 'household') setCartPreferenceDismissed(true);
    });
  }, [isEligible, category]);

  const loadEligibleParticipants = async () => {
    try {
      setLoading(true);
      const household = await getBenefits();

      // Filter participants who have available benefits in this category
      const eligible = household.participants.filter(p => {
        const benefit = p.benefits.find(b => b.category === category);
        return benefit && parseFloat(benefit.available) > 0;
      });

      setEligibleParticipants(eligible);
      setHasHousehold(household.participants.length > 0);
      if (household.participants.length > 0) {
        setFallbackParticipantId(household.participants[0].id);
        // Clear stale "no household" preference flag set by a previous "Continue Anyway"
        AsyncStorage.removeItem('@wic_cart_preference');
        setCartPreferenceDismissed(false);
      }

      // Auto-select if only one participant
      if (eligible.length === 1) {
        setSelectedParticipantId(eligible[0].id);
      }
    } catch (err) {
      console.error('Failed to load participants:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (eligibleParticipants.length === 0) {
      if (!hasHousehold) {
        // No household set up at all — show setup prompt (D2)
        if (cartPreferenceDismissed) {
          Alert.alert(
            t('result.addedToCart'),
            'Item noted. Set up your household to track benefits.',
            [
              { text: 'Set Up Now', onPress: () => router.push('/benefits/household-setup') },
              { text: 'OK' },
            ]
          );
        } else {
          Alert.alert(
            'Track Your Benefits',
            'Set up your household to see which benefits this item uses and track what you have left.',
            [
              {
                text: 'Set Up Household',
                onPress: () => router.push('/benefits/household-setup'),
              },
              {
                text: 'Continue Anyway',
                onPress: async () => {
                  await AsyncStorage.setItem('@wic_cart_preference', 'household');
                  setCartPreferenceDismissed(true);
                  Alert.alert(t('result.addedToCart'), 'Item added to your shopping list.');
                },
              },
            ]
          );
        }
        return;
      }

      // Household exists but no available benefits for this category — add generically
      try {
        setAdding(true);
        await addToCart(fallbackParticipantId, upc, name, category, 1, 'unit', brand, size);
        const fullProductName = brand ? `${brand} ${name}` : name;
        Alert.alert(
          t('result.addedToCart'),
          t('result.addedToCartMessage', { product: fullProductName }),
          [
            { text: t('result.viewCart'), onPress: () => router.replace('/cart') },
            { text: t('result.continueShopping'), onPress: () => router.replace('/') },
          ]
        );
      } catch (err: any) {
        Alert.alert(t('common.error'), err.message || 'Failed to add item to cart');
      } finally {
        setAdding(false);
      }
      return;
    }

    // Normal flow: has eligible participants
    if (!selectedParticipantId) {
      Alert.alert(t('result.selectParticipant'), t('result.selectParticipantMessage'));
      return;
    }

    const participant = eligibleParticipants.find(p => p.id === selectedParticipantId);
    if (!participant) return;

    const benefit = participant.benefits.find(b => b.category === category);
    if (!benefit) return;

    const quantity = 1;

    try {
      setAdding(true);
      await addToCart(
        selectedParticipantId,
        upc,
        name,
        category,
        quantity,
        benefit.unit,
        brand,
        size
      );

      const fullProductName = brand ? `${brand} ${name}` : name;
      Alert.alert(
        t('result.addedToCart'),
        t('result.addedToCartMessage', { product: fullProductName }),
        [
          {
            text: t('result.viewCart'),
            onPress: () => router.replace('/cart'),
          },
          {
            text: t('result.continueShopping'),
            onPress: () => router.replace('/'),
          },
        ]
      );
    } catch (err: any) {
      console.error('Failed to add to cart:', err);
      Alert.alert(t('common.error'), err.message || 'Failed to add item to cart');
    } finally {
      setAdding(false);
    }
  };

  const loadSightings = async () => {
    try {
      setLoadingSightings(true);
      const recentSightings = await getSightings(upc);
      setSightings(recentSightings);
    } catch (err) {
      console.error('Failed to load sightings:', err);
    } finally {
      setLoadingSightings(false);
    }
  };

  const handleReportSighting = async () => {
    if (!reportStoreName.trim()) {
      Alert.alert(t('result.storeRequired'), t('result.enterStoreName'));
      return;
    }

    try {
      setReporting(true);
      await reportSighting({
        upc,
        storeName: reportStoreName.trim(),
        stockLevel: reportStockLevel,
      });

      Alert.alert(t('result.thankYou'), t('result.reportSuccess'));
      setShowReportModal(false);
      setReportStoreName('');
      setReportStockLevel('plenty');

      // Reload sightings to show the new report
      loadSightings();
    } catch (err: any) {
      console.error('Failed to report sighting:', err);
      Alert.alert(t('common.error'), err.message || 'Failed to report sighting');
    } finally {
      setReporting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Result Header */}
      <View
        style={[styles.resultCard, isEligible ? styles.eligible : styles.notEligible]}
        accessible={true}
        accessibilityLabel={isEligible ? t('a11y.result.approvedLabel') : t('a11y.result.notApprovedLabel')}
      >
        <View style={styles.statusBadge}>
          <Text style={styles.statusIcon} accessible={false}>{isEligible ? '✓' : '✗'}</Text>
        </View>
        <Text style={styles.statusText} accessibilityRole="header">
          {isEligible ? t('result.wicApproved') : t('result.notApproved')}
        </Text>
        <Text style={styles.statusSubtext}>{t('result.michigan')}</Text>
      </View>

      {/* Product Details */}
      <View style={styles.detailsCard}>
        <Text style={styles.productName}>{name === 'Unknown Product' ? t('formulaReport.unknownProduct') : name}</Text>
        {brand && <Text style={styles.productBrand}>{brand}</Text>}
        <Text style={styles.upcLabel}>{isPlu ? t('result.plu') : t('result.upc')}: {upc}</Text>

        {category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{category.toUpperCase()}</Text>
          </View>
        )}

        {reason && (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonText}>{reason}</Text>
          </View>
        )}

        {isPlu && (
          <View style={styles.cvbNote}>
            <Text style={styles.cvbNoteText}>{t('result.freshProduceNote')}</Text>
          </View>
        )}
      </View>

      {/* Recent Sightings (hidden for PLU/produce items) */}
      {!isPlu && <View style={styles.sightingsCard}>
        <View style={styles.sightingsHeader}>
          <Text style={styles.sightingsTitle}>{t('result.communityReports')}</Text>
          <TouchableOpacity
            style={styles.reportButton}
            onPress={() => setShowReportModal(true)}
            accessibilityRole="button"
            hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
          >
            <Text style={styles.reportButtonText}>{t('result.reportSighting')}</Text>
          </TouchableOpacity>
        </View>

        {loadingSightings ? (
          <ActivityIndicator color="#1976D2" style={{ marginVertical: 16 }} />
        ) : sightings.length > 0 ? (
          <View style={styles.sightingsList}>
            {sightings.slice(0, 3).map((sighting) => (
              <View key={sighting.id} style={styles.sightingItem}>
                <View style={styles.sightingHeader}>
                  <Text style={styles.sightingStore}>{sighting.storeName}</Text>
                  <View style={[
                    styles.stockBadge,
                    sighting.stockLevel === 'plenty' && styles.stockPlenty,
                    sighting.stockLevel === 'some' && styles.stockSome,
                    sighting.stockLevel === 'few' && styles.stockFew,
                    sighting.stockLevel === 'out' && styles.stockOut,
                  ]}>
                    <Text style={styles.stockBadgeText}>
                      {sighting.stockLevel === 'plenty' ? t('result.inStock') :
                       sighting.stockLevel === 'some' ? t('result.someLeft') :
                       sighting.stockLevel === 'few' ? t('result.lowStock') :
                       t('result.outOfStock')}
                    </Text>
                  </View>
                </View>
                <View style={styles.sightingMeta}>
                  <Text style={styles.sightingAge}>{sighting.ageHours < 1 ? t('result.justNow') : t('result.hoursAgo', { hours: Math.round(sighting.ageHours) })}</Text>
                  {sighting.distance && (
                    <Text style={styles.sightingDistance}>{sighting.distance} {t('result.miles')}</Text>
                  )}
                  <Text style={styles.sightingConfidence}>
                    {t('result.confidence', { percent: sighting.confidence })}
                  </Text>
                </View>
              </View>
            ))}
            {sightings.length > 3 && (
              <Text style={styles.sightingsMore}>{t('result.moreReports', { count: sightings.length - 3 })}</Text>
            )}
          </View>
        ) : (
          <Text style={styles.noSightings}>
            {t('result.noReports')}
          </Text>
        )}
      </View>}

      {/* Participant Selector (for eligible products with add to cart — hidden for PLU) */}
      {!isPlu && isEligible && category && eligibleParticipants.length > 0 && (
        <View style={styles.participantSelector}>
          <Text style={styles.selectorTitle}>{t('result.selectParticipant')}:</Text>
          {eligibleParticipants.map(participant => {
            const benefit = participant.benefits.find(b => b.category === category);
            return (
              <TouchableOpacity
                key={participant.id}
                style={[
                  styles.participantOption,
                  selectedParticipantId === participant.id && styles.participantOptionSelected
                ]}
                onPress={() => setSelectedParticipantId(participant.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: selectedParticipantId === participant.id }}
                accessibilityLabel={`${participant.name}, ${participant.type}${benefit ? `, ${benefit.available} ${benefit.unit} available` : ''}`}
              >
                <View style={styles.participantInfo}>
                  <Text style={styles.participantOptionName}>{participant.name}</Text>
                  <Text style={styles.participantOptionType}>{participant.type}</Text>
                </View>
                {benefit && (
                  <Text style={styles.participantAvailable}>
                    {benefit.available} {benefit.unit} {t('result.available')}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        {/* D2: Always show Add to Cart for eligible items (not PLU) */}
        {!isPlu && isEligible && category && (
          <TouchableOpacity
            style={[styles.addToCartButton, adding && styles.addToCartButtonDisabled]}
            onPress={handleAddToCart}
            disabled={loading || adding || (eligibleParticipants.length > 0 && !selectedParticipantId)}
            accessibilityRole="button"
            accessibilityState={{ disabled: loading || adding || (eligibleParticipants.length > 0 && !selectedParticipantId) }}
          >
            {adding ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.addToCartButtonText}>{t('result.addToCart')}</Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.replace('/scanner')}
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonText}>{t('result.scanAnother')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.replace('/benefits')}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryButtonText}>{t('result.viewMyBenefits')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.textButton}
          onPress={() => router.replace('/')}
          accessibilityRole="button"
          hitSlop={{ top: 4, bottom: 4 }}
        >
          <Text style={styles.textButtonText}>{t('result.backToHome')}</Text>
        </TouchableOpacity>
      </View>

      {/* Help Text */}
      {!isEligible && (
        <View style={styles.helpBox}>
          <Text style={styles.helpTitle}>{t('result.whyNotApproved')}</Text>
          <Text style={styles.helpText}>
            {t('result.notApprovedExplanation')}
          </Text>
        </View>
      )}

      {/* Need Help Link */}
      <View style={styles.helpLinkContainer}>
        <NeedHelpLink 
          variant="card"
          faqId={!isEligible ? 'checkout-rejected' : 'scan-products'}
          contextHint={!isEligible ? t('help.learnWhyRejected') : t('help.scanningTips')}
        />
      </View>

      {/* Report Sighting Modal */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent} accessibilityViewIsModal={true}>
            <Text style={styles.modalTitle}>{t('result.reportProductSighting')}</Text>
            <Text style={styles.modalSubtitle}>{t('result.helpOthersFind', { product: name })}</Text>

            <Text style={styles.inputLabel}>{t('result.storeName')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('result.storeNamePlaceholder')}
              value={reportStoreName}
              onChangeText={setReportStoreName}
              autoCapitalize="words"
              accessibilityLabel={t('a11y.result.storeNameLabel')}
            />

            <Text style={styles.inputLabel}>{t('result.stockLevel')}</Text>
            <View style={styles.stockLevelButtons}>
              {(['plenty', 'some', 'few', 'out'] as StockLevel[]).map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.stockLevelButton,
                    reportStockLevel === level && styles.stockLevelButtonSelected,
                  ]}
                  onPress={() => setReportStockLevel(level)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: reportStockLevel === level }}
                >
                  <Text style={[
                    styles.stockLevelButtonText,
                    reportStockLevel === level && styles.stockLevelButtonTextSelected,
                  ]}>
                    {level === 'plenty' ? t('result.plenty') :
                     level === 'some' ? t('result.some') :
                     level === 'few' ? t('result.low') :
                     t('result.out')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowReportModal(false);
                  setReportStoreName('');
                  setReportStockLevel('plenty');
                }}
                accessibilityRole="button"
              >
                <Text style={styles.modalButtonCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSubmit]}
                onPress={handleReportSighting}
                disabled={reporting}
                accessibilityRole="button"
              >
                {reporting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonSubmitText}>{t('result.submitReport')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  resultCard: {
    margin: 20,
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eligible: {
    backgroundColor: '#2E7D32',
  },
  notEligible: {
    backgroundColor: '#C62828',
  },
  statusBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIcon: {
    fontSize: 48,
    color: '#fff',
    fontWeight: 'bold',
  },
  statusText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statusSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  detailsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  productName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  productBrand: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  upcLabel: {
    fontSize: 14,
    color: '#999',
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginBottom: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
  },
  reasonBox: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
  },
  reasonText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  cvbNote: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
    marginTop: 4,
  },
  cvbNoteText: {
    fontSize: 14,
    color: '#2E7D32',
    lineHeight: 20,
  },
  participantSelector: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  selectorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  participantOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginBottom: 8,
  },
  participantOptionSelected: {
    borderColor: '#2E7D32',
    backgroundColor: '#E8F5E9',
  },
  participantInfo: {
    marginBottom: 4,
  },
  participantOptionName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  participantOptionType: {
    fontSize: 13,
    color: '#666',
    textTransform: 'capitalize',
  },
  participantAvailable: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '500',
  },
  buttonContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  addToCartButton: {
    backgroundColor: '#FFA000',
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
  },
  addToCartButtonDisabled: {
    backgroundColor: '#FFD54F',
  },
  addToCartButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#1976D2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  textButton: {
    padding: 12,
    alignItems: 'center',
  },
  textButtonText: {
    color: '#666',
    fontSize: 14,
  },
  helpBox: {
    backgroundColor: '#FFF3CD',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFECB5',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  helpLinkContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sightingsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sightingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sightingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  reportButton: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  reportButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  sightingsList: {
    gap: 12,
  },
  sightingItem: {
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#1976D2',
  },
  sightingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sightingStore: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  stockPlenty: {
    backgroundColor: '#4CAF50',
  },
  stockSome: {
    backgroundColor: '#FFA000',
  },
  stockFew: {
    backgroundColor: '#FF6F00',
  },
  stockOut: {
    backgroundColor: '#9E9E9E',
  },
  stockBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  sightingMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  sightingAge: {
    fontSize: 13,
    color: '#666',
  },
  sightingDistance: {
    fontSize: 13,
    color: '#666',
  },
  sightingConfidence: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '500',
  },
  sightingsMore: {
    fontSize: 13,
    color: '#1976D2',
    textAlign: 'center',
    marginTop: 4,
  },
  noSightings: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 12,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  stockLevelButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  stockLevelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  stockLevelButtonSelected: {
    borderColor: '#1976D2',
    backgroundColor: '#E3F2FD',
  },
  stockLevelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  stockLevelButtonTextSelected: {
    color: '#1976D2',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F5F5F5',
  },
  modalButtonSubmit: {
    backgroundColor: '#1976D2',
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalButtonSubmitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
