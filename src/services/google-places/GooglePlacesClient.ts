/**
 * Google Places API Client
 *
 * Low-level HTTP client for Google Places API and Geocoding API
 */

import axios, { AxiosInstance } from 'axios';
import { getGooglePlacesConfig, validateGooglePlacesConfig } from '../../config/google-places.config';
import {
  GoogleGeocodingResponse,
  GooglePlaceSearchResponse,
  GooglePlaceDetailsResponse,
} from './types';

export class GooglePlacesClient {
  private config = getGooglePlacesConfig();
  private client: AxiosInstance;
  private lastRequestTime = 0;

  constructor() {
    if (!validateGooglePlacesConfig(this.config)) {
      throw new Error('[GooglePlacesClient] Invalid configuration');
    }

    this.client = axios.create({
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Rate limiting: ensure minimum delay between requests
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.config.requestDelayMs) {
      const waitTime = this.config.requestDelayMs - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Geocode an address to coordinates
   */
  async geocode(address: string): Promise<GoogleGeocodingResponse> {
    await this.enforceRateLimit();

    try {
      const response = await this.client.get<GoogleGeocodingResponse>(
        this.config.geocodingEndpoint,
        {
          params: {
            address,
            key: this.config.apiKey,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('[GooglePlacesClient] Geocoding error:', error);
      throw error;
    }
  }

  /**
   * Find a place by text search (name + address)
   */
  async findPlace(query: string, inputType: 'textquery' = 'textquery'): Promise<GooglePlaceSearchResponse> {
    await this.enforceRateLimit();

    try {
      const response = await this.client.get<GooglePlaceSearchResponse>(
        this.config.placeSearchEndpoint,
        {
          params: {
            input: query,
            inputtype: inputType,
            fields: 'place_id,name,formatted_address,geometry',
            key: this.config.apiKey,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('[GooglePlacesClient] Place search error:', error);
      throw error;
    }
  }

  /**
   * Get detailed information about a place
   */
  async getPlaceDetails(placeId: string): Promise<GooglePlaceDetailsResponse> {
    await this.enforceRateLimit();

    try {
      const response = await this.client.get<GooglePlaceDetailsResponse>(
        this.config.placeDetailsEndpoint,
        {
          params: {
            place_id: placeId,
            fields: [
              'place_id',
              'name',
              'formatted_address',
              'formatted_phone_number',
              'international_phone_number',
              'website',
              'opening_hours',
              'geometry',
              'rating',
              'user_ratings_total',
              'photos',
              'business_status',
              'types',
            ].join(','),
            key: this.config.apiKey,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('[GooglePlacesClient] Place details error:', error);
      throw error;
    }
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try a simple geocoding request
      const response = await this.geocode('1600 Amphitheatre Parkway, Mountain View, CA');
      return response.status === 'OK';
    } catch (error) {
      console.error('[GooglePlacesClient] Connection test failed:', error);
      return false;
    }
  }
}
