const { MemcacheClient } = require("memcache-client");

let client;

module.exports = {
  getMemcachedClient: () => {
    if (!client) {
      client = new MemcacheClient({
        server: {
          server: process.env.MEMCACHED_URL || "localhost:11211",
          maxConnections: 100,
        },
      });
    }

    return client;
  },
};
