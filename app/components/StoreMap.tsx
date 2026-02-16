import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import type { StoreFinderStore } from '@/lib/services/storeFinderService';

interface StoreMapProps {
  stores: StoreFinderStore[];
  userLocation: { lat: number; lng: number } | null;
  onStorePress?: (store: StoreFinderStore) => void;
  style?: any;
}

export default function StoreMap({ stores, userLocation, onStorePress, style }: StoreMapProps) {
  const initialRegion: Region = {
    latitude: userLocation?.lat ?? 42.3314,
    longitude: userLocation?.lng ?? -83.0458,
    latitudeDelta: 0.15,
    longitudeDelta: 0.15,
  };

  return (
    <View style={[styles.container, style]}>
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton
      >
        {stores.map(store => (
          <Marker
            key={store.id || `${store.name}-${store.address?.street}`}
            coordinate={{
              latitude: store.location.latitude,
              longitude: store.location.longitude,
            }}
            title={store.name}
            description={store.address ? `${store.address.street}, ${store.address.city}` : ''}
            onCalloutPress={() => onStorePress?.(store)}
          />
        ))}
      </MapView>
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
    minHeight: 300,
  },
});
