export interface Plugin {
  id: string;
  pluginId: string;
  name: string;
  author: string | null;
  version: number;
  code: string;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  config: string | null;
}

/**
 * 系统配置类型
 */
export interface SystemConfig {
  cacheEnabled: boolean;
  logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  // 重试配置
  retryMaxCount: number;
  retryIntervalSeconds: number;
  // 队列配置
  queueTimeoutSeconds: number;
}

/**
 * 队列状态类型（用于监控）
 */
export interface QueueStatus {
  pluginId: string;
  queueLength: number;
  isProcessing: boolean;
}

/**
 * 重试配置类型
 */
export interface RetryConfig {
  maxRetries: number;
  retryIntervalMs: number;
}