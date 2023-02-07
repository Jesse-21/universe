import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { loadSchema } from "@graphql-tools/load";
import { GraphQLFileLoader } from "@graphql-tools/graphql-file-loader";
import * as dotenv from "dotenv";
import { connectDB } from "./helpers/connectdb.js";
import { resolvers } from "./resolvers/index.js";
import { createDataLoaders } from "./dataloaders/index.js";

dotenv.config();

const typeDefs = await loadSchema("./schema/*.gql", {
  loaders: [new GraphQLFileLoader()],
});

await connectDB();

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const port = parseInt(process.argv[2]) || 4000;
const { url } = await startStandaloneServer(server, {
  listen: { port: port },
  context: async () => {
    const dataloaders = createDataLoaders();
    return { dataloaders };
  },
});

console.log(`🚀 Server ready at: ${url}`);
