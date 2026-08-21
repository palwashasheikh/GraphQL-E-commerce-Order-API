import DataLoader from 'dataloader';
import { pool } from '../db/pool.js';

// Create a FRESH set of loaders per GraphQL request. DataLoader caches
// within a single request only — sharing loaders across requests would
// leak stale data between users/requests.
export function createLoaders() {
  return {
    productById: new DataLoader(async (ids) => {
      const { rows } = await pool.query(
        'SELECT * FROM products WHERE id = ANY($1::int[])',
        [ids]
      );
      const byId = new Map(rows.map((r) => [String(r.id), r]));
      // DataLoader requires the output array to match the input array,
      // in the same order — this line is not optional boilerplate.
      return ids.map((id) => byId.get(String(id)) ?? null);
    }),

    customerById: new DataLoader(async (ids) => {
      const { rows } = await pool.query(
        'SELECT * FROM customers WHERE id = ANY($1::int[])',
        [ids]
      );
      const byId = new Map(rows.map((r) => [String(r.id), r]));
      return ids.map((id) => byId.get(String(id)) ?? null);
    }),

    // Batches "get all line items for order X" across many orders in
    // one query, then groups the flat result back by order_id.
    itemsByOrderId: new DataLoader(async (orderIds) => {
      const { rows } = await pool.query(
        'SELECT * FROM order_items WHERE order_id = ANY($1::int[])',
        [orderIds]
      );
      const grouped = new Map(orderIds.map((id) => [String(id), []]));
      for (const row of rows) {
        grouped.get(String(row.order_id))?.push(row);
      }
      return orderIds.map((id) => grouped.get(String(id)) ?? []);
    }),

    ordersByCustomerId: new DataLoader(async (customerIds) => {
      const { rows } = await pool.query(
        'SELECT * FROM orders WHERE customer_id = ANY($1::int[]) ORDER BY created_at DESC',
        [customerIds]
      );
      const grouped = new Map(customerIds.map((id) => [String(id), []]));
      for (const row of rows) {
        grouped.get(String(row.customer_id))?.push(row);
      }
      return customerIds.map((id) => grouped.get(String(id)) ?? []);
    }),
  };
}
