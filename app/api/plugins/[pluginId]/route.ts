// app/api/plugins/[pluginId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { updatePlugin, deletePlugin } from '@/lib/services/plugin.service';
import { withErrorHandler } from '@/lib/api-utils';
import { NotFoundError } from '@/lib/errors';

// PATCH 方法的 Zod Schema
const UpdatePluginSchema = z.object({
  isEnabled: z.boolean().optional(),
  config: z.record(z.string(), z.any()).optional(),
  name: z.string().optional(),
  author: z.string().optional(),
  version: z.number().int().positive().optional(),
});

// PATCH handler - 保持与 ApiHandler 兼容
const patchHandlerInternal = async (req: NextRequest, context?: { params: { pluginId: string } }, parsedBody?: any) => {
  const pluginId = context?.params?.pluginId;
  if (!pluginId) {
    throw new NotFoundError('Plugin ID is required in the URL');
  }
  const updatedPlugin = await updatePlugin(pluginId, parsedBody);
  return NextResponse.json(updatedPlugin);
};

// DELETE handler - 保持与 ApiHandler 兼容
const deleteHandlerInternal = async (req: NextRequest, context?: { params: { pluginId: string } }) => {
  const pluginId = context?.params?.pluginId;
  if (!pluginId) {
    throw new NotFoundError('Plugin ID is required in the URL');
  }
  await deletePlugin(pluginId);
  return NextResponse.json({ message: 'Plugin deleted successfully' });
};

// 使用 HOF 包装 handlers
const protectedPatch = withErrorHandler(patchHandlerInternal, { schema: UpdatePluginSchema });
const protectedDelete = withErrorHandler(deleteHandlerInternal);

// 导出实际的路由处理函数，在这里解析 Promise
export async function PATCH(req: NextRequest, context: { params: Promise<{ pluginId: string }> }) {
  const resolvedParams = await context.params;
  return protectedPatch(req, { params: resolvedParams });
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ pluginId: string }> }) {
  const resolvedParams = await context.params;
  return protectedDelete(req, { params: resolvedParams });
}