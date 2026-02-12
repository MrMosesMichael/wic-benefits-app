import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from '@/lib/i18n/I18nContext';

// API base URL
const API_BASE = __DEV__
  ? 'http://192.168.12.94:3000/api/v1'
  : 'https://mdmichael.com/wic/api/v1';

interface PrivacySummary {
  lastUpdated: string;
  dataCollected: Array<{
    category: string;
    description: string;
    required: boolean;
    retention: string;
  }>;
  dataNotCollected: string[];
  dataNeverSold: boolean;
  dataSharing: Array<{
    recipient: string;
    purpose: string;
  }>;
  yourRights: Array<{
    right: string;
    description: string;
    howTo: string;
  }>;
  contact: {
    email: string;
    purpose: string;
  };
}

export default function PrivacySettingsScreen() {
  const router = useRouter();
  const t = useTranslation();

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [privacySummary, setPrivacySummary] = useState<PrivacySummary | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    fetchPrivacySummary();
  }, []);

  const fetchPrivacySummary = async () => {
    try {
      const response = await fetch(`${API_BASE}/user/privacy-summary`);
      const data = await response.json();
      if (data.success) {
        setPrivacySummary(data.privacySummary);
      }
    } catch (error) {
      console.error('Failed to fetch privacy summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUserId = async (): Promise<string | null> => {
    // Get user ID from AsyncStorage or device ID
    const householdData = await AsyncStorage.getItem('@wic_household_data');
    if (householdData) {
      const parsed = JSON.parse(householdData);
      return parsed.userId || parsed.id || null;
    }
    return null;
  };

  const handleExportData = async () => {
    const userId = await getUserId();
    if (!userId) {
      Alert.alert(
        t('privacy.noDataTitle'),
        t('privacy.noDataMessage')
      );
      return;
    }

    setExporting(true);
    try {
      const response = await fetch(`${API_BASE}/user/export?user_id=${userId}`);
      const data = await response.json();

      if (data.success) {
        const exportJson = JSON.stringify(data.data, null, 2);

        if (Platform.OS === 'web') {
          // Web: Create downloadable file
          const blob = new Blob([exportJson], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `wic-data-export-${new Date().toISOString().split('T')[0]}.json`;
          a.click();
        } else {
          // Mobile: Share the data
          await Share.share({
            message: exportJson,
            title: t('privacy.exportTitle'),
          });
        }

        Alert.alert(
          t('privacy.exportSuccessTitle'),
          t('privacy.exportSuccessMessage')
        );
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to export data:', error);
      Alert.alert(
        t('common.error'),
        t('privacy.exportError')
      );
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    const userId = await getUserId();
    if (!userId) {
      Alert.alert(
        t('privacy.noDataTitle'),
        t('privacy.noDataMessage')
      );
      return;
    }

    // First confirmation
    Alert.alert(
      t('privacy.deleteTitle'),
      t('privacy.deleteWarning'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('privacy.deleteConfirm'),
          style: 'destructive',
          onPress: () => confirmDeletion(userId),
        },
      ]
    );
  };

  const confirmDeletion = (userId: string) => {
    // Second confirmation with typing requirement
    Alert.alert(
      t('privacy.finalDeleteTitle'),
      t('privacy.finalDeleteMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('privacy.permanentlyDelete'),
          style: 'destructive',
          onPress: () => performDeletion(userId),
        },
      ]
    );
  };

  const performDeletion = async (userId: string) => {
    setDeleting(true);
    try {
      const response = await fetch(`${API_BASE}/user/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          confirmation: 'DELETE_MY_ACCOUNT',
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Clear local storage
        await AsyncStorage.removeItem('@wic_household_data');
        await AsyncStorage.removeItem('wic_app_language');

        Alert.alert(
          t('privacy.deletedTitle'),
          t('privacy.deletedMessage'),
          [
            {
              text: t('common.ok'),
              onPress: () => router.replace('/'),
            },
          ]
        );
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to delete account:', error);
      Alert.alert(
        t('common.error'),
        t('privacy.deleteError')
      );
    } finally {
      setDeleting(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Your Rights */}
        <View style={styles.card}>
          <Text style={styles.cardTitle} accessibilityRole="header">{t('privacy.yourRights')}</Text>

          <TouchableOpacity
            style={[styles.actionButton, exporting && styles.actionButtonDisabled]}
            onPress={handleExportData}
            disabled={exporting}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.privacy.exportLabel')}
            accessibilityState={{ disabled: exporting }}
          >
            {exporting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.actionButtonIcon} accessible={false} importantForAccessibility="no">📥</Text>
                <View>
                  <Text style={styles.actionButtonText}>{t('privacy.exportData')}</Text>
                  <Text style={styles.actionButtonSubtext}>{t('privacy.exportDataDesc')}</Text>
                </View>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteButton, deleting && styles.actionButtonDisabled]}
            onPress={handleDeleteAccount}
            disabled={deleting}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.privacy.deleteLabel')}
            accessibilityState={{ disabled: deleting }}
          >
            {deleting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.actionButtonIcon} accessible={false} importantForAccessibility="no">🗑️</Text>
                <View>
                  <Text style={styles.deleteButtonText}>{t('privacy.deleteAccount')}</Text>
                  <Text style={styles.deleteButtonSubtext}>{t('privacy.deleteAccountDesc')}</Text>
                </View>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Data We Collect */}
        <TouchableOpacity
          style={styles.expandableCard}
          onPress={() => toggleSection('collected')}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.privacy.dataCollectedLabel')}
          accessibilityState={{ expanded: expandedSection === 'collected' }}
        >
          <View style={styles.expandableHeader}>
            <Text style={styles.cardTitle} accessibilityRole="header">{t('privacy.dataCollected')}</Text>
            <Text style={styles.expandIcon}>{expandedSection === 'collected' ? '▼' : '▶'}</Text>
          </View>
          {expandedSection === 'collected' && privacySummary && (
            <View style={styles.expandedContent}>
              {privacySummary.dataCollected.map((item, index) => (
                <View key={index} style={styles.dataItem}>
                  <Text style={styles.dataCategory}>{item.category}</Text>
                  <Text style={styles.dataDescription}>{item.description}</Text>
                  <Text style={styles.dataRetention}>
                    {t('privacy.retention')}: {item.retention}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </TouchableOpacity>

        {/* Data We Don't Collect */}
        <TouchableOpacity
          style={styles.expandableCard}
          onPress={() => toggleSection('notCollected')}
          accessibilityRole="button"
          accessibilityLabel={t('a11y.privacy.dataNotCollectedLabel')}
          accessibilityState={{ expanded: expandedSection === 'notCollected' }}
        >
          <View style={styles.expandableHeader}>
            <Text style={styles.cardTitle} accessibilityRole="header">{t('privacy.dataNotCollected')}</Text>
            <Text style={styles.expandIcon}>{expandedSection === 'notCollected' ? '▼' : '▶'}</Text>
          </View>
          {expandedSection === 'notCollected' && privacySummary && (
            <View style={styles.expandedContent}>
              {privacySummary.dataNotCollected.map((item, index) => (
                <Text key={index} style={styles.listItem}>✓ {item}</Text>
              ))}
            </View>
          )}
        </TouchableOpacity>

        {/* Data Sharing */}
        <View style={styles.card}>
          <Text style={styles.cardTitle} accessibilityRole="header">{t('privacy.dataSharing')}</Text>
          <View style={styles.neverSoldBadge}>
            <Text style={styles.neverSoldText}>🔒 {t('privacy.neverSold')}</Text>
          </View>
          <Text style={styles.sharingSummary}>{t('privacy.sharingSummary')}</Text>
        </View>

        {/* Contact */}
        <View style={styles.card}>
          <Text style={styles.cardTitle} accessibilityRole="header">{t('privacy.contact')}</Text>
          <Text style={styles.contactText}>
            {t('privacy.contactMessage')}
          </Text>
          <Text style={styles.contactEmail}>privacy@wicbenefits.app</Text>
        </View>

        {/* Last Updated */}
        {privacySummary && (
          <Text style={styles.lastUpdated}>
            {t('privacy.lastUpdated')}: {privacySummary.lastUpdated}
          </Text>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#2E7D32',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 24,
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
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
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D32F2F',
    padding: 16,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  expandableCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  expandableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expandIcon: {
    fontSize: 14,
    color: '#666',
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  dataItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dataCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  dataDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  dataRetention: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  listItem: {
    fontSize: 14,
    color: '#4CAF50',
    marginBottom: 8,
  },
  neverSoldBadge: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  neverSoldText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2E7D32',
    textAlign: 'center',
  },
  sharingSummary: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  contactText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  contactEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
  },
  lastUpdated: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
});
