// lib/services/tts.service.ts
import { prisma } from '@/lib/prisma';
import { runPluginInWorker } from '@/lib/worker-runner';
import crypto from 'crypto';
import stringify from 'fast-json-stable-stringify';
import { config } from '@/lib/config';
import { NotFoundError, PluginError, ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { queueManager } from '@/lib/queue-manager';
import type { RetryConfig, SystemConfig } from '@/types';

// 定义 TTS 参数的接口
export interface TTSParams {
  text: string;
  pluginId?: string;
  voice?: string;
  locale?: string;
  speed?: number;
  volume?: number;
  pitch?: number;
  debug?: boolean;
  signal?: AbortSignal; // 添加 AbortSignal
  [key: string]: any; // 捕获其他配置项
}

// 定义 TTS 成功时的返回类型
export interface TTSSuccessResult {
  audio: ArrayBuffer;
  contentType: string;
  cache: 'HIT' | 'MISS';
}

// 定义 TTS 调试模式的返回类型
export interface TTSDebugResult {
  request: {
    text: string;
    pluginId: string;
    voice: string;
    locale: string;
    speed: number;
    volume: number;
    pitch: number;
    config: any;
  };
  result: {
    audioBase64: string;
    contentType: string;
    audioSize: number;  // 音频大小（字节）
    generationTime: number;  // 生成耗时（毫秒）
  };
  logs: any[];  // 插件执行日志
}

// 处理后的参数接口（内部使用）
interface ProcessedParams {
  text: string;
  pluginId: string;
  locale: string;
  voice: string;
  speed: number;
  volume: number;
  pitch: number;
  runtimeConfig: Record<string, any>;
  debug: boolean;
}


/**
 * 获取系统配置（包含重试配置和队列配置）
 */
async function getSystemConfig(): Promise<Partial<SystemConfig>> {
  try {
    const systemConfigRecord = await prisma.config.findUnique({
      where: { key: 'system-config' }
    });
    if (systemConfigRecord) {
      return JSON.parse(systemConfigRecord.value || '{}');
    }
  } catch (e) {
    logger.warn('读取系统配置失败，使用默认值', e);
  }
  return { cacheEnabled: true, cacheMaxCount: 100, logLevel: 'INFO' };
}

/**
 * 获取重试配置
 */
async function getRetryConfig(): Promise<RetryConfig> {
  const systemConfig = await getSystemConfig();
  return {
    maxRetries: systemConfig.retryMaxCount ?? config.retry.maxRetries,
    retryIntervalMs: (systemConfig.retryIntervalSeconds ?? config.retry.retryIntervalMs / 1000) * 1000,
  };
}

/**
 * 获取队列超时配置（毫秒）
 */
async function getQueueTimeoutMs(): Promise<number> {
  const systemConfig = await getSystemConfig();
  // 从系统配置读取秒数，转换为毫秒；若未设置则使用环境变量配置
  if (systemConfig.queueTimeoutSeconds !== undefined) {
    return systemConfig.queueTimeoutSeconds * 1000;
  }
  return config.queue?.maxWaitTimeMs ?? 300000; // 默认5分钟
}

/**
 * 延迟函数
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new Error('Aborted'));
    }

    const timer = setTimeout(resolve, ms);
    
    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new Error('Aborted'));
      }, { once: true });
    }
  });
}

/**
 * 验证音频是否有效
 */
function isValidAudio(audioBuffer: Buffer): boolean {
  // 检查音频大小
  if (!audioBuffer || audioBuffer.length === 0) {
    return false;
  }
  
  // 可以添加更多验证逻辑，如检查文件头
  // MP3文件通常以 0xFF 0xFB 开头，或者有 ID3 标签
  // 这里简单验证长度即可
  return true;
}

/**
 * 按数量清理缓存
 */
async function cleanupCache(maxCount: number) {
  try {
    const currentCount = await prisma.tTSCache.count();
    const excessCount = currentCount - maxCount;

    if (excessCount > 0) {
      logger.info(`缓存数量 ${currentCount} 超出上限 ${maxCount}，开始清理...`);
      // 找出最旧的记录
      const oldestRecords = await prisma.tTSCache.findMany({
        orderBy: { createdAt: 'asc' },
        take: excessCount,
        select: { id: true },
      });

      const idsToDelete = oldestRecords.map(record => record.id);

      // 删除最旧的记录
      const deleteResult = await prisma.tTSCache.deleteMany({
        where: { id: { in: idsToDelete } },
      });

      if (deleteResult.count > 0) {
        logger.info(`缓存清理: 成功删除 ${deleteResult.count} 条最旧的记录`);
      }
    } else {
      logger.debug(`缓存数量 ${currentCount} 未超出上限 ${maxCount}，无需清理`);
    }
  } catch (error) {
    logger.error('缓存清理失败', error);
  }
}

/**
 * 带重试的TTS生成核心逻辑
 * 在Worker中执行插件，失败时自动重试
 */
async function executeWithRetry(
  pluginCode: string,
  processedParams: ProcessedParams,
  retryConfig: RetryConfig,
  signal?: AbortSignal
): Promise<{ audioBuffer: Buffer; generationTime: number }> {
  let lastError: Error = new Error('Unknown error');
  const totalStartTime = Date.now();

  for (let attempt = 1; attempt <= retryConfig.maxRetries; attempt++) {
    // 在每次尝试前检查是否取消
    if (signal?.aborted) {
      logger.info('TTS生成任务被取消，停止重试');
      throw new Error('Request aborted by client');
    }

    try {
      const attemptStartTime = Date.now();
      
      const result = await runPluginInWorker({
        task: 'getAudio',
        code: pluginCode,
        config: processedParams.runtimeConfig,
        text: processedParams.text,
        locale: processedParams.locale,
        voice: processedParams.voice,
        speed: processedParams.speed,
        volume: processedParams.volume,
        pitch: processedParams.pitch,
        debug: false, // 重试模式下不使用debug
      });

      if (!result.success) {
        throw new Error(result.error?.message || 'Worker returned an error');
      }

      const audioBuffer = Buffer.from(result.audioBuffer);
      
      // 验证音频有效性
      if (!isValidAudio(audioBuffer)) {
        throw new Error('生成的音频无效或为空');
      }

      const generationTime = Date.now() - attemptStartTime;
      logger.info(`TTS生成成功，第${attempt}次尝试，耗时: ${generationTime}ms`);
      
      return { audioBuffer, generationTime };

    } catch (error: any) {
      lastError = error;
      logger.warn(`TTS生成失败，第${attempt}/${retryConfig.maxRetries}次尝试: ${error.message}`);

      if (attempt < retryConfig.maxRetries) {
        // 添加 ±1000ms 的随机抖动
        const jitter = Math.floor(Math.random() * 2000) - 1000;
        const delay = Math.max(0, retryConfig.retryIntervalMs + jitter);
        
        logger.info(`等待 ${delay}ms (${retryConfig.retryIntervalMs}ms ±1s) 后重试...`);
        try {
          await sleep(delay, signal);
        } catch (e) {
          if (signal?.aborted) {
            logger.info('等待重试期间任务被取消');
            throw new Error('Request aborted by client');
          }
          throw e;
        }
      }
    }
  }

  const totalTime = Date.now() - totalStartTime;
  throw new PluginError(`TTS生成失败，已重试${retryConfig.maxRetries}次 (总耗时: ${Math.round(totalTime / 1000)}秒): ${lastError.message}`);
}

/**
 * 预处理参数：合并默认配置，获取插件信息
 */
async function preprocessParams(params: TTSParams): Promise<{
  processedParams: ProcessedParams;
  plugin: { code: string; pluginId: string };
  cacheEnabled: boolean;
}> {
  // 1. 获取系统配置（缓存开关等）
  const systemConfig = await getSystemConfig();
  const cacheEnabled = systemConfig.cacheEnabled ?? true;

  // 2. 获取默认 TTS 配置
  const defaultConfigRecord = await prisma.config.findUnique({
    where: { key: 'default-tts-config' },
  });
  const defaultConfig = defaultConfigRecord ? JSON.parse(defaultConfigRecord.value || '{}') : {};

  // 3. 合并配置 (优先级: 请求参数 > 数据库默认配置)
  const effectiveParams = { ...defaultConfig, ...params };

  const {
    text,
    pluginId,
    voice,
    locale = 'zh-CN',
    speed = 50,
    volume = 50,
    pitch = 50,
    debug = false,
    ...otherConfig
  } = effectiveParams;

  // 排除 signal，避免将其作为普通配置项处理
  // @ts-ignore - signal is not in otherConfig type but exists in params
  if (otherConfig.signal) delete otherConfig.signal;

  // 4. 校验 pluginId 是否存在
  if (!pluginId) {
    throw new ValidationError('Plugin ID is required. Please provide it in the request or set a default plugin.');
  }

  // 5. 获取插件信息
  const plugin = await prisma.plugin.findUnique({
    where: { pluginId: pluginId }
  });

  if (!plugin || !plugin.isEnabled) {
    throw new NotFoundError('Plugin not found or disabled');
  }

  // 6. 准备配置和目标音色
  const savedConfig = JSON.parse(plugin.config || '{}');
  const runtimeConfig = { ...savedConfig, ...otherConfig };
  const targetVoice = voice || 'default';

  return {
    processedParams: {
      text,
      pluginId,
      locale,
      voice: targetVoice,
      speed: Number(speed),
      volume: Number(volume),
      pitch: Number(pitch),
      runtimeConfig,
      debug,
    },
    plugin: {
      code: plugin.code,
      pluginId: plugin.pluginId,
    },
    cacheEnabled,
  };
}

/**
 * 尝试从缓存获取音频
 */
async function tryGetFromCache(
  processedParams: ProcessedParams,
  cacheEnabled: boolean
): Promise<TTSSuccessResult | null> {
  if (processedParams.debug || !cacheEnabled) {
    return null;
  }

  const hashParams = {
    pluginId: processedParams.pluginId,
    text: processedParams.text,
    locale: processedParams.locale,
    voice: processedParams.voice,
    speed: processedParams.speed,
    volume: processedParams.volume,
    pitch: processedParams.pitch,
    config: processedParams.runtimeConfig
  };
  const hashStr = stringify(hashParams);
  const cacheKey = crypto.createHash('md5').update(hashStr).digest('hex');

  const cached = await prisma.tTSCache.findUnique({ where: { hash: cacheKey } });
  if (cached) {
    logger.info(`缓存命中: ${cacheKey}`);
    const buffer = cached.audio;
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

    if (arrayBuffer instanceof SharedArrayBuffer) {
      const newArrayBuffer = new ArrayBuffer(arrayBuffer.byteLength);
      new Uint8Array(newArrayBuffer).set(new Uint8Array(arrayBuffer));
      return { audio: newArrayBuffer, contentType: 'audio/mpeg', cache: 'HIT' };
    }

    return { audio: arrayBuffer, contentType: 'audio/mpeg', cache: 'HIT' };
  }

  logger.debug(`缓存未命中: ${cacheKey}，将生成音频`);
  return null;
}

/**
 * 写入缓存
 */
async function writeToCache(
  processedParams: ProcessedParams,
  audioBuffer: Buffer,
  cacheEnabled: boolean
): Promise<void> {
  if (!cacheEnabled) return;

  const hashParams = {
    pluginId: processedParams.pluginId,
    text: processedParams.text,
    locale: processedParams.locale,
    voice: processedParams.voice,
    speed: processedParams.speed,
    volume: processedParams.volume,
    pitch: processedParams.pitch,
    config: processedParams.runtimeConfig
  };
  const hashStr = stringify(hashParams);
  const cacheKey = crypto.createHash('md5').update(hashStr).digest('hex');

  try {
    await prisma.tTSCache.create({ data: { hash: cacheKey, audio: audioBuffer } });
    logger.info(`缓存写入成功: ${cacheKey}`);

    // 随机触发缓存清理
    if (Math.random() < config.cache.cleanupProbability) {
      const systemConfig = await getSystemConfig();
      const maxCount = systemConfig.cacheMaxCount ?? 100;
      await cleanupCache(maxCount);
    }
  } catch (e) {
    logger.warn('缓存写入失败', e);
  }
}

/**
 * 直接生成TTS（调试模式使用，不走队列和重试）
 */
async function generateSpeechDirect(params: TTSParams): Promise<TTSDebugResult> {
  const { processedParams, plugin } = await preprocessParams(params);

  const startTime = Date.now();
  const result = await runPluginInWorker({
    task: 'getAudio',
    code: plugin.code,
    config: processedParams.runtimeConfig,
    text: processedParams.text,
    locale: processedParams.locale,
    voice: processedParams.voice,
    speed: processedParams.speed,
    volume: processedParams.volume,
    pitch: processedParams.pitch,
    debug: true,
  });
  const generationTime = Date.now() - startTime;

  if (!result.success) {
    throw new PluginError(result.error?.message || 'Worker returned an error');
  }

  const audioBuffer = Buffer.from(result.audioBuffer);

  return {
    request: {
      text: processedParams.text,
      pluginId: processedParams.pluginId,
      voice: processedParams.voice,
      locale: processedParams.locale,
      speed: processedParams.speed,
      volume: processedParams.volume,
      pitch: processedParams.pitch,
      config: processedParams.runtimeConfig
    },
    result: {
      audioBase64: audioBuffer ? audioBuffer.toString('base64') : '',
      contentType: 'audio/mpeg',
      audioSize: audioBuffer ? audioBuffer.length : 0,
      generationTime
    },
    logs: result.logs || []
  };
}

/**
 * 队列化生成TTS（正常模式，走队列和重试）
 */
async function generateSpeechQueued(params: TTSParams): Promise<TTSSuccessResult> {
  // 1. 预处理参数
  const { processedParams, plugin, cacheEnabled } = await preprocessParams(params);

  // 2. 尝试从缓存获取（缓存命中则直接返回，不进队列）
  const cachedResult = await tryGetFromCache(processedParams, cacheEnabled);
  if (cachedResult) {
    return cachedResult;
  }

  // 3. 获取重试配置和队列超时配置
  const retryConfig = await getRetryConfig();
  const queueTimeoutMs = await getQueueTimeoutMs();

  // 4. 将请求加入对应插件的队列
  logger.info(`请求加入插件 [${plugin.pluginId}] 队列，超时: ${queueTimeoutMs / 1000}秒`);
  
  const audioBuffer = await queueManager.enqueue(
    plugin.pluginId,
    async () => {
      // 这个函数在队列轮到时执行
      // 再次检查信号，因为在队列中等待时可能已被取消
      if (params.signal?.aborted) {
        throw new Error('Request aborted by client');
      }
      const { audioBuffer } = await executeWithRetry(plugin.code, processedParams, retryConfig, params.signal);
      return audioBuffer;
    },
    queueTimeoutMs
  );

  // 5. 写入缓存
  await writeToCache(processedParams, audioBuffer, cacheEnabled);

  // 6. 返回结果
  const slicedBuffer = audioBuffer.buffer.slice(audioBuffer.byteOffset, audioBuffer.byteOffset + audioBuffer.byteLength);
  
  // 处理 SharedArrayBuffer 的情况
  let arrayBuffer: ArrayBuffer;
  if (slicedBuffer instanceof SharedArrayBuffer) {
    arrayBuffer = new ArrayBuffer(slicedBuffer.byteLength);
    new Uint8Array(arrayBuffer).set(new Uint8Array(slicedBuffer));
  } else {
    arrayBuffer = slicedBuffer;
  }
  
  return { audio: arrayBuffer, contentType: 'audio/mpeg', cache: 'MISS' };
}

/**
 * 根据参数生成语音（主入口）
 * @param params TTS 参数
 * @returns 返回音频 Buffer 或调试信息
 */
export async function generateSpeech(params: TTSParams): Promise<TTSSuccessResult | TTSDebugResult> {
  // 调试模式：不使用队列和重试，直接执行
  if (params.debug) {
    logger.debug('调试模式：跳过队列和重试');
    return generateSpeechDirect(params);
  }

  // 正常模式：使用队列和重试
  return generateSpeechQueued(params);
}