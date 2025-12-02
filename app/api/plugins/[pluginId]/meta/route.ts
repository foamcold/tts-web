import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { runPluginInWorker } from '@/lib/worker-runner';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pluginId: string }> }
) {
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

    return NextResponse.json(result.meta);


  } catch (error: any) {
    console.error('Plugin Meta API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}