// lib/api-utils.ts
import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema } from 'zod';
import { ApiError, ValidationError } from './errors';

// context 参数设为可选，以兼容非动态路由
type ApiHandler = (req: NextRequest, context?: { params: any }, parsedBody?: any) => Promise<NextResponse>;

interface HandlerOptions {
  schema?: ZodSchema<any>;
}

// 返回类型也需要更新
export function withErrorHandler(handler: ApiHandler, options: HandlerOptions = {}): (req: NextRequest, context: { params: any }) => Promise<NextResponse> {
  return async (req: NextRequest, context: { params: any }) => {
    try {
      let parsedBody;
      
      // 1. 参数解析与 Zod 校验 (仅针对 body)
            // 1. 根据请求方法确定参数来源并进行 Zod 校验
      if (options.schema) {
        let inputData: any;
        if (req.method === 'GET') {
          // 从 URLSearchParams 创建对象
          const searchParams = req.nextUrl.searchParams;
          inputData = Object.fromEntries(searchParams.entries());
        } else if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
          inputData = await req.json();
        }
        
        const parseResult = options.schema.safeParse(inputData);
        if (!parseResult.success) {
          throw new ValidationError('Invalid parameters', parseResult.error.flatten().fieldErrors);
        }
        parsedBody = parseResult.data;
      } else if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        // 如果没有 schema，但方法需要 body，仍然尝试解析
        try {
          parsedBody = await req.json();
        } catch (e) {
          // 如果解析失败，可能是 body 为空或格式错误，可以根据业务逻辑决定是否抛出错误
          // 这里我们暂时将其设为 null，让 handler 自行处理
          parsedBody = null;
        }
      }
      
      // 2. 执行核心 handler, 传入 context 和 parsedBody
            return await handler(req, context, parsedBody);
      
    } catch (error: any) {
      console.error(`[API Error] ${req.method} ${req.url}:`, error);

      // 3. 统一错误响应处理
      if (error instanceof ApiError) {
        return NextResponse.json({ error: error.message, details: (error as any).details }, { status: error.statusCode });
      }
      
      // 处理来自 service 层的特定业务错误 (兼容旧的 error.name)
      if (error.name === 'PluginError' || error.name === 'NotFoundError') {
          return NextResponse.json({ error: error.message }, { status: 400 });
      }

      // 其他未知错误
      return NextResponse.json(
        { error: 'Internal Server Error', details: error.message },
        { status: 500 }
      );
    }
  };
}