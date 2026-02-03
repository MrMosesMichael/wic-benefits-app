import express, { Request, Response } from 'express';
import pool from '../config/database';

const router = express.Router();

/**
 * GET /api/v1/user/export
 * Export all user data for data sovereignty compliance
 * Query params:
 *   - user_id: user identifier (required)
 */
router.get('/export', async (req: Request, res: Response) => {
  const userId = req.query.user_id as string;

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'user_id query parameter is required',
    });
  }

  try {
    // Collect all user data from various tables
    const exportData: Record<string, any> = {
      exportedAt: new Date().toISOString(),
      userId,
      dataCategories: {},
    };

    // 1. User account
    const userResult = await pool.query(
      'SELECT id, device_id, phone, email, created_at, last_seen FROM users WHERE id = $1',
      [userId]
    );
    if (userResult.rows.length > 0) {
      exportData.dataCategories.account = userResult.rows[0];
    }

    // 2. Household data
    const householdResult = await pool.query(
      'SELECT * FROM households WHERE user_id = $1',
      [userId]
    );
    exportData.dataCategories.households = householdResult.rows;

    // Get household IDs for related queries
    const householdIds = householdResult.rows.map((h) => h.id);

    if (householdIds.length > 0) {
      // 3. Participants
      const participantsResult = await pool.query(
        'SELECT * FROM participants WHERE household_id = ANY($1)',
        [householdIds]
      );
      exportData.dataCategories.participants = participantsResult.rows;

      // Get participant IDs
      const participantIds = participantsResult.rows.map((p) => p.id);

      // 4. Benefits
      if (participantIds.length > 0) {
        const benefitsResult = await pool.query(
          'SELECT * FROM benefits WHERE participant_id = ANY($1)',
          [participantIds]
        );
        exportData.dataCategories.benefits = benefitsResult.rows;
      }

      // 5. Manual benefits
      const manualBenefitsResult = await pool.query(
        'SELECT * FROM manual_benefits WHERE household_id = ANY($1)',
        [householdIds]
      );
      exportData.dataCategories.manualBenefits = manualBenefitsResult.rows;

      // 6. Shopping carts
      const cartsResult = await pool.query(
        'SELECT * FROM shopping_carts WHERE household_id = ANY($1)',
        [householdIds]
      );
      exportData.dataCategories.shoppingCarts = cartsResult.rows;

      // Get cart IDs
      const cartIds = cartsResult.rows.map((c) => c.id);

      // 7. Cart items
      if (cartIds.length > 0) {
        const cartItemsResult = await pool.query(
          'SELECT * FROM cart_items WHERE cart_id = ANY($1)',
          [cartIds]
        );
        exportData.dataCategories.cartItems = cartItemsResult.rows;
      }

      // 8. Transactions
      const transactionsResult = await pool.query(
        'SELECT * FROM transactions WHERE household_id = ANY($1)',
        [householdIds]
      );
      exportData.dataCategories.transactions = transactionsResult.rows;

      // Get transaction IDs
      const transactionIds = transactionsResult.rows.map((t) => t.id);

      // 9. Benefit consumptions
      if (transactionIds.length > 0) {
        const consumptionsResult = await pool.query(
          'SELECT * FROM benefit_consumptions WHERE transaction_id = ANY($1)',
          [transactionIds]
        );
        exportData.dataCategories.benefitConsumptions = consumptionsResult.rows;
      }
    }

    // 10. Formula alerts
    const alertsResult = await pool.query(
      'SELECT * FROM formula_alerts WHERE user_id = $1',
      [userId]
    );
    exportData.dataCategories.formulaAlerts = alertsResult.rows;

    // 11. Push tokens
    const pushTokensResult = await pool.query(
      'SELECT * FROM push_tokens WHERE user_id = $1',
      [userId]
    );
    exportData.dataCategories.pushTokens = pushTokensResult.rows;

    // 12. Notification settings
    const notificationSettingsResult = await pool.query(
      'SELECT * FROM notification_settings WHERE user_id = $1',
      [userId]
    );
    exportData.dataCategories.notificationSettings = notificationSettingsResult.rows;

    // 13. Notification subscriptions
    const subscriptionsResult = await pool.query(
      'SELECT * FROM notification_subscriptions WHERE user_id = $1',
      [userId]
    );
    exportData.dataCategories.notificationSubscriptions = subscriptionsResult.rows;

    // 14. Notification history
    const notificationHistoryResult = await pool.query(
      'SELECT * FROM notification_history WHERE user_id = $1 ORDER BY delivered_at DESC LIMIT 100',
      [userId]
    );
    exportData.dataCategories.notificationHistory = notificationHistoryResult.rows;

    // 15. Product sightings (crowdsourced contributions)
    const sightingsResult = await pool.query(
      'SELECT * FROM product_sightings WHERE reported_by = $1',
      [userId]
    );
    exportData.dataCategories.productSightings = sightingsResult.rows;

    // 16. Inventory reports log
    const inventoryReportsResult = await pool.query(
      'SELECT * FROM inventory_reports_log WHERE user_id = $1',
      [userId]
    );
    exportData.dataCategories.inventoryReports = inventoryReportsResult.rows;

    res.json({
      success: true,
      message: 'Your data has been exported successfully.',
      data: exportData,
    });
  } catch (error) {
    console.error('Error exporting user data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export user data. Please try again later.',
    });
  }
});

/**
 * DELETE /api/v1/user/delete
 * Delete all user data for data sovereignty compliance
 * Body:
 *   - user_id: user identifier (required)
 *   - confirmation: must be "DELETE_MY_ACCOUNT" (required)
 */
router.delete('/delete', async (req: Request, res: Response) => {
  const { user_id: userId, confirmation } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'user_id is required',
    });
  }

  if (confirmation !== 'DELETE_MY_ACCOUNT') {
    return res.status(400).json({
      success: false,
      error: 'Please confirm deletion by setting confirmation to "DELETE_MY_ACCOUNT"',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get household IDs first
    const householdResult = await client.query(
      'SELECT id FROM households WHERE user_id = $1',
      [userId]
    );
    const householdIds = householdResult.rows.map((h) => h.id);

    if (householdIds.length > 0) {
      // Get participant IDs
      const participantsResult = await client.query(
        'SELECT id FROM participants WHERE household_id = ANY($1)',
        [householdIds]
      );
      const participantIds = participantsResult.rows.map((p) => p.id);

      // Get cart IDs
      const cartsResult = await client.query(
        'SELECT id FROM shopping_carts WHERE household_id = ANY($1)',
        [householdIds]
      );
      const cartIds = cartsResult.rows.map((c) => c.id);

      // Get transaction IDs
      const transactionsResult = await client.query(
        'SELECT id FROM transactions WHERE household_id = ANY($1)',
        [householdIds]
      );
      const transactionIds = transactionsResult.rows.map((t) => t.id);

      // Delete in reverse dependency order
      // 1. Benefit consumptions
      if (transactionIds.length > 0) {
        await client.query(
          'DELETE FROM benefit_consumptions WHERE transaction_id = ANY($1)',
          [transactionIds]
        );
      }

      // 2. Transactions
      if (householdIds.length > 0) {
        await client.query('DELETE FROM transactions WHERE household_id = ANY($1)', [
          householdIds,
        ]);
      }

      // 3. Cart items
      if (cartIds.length > 0) {
        await client.query('DELETE FROM cart_items WHERE cart_id = ANY($1)', [cartIds]);
      }

      // 4. Shopping carts
      if (householdIds.length > 0) {
        await client.query('DELETE FROM shopping_carts WHERE household_id = ANY($1)', [
          householdIds,
        ]);
      }

      // 5. Benefits
      if (participantIds.length > 0) {
        await client.query('DELETE FROM benefits WHERE participant_id = ANY($1)', [
          participantIds,
        ]);
      }

      // 6. Manual benefits
      if (householdIds.length > 0) {
        await client.query('DELETE FROM manual_benefits WHERE household_id = ANY($1)', [
          householdIds,
        ]);
      }

      // 7. Participants
      if (householdIds.length > 0) {
        await client.query('DELETE FROM participants WHERE household_id = ANY($1)', [
          householdIds,
        ]);
      }

      // 8. Households
      await client.query('DELETE FROM households WHERE user_id = $1', [userId]);
    }

    // Delete notification-related data
    // 9. Get subscription IDs for subscription_stores
    const subscriptionsResult = await client.query(
      'SELECT id FROM notification_subscriptions WHERE user_id = $1',
      [userId]
    );
    const subscriptionIds = subscriptionsResult.rows.map((s) => s.id);

    if (subscriptionIds.length > 0) {
      await client.query('DELETE FROM subscription_stores WHERE subscription_id = ANY($1)', [
        subscriptionIds,
      ]);
      await client.query(
        'DELETE FROM subscription_expiration_prompts WHERE subscription_id = ANY($1)',
        [subscriptionIds]
      );
    }

    // 10. Notification history
    await client.query('DELETE FROM notification_history WHERE user_id = $1', [userId]);

    // 11. Notification subscriptions
    await client.query('DELETE FROM notification_subscriptions WHERE user_id = $1', [userId]);

    // 12. Notification settings
    await client.query('DELETE FROM notification_settings WHERE user_id = $1', [userId]);

    // 13. Push tokens
    await client.query('DELETE FROM push_tokens WHERE user_id = $1', [userId]);

    // 14. Formula alerts
    await client.query('DELETE FROM formula_alerts WHERE user_id = $1', [userId]);

    // 15. Notification batches
    await client.query('DELETE FROM notification_batches WHERE user_id = $1', [userId]);

    // 16. Product sightings - anonymize instead of delete to preserve community data
    await client.query(
      "UPDATE product_sightings SET reported_by = 'deleted_user' WHERE reported_by = $1",
      [userId]
    );

    // 17. Inventory reports log - anonymize
    await client.query(
      "UPDATE inventory_reports_log SET user_id = 'deleted_user' WHERE user_id = $1",
      [userId]
    );

    // 18. Delete user account last
    await client.query('DELETE FROM users WHERE id = $1', [userId]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message:
        'Your account and all associated data have been permanently deleted. Community contributions (product sightings) have been anonymized.',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting user data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user data. Please try again later.',
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/v1/user/privacy-summary
 * Get a summary of what data is collected
 */
router.get('/privacy-summary', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    privacySummary: {
      lastUpdated: '2026-02-03',
      dataCollected: [
        {
          category: 'Account Information',
          description: 'Device identifier for anonymous authentication',
          required: true,
          retention: 'Until account deletion',
        },
        {
          category: 'Household & Benefits',
          description:
            'Household members, participant types, and benefit balances you enter',
          required: false,
          retention: 'Until you delete them or your account',
        },
        {
          category: 'Shopping Activity',
          description: 'Products scanned, items in cart, and checkout history',
          required: false,
          retention: 'Until account deletion',
        },
        {
          category: 'Location',
          description: 'Used only for finding nearby stores and food banks when you search',
          required: false,
          retention: 'Not stored permanently',
        },
        {
          category: 'Community Contributions',
          description: 'Product availability reports you submit to help others',
          required: false,
          retention: 'Anonymized if you delete your account',
        },
        {
          category: 'Notification Preferences',
          description: 'Push notification token and formula alert settings',
          required: false,
          retention: 'Until account deletion',
        },
      ],
      dataNotCollected: [
        'Your real name (unless you choose to enter it)',
        'Social Security Number or WIC card number',
        'Financial information or bank accounts',
        'Health information beyond WIC participant type',
        'Precise location history',
        'Contacts or photos',
        'Browsing history outside this app',
      ],
      dataNeverSold: true,
      dataSharing: [
        {
          recipient: 'No one',
          purpose: 'We do not sell or share your personal data with third parties',
        },
        {
          recipient: 'Anonymous statistics only',
          purpose: 'Aggregate, non-identifying data may be used to improve the app',
        },
      ],
      yourRights: [
        {
          right: 'Export Your Data',
          description: 'Download all data we have about you at any time',
          howTo: 'Settings → Privacy → Export My Data',
        },
        {
          right: 'Delete Your Account',
          description: 'Permanently delete your account and all associated data',
          howTo: 'Settings → Privacy → Delete My Account',
        },
        {
          right: 'Opt Out of Notifications',
          description: 'Disable push notifications at any time',
          howTo: 'Settings → Notifications',
        },
      ],
      contact: {
        email: 'privacy@wicbenefits.app',
        purpose: 'For privacy questions or data requests',
      },
    },
  });
});

export default router;
