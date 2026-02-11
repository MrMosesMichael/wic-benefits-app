import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getWicFormulas, setParticipantFormula } from '@/lib/services/api';
import FormulaCard from '@/components/FormulaCard';
import { useLocation } from '@/lib/hooks/useLocation';
import type { WicFormula, FormulaType } from '@/lib/types';

const FORMULA_TYPES: { value: FormulaType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'standard', label: 'Standard' },
  { value: 'sensitive', label: 'Sensitive' },
  { value: 'gentle', label: 'Gentle' },
  { value: 'hypoallergenic', label: 'Hypoallergenic' },
  { value: 'organic', label: 'Organic' },
  { value: 'soy', label: 'Soy' },
  { value: 'specialty', label: 'Specialty' },
];

export default function FormulaSelect() {
  const router = useRouter();
  const params = useLocalSearchParams<{ participantId?: string; returnTo?: string }>();

  const [formulas, setFormulas] = useState<WicFormula[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedFormula, setSelectedFormula] = useState<WicFormula | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<FormulaType | 'all'>('all');
  const { location } = useLocation();
  const detectedState = location?.state || 'MI';

  // Load formulas on mount and when filters change
  useEffect(() => {
    loadFormulas();
  }, [selectedType, searchQuery, detectedState]);

  const loadFormulas = useCallback(async () => {
    try {
      setLoading(true);
      const results = await getWicFormulas(
        detectedState,
        selectedType === 'all' ? undefined : selectedType,
        searchQuery || undefined
      );
      setFormulas(results);
    } catch (error) {
      console.error('Failed to load formulas:', error);
      Alert.alert('Error', 'Failed to load formulas. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedType, searchQuery]);

  const handleSelectFormula = (formula: WicFormula) => {
    setSelectedFormula(formula);
  };

  const handleConfirmSelection = async () => {
    if (!selectedFormula) return;

    // If we have a participant ID, save the assignment
    if (params.participantId) {
      try {
        setSaving(true);
        await setParticipantFormula(
          params.participantId,
          selectedFormula.upc,
          `${selectedFormula.brand} ${selectedFormula.productName}`
        );
        Alert.alert(
          'Formula Selected',
          `${selectedFormula.brand} ${selectedFormula.productName} has been set as the assigned formula.`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } catch (error) {
        console.error('Failed to save formula assignment:', error);
        Alert.alert('Error', 'Failed to save formula selection. Please try again.');
      } finally {
        setSaving(false);
      }
    } else {
      // No participant ID - just return the selection
      // This could be used for standalone formula finder
      router.push({
        pathname: '/formula',
        params: {
          selectedUpc: selectedFormula.upc,
          selectedName: `${selectedFormula.brand} ${selectedFormula.productName}`
        }
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Select Your Formula</Text>
        <Text style={styles.subtitle}>Choose the formula assigned by your WIC office</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by brand or name..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
      </View>

      {/* Type Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
      >
        {FORMULA_TYPES.map((type) => (
          <TouchableOpacity
            key={type.value}
            style={[
              styles.filterChip,
              selectedType === type.value && styles.filterChipActive
            ]}
            onPress={() => setSelectedType(type.value)}
          >
            <Text style={[
              styles.filterChipText,
              selectedType === type.value && styles.filterChipTextActive
            ]}>
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Formula List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>Loading formulas...</Text>
        </View>
      ) : (
        <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
          {formulas.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🍼</Text>
              <Text style={styles.emptyText}>No formulas found</Text>
              <Text style={styles.emptySubtext}>Try adjusting your search or filters</Text>
            </View>
          ) : (
            formulas.map((formula) => (
              <FormulaCard
                key={formula.upc}
                formula={formula}
                onPress={handleSelectFormula}
                selected={selectedFormula?.upc === formula.upc}
              />
            ))
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Confirm Button */}
      {selectedFormula && (
        <View style={styles.confirmContainer}>
          <View style={styles.selectedInfo}>
            <Text style={styles.selectedLabel}>Selected:</Text>
            <Text style={styles.selectedName} numberOfLines={1}>
              {selectedFormula.brand} {selectedFormula.productName}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.confirmButton, saving && styles.confirmButtonDisabled]}
            onPress={handleConfirmSelection}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.confirmButtonText}>Confirm Selection</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1976D2',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  filterScroll: {
    backgroundColor: '#fff',
    maxHeight: 60,
  },
  filterContainer: {
    padding: 12,
    gap: 8,
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterChipActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#1976D2',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#1976D2',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
  },
  confirmContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  selectedInfo: {
    marginBottom: 12,
  },
  selectedLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  selectedName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
