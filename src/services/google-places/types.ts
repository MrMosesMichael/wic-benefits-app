/**
 * Google Places API Types
 *
 * Type definitions for Google Places API responses and requests
 */

/**
 * Google Places API operating hours period
 */
export interface GooglePeriod {
  open: {
    day: number; // 0-6 (Sunday-Saturday)
    time: string; // "0900" format
  };
  close?: {
    day: number;
    time: string;
  };
}

/**
 * Google Places API opening hours
 */
export interface GoogleOpeningHours {
  open_now?: boolean;
  periods?: GooglePeriod[];
  weekday_text?: string[];
}

/**
 * Google Places API geometry
 */
export interface GoogleGeometry {
  location: {
    lat: number;
    lng: number;
  };
  viewport?: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
}

/**
 * Google Places API address component
 */
export interface GoogleAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

/**
 * Google Geocoding API result
 */
export interface GoogleGeocodingResult {
  address_components: GoogleAddressComponent[];
  formatted_address: string;
  geometry: GoogleGeometry;
  place_id: string;
  types: string[];
}

/**
 * Google Geocoding API response
 */
export interface GoogleGeocodingResponse {
  results: GoogleGeocodingResult[];
  status: 'OK' | 'ZERO_RESULTS' | 'OVER_QUERY_LIMIT' | 'REQUEST_DENIED' | 'INVALID_REQUEST' | 'UNKNOWN_ERROR';
  error_message?: string;
}

/**
 * Google Place Search candidate
 */
export interface GooglePlaceCandidate {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: GoogleGeometry;
}

/**
 * Google Place Search response
 */
export interface GooglePlaceSearchResponse {
  candidates: GooglePlaceCandidate[];
  status: 'OK' | 'ZERO_RESULTS' | 'OVER_QUERY_LIMIT' | 'REQUEST_DENIED' | 'INVALID_REQUEST' | 'UNKNOWN_ERROR';
  error_message?: string;
}

/**
 * Google Place Details result
 */
export interface GooglePlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  opening_hours?: GoogleOpeningHours;
  geometry: GoogleGeometry;
  rating?: number;
  user_ratings_total?: number;
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
  business_status?: 'OPERATIONAL' | 'CLOSED_TEMPORARILY' | 'CLOSED_PERMANENTLY';
  types?: string[];
}

/**
 * Google Place Details response
 */
export interface GooglePlaceDetailsResponse {
  result: GooglePlaceDetails;
  status: 'OK' | 'ZERO_RESULTS' | 'OVER_QUERY_LIMIT' | 'REQUEST_DENIED' | 'INVALID_REQUEST' | 'NOT_FOUND' | 'UNKNOWN_ERROR';
  error_message?: string;
}
