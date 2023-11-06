const { MemcacheClient } = require("memcache-client");

module.exports = {
  getMemcachedClient: () => {
    // always return a new client since this client is unstable when used in multiple threads
    return new MemcacheClient({
      server: {
        server: process.env.MEMCACHED_URL || "localhost:11211",
        maxConnections: 1,
      },
    });
  },
};
