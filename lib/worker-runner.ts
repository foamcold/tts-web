// lib/worker-runner.ts
import { Worker } from 'worker_threads';
import { config } from '@/lib/config';

export function runPluginInWorker(workerData: any): Promise<any> {
  return new Promise((resolve, reject) => {
    // Point to the pure JS entry point, using .mjs to enforce ESM mode.
    // We rely on this file existing in the same directory structure relative to the runner.
    const worker = new Worker(new URL('./tts-engine/worker-entry.mjs', import.meta.url), {
      workerData,
      resourceLimits: config.worker.resourceLimits,
    });

    // 从配置文件读取超时时间
    const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error(`Plugin execution timed out (${config.worker.timeoutMs / 1000}s limit exceeded)`));
    }, config.worker.timeoutMs);

    worker.on('message', (result) => {
        clearTimeout(timeout);
      if (result.success) {
        // 只在成功时 resolve
        resolve(result);
      } else {
        // 在 worker 内部发生错误时 reject
        const error = new Error(result.error.message || 'Worker returned an unspecific error');
        error.stack = result.error.stack;
        reject(error);
      }
    });
    worker.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
    });
    worker.on('exit', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}