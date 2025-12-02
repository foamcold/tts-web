import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateSpeech } from '@/lib/services/tts.service';
import { withErrorHandler } from '@/lib/api-utils';
import { ApiError } from '@/lib/errors';

// 定义 TTS 参数的 Zod Schema
const TTSSchema = z.object({
  text: z.string().min(1, { message: "Text is required" }),
  pluginId: z.string().optional(),
  voice: z.string().optional(),
  locale: z.string().optional(),
  speed: z.coerce.number().min(0).max(100).optional(),
  volume: z.coerce.number().min(0).max(100).optional(),
  pitch: z.coerce.number().min(0).max(100).optional(),
  debug: z.preprocess((val) => String(val) === 'true', z.boolean().optional()),
}).catchall(z.any()); // 允许其他未知参数

// 统一的请求处理 handler
// 统一的请求处理 handler
const ttsHandler = async (req: NextRequest, context?: { params: any }, parsedData?: any) => {
  // 经过 withErrorHandler 处理后，parsedData 必然存在且已校验
  const result = await generateSpeech(parsedData);

  
  // 根据结果类型返回响应
  if ('audio' in result) {
    // 成功生成音频
    return new NextResponse(result.audio, {
      headers: {
        'Content-Type': result.contentType,
        'Content-Length': result.audio.byteLength.toString(),
        'X-TTS-Cache': result.cache,
      },
    });
  } else {
    // 调试模式
    return NextResponse.json(result);
  }
};

// 使用 HOF 包装 handler
const handledTTS = withErrorHandler(ttsHandler, { schema: TTSSchema });

// 导出 GET 和 POST 方法
export async function GET(request: NextRequest, context: { params: any }) {
  return handledTTS(request, context);
}

export async function POST(request: NextRequest, context: { params: any }) {
  return handledTTS(request, context);
}