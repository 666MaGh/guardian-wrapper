import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

try {
  const runtime = JSON.parse(readFileSync(new URL('../runtime.json', import.meta.url), 'utf8'));
  if (typeof runtime.cli !== 'string') throw new Error('Invalid runtime binding');
  const { main } = await import(pathToFileURL(runtime.cli).href);
  process.exitCode = await main(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error(`Rebind the runtime by rerunning guardian-wrapper init ${fileURLToPath(new URL('../../', import.meta.url))}`);
  process.exitCode = 1;
}
