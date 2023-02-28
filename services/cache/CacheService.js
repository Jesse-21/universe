const { KeyValueCache } = require("../../models/cache/KeyValueCache");
const { Service: NormalizeCacheService } = require("./NormalizeCacheService");

class CacheService extends NormalizeCacheService {
  async set({ key, params, value, expiresAt }) {
    const normalizedKey = this.normalize({ key, params });
    return KeyValueCache.updateOrCreate({
      key: normalizedKey,
      value: JSON.stringify({ value }),
      expiresAt,
    });
  }

  async get({ key, params }) {
    const normalizedKey = this.normalize({ key, params });
    const found = await KeyValueCache.findOne({
      key: normalizedKey,
    });
    const notExpired = found?.expiresAt > new Date() || !found?.expiresAt;
    if (found && notExpired) {
      return JSON.parse(found.value).value;
    }
    return null;
  }

  /**
   * Get value from cache if it exists and is not expired.
   * Else, set the value in the cache with callback fn and return the value.
   */
  async getOrCallbackAndSet(callback, { key, params, expiresAt }) {
    try {
      const exist = await this.get({ key, params });
      if (exist) {
        return exist;
      }
    } catch (e) {
      // continue
      console.log(e);
    }
    const newValue = await callback?.();
    if (newValue) {
      this.set({ key, params, value: newValue, expiresAt }); // no need to await
    }
    return newValue;
  }
}

module.exports = { Service: CacheService };
