/**
 * Permissions Utilities
 * Helper functions for managing location permissions
 */

import { Alert, Linking, Platform } from 'react-native';
import { LocationPermissionStatus } from '../types/store.types';

/**
 * Show alert to guide user to settings
 */
export const showPermissionSettingsAlert = (): void => {
  Alert.alert(
    'Location Permission Required',
    'To detect your store automatically, please enable location access in your device settings.',
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Open Settings',
        onPress: openAppSettings,
      },
    ]
  );
};

/**
 * Open app settings
 */
export const openAppSettings = async (): Promise<void> => {
  try {
    if (Platform.OS === 'ios') {
      await Linking.openURL('app-settings:');
    } else {
      await Linking.openSettings();
    }
  } catch (error) {
    console.error('Failed to open settings:', error);
    Alert.alert('Error', 'Could not open settings');
  }
};

/**
 * Get user-friendly permission status message
 */
export const getPermissionStatusMessage = (
  status: LocationPermissionStatus
): string => {
  if (status.granted) {
    return 'Location access enabled';
  } else if (status.blocked) {
    return 'Location access blocked. Enable in Settings.';
  } else if (status.canAskAgain) {
    return 'Location access needed for store detection';
  } else {
    return 'Location access denied';
  }
};

/**
 * Check if we should show permission rationale
 */
export const shouldShowPermissionRationale = (
  status: LocationPermissionStatus
): boolean => {
  return !status.granted && status.canAskAgain;
};

/**
 * Show permission rationale dialog
 */
export const showPermissionRationale = (
  onAccept: () => void,
  onDecline?: () => void
): void => {
  Alert.alert(
    'Location Access',
    'WIC Benefits Assistant uses your location to:\n\n' +
      '• Automatically detect which store you are shopping at\n' +
      '• Show store-specific inventory and availability\n' +
      '• Provide nearby store recommendations\n\n' +
      'Your location is only used for store detection and is not stored long-term or shared with third parties.',
    [
      {
        text: 'Not Now',
        style: 'cancel',
        onPress: onDecline,
      },
      {
        text: 'Allow',
        onPress: onAccept,
      },
    ]
  );
};
