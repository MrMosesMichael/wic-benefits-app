/**
 * Benefit Validation Alert Component
 *
 * Displays warnings when benefit balance discrepancies are detected
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { DiscrepancyWarning } from '../lib/services/benefitValidation';

interface BenefitValidationAlertProps {
  warning: DiscrepancyWarning;
  onDismiss?: () => void;
  onResolve?: (warning: DiscrepancyWarning) => void;
  showRecommendation?: boolean;
}

/**
 * Alert component for displaying benefit balance discrepancy warnings
 *
 * @example
 * ```tsx
 * const { warning, hasWarning } = useSingleBenefitValidation(benefit);
 *
 * {hasWarning && warning && (
 *   <BenefitValidationAlert
 *     warning={warning}
 *     onDismiss={() => console.log('Dismissed')}
 *     onResolve={(w) => console.log('Resolving:', w.category)}
 *   />
 * )}
 * ```
 */
export function BenefitValidationAlert({
  warning,
  onDismiss,
  onResolve,
  showRecommendation = true,
}: BenefitValidationAlertProps) {
  const severityColors = {
    low: '#FFA726', // Orange
    medium: '#FF9800', // Dark Orange
    high: '#F44336', // Red
  };

  const severityBackgrounds = {
    low: '#FFF3E0',
    medium: '#FFE0B2',
    high: '#FFEBEE',
  };

  const icon = {
    low: 'ℹ️',
    medium: '⚠️',
    high: '🚨',
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: severityBackgrounds[warning.severity] },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.icon}>{icon[warning.severity]}</Text>
        <Text
          style={[
            styles.severity,
            { color: severityColors[warning.severity] },
          ]}
        >
          {warning.severity.toUpperCase()}
        </Text>
      </View>

      <Text style={styles.message}>{warning.message}</Text>

      <View style={styles.details}>
        <Text style={styles.detailLabel}>Expected Available:</Text>
        <Text style={styles.detailValue}>
          {warning.expectedAvailable.toFixed(2)} {warning.unit}
        </Text>

        <Text style={styles.detailLabel}>Actual Available:</Text>
        <Text style={styles.detailValue}>
          {warning.actualAvailable.toFixed(2)} {warning.unit}
        </Text>

        <Text style={styles.detailLabel}>Discrepancy:</Text>
        <Text
          style={[
            styles.detailValue,
            { color: severityColors[warning.severity] },
          ]}
        >
          {warning.discrepancy > 0 ? '+' : ''}
          {warning.discrepancy.toFixed(2)} {warning.unit} (
          {warning.discrepancyPercentage.toFixed(1)}%)
        </Text>
      </View>

      {showRecommendation && (
        <View style={styles.recommendation}>
          <Text style={styles.recommendationLabel}>What to do:</Text>
          <Text style={styles.recommendationText}>
            {warning.recommendation}
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        {onDismiss && (
          <TouchableOpacity
            style={[styles.button, styles.dismissButton]}
            onPress={onDismiss}
          >
            <Text style={styles.dismissButtonText}>Dismiss</Text>
          </TouchableOpacity>
        )}

        {onResolve && (
          <TouchableOpacity
            style={[
              styles.button,
              styles.resolveButton,
              { backgroundColor: severityColors[warning.severity] },
            ]}
            onPress={() => onResolve(warning)}
          >
            <Text style={styles.resolveButtonText}>Review & Fix</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

/**
 * List component for displaying multiple warnings
 */
interface BenefitValidationListProps {
  warnings: DiscrepancyWarning[];
  onDismissWarning?: (warning: DiscrepancyWarning) => void;
  onResolveWarning?: (warning: DiscrepancyWarning) => void;
  showRecommendations?: boolean;
  title?: string;
}

export function BenefitValidationList({
  warnings,
  onDismissWarning,
  onResolveWarning,
  showRecommendations = true,
  title = 'Balance Warnings',
}: BenefitValidationListProps) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <View style={styles.listContainer}>
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>{title}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{warnings.length}</Text>
        </View>
      </View>

      {warnings.map((warning, index) => (
        <View key={`${warning.category}-${index}`} style={styles.listItem}>
          <BenefitValidationAlert
            warning={warning}
            onDismiss={onDismissWarning ? () => onDismissWarning(warning) : undefined}
            onResolve={onResolveWarning ? () => onResolveWarning(warning) : undefined}
            showRecommendation={showRecommendations}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 20,
    marginRight: 8,
  },
  severity: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  message: {
    fontSize: 15,
    color: '#212121',
    marginBottom: 12,
    lineHeight: 22,
  },
  details: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 13,
    color: '#757575',
    marginTop: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#212121',
    fontWeight: '600',
    marginBottom: 8,
  },
  recommendation: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  recommendationLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 13,
    color: '#616161',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  dismissButton: {
    backgroundColor: '#EEEEEE',
  },
  dismissButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#616161',
  },
  resolveButton: {
    // backgroundColor set dynamically
  },
  resolveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  listContainer: {
    marginVertical: 8,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
    marginRight: 8,
  },
  badge: {
    backgroundColor: '#F44336',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  listItem: {
    marginBottom: 8,
  },
});

export default BenefitValidationAlert;
