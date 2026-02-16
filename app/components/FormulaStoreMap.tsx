import React from 'react';
import { View, Text, StyleSheet, Linking, Platform, TouchableOpacity } from 'react-native';
import MapView, { Marker, Callout, Region } from 'react-native-maps';
import type { CrossStoreResult } from '@/lib/types';

interface FormulaStoreMapProps {
  results: CrossStoreResult[];
  userLocation: { lat: number; lng: number } | null;
  onStorePress?: (store: CrossStoreResult) => void;
}

const getMarkerColor = (store: CrossStoreResult): string => {
  if (!store.availability) return '#9E9E9E'; // gray = unknown
  switch (store.availability.status) {
    case 'in_stock': return '#4CAF50';    // green
    case 'low_stock': return '#FF9800';   // orange
    case 'out_of_stock': return '#F44336'; // red
    default: return '#9E9E9E';            // gray
  }
};

const getStatusLabel = (store: CrossStoreResult): string => {
  if (!store.availability) return 'Unknown';
  switch (store.availability.status) {
    case 'in_stock': return 'In Stock';
    case 'low_stock': return 'Low Stock';
    case 'out_of_stock': return 'Out of Stock';
    default: return 'Unknown';
  }
};

export default function FormulaStoreMap({ results, userLocation, onStorePress }: FormulaStoreMapProps) {
  const defaultRegion: Region = {
    latitude: userLocation?.lat ?? 42.3314,
    longitude: userLocation?.lng ?? -83.0458,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  };

  // Calculate region to fit all markers
  const getRegion = (): Region => {
    if (results.length === 0) return defaultRegion;

    const lats = results.map(s => s.location.latitude);
    const lngs = results.map(s => s.location.longitude);
    if (userLocation) {
      lats.push(userLocation.lat);
      lngs.push(userLocation.lng);
    }

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max((maxLat - minLat) * 1.3, 0.05),
      longitudeDelta: Math.max((maxLng - minLng) * 1.3, 0.05),
    };
  };

  const handleDirections = (store: CrossStoreResult) => {
    const address = `${store.address.street}, ${store.address.city}, ${store.address.state} ${store.address.zip}`;
    const url = Platform.select({
      ios: `maps://app?daddr=${encodeURIComponent(address)}`,
      android: `geo:${store.location.latitude},${store.location.longitude}?q=${encodeURIComponent(address)}`,
    });
    if (url) Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={getRegion()}
        showsUserLocation
        showsMyLocationButton
      >
        {results.map((store) => {
          const color = getMarkerColor(store);
          const label = getStatusLabel(store);

          return (
            <Marker
              key={store.storeId}
              coordinate={{
                latitude: store.location.latitude,
                longitude: store.location.longitude,
              }}
              pinColor={color}
              title={store.name}
              description={`${label} - ${store.distanceMiles} mi`}
            >
              <Callout onPress={() => handleDirections(store)}>
                <View style={styles.callout}>
                  <Text style={styles.calloutName} numberOfLines={1}>{store.name}</Text>
                  <Text style={styles.calloutDistance}>{store.distanceMiles} mi away</Text>
                  <View style={[styles.calloutBadge, { backgroundColor: color + '20' }]}>
                    <View style={[styles.calloutDot, { backgroundColor: color }]} />
                    <Text style={[styles.calloutStatus, { color }]}>{label}</Text>
                  </View>
                  {store.wicAuthorized && (
                    <Text style={styles.calloutWic}>WIC Authorized</Text>
                  )}
                  <Text style={styles.calloutAction}>Tap for Directions</Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
          <Text style={styles.legendText}>In Stock</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
          <Text style={styles.legendText}>Low</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
          <Text style={styles.legendText}>Out</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#9E9E9E' }]} />
          <Text style={styles.legendText}>Unknown</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
    minHeight: 400,
  },
  callout: {
    minWidth: 160,
    maxWidth: 220,
    padding: 4,
  },
  calloutName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  calloutDistance: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  calloutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  calloutDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  calloutStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  calloutWic: {
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: '600',
    marginBottom: 4,
  },
  calloutAction: {
    fontSize: 11,
    color: '#1976D2',
    fontWeight: '500',
    marginTop: 4,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: '#666',
  },
});
