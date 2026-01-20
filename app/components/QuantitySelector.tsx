import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { QuantitySeen } from '@/lib/types';

interface QuantitySelectorProps {
  value: QuantitySeen | null;
  onChange: (value: QuantitySeen) => void;
  disabled?: boolean;
}

interface QuantityOption {
  value: QuantitySeen;
  label: string;
  icon: string;
  description: string;
  color: string;
}

const options: QuantityOption[] = [
  {
    value: 'none',
    label: 'None',
    icon: '❌',
    description: 'Out of stock',
    color: '#F44336'
  },
  {
    value: 'few',
    label: 'Few',
    icon: '⚠️',
    description: '1-3 items',
    color: '#FF9800'
  },
  {
    value: 'some',
    label: 'Some',
    icon: '✓',
    description: '4-10 items',
    color: '#4CAF50'
  },
  {
    value: 'plenty',
    label: 'Plenty',
    icon: '📦',
    description: '10+ items',
    color: '#2196F3'
  }
];

export default function QuantitySelector({ value, onChange, disabled }: QuantitySelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>How much did you see?</Text>
      <View style={styles.grid}>
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.button,
                isSelected && { borderColor: option.color, backgroundColor: `${option.color}15` },
                disabled && styles.buttonDisabled
              ]}
              onPress={() => !disabled && onChange(option.value)}
              activeOpacity={disabled ? 1 : 0.7}
            >
              <Text style={styles.icon}>{option.icon}</Text>
              <Text style={[
                styles.label,
                isSelected && { color: option.color }
              ]}>
                {option.label}
              </Text>
              <Text style={styles.description}>{option.description}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  icon: {
    fontSize: 32,
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: '#666',
  },
});
