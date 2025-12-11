// lib/queue-manager.ts
/**
 * 按插件分别的请求管理器
 * 采用"最新优先"策略：新请求到来时取消队列中等待的旧请求
 */

import { logger } from './logger';
import { config } from './config';

// 请求被取消的错误类
export class RequestCancelledError extends Error {
  constructor(message: string = '请求已被新请求取消') {
    super(message);
    this.name = 'RequestCancelledError';
  }
}

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
  
  // 每个插件ID对应一个等待的请求（最新优先，所以只保留一个）
  private pendingRequests = new Map<string, QueuedRequest<any>>();
  
  // 每个插件的处理状态
  private processing = new Map<string, boolean>();

  private constructor() {
    logger.info('队列管理器已初始化（最新优先模式）');
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
   * 采用"最新优先"策略：新请求会取消该插件队列中等待的旧请求
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

      // 取消该插件之前等待的请求（如果有）
      const existingRequest = this.pendingRequests.get(pluginId);
      if (existingRequest) {
        logger.info(`新请求 ${requestId} 到来，取消旧请求 ${existingRequest.id}`);
        existingRequest.reject(new RequestCancelledError(`请求已被新请求 ${requestId} 取消`));
      }
      
      // 保存新请求为该插件的等待请求
      this.pendingRequests.set(pluginId, request);
      
      logger.info(`请求 ${requestId} 已设置为插件 [${pluginId}] 的待处理请求`);

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
    const request = this.pendingRequests.get(pluginId);
    
    if (!request) {
      this.processing.set(pluginId, false);
      logger.debug(`插件 [${pluginId}] 无待处理请求`);
      return;
    }

    // 从待处理队列中移除
    this.pendingRequests.delete(pluginId);
    this.processing.set(pluginId, true);

    // 检查是否超时（在队列中等待过久）
    const waitTime = Date.now() - request.enqueuedAt;
    const maxWaitTime = request.maxWaitTimeMs;
    
    if (waitTime > maxWaitTime) {
      logger.warn(`请求 ${request.id} 在队列中等待超时 (${waitTime}ms > ${maxWaitTime}ms)`);
      request.reject(new Error(`请求在队列中等待超时 (等待了 ${Math.round(waitTime / 1000)} 秒)`));
      // 继续处理下一个（如果在等待期间有新请求加入）
      this.processNext(pluginId);
      return;
    }

    logger.info(`开始处理插件 [${pluginId}] 的请求 ${request.id}，等待时间: ${waitTime}ms`);

    try {
      const result = await request.execute();
      request.resolve(result);
      logger.info(`请求 ${request.id} 处理完成`);
    } catch (error) {
      logger.error(`请求 ${request.id} 处理失败:`, error);
      request.reject(error as Error);
    } finally {
      // 无论成功失败，都处理下一个请求（如果有新请求在执行期间加入）
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
  getQueueStatus(): Record<string, { hasPending: boolean; isProcessing: boolean }> {
    const status: Record<string, { hasPending: boolean; isProcessing: boolean }> = {};
    
    for (const [pluginId] of this.pendingRequests) {
      status[pluginId] = {
        hasPending: true,
        isProcessing: this.processing.get(pluginId) || false,
      };
    }
    
    // 也包含正在处理但没有待处理请求的插件
    for (const [pluginId, isProcessing] of this.processing) {
      if (isProcessing && !status[pluginId]) {
        status[pluginId] = {
          hasPending: false,
          isProcessing: true,
        };
      }
    }
    
    return status;
  }

  /**
   * 检查指定插件是否有待处理的请求
   */
  hasPendingRequest(pluginId: string): boolean {
    return this.pendingRequests.has(pluginId);
  }

  /**
   * 检查指定插件是否正在处理请求
   */
  isProcessing(pluginId: string): boolean {
    return this.processing.get(pluginId) || false;
  }

  /**
   * 取消指定插件的待处理请求
   */
  cancelPending(pluginId: string): boolean {
    const request = this.pendingRequests.get(pluginId);
    if (request) {
      logger.info(`手动取消插件 [${pluginId}] 的待处理请求 ${request.id}`);
      request.reject(new RequestCancelledError('请求已被手动取消'));
      this.pendingRequests.delete(pluginId);
      return true;
    }
    return false;
  }
}

// 导出单例实例
export const queueManager = PluginQueueManager.getInstance();