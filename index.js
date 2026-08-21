import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { typeDefs } from './graphql/typeDefs.js';
import { resolvers } from './graphql/resolvers.js';
import { createLoaders } from './loaders/index.js';

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: process.env.PORT || 4000 },
  // Fresh DataLoader instances per request — see loaders/index.js for why.
  context: async () => ({
    loaders: createLoaders(),
  }),
});

console.log(`Order API ready at ${url}`);
