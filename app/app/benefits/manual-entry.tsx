import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { BenefitCategory, BenefitUnit } from '@/lib/types';

// Category options for dropdown - based on specs/wic-benefits-app/specs/benefits/spec.md
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

// Unit options for dropdown - based on design.md BenefitUnit type
const UNIT_OPTIONS: { value: BenefitUnit; label: string }[] = [
  { value: 'gal', label: 'Gallons (gal)' },
  { value: 'oz', label: 'Ounces (oz)' },
  { value: 'lb', label: 'Pounds (lb)' },
  { value: 'doz', label: 'Dozen (doz)' },
  { value: 'can', label: 'Cans' },
  { value: 'box', label: 'Boxes' },
  { value: 'count', label: 'Count' },
  { value: 'dollars', label: 'Dollars ($)' },
];

interface BenefitEntry {
  category: BenefitCategory | null;
  amount: string;
  unit: BenefitUnit;
  periodStart: Date;
  periodEnd: Date;
}

export default function ManualEntry() {
  const router = useRouter();

  // Calculate default period (current month)
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const [entry, setEntry] = useState<BenefitEntry>({
    category: null,
    amount: '',
    unit: 'gal',
    periodStart: defaultStart,
    periodEnd: defaultEnd,
  });

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const [errors, setErrors] = useState<{
    category?: string;
    amount?: string;
    periodStart?: string;
    periodEnd?: string;
  }>({});

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!entry.category) {
      newErrors.category = 'Please select a category';
    }

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

  const handleSave = () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors before saving.');
      return;
    }

    // TODO: Save benefit entry to backend/storage
    // For now, just show success message
    Alert.alert(
      'Success',
      `Benefit entry saved:\n${getCategoryLabel(entry.category!)} - ${entry.amount} ${entry.unit}`,
      [
        {
          text: 'Add Another',
          onPress: () => {
            setEntry({
              category: null,
              amount: '',
              unit: 'gal',
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
  };

  const getCategoryLabel = (category: BenefitCategory): string => {
    return CATEGORY_OPTIONS.find(opt => opt.value === category)?.label || category;
  };

  const getUnitLabel = (unit: string): string => {
    return UNIT_OPTIONS.find(opt => opt.value === unit)?.label || unit;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Manual Benefits Entry</Text>
        <Text style={styles.subtitle}>Add your WIC benefits manually</Text>
      </View>

      <View style={styles.form}>
        {/* Category Selector */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Benefit Category <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={[styles.pickerButton, errors.category && styles.inputError]}
            onPress={() => setShowCategoryPicker(!showCategoryPicker)}
          >
            <Text style={[styles.pickerButtonText, !entry.category && styles.placeholderText]}>
              {entry.category ? getCategoryLabel(entry.category) : 'Select category'}
            </Text>
            <Text style={styles.chevron}>{showCategoryPicker ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}

          {showCategoryPicker && (
            <View style={styles.pickerOptions}>
              {CATEGORY_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.pickerOption,
                    entry.category === option.value && styles.pickerOptionSelected,
                  ]}
                  onPress={() => {
                    setEntry({ ...entry, category: option.value });
                    setShowCategoryPicker(false);
                    setErrors({ ...errors, category: undefined });
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      entry.category === option.value && styles.pickerOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
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
          />
          {errors.amount && <Text style={styles.errorText}>{errors.amount}</Text>}
        </View>

        {/* Unit Selector */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Unit</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowUnitPicker(!showUnitPicker)}
          >
            <Text style={styles.pickerButtonText}>{getUnitLabel(entry.unit)}</Text>
            <Text style={styles.chevron}>{showUnitPicker ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showUnitPicker && (
            <View style={styles.pickerOptions}>
              {UNIT_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.pickerOption,
                    entry.unit === option.value && styles.pickerOptionSelected,
                  ]}
                  onPress={() => {
                    setEntry({ ...entry, unit: option.value });
                    setShowUnitPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      entry.unit === option.value && styles.pickerOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
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
                    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                    setEntry({ ...entry, periodStart: firstDay });
                    setShowStartDatePicker(false);
                  }}
                >
                  <Text style={styles.datePresetButtonText}>This Month (1st)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.datePresetButton}
                  onPress={() => {
                    setEntry({ ...entry, periodStart: now });
                    setShowStartDatePicker(false);
                  }}
                >
                  <Text style={styles.datePresetButtonText}>Today</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.datePickerNote}>
                Current: {formatDate(entry.periodStart)}
              </Text>
            </View>
          )}
        </View>

        {/* Period End Date */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>End Date</Text>
          <TouchableOpacity
            style={[styles.pickerButton, errors.periodEnd && styles.inputError]}
            onPress={() => setShowEndDatePicker(!showEndDatePicker)}
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
                    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    setEntry({ ...entry, periodEnd: lastDay });
                    setShowEndDatePicker(false);
                    setErrors({ ...errors, periodEnd: undefined });
                  }}
                >
                  <Text style={styles.datePresetButtonText}>End of Month</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.datePresetButton}
                  onPress={() => {
                    const next30Days = new Date(now);
                    next30Days.setDate(now.getDate() + 30);
                    setEntry({ ...entry, periodEnd: next30Days });
                    setShowEndDatePicker(false);
                    setErrors({ ...errors, periodEnd: undefined });
                  }}
                >
                  <Text style={styles.datePresetButtonText}>30 Days</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.datePickerNote}>
                Current: {formatDate(entry.periodEnd)}
              </Text>
            </View>
          )}
        </View>

        {/* Help Text */}
        <View style={styles.helpBox}>
          <Text style={styles.helpText}>
            💡 Enter the benefit amounts listed on your WIC card or benefit statement.
            These amounts will be tracked separately for each benefit period.
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Benefit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
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
    maxHeight: 300,
    overflow: 'hidden',
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
