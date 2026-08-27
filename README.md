# GraphQL E-commerce Order API

A GraphQL API for managing orders, products, and customers, built with
Apollo Server and PostgreSQL. Built as a practice project to learn
relational joins in GraphQL and how to avoid the N-plus-one query problem.

## Stack

- Node.js
- Apollo Server 4
- PostgreSQL (via the `pg` driver)
- DataLoader (batching and caching for the relational join)

## Setup

```bash
npm install
cp .env.example .env   # then edit DATABASE_URL to point at your Postgres
npm run seed            # applies schema.sql + seed.sql
npm start                # starts Apollo Server on :4000
```

Requires a running Postgres instance. Nothing here provisions one for you —
`DATABASE_URL` must already point at a real database.

## Schema

Four tables: `customers`, `products`, `orders`, and `order_items`.
`order_items` is the join table between orders and products — each row is
one line item, holding a quantity and a price snapshot from when the order
was placed (not today's live product price).

## API

**Queries:** `getOrders`, `getProduct`, `getCustomer`, `listProducts`, `orderDetails`

**Mutations:** `createOrder`, `updateOrderStatus`

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
  "orders to products" relation this project is meant to demonstrate.
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

## Questions this project is meant to answer, if asked

- What happens if two customers order the last unit of the same product
  at the same time? (See the row-locking point above — one request
  waits for the other's transaction to finish, so stock can't go negative.)
- Why not just query `product` inside a loop over `items`? (N+1 queries —
  see the DataLoader point above.)
- Why is price stored on `order_items` instead of just joining to
  `products.price_cents`? (Live product price can change after the
  order was placed; the snapshot preserves what was actually paid.)

## What's intentionally left out

This is a working skeleton, not production-ready as-is. Not included:
authentication/authorization, rate limiting, input validation beyond
basic checks, pagination cursors (offset pagination is fine for a demo,
bad at scale), and automated tests.