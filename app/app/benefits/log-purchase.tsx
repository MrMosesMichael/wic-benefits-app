import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { BenefitCategory, BenefitUnit } from '@/lib/types';
import { getBenefits, logPurchase, type Household, type Participant } from '@/lib/services/api';

// Category options for dropdown - based on specs/wic-benefits-app/specs/benefits/spec.md
const CATEGORY_OPTIONS: { value: BenefitCategory; label: string }[] = [
  { value: 'milk', label: 'Milk' },
  { value: 'cheese', label: 'Cheese' },
  { value: 'eggs', label: 'Eggs' },
  { value: 'fruits_vegetables', label: 'Fruits & Vegetables (CVV)' },
  { value: 'whole_grains', label: 'Whole Grains (Bread, Cereal, Rice, Pasta)' },
  { value: 'juice', label: 'Juice' },
  { value: 'peanut_butter', label: 'Peanut Butter / Beans / Legumes' },
  { value: 'cereal', label: 'Infant Cereal' },
  { value: 'infant_food', label: 'Infant Foods' },
  { value: 'yogurt', label: 'Yogurt' },
  { value: 'fish', label: 'Fish (canned)' },
];

interface PurchaseEntry {
  productName: string;
  category: BenefitCategory | null;
  quantity: string;
  unit: BenefitUnit;
  participantId: string | null;
}

export default function LogPurchase() {
  const router = useRouter();

  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [entry, setEntry] = useState<PurchaseEntry>({
    productName: '',
    category: null,
    quantity: '',
    unit: 'gal',
    participantId: null,
  });

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showParticipantPicker, setShowParticipantPicker] = useState(false);

  const [validationErrors, setValidationErrors] = useState<{
    productName?: string;
    category?: string;
    quantity?: string;
    participantId?: string;
  }>({});

  useEffect(() => {
    loadHousehold();
  }, []);

  const loadHousehold = async () => {
    try {
      setError(null);
      const data = await getBenefits();
      setHousehold(data);

      // Auto-select first participant if only one exists
      if (data.participants.length === 1) {
        setEntry(prev => ({ ...prev, participantId: data.participants[0].id }));
      }
    } catch (err) {
      console.error('Failed to load household:', err);
      setError('Failed to load household. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {};

    if (!entry.productName || entry.productName.trim() === '') {
      errors.productName = 'Please enter a product name';
    }

    if (!entry.category) {
      errors.category = 'Please select a category';
    }

    if (!entry.quantity || entry.quantity.trim() === '') {
      errors.quantity = 'Please enter a quantity';
    } else if (isNaN(parseFloat(entry.quantity))) {
      errors.quantity = 'Quantity must be a number';
    } else if (parseFloat(entry.quantity) <= 0) {
      errors.quantity = 'Quantity must be greater than 0';
    }

    if (!entry.participantId) {
      errors.participantId = 'Please select a participant';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogPurchase = () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors before logging purchase.');
      return;
    }

    // Get participant info for confirmation
    const participant = household?.participants.find(p => p.id === entry.participantId);
    const categoryLabel = getCategoryLabel(entry.category!);

    Alert.alert(
      'Confirm Purchase',
      `Log purchase:\n\n` +
      `Product: ${entry.productName}\n` +
      `Category: ${categoryLabel}\n` +
      `Quantity: ${entry.quantity} ${entry.unit}\n` +
      `Participant: ${participant?.name}\n\n` +
      `This will decrement ${participant?.name}'s ${categoryLabel} benefits.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setLoading(true);

              // Call API to log purchase and decrement benefits
              const response = await logPurchase({
                participantId: entry.participantId!,
                category: entry.category!,
                quantity: parseFloat(entry.quantity),
                unit: entry.unit,
                productName: entry.productName,
              });

              // Reload household data to get updated balances
              await loadHousehold();

              // Show success message
              Alert.alert(
                'Purchase Logged',
                `${entry.productName} has been logged.\n\n` +
                `${response.participant.name}'s ${response.benefit.categoryLabel} balance:\n` +
                `Available: ${response.benefit.available} ${response.benefit.unit}\n` +
                `Consumed: ${response.benefit.consumed} ${response.benefit.unit}`,
                [
                  {
                    text: 'Log Another',
                    onPress: () => {
                      setEntry({
                        productName: '',
                        category: null,
                        quantity: '',
                        unit: 'gal',
                        participantId: entry.participantId, // Keep same participant
                      });
                      setValidationErrors({});
                    },
                  },
                  {
                    text: 'Done',
                    onPress: () => router.back(),
                  },
                ]
              );
            } catch (err: any) {
              console.error('Failed to log purchase:', err);
              Alert.alert(
                'Error',
                err.message || 'Failed to log purchase. Please try again.',
                [{ text: 'OK' }]
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const getCategoryLabel = (category: BenefitCategory): string => {
    return CATEGORY_OPTIONS.find(opt => opt.value === category)?.label || category;
  };

  const getParticipantLabel = (participantId: string): string => {
    const participant = household?.participants.find(p => p.id === participantId);
    if (!participant) return 'Select participant';
    return `${participant.name} (${participant.type})`;
  };

  // Auto-update unit based on category selection
  const handleCategorySelect = (category: BenefitCategory) => {
    setEntry({ ...entry, category });
    setShowCategoryPicker(false);
    setValidationErrors({ ...validationErrors, category: undefined });

    // Auto-set appropriate unit based on category
    const unitMap: Record<BenefitCategory, BenefitUnit> = {
      milk: 'gal',
      cheese: 'oz',
      eggs: 'doz',
      fruits_vegetables: 'dollars',
      whole_grains: 'oz',
      juice: 'oz',
      peanut_butter: 'oz',
      cereal: 'oz',
      infant_food: 'can',
      yogurt: 'oz',
      fish: 'can',
    };

    if (unitMap[category]) {
      setEntry(prev => ({ ...prev, unit: unitMap[category] }));
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Loading household...</Text>
      </View>
    );
  }

  if (error || !household) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error || 'Unable to load household data'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadHousehold}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        {/* Product Name Input */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Product Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, validationErrors.productName && styles.inputError]}
            placeholder="Enter product name (e.g., Whole Milk)"
            value={entry.productName}
            onChangeText={(text) => {
              setEntry({ ...entry, productName: text });
              setValidationErrors({ ...validationErrors, productName: undefined });
            }}
          />
          {validationErrors.productName && (
            <Text style={styles.errorText}>{validationErrors.productName}</Text>
          )}
        </View>

        {/* Participant Selector */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Participant <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={[styles.pickerButton, validationErrors.participantId && styles.inputError]}
            onPress={() => setShowParticipantPicker(!showParticipantPicker)}
          >
            <Text
              style={[
                styles.pickerButtonText,
                !entry.participantId && styles.placeholderText,
              ]}
            >
              {entry.participantId
                ? getParticipantLabel(entry.participantId)
                : 'Select participant'}
            </Text>
            <Text style={styles.chevron}>{showParticipantPicker ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {validationErrors.participantId && (
            <Text style={styles.errorText}>{validationErrors.participantId}</Text>
          )}

          {showParticipantPicker && (
            <View style={styles.pickerOptions}>
              {household.participants.map(participant => (
                <TouchableOpacity
                  key={participant.id}
                  style={[
                    styles.pickerOption,
                    entry.participantId === participant.id && styles.pickerOptionSelected,
                  ]}
                  onPress={() => {
                    setEntry({ ...entry, participantId: participant.id });
                    setShowParticipantPicker(false);
                    setValidationErrors({ ...validationErrors, participantId: undefined });
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      entry.participantId === participant.id &&
                        styles.pickerOptionTextSelected,
                    ]}
                  >
                    {participant.name}
                  </Text>
                  <Text style={styles.participantType}>{participant.type}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Category Selector */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Benefit Category <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={[styles.pickerButton, validationErrors.category && styles.inputError]}
            onPress={() => setShowCategoryPicker(!showCategoryPicker)}
          >
            <Text
              style={[
                styles.pickerButtonText,
                !entry.category && styles.placeholderText,
              ]}
            >
              {entry.category ? getCategoryLabel(entry.category) : 'Select category'}
            </Text>
            <Text style={styles.chevron}>{showCategoryPicker ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {validationErrors.category && (
            <Text style={styles.errorText}>{validationErrors.category}</Text>
          )}

          {showCategoryPicker && (
            <View style={styles.pickerOptions}>
              <ScrollView style={styles.pickerScrollView}>
                {CATEGORY_OPTIONS.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.pickerOption,
                      entry.category === option.value && styles.pickerOptionSelected,
                    ]}
                    onPress={() => handleCategorySelect(option.value)}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        entry.category === option.value &&
                          styles.pickerOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Quantity Input */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Quantity <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.quantityRow}>
            <TextInput
              style={[
                styles.input,
                styles.quantityInput,
                validationErrors.quantity && styles.inputError,
              ]}
              placeholder="0"
              keyboardType="numeric"
              value={entry.quantity}
              onChangeText={(text) => {
                setEntry({ ...entry, quantity: text });
                setValidationErrors({ ...validationErrors, quantity: undefined });
              }}
            />
            <View style={styles.unitBadge}>
              <Text style={styles.unitText}>{entry.unit}</Text>
            </View>
          </View>
          {validationErrors.quantity && (
            <Text style={styles.errorText}>{validationErrors.quantity}</Text>
          )}
          <Text style={styles.helpText}>
            Amount purchased (unit auto-selected based on category)
          </Text>
        </View>

        {/* Help Box */}
        <View style={styles.helpBox}>
          <Text style={styles.helpBoxText}>
            💡 Use this screen to manually log purchases made outside the app.
            Benefits will be decremented from the selected participant's balance.
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.logButton} onPress={handleLogPurchase}>
          <Text style={styles.logButtonText}>Log Purchase</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 12,
    color: '#C62828',
    marginTop: 4,
  },
  retryButton: {
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    minWidth: 200,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    maxHeight: 250,
    overflow: 'hidden',
  },
  pickerScrollView: {
    maxHeight: 250,
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
  participantType: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityInput: {
    flex: 1,
  },
  unitBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  unitText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  helpBox: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  helpBoxText: {
    fontSize: 12,
    color: '#1565C0',
    lineHeight: 18,
  },
  buttonContainer: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  logButton: {
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  logButtonText: {
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
