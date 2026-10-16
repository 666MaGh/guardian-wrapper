import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { chmodSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { assetsRoot } from './bundle.js';
import { applyPlan, readOptional, safePath } from './files.js';
import { memoryHealth } from './memory.js';

const serverUrl: string = 'http://127.0.0.1:8008';

async function docker(root: string, args: string[], timeout: number = 120000): Promise<void> {
  await new Promise<void>((resolve, reject): void => {
    const child = spawn('docker', ['compose', '--project-directory', root, '-f', join(root, 'compose.yaml'), '-p', 'guardian-memory', ...args], { stdio: 'inherit', shell: false });
    const timer = setTimeout((): void => { child.kill('SIGTERM'); reject(new Error('Local memory setup timed out. Data was retained; inspect Docker and retry.')); }, timeout);
    child.once('error', reject);
    child.once('close', (code: number | null): void => { clearTimeout(timer); if (code === 0) resolve(); else reject(new Error('Docker memory command failed. Keep the existing data, inspect Docker logs, then retry onboarding.')); });
  });
}

export async function runMemoryService(action: string, dryRun: boolean): Promise<void> {
  if (!['start', 'stop', 'status'].includes(action)) throw new Error('Use memory service start|stop|status [--dry-run]');
  const root = safePath(homedir(), '.guardian/honcho-service');
  if (dryRun) {
    console.log(`Would ${action} the local memory service at ${root}. Start reuses a healthy server on ${serverUrl}; otherwise installs pinned Docker Honcho, PostgreSQL, Ollama models and OpenConcho. No commands, downloads or API calls were made.`);
    return;
  }
  if (action === 'start' || action === 'status') {
    const healthy = await memoryHealth(serverUrl);
    console.log(`Local Honcho: ${healthy ? 'available' : 'unavailable'} at ${serverUrl}`);
    if (action === 'status' || healthy) { console.log('Dashboard, if installed: http://127.0.0.1:8088'); return; }
  }
  const info = spawnSync('docker', ['info', '--format', '{{.MemTotal}}'], { encoding: 'utf8', timeout: 15000 });
  if (info.status !== 0 || info.error) throw new Error('Open Docker Desktop and wait until it is running, then ask Guardian to continue. Guardian itself works without Docker.');
  const endpoint = spawnSync('docker', ['context', 'inspect', '--format', '{{.Endpoints.docker.Host}}'], { encoding: 'utf8', timeout: 10000 });
  const host = process.env.DOCKER_HOST ?? endpoint.stdout?.trim() ?? '';
  if (!host.startsWith('unix://') && !host.startsWith('npipe://')) throw new Error('Choose a local Docker context. Guardian will not provision private memory on a remote Docker host.');
  if (action === 'start' && Number(info.stdout.trim()) < 6 * 1024 ** 3) throw new Error('The all-Docker models need at least 6 GiB allocated to Docker (8 GiB recommended). In Docker Desktop, increase Resources → Memory, or reuse an existing local Honcho server. No other containers were stopped.');
  if (action === 'stop') {
    if (readOptional(root, 'compose.yaml') === null) throw new Error('No wrapper-managed service found. An independently installed server must be stopped through its own Docker project.');
    await docker(root, ['stop']);
    console.log('Memory service stopped; models, workspaces and messages retained.');
    return;
  }
  mkdirSync(root, { recursive: true, mode: 0o700 });
  if (readOptional(root, 'compose.yaml') === null) {
    const files = ['compose.yaml', 'config.toml'].map(path => ({ path, before: null, after: readFileSync(join(assetsRoot, 'honcho', path)) }));
    files.push({ path: 'init.sql', before: null, after: Buffer.from('CREATE EXTENSION IF NOT EXISTS vector;\nCREATE EXTENSION IF NOT EXISTS pg_trgm;\n') });
    files.push({ path: '.env', before: null, after: Buffer.from(`GUARDIAN_HONCHO_DB_PASSWORD=${randomBytes(24).toString('hex')}\n`) });
    applyPlan({ root, installation: null, changes: files });
    chmodSync(safePath(root, '.env'), 0o600);
  }
  console.log('Preparing local memory. First run downloads container images and about 3.1 GB of models. On Macs this portable Docker mode uses CPU; an existing native-GPU Honcho setup is reused instead when available.');
  await docker(root, ['up', '-d', '--wait', '--wait-timeout', '120', 'database', 'ollama'], 10 * 60 * 1000);
  for (const model of ['qwen3:4b-instruct', 'qwen3-embedding:0.6b']) {
    console.log(`Downloading/checking local model: ${model}`);
    const progress = setInterval((): void => { console.log(`Still preparing ${model}. Downloads are retained if setup is interrupted.`); }, 30000);
    try { await docker(root, ['exec', '-T', 'ollama', 'sh', '-c', 'exec ollama pull "$1" > /tmp/guardian-model-download.log 2>&1', 'sh', model], 20 * 60 * 1000); }
    finally { clearInterval(progress); }
  }
  await docker(root, ['up', '-d'], 10 * 60 * 1000);
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await memoryHealth(serverUrl)) { console.log('Local memory ready. Dashboard: http://127.0.0.1:8088. Return to project onboarding.'); return; }
    await delay(2000);
  }
  throw new Error('Memory server is still starting. Inspect the guardian-memory group in Docker Desktop and retry; data and model downloads are retained.');
}
