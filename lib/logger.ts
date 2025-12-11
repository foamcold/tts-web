// lib/logger.ts
// 统一日志模块 - 提供格式化日志输出功能

import { prisma } from '@/lib/prisma';

/**
 * 日志等级枚举
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * 日志等级名称映射
 */
const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
};

/**
 * 日志配置接口
 */
interface LoggerConfig {
  level: LogLevel;           // 最低输出等级
  enableTimestamp: boolean;  // 是否显示时间戳
}

/**
 * 从字符串解析日志等级
 * @param level 日志等级字符串
 * @returns LogLevel 或 undefined
 */
function parseLogLevel(level?: string): LogLevel | undefined {
  if (!level) return undefined;
  const map: Record<string, LogLevel> = {
    debug: LogLevel.DEBUG,
    info: LogLevel.INFO,
    warn: LogLevel.WARN,
    error: LogLevel.ERROR,
  };
  return map[level.toLowerCase()];
}

/**
 * 获取当前时间戳字符串
 * 格式：YYYY-MM-DD HH:mm:ss
 */
function getTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

/**
 * 格式化参数为字符串
 * @param args 参数数组
 * @returns 格式化后的字符串
 */
function formatArgs(args: unknown[]): string {
  if (args.length === 0) return '';
  return ' ' + args.map(arg => {
    if (arg instanceof Error) {
      return arg.message;
    }
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');
}

/**
 * Logger 类 - 统一日志管理
 */
class Logger {
  private config: LoggerConfig;
  private cachedLevel: LogLevel | null = null;
  private lastFetchTime: number = 0;
  private readonly CACHE_TTL = 5000; // 5 秒缓存

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: parseLogLevel(process.env.LOG_LEVEL) ?? LogLevel.INFO,
      enableTimestamp: true,
      ...config,
    };
  }

  /**
   * 从数据库同步日志等级配置
   * 使用缓存减少数据库查询次数
   */
  private async syncLevelFromDB(): Promise<void> {
    const now = Date.now();
    if (this.cachedLevel !== null && now - this.lastFetchTime < this.CACHE_TTL) {
      this.config.level = this.cachedLevel;
      return;
    }
    
    try {
      const systemConfig = await prisma.config.findUnique({
        where: { key: 'system-config' },
      });
      
      if (systemConfig?.value) {
        const parsed = JSON.parse(systemConfig.value);
        if (parsed.logLevel) {
          const level = parseLogLevel(parsed.logLevel);
          if (level !== undefined) {
            this.cachedLevel = level;
            this.config.level = level;
            this.lastFetchTime = now;
          }
        }
      }
    } catch {
      // 查询失败时使用默认等级，不影响日志输出
    }
  }

  /**
   * 同步方式获取当前生效的日志等级（用于检查）
   */
  private getEffectiveLevel(): LogLevel {
    if (this.cachedLevel !== null) {
      return this.cachedLevel;
    }
    return this.config.level;
  }

  /**
   * 设置日志等级
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * 获取当前日志等级
   */
  getLevel(): LogLevel {
    return this.config.level;
  }

  /**
   * 从字符串设置日志等级
   */
  setLevelFromString(level: string): void {
    const parsed = parseLogLevel(level);
    if (parsed !== undefined) {
      this.config.level = parsed;
    }
  }

  /**
   * 格式化日志消息
   * 格式：时间 [等级] 消息 参数
   */
  private formatMessage(level: LogLevel, message: string, args: unknown[]): string {
    const timestamp = this.config.enableTimestamp ? `${getTimestamp()} ` : '';
    const levelName = LOG_LEVEL_NAMES[level];
    const argsStr = formatArgs(args);
    return `${timestamp}[${levelName}] ${message}${argsStr}`;
  }

  /**
   * 检查是否应该输出该等级的日志
   */
  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  /**
   * 输出 DEBUG 级别日志
   * @param message 日志消息
   * @param args 附加参数
   */
  debug(message: string, ...args: unknown[]): void {
    // 先同步检查缓存的等级
    if (LogLevel.DEBUG >= this.getEffectiveLevel()) {
      console.log(this.formatMessage(LogLevel.DEBUG, message, args));
    }
    // 异步更新缓存（不阻塞日志输出）
    this.syncLevelFromDB().catch(() => {});
  }

  /**
   * 输出 INFO 级别日志
   * @param message 日志消息
   * @param args 附加参数
   */
  info(message: string, ...args: unknown[]): void {
    if (LogLevel.INFO >= this.getEffectiveLevel()) {
      console.log(this.formatMessage(LogLevel.INFO, message, args));
    }
    this.syncLevelFromDB().catch(() => {});
  }

  /**
   * 输出 WARN 级别日志
   * @param message 日志消息
   * @param args 附加参数
   */
  warn(message: string, ...args: unknown[]): void {
    if (LogLevel.WARN >= this.getEffectiveLevel()) {
      console.warn(this.formatMessage(LogLevel.WARN, message, args));
    }
    this.syncLevelFromDB().catch(() => {});
  }

  /**
   * 输出 ERROR 级别日志
   * @param message 日志消息
   * @param args 附加参数
   */
  error(message: string, ...args: unknown[]): void {
    if (LogLevel.ERROR >= this.getEffectiveLevel()) {
      console.error(this.formatMessage(LogLevel.ERROR, message, args));
    }
    this.syncLevelFromDB().catch(() => {});
  }

  /**
   * 清除缓存，强制下次从数据库读取
   */
  clearCache(): void {
    this.cachedLevel = null;
    this.lastFetchTime = 0;
  }
}

/**
 * 解析日志等级字符串的辅助函数（导出供外部使用）
 */
export function parseLogLevelString(level: string): LogLevel | undefined {
  return parseLogLevel(level);
}

/**
 * 默认 Logger 实例（单例）
 */
export const logger = new Logger();

/**
 * 创建新的 Logger 实例
 * @param config 日志配置
 */
export function createLogger(config?: Partial<LoggerConfig>): Logger {
  return new Logger(config);
}