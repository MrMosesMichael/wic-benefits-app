import express, { Request, Response } from 'express';
import pool from '../config/database';

const router = express.Router();

/**
 * GET /api/v1/cart
 * Get active shopping cart for a household
 * Query params: household_id (required)
 */
router.get('/', async (req: Request, res: Response) => {
  const { household_id } = req.query;

  if (!household_id) {
    return res.status(400).json({
      success: false,
      error: 'household_id is required'
    });
  }

  const client = await pool.connect();
  try {
    // Get or create active cart
    let cartResult = await client.query(
      `SELECT id, household_id, status, created_at, updated_at
       FROM shopping_carts
       WHERE household_id = $1 AND status = 'active'`,
      [household_id]
    );

    let cartId: number;
    if (cartResult.rows.length === 0) {
      // Create new active cart
      const newCart = await client.query(
        `INSERT INTO shopping_carts (household_id, status)
         VALUES ($1, 'active')
         RETURNING id`,
        [household_id]
      );
      cartId = newCart.rows[0].id;
    } else {
      cartId = cartResult.rows[0].id;
    }

    // Get all cart items with participant info
    const itemsResult = await client.query(
      `SELECT
        ci.id,
        ci.cart_id,
        ci.participant_id,
        ci.upc,
        ci.product_name,
        ci.brand,
        ci.size,
        ci.category,
        ci.quantity,
        ci.unit,
        ci.added_at,
        p.name as participant_name,
        p.type as participant_type
       FROM cart_items ci
       JOIN participants p ON ci.participant_id = p.id
       WHERE ci.cart_id = $1
       ORDER BY ci.added_at DESC`,
      [cartId]
    );

    res.json({
      success: true,
      cart: {
        cartId: cartId.toString(),
        items: itemsResult.rows.map(item => ({
          id: item.id.toString(),
          upc: item.upc,
          product_name: item.product_name,
          brand: item.brand,
          size: item.size,
          category: item.category,
          quantity: parseFloat(item.quantity),
          unit: item.unit,
          participant_id: item.participant_id.toString(),
          participant_name: item.participant_name,
          participant_type: item.participant_type,
          added_at: item.added_at
        })),
        itemCount: itemsResult.rows.length
      }
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cart'
    });
  } finally {
    client.release();
  }
});

/**
 * POST /api/v1/cart/items
 * Add item to cart
 * Body: { householdId, participantId, upc, productName, category, quantity, unit, brand?, size? }
 */
router.post('/items', async (req: Request, res: Response) => {
  const { householdId, participantId, upc, productName, category, quantity, unit, brand, size } = req.body;

  // Validate required fields
  if (!householdId || !participantId || !upc || !productName || !category || !quantity || !unit) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: householdId, participantId, upc, productName, category, quantity, unit'
    });
  }

  if (quantity <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Quantity must be greater than 0'
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get or create active cart
    let cartResult = await client.query(
      `SELECT id FROM shopping_carts
       WHERE household_id = $1 AND status = 'active'`,
      [householdId]
    );

    let cartId: number;
    if (cartResult.rows.length === 0) {
      const newCart = await client.query(
        `INSERT INTO shopping_carts (household_id, status)
         VALUES ($1, 'active')
         RETURNING id`,
        [householdId]
      );
      cartId = newCart.rows[0].id;
    } else {
      cartId = cartResult.rows[0].id;
    }

    // Check if participant has sufficient available benefits for this category
    const benefitResult = await client.query(
      `SELECT id, available_amount, in_cart_amount, consumed_amount, total_amount, unit
       FROM benefits
       WHERE participant_id = $1 AND category = $2
       AND period_end >= CURRENT_DATE`,
      [participantId, category]
    );

    if (benefitResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: `No active benefits found for participant ${participantId} in category ${category}`
      });
    }

    const benefit = benefitResult.rows[0];
    const availableAmount = parseFloat(benefit.available_amount);
    const requestedAmount = parseFloat(quantity.toString());

    if (availableAmount < requestedAmount) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: `Insufficient benefits. Available: ${availableAmount} ${benefit.unit}, Requested: ${requestedAmount} ${unit}`,
        available: availableAmount,
        requested: requestedAmount
      });
    }

    // Add item to cart
    await client.query(
      `INSERT INTO cart_items
       (cart_id, participant_id, upc, product_name, brand, size, category, quantity, unit)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [cartId, participantId, upc, productName, brand, size, category, quantity, unit]
    );

    // Update benefits: move amount from available to in_cart
    await client.query(
      `UPDATE benefits
       SET available_amount = available_amount - $1,
           in_cart_amount = in_cart_amount + $1
       WHERE id = $2`,
      [requestedAmount, benefit.id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Item added to cart successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding item to cart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add item to cart'
    });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/v1/cart/items/:itemId
 * Remove item from cart
 */
router.delete('/items/:itemId', async (req: Request, res: Response) => {
  const { itemId } = req.params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get item details before deletion
    const itemResult = await client.query(
      `SELECT participant_id, category, quantity, unit
       FROM cart_items
       WHERE id = $1`,
      [itemId]
    );

    if (itemResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Cart item not found'
      });
    }

    const item = itemResult.rows[0];
    const quantity = parseFloat(item.quantity);

    // Get benefit to restore
    const benefitResult = await client.query(
      `SELECT id FROM benefits
       WHERE participant_id = $1 AND category = $2
       AND period_end >= CURRENT_DATE`,
      [item.participant_id, item.category]
    );

    if (benefitResult.rows.length > 0) {
      // Restore benefits: move amount from in_cart back to available
      await client.query(
        `UPDATE benefits
         SET available_amount = available_amount + $1,
             in_cart_amount = in_cart_amount - $1
         WHERE id = $2`,
        [quantity, benefitResult.rows[0].id]
      );
    }

    // Delete cart item
    await client.query('DELETE FROM cart_items WHERE id = $1', [itemId]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Item removed from cart successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error removing item from cart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove item from cart'
    });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/v1/cart
 * Clear entire cart
 * Query params: household_id (required)
 */
router.delete('/', async (req: Request, res: Response) => {
  const { household_id } = req.query;

  if (!household_id) {
    return res.status(400).json({
      success: false,
      error: 'household_id is required'
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get active cart
    const cartResult = await client.query(
      `SELECT id FROM shopping_carts
       WHERE household_id = $1 AND status = 'active'`,
      [household_id]
    );

    if (cartResult.rows.length === 0) {
      await client.query('COMMIT');
      return res.json({
        success: true,
        message: 'No active cart to clear'
      });
    }

    const cartId = cartResult.rows[0].id;

    // Get all items in cart
    const itemsResult = await client.query(
      `SELECT participant_id, category, quantity
       FROM cart_items
       WHERE cart_id = $1`,
      [cartId]
    );

    // Restore benefits for each item
    for (const item of itemsResult.rows) {
      const quantity = parseFloat(item.quantity);

      await client.query(
        `UPDATE benefits
         SET available_amount = available_amount + $1,
             in_cart_amount = in_cart_amount - $1
         WHERE participant_id = $2 AND category = $3
         AND period_end >= CURRENT_DATE`,
        [quantity, item.participant_id, item.category]
      );
    }

    // Delete all cart items
    await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Cart cleared successfully',
      itemsRestored: itemsResult.rows.length
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error clearing cart:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cart'
    });
  } finally {
    client.release();
  }
});

/**
 * POST /api/v1/cart/checkout
 * Finalize purchase - move benefits from in_cart to consumed
 * Body: { householdId }
 */
router.post('/checkout', async (req: Request, res: Response) => {
  const { householdId } = req.body;

  if (!householdId) {
    return res.status(400).json({
      success: false,
      error: 'householdId is required'
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get active cart
    const cartResult = await client.query(
      `SELECT id FROM shopping_carts
       WHERE household_id = $1 AND status = 'active'`,
      [householdId]
    );

    if (cartResult.rows.length === 0) {
      await client.query('COMMIT');
      return res.status(404).json({
        success: false,
        error: 'No active cart found'
      });
    }

    const cartId = cartResult.rows[0].id;

    // Get all items in cart
    const itemsResult = await client.query(
      `SELECT id, participant_id, upc, product_name, category, quantity, unit
       FROM cart_items
       WHERE cart_id = $1`,
      [cartId]
    );

    if (itemsResult.rows.length === 0) {
      await client.query('COMMIT');
      return res.status(400).json({
        success: false,
        error: 'Cart is empty'
      });
    }

    // Create transaction record
    const transactionResult = await client.query(
      `INSERT INTO transactions (household_id, cart_id, status)
       VALUES ($1, $2, 'completed')
       RETURNING id`,
      [householdId, cartId]
    );

    const transactionId = transactionResult.rows[0].id;

    // Process each cart item
    for (const item of itemsResult.rows) {
      const quantity = parseFloat(item.quantity);

      // Get benefit
      const benefitResult = await client.query(
        `SELECT id FROM benefits
         WHERE participant_id = $1 AND category = $2
         AND period_end >= CURRENT_DATE`,
        [item.participant_id, item.category]
      );

      if (benefitResult.rows.length > 0) {
        const benefitId = benefitResult.rows[0].id;

        // Move amount from in_cart to consumed
        await client.query(
          `UPDATE benefits
           SET in_cart_amount = in_cart_amount - $1,
               consumed_amount = consumed_amount + $1
           WHERE id = $2`,
          [quantity, benefitId]
        );

        // Record consumption
        await client.query(
          `INSERT INTO benefit_consumptions
           (transaction_id, participant_id, benefit_id, upc, product_name, category, amount_consumed, unit)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [transactionId, item.participant_id, benefitId, item.upc, item.product_name, item.category, quantity, item.unit]
        );
      }
    }

    // Delete cart items
    await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);

    // Mark cart as completed
    await client.query(
      `UPDATE shopping_carts
       SET status = 'completed', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [cartId]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Checkout completed successfully',
      transactionId: transactionId.toString(),
      itemsProcessed: itemsResult.rows.length
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during checkout:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete checkout'
    });
  } finally {
    client.release();
  }
});

export default router;
