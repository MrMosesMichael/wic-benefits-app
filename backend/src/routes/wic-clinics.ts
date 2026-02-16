/**
 * WIC Clinics Routes
 * GPS-based nearest WIC clinic search
 */

import express, { Request, Response } from 'express';
import pool from '../config/database';

const router = express.Router();

/**
 * GET /api/v1/wic-clinics
 * Search for WIC clinics near a location
 * Query params:
 *   - lat: latitude (required)
 *   - lng: longitude (required)
 *   - radius: search radius in miles (default: 25)
 *   - state: state filter (optional)
 */
router.get('/', async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  const radiusMiles = parseInt(req.query.radius as string) || 25;
  const stateFilter = req.query.state as string;

  if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({
      success: false,
      error: 'lat and lng query parameters are required',
    });
  }

  try {
    let query = `
      SELECT
        id,
        name,
        street_address,
        city,
        state,
        zip_code,
        county,
        latitude,
        longitude,
        phone,
        website,
        appointment_url,
        hours_json,
        hours_notes,
        services,
        languages,
        data_source,
        last_verified_at,
        3959 * acos(
          cos(radians($1)) * cos(radians(latitude)) *
          cos(radians(longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(latitude))
        ) as distance_miles
      FROM wic_clinics
      WHERE is_active = TRUE
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
        AND 3959 * acos(
          cos(radians($1)) * cos(radians(latitude)) *
          cos(radians(longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(latitude))
        ) <= $3
    `;

    const params: any[] = [lat, lng, radiusMiles];
    let paramIndex = 4;

    if (stateFilter && typeof stateFilter === 'string') {
      query += ` AND state = $${paramIndex}`;
      params.push(stateFilter.toUpperCase());
      paramIndex++;
    }

    query += ` ORDER BY distance_miles ASC LIMIT 50`;

    const result = await pool.query(query, params);

    const clinics = result.rows.map((row) => {
      const hours = row.hours_json || {};
      return {
        id: row.id,
        name: row.name,
        address: {
          street: row.street_address,
          city: row.city,
          state: row.state,
          zipCode: row.zip_code,
          county: row.county,
        },
        location: {
          latitude: parseFloat(row.latitude),
          longitude: parseFloat(row.longitude),
        },
        phone: row.phone,
        website: row.website,
        appointmentUrl: row.appointment_url,
        hours: formatHours(hours),
        hoursNotes: row.hours_notes,
        services: row.services || [],
        languages: row.languages || [],
        distanceMiles: Math.round(parseFloat(row.distance_miles) * 10) / 10,
        dataSource: row.data_source,
        lastVerifiedAt: row.last_verified_at,
      };
    });

    res.json({
      success: true,
      clinics,
      count: clinics.length,
      searchParams: { lat, lng, radiusMiles, state: stateFilter || null },
    });
  } catch (error) {
    console.error('Error searching WIC clinics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search WIC clinics',
    });
  }
});

/**
 * GET /api/v1/wic-clinics/:id
 * Get details for a specific WIC clinic
 */
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      'SELECT * FROM wic_clinics WHERE id = $1 AND is_active = TRUE',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'WIC clinic not found',
      });
    }

    const row = result.rows[0];
    const hours = row.hours_json || {};

    res.json({
      success: true,
      clinic: {
        id: row.id,
        name: row.name,
        address: {
          street: row.street_address,
          city: row.city,
          state: row.state,
          zipCode: row.zip_code,
          county: row.county,
        },
        location: {
          latitude: parseFloat(row.latitude),
          longitude: parseFloat(row.longitude),
        },
        phone: row.phone,
        website: row.website,
        appointmentUrl: row.appointment_url,
        hours: formatHours(hours),
        hoursNotes: row.hours_notes,
        services: row.services || [],
        languages: row.languages || [],
        dataSource: row.data_source,
        lastVerifiedAt: row.last_verified_at,
      },
    });
  } catch (error) {
    console.error('Error fetching WIC clinic:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch WIC clinic details',
    });
  }
});

function formatHours(
  hoursJson: Record<string, { open: string; close: string }>
): Array<{ day: string; hours: string }> {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayLabels: Record<string, string> = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
  };

  return days.map((day) => {
    const dayHours = hoursJson[day];
    if (!dayHours || !dayHours.open || !dayHours.close) {
      return { day: dayLabels[day], hours: 'Closed' };
    }

    const formatTime = (time: string) => {
      const [hour, min] = time.split(':').map(Number);
      const period = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${hour12}:${min.toString().padStart(2, '0')} ${period}`;
    };

    return {
      day: dayLabels[day],
      hours: `${formatTime(dayHours.open)} - ${formatTime(dayHours.close)}`,
    };
  });
}

export default router;
