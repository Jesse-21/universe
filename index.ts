import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { loadSchema } from "@graphql-tools/load";
import { GraphQLFileLoader } from "@graphql-tools/graphql-file-loader";
import * as dotenv from "dotenv";
import { connectDB } from "./helpers/connectdb.js";
import { resolvers } from "./resolvers/index.js";

dotenv.config();

const typeDefs = await loadSchema("./schema/*.gql", {
  loaders: [new GraphQLFileLoader()],
});

await connectDB();

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});

console.log(`🚀 Server ready at: ${url}`);

export { server };
