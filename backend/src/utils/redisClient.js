const Redis = require('redis');
require('dotenv').config();

class RedisClient {
  constructor() {
    // Simple in-memory cache as primary for development
    // Will use Redis in production if available
    this.cache = new Map();
    this.redisClient = null;
    this.useRedis = false;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    // Only use Redis in production with valid URL
    if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL) {
      try {
        console.log('Initializing Redis connection...');
        this.redisClient = Redis.createClient({
          url: process.env.REDIS_URL,
          socket: {
            connectTimeout: 10000,
            // Disable all reconnection logic for Upstash
            reconnectStrategy: false
          }
        });

        // SILENT error handler - Upstash disconnects are expected
        this.redisClient.on('error', () => {
          // Completely ignore errors - they're expected with serverless Redis
        });

        await this.redisClient.connect();
        
        // Quick test
        await this.redisClient.set('test', 'connected', { EX: 5 });
        const result = await this.redisClient.get('test');
        
        if (result === 'connected') {
          this.useRedis = true;
          console.log('✅ Redis connected successfully');
        } else {
          console.log('⚠️  Redis test failed, using memory cache');
        }
      } catch (error) {
        console.log('⚠️  Redis connection failed, using memory cache:', error.message);
      }
    } else {
      console.log('💾 Using in-memory cache (development mode)');
    }
    
    this.initialized = true;
  }

  // Get a client (Redis or memory)
  async getClient() {
    await this.init();
    
    if (this.useRedis && this.redisClient) {
      return {
        get: async (key) => {
          try {
            return await this.redisClient.get(key);
          } catch (error) {
            // Fallback to memory cache on Redis error
            const item = this.cache.get(key);
            return item ? item.value : null;
          }
        },
        set: async (key, value, options = {}) => {
          try {
            if (options.EX) {
              await this.redisClient.set(key, value, { EX: options.EX });
            } else {
              await this.redisClient.set(key, value);
            }
            
            // Also store in memory cache as backup
            this.cache.set(key, {
              value,
              expiry: options.EX ? Date.now() + (options.EX * 1000) : null
            });
            
            return 'OK';
          } catch (error) {
            // Store in memory cache only
            this.cache.set(key, {
              value,
              expiry: options.EX ? Date.now() + (options.EX * 1000) : null
            });
            return 'OK';
          }
        },
        setex: async (key, ttl, value) => {
          return this.set(key, value, { EX: ttl });
        },
        del: async (key) => {
          try {
            await this.redisClient.del(key);
          } catch (error) {
            // Ignore Redis errors
          }
          this.cache.delete(key);
          return 1;
        },
        exists: async (key) => {
          try {
            return await this.redisClient.exists(key);
          } catch (error) {
            return this.cache.has(key) ? 1 : 0;
          }
        },
        isReady: true
      };
    }
    
    // Memory-only client
    return {
      get: async (key) => {
        const item = this.cache.get(key);
        if (!item) return null;
        
        if (item.expiry && Date.now() > item.expiry) {
          this.cache.delete(key);
          return null;
        }
        
        return item.value;
      },
      set: async (key, value, options = {}) => {
        this.cache.set(key, {
          value,
          expiry: options.EX ? Date.now() + (options.EX * 1000) : null
        });
        return 'OK';
      },
      setex: async (key, ttl, value) => {
        return this.set(key, value, { EX: ttl });
      },
      del: async (key) => {
        this.cache.delete(key);
        return 1;
      },
      exists: async (key) => {
        return this.cache.has(key) ? 1 : 0;
      },
      isReady: true
    };
  }

  // Public methods - simple and reliable
  async get(key) {
    const client = await this.getClient();
    return client.get(key);
  }

  async set(key, value, ttl = null) {
    const client = await this.getClient();
    if (ttl) {
      return client.set(key, value, { EX: ttl });
    }
    return client.set(key, value);
  }

  async setex(key, ttl, value) {
    return this.set(key, value, ttl);
  }

  async del(key) {
    const client = await this.getClient();
    return client.del(key);
  }

  async exists(key) {
    const client = await this.getClient();
    return client.exists(key);
  }

  // Special method for your use case
  async cacheWithTTL(key, fetchFunction, ttl = 300) {
    const cached = await this.get(key);
    if (cached) {
      console.log(`📦 Cache HIT: ${key}`);
      return JSON.parse(cached);
    }
    
    console.log(`🔄 Cache MISS: ${key}, fetching from DB...`);
    const data = await fetchFunction();
    await this.setex(key, ttl, JSON.stringify(data));
    return data;
  }
}

// Singleton instance
const redisClient = new RedisClient();

// Pre-initialize on first require
redisClient.init().catch(console.error);

module.exports = redisClient;