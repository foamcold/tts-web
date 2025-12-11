// lib/services/tts.service.ts
import { prisma } from '@/lib/prisma';
import { runPluginInWorker } from '@/lib/worker-runner';
import crypto from 'crypto';
import stringify from 'fast-json-stable-stringify';
import { config } from '@/lib/config';
import { NotFoundError, PluginError, ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';

// 定义 TTS 参数的接口
export interface TTSParams {
  text: string;
  pluginId: string;
  voice?: string;
  locale?: string;
  speed?: number;
  volume?: number;
  pitch?: number;
  debug?: boolean;
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


/**
 * 获取系统配置
 */
async function getSystemConfig(): Promise<{ cacheEnabled: boolean; logLevel: string }> {
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
  return { cacheEnabled: true, logLevel: 'INFO' };
}

/**
 * 清理过期缓存
 */
async function cleanupCache() {
  const expirationDate = new Date(Date.now() - config.cache.ttlMs);
  const deleteResult = await prisma.tTSCache.deleteMany({
    where: {
      createdAt: {
        lt: expirationDate
      }
    }
  });
  if (deleteResult.count > 0) {
    logger.info(`缓存清理: 已删除 ${deleteResult.count} 条过期记录`);
  }
}

/**
 * 根据参数生成语音
 * @param params TTS 参数
 * @returns 返回音频 Buffer 或调试信息
 */
export async function generateSpeech(params: TTSParams): Promise<TTSSuccessResult | TTSDebugResult> {
  // 1. 获取系统配置（缓存开关等）
  const systemConfig = await getSystemConfig();
  const { cacheEnabled } = systemConfig;

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

  // 7. 缓存处理 (非 debug 模式且缓存已启用)
  if (!debug && cacheEnabled) {
    const hashParams = {
      pluginId,
      text,
      locale,
      voice: targetVoice,
      speed,
      volume,
      pitch,
      config: runtimeConfig
    };
    const hashStr = stringify(hashParams);
    const cacheKey = crypto.createHash('md5').update(hashStr).digest('hex');

    const cached = await prisma.tTSCache.findUnique({ where: { hash: cacheKey } });
    if (cached) {
      logger.info(`缓存命中: ${cacheKey}`);
      // 将 Buffer 转换为 ArrayBuffer, 并确保类型正确
      const buffer = cached.audio;
      const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

      // 类型断言，确保我们传递的是 ArrayBuffer
      if (arrayBuffer instanceof SharedArrayBuffer) {
        // 如果是 SharedArrayBuffer, 创建一个 ArrayBuffer 的副本
        const newArrayBuffer = new ArrayBuffer(arrayBuffer.byteLength);
        new Uint8Array(newArrayBuffer).set(new Uint8Array(arrayBuffer));
        return { audio: newArrayBuffer, contentType: 'audio/mpeg', cache: 'HIT' };
      }

      return { audio: arrayBuffer, contentType: 'audio/mpeg', cache: 'HIT' };
    }

    logger.debug(`缓存未命中: ${cacheKey}，开始生成音频`);
  }

  // 8. 在 Worker 中执行插件（记录开始时间）
  const startTime = Date.now();
  const result = await runPluginInWorker({
    task: 'getAudio',
    code: plugin.code,
    config: runtimeConfig,
    text,
    locale,
    voice: targetVoice,
    speed: Number(speed),
    volume: Number(volume),
    pitch: Number(pitch),
    debug // 将 debug 标志传给 worker
  });
  const generationTime = Date.now() - startTime;

  if (!result.success) {
    const errorMessage = result.error.message || 'Worker returned an unspecific error';
    throw new PluginError(errorMessage);
  }

  const audioBuffer = Buffer.from(result.audioBuffer);
  // 在非调试模式下，空 buffer 是错误。在调试模式下，这是预期的。
  if (!debug && (!audioBuffer || audioBuffer.length === 0)) {
    throw new PluginError('Audio generation failed (empty buffer)');
  }

  logger.debug(`音频生成完成，大小: ${audioBuffer.length} 字节，耗时: ${generationTime}ms`);

  // 9. 根据是否为 debug 模式返回不同结果
  if (debug) {
    return {
      request: {
        text,
        pluginId,
        voice: targetVoice,
        locale,
        speed: Number(speed),
        volume: Number(volume),
        pitch: Number(pitch),
        config: runtimeConfig
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

  // 10. 写入缓存 (非 debug 模式且缓存已启用)
  if (cacheEnabled) {
    const hashParams = {
      pluginId, text, locale, voice: targetVoice, speed, volume, pitch, config: runtimeConfig
    };
    const hashStr = stringify(hashParams);
    const cacheKey = crypto.createHash('md5').update(hashStr).digest('hex');

    try {
      await prisma.tTSCache.create({ data: { hash: cacheKey, audio: audioBuffer } });
      logger.info(`缓存写入成功: ${cacheKey}`);

      // 随机触发缓存清理
      if (Math.random() < config.cache.cleanupProbability) {
        await cleanupCache();
      }
    } catch (e) {
      logger.warn('缓存写入失败', e);
    }
  }

  const arrayBuffer = audioBuffer.buffer.slice(audioBuffer.byteOffset, audioBuffer.byteOffset + audioBuffer.byteLength);
  return { audio: arrayBuffer, contentType: 'audio/mpeg', cache: 'MISS' };
}