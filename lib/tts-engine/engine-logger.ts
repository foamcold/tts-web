// lib/tts-engine/engine-logger.ts
// TTS 引擎专用日志模块（worker 环境）

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
 * Engine Logger 类
 */
class EngineLogger {
  private level: LogLevel = LogLevel.INFO;

  constructor() {
    // 从环境变量读取日志等级
    const envLevel = process.env.LOG_LEVEL?.toLowerCase();
    if (envLevel) {
      const map: Record<string, LogLevel> = {
        debug: LogLevel.DEBUG,
        info: LogLevel.INFO,
        warn: LogLevel.WARN,
        error: LogLevel.ERROR,
      };
      if (map[envLevel] !== undefined) {
        this.level = map[envLevel];
      }
    }
  }

  private formatMessage(level: LogLevel, message: string, args: unknown[]): string {
    return `${getTimestamp()} [${LOG_LEVEL_NAMES[level]}] ${message}${formatArgs(args)}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage(LogLevel.DEBUG, message, args));
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage(LogLevel.INFO, message, args));
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage(LogLevel.WARN, message, args));
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage(LogLevel.ERROR, message, args));
    }
  }
}

export const engineLogger = new EngineLogger();