const { MemcacheClient } = require("memcache-client");

module.exports = {
  getMemcachedClient: () => {
    // always return a new client since this client is unstable when used in multiple threads
    // Unstability: MemcachedConnection.receiveResult#188 Cannot set properties of undefined (setting 'error')
    return new MemcacheClient({
      server: {
        server: process.env.MEMCACHED_URL || "localhost:11211",
        maxConnections: 1,
      },
    });
  },
};
