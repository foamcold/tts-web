import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  try {
    if (key) {
      // 获取单个配置
      const config = await prisma.config.findUnique({ where: { key } });
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
      return NextResponse.json(configMap);
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
  }
}