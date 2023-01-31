import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { loadSchema } from "@graphql-tools/load";
import { GraphQLFileLoader } from "@graphql-tools/graphql-file-loader";
import * as dotenv from "dotenv";
import { connectDB } from "./helpers/connectdb.js";
import { resolvers } from "./resolvers/index.js";
import { createLibp2p } from "libp2p";
import { webSockets } from "@libp2p/websockets";
import { noise } from "@chainsafe/libp2p-noise";
import { kadDHT } from "@libp2p/kad-dht";

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

const node = await createLibp2p({
  dht: kadDHT(),
  transports: [webSockets()],
  connectionEncryption: [noise()],
});
await node.start();

for await (const event of node.dht.findPeer(node.peerId)) {
  console.info(event);
}

export { server };
