/**
 * WiFi Service
 * Provides WiFi network scanning for store detection
 *
 * Note: WiFi scanning requires platform-specific native modules
 * - iOS: NEHotspotHelper (requires special entitlements)
 * - Android: WifiManager (requires ACCESS_FINE_LOCATION permission)
 */

import { Platform } from 'react-native';
import { WiFiNetwork } from '../types/store.types';

export interface WiFiScanResult extends WiFiNetwork {
  signalStrength?: number; // RSSI in dBm
  frequency?: number; // WiFi frequency in MHz (2400 or 5000 range)
  timestamp: Date;
}

export interface WiFiServiceConfig {
  scanIntervalMs?: number; // How often to scan for networks
  signalThreshold?: number; // Minimum signal strength (RSSI)
}

/**
 * WiFi Service for detecting store WiFi networks
 * Supplements GPS-based store detection
 */
export class WiFiService {
  private static instance: WiFiService;
  private config: WiFiServiceConfig;
  private isScanning: boolean = false;
  private scanInterval: NodeJS.Timeout | null = null;
  private lastScanResult: WiFiScanResult[] = [];
  private currentNetwork: WiFiScanResult | null = null;

  private constructor(config?: WiFiServiceConfig) {
    this.config = {
      scanIntervalMs: config?.scanIntervalMs ?? 30000, // Scan every 30 seconds
      signalThreshold: config?.signalThreshold ?? -80, // Minimum RSSI -80 dBm
    };
  }

  public static getInstance(config?: WiFiServiceConfig): WiFiService {
    if (!WiFiService.instance) {
      WiFiService.instance = new WiFiService(config);
    }
    return WiFiService.instance;
  }

  /**
   * Check if WiFi scanning is supported on this platform
   */
  public isSupported(): boolean {
    // WiFi scanning requires native modules
    // In a real implementation, check if the native module is available
    return Platform.OS === 'android' || Platform.OS === 'ios';
  }

  /**
   * Get currently connected WiFi network
   */
  public async getCurrentNetwork(): Promise<WiFiScanResult | null> {
    try {
      if (!this.isSupported()) {
        console.warn('WiFi scanning not supported on this platform');
        return null;
      }

      // TODO: Implement native module call to get current WiFi network
      // This is a placeholder for the actual implementation

      // On Android: Use WifiManager.getConnectionInfo()
      // On iOS: Use NEHotspotHelper or CaptiveNetwork API

      // For now, return cached result or null
      return this.currentNetwork;
    } catch (error) {
      console.error('Failed to get current WiFi network:', error);
      return null;
    }
  }

  /**
   * Scan for nearby WiFi networks
   * Returns list of visible networks sorted by signal strength
   */
  public async scanNetworks(): Promise<WiFiScanResult[]> {
    try {
      if (!this.isSupported()) {
        console.warn('WiFi scanning not supported on this platform');
        return [];
      }

      // TODO: Implement native module call to scan WiFi networks
      // This is a placeholder for the actual implementation

      // On Android:
      // 1. Check ACCESS_FINE_LOCATION permission
      // 2. Call WifiManager.startScan()
      // 3. Register BroadcastReceiver for SCAN_RESULTS_AVAILABLE_ACTION
      // 4. Call WifiManager.getScanResults()

      // On iOS:
      // iOS doesn't allow scanning for all networks, only connected network
      // This is a platform limitation for privacy reasons

      const scanResults: WiFiScanResult[] = [];

      // Get current network as fallback
      const currentNetwork = await this.getCurrentNetwork();
      if (currentNetwork) {
        scanResults.push(currentNetwork);
      }

      this.lastScanResult = scanResults;
      return scanResults;
    } catch (error) {
      console.error('WiFi scan failed:', error);
      return [];
    }
  }

  /**
   * Start continuous WiFi scanning
   * Useful for background store detection
   */
  public startContinuousScanning(
    onNetworkChange: (networks: WiFiScanResult[]) => void,
    onError?: (error: Error) => void
  ): void {
    if (this.isScanning) {
      console.warn('WiFi scanning already in progress');
      return;
    }

    this.isScanning = true;

    // Perform initial scan
    this.scanNetworks()
      .then(onNetworkChange)
      .catch((error) => {
        if (onError) {
          onError(error instanceof Error ? error : new Error('Scan failed'));
        }
      });

    // Set up periodic scanning
    this.scanInterval = setInterval(async () => {
      try {
        // Store previous results before scanning
        const previousResults = [...this.lastScanResult];
        const networks = await this.scanNetworks();

        // Only notify if networks changed
        if (this.hasNetworksChanged(networks, previousResults)) {
          onNetworkChange(networks);
        }
      } catch (error) {
        if (onError) {
          onError(error instanceof Error ? error : new Error('Scan failed'));
        }
      }
    }, this.config.scanIntervalMs);
  }

  /**
   * Stop continuous WiFi scanning
   */
  public stopContinuousScanning(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    this.isScanning = false;
  }

  /**
   * Check if WiFi networks list has changed
   */
  private hasNetworksChanged(
    newNetworks: WiFiScanResult[],
    oldNetworks: WiFiScanResult[]
  ): boolean {
    if (newNetworks.length !== oldNetworks.length) {
      return true;
    }

    // Check if same networks (by BSSID)
    const newBSSIDs = new Set(newNetworks.map((n) => n.bssid));
    const oldBSSIDs = new Set(oldNetworks.map((n) => n.bssid));

    for (const bssid of newBSSIDs) {
      if (!oldBSSIDs.has(bssid)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Filter networks by signal strength threshold
   */
  public filterBySignalStrength(
    networks: WiFiScanResult[],
    threshold?: number
  ): WiFiScanResult[] {
    const rssiThreshold = threshold ?? this.config.signalThreshold ?? -80;
    return networks.filter(
      (network) =>
        network.signalStrength !== undefined &&
        network.signalStrength >= rssiThreshold
    );
  }

  /**
   * Get strongest network from list
   */
  public getStrongestNetwork(
    networks: WiFiScanResult[]
  ): WiFiScanResult | null {
    if (networks.length === 0) {
      return null;
    }

    return networks.reduce((strongest, current) => {
      if (!strongest.signalStrength) return current;
      if (!current.signalStrength) return strongest;
      return current.signalStrength > strongest.signalStrength
        ? current
        : strongest;
    });
  }

  /**
   * Match WiFi networks to store WiFi database
   */
  public matchNetworksToStores(
    scannedNetworks: WiFiScanResult[],
    storeWifiData: Map<string, WiFiNetwork[]> // Map of storeId -> WiFi networks
  ): Array<{ storeId: string; matchedNetwork: WiFiScanResult; confidence: number }> {
    const matches: Array<{ storeId: string; matchedNetwork: WiFiScanResult; confidence: number }> = [];

    for (const scannedNetwork of scannedNetworks) {
      // Validate scanned network has required fields
      if (!scannedNetwork.ssid && !scannedNetwork.bssid) {
        console.warn('Skipping invalid WiFi network with no SSID or BSSID');
        continue;
      }

      for (const [storeId, storeNetworks] of storeWifiData.entries()) {
        const matchedStoreNetwork = storeNetworks.find(
          (storeNetwork) =>
            (scannedNetwork.ssid && storeNetwork.ssid === scannedNetwork.ssid) ||
            (scannedNetwork.bssid && storeNetwork.bssid === scannedNetwork.bssid)
        );

        if (matchedStoreNetwork) {
          // Calculate confidence based on signal strength
          let confidence = 50; // Base confidence for WiFi match

          if (scannedNetwork.signalStrength) {
            // Strong signal (>-60 dBm) = high confidence
            if (scannedNetwork.signalStrength > -60) {
              confidence = 95;
            } else if (scannedNetwork.signalStrength > -70) {
              confidence = 85;
            } else if (scannedNetwork.signalStrength > -80) {
              confidence = 70;
            } else {
              confidence = 50; // Weak signal
            }
          }

          // BSSID match is more precise than SSID match
          if (scannedNetwork.bssid && matchedStoreNetwork.bssid === scannedNetwork.bssid) {
            confidence = Math.min(100, confidence + 10);
          }

          matches.push({
            storeId,
            matchedNetwork: scannedNetwork,
            confidence,
          });
        }
      }
    }

    // Sort by confidence (highest first)
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Request WiFi permission (Android)
   * On Android 6.0+, WiFi scanning requires location permission
   */
  public async requestPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        // TODO: Implement permission request using PermissionsAndroid
        // This is handled by LocationService in practice
        // WiFi scanning requires ACCESS_FINE_LOCATION on Android
        return true; // Placeholder
      } else if (Platform.OS === 'ios') {
        // iOS doesn't require separate WiFi permission
        // WiFi info is available when using the device
        return true;
      }
      return false;
    } catch (error) {
      console.error('WiFi permission request failed:', error);
      return false;
    }
  }

  /**
   * Update cached current network
   */
  public updateCurrentNetwork(network: WiFiScanResult | null): void {
    this.currentNetwork = network;
  }

  /**
   * Get last scan results
   */
  public getLastScanResults(): WiFiScanResult[] {
    return this.lastScanResult;
  }

  /**
   * Clear cached data
   */
  public clearCache(): void {
    this.lastScanResult = [];
    this.currentNetwork = null;
  }
}

export default WiFiService;
