import { spawn } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const directory = dirname(fileURLToPath(import.meta.url));
const root = realpathSync(join(directory, '../..'));
const profile = JSON.parse(readFileSync(join(root, '.guardian/memory.json'), 'utf8'));
const [host, verb] = process.argv.slice(2);
const allowed = { codex: ['mcp', 'recall', 'prompt', 'observe', 'writeback'], claude: ['mcp', 'session-start', 'session-end', 'user-prompt', 'save-user-message', 'post-tool-use', 'pre-compact', 'stop'] };
if (profile.provider !== 'honcho' || profile.root !== root || !profile.hosts.includes(host) || !allowed[host]?.includes(verb)) process.exit(1);
const url = new URL(profile.url);
if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) process.exit(1);
const configDirectory = join(directory, host);
const config = JSON.parse(readFileSync(join(configDirectory, 'config.json'), 'utf8'));
if (config.endpoint?.baseUrl !== profile.url + '/v3' || config.workspace !== profile.workspace) process.exit(1);
const environment = { ...process.env, HONCHO_CONFIG_DIR: configDirectory, HONCHO_API_KEY: config.apiKey, HONCHO_ENDPOINT: profile.url + '/v3', HONCHO_PEER_NAME: profile.peer, HONCHO_WORKSPACE: profile.workspace, HONCHO_HOST: 'claude_code', HONCHO_LOGGING: 'false', SENTRY_DSN: '' };
delete environment.CLAUDE_PLUGIN_ROOT;
delete environment.CLAUDE_PLUGIN_DATA;
function launch(input) {
  const target = verb === 'mcp' ? [join(directory, 'vendor/claude/dist/mcp-server.js')]
    : host === 'codex' ? [join(directory, 'vendor/codex/dist/codex-honcho.mjs'), verb]
      : [join(directory, 'vendor/claude/dist/hooks', verb + '.js')];
  const child = spawn(process.execPath, target, { cwd: root, env: environment, stdio: ['pipe', 'pipe', 'pipe'] });
  child.on('error', error => { console.error('Guardian memory: ' + error.message); process.exitCode = 1; });
  child.stderr.pipe(process.stderr);
  if (verb === 'mcp') {
    // Configuration changes go through the reviewed CLI, never an MCP tool.
    const incoming = createInterface({ input: process.stdin });
    incoming.on('line', line => {
      const request = JSON.parse(line);
      if (request.method === 'tools/call' && request.params?.name === 'set_config') {
        process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: request.id, error: { code: -32601, message: 'Use Guardian onboarding to change project memory settings.' } }) + '\n');
      } else child.stdin.write(line + '\n');
    });
    incoming.on('close', () => child.stdin.end());
    createInterface({ input: child.stdout }).on('line', line => {
      const response = JSON.parse(line);
      if (Array.isArray(response.result?.tools)) response.result.tools = response.result.tools.filter(tool => tool.name !== 'set_config');
      process.stdout.write(JSON.stringify(response) + '\n');
    });
  } else {
    child.stdin.end(input);
    createInterface({ input: child.stdout }).on('line', line => {
      process.stdout.write(line.replace(/https:\/\/app\.honcho\.dev\/explore[^\s"\\<>]*/g, profile.dashboard ?? profile.url + '/docs') + '\n');
    });
  }
  child.on('close', code => { process.exitCode = code ?? 1; });
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => child.kill(signal));
}
if (verb === 'mcp') launch();
else if (profile.capture) {
  const input = readFileSync(0, 'utf8');
  const event = JSON.parse(input);
  const cwd = realpathSync(event.workspace_roots?.[0] || event.cwd || process.cwd());
  const path = relative(root, cwd);
  if (path !== '..' && !path.startsWith('../') && !path.startsWith('..\\')) launch(JSON.stringify({ ...event, cwd: root, workspace_roots: [root] }));
}
