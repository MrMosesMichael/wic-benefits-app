/**
 * Household Setup Screen
 * Allows users to manually configure their household and benefits
 */
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { saveHousehold, loadHousehold, clearHousehold } from '@/lib/services/householdStorage';
import { Household, Participant, BenefitAmount } from '@/lib/services/api';
import { useTranslation } from '@/lib/i18n/I18nContext';

type ParticipantType = 'pregnant' | 'postpartum' | 'breastfeeding' | 'infant' | 'child';

const PARTICIPANT_TYPE_VALUES: ParticipantType[] = [
  'pregnant', 'postpartum', 'breastfeeding', 'infant', 'child',
];

const BENEFIT_CATEGORIES = [
  { category: 'milk', unit: 'qt', common: true },
  { category: 'cheese', unit: 'oz', common: true },
  { category: 'eggs', unit: 'count', common: true },
  { category: 'cereal', unit: 'oz', common: true },
  { category: 'juice', unit: 'oz', common: true },
  { category: 'peanut_butter', unit: 'jar', common: true },
  { category: 'beans', unit: 'lb', common: true },
  { category: 'whole_grains', unit: 'oz', common: true },
  { category: 'fruits_vegetables', unit: 'dollars', common: true },
  { category: 'yogurt', unit: 'oz', common: true },
  { category: 'infant_food', unit: 'oz', common: false },
  { category: 'fish', unit: 'oz', common: false },
];

interface BenefitInput {
  category: string;
  categoryLabel: string;
  total: string;
  unit: string;
}

export default function HouseholdSetup() {
  const router = useRouter();
  const t = useTranslation();
  const params = useLocalSearchParams();
  const deepLinkParticipantId = params.participantId as string | undefined;

  const getParticipantTypeLabel = (value: ParticipantType) =>
    t(`household.participantTypes.${value}`);

  const getBenefitCategoryLabel = (category: string) =>
    t(`household.benefitCategories.${category}`) || category;

  const PARTICIPANT_TYPES = PARTICIPANT_TYPE_VALUES.map(value => ({
    value,
    label: getParticipantTypeLabel(value),
  }));

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState('');
  const [newParticipantType, setNewParticipantType] = useState<ParticipantType | null>(null);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const [editingBenefits, setEditingBenefits] = useState<BenefitInput[]>([]);

  // Load existing household data on mount
  useEffect(() => {
    loadExistingHousehold();
  }, []);

  const loadExistingHousehold = async () => {
    const household = await loadHousehold();
    if (household && household.participants.length > 0) {
      setParticipants(household.participants);
      // Deep-link: auto-open edit benefits for a specific participant
      if (deepLinkParticipantId) {
        const target = household.participants.find(p => p.id === deepLinkParticipantId);
        if (target) {
          const inputs = target.benefits.map(b => ({
            category: b.category,
            categoryLabel: b.categoryLabel,
            total: b.total,
            unit: b.unit,
          }));
          setEditingBenefits(inputs);
          setEditingParticipantId(deepLinkParticipantId);
        }
      }
    }
  };

  const handleAddParticipant = async () => {
    if (!newParticipantName.trim()) {
      Alert.alert(t('household.alerts.errorTitle'), t('household.errors.nameRequired'));
      return;
    }
    if (!newParticipantType) {
      Alert.alert(t('household.alerts.errorTitle'), t('household.errors.typeRequired'));
      return;
    }

    const newParticipant: Participant = {
      id: Date.now().toString(),
      name: newParticipantName.trim(),
      type: newParticipantType,
      benefits: [],
    };

    const newParticipants = [...participants, newParticipant];
    setParticipants(newParticipants);
    setNewParticipantName('');
    setNewParticipantType(null);
    setShowAddParticipant(false);

    // D8: Auto-save so the participant persists even without "Save & Apply"
    try {
      await saveHousehold({ id: '1', state: 'MI', participants: newParticipants });
    } catch {
      // Non-fatal: will be saved when user presses Save & Apply
    }
  };

  const handleRemoveParticipant = (id: string) => {
    Alert.alert(
      t('household.alerts.removeParticipantTitle'),
      t('household.alerts.removeParticipantMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('household.alerts.remove'),
          style: 'destructive',
          onPress: () => {
            setParticipants(participants.filter(p => p.id !== id));
          },
        },
      ]
    );
  };

  const handleEditBenefits = (participantId: string) => {
    const participant = participants.find(p => p.id === participantId);
    if (participant) {
      // Convert existing benefits to input format
      const inputs: BenefitInput[] = participant.benefits.map(b => ({
        category: b.category,
        categoryLabel: b.categoryLabel,
        total: b.total,
        unit: b.unit,
      }));
      setEditingBenefits(inputs);
      setEditingParticipantId(participantId);
    }
  };

  const handleAddBenefit = () => {
    setEditingBenefits([
      ...editingBenefits,
      { category: '', categoryLabel: '', total: '', unit: 'oz' },
    ]);
  };

  const handleUpdateBenefit = (index: number, field: keyof BenefitInput, value: string) => {
    const updated = [...editingBenefits];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-update label when category changes
    if (field === 'category') {
      const categoryInfo = BENEFIT_CATEGORIES.find(c => c.category === value);
      if (categoryInfo) {
        updated[index].categoryLabel = getBenefitCategoryLabel(categoryInfo.category);
        updated[index].unit = categoryInfo.unit;
      }
    }

    setEditingBenefits(updated);
  };

  const handleRemoveBenefit = (index: number) => {
    setEditingBenefits(editingBenefits.filter((_, i) => i !== index));
  };

  const handleSaveBenefits = async () => {
    if (!editingParticipantId) return;

    // D10: Silently drop empty benefit cards instead of erroring
    const validInputs = editingBenefits.filter(b => b.category && b.total && parseFloat(b.total) > 0);

    // Calculate default period (current month)
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    // Convert to BenefitAmount format
    const benefits: BenefitAmount[] = validInputs.map(b => ({
      category: b.category,
      categoryLabel: b.categoryLabel,
      total: b.total,
      consumed: '0.00',
      inCart: '0.00',
      available: b.total,
      unit: b.unit,
      periodStart,
      periodEnd,
    }));

    // Update participant in state
    const newParticipants = participants.map(p =>
      p.id === editingParticipantId ? { ...p, benefits } : p
    );
    setParticipants(newParticipants);

    setEditingParticipantId(null);
    setEditingBenefits([]);

    // D8: Auto-save to storage so changes persist without requiring "Save & Apply"
    try {
      await saveHousehold({ id: '1', state: 'MI', participants: newParticipants });
      Alert.alert(t('household.alerts.successTitle'), t('household.alerts.benefitsSaved'));
    } catch {
      Alert.alert(t('household.alerts.errorTitle'), t('household.errors.saveFailed'));
    }
  };

  const handleSaveHousehold = async () => {
    if (participants.length === 0) {
      Alert.alert(t('household.alerts.errorTitle'), t('household.errors.participantRequired'));
      return;
    }

    // Check that all participants have at least one benefit
    const participantsWithoutBenefits = participants.filter(p => p.benefits.length === 0);
    if (participantsWithoutBenefits.length > 0) {
      Alert.alert(
        t('household.alerts.warningTitle'),
        t('household.warnings.noBenefits',{ count: participantsWithoutBenefits.length }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('household.warnings.saveAnyway'), onPress: saveToStorage },
        ]
      );
      return;
    }

    await saveToStorage();
  };

  const saveToStorage = async () => {
    try {
      const household: Household = {
        id: '1',
        state: 'MI',
        participants,
      };
      await saveHousehold(household);
      Alert.alert(t('household.alerts.successTitle'), t('household.alerts.householdSaved'), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert(t('household.alerts.errorTitle'), t('household.errors.saveFailed'));
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      t('household.alerts.clearAllTitle'),
      t('household.alerts.clearAllMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('household.alerts.clearAll'),
          style: 'destructive',
          onPress: async () => {
            await clearHousehold();
            setParticipants([]);
            Alert.alert(t('household.alerts.successTitle'), t('household.alerts.allDataCleared'));
          },
        },
      ]
    );
  };

  // Render editing benefits modal
  if (editingParticipantId) {
    const participant = participants.find(p => p.id === editingParticipantId);
    if (!participant) return null;

    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={80}
      >
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          {editingBenefits.map((benefit, index) => (
            <View key={index} style={styles.benefitCard}>
              <View style={styles.benefitHeader}>
                <Text style={styles.benefitTitle}>{t('household.benefitN',{ n: index + 1 })}</Text>
                <TouchableOpacity onPress={() => handleRemoveBenefit(index)} accessibilityRole="button" accessibilityLabel={t('a11y.householdSetup.removeBenefitLabel', { index: index + 1 })} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Text style={styles.removeButton}>{t('common.delete')}</Text>
                </TouchableOpacity>
              </View>

              {/* Category Picker */}
              <Text style={styles.label}>{t('household.categoryLabel')}</Text>
              <View style={styles.pickerContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                  {BENEFIT_CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat.category}
                      style={[
                        styles.categoryChip,
                        benefit.category === cat.category && styles.categoryChipSelected,
                      ]}
                      onPress={() => handleUpdateBenefit(index, 'category', cat.category)}
                      accessibilityRole="radio"
                      accessibilityLabel={cat.label}
                      accessibilityState={{ selected: benefit.category === cat.category }}
                      hitSlop={{ top: 6, bottom: 6 }}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          benefit.category === cat.category && styles.categoryChipTextSelected,
                        ]}
                      >
                        {getBenefitCategoryLabel(cat.category)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Amount Input */}
              <Text style={styles.label}>{t('household.totalAmount')}</Text>
              <View style={styles.amountRow}>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  keyboardType="numeric"
                  value={benefit.total}
                  onChangeText={(text) => handleUpdateBenefit(index, 'total', text)}
                  accessibilityLabel={t('a11y.householdSetup.benefitAmountLabel', { index: index + 1 })}
                />
                <Text style={styles.unitText}>{benefit.unit}</Text>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.addBenefitButton} onPress={handleAddBenefit} accessibilityRole="button" accessibilityLabel={t('a11y.householdSetup.addBenefitLabel')}>
            <Text style={styles.addBenefitButtonText}>{t('household.addBenefit')}</Text>
          </TouchableOpacity>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveBenefits}
              accessibilityRole="button"
              accessibilityLabel={t('a11y.householdSetup.saveBenefitsLabel')}
            >
              <Text style={styles.saveButtonText}>{t('household.saveBenefits')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setEditingParticipantId(null);
                setEditingBenefits([]);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('a11y.householdSetup.cancelEditLabel')}
            >
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Main household setup view
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Participants List */}
        {participants.map(participant => (
          <View key={participant.id} style={styles.participantCard}>
            <View style={styles.participantHeader}>
              <View>
                <Text style={styles.participantName}>{participant.name}</Text>
                <Text style={styles.participantType}>
                  {getParticipantTypeLabel(participant.type)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleRemoveParticipant(participant.id)} accessibilityRole="button" accessibilityLabel={t('a11y.householdSetup.removeParticipantLabel', { name: participant.name })} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={styles.removeButton}>Remove</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.participantBenefits}>
              <Text style={styles.benefitCount}>
                {t('household.benefitCount',{ count: participant.benefits.length })}
              </Text>
              <TouchableOpacity
                style={styles.editBenefitsButton}
                onPress={() => handleEditBenefits(participant.id)}
                accessibilityRole="button"
                accessibilityLabel={participant.benefits.length === 0 ? t('a11y.householdSetup.addBenefitsForLabel', { name: participant.name }) : t('a11y.householdSetup.editBenefitsForLabel', { name: participant.name })}
                hitSlop={{ top: 6, bottom: 6 }}
              >
                <Text style={styles.editBenefitsButtonText}>
                  {participant.benefits.length === 0 ? t('household.addBenefitsButton') : t('household.editBenefitsButton')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Add Participant Button/Form */}
        {!showAddParticipant ? (
          <TouchableOpacity
            style={styles.addParticipantButton}
            onPress={() => setShowAddParticipant(true)}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.householdSetup.addParticipantLabel')}
          >
            <Text style={styles.addParticipantButtonText}>{t('household.addParticipant')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.addParticipantForm}>
            <Text style={styles.label}>{t('household.participantName')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('household.participantNamePlaceholder')}
              value={newParticipantName}
              onChangeText={setNewParticipantName}
              accessibilityLabel={t('a11y.householdSetup.nameInputLabel')}
            />

            <Text style={styles.label}>{t('household.participantType')}</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowTypePicker(!showTypePicker)}
              accessibilityRole="button"
              accessibilityLabel={newParticipantType ? t('a11y.householdSetup.typeSelectedLabel', { type: getParticipantTypeLabel(newParticipantType) }) : t('a11y.householdSetup.selectTypeLabel')}
              accessibilityState={{ expanded: showTypePicker }}
            >
              <Text style={[styles.pickerButtonText, !newParticipantType && styles.placeholderText]}>
                {newParticipantType
                  ? getParticipantTypeLabel(newParticipantType)
                  : t('household.selectType')}
              </Text>
              <Text style={styles.chevron}>{showTypePicker ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {showTypePicker && (
              <View style={styles.pickerOptions}>
                {PARTICIPANT_TYPES.map(type => (
                  <TouchableOpacity
                    key={type.value}
                    style={styles.pickerOption}
                    onPress={() => {
                      setNewParticipantType(type.value);
                      setShowTypePicker(false);
                    }}
                    accessibilityRole="radio"
                    accessibilityLabel={type.label}
                    accessibilityState={{ selected: newParticipantType === type.value }}
                  >
                    <Text style={styles.pickerOptionText}>{type.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.saveButton} onPress={handleAddParticipant} accessibilityRole="button" accessibilityLabel={t('a11y.householdSetup.addParticipantLabel')}>
                <Text style={styles.saveButtonText}>{t('household.addButton')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowAddParticipant(false);
                  setNewParticipantName('');
                  setNewParticipantType(null);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('a11y.householdSetup.cancelAddLabel')}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        {participants.length > 0 && (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleSaveHousehold} accessibilityRole="button" accessibilityLabel={t('a11y.householdSetup.saveHouseholdLabel')}>
              <Text style={styles.primaryButtonText}>{t('household.saveAndApply')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.clearButton} onPress={handleClearAll} accessibilityRole="button" accessibilityLabel={t('a11y.householdSetup.clearAllLabel')}>
              <Text style={styles.clearButtonText}>{t('household.clearAllData')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
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
    alignItems: 'center',
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
  content: {
    padding: 16,
    gap: 16,
  },
  participantCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  participantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  participantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  participantType: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  participantBenefits: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  benefitCount: {
    fontSize: 14,
    color: '#666',
  },
  editBenefitsButton: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  editBenefitsButtonText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '600',
  },
  removeButton: {
    color: '#C62828',
    fontSize: 14,
    fontWeight: '600',
  },
  addParticipantButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2E7D32',
    borderStyle: 'dashed',
  },
  addParticipantButtonText: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: '600',
  },
  addParticipantForm: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  pickerButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  chevron: {
    fontSize: 12,
    color: '#666',
  },
  pickerOptions: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  pickerOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#2E7D32',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  benefitCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  benefitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  pickerContainer: {
    marginBottom: 12,
  },
  categoryChip: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  categoryChipText: {
    fontSize: 12,
    color: '#666',
  },
  categoryChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  unitText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  addBenefitButton: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2E7D32',
    borderStyle: 'dashed',
  },
  addBenefitButtonText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtons: {
    gap: 12,
    marginTop: 8,
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
  clearButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C62828',
  },
  clearButtonText: {
    color: '#C62828',
    fontSize: 16,
    fontWeight: '600',
  },
});
