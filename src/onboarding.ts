import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { readOptional } from './files.js';
import { toolAvailable } from './graft.js';
import { projectRoot } from './install.js';
import { prepareMigration } from './migration.js';
import { discoverChats, parseChatOptions, printChats, selectChatContext } from './chats.js';
import type { ChatContext } from './chats.js';

export interface OnboardingSession {
  host: 'claude' | 'codex';
  root: string;
  prompt: string;
  dryRun: boolean;
}

async function ask(prompt: string): Promise<string> {
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  const abort = new AbortController();
  terminal.once('close', (): void => abort.abort());
  try {
    return (await terminal.question(prompt, { signal: abort.signal })).trim();
  } catch (error: unknown) {
    if (abort.signal.aborted) throw new Error('Onboarding cancelled; no migration brief was created.');
    throw error;
  } finally { terminal.close(); }
}

async function discoverHost(interactive: boolean): Promise<OnboardingSession['host']> {
  const hosts: Array<OnboardingSession['host']> = ['claude', 'codex'];
  const available = hosts.filter(toolAvailable);
  const only = available[0];
  if (only === undefined) throw new Error('No supported CLI found in PATH. Install Claude Code (https://code.claude.com/docs/en/setup) or Codex CLI (https://developers.openai.com/codex/cli), sign in, then run onboard again.');
  if (available.length === 1) return only;
  if (!interactive) throw new Error('Both Claude Code and Codex CLI are available. Choose --host claude or --host codex for a noninteractive preview.');
  while (true) {
    const answer = (await ask('Choose onboarding client: 1) Claude Code  2) Codex\nEnter 1 or 2: ')).toLowerCase();
    if (answer === '1' || answer === 'claude') return 'claude';
    if (answer === '2' || answer === 'codex') return 'codex';
    console.log('Enter 1 (Claude Code) or 2 (Codex).');
  }
}

export async function prepareOnboarding(args: string[], interactive: boolean, cli: string): Promise<OnboardingSession> {
  let host: OnboardingSession['host'] | null = null;
  let resume = false;
  let findChats = false;
  let skipChats = false;
  const chatArgs: string[] = [];
  const migrationArgs: string[] = [];
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--host') {
      const value = args[++index];
      if (host !== null || value !== 'claude' && value !== 'codex') throw new Error('Specify --host claude or --host codex once');
      host = value;
    } else if (arg === '--chats') findChats = true;
    else if (arg === '--no-chats') skipChats = true;
    else if (['--query', '--export', '--source', '--select'].includes(arg ?? '')) {
      const value = args[++index];
      if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
      chatArgs.push(arg ?? '', value);
      findChats = true;
    } else if (arg === '--from-chat' || arg === '--from-project') {
      const value = args[++index];
      if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
      migrationArgs.push(arg, value);
    } else if (arg === '--resume') {
      if (resume) throw new Error('Specify --resume only once');
      resume = true;
    } else if (arg !== undefined) migrationArgs.push(arg);
  }
  const dryRun = migrationArgs.includes('--dry-run');
  if (skipChats && findChats) throw new Error('Choose --chats or --no-chats, not both');
  if (findChats && (resume || migrationArgs.includes('--from-chat'))) throw new Error('Chat discovery cannot be combined with --resume or --from-chat');
  if (!dryRun && !interactive) throw new Error('Onboarding needs an interactive terminal. Use --dry-run to preview or migrate to prepare a brief without launching an agent.');
  if (host === null) host = await discoverHost(interactive);
  if (!dryRun && !toolAvailable(host)) throw new Error(`${host} is unavailable; install and sign in to its CLI first`);
  let root: string;
  let selectedChat: ChatContext | undefined;
  if (resume) {
    const positionals = migrationArgs.filter(arg => arg !== '--dry-run');
    if (positionals.length > 1 || positionals.some(arg => arg.startsWith('--'))) throw new Error('--resume accepts only the target path and --dry-run; prepare new sources through migrate');
    root = projectRoot(positionals[0] ?? '.');
    if (readOptional(root, '.guardian/migration.md') === null) throw new Error('No migration brief to resume; run onboard without --resume first');
  } else {
    let searchArgs = [...chatArgs];
    if (interactive && !dryRun && !skipChats && !findChats && !migrationArgs.includes('--from-chat')) {
      const choice = await ask('Find earlier chats as project evidence? 1) Local Claude/Codex  2) ChatGPT/Claude exports  3) Both  n) Skip [n]: ');
      if (['1', '2', '3'].includes(choice)) {
        findChats = true;
        if (choice === '2') searchArgs.push('--source', 'exports');
        if (choice !== '1') {
          const path = await ask('Path to unpacked export folder, conversations JSON or .md/.txt transcript (blank to skip exports): ');
          if (path) searchArgs.push('--export', path);
        }
        const query = await ask('Project words to search for (blank lists recent/project-linked chats): ');
        if (query) searchArgs.push('--query', query);
      } else if (choice && !['n', 'N'].includes(choice)) throw new Error('Choose 1, 2, 3 or n; no files were written.');
    }
    if (findChats) {
      const targetArgs: string[] = [];
      for (let index = 0; index < migrationArgs.length; index++) {
        const value = migrationArgs[index];
        if (value === '--from-project') { index++; continue; }
        if (value !== undefined && value !== '--dry-run') targetArgs.push(value);
      }
      const parsed = parseChatOptions([...targetArgs, ...searchArgs]);
      if (readOptional(parsed.root, '.guardian/migration.md') !== null) throw new Error('A migration brief already exists; use --resume or move it before starting again.');
      const discovery = discoverChats(parsed.root, parsed.options);
      printChats(discovery);
      let ids = parsed.options.select;
      if (ids.length === 0 && interactive && !dryRun && discovery.candidates.length > 0) {
        const answer = await ask('Choose chat numbers or IDs separated by commas (up to 10; blank skips). Only chosen message text will be provided to the onboarding agent: ');
        ids = answer ? answer.split(',').map(value => {
          const input = value.trim();
          return /^\d+$/.test(input) ? discovery.candidates[Number(input) - 1]?.id ?? input : input;
        }) : [];
      }
      if (ids.length > 0) selectedChat = selectChatContext(discovery.candidates, ids);
      else console.log('No earlier chats selected. Continuing with project-only onboarding.');
    }
    root = prepareMigration(migrationArgs, !dryRun, selectedChat);
  }
  const command = JSON.stringify([process.execPath, cli]);
  const prompt = `Start Guardian onboarding for this project in ${host}. When discussing the setup profile, recommend this client for a new installation and ask whether the other client should also be supported; preserve existing profiles until reviewed. Read .guardian/migration.md and follow its Agent workflow. Inspect the listed project instructions and evidence, then ask the unresolved onboarding questions in small rounds and wait for my answers. Preserve decisions already recorded in the brief; resolve material conflicts explicitly. Show concrete proposed file/content changes and the setup dry run before asking me to approve applying them. Read source projects only; apply approved changes in the target only. This session is onboarding, not automatic implementation or publication. The wrapper CLI is available through this executable/argument prefix: ${command}. Use it for init/update/config/doctor as agreed. The embedded workflow works before skills are installed; verify the actual skill provider after installation. Use brief, actionable communication by default, and honor my request to disable ADHD mode.`;
  return { host, root, prompt, dryRun };
}

export async function runOnboarding(args: string[], cli: string): Promise<number> {
  const session = await prepareOnboarding(args, process.stdin.isTTY === true && process.stdout.isTTY === true, cli);
  console.log(`${session.dryRun ? 'Would start' : 'Starting'} ${session.host} onboarding in ${session.root}. Questions and proposal review happen in the agent chat.`);
  if (session.dryRun) { console.log(session.prompt); return 0; }
  return await new Promise<number>((resolve, reject): void => {
    const child = spawn(session.host, [session.prompt], { cwd: session.root, stdio: 'inherit', shell: false });
    child.once('error', reject);
    child.once('exit', (code: number | null): void => resolve(code ?? 1));
  });
}
