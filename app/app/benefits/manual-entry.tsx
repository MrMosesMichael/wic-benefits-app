import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { BenefitCategory, BenefitUnit } from '@/lib/types';
import { useTranslation } from '@/lib/i18n/I18nContext';
import { loadHousehold, saveHousehold } from '@/lib/services/householdStorage';

// Category options for dropdown
const CATEGORY_OPTIONS: { value: BenefitCategory; label: string }[] = [
  { value: 'milk', label: 'Milk' },
  { value: 'cheese', label: 'Cheese' },
  { value: 'eggs', label: 'Eggs' },
  { value: 'fruits_vegetables', label: 'Fruits & Vegetables (CVV)' },
  { value: 'whole_grains', label: 'Whole Grains (Bread, Cereal, Rice, Pasta)' },
  { value: 'juice', label: 'Juice' },
  { value: 'peanut_butter', label: 'Peanut Butter / Beans / Legumes' },
  { value: 'infant_formula', label: 'Infant Formula' },
  { value: 'cereal', label: 'Infant Cereal' },
  { value: 'infant_food', label: 'Infant Fruits & Vegetables' },
  { value: 'baby_food_meat', label: 'Baby Food Meat' },
  { value: 'yogurt', label: 'Yogurt' },
  { value: 'fish', label: 'Fish (canned)' },
];

// All unit options
const ALL_UNIT_OPTIONS: { value: BenefitUnit; label: string }[] = [
  { value: 'gal', label: 'Gallons (gal)' },
  { value: 'oz', label: 'Ounces (oz)' },
  { value: 'lb', label: 'Pounds (lb)' },
  { value: 'doz', label: 'Dozen (doz)' },
  { value: 'can', label: 'Cans' },
  { value: 'box', label: 'Boxes' },
  { value: 'count', label: 'Count' },
  { value: 'dollars', label: 'Dollars ($)' },
];

// D4: Valid units per category
const CATEGORY_UNITS: Record<string, BenefitUnit[]> = {
  milk: ['gal', 'oz'],
  cheese: ['oz', 'lb'],
  eggs: ['count', 'doz'],
  fruits_vegetables: ['dollars'],
  whole_grains: ['oz', 'lb', 'box'],
  juice: ['oz', 'gal'],
  peanut_butter: ['oz', 'lb'],
  infant_formula: ['can', 'oz'],
  cereal: ['oz', 'box'],
  infant_food: ['oz', 'can'],
  baby_food_meat: ['oz', 'can'],
  yogurt: ['oz', 'lb'],
  fish: ['can', 'oz'],
};

const getValidUnits = (category: BenefitCategory | null) => {
  if (!category) return ALL_UNIT_OPTIONS;
  const valid = CATEGORY_UNITS[category];
  if (!valid || valid.length === 0) return ALL_UNIT_OPTIONS;
  return ALL_UNIT_OPTIONS.filter(o => valid.includes(o.value));
};

const getDefaultUnit = (category: BenefitCategory): BenefitUnit => {
  const units = CATEGORY_UNITS[category];
  return (units && units.length > 0) ? units[0] : 'oz';
};

interface BenefitEntry {
  category: BenefitCategory | null;
  amount: string;
  unit: BenefitUnit;
  periodStart: Date;
  periodEnd: Date;
}

export default function ManualEntry() {
  const router = useRouter();
  const t = useTranslation();

  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [entry, setEntry] = useState<BenefitEntry>({
    category: null,
    amount: '',
    unit: 'oz',
    periodStart: defaultStart,
    periodEnd: defaultEnd,
  });

  // D3: Participant selector state
  const [participants, setParticipants] = useState<{ id: string; name: string }[]>([]);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>('household');

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showParticipantPicker, setShowParticipantPicker] = useState(false);

  const [errors, setErrors] = useState<{
    category?: string;
    amount?: string;
    periodEnd?: string;
  }>({});

  // Load household participants on mount
  useEffect(() => {
    loadHousehold().then(h => {
      if (h && h.participants.length > 0) {
        const ps = h.participants.map(p => ({ id: p.id, name: p.name }));
        setParticipants(ps);
        setSelectedParticipantId(ps[0].id);
      }
    });
  }, []);

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    if (!entry.category) newErrors.category = 'Please select a category';
    if (!entry.amount || entry.amount.trim() === '') {
      newErrors.amount = 'Please enter an amount';
    } else if (isNaN(parseFloat(entry.amount))) {
      newErrors.amount = 'Amount must be a number';
    } else if (parseFloat(entry.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }
    if (entry.periodEnd <= entry.periodStart) {
      newErrors.periodEnd = 'End date must be after start date';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // D3: Implement actual save to householdStorage
  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors before saving.');
      return;
    }

    const newBenefit = {
      category: entry.category!,
      categoryLabel: getCategoryLabel(entry.category!),
      total: entry.amount,
      available: entry.amount,
      inCart: '0',
      consumed: '0',
      unit: entry.unit,
      periodStart: entry.periodStart.toISOString(),
      periodEnd: entry.periodEnd.toISOString(),
    };

    try {
      const household = await loadHousehold() || { id: '1', state: 'MI', participants: [] };

      if (selectedParticipantId === 'household') {
        // Create or update a generic household-level participant
        let hhParticipant = household.participants.find(p => p.id === 'household');
        if (!hhParticipant) {
          hhParticipant = { id: 'household', name: 'Household', type: 'household' as any, benefits: [] };
          household.participants.push(hhParticipant);
        }
        const idx = hhParticipant.benefits.findIndex(b => b.category === entry.category);
        if (idx >= 0) {
          hhParticipant.benefits[idx] = newBenefit as any;
        } else {
          hhParticipant.benefits.push(newBenefit as any);
        }
      } else {
        const participant = household.participants.find(p => p.id === selectedParticipantId);
        if (participant) {
          const idx = participant.benefits.findIndex(b => b.category === entry.category);
          if (idx >= 0) {
            participant.benefits[idx] = newBenefit as any;
          } else {
            participant.benefits.push(newBenefit as any);
          }
        }
      }

      await saveHousehold(household);

      Alert.alert(
        'Saved',
        `${getCategoryLabel(entry.category!)} — ${entry.amount} ${entry.unit}`,
        [
          {
            text: 'Add Another',
            onPress: () => {
              setEntry({
                category: null,
                amount: '',
                unit: 'oz',
                periodStart: entry.periodStart,
                periodEnd: entry.periodEnd,
              });
              setErrors({});
            },
          },
          {
            text: 'Done',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to save benefit. Please try again.');
    }
  };

  const getCategoryLabel = (category: BenefitCategory): string =>
    CATEGORY_OPTIONS.find(opt => opt.value === category)?.label || category;

  const getUnitLabel = (unit: string): string =>
    ALL_UNIT_OPTIONS.find(opt => opt.value === unit)?.label || unit;

  const formatDate = (date: Date): string =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const participantLabel = selectedParticipantId === 'household'
    ? 'Household (general)'
    : participants.find(p => p.id === selectedParticipantId)?.name || 'Select participant';

  const validUnits = getValidUnits(entry.category);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>

        {/* D3: Participant Selector (shown when participants exist) */}
        {participants.length > 0 && (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>For Participant</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowParticipantPicker(!showParticipantPicker)}
              accessibilityRole="button"
              accessibilityState={{ expanded: showParticipantPicker }}
            >
              <Text style={styles.pickerButtonText}>{participantLabel}</Text>
              <Text style={styles.chevron}>{showParticipantPicker ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showParticipantPicker && (
              <View style={styles.pickerOptions}>
                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                  {participants.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.pickerOption, selectedParticipantId === p.id && styles.pickerOptionSelected]}
                      onPress={() => { setSelectedParticipantId(p.id); setShowParticipantPicker(false); }}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: selectedParticipantId === p.id }}
                    >
                      <Text style={[styles.pickerOptionText, selectedParticipantId === p.id && styles.pickerOptionTextSelected]}>
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[styles.pickerOption, selectedParticipantId === 'household' && styles.pickerOptionSelected]}
                    onPress={() => { setSelectedParticipantId('household'); setShowParticipantPicker(false); }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: selectedParticipantId === 'household' }}
                  >
                    <Text style={[styles.pickerOptionText, selectedParticipantId === 'household' && styles.pickerOptionTextSelected]}>
                      Household (general)
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* Category Selector */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Benefit Category <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={[styles.pickerButton, errors.category && styles.inputError]}
            onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            accessibilityRole="button"
            accessibilityLabel={entry.category ? getCategoryLabel(entry.category) : 'Select category'}
            accessibilityState={{ expanded: showCategoryPicker }}
          >
            <Text style={[styles.pickerButtonText, !entry.category && styles.placeholderText]}>
              {entry.category ? getCategoryLabel(entry.category) : 'Select category'}
            </Text>
            <Text style={styles.chevron}>{showCategoryPicker ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}

          {/* D5: ScrollView wrapper for scrollable dropdown */}
          {showCategoryPicker && (
            <View style={styles.pickerOptions}>
              <ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled>
                {CATEGORY_OPTIONS.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.pickerOption, entry.category === option.value && styles.pickerOptionSelected]}
                    onPress={() => {
                      // D4: Auto-set default unit for category
                      const defaultUnit = getDefaultUnit(option.value);
                      setEntry({ ...entry, category: option.value, unit: defaultUnit });
                      setShowCategoryPicker(false);
                      setErrors({ ...errors, category: undefined });
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: entry.category === option.value }}
                  >
                    <Text style={[styles.pickerOptionText, entry.category === option.value && styles.pickerOptionTextSelected]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Amount Input */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Amount <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, errors.amount && styles.inputError]}
            placeholder="Enter amount"
            keyboardType="numeric"
            value={entry.amount}
            onChangeText={(text) => {
              setEntry({ ...entry, amount: text });
              setErrors({ ...errors, amount: undefined });
            }}
            accessibilityLabel={t('a11y.manualEntry.amountLabel')}
          />
          {errors.amount && <Text style={styles.errorText}>{errors.amount}</Text>}
        </View>

        {/* Unit Selector — filtered by category (D4) */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Unit</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowUnitPicker(!showUnitPicker)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showUnitPicker }}
          >
            <Text style={styles.pickerButtonText}>{getUnitLabel(entry.unit)}</Text>
            <Text style={styles.chevron}>{showUnitPicker ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {/* D5: ScrollView wrapper */}
          {showUnitPicker && (
            <View style={styles.pickerOptions}>
              <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                {validUnits.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.pickerOption, entry.unit === option.value && styles.pickerOptionSelected]}
                    onPress={() => { setEntry({ ...entry, unit: option.value }); setShowUnitPicker(false); }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: entry.unit === option.value }}
                  >
                    <Text style={[styles.pickerOptionText, entry.unit === option.value && styles.pickerOptionTextSelected]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Benefit Period Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Benefit Period</Text>
        </View>

        {/* Period Start Date */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Start Date</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowStartDatePicker(!showStartDatePicker)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showStartDatePicker }}
          >
            <Text style={styles.pickerButtonText}>{formatDate(entry.periodStart)}</Text>
            <Text style={styles.chevron}>{showStartDatePicker ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showStartDatePicker && (
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerButtons}>
                <TouchableOpacity
                  style={styles.datePresetButton}
                  onPress={() => {
                    setEntry({ ...entry, periodStart: new Date(now.getFullYear(), now.getMonth(), 1) });
                    setShowStartDatePicker(false);
                  }}
                  accessibilityRole="button"
                  hitSlop={{ top: 4, bottom: 4 }}
                >
                  <Text style={styles.datePresetButtonText}>This Month (1st)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.datePresetButton}
                  onPress={() => {
                    setEntry({ ...entry, periodStart: now });
                    setShowStartDatePicker(false);
                  }}
                  accessibilityRole="button"
                  hitSlop={{ top: 4, bottom: 4 }}
                >
                  <Text style={styles.datePresetButtonText}>Today</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.datePickerNote}>Current: {formatDate(entry.periodStart)}</Text>
            </View>
          )}
        </View>

        {/* Period End Date */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>End Date</Text>
          <TouchableOpacity
            style={[styles.pickerButton, errors.periodEnd && styles.inputError]}
            onPress={() => setShowEndDatePicker(!showEndDatePicker)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showEndDatePicker }}
          >
            <Text style={styles.pickerButtonText}>{formatDate(entry.periodEnd)}</Text>
            <Text style={styles.chevron}>{showEndDatePicker ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {errors.periodEnd && <Text style={styles.errorText}>{errors.periodEnd}</Text>}

          {showEndDatePicker && (
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerButtons}>
                <TouchableOpacity
                  style={styles.datePresetButton}
                  onPress={() => {
                    setEntry({ ...entry, periodEnd: new Date(now.getFullYear(), now.getMonth() + 1, 0) });
                    setShowEndDatePicker(false);
                    setErrors({ ...errors, periodEnd: undefined });
                  }}
                  accessibilityRole="button"
                  hitSlop={{ top: 4, bottom: 4 }}
                >
                  <Text style={styles.datePresetButtonText}>End of Month</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.datePresetButton}
                  onPress={() => {
                    const d = new Date(now);
                    d.setDate(now.getDate() + 30);
                    setEntry({ ...entry, periodEnd: d });
                    setShowEndDatePicker(false);
                    setErrors({ ...errors, periodEnd: undefined });
                  }}
                  accessibilityRole="button"
                  hitSlop={{ top: 4, bottom: 4 }}
                >
                  <Text style={styles.datePresetButtonText}>30 Days</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.datePickerNote}>Current: {formatDate(entry.periodEnd)}</Text>
            </View>
          )}
        </View>

        {/* Help Text */}
        <View style={styles.helpBox}>
          <Text style={styles.helpText}>
            💡 Enter the benefit amounts listed on your WIC card or benefit statement.
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} accessibilityRole="button" accessibilityLabel={t('a11y.manualEntry.saveLabel')}>
          <Text style={styles.saveButtonText}>Save Benefit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.manualEntry.cancelLabel')}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  form: {
    padding: 16,
    gap: 20,
  },
  fieldGroup: {
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#C62828',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  inputError: {
    borderColor: '#C62828',
    borderWidth: 2,
  },
  pickerButton: {
    backgroundColor: '#fff',
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
    flex: 1,
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
    marginTop: 4,
  },
  pickerOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerOptionSelected: {
    backgroundColor: '#E8F5E9',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#333',
  },
  pickerOptionTextSelected: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    color: '#C62828',
    marginTop: 4,
  },
  sectionHeader: {
    marginTop: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2E7D32',
  },
  datePickerContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  datePickerButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  datePresetButton: {
    flex: 1,
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  datePresetButtonText: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '600',
  },
  datePickerNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  helpBox: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  helpText: {
    fontSize: 12,
    color: '#1565C0',
    lineHeight: 18,
  },
  buttonContainer: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  saveButton: {
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});
