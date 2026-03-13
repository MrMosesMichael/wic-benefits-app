/**
 * Directions Service — Map app selection for navigation
 *
 * Provides a user-facing chooser for Apple Maps, Google Maps, or Waze
 * when opening directions on iOS. On Android, the system intent chooser
 * handles this natively via the geo: URI scheme.
 */
import { Linking, Platform, ActionSheetIOS } from 'react-native';

interface DirectionsOptions {
  /** Street address for directions */
  address: string;
  /** Latitude (used for Android geo: URI and Waze) */
  latitude?: number;
  /** Longitude (used for Android geo: URI and Waze) */
  longitude?: number;
}

interface MapApp {
  name: string;
  /** Returns the URL to open for this map app */
  getUrl: (options: DirectionsOptions) => string;
  /** Check if the app can be opened (scheme is registered) */
  checkUrl: string;
}

const MAP_APPS: MapApp[] = [
  {
    name: 'Apple Maps',
    getUrl: ({ address }) => `maps://app?daddr=${encodeURIComponent(address)}`,
    checkUrl: 'maps://',
  },
  {
    name: 'Google Maps',
    getUrl: ({ address }) =>
      `comgooglemaps://?daddr=${encodeURIComponent(address)}&directionsmode=driving`,
    checkUrl: 'comgooglemaps://',
  },
  {
    name: 'Waze',
    getUrl: ({ address, latitude, longitude }) => {
      if (latitude !== undefined && longitude !== undefined) {
        return `waze://?ll=${latitude},${longitude}&navigate=yes`;
      }
      return `waze://?q=${encodeURIComponent(address)}&navigate=yes`;
    },
    checkUrl: 'waze://',
  },
];

/**
 * Open directions to a destination, presenting a map app chooser on iOS.
 * On Android, the geo: intent system handles app selection natively.
 */
export async function openDirections(options: DirectionsOptions): Promise<void> {
  if (Platform.OS === 'android') {
    // Android handles app selection via the system intent chooser
    const { address, latitude, longitude } = options;
    let url: string;
    if (latitude !== undefined && longitude !== undefined) {
      url = `geo:${latitude},${longitude}?q=${encodeURIComponent(address)}`;
    } else {
      url = `geo:0,0?q=${encodeURIComponent(address)}`;
    }
    await Linking.openURL(url);
    return;
  }

  // iOS: Check which map apps are available
  const availableApps: MapApp[] = [];
  for (const app of MAP_APPS) {
    try {
      const canOpen = await Linking.canOpenURL(app.checkUrl);
      if (canOpen) {
        availableApps.push(app);
      }
    } catch {
      // App not available
    }
  }

  // If only one app available (likely just Apple Maps), open directly
  if (availableApps.length <= 1) {
    const app = availableApps[0] || MAP_APPS[0]; // Fallback to Apple Maps
    await Linking.openURL(app.getUrl(options));
    return;
  }

  // Multiple apps available: show chooser
  const appNames = availableApps.map((a) => a.name);

  ActionSheetIOS.showActionSheetWithOptions(
    {
      options: [...appNames, 'Cancel'],
      cancelButtonIndex: appNames.length,
      title: 'Open Directions In',
    },
    (buttonIndex) => {
      if (buttonIndex < availableApps.length) {
        const selectedApp = availableApps[buttonIndex];
        Linking.openURL(selectedApp.getUrl(options));
      }
    }
  );
}
