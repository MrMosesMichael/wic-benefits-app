import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  getBenefits,
  Household,
} from '@/lib/services/api';
import { loadHousehold, saveHousehold } from '@/lib/services/householdStorage';
import { useTranslation } from '@/lib/i18n/I18nContext';
import { colors, fonts, card } from '@/lib/theme';

interface PeriodSettings {
  periodStart: Date;
  periodEnd: Date;
}

export default function PeriodSettings() {
  const router = useRouter();
  const t = useTranslation();
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Period settings state
  const [periodStart, setPeriodStart] = useState<Date>(new Date());
  const [periodEnd, setPeriodEnd] = useState<Date>(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    loadBenefits();
  }, []);

  const loadBenefits = async () => {
    try {
      setError(null);
      const data = await getBenefits();
      setHousehold(data);

      // Extract current period dates from first participant's first benefit
      if (data.participants.length > 0 && data.participants[0].benefits.length > 0) {
        const benefit = data.participants[0].benefits[0];
        if (benefit.periodStart) {
          setPeriodStart(new Date(benefit.periodStart));
        }
        if (benefit.periodEnd) {
          setPeriodEnd(new Date(benefit.periodEnd));
        }
      }
    } catch (err) {
      console.error('Failed to load benefits:', err);
      setError('Failed to load benefit period. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysRemaining = (): number => {
    const now = new Date();
    const end = new Date(periodEnd);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const calculateDaysInPeriod = (): number => {
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const calculateDaysElapsed = (): number => {
    const now = new Date();
    const start = new Date(periodStart);
    const diffTime = now.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const calculateProgressPercentage = (): number => {
    const totalDays = calculateDaysInPeriod();
    const elapsed = calculateDaysElapsed();
    if (totalDays === 0) return 0;
    return Math.min(100, Math.round((elapsed / totalDays) * 100));
  };

  const isPeriodActive = (): boolean => {
    const now = new Date();
    return now >= periodStart && now <= periodEnd;
  };

  const isPeriodExpired = (): boolean => {
    const now = new Date();
    return now > periodEnd;
  };

  const isPeriodUpcoming = (): boolean => {
    const now = new Date();
    return now < periodStart;
  };

  const handleSavePeriod = async () => {
    // Validate dates
    if (periodEnd <= periodStart) {
      Alert.alert('Invalid Dates', 'End date must be after start date.');
      return;
    }

    // Confirm action
    Alert.alert(
      'Update Benefit Period',
      `Set period from ${formatDate(periodStart)} to ${formatDate(periodEnd)}?\n\nThis will affect all participants in your household.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Update',
          onPress: async () => {
            setSaving(true);
            try {
              // Update local AsyncStorage (source of truth for benefits)
              const localHousehold = await loadHousehold();
              if (localHousehold) {
                localHousehold.participants.forEach(p => {
                  p.benefits.forEach(b => {
                    b.periodStart = periodStart.toISOString();
                    b.periodEnd = periodEnd.toISOString();
                  });
                });
                await saveHousehold(localHousehold);
              }

              Alert.alert(
                'Period Updated',
                'Benefit period has been updated successfully.',
                [{ text: 'OK', onPress: () => router.back() }]
              );
            } catch (err) {
              console.error('Failed to update period:', err);
              Alert.alert('Error', 'Failed to update benefit period. Please try again.');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const handleRolloverPeriod = () => {
    Alert.alert(
      'Start New Benefit Period',
      'This will:\n• Archive current period benefits\n• Reset all benefit amounts\n• Start a new period\n\nUnused benefits will NOT carry over.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Start New Period',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              // Calculate new period (typically next month)
              const now = new Date();
              const newStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
              const newEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);

              // Update local AsyncStorage — reset available amounts, update period dates
              const localHousehold = await loadHousehold();
              if (localHousehold) {
                localHousehold.participants.forEach(p => {
                  p.benefits.forEach(b => {
                    b.periodStart = newStart.toISOString();
                    b.periodEnd = newEnd.toISOString();
                    // Reset to full amount for new period
                    b.available = b.total;
                    b.inCart = '0';
                    b.consumed = '0';
                  });
                });
                await saveHousehold(localHousehold);
              }

              setPeriodStart(newStart);
              setPeriodEnd(newEnd);

              Alert.alert(
                'New Period Started',
                `New benefit period: ${formatDate(newStart)} - ${formatDate(newEnd)}\n\nPlease update benefit amounts if needed.`,
                [{ text: 'OK', onPress: () => router.push('/benefits/household-setup') }]
              );
            } catch (err) {
              console.error('Failed to rollover period:', err);
              Alert.alert('Error', 'Failed to start new period. Please try again.');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateLong = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const setPresetPeriod = (preset: 'current_month' | 'next_month' | '30_days') => {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (preset) {
      case 'current_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'next_month':
        start = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
        break;
      case '30_days':
        start = new Date(now);
        end = new Date(now);
        end.setDate(end.getDate() + 30);
        break;
    }

    setPeriodStart(start);
    setPeriodEnd(end);
    setShowStartPicker(false);
    setShowEndPicker(false);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.header} />
        <Text style={styles.loadingText}>Loading period settings...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadBenefits} accessibilityRole="button" accessibilityLabel={t('a11y.periodSettings.retryLabel')}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const daysRemaining = calculateDaysRemaining();
  const daysInPeriod = calculateDaysInPeriod();
  const progressPercentage = calculateProgressPercentage();
  const isActive = isPeriodActive();
  const isExpired = isPeriodExpired();
  const isUpcoming = isPeriodUpcoming();

  return (
    <ScrollView style={styles.container}>
      {/* Period Status Card */}
      <View style={styles.section}>
        <View style={[
          styles.statusCard,
          isActive && styles.statusCardActive,
          isExpired && styles.statusCardExpired,
          isUpcoming && styles.statusCardUpcoming,
        ]}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusLabel}>
              {isActive && 'Current Period'}
              {isExpired && 'Period Expired'}
              {isUpcoming && 'Upcoming Period'}
            </Text>
            <View style={[
              styles.statusBadge,
              isActive && styles.statusBadgeActive,
              isExpired && styles.statusBadgeExpired,
              isUpcoming && styles.statusBadgeUpcoming,
            ]}>
              <Text style={styles.statusBadgeText}>
                {isActive && 'ACTIVE'}
                {isExpired && 'EXPIRED'}
                {isUpcoming && 'UPCOMING'}
              </Text>
            </View>
          </View>

          <View style={styles.periodDates}>
            <Text style={styles.periodDateLabel}>Start Date</Text>
            <Text style={styles.periodDate}>{formatDateLong(periodStart)}</Text>
          </View>

          <View style={styles.periodDates}>
            <Text style={styles.periodDateLabel}>End Date</Text>
            <Text style={styles.periodDate}>{formatDateLong(periodEnd)}</Text>
          </View>

          {isActive && (
            <>
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Days Remaining</Text>
                  <Text style={styles.progressValue}>
                    {daysRemaining} of {daysInPeriod} days
                  </Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${progressPercentage}%` },
                        daysRemaining <= 5 && styles.progressFillWarning,
                      ]}
                    />
                  </View>
                </View>
              </View>

              {daysRemaining <= 5 && (
                <View style={styles.warningBox}>
                  <Text style={styles.warningIcon} accessible={false} importantForAccessibility="no">⚠️</Text>
                  <Text style={styles.warningText}>
                    Your benefit period expires in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}.
                    Unused benefits will not roll over.
                  </Text>
                </View>
              )}
            </>
          )}

          {isExpired && (
            <View style={styles.expiredBox}>
              <Text style={styles.expiredIcon} accessible={false} importantForAccessibility="no">🕐</Text>
              <Text style={styles.expiredText}>
                This benefit period has ended. Start a new period to continue tracking benefits.
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Edit Period Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle} accessibilityRole="header">Edit Period Dates</Text>

        {/* Start Date Picker */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Start Date</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowStartPicker(!showStartPicker)}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.periodSettings.startDateLabel', { date: formatDate(periodStart) })}
            accessibilityState={{ expanded: showStartPicker }}
          >
            <Text style={styles.pickerButtonText}>{formatDate(periodStart)}</Text>
            <Text style={styles.chevron}>{showStartPicker ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showStartPicker && (
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerButtons}>
                <TouchableOpacity
                  style={styles.datePresetButton}
                  onPress={() => setPresetPeriod('current_month')}
                  accessibilityRole="button"
                  accessibilityLabel={t('a11y.periodSettings.startThisMonthLabel')}
                  hitSlop={{ top: 4, bottom: 4 }}
                >
                  <Text style={styles.datePresetButtonText}>This Month</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.datePresetButton}
                  onPress={() => setPresetPeriod('next_month')}
                  accessibilityRole="button"
                  accessibilityLabel={t('a11y.periodSettings.startNextMonthLabel')}
                  hitSlop={{ top: 4, bottom: 4 }}
                >
                  <Text style={styles.datePresetButtonText}>Next Month</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.datePickerNote}>
                Selected: {formatDateLong(periodStart)}
              </Text>
            </View>
          )}
        </View>

        {/* End Date Picker */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>End Date</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowEndPicker(!showEndPicker)}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.periodSettings.endDateLabel', { date: formatDate(periodEnd) })}
            accessibilityState={{ expanded: showEndPicker }}
          >
            <Text style={styles.pickerButtonText}>{formatDate(periodEnd)}</Text>
            <Text style={styles.chevron}>{showEndPicker ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {showEndPicker && (
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerButtons}>
                <TouchableOpacity
                  style={styles.datePresetButton}
                  onPress={() => {
                    const lastDay = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0);
                    setPeriodEnd(lastDay);
                    setShowEndPicker(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t('a11y.periodSettings.endOfMonthLabel')}
                  hitSlop={{ top: 4, bottom: 4 }}
                >
                  <Text style={styles.datePresetButtonText}>End of Month</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.datePresetButton}
                  onPress={() => {
                    const thirtyDays = new Date(periodStart);
                    thirtyDays.setDate(thirtyDays.getDate() + 30);
                    setPeriodEnd(thirtyDays);
                    setShowEndPicker(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t('a11y.periodSettings.end30DaysLabel')}
                  hitSlop={{ top: 4, bottom: 4 }}
                >
                  <Text style={styles.datePresetButtonText}>30 Days</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.datePickerNote}>
                Selected: {formatDateLong(periodEnd)}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSavePeriod}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.periodSettings.saveLabel')}
          accessibilityState={{ disabled: saving }}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>Save Period Dates</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Period Rollover Section */}
      {isExpired && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">Start New Period</Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              When you start a new benefit period, the current period will be archived and all
              benefit amounts will be reset to zero. You'll need to enter new benefit amounts
              for the new period.
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.rolloverButton, saving && styles.rolloverButtonDisabled]}
            onPress={handleRolloverPeriod}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.periodSettings.newPeriodLabel')}
            accessibilityState={{ disabled: saving }}
            accessibilityHint={t('a11y.periodSettings.newPeriodHint')}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.rolloverButtonText}>Start New Benefit Period</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Help Section */}
      <View style={styles.section}>
        <View style={styles.helpBox}>
          <Text style={styles.helpTitle}>About Benefit Periods</Text>
          <Text style={styles.helpText}>
            • WIC benefits are typically issued monthly{'\n'}
            • Benefits do not roll over to the next period{'\n'}
            • Most states issue benefits on the 1st or a specific day{'\n'}
            • Check your WIC card or benefit statement for exact dates{'\n'}
            • Set reminders to use benefits before they expire
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.periodSettings.backLabel')}
        >
          <Text style={styles.cancelButtonText}>Back to Benefits</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.screenBg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    backgroundColor: colors.cardBg,
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.header,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 4,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.muted,
  },
  errorText: {
    fontSize: 16,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.header,
    padding: 16,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center',
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 12,
  },
  statusCard: {
    ...card,
    padding: 20,
  },
  statusCardActive: {
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  statusCardExpired: {
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
  },
  statusCardUpcoming: {
    borderLeftWidth: 4,
    borderLeftColor: colors.dustyBlue,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.navy,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeActive: {
    backgroundColor: colors.screenBg,
  },
  statusBadgeExpired: {
    backgroundColor: colors.screenBg,
  },
  statusBadgeUpcoming: {
    backgroundColor: colors.screenBg,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  periodDates: {
    marginBottom: 12,
  },
  periodDateLabel: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 4,
  },
  periodDate: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.navy,
  },
  progressSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.navy,
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success,
  },
  progressFillWarning: {
    backgroundColor: colors.warning,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: colors.cardBg,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  warningIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: colors.warning,
    lineHeight: 18,
  },
  expiredBox: {
    flexDirection: 'row',
    backgroundColor: colors.cardBg,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  expiredIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  expiredText: {
    flex: 1,
    fontSize: 13,
    color: colors.danger,
    lineHeight: 18,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 8,
  },
  pickerButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 16,
    color: colors.navy,
  },
  chevron: {
    fontSize: 12,
    color: colors.muted,
  },
  datePickerContainer: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  datePickerButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  datePresetButton: {
    flex: 1,
    backgroundColor: colors.screenBg,
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  datePresetButtonText: {
    fontSize: 13,
    color: colors.header,
    fontWeight: '600',
  },
  datePickerNote: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: colors.header,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    backgroundColor: colors.border,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  rolloverButton: {
    backgroundColor: colors.dustyBlue,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  rolloverButtonDisabled: {
    backgroundColor: colors.borderLight,
  },
  rolloverButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: colors.cardBg,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.dustyBlue,
  },
  infoText: {
    fontSize: 13,
    color: colors.dustyBlue,
    lineHeight: 18,
  },
  helpBox: {
    backgroundColor: colors.screenBg,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 8,
  },
  helpText: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 20,
  },
  buttonContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  cancelButton: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '600',
  },
});
