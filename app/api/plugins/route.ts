import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAllPlugins, importPlugins } from '@/lib/services/plugin.service';
import { withErrorHandler } from '@/lib/api-utils';

// 定义单个插件的 Zod Schema
const PluginSchema = z.object({
  pluginId: z.string().min(1),
  name: z.string().optional(),
  author: z.string().optional(),
  version: z.union([z.string(), z.number()]).optional(),
  code: z.string().min(1),
  config: z.record(z.string(), z.any()).optional(),
});

// 支持单个插件对象或插件对象数组
const ImportPluginsSchema = z.array(PluginSchema);

// GET handler
const getHandler = async (req: NextRequest, context?: { params: any }) => {
  const plugins = await getAllPlugins();
  return NextResponse.json(plugins);
};

// POST handler
const postHandler = async (req: NextRequest, context?: { params: any }, parsedBody?: any) => {
  const results = await importPlugins(parsedBody);
  return NextResponse.json(results);
};

// 使用 HOF 包装 handlers
export const GET = withErrorHandler(getHandler);

export const POST = withErrorHandler(postHandler, {
  schema: ImportPluginsSchema,
});