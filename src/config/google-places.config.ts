/**
 * Google Places API Configuration
 *
 * Configuration for Google Places API and Geocoding API integration
 */

export interface GooglePlacesConfig {
  apiKey: string;
  geocodingEndpoint: string;
  placesEndpoint: string;
  placeDetailsEndpoint: string;
  placeSearchEndpoint: string;
  maxRetries: number;
  requestDelayMs: number;
  timeout: number;
}

/**
 * Get Google Places API configuration from environment
 */
export function getGooglePlacesConfig(): GooglePlacesConfig {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || '';

  if (!apiKey) {
    console.warn('[GooglePlaces] GOOGLE_PLACES_API_KEY not set in environment');
  }

  return {
    apiKey,
    geocodingEndpoint: 'https://maps.googleapis.com/maps/api/geocode/json',
    placesEndpoint: 'https://maps.googleapis.com/maps/api/place',
    placeDetailsEndpoint: 'https://maps.googleapis.com/maps/api/place/details/json',
    placeSearchEndpoint: 'https://maps.googleapis.com/maps/api/place/findplacefromtext/json',
    maxRetries: 3,
    requestDelayMs: 100, // Rate limiting: max 10 req/sec
    timeout: 10000,
  };
}

/**
 * Validate Google Places API configuration
 */
export function validateGooglePlacesConfig(config: GooglePlacesConfig): boolean {
  if (!config.apiKey) {
    console.error('[GooglePlaces] API key is required');
    return false;
  }

  if (!config.geocodingEndpoint || !config.placeSearchEndpoint) {
    console.error('[GooglePlaces] API endpoints not configured');
    return false;
  }

  return true;
}
