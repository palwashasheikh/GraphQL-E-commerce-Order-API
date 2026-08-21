INSERT INTO customers (name, email) VALUES
  ('Amina Yusuf', 'amina@example.com'),
  ('Rahul Mehta', 'rahul@example.com')
ON CONFLICT (email) DO NOTHING;

INSERT INTO products (name, price_cents, stock) VALUES
  ('Wireless Mouse', 2499, 100),
  ('Mechanical Keyboard', 8999, 50),
  ('USB-C Hub', 3499, 75)
ON CONFLICT DO NOTHING;

-- Order 1: Amina buys 2 mice + 1 keyboard
INSERT INTO orders (customer_id, status) VALUES (1, 'PAID');
INSERT INTO order_items (order_id, product_id, quantity, price_cents) VALUES
  (1, 1, 2, 2499),
  (1, 2, 1, 8999);

-- Order 2: Rahul buys 1 hub
INSERT INTO orders (customer_id, status) VALUES (2, 'PENDING');
INSERT INTO order_items (order_id, product_id, quantity, price_cents) VALUES
  (2, 3, 1, 3499);
