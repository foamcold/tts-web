// lib/tts-engine/worker.ts
import { parentPort, workerData } from 'worker_threads';
import { PluginExecutor } from './plugin-executor.ts';

/**
 * 这个 worker 脚本在一个独立的线程中运行，以隔离插件执行环境
 * 避免 Next.js 的打包机制干扰 sync-request 等库的正常运行。
 */
async function runPlugin() {
  if (!parentPort) {
    throw new Error('This script must be run as a worker thread.');
  }

  const { task } = workerData;

  try {
    if (task === 'getAudio') {
      const { code, config, text, locale, voice, speed, volume, pitch, debug } = workerData;
      const executor = new PluginExecutor(code, config);
      const audioBuffer = await executor.getAudio(text, locale, voice, speed, volume, pitch, debug);
      const logs = executor.getLogs();
      // audioBuffer 已经是 Buffer，不需要 .buffer
      parentPort.postMessage({ success: true, audioBuffer, logs });
    } else if (task === 'getMeta') {
        const { code, config, locale } = workerData;
        const executor = new PluginExecutor(code, config);
        const pluginJS = executor.getPluginJS();
        const editorJS = executor.getEditorJS();

        let locales: string[] = [];
        if (editorJS && editorJS.getLocales) {
            locales = editorJS.getLocales();
        } else if (pluginJS && (pluginJS as any).getLocales) {
            locales = (pluginJS as any).getLocales();
        } else {
            locales = ['zh-CN']; // 默认值
        }

        const targetLocale = locale || locales[0];
        
        let voices: any = {};
        if (pluginJS && (pluginJS as any).getVoices) {
            voices = (pluginJS as any).getVoices(targetLocale);
        } else if (editorJS && editorJS.getVoices) {
            voices = editorJS.getVoices(targetLocale);
        }
        
        parentPort.postMessage({ success: true, meta: { locales, voices, currentLocale: targetLocale } });
    } else if (task === 'validate') {
        const { code } = workerData;
        // 尝试初始化
        new PluginExecutor(code, {});
        // 如果没有抛出错误，则验证通过
        parentPort.postMessage({ success: true });
    } else {
        throw new Error(`Unknown task: ${task}`);
    }
  } catch (error: any) {
    // 将错误信息发送回主线程
    parentPort.postMessage({
      success: false,
      error: {
        message: error.message,
        stack: error.stack
      }
    });
  }
}

runPlugin();