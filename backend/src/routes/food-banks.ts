import express, { Request, Response } from 'express';
import pool from '../config/database';

const router = express.Router();

/**
 * GET /api/v1/foodbanks
 * Search for food banks near a location
 * Query params:
 *   - lat: latitude (required)
 *   - lng: longitude (required)
 *   - radius: search radius in miles (default: 25)
 *   - type: organization type filter (optional)
 *   - services: comma-separated services filter (optional)
 *   - openNow: boolean to filter by currently open (optional)
 */
router.get('/', async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  const radiusMiles = parseInt(req.query.radius as string) || 25;
  const typeFilter = req.query.type as string;
  const servicesFilter = req.query.services as string;
  const openNow = req.query.openNow === 'true';

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
        organization_type,
        street_address,
        city,
        state,
        zip_code,
        latitude,
        longitude,
        phone,
        website,
        email,
        hours_json,
        hours_notes,
        services,
        eligibility_notes,
        required_documents,
        accepts_wic_participants,
        data_source,
        last_verified_at,
        -- Calculate distance in miles using Haversine formula
        3959 * acos(
          cos(radians($1)) * cos(radians(latitude)) *
          cos(radians(longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(latitude))
        ) as distance_miles
      FROM food_banks
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

    // Type filter
    if (typeFilter) {
      query += ` AND organization_type = $${paramIndex}`;
      params.push(typeFilter);
      paramIndex++;
    }

    // Services filter (array contains)
    if (servicesFilter) {
      const services = servicesFilter.split(',');
      query += ` AND services && $${paramIndex}::text[]`;
      params.push(services);
      paramIndex++;
    }

    // Order by distance
    query += ` ORDER BY distance_miles ASC LIMIT 50`;

    const result = await pool.query(query, params);

    // Process results
    let foodBanks = result.rows.map((row) => {
      const hours = row.hours_json || {};
      const isOpenNow = checkIfOpenNow(hours);

      return {
        id: row.id.toString(),
        name: row.name,
        organizationType: row.organization_type,
        address: {
          street: row.street_address,
          city: row.city,
          state: row.state,
          zipCode: row.zip_code,
        },
        location: {
          latitude: parseFloat(row.latitude),
          longitude: parseFloat(row.longitude),
        },
        phone: row.phone,
        website: row.website,
        email: row.email,
        hours: formatHours(hours),
        hoursNotes: row.hours_notes,
        services: row.services || [],
        eligibilityNotes: row.eligibility_notes,
        requiredDocuments: row.required_documents || [],
        acceptsWicParticipants: row.accepts_wic_participants,
        distanceMiles: Math.round(parseFloat(row.distance_miles) * 10) / 10,
        isOpenNow,
        dataSource: row.data_source,
        lastVerifiedAt: row.last_verified_at,
      };
    });

    // Filter by open now if requested
    if (openNow) {
      foodBanks = foodBanks.filter((fb) => fb.isOpenNow);
    }

    res.json({
      success: true,
      foodBanks,
      count: foodBanks.length,
      searchParams: {
        lat,
        lng,
        radiusMiles,
        type: typeFilter || null,
        services: servicesFilter ? servicesFilter.split(',') : null,
        openNow,
      },
    });
  } catch (error) {
    console.error('Error searching food banks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search food banks',
    });
  }
});

/**
 * GET /api/v1/foodbanks/:id
 * Get details for a specific food bank
 */
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM food_banks WHERE id = $1 AND is_active = TRUE`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Food bank not found',
      });
    }

    const row = result.rows[0];
    const hours = row.hours_json || {};

    res.json({
      success: true,
      foodBank: {
        id: row.id.toString(),
        name: row.name,
        organizationType: row.organization_type,
        address: {
          street: row.street_address,
          city: row.city,
          state: row.state,
          zipCode: row.zip_code,
        },
        location: {
          latitude: parseFloat(row.latitude),
          longitude: parseFloat(row.longitude),
        },
        phone: row.phone,
        website: row.website,
        email: row.email,
        hours: formatHours(hours),
        hoursNotes: row.hours_notes,
        services: row.services || [],
        eligibilityNotes: row.eligibility_notes,
        requiredDocuments: row.required_documents || [],
        acceptsWicParticipants: row.accepts_wic_participants,
        isOpenNow: checkIfOpenNow(hours),
        dataSource: row.data_source,
        lastVerifiedAt: row.last_verified_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error) {
    console.error('Error fetching food bank:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch food bank details',
    });
  }
});

/**
 * GET /api/v1/foodbanks/services/list
 * Get list of available services for filtering
 */
router.get('/services/list', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT unnest(services) as service
      FROM food_banks
      WHERE is_active = TRUE AND services IS NOT NULL
      ORDER BY service
    `);

    const services = result.rows.map((r) => r.service);

    res.json({
      success: true,
      services,
    });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch services list',
    });
  }
});

// Helper function to check if a food bank is currently open
function checkIfOpenNow(hoursJson: Record<string, { open: string; close: string }>): boolean {
  if (!hoursJson || Object.keys(hoursJson).length === 0) {
    return false;
  }

  const now = new Date();
  const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
    now.getDay()
  ];
  const todayHours = hoursJson[dayOfWeek];

  if (!todayHours || !todayHours.open || !todayHours.close) {
    return false;
  }

  const currentTime = now.getHours() * 100 + now.getMinutes();
  const [openHour, openMin] = todayHours.open.split(':').map(Number);
  const [closeHour, closeMin] = todayHours.close.split(':').map(Number);

  const openTime = openHour * 100 + openMin;
  const closeTime = closeHour * 100 + closeMin;

  return currentTime >= openTime && currentTime <= closeTime;
}

// Helper function to format hours for display
function formatHours(
  hoursJson: Record<string, { open: string; close: string }>
): Array<{ day: string; hours: string }> {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayLabels = {
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
      return { day: dayLabels[day as keyof typeof dayLabels], hours: 'Closed' };
    }

    // Format time from 24h to 12h
    const formatTime = (time: string) => {
      const [hour, min] = time.split(':').map(Number);
      const period = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${hour12}:${min.toString().padStart(2, '0')} ${period}`;
    };

    return {
      day: dayLabels[day as keyof typeof dayLabels],
      hours: `${formatTime(dayHours.open)} - ${formatTime(dayHours.close)}`,
    };
  });
}

export default router;
