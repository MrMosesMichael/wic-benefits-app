/**
 * Store Repository
 * Database operations for store data: location, hours, features, geofences
 */

import { Pool, QueryResult } from 'pg';
import {
  Store,
  OperatingHours,
  HolidayHours,
  StoreFeatures,
  Geofence,
} from '../types/store.types';
import { Address, GeoPoint } from '../types/store.types';

export class StoreRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Create a new store
   */
  async createStore(store: Omit<Store, 'id' | 'lastVerified'>): Promise<Store> {
    const query = `
      INSERT INTO stores (
        name,
        chain,
        chain_id,
        address_street,
        address_street2,
        address_city,
        address_state,
        address_zip,
        address_country,
        latitude,
        longitude,
        phone,
        website,
        wic_authorized,
        wic_vendor_id,
        features,
        inventory_api_available,
        inventory_api_type,
        wifi_networks,
        beacons,
        timezone,
        data_source,
        active
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23
      )
      RETURNING *;
    `;

    const result = await this.pool.query(query, [
      store.name,
      store.chain,
      store.chainId,
      store.address.street,
      store.address.street2,
      store.address.city,
      store.address.state,
      store.address.zip,
      store.address.country,
      store.location.lat,
      store.location.lng,
      store.phone,
      store.phone, // TODO: Add website when available
      store.wicAuthorized,
      store.wicVendorId,
      JSON.stringify(store.features),
      store.inventoryApiAvailable,
      store.inventoryApiType,
      store.wifiNetworks ? JSON.stringify(store.wifiNetworks) : null,
      store.beacons ? JSON.stringify(store.beacons) : null,
      store.timezone,
      store.dataSource,
      store.active,
    ]);

    return this.parseStoreRow(result.rows[0]);
  }

  /**
   * Get store by ID
   */
  async getStoreById(storeId: string): Promise<Store | null> {
    const query = `
      SELECT *
      FROM stores
      WHERE id = $1;
    `;

    const result = await this.pool.query(query, [storeId]);
    if (result.rows.length === 0) return null;

    // Fetch hours and features
    const store = this.parseStoreRow(result.rows[0]);
    await this.enrichStoreWithRelations(store);
    return store;
  }

  /**
   * Get stores by state
   */
  async getStoresByState(
    state: string,
    wicAuthorizedOnly: boolean = true
  ): Promise<Store[]> {
    const query = `
      SELECT *
      FROM stores
      WHERE address_state = $1
        ${wicAuthorizedOnly ? 'AND wic_authorized = true' : ''}
        AND active = true
      ORDER BY name;
    `;

    const result = await this.pool.query(query, [state]);
    const stores = result.rows.map(row => this.parseStoreRow(row));

    // Enrich all stores with relations
    await Promise.all(stores.map(store => this.enrichStoreWithRelations(store)));

    return stores;
  }

  /**
   * Get nearby stores by location (requires PostGIS)
   * Returns stores within distance_meters
   */
  async getStoresNearby(
    lat: number,
    lng: number,
    distanceMeters: number = 5000,
    wicAuthorizedOnly: boolean = true
  ): Promise<Array<Store & { distanceMeters: number }>> {
    const query = `
      SELECT
        s.*,
        ROUND(
          CAST(
            earth_distance(ll_to_earth($1, $2), ll_to_earth(s.latitude, s.longitude))
            AS NUMERIC
          )
        )::INTEGER as distance_meters
      FROM stores s
      WHERE earth_distance(ll_to_earth($1, $2), ll_to_earth(s.latitude, s.longitude)) <= $3
        ${wicAuthorizedOnly ? 'AND s.wic_authorized = true' : ''}
        AND s.active = true
      ORDER BY distance_meters
      LIMIT 50;
    `;

    const result = await this.pool.query(query, [lat, lng, distanceMeters]);
    const stores = result.rows.map(row => ({
      ...this.parseStoreRow(row),
      distanceMeters: row.distance_meters,
    }));

    // Enrich with relations
    await Promise.all(stores.map(store => this.enrichStoreWithRelations(store)));

    return stores;
  }

  /**
   * Get stores by chain
   */
  async getStoresByChain(
    chain: string,
    state?: string
  ): Promise<Store[]> {
    let query = `
      SELECT *
      FROM stores
      WHERE chain = $1
        AND active = true
    `;
    const params: any[] = [chain];

    if (state) {
      query += ` AND address_state = $2`;
      params.push(state);
    }

    query += ` ORDER BY address_city, name;`;

    const result = await this.pool.query(query, params);
    const stores = result.rows.map(row => this.parseStoreRow(row));

    await Promise.all(stores.map(store => this.enrichStoreWithRelations(store)));

    return stores;
  }

  /**
   * Update store information
   */
  async updateStore(storeId: string, updates: Partial<Store>): Promise<Store> {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.phone !== undefined) {
      setClauses.push(`phone = $${paramIndex++}`);
      values.push(updates.phone);
    }
    if (updates.wicAuthorized !== undefined) {
      setClauses.push(`wic_authorized = $${paramIndex++}`);
      values.push(updates.wicAuthorized);
    }
    if (updates.features !== undefined) {
      setClauses.push(`features = $${paramIndex++}`);
      values.push(JSON.stringify(updates.features));
    }
    if (updates.address !== undefined) {
      setClauses.push(`address_street = $${paramIndex++}`);
      values.push(updates.address.street);
      setClauses.push(`address_street2 = $${paramIndex++}`);
      values.push(updates.address.street2 || null);
      setClauses.push(`address_city = $${paramIndex++}`);
      values.push(updates.address.city);
      setClauses.push(`address_state = $${paramIndex++}`);
      values.push(updates.address.state);
      setClauses.push(`address_zip = $${paramIndex++}`);
      values.push(updates.address.zip);
    }
    if (updates.location !== undefined) {
      setClauses.push(`latitude = $${paramIndex++}`);
      values.push(updates.location.lat);
      setClauses.push(`longitude = $${paramIndex++}`);
      values.push(updates.location.lng);
    }
    if (updates.active !== undefined) {
      setClauses.push(`active = $${paramIndex++}`);
      values.push(updates.active);
    }
    if (updates.lastVerified !== undefined) {
      setClauses.push(`last_verified = $${paramIndex++}`);
      values.push(updates.lastVerified);
    }

    values.push(storeId);
    const query = `
      UPDATE stores
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *;
    `;

    const result = await this.pool.query(query, values);
    const store = this.parseStoreRow(result.rows[0]);
    await this.enrichStoreWithRelations(store);
    return store;
  }

  /**
   * Add operating hours
   */
  async addOperatingHours(
    storeId: string,
    hours: OperatingHours[]
  ): Promise<void> {
    const query = `
      INSERT INTO store_hours (store_id, day_of_week, open_time, close_time, closed)
      VALUES ${hours.map((_, i) => `($1, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4}, $${i * 4 + 5})`).join(', ')}
      ON CONFLICT (store_id, day_of_week) DO UPDATE
      SET open_time = EXCLUDED.open_time,
          close_time = EXCLUDED.close_time,
          closed = EXCLUDED.closed,
          updated_at = NOW();
    `;

    const values: any[] = [storeId];
    hours.forEach(h => {
      values.push(h.dayOfWeek, h.openTime, h.closeTime, h.closed || false);
    });

    await this.pool.query(query, values);
  }

  /**
   * Get operating hours
   */
  async getOperatingHours(storeId: string): Promise<OperatingHours[]> {
    const query = `
      SELECT day_of_week, open_time, close_time, closed
      FROM store_hours
      WHERE store_id = $1
      ORDER BY day_of_week;
    `;

    const result = await this.pool.query(query, [storeId]);
    return result.rows.map(row => ({
      dayOfWeek: row.day_of_week,
      openTime: row.open_time,
      closeTime: row.close_time,
      closed: row.closed,
    }));
  }

  /**
   * Add holiday hours
   */
  async addHolidayHours(
    storeId: string,
    holidays: HolidayHours[]
  ): Promise<void> {
    const query = `
      INSERT INTO store_holiday_hours (store_id, holiday_date, open_time, close_time, closed, reason)
      VALUES ${holidays.map((_, i) => `($1, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5}, $${i * 5 + 6})`).join(', ')}
      ON CONFLICT (store_id, holiday_date) DO UPDATE
      SET open_time = EXCLUDED.open_time,
          close_time = EXCLUDED.close_time,
          closed = EXCLUDED.closed,
          updated_at = NOW();
    `;

    const values: any[] = [storeId];
    holidays.forEach(h => {
      values.push(h.date, h.openTime || null, h.closeTime || null, h.closed, null);
    });

    await this.pool.query(query, values);
  }

  /**
   * Check if store is currently open
   */
  async isStoreOpen(storeId: string): Promise<boolean | null> {
    const query = `
      SELECT is_store_open($1) as is_open;
    `;

    const result = await this.pool.query(query, [storeId]);
    return result.rows[0].is_open;
  }

  /**
   * Add geofence
   */
  async addGeofence(storeId: string, geofence: Geofence): Promise<void> {
    if (geofence.type === 'circle') {
      const query = `
        INSERT INTO store_geofences (store_id, geofence_type, center_latitude, center_longitude, radius_meters)
        VALUES ($1, $2, $3, $4, $5);
      `;
      await this.pool.query(query, [
        storeId,
        'circle',
        geofence.center.lat,
        geofence.center.lng,
        geofence.radiusMeters,
      ]);
    } else if (geofence.type === 'polygon') {
      const query = `
        INSERT INTO store_geofences (store_id, geofence_type, polygon_coordinates)
        VALUES ($1, $2, $3);
      `;
      await this.pool.query(query, [
        storeId,
        'polygon',
        JSON.stringify(geofence.coordinates),
      ]);
    }
  }

  /**
   * Get geofences for store
   */
  async getGeofences(storeId: string): Promise<Geofence[]> {
    const query = `
      SELECT geofence_type, center_latitude, center_longitude, radius_meters, polygon_coordinates
      FROM store_geofences
      WHERE store_id = $1;
    `;

    const result = await this.pool.query(query, [storeId]);
    return result.rows.map(row => {
      if (row.geofence_type === 'circle') {
        return {
          type: 'circle',
          center: { lat: row.center_latitude, lng: row.center_longitude },
          radiusMeters: row.radius_meters,
        };
      } else {
        return {
          type: 'polygon',
          coordinates: row.polygon_coordinates,
        };
      }
    });
  }

  /**
   * Find WIC-authorized stores by state
   */
  async findWICStoresByState(state: string): Promise<Store[]> {
    const query = `
      SELECT id, name, address_street, address_city, phone, latitude, longitude
      FROM find_wic_stores_by_state($1);
    `;

    const result = await this.pool.query(query, [state]);
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      chain: undefined,
      address: {
        street: row.address_street,
        city: row.address_city,
        state: state,
        zip: '',
        country: 'USA',
      } as Address,
      location: { lat: row.latitude, lng: row.longitude } as GeoPoint,
      wicAuthorized: true,
      phone: row.phone,
      hours: [],
      timezone: 'America/New_York',
      features: {},
      inventoryApiAvailable: false,
      lastVerified: new Date(),
      dataSource: 'manual',
      active: true,
    }));
  }

  /**
   * Parse database row to Store object
   */
  private parseStoreRow(row: any): Store {
    return {
      id: row.id,
      name: row.name,
      chain: row.chain,
      chainId: row.chain_id,
      address: {
        street: row.address_street,
        street2: row.address_street2,
        city: row.address_city,
        state: row.address_state,
        zip: row.address_zip,
        country: row.address_country,
      },
      location: {
        lat: parseFloat(row.latitude),
        lng: parseFloat(row.longitude),
      },
      wicAuthorized: row.wic_authorized,
      wicVendorId: row.wic_vendor_id,
      phone: row.phone,
      hours: [],
      timezone: row.timezone,
      features: row.features || {},
      inventoryApiAvailable: row.inventory_api_available,
      inventoryApiType: row.inventory_api_type,
      wifiNetworks: row.wifi_networks || [],
      beacons: row.beacons || [],
      lastVerified: row.last_verified,
      dataSource: row.data_source,
      active: row.active,
    };
  }

  /**
   * Enrich store with relations (hours, geofences, etc.)
   */
  private async enrichStoreWithRelations(store: Store): Promise<void> {
    const [hours, geofences] = await Promise.all([
      this.getOperatingHours(store.id),
      this.getGeofences(store.id),
    ]);

    store.hours = hours;
    if (geofences.length > 0) {
      store.geofence = geofences[0]; // Typically one geofence per store
    }
  }
}
