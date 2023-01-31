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
import { bootstrap } from "@libp2p/bootstrap";

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
  addresses: {
    listen: ["/ip4/0.0.0.0/tcp/0"],
  },
  dht: kadDHT({
    kBucketSize: Number.MAX_SAFE_INTEGER,
    protocolPrefix: "/dimension",
  }),
  transports: [tcp()],
  connectionEncryption: [noise()],
  peerDiscovery: [
    bootstrap({
      list: [
        "/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
        "/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb",
        "/dnsaddr/bootstrap.libp2p.io/p2p/QmZa1sAxajnQjVM8WjWXoMbmPd7NsWhfKsPkErzpm9wGkp",
        "/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa",
        "/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt",
      ],
    }),
  ],
});
await node.start();

for await (const event of node.dht.findPeer(node.peerId)) {
  console.info(event);
}

export { server };
