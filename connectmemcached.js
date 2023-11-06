const { MemcacheClient } = require("memcache-client");

let client;

module.exports = {
  getMemcachedClient: () => {
    if (!client) {
      client = new MemcacheClient({
        server: {
          server: process.env.MEMCACHED_URL || "localhost:11211",
          maxConnections: 10, // With low maxConnections, we start getting `CLIENT_ERROR bad command line format` errors
        },
      });
    }

    return client;
  },
};
