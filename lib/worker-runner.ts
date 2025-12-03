// lib/worker-runner.ts
import path from 'path';
import { Worker } from 'worker_threads';
import { config } from '@/lib/config';

export function runPluginInWorker(workerData: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const isProd = process.env.NODE_ENV === 'production';

    // 在开发模式下，我们直接使用 ts-node/esm 加载器来运行 .ts 文件。
    // 在生产模式下，我们运行由 `next build` 编译出的 .js 文件。
    const workerPath = isProd
      ? path.join(process.cwd(), '.next', 'server', 'lib', 'tts-engine', 'worker.js')
      : path.join(process.cwd(), 'lib', 'tts-engine', 'worker.ts');

    const workerOptions: import('worker_threads').WorkerOptions = {
      workerData,
      resourceLimits: config.worker.resourceLimits,
    };

    if (!isProd) {
      // 使用 ts-node/esm 加载器，这是在 worker 中运行 TS 的现代、可靠方法。
      workerOptions.execArgv = ['--loader', 'ts-node/esm'];
    }
      
    const worker = new Worker(workerPath, workerOptions);

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