/**
 * Location Service
 * Handles GPS location access and permission management for store detection
 */

import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { GeoPoint, LocationPermissionStatus } from '../types/store.types';

export class LocationService {
  private static instance: LocationService;
  private watchId: number | null = null;

  private constructor() {}

  public static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * Check and request location permissions
   */
  public async checkPermissions(): Promise<LocationPermissionStatus> {
    if (Platform.OS === 'android') {
      return this.checkAndroidPermissions();
    } else {
      return this.checkiOSPermissions();
    }
  }

  /**
   * Request location permissions
   */
  public async requestPermissions(): Promise<LocationPermissionStatus> {
    if (Platform.OS === 'android') {
      return this.requestAndroidPermissions();
    } else {
      return this.requestiOSPermissions();
    }
  }

  /**
   * Get current GPS position
   */
  public async getCurrentPosition(): Promise<GeoPoint> {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          reject(new Error(`Failed to get location: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );
    });
  }

  /**
   * Watch position changes (for continuous store detection)
   */
  public watchPosition(
    onPositionChange: (position: GeoPoint) => void,
    onError?: (error: Error) => void
  ): void {
    if (this.watchId !== null) {
      this.clearWatch();
    }

    this.watchId = Geolocation.watchPosition(
      (position) => {
        onPositionChange({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        if (onError) {
          onError(new Error(`Position watch error: ${error.message}`));
        }
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 50, // Update every 50 meters
        interval: 10000, // Check every 10 seconds
      }
    );
  }

  /**
   * Stop watching position
   */
  public clearWatch(): void {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  /**
   * Android-specific permission check
   */
  private async checkAndroidPermissions(): Promise<LocationPermissionStatus> {
    try {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );

      return {
        granted,
        canAskAgain: !granted,
        blocked: false,
      };
    } catch (error) {
      return {
        granted: false,
        canAskAgain: true,
        blocked: false,
      };
    }
  }

  /**
   * Android-specific permission request
   */
  private async requestAndroidPermissions(): Promise<LocationPermissionStatus> {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message:
            'WIC Benefits Assistant needs access to your location to detect which store you are shopping at and provide store-specific information.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Deny',
          buttonPositive: 'Allow',
        }
      );

      const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
      const isBlocked = granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;

      return {
        granted: isGranted,
        canAskAgain: !isBlocked && !isGranted,
        blocked: isBlocked,
      };
    } catch (error) {
      return {
        granted: false,
        canAskAgain: true,
        blocked: false,
      };
    }
  }

  /**
   * iOS-specific permission check
   * Note: iOS uses navigator.geolocation API which handles permissions automatically
   */
  private async checkiOSPermissions(): Promise<LocationPermissionStatus> {
    // On iOS, we'll attempt to get the position and catch errors
    try {
      await this.getCurrentPosition();
      return {
        granted: true,
        canAskAgain: false,
        blocked: false,
      };
    } catch (error) {
      // If we get an error, permissions are likely denied
      return {
        granted: false,
        canAskAgain: true,
        blocked: false,
      };
    }
  }

  /**
   * iOS-specific permission request
   */
  private async requestiOSPermissions(): Promise<LocationPermissionStatus> {
    // On iOS, the permission prompt is shown automatically on first getCurrentPosition call
    try {
      await this.getCurrentPosition();
      return {
        granted: true,
        canAskAgain: false,
        blocked: false,
      };
    } catch (error) {
      return {
        granted: false,
        canAskAgain: false,
        blocked: true,
      };
    }
  }

  /**
   * Calculate distance between two points in meters
   * Uses Haversine formula
   */
  public static calculateDistance(point1: GeoPoint, point2: GeoPoint): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (point1.lat * Math.PI) / 180;
    const φ2 = (point2.lat * Math.PI) / 180;
    const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
    const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }
}

export default LocationService;
