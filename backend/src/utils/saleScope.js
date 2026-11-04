/**
 * Single source of truth for what counts as a SALE.
 *
 * Included:
 *   - COMPLETED orders (paid or unpaid — completing a bill is the sale)
 *   - ACTIVE orders that are already PAID
 * Excluded:
 *   - DRAFT, HELD, CANCELLED, REFUNDED, ARCHIVED
 *   - ACTIVE unpaid kitchen tickets (shown separately as open bills)
 *
 * All financial reports must filter with SALE_PREDICATE and business_date.
 */

export const SALE_PREDICATE = `(
  o.deleted_at IS NULL
  AND (
    o.lifecycle_state = 'COMPLETED'
    OR (o.lifecycle_state = 'ACTIVE' AND UPPER(COALESCE(o.payment_state, '')) = 'PAID')
  )
)`;

export const OPEN_BILL_PREDICATE = `(
  o.deleted_at IS NULL
  AND o.lifecycle_state = 'ACTIVE'
  AND UPPER(COALESCE(o.payment_state, '')) != 'PAID'
)`;

export const REFUND_PREDICATE = `(
  o.deleted_at IS NULL
  AND o.lifecycle_state IN ('CANCELLED', 'REFUNDED')
)`;

/** Placed bills: still open (Active) or finished (Completed). Excludes draft/held/cancelled. */
export const PLACED_PREDICATE = `(
  o.deleted_at IS NULL
  AND o.lifecycle_state IN ('ACTIVE', 'COMPLETED')
)`;

export const CATEGORY_BUCKET_SQL = `
  CASE
    WHEN d.id IS NOT NULL THEN 'Deals'
    ELSE 'Restaurant'
  END
`;

/** Sum of line-item discounts on an order (order-level remainder is allocated separately). */
export const LINE_DISCOUNT_SUM_SQL = `(
  SELECT SUM(COALESCE(x.discount_amount, 0)) FROM order_items x WHERE x.order_id = o.id
)`;

/**
 * Allocated food net for one line: item subtotal minus line discount, minus its
 * share of remaining order-level discount.
 *
 * Share uses food-after-line-discount as the base so SUM(item nets) equals
 * SUM(order.subtotal - order.discount_total) even when both discount kinds exist.
 */
export const ITEM_FOOD_NET_SQL = `
  (COALESCE(oi.subtotal, 0) - COALESCE(oi.discount_amount, 0)
    - COALESCE(
        (COALESCE(o.discount_total, 0) - COALESCE(${LINE_DISCOUNT_SUM_SQL}, 0))
        * ((COALESCE(oi.subtotal, 0) - COALESCE(oi.discount_amount, 0))
           / NULLIF(o.subtotal - COALESCE(${LINE_DISCOUNT_SUM_SQL}, 0), 0))
      , 0)
  )
`;
