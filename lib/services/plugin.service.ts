// lib/services/plugin.service.ts
import { prisma } from '@/lib/prisma';
import { runPluginInWorker } from '@/lib/worker-runner';
import { PluginError } from '@/lib/errors';

/**
 * 获取所有插件
 */
export async function getAllPlugins() {
  return prisma.plugin.findMany({
    orderBy: { updatedAt: 'desc' }
  });
}

/**
 * 导入一个或多个插件
 * @param pluginsData 插件数据，可以是单个对象或对象数组
 */
export async function importPlugins(pluginsData: any) {
  const inputs = Array.isArray(pluginsData) ? pluginsData : [pluginsData];

  // 1. 在事务之外先进行代码验证，避免无效代码占用数据库事务资源
  for (const item of inputs) {
     if (!item.pluginId || !item.code) continue;
     const validationResult = await runPluginInWorker({
        task: 'validate',
        code: item.code,
        config: {},
     });
     if (!validationResult.success) {
        const errorMessage = validationResult.error?.message || 'Unknown validation error';
        throw new PluginError(`Plugin ${item.name || item.pluginId} validation failed: ${errorMessage}`);
     }
  }

  // 2. 所有插件验证通过后，在单个事务中执行数据库操作
  return prisma.$transaction(async (tx) => {
    const results = [];
    for (const item of inputs) {
      if (!item.pluginId || !item.code) continue;
      
      const plugin = await tx.plugin.upsert({
        where: { pluginId: item.pluginId },
        update: {
          name: item.name,
          author: item.author,
          version: item.version,
          code: item.code,
          config: JSON.stringify(item.config || {}),
          updatedAt: new Date(),
        },
        create: {
          pluginId: item.pluginId,
          name: item.name,
          author: item.author,
          version: item.version,
          code: item.code,
          config: JSON.stringify(item.config || {}),
        },
      });
      results.push(plugin);
    }
    return results;
  });
}

/**
 * 更新插件（例如，启用/禁用）
 * @param pluginId 插件 ID
 * @param data 要更新的数据
 */
export async function updatePlugin(pluginId: string, data: {
  isEnabled?: boolean;
  config?: any;
  name?: string;
  author?: string;
  version?: number
}) {
  const { config, ...restData } = data;
  
  return prisma.plugin.update({
    where: { pluginId },
    data: {
      ...restData,
      ...(config && { config: JSON.stringify(config) }),
    },
  });
}

/**
 * 删除插件
 * @param pluginId 插件 ID
 */
export async function deletePlugin(pluginId: string) {
  return prisma.plugin.delete({
    where: { pluginId },
  });
}