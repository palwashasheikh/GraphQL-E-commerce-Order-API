# Order API (GraphQL + Postgres)

## Setup

```bash
npm install
cp .env.example .env   # then edit DATABASE_URL to point at your Postgres
npm run seed            # applies schema.sql + seed.sql
npm start                # starts Apollo Server on :4000
```

Requires a running Postgres instance. Nothing here provisions one for you —
`DATABASE_URL` must already point at a real database.

## Try it

Open http://localhost:4000 (Apollo Sandbox) and run:

```graphql
query {
  orderDetails(id: 1) {
    id
    status
    totalCents
    customer { name email }
    items {
      quantity
      priceCents
      product { name }
    }
  }
}
```

```graphql
mutation {
  createOrder(customerId: 1, items: [{ productId: 3, quantity: 2 }]) {
    id
    status
    totalCents
  }
}
```

## Why it's built this way

- **`order_items` join table**: an order holds multiple products at
  specific quantities and a *price snapshot* (today's product price
  isn't necessarily what the customer paid). This table is the actual
  "orders → products" relation your spec asked about.
- **DataLoader (`loaders/index.js`)**: without it, resolving `items` and
  `product` per order in a list triggers one SQL query per order/item —
  classic N+1. DataLoader batches those into one query per field per
  request, regardless of list size.
- **Money as integer cents**: floating-point dollars accumulate rounding
  errors. Don't store money as `Float` in production schemas.
- **`createOrder` transaction + row locking (`FOR UPDATE`)**: stock
  checks and decrements happen inside `BEGIN`/`COMMIT`, with row locks,
  so two simultaneous orders for the last unit of a product can't both
  succeed and oversell it.
- **Parameterized queries throughout**: no string-built SQL, so no
  injection surface.

## What's intentionally left out

This is a working skeleton, not production-ready as-is. Not included:
authentication/authorization, rate limiting, input validation beyond
basic checks, pagination cursors (offset pagination is fine for a demo,
bad at scale), and automated tests. Say if you want any of those added
next — don't assume "build an API" implicitly meant "build all of that
too."
