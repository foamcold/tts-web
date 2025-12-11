// lib/client-logger.ts
// 客户端日志模块 - 提供统一的日志格式和等级控制

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
 * 客户端日志类
 * 提供统一的日志格式：时间 [日志等级] 日志内容
 */
class ClientLogger {
  private level: LogLevel = LogLevel.INFO;
  private static readonly STORAGE_KEY = 'log-level';

  constructor() {
    this.loadLevelFromStorage();
  }

  /**
   * 从 localStorage 加载日志等级
   */
  private loadLevelFromStorage(): void {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const stored = window.localStorage.getItem(ClientLogger.STORAGE_KEY);
      if (stored) {
        const level = parseInt(stored, 10);
        if (level >= LogLevel.DEBUG && level <= LogLevel.ERROR) {
          this.level = level;
        }
      }
    } catch {
      // 忽略 localStorage 错误
    }
  }

  /**
   * 设置日志等级
   */
  setLevel(level: LogLevel): void {
    this.level = level;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(ClientLogger.STORAGE_KEY, String(level));
      } catch {
        // 忽略 localStorage 错误
      }
    }
  }

  /**
   * 获取当前日志等级
   */
  getLevel(): LogLevel {
    return this.level;
  }

  /**
   * 格式化时间为 YYYY-MM-DD HH:mm:ss
   */
  private formatTime(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  }

  /**
   * 格式化日志消息
   */
  private formatMessage(level: LogLevel, message: string): string {
    return `${this.formatTime()} [${LOG_LEVEL_NAMES[level]}] ${message}`;
  }

  /**
   * 输出调试日志
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(this.formatMessage(LogLevel.DEBUG, message), ...args);
    }
  }

  /**
   * 输出信息日志
   */
  info(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      console.info(this.formatMessage(LogLevel.INFO, message), ...args);
    }
  }

  /**
   * 输出警告日志
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(this.formatMessage(LogLevel.WARN, message), ...args);
    }
  }

  /**
   * 输出错误日志
   */
  error(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(this.formatMessage(LogLevel.ERROR, message), ...args);
    }
  }
}

// 导出单例
export const clientLogger = new ClientLogger();