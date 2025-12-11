import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const url = new URL(request.url);
  const path = decodeURIComponent(url.pathname + url.search);
  
  logger.info(`收到请求 GET ${path}`);
  
  const { searchParams } = url;
  const key = searchParams.get('key');

  try {
    if (key) {
      // 获取单个配置
      const config = await prisma.config.findUnique({ where: { key } });
      const duration = Date.now() - startTime;
      logger.info(`请求完成 GET ${path} 200 ${duration}ms`);
      if (config) {
        return NextResponse.json(JSON.parse(config.value || '{}'));
      }
      return NextResponse.json({});
    } else {
      // 获取所有配置
      const configs = await prisma.config.findMany();
      const configMap: Record<string, string> = {};
      configs.forEach((c: { key: string; value: string }) => {
        configMap[c.key] = c.value;
      });
      const duration = Date.now() - startTime;
      logger.info(`请求完成 GET ${path} 200 ${duration}ms`);
      return NextResponse.json(configMap);
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`请求失败 GET ${path} ${duration}ms`, error);
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const url = new URL(request.url);
  const path = decodeURIComponent(url.pathname + url.search);
  
  logger.info(`收到请求 POST ${path}`);
  
  const { searchParams } = url;
  const key = searchParams.get('key');

  try {
    const body = await request.json();

    if (key) {
      // 更新单个配置
      const value = JSON.stringify(body);
      await prisma.config.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    } else {
      // 批量更新
      const updates = [];
      for (const [k, v] of Object.entries(body)) {
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'object') {
          updates.push(
            prisma.config.upsert({
              where: { key: k },
              update: { value: JSON.stringify(v) },
              create: { key: k, value: JSON.stringify(v) },
            })
          );
        }
      }
      await prisma.$transaction(updates);
    }

    const duration = Date.now() - startTime;
    logger.info(`请求完成 POST ${path} 200 ${duration}ms`);
    return NextResponse.json({ success: true });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`请求失败 POST ${path} ${duration}ms`, error);
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
  }
}