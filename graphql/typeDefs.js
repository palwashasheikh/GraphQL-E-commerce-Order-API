export const typeDefs = `#graphql
  type Customer {
    id: ID!
    name: String!
    email: String!
    createdAt: String!
    orders: [Order!]!
  }

  type Product {
    id: ID!
    name: String!
    priceCents: Int!
    stock: Int!
  }

  # A single line item within an order — this is the join row between
  # orders and products. It carries its own price snapshot.
  type OrderItem {
    id: ID!
    product: Product!
    quantity: Int!
    priceCents: Int!
  }

  enum OrderStatus {
    PENDING
    PAID
    SHIPPED
    CANCELLED
  }

  type Order {
    id: ID!
    status: OrderStatus!
    createdAt: String!
    customer: Customer!
    items: [OrderItem!]!
    totalCents: Int!
  }

  input OrderItemInput {
    productId: ID!
    quantity: Int!
  }

  type Query {
    # Queries (5)
    getOrders(status: OrderStatus, customerId: ID): [Order!]!
    getProduct(id: ID!): Product
    getCustomer(id: ID!): Customer
    listProducts(limit: Int = 20, offset: Int = 0): [Product!]!
    orderDetails(id: ID!): Order
  }

  type Mutation {
    # Mutations (2)
    createOrder(customerId: ID!, items: [OrderItemInput!]!): Order!
    updateOrderStatus(orderId: ID!, status: OrderStatus!): Order!
  }
`;
