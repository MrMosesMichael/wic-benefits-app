import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import type { WicFormula, FormulaType } from '@/lib/types';
import { useTranslation } from '@/lib/i18n/I18nContext';

interface FormulaCardProps {
  formula: WicFormula;
  onPress: (formula: WicFormula) => void;
  selected?: boolean;
}

const getTypeColor = (type: FormulaType): string => {
  switch (type) {
    case 'standard': return '#4CAF50';
    case 'sensitive': return '#FF9800';
    case 'gentle': return '#2196F3';
    case 'hypoallergenic': return '#9C27B0';
    case 'organic': return '#8BC34A';
    case 'soy': return '#795548';
    case 'specialty': return '#E91E63';
    case 'store_brand': return '#607D8B';
    default: return '#9E9E9E';
  }
};

const TYPE_KEYS: Record<string, string> = {
  standard: 'formulaTypes.standard',
  sensitive: 'formulaTypes.sensitive',
  gentle: 'formulaTypes.gentle',
  hypoallergenic: 'formulaTypes.hypoallergenic',
  organic: 'formulaTypes.organic',
  soy: 'formulaTypes.soy',
  specialty: 'formulaTypes.specialty',
  store_brand: 'formulaTypes.store_brand',
};

const FORM_KEYS: Record<string, string> = {
  powder: 'formulaForms.powder',
  ready_to_feed: 'formulaForms.ready_to_feed',
  concentrate: 'formulaForms.concentrate',
};

export default function FormulaCard({ formula, onPress, selected }: FormulaCardProps) {
  const t = useTranslation();

  const typeLabel = TYPE_KEYS[formula.formulaType] ? t(TYPE_KEYS[formula.formulaType]) : formula.formulaType;
  const formLabel = FORM_KEYS[formula.form] ? t(FORM_KEYS[formula.form]) : formula.form;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        selected && styles.cardSelected
      ]}
      onPress={() => onPress(formula)}
      activeOpacity={0.7}
      accessibilityRole="radio"
      accessibilityState={{ selected: selected || false }}
      accessibilityLabel={`${formula.brand} ${formula.productName}, ${typeLabel}, ${formLabel}${formula.stateContractBrand ? ', ' + t('a11y.formulaCard.wicContractLabel') : ''}${selected ? ', ' + t('a11y.formulaCard.selectedLabel') : ''}`}
    >
      {/* Formula Image or Placeholder */}
      <View style={styles.imageContainer}>
        {formula.imageUrl ? (
          <Image source={{ uri: formula.imageUrl }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText} accessible={false}>
              {formula.brand.charAt(0)}
            </Text>
          </View>
        )}
        {formula.stateContractBrand && (
          <View style={styles.contractBadge}>
            <Text style={styles.contractBadgeText} accessible={false}>WIC</Text>
          </View>
        )}
      </View>

      {/* Formula Info */}
      <View style={styles.info}>
        <Text style={styles.brand}>{formula.brand}</Text>
        <Text style={styles.productName} numberOfLines={2}>
          {formula.productName}
        </Text>

        <View style={styles.badges}>
          <View style={[styles.typeBadge, { backgroundColor: getTypeColor(formula.formulaType) }]}>
            <Text style={styles.typeBadgeText}>{typeLabel}</Text>
          </View>
          <Text style={styles.formText}>{formLabel}</Text>
        </View>

        {formula.size && (
          <Text style={styles.size}>{formula.size}</Text>
        )}
      </View>

      {/* Selection indicator */}
      {selected && (
        <View style={styles.selectedIndicator}>
          <Text style={styles.selectedIndicatorText} accessible={false}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: '#1976D2',
    backgroundColor: '#E3F2FD',
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  image: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  imagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#9E9E9E',
  },
  contractBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  contractBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  info: {
    flex: 1,
  },
  brand: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
    marginBottom: 8,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  formText: {
    fontSize: 12,
    color: '#666',
  },
  size: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1976D2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIndicatorText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
