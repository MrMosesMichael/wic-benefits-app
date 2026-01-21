/**
 * Client-side Example: Using Store Search API
 * This file demonstrates how to call the store search API from a React Native app
 */

import { StoreSearchResponse } from './types';

/**
 * Store Search API Client
 */
export class StoreSearchClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Search for stores near a location
   *
   * @param lat Latitude
   * @param lng Longitude
   * @param options Search options
   * @returns Store search results
   */
  async searchStores(
    lat: number,
    lng: number,
    options?: {
      radiusMiles?: number;
      wicAuthorizedOnly?: boolean;
      limit?: number;
      offset?: number;
      state?: string;
      features?: string[];
    }
  ): Promise<StoreSearchResponse> {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
    });

    if (options?.radiusMiles !== undefined) {
      params.append('radiusMiles', options.radiusMiles.toString());
    }
    if (options?.wicAuthorizedOnly !== undefined) {
      params.append('wicAuthorizedOnly', options.wicAuthorizedOnly.toString());
    }
    if (options?.limit !== undefined) {
      params.append('limit', options.limit.toString());
    }
    if (options?.offset !== undefined) {
      params.append('offset', options.offset.toString());
    }
    if (options?.state) {
      params.append('state', options.state);
    }
    if (options?.features && options.features.length > 0) {
      params.append('features', options.features.join(','));
    }

    const url = `${this.baseUrl}/api/stores/search?${params.toString()}`;

    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to search stores');
    }

    return response.json();
  }

  /**
   * Get all stores within radius, handling pagination automatically
   */
  async getAllStoresInRadius(
    lat: number,
    lng: number,
    radiusMiles: number = 10,
    options?: {
      wicAuthorizedOnly?: boolean;
      state?: string;
      features?: string[];
    }
  ): Promise<StoreSearchResponse['stores']> {
    const allStores: StoreSearchResponse['stores'] = [];
    let offset = 0;
    const limit = 100; // Max per request
    let hasMore = true;

    while (hasMore) {
      const response = await this.searchStores(lat, lng, {
        radiusMiles,
        limit,
        offset,
        ...options,
      });

      allStores.push(...response.stores);
      hasMore = response.hasMore;
      offset += limit;
    }

    return allStores;
  }
}

/**
 * React Native Hook Example
 * Custom hook for searching stores in a React Native component
 */
export function useStoreSearch(apiBaseUrl: string = 'http://localhost:3000') {
  const client = new StoreSearchClient(apiBaseUrl);

  /**
   * Search stores near user's location
   */
  const searchNearby = async (
    latitude: number,
    longitude: number,
    radiusMiles: number = 10,
    features?: string[]
  ) => {
    try {
      const result = await client.searchStores(latitude, longitude, {
        radiusMiles,
        wicAuthorizedOnly: true,
        features,
        limit: 20,
      });

      return result;
    } catch (error) {
      console.error('Failed to search stores:', error);
      throw error;
    }
  };

  return { searchNearby };
}

/**
 * Usage Example in React Native Component
 */
/*
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList } from 'react-native';
import * as Location from 'expo-location';

function StoreFinderScreen() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const { searchNearby } = useStoreSearch('https://api.wicbenefits.app');

  useEffect(() => {
    async function loadStores() {
      try {
        // Get user location
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.error('Location permission denied');
          return;
        }

        const location = await Location.getCurrentPositionAsync({});

        // Search for stores with pharmacy
        const result = await searchNearby(
          location.coords.latitude,
          location.coords.longitude,
          10,
          ['hasPharmacy']
        );

        setStores(result.stores);
      } catch (error) {
        console.error('Error loading stores:', error);
      } finally {
        setLoading(false);
      }
    }

    loadStores();
  }, []);

  if (loading) {
    return <Text>Loading stores...</Text>;
  }

  return (
    <FlatList
      data={stores}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <View>
          <Text>{item.name}</Text>
          <Text>{item.address.street}, {item.address.city}</Text>
          <Text>{item.distanceMiles.toFixed(1)} miles away</Text>
        </View>
      )}
    />
  );
}
*/
