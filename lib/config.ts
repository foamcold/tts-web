// lib/config.ts

/**
 * 从环境变量中读取数字，如果无效则返回默认值
 * @param key 环境变量的键
 * @param defaultValue 默认值
 */
function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value) {
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  return defaultValue;
}

export const config = {
  // Worker 相关配置
  worker: {
    // 插件执行超时时间 (毫秒)
    timeoutMs: getEnvNumber('WORKER_TIMEOUT_MS', 15000),
    
    // Worker 资源限制
    resourceLimits: {
      maxOldGenerationSizeMb: getEnvNumber('WORKER_MAX_OLD_GEN_MB', 512),
      maxYoungGenerationSizeMb: getEnvNumber('WORKER_MAX_YOUNG_GEN_MB', 128),
      codeRangeSizeMb: getEnvNumber('WORKER_CODE_RANGE_MB', 64),
    },
  },

  // 缓存相关配置
  cache: {
    // 缓存清理的概率 (0 到 1 之间)
    cleanupProbability: getEnvNumber('CACHE_CLEANUP_PROBABILITY', 0.01),
    // 缓存过期时间 (毫秒)
    ttlMs: getEnvNumber('CACHE_TTL_MS', 24 * 60 * 60 * 1000), // 1 day
  },
};