// lib/errors.ts

/**
 * 通用的 API 错误基类
 */
export class ApiError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    // 保持正确的堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
    this.name = 'ApiError';
  }
}

/**
 * 用于表示资源未找到的错误 (404)
 */
export class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * 用于表示参数验证失败的错误 (400)
 */
export class ValidationError extends ApiError {
  public readonly details?: any;

  constructor(message = 'Invalid parameters', details?: any) {
    super(message, 400);
    this.name = 'ValidationError';
    this.details = details;
  }
}

/**
 * 用于表示插件执行失败的错误
 */
export class PluginError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PluginError';
    }
}