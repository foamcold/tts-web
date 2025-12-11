import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { runPluginInWorker } from '@/lib/worker-runner';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pluginId: string }> }
) {
  const startTime = Date.now();
  const url = new URL(request.url);
  const path = url.pathname + url.search;
  
  logger.info(`收到请求 GET ${path}`);
  
  try {
    const { pluginId } = await params;
    const plugin = await prisma.plugin.findUnique({
      where: { pluginId: pluginId }
    });

    if (!plugin) {
      return NextResponse.json({ error: 'Plugin not found' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const targetLocale = searchParams.get('locale');

    const result = await runPluginInWorker({
      task: 'getMeta',
      code: plugin.code,
      config: JSON.parse(plugin.config || '{}'),
      locale: targetLocale
    });

    if (!result.success) {
      const error = new Error(result.error.message);
      error.stack = result.error.stack;
      throw error;
    }

    const duration = Date.now() - startTime;
    logger.info(`请求完成 GET ${path} 200 ${duration}ms`);
    return NextResponse.json(result.meta);


  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.error(`请求失败 GET ${path} ${duration}ms`, error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}