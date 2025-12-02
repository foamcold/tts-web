// lib/services/api.ts
import { notify } from '@/components/Notification';

// 统一的请求函数
async function request(url: string, options: RequestInit = {}) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'An unknown error occurred' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  } catch (error: any) {
    console.error('API request error:', error);
    notify.error(error.message || 'Request failed');
    throw error;
  }
}

// 获取所有插件
export const getPlugins = () => {
  return request('/api/plugins');
};

// 导入插件
export const importPlugins = (plugins: any) => {
  return request('/api/plugins', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(plugins),
  });
};

// 获取插件元数据 (locales and voices)
export const getPluginMeta = (pluginId: string, locale?: string) => {
  const params = new URLSearchParams();
  if (locale) {
    params.append('locale', locale);
  }
  return request(`/api/plugins/${encodeURIComponent(pluginId)}/meta?${params.toString()}`);
};

// 生成 TTS 音频
export const generateTTS = async (values: any, debugMode: boolean) => {
  if (debugMode) {
    // 调试模式，期望 JSON 响应
    return request('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...values, debug: true }),
    });
  } else {
    // 普通模式，期望 Blob 响应
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'An unknown error occurred' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error('Received empty audio stream from server.');
      }
      return blob;
    } catch (error: any) {
       console.error('API request error (blob):', error);
       notify.error(error.message || 'Request failed');
       throw error;
    }
  }
};

// 更新插件
export const updatePlugin = (pluginId: string, data: { isEnabled?: boolean; config?: any; name?: string; author?: string; version?: number }) => {
  return request(`/api/plugins/${encodeURIComponent(pluginId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

// 删除插件
export const deletePlugin = (pluginId: string) => {
  return request(`/api/plugins/${encodeURIComponent(pluginId)}`, {
    method: 'DELETE',
  });
};
// 获取配置
export const getConfig = (key: string) => {
  return request(`/api/config?key=${key}`);
};

// 保存配置
export const saveConfig = (key: string, data: any) => {
  return request(`/api/config?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};