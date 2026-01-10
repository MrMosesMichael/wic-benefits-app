/**
 * WiFi + GPS Store Detection Example
 * Demonstrates Task H3: WiFi-based location hints combined with GPS
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Button, ScrollView } from 'react-native';
import StoreDetectionService from '../services/StoreDetectionService';
import WiFiService, { WiFiScanResult } from '../services/WiFiService';
import { Store, StoreDetectionResult } from '../types/store.types';

const WiFiStoreDetectionExample: React.FC = () => {
  const [detectionResult, setDetectionResult] = useState<StoreDetectionResult | null>(null);
  const [wifiNetworks, setWifiNetworks] = useState<WiFiScanResult[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  // Use useMemo to create services only once
  const storeDetectionService = useMemo(
    () =>
      StoreDetectionService.getInstance({
        enableWifiMatching: true,
        maxDistanceMeters: 100,
      }),
    []
  );

  const wifiService = useMemo(() => WiFiService.getInstance(), []);

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Mock store data with WiFi networks
  const mockStores: Store[] = [
    {
      id: 'store-1',
      name: 'Walmart Supercenter',
      chain: 'Walmart',
      address: {
        street: '123 Main St',
        city: 'Detroit',
        state: 'MI',
        zip: '48201',
        country: 'USA',
      },
      location: { lat: 42.3314, lng: -83.0458 },
      wicAuthorized: true,
      timezone: 'America/Detroit',
      hours: [],
      features: { acceptsWic: true },
      inventoryApiAvailable: true,
      inventoryApiType: 'walmart',
      lastVerified: new Date(),
      dataSource: 'api',
      active: true,
      wifiNetworks: [
        { ssid: 'Walmart WiFi', bssid: 'AA:BB:CC:DD:EE:01' },
        { ssid: 'Walmart Guest', bssid: 'AA:BB:CC:DD:EE:02' },
      ],
    },
    {
      id: 'store-2',
      name: 'Kroger',
      chain: 'Kroger',
      address: {
        street: '456 Oak Ave',
        city: 'Detroit',
        state: 'MI',
        zip: '48202',
        country: 'USA',
      },
      location: { lat: 42.3320, lng: -83.0465 },
      wicAuthorized: true,
      timezone: 'America/Detroit',
      hours: [],
      features: { acceptsWic: true },
      inventoryApiAvailable: true,
      inventoryApiType: 'kroger',
      lastVerified: new Date(),
      dataSource: 'api',
      active: true,
      wifiNetworks: [
        { ssid: 'Kroger_Free_WiFi', bssid: 'BB:CC:DD:EE:FF:01' },
      ],
    },
  ];

  useEffect(() => {
    // Initialize mock store data
    storeDetectionService.updateStoreCache(mockStores);
    addLog('Store detection service initialized');
  }, [storeDetectionService]);

  const handleDetectStore = async () => {
    setIsDetecting(true);
    addLog('Starting store detection...');

    try {
      // Scan WiFi networks first
      addLog('Scanning WiFi networks...');
      const networks = await wifiService.scanNetworks();
      setWifiNetworks(networks);

      if (networks.length > 0) {
        addLog(`Found ${networks.length} WiFi network(s)`);
        networks.forEach((network) => {
          addLog(`  - ${network.ssid} (${network.bssid})`);
        });
      } else {
        addLog('No WiFi networks detected');
      }

      // Perform store detection (GPS + WiFi)
      addLog('Performing combined GPS + WiFi detection...');
      const result = await storeDetectionService.detectStore();
      setDetectionResult(result);

      if (result.store) {
        addLog(`✓ Store detected: ${result.store.name}`);
        addLog(`  Method: ${result.method}`);
        addLog(`  Confidence: ${result.confidence}%`);
        if (result.distanceMeters !== undefined) {
          addLog(`  Distance: ${result.distanceMeters.toFixed(1)}m`);
        }
        if (result.insideGeofence !== undefined) {
          addLog(`  Inside geofence: ${result.insideGeofence ? 'Yes' : 'No'}`);
        }
      } else {
        addLog('✗ No store detected');
        if (result.nearbyStores && result.nearbyStores.length > 0) {
          addLog(`Found ${result.nearbyStores.length} nearby store(s)`);
        }
      }
    } catch (error) {
      addLog(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleSimulateWiFiMatch = async () => {
    addLog('Simulating WiFi match for Walmart...');

    // Simulate WiFi network scan result
    const mockWifiNetwork: WiFiScanResult = {
      ssid: 'Walmart WiFi',
      bssid: 'AA:BB:CC:DD:EE:01',
      signalStrength: -65, // Good signal
      timestamp: new Date(),
    };

    wifiService.updateCurrentNetwork(mockWifiNetwork);
    setWifiNetworks([mockWifiNetwork]);
    addLog(`Simulated WiFi: ${mockWifiNetwork.ssid} (signal: ${mockWifiNetwork.signalStrength} dBm)`);

    // Detect store with WiFi hint
    const result = await storeDetectionService.detectStore();
    setDetectionResult(result);

    if (result.store) {
      addLog(`✓ Store detected via WiFi: ${result.store.name}`);
      addLog(`  Confidence: ${result.confidence}%`);
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>WiFi + GPS Store Detection</Text>
      <Text style={styles.subtitle}>Task H3: WiFi-based location hints</Text>

      {/* Detection Result */}
      {detectionResult && detectionResult.store && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Detected Store</Text>
          <Text style={styles.storeName}>{detectionResult.store.name}</Text>
          <Text style={styles.storeAddress}>
            {detectionResult.store.address.street}, {detectionResult.store.address.city}
          </Text>

          <View style={styles.metrics}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Method</Text>
              <Text style={styles.metricValue}>{detectionResult.method.toUpperCase()}</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Confidence</Text>
              <Text style={styles.metricValue}>{detectionResult.confidence}%</Text>
            </View>
            {detectionResult.distanceMeters !== undefined && (
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Distance</Text>
                <Text style={styles.metricValue}>
                  {detectionResult.distanceMeters.toFixed(0)}m
                </Text>
              </View>
            )}
          </View>

          {detectionResult.insideGeofence !== undefined && (
            <Text style={styles.geofenceStatus}>
              {detectionResult.insideGeofence ? '✓' : '✗'} Inside Geofence
            </Text>
          )}
        </View>
      )}

      {/* WiFi Networks */}
      {wifiNetworks.length > 0 && (
        <View style={styles.wifiCard}>
          <Text style={styles.cardTitle}>WiFi Networks ({wifiNetworks.length})</Text>
          {wifiNetworks.map((network, index) => (
            <View key={index} style={styles.wifiNetwork}>
              <Text style={styles.wifiSsid}>{network.ssid}</Text>
              <Text style={styles.wifiBssid}>{network.bssid}</Text>
              {network.signalStrength && (
                <Text style={styles.wifiSignal}>Signal: {network.signalStrength} dBm</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        <Button
          title={isDetecting ? 'Detecting...' : 'Detect Store (GPS + WiFi)'}
          onPress={handleDetectStore}
          disabled={isDetecting}
        />
        <View style={styles.buttonSpacer} />
        <Button
          title="Simulate WiFi Match"
          onPress={handleSimulateWiFiMatch}
          disabled={isDetecting}
        />
      </View>

      {/* Logs */}
      <View style={styles.logsCard}>
        <View style={styles.logsHeader}>
          <Text style={styles.cardTitle}>Detection Logs</Text>
          <Button title="Clear" onPress={handleClearLogs} />
        </View>
        <ScrollView style={styles.logsScroll}>
          {logs.map((log, index) => (
            <Text key={index} style={styles.logEntry}>
              {log}
            </Text>
          ))}
        </ScrollView>
      </View>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>How WiFi Detection Works:</Text>
        <Text style={styles.infoText}>
          1. Scans for nearby WiFi networks{'\n'}
          2. Matches WiFi SSIDs/BSSIDs to store database{'\n'}
          3. Combines WiFi signals with GPS location{'\n'}
          4. Provides higher confidence when both methods agree{'\n'}
          5. Falls back to GPS-only if no WiFi match found
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  resultCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  storeName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  storeAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  metrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  metric: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  geofenceStatus: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginTop: 8,
  },
  wifiCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  wifiNetwork: {
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
    paddingLeft: 12,
    marginBottom: 12,
  },
  wifiSsid: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  wifiBssid: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  wifiSignal: {
    fontSize: 12,
    color: '#28a745',
    marginTop: 2,
  },
  controls: {
    marginBottom: 16,
  },
  buttonSpacer: {
    height: 8,
  },
  logsCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  logsScroll: {
    maxHeight: 200,
  },
  logEntry: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
    color: '#333',
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1976d2',
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#333',
  },
});

export default WiFiStoreDetectionExample;
