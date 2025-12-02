import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// 策略 1: 尝试相对于当前文件的 worker.ts (适用于直接 ts-node 执行或某些构建配置)
let tsWorkerPath = path.join(__dirname, 'worker.ts');

// 策略 2: 如果策略 1 失败，尝试基于项目根目录查找 (适用于 Next.js 开发模式)
// Next.js 开发服务器通常将 process.cwd() 设置为项目根目录
if (!fs.existsSync(tsWorkerPath)) {
    tsWorkerPath = path.join(process.cwd(), 'lib', 'tts-engine', 'worker.ts');
}

if (fs.existsSync(tsWorkerPath)) {
  // We are in dev (or source) mode. Use ts-node to register TS support.
  // Since we are in ESM, but ts-node's register hook is often CJS-centric or has export issues,
  // we can use `createRequire` to load the standard register hook.
  // This allows ts-node to compile subsequent .ts imports.
  require('ts-node').register({
    esm: true, // Enable ESM support in ts-node
    compilerOptions: {
        module: 'nodenext',
        moduleResolution: 'nodenext'
    }
  });

  // Now we can import the TS file.
  // We use absolute path URL for dynamic import
  await import(new URL(`file://${tsWorkerPath}`));
} else {
  // Production/Compiled mode fallback
  console.error("Worker Error: Could not find worker.ts source. Production build strategy may need adjustment.");
}