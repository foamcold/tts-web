import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if we are running in a source environment where the TS file exists
const tsWorkerPath = path.join(__dirname, 'worker.ts');

if (fs.existsSync(tsWorkerPath)) {
  // We are in dev (or source) mode. Use ts-node to register TS support.
  // We must use 'await import' for ts-node/register/esm because we are in an ESM project.
  await import('ts-node/register/esm');
  await import('./worker.ts');
} else {
  // We are likely in production/compiled mode.
  // Next.js build output structure is tricky for unbundled server files.
  // BUT, if we are here, it means this JS file was executed.
  // If the worker logic was compiled to JS alongside it, we can import it.
  
  // Note: In a typical Next.js standalone build, we might need a different strategy,
  // but for now, let's assume the build output maintains relative sibling structure
  // or that we will rely on ts-node for dev and a custom build step for prod if needed.
  
  // For this fix, getting DEV mode working is the priority.
  console.error("Worker Error: Could not find worker.ts source. Production build strategy may need adjustment.");
}