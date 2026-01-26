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
} from 'react-native';
import { useRouter } from 'expo-router';
import { saveHousehold, loadHousehold, clearHousehold } from '@/lib/services/householdStorage';
import { Household, Participant, BenefitAmount } from '@/lib/services/api';

type ParticipantType = 'pregnant' | 'postpartum' | 'breastfeeding' | 'infant' | 'child';

const PARTICIPANT_TYPES: { value: ParticipantType; label: string }[] = [
  { value: 'pregnant', label: 'Pregnant Woman' },
  { value: 'postpartum', label: 'Postpartum Woman' },
  { value: 'breastfeeding', label: 'Breastfeeding Woman' },
  { value: 'infant', label: 'Infant (0-12 months)' },
  { value: 'child', label: 'Child (1-5 years)' },
];

const BENEFIT_CATEGORIES = [
  { category: 'milk', label: 'Milk', unit: 'qt', common: true },
  { category: 'cheese', label: 'Cheese', unit: 'oz', common: true },
  { category: 'eggs', label: 'Eggs', unit: 'count', common: true },
  { category: 'cereal', label: 'Cereal', unit: 'oz', common: true },
  { category: 'juice', label: '100% Juice', unit: 'oz', common: true },
  { category: 'peanut_butter', label: 'Peanut Butter (or Beans)', unit: 'jar', common: true },
  { category: 'beans', label: 'Dried Beans/Peas', unit: 'lb', common: true },
  { category: 'whole_grains', label: 'Whole Grains (Bread/Rice/Pasta)', unit: 'oz', common: true },
  { category: 'fruits_vegetables', label: 'Fruits & Vegetables (CVV)', unit: 'dollars', common: true },
  { category: 'yogurt', label: 'Low-Fat or Non-Fat Yogurt', unit: 'oz', common: true },
  { category: 'formula', label: 'Infant Formula', unit: 'oz', common: false },
  { category: 'baby_food_fruits_vegetables', label: 'Baby Food (Fruits & Vegetables)', unit: 'oz', common: false },
  { category: 'baby_food_meat', label: 'Baby Food (Meat)', unit: 'oz', common: false },
  { category: 'fish', label: 'Fish (canned)', unit: 'oz', common: false },
];

interface BenefitInput {
  category: string;
  categoryLabel: string;
  total: string;
  unit: string;
}

export default function HouseholdSetup() {
  const router = useRouter();
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
    }
  };

  const handleAddParticipant = () => {
    if (!newParticipantName.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }
    if (!newParticipantType) {
      Alert.alert('Error', 'Please select a participant type');
      return;
    }

    const newParticipant: Participant = {
      id: Date.now().toString(),
      name: newParticipantName.trim(),
      type: newParticipantType,
      benefits: [],
    };

    setParticipants([...participants, newParticipant]);
    setNewParticipantName('');
    setNewParticipantType(null);
    setShowAddParticipant(false);
  };

  const handleRemoveParticipant = (id: string) => {
    Alert.alert(
      'Remove Participant',
      'Are you sure you want to remove this participant and all their benefits?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
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
        updated[index].categoryLabel = categoryInfo.label;
        updated[index].unit = categoryInfo.unit;
      }
    }

    setEditingBenefits(updated);
  };

  const handleRemoveBenefit = (index: number) => {
    setEditingBenefits(editingBenefits.filter((_, i) => i !== index));
  };

  const handleSaveBenefits = () => {
    if (!editingParticipantId) return;

    // Validate all benefits have required fields
    const hasErrors = editingBenefits.some(b => !b.category || !b.total || parseFloat(b.total) <= 0);
    if (hasErrors) {
      Alert.alert('Error', 'Please fill in all benefit fields with valid amounts');
      return;
    }

    // Calculate default period (current month)
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    // Convert to BenefitAmount format
    const benefits: BenefitAmount[] = editingBenefits.map(b => ({
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

    // Update participant
    setParticipants(
      participants.map(p =>
        p.id === editingParticipantId ? { ...p, benefits } : p
      )
    );

    setEditingParticipantId(null);
    setEditingBenefits([]);
    Alert.alert('Success', 'Benefits saved!');
  };

  const handleSaveHousehold = async () => {
    if (participants.length === 0) {
      Alert.alert('Error', 'Please add at least one participant');
      return;
    }

    // Check that all participants have at least one benefit
    const participantsWithoutBenefits = participants.filter(p => p.benefits.length === 0);
    if (participantsWithoutBenefits.length > 0) {
      Alert.alert(
        'Warning',
        `${participantsWithoutBenefits.length} participant(s) have no benefits. Add benefits for all participants?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save Anyway', onPress: saveToStorage },
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
      Alert.alert('Success', 'Household benefits saved!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save household data');
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Data',
      'Are you sure you want to clear all household data? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearHousehold();
            setParticipants([]);
            Alert.alert('Success', 'All household data cleared');
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
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Edit Benefits</Text>
          <Text style={styles.subtitle}>{participant.name}</Text>
        </View>

        <View style={styles.content}>
          {editingBenefits.map((benefit, index) => (
            <View key={index} style={styles.benefitCard}>
              <View style={styles.benefitHeader}>
                <Text style={styles.benefitTitle}>Benefit {index + 1}</Text>
                <TouchableOpacity onPress={() => handleRemoveBenefit(index)}>
                  <Text style={styles.removeButton}>Remove</Text>
                </TouchableOpacity>
              </View>

              {/* Category Picker */}
              <Text style={styles.label}>Category (scroll right for more)</Text>
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
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          benefit.category === cat.category && styles.categoryChipTextSelected,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Amount Input */}
              <Text style={styles.label}>Total Amount</Text>
              <View style={styles.amountRow}>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  keyboardType="numeric"
                  value={benefit.total}
                  onChangeText={(text) => handleUpdateBenefit(index, 'total', text)}
                />
                <Text style={styles.unitText}>{benefit.unit}</Text>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.addBenefitButton} onPress={handleAddBenefit}>
            <Text style={styles.addBenefitButtonText}>+ Add Benefit</Text>
          </TouchableOpacity>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveBenefits}
            >
              <Text style={styles.saveButtonText}>Save Benefits</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setEditingParticipantId(null);
                setEditingBenefits([]);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  // Main household setup view
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Household Setup</Text>
        <Text style={styles.subtitle}>Configure your WIC benefits manually</Text>
      </View>

      <View style={styles.content}>
        {/* Participants List */}
        {participants.map(participant => (
          <View key={participant.id} style={styles.participantCard}>
            <View style={styles.participantHeader}>
              <View>
                <Text style={styles.participantName}>{participant.name}</Text>
                <Text style={styles.participantType}>
                  {PARTICIPANT_TYPES.find(t => t.value === participant.type)?.label}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleRemoveParticipant(participant.id)}>
                <Text style={styles.removeButton}>Remove</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.participantBenefits}>
              <Text style={styles.benefitCount}>
                {participant.benefits.length} benefit(s)
              </Text>
              <TouchableOpacity
                style={styles.editBenefitsButton}
                onPress={() => handleEditBenefits(participant.id)}
              >
                <Text style={styles.editBenefitsButtonText}>
                  {participant.benefits.length === 0 ? 'Add Benefits' : 'Edit Benefits'}
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
          >
            <Text style={styles.addParticipantButtonText}>+ Add Participant</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.addParticipantForm}>
            <Text style={styles.label}>Participant Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter name"
              value={newParticipantName}
              onChangeText={setNewParticipantName}
            />

            <Text style={styles.label}>Participant Type</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowTypePicker(!showTypePicker)}
            >
              <Text style={[styles.pickerButtonText, !newParticipantType && styles.placeholderText]}>
                {newParticipantType
                  ? PARTICIPANT_TYPES.find(t => t.value === newParticipantType)?.label
                  : 'Select type'}
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
                  >
                    <Text style={styles.pickerOptionText}>{type.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.saveButton} onPress={handleAddParticipant}>
                <Text style={styles.saveButtonText}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowAddParticipant(false);
                  setNewParticipantName('');
                  setNewParticipantType(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        {participants.length > 0 && (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleSaveHousehold}>
              <Text style={styles.primaryButtonText}>Save & Apply</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.clearButton} onPress={handleClearAll}>
              <Text style={styles.clearButtonText}>Clear All Data</Text>
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
