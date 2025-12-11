// lib/queue-manager.ts
/**
 * 按插件分别排队的队列管理器
 * 确保同一插件同一时间只处理一个TTS请求
 */

import { logger } from './logger';
import { config } from './config';

interface QueuedRequest<T> {
  id: string;
  pluginId: string;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: Error) => void;
  enqueuedAt: number;
  maxWaitTimeMs: number;
}

class PluginQueueManager {
  private static instance: PluginQueueManager;
  
  // 每个插件ID对应一个请求队列
  private queues = new Map<string, QueuedRequest<any>[]>();
  
  // 每个插件的处理状态
  private processing = new Map<string, boolean>();

  private constructor() {
    logger.info('队列管理器已初始化');
  }

  /**
   * 获取单例实例
   */
  static getInstance(): PluginQueueManager {
    if (!PluginQueueManager.instance) {
      PluginQueueManager.instance = new PluginQueueManager();
    }
    return PluginQueueManager.instance;
  }

  /**
   * 将请求加入队列并等待执行
   * @param pluginId 插件ID
   * @param execute 执行函数
   * @param maxWaitTimeMs 最大等待时间（毫秒），可选，默认从配置读取
   * @returns Promise，在请求完成时resolve
   */
  async enqueue<T>(pluginId: string, execute: () => Promise<T>, maxWaitTimeMs?: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const requestId = this.generateRequestId();
      
      // 保存超时配置到请求对象
      const timeoutMs = maxWaitTimeMs ?? config.queue?.maxWaitTimeMs ?? 300000;
      
      const request: QueuedRequest<T> = {
        id: requestId,
        pluginId,
        execute,
        resolve,
        reject,
        enqueuedAt: Date.now(),
        maxWaitTimeMs: timeoutMs,
      };

      // 获取或创建该插件的队列
      if (!this.queues.has(pluginId)) {
        this.queues.set(pluginId, []);
      }
      
      const queue = this.queues.get(pluginId)!;
      queue.push(request);
      
      const queuePosition = queue.length;
      logger.info(`请求 ${requestId} 已加入插件 [${pluginId}] 队列，位置: ${queuePosition}`);

      // 如果当前没有在处理，开始处理
      if (!this.processing.get(pluginId)) {
        this.processNext(pluginId);
      }
    });
  }

  /**
   * 处理队列中的下一个请求
   */
  private async processNext(pluginId: string): Promise<void> {
    const queue = this.queues.get(pluginId);
    
    if (!queue || queue.length === 0) {
      this.processing.set(pluginId, false);
      logger.debug(`插件 [${pluginId}] 队列已空`);
      return;
    }

    this.processing.set(pluginId, true);
    const request = queue.shift()!;
    const remainingCount = queue.length;

    // 检查是否超时（在队列中等待过久）
    const waitTime = Date.now() - request.enqueuedAt;
    const maxWaitTime = request.maxWaitTimeMs;
    
    if (waitTime > maxWaitTime) {
      logger.warn(`请求 ${request.id} 在队列中等待超时 (${waitTime}ms > ${maxWaitTime}ms)`);
      request.reject(new Error(`请求在队列中等待超时 (等待了 ${Math.round(waitTime / 1000)} 秒)`));
      // 继续处理下一个
      this.processNext(pluginId);
      return;
    }

    logger.info(`开始处理插件 [${pluginId}] 的请求 ${request.id}，等待时间: ${waitTime}ms，剩余队列: ${remainingCount}`);

    try {
      const result = await request.execute();
      request.resolve(result);
      logger.info(`请求 ${request.id} 处理完成`);
    } catch (error) {
      logger.error(`请求 ${request.id} 处理失败:`, error);
      request.reject(error as Error);
    } finally {
      // 无论成功失败，都处理下一个请求
      this.processNext(pluginId);
    }
  }

  /**
   * 生成唯一请求ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 获取所有队列的状态（用于监控/调试）
   */
  getQueueStatus(): Record<string, { queueLength: number; isProcessing: boolean }> {
    const status: Record<string, { queueLength: number; isProcessing: boolean }> = {};
    
    for (const [pluginId, queue] of this.queues) {
      status[pluginId] = {
        queueLength: queue.length,
        isProcessing: this.processing.get(pluginId) || false,
      };
    }
    
    return status;
  }

  /**
   * 获取指定插件的队列长度
   */
  getQueueLength(pluginId: string): number {
    const queue = this.queues.get(pluginId);
    return queue ? queue.length : 0;
  }

  /**
   * 检查指定插件是否正在处理请求
   */
  isProcessing(pluginId: string): boolean {
    return this.processing.get(pluginId) || false;
  }

  /**
   * 清理空队列（可选，用于内存优化）
   */
  cleanupEmptyQueues(): void {
    for (const [pluginId, queue] of this.queues) {
      if (queue.length === 0 && !this.processing.get(pluginId)) {
        this.queues.delete(pluginId);
        this.processing.delete(pluginId);
      }
    }
  }
}

// 导出单例实例
export const queueManager = PluginQueueManager.getInstance();