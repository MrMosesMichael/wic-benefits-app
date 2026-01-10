/**
 * WiFi Permission Utilities
 * Handles platform-specific WiFi scanning permissions
 */

import { Platform, PermissionsAndroid, Linking } from 'react-native';

export interface WiFiPermissionResult {
  granted: boolean;
  canRequest: boolean;
  message?: string;
}

/**
 * Check if WiFi scanning permission is granted
 * On Android: Requires ACCESS_FINE_LOCATION
 * On iOS: WiFi info available without explicit permission
 */
export async function checkWiFiPermission(): Promise<WiFiPermissionResult> {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );

      return {
        granted,
        canRequest: !granted,
        message: granted
          ? 'WiFi scanning permission granted'
          : 'WiFi scanning requires location permission',
      };
    } catch (error) {
      console.error('Error checking WiFi permission:', error);
      return {
        granted: false,
        canRequest: false,
        message: 'Failed to check permission',
      };
    }
  } else if (Platform.OS === 'ios') {
    // iOS doesn't require explicit WiFi permission
    // WiFi info is available through network APIs
    return {
      granted: true,
      canRequest: false,
      message: 'WiFi info available on iOS',
    };
  }

  // Other platforms
  return {
    granted: false,
    canRequest: false,
    message: 'Platform not supported',
  };
}

/**
 * Request WiFi scanning permission
 * On Android: Requests ACCESS_FINE_LOCATION
 * On iOS: No request needed
 */
export async function requestWiFiPermission(): Promise<WiFiPermissionResult> {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission Required',
          message:
            'This app needs location permission to scan WiFi networks for improved store detection. ' +
            'Your location is used only to identify which store you are shopping at.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );

      const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;

      return {
        granted: isGranted,
        canRequest: granted === PermissionsAndroid.RESULTS.DENIED,
        message: isGranted
          ? 'WiFi scanning permission granted'
          : granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
          ? 'Permission permanently denied. Enable in device settings.'
          : 'WiFi scanning permission denied',
      };
    } catch (error) {
      console.error('Error requesting WiFi permission:', error);
      return {
        granted: false,
        canRequest: false,
        message: 'Failed to request permission',
      };
    }
  } else if (Platform.OS === 'ios') {
    // iOS doesn't require explicit WiFi permission
    return {
      granted: true,
      canRequest: false,
      message: 'WiFi info available on iOS',
    };
  }

  // Other platforms
  return {
    granted: false,
    canRequest: false,
    message: 'Platform not supported',
  };
}

/**
 * Check and request WiFi permission if needed
 * Convenience function that combines check + request
 */
export async function ensureWiFiPermission(): Promise<WiFiPermissionResult> {
  // First check if already granted
  const checkResult = await checkWiFiPermission();

  if (checkResult.granted) {
    return checkResult;
  }

  // If not granted and can request, request permission
  if (checkResult.canRequest) {
    return await requestWiFiPermission();
  }

  // Cannot request (permanently denied or platform issue)
  return checkResult;
}

/**
 * Open device settings for manual permission grant
 * Useful when permission is permanently denied
 */
export async function openWiFiPermissionSettings(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.error('Failed to open Android settings:', error);
    }
  } else if (Platform.OS === 'ios') {
    try {
      await Linking.openURL('app-settings:');
    } catch (error) {
      console.error('Failed to open iOS settings:', error);
    }
  }
}

/**
 * Get user-friendly permission status message
 */
export function getWiFiPermissionStatusMessage(
  result: WiFiPermissionResult
): string {
  if (result.granted) {
    return 'WiFi-based store detection is enabled';
  }

  if (result.canRequest) {
    return 'Grant location permission to enable WiFi-based store detection for better accuracy';
  }

  return (
    result.message ||
    'WiFi detection unavailable. Check app settings to enable location permission.'
  );
}

/**
 * Check if WiFi scanning is actually functional
 * Verifies both permission and platform support
 */
export async function isWiFiScanningAvailable(): Promise<{
  available: boolean;
  reason?: string;
}> {
  // Check platform support
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return {
      available: false,
      reason: 'WiFi scanning not supported on this platform',
    };
  }

  // Check permission
  const permissionResult = await checkWiFiPermission();
  if (!permissionResult.granted) {
    return {
      available: false,
      reason: 'Location permission required for WiFi scanning',
    };
  }

  // All checks passed
  return {
    available: true,
  };
}
