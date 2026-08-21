import { pool } from '../db/pool.js';

function mapCustomer(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.created_at.toISOString(),
  };
}

function mapProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    priceCents: row.price_cents,
    stock: row.stock,
  };
}

function mapOrder(row) {
  if (!row) return null;
  return {
    id: row.id,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    customerId: row.customer_id, // internal use only, not on the GraphQL type
  };
}

export const resolvers = {
  Query: {
    // getOrders(status?, customerId?) — a simple dynamic WHERE builder.
    // Parameterized throughout: no string concatenation of user input,
    // which is how you get SQL injection.
    getOrders: async (_parent, { status, customerId }) => {
      const conditions = [];
      const params = [];

      if (status) {
        params.push(status);
        conditions.push(`status = $${params.length}`);
      }
      if (customerId) {
        params.push(customerId);
        conditions.push(`customer_id = $${params.length}`);
      }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const { rows } = await pool.query(
        `SELECT * FROM orders ${where} ORDER BY created_at DESC`,
        params
      );
      return rows.map(mapOrder);
    },

    getProduct: async (_parent, { id }, { loaders }) => {
      return mapProduct(await loaders.productById.load(id));
    },

    getCustomer: async (_parent, { id }, { loaders }) => {
      return mapCustomer(await loaders.customerById.load(id));
    },

    listProducts: async (_parent, { limit, offset }) => {
      // Cap limit server-side — never trust a client-supplied page size,
      // or someone sends limit: 999999999 and takes your DB down.
      const safeLimit = Math.min(Math.max(limit, 1), 100);
      const { rows } = await pool.query(
        'SELECT * FROM products ORDER BY id LIMIT $1 OFFSET $2',
        [safeLimit, offset]
      );
      return rows.map(mapProduct);
    },

    // The relational join query: order -> order_items -> products.
    // Resolved via field resolvers below (Order.items, OrderItem.product)
    // so DataLoader batching applies even when this is called in a list.
    orderDetails: async (_parent, { id }) => {
      const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
      return mapOrder(rows[0]);
    },
  },

  Mutation: {
    // createOrder — wrapped in a transaction. Multiple line items get
    // inserted together; if item 3 fails, items 1-2 must roll back too,
    // or you get an order that silently lost part of what was ordered.
    createOrder: async (_parent, { customerId, items }) => {
      if (!items || items.length === 0) {
        throw new Error('An order must contain at least one item.');
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const customerCheck = await client.query(
          'SELECT id FROM customers WHERE id = $1',
          [customerId]
        );
        if (customerCheck.rowCount === 0) {
          throw new Error(`Customer ${customerId} does not exist.`);
        }

        const orderResult = await client.query(
          `INSERT INTO orders (customer_id, status) VALUES ($1, 'PENDING') RETURNING *`,
          [customerId]
        );
        const order = orderResult.rows[0];

        for (const item of items) {
          const productResult = await client.query(
            'SELECT price_cents, stock FROM products WHERE id = $1 FOR UPDATE',
            [item.productId]
          );
          if (productResult.rowCount === 0) {
            throw new Error(`Product ${item.productId} does not exist.`);
          }
          const product = productResult.rows[0];
          if (product.stock < item.quantity) {
            throw new Error(
              `Insufficient stock for product ${item.productId}: requested ${item.quantity}, have ${product.stock}.`
            );
          }

          await client.query(
            `INSERT INTO order_items (order_id, product_id, quantity, price_cents)
             VALUES ($1, $2, $3, $4)`,
            [order.id, item.productId, item.quantity, product.price_cents]
          );

          await client.query(
            'UPDATE products SET stock = stock - $1 WHERE id = $2',
            [item.quantity, item.productId]
          );
        }

        await client.query('COMMIT');
        return mapOrder(order);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },

    updateOrderStatus: async (_parent, { orderId, status }) => {
      const { rows } = await pool.query(
        'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
        [status, orderId]
      );
      if (rows.length === 0) {
        throw new Error(`Order ${orderId} does not exist.`);
      }
      return mapOrder(rows[0]);
    },
  },

  // ---- Field resolvers: this is where batching actually happens ----

  Order: {
    customer: async (order, _args, { loaders }) => {
      return mapCustomer(await loaders.customerById.load(order.customerId));
    },
    items: async (order, _args, { loaders }) => {
      const items = await loaders.itemsByOrderId.load(order.id);
      return items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        priceCents: item.price_cents,
        productId: item.product_id, // consumed by OrderItem.product below
      }));
    },
    totalCents: async (order, _args, { loaders }) => {
      const items = await loaders.itemsByOrderId.load(order.id);
      return items.reduce((sum, i) => sum + i.price_cents * i.quantity, 0);
    },
  },

  OrderItem: {
    product: async (item, _args, { loaders }) => {
      return mapProduct(await loaders.productById.load(item.productId));
    },
  },

  Customer: {
    orders: async (customer, _args, { loaders }) => {
      const orders = await loaders.ordersByCustomerId.load(customer.id);
      return orders.map(mapOrder);
    },
  },
};
