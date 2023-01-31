import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { loadSchema } from "@graphql-tools/load";
import { GraphQLFileLoader } from "@graphql-tools/graphql-file-loader";
import * as dotenv from "dotenv";
import { connectDB } from "./helpers/connectdb.js";
import { resolvers } from "./resolvers/index.js";
import { createLibp2p } from "libp2p";
import { tcp } from "@libp2p/tcp";
import { noise } from "@chainsafe/libp2p-noise";
import { kadDHT } from "@libp2p/kad-dht";
import { CID } from "multiformats/cid";
import * as json from "multiformats/codecs/json";
import { sha256 } from "multiformats/hashes/sha2";

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

const bytes = json.encode({
  identifier: "dimensions@0.0.1",
  name: "bebverse/dimensions",
});
const hash = await sha256.digest(bytes);
const cid = CID.create(1, json.code, hash);

const node = await createLibp2p({
  addresses: {
    listen: ["/ip4/0.0.0.0/tcp/0"],
  },
  dht: kadDHT({
    kBucketSize: Number.MAX_SAFE_INTEGER,
    protocolPrefix: "/dimension",
    clientMode: false,
  }),
  transports: [tcp()],
  connectionEncryption: [noise()],
});
await node.start();

for await (const event of node.dht.findProviders(cid, {
  queryFuncTimeout: 1000,
})) {
  console.info(event);
}

export { server };
