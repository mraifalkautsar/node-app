const { redis } = require('../config/redis');

/**
 * Get Redis cache statistics
 * GET /admin/cache/stats
 */
const getCacheStats = async (req, res) => {
  try {
    // Get Redis info
    const info = await redis.info('stats');
    const memory = await redis.info('memory');
    const keyspace = await redis.info('keyspace');

    // Count flag-related keys
    const flagKeys = await redis.keys('flag:*');
    
    // Parse info strings
    const stats = parseRedisInfo(info);
    const memoryStats = parseRedisInfo(memory);
    const keyspaceStats = parseRedisInfo(keyspace);

    res.json({
      success: true,
      data: {
        connection: {
          connected: redis.status === 'ready',
          uptime: stats.uptime_in_seconds,
        },
        memory: {
          used: memoryStats.used_memory_human,
          peak: memoryStats.used_memory_peak_human,
          fragmentation_ratio: memoryStats.mem_fragmentation_ratio,
        },
        stats: {
          total_commands_processed: stats.total_commands_processed,
          instantaneous_ops_per_sec: stats.instantaneous_ops_per_sec,
          keyspace_hits: stats.keyspace_hits,
          keyspace_misses: stats.keyspace_misses,
          hit_rate: calculateHitRate(stats.keyspace_hits, stats.keyspace_misses),
        },
        cache: {
          total_flag_keys: flagKeys.length,
          databases: keyspaceStats,
        },
      },
    });
  } catch (error) {
    console.error('Get cache stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cache statistics',
    });
  }
};

/**
 * Clear all cache keys
 * POST /admin/cache/clear
 */
const clearCache = async (req, res) => {
  try {
    const { pattern } = req.body;
    
    let keysToDelete;
    if (pattern) {
      // Clear specific pattern
      keysToDelete = await redis.keys(pattern);
    } else {
      // Clear all flag caches
      keysToDelete = await redis.keys('flag:*');
    }

    if (keysToDelete.length > 0) {
      await redis.del(...keysToDelete);
    }

    res.json({
      success: true,
      message: `Cleared ${keysToDelete.length} cache keys`,
      data: {
        cleared: keysToDelete.length,
      },
    });
  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
    });
  }
};

/**
 * Get cache keys with pattern
 * GET /admin/cache/keys?pattern=flag:*
 */
const getCacheKeys = async (req, res) => {
  try {
    const { pattern = 'flag:*', limit = 100 } = req.query;
    
    const keys = await redis.keys(pattern);
    const limitedKeys = keys.slice(0, parseInt(limit));
    
    // Get values for the keys
    const pipeline = redis.pipeline();
    limitedKeys.forEach(key => {
      pipeline.get(key);
      pipeline.ttl(key);
    });
    
    const results = await pipeline.exec();
    
    const keyData = [];
    for (let i = 0; i < limitedKeys.length; i++) {
      const key = limitedKeys[i];
      const value = results[i * 2][1];
      const ttl = results[i * 2 + 1][1];
      
      keyData.push({
        key,
        value: value ? JSON.parse(value) : null,
        ttl,
      });
    }

    res.json({
      success: true,
      data: {
        total: keys.length,
        showing: keyData.length,
        keys: keyData,
      },
    });
  } catch (error) {
    console.error('Get cache keys error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cache keys',
    });
  }
};

/**
 * Parse Redis INFO command output
 */
const parseRedisInfo = (infoString) => {
  const lines = infoString.split('\r\n');
  const parsed = {};
  
  lines.forEach(line => {
    if (line && !line.startsWith('#')) {
      const [key, value] = line.split(':');
      if (key && value) {
        parsed[key] = isNaN(value) ? value : parseFloat(value);
      }
    }
  });
  
  return parsed;
};

/**
 * Calculate cache hit rate percentage
 */
const calculateHitRate = (hits, misses) => {
  const total = parseInt(hits) + parseInt(misses);
  if (total === 0) return 0;
  return ((parseInt(hits) / total) * 100).toFixed(2);
};

module.exports = {
  getCacheStats,
  clearCache,
  getCacheKeys,
};
