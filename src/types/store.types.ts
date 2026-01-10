/**
 * Store Detection Types
 * Based on WIC Benefits Assistant Design Specification
 */

export type DataSource = 'api' | 'scrape' | 'crowdsourced' | 'manual';

export interface Address {
  street: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface OperatingHours {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  openTime: string; // "09:00"
  closeTime: string; // "21:00"
  closed?: boolean;
}

export interface HolidayHours {
  date: string; // ISO date
  openTime?: string;
  closeTime?: string;
  closed: boolean;
}

export interface StoreFeatures {
  hasPharmacy?: boolean;
  hasDeliCounter?: boolean;
  hasBakery?: boolean;
  acceptsEbt?: boolean;
  acceptsWic?: boolean;
  hasWicKiosk?: boolean;
}

export interface WiFiNetwork {
  ssid: string;
  bssid: string; // MAC address
}

export interface Beacon {
  uuid: string;
  major: number;
  minor: number;
}

export interface Store {
  id: string;
  name: string;
  chain?: string;
  chainId?: string;
  address: Address;
  location: GeoPoint;
  wicAuthorized: boolean;
  wicVendorId?: string;
  phone?: string;
  hours: OperatingHours[];
  holidayHours?: HolidayHours[];
  timezone: string;
  features: StoreFeatures;
  inventoryApiAvailable: boolean;
  inventoryApiType?: 'walmart' | 'kroger' | 'target' | 'scrape';
  wifiNetworks?: WiFiNetwork[];
  beacons?: Beacon[];
  lastVerified: Date;
  dataSource: DataSource;
  active: boolean;
}

export interface StoreDetectionResult {
  store: Store | null;
  confidence: number; // 0-100
  method: 'gps' | 'wifi' | 'beacon' | 'manual';
  nearbyStores?: Store[];
  requiresConfirmation: boolean;
}

export interface LocationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  blocked: boolean;
}
