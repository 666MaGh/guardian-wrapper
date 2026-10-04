import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { readOptional } from './files.js';
import { toolAvailable } from './graft.js';
import { projectRoot } from './install.js';
import { prepareMigration } from './migration.js';

export interface OnboardingSession {
  host: 'claude' | 'codex';
  root: string;
  prompt: string;
  dryRun: boolean;
}

async function discoverHost(interactive: boolean): Promise<OnboardingSession['host']> {
  const hosts: Array<OnboardingSession['host']> = ['claude', 'codex'];
  const available = hosts.filter(toolAvailable);
  const only = available[0];
  if (only === undefined) throw new Error('No supported CLI found in PATH. Install Claude Code (https://code.claude.com/docs/en/setup) or Codex CLI (https://developers.openai.com/codex/cli), sign in, then run onboard again.');
  if (available.length === 1) return only;
  if (!interactive) throw new Error('Both Claude Code and Codex CLI are available. Choose --host claude or --host codex for a noninteractive preview.');
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  const abort = new AbortController();
  terminal.once('close', (): void => abort.abort());
  try {
    while (true) {
      const answer = (await terminal.question('Choose onboarding client: 1) Claude Code  2) Codex\nEnter 1 or 2: ', { signal: abort.signal })).trim().toLowerCase();
      if (answer === '1' || answer === 'claude') return 'claude';
      if (answer === '2' || answer === 'codex') return 'codex';
      console.log('Enter 1 (Claude Code) or 2 (Codex).');
    }
  } catch (error: unknown) {
    if (abort.signal.aborted) throw new Error('No onboarding client selected; no migration brief was created.');
    throw error;
  } finally { terminal.close(); }
}

export async function prepareOnboarding(args: string[], interactive: boolean, cli: string): Promise<OnboardingSession> {
  let host: OnboardingSession['host'] | null = null;
  let resume = false;
  const migrationArgs: string[] = [];
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--host') {
      const value = args[++index];
      if (host !== null || value !== 'claude' && value !== 'codex') throw new Error('Specify --host claude or --host codex once');
      host = value;
    } else if (arg === '--resume') {
      if (resume) throw new Error('Specify --resume only once');
      resume = true;
    } else if (arg !== undefined) migrationArgs.push(arg);
  }
  const dryRun = migrationArgs.includes('--dry-run');
  if (!dryRun && !interactive) throw new Error('Onboarding needs an interactive terminal. Use --dry-run to preview or migrate to prepare a brief without launching an agent.');
  if (host === null) host = await discoverHost(interactive);
  if (!dryRun && !toolAvailable(host)) throw new Error(`${host} is unavailable; install and sign in to its CLI first`);
  let root: string;
  if (resume) {
    const positionals = migrationArgs.filter(arg => arg !== '--dry-run');
    if (positionals.length > 1 || positionals.some(arg => arg.startsWith('--'))) throw new Error('--resume accepts only the target path and --dry-run; prepare new sources through migrate');
    root = projectRoot(positionals[0] ?? '.');
    if (readOptional(root, '.guardian/migration.md') === null) throw new Error('No migration brief to resume; run onboard without --resume first');
  } else root = prepareMigration(migrationArgs, !dryRun);
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
