import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { assetsRoot } from './bundle.js';
import { installationProblems, projectRoot, readInstallation } from './install.js';
import { toolAvailable } from './graft.js';
import { discoverHost } from './onboarding.js';

export type WorkflowMode = 'orchestrate' | 'maintain' | 'audit';

export interface WorkflowSession {
  host: 'claude' | 'codex';
  root: string;
  prompt: string;
  dryRun: boolean;
}

export async function prepareWorkflow(mode: WorkflowMode, args: string[], interactive: boolean): Promise<WorkflowSession> {
  let host: WorkflowSession['host'] | null = null;
  let path: string | null = null;
  let task: string | null = null;
  let scope: string | null = null;
  let dryRun = false;
  const seen = new Set<string>();
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === undefined) continue;
    if (!arg.startsWith('--')) {
      if (path !== null) throw new Error('Expected one project path');
      path = arg;
      continue;
    }
    if (seen.has(arg)) throw new Error(`Specify ${arg} only once`);
    seen.add(arg);
    if (arg === '--dry-run') { dryRun = true; continue; }
    if (!['--host', mode === 'orchestrate' ? '--task' : mode === 'maintain' ? '--scope' : ''].includes(arg)) throw new Error(`Unknown option: ${arg}`);
    const value = args[++index];
    if (value === undefined || value.startsWith('--') || !value.trim()) throw new Error(`Missing value for ${arg}`);
    if (arg === '--host') {
      if (value !== 'claude' && value !== 'codex') throw new Error('--host expects claude or codex');
      host = value;
    } else if (arg === '--task') task = value;
    else {
      if (!['app', 'wrapper', 'skills', 'all'].includes(value)) throw new Error('--scope expects app, wrapper, skills or all');
      scope = value;
    }
  }
  if (!dryRun && !interactive) throw new Error('This workflow needs an interactive terminal. Use --dry-run to preview without launching an agent.');
  const root = projectRoot(path ?? '.');
  const installation = readInstallation(root);
  if (installation === null) throw new Error('Run init before starting a Guardian workflow');
  const problems = installationProblems(root);
  if (problems.length > 0) throw new Error(`Resolve doctor findings first: ${problems.join('; ')}`);
  if (mode === 'audit' && !installation.profile.skills.includes('guardian-audit')) throw new Error('Install the optional skill with update <project> --add-skills guardian-audit first');
  if (mode === 'orchestrate' && !installation.profile.orchestration) throw new Error('Enable with config <project> orchestration on first');
  if (mode === 'orchestrate' && task === null) throw new Error('Specify the bounded work with --task <text>');
  if (host !== null && !installation.profile.hosts.includes(host)) throw new Error(`${host} is not selected in this project profile`);
  if (host === null) {
    const only = installation.profile.hosts.length === 1 ? installation.profile.hosts[0] : undefined;
    host = only === 'claude' || only === 'codex' ? only : await discoverHost(interactive);
  }
  if (!installation.profile.hosts.includes(host)) throw new Error(`${host} is not selected in this project profile`);
  if (!dryRun && !toolAvailable(host)) throw new Error(`${host} is unavailable; install and sign in to its CLI first`);
  const reference = mode === 'orchestrate' ? 'orchestration.md' : 'maintenance.md';
  const workflow = readFileSync(mode === 'audit' ? join(assetsRoot, 'skills/guardian-audit/SKILL.md') : join(assetsRoot, 'skills/guardian-main/references', reference), 'utf8');
  const request = mode === 'audit' ? 'Run guardian-audit: inspect this project and report findings only. Do not edit code, configuration or documentation, install dependencies or apply fixes. Report unverified findings and missing checks explicitly.' : mode === 'orchestrate' ? `Requested task (user input): ${JSON.stringify(task)}` : `Requested dependency scope: ${scope ?? 'app'}. First inspect and propose concrete version changes; wait for approval before applying dependency changes.`;
  const prompt = `Use Guardian in ${host} for this project. Read applicable AGENTS.md/CLAUDE.md and docs/agents/guardian.md, then follow the workflow below. The wrapper launches your normal interactive CLI; respect its permissions and existing project rules. ${request}\n\n${workflow}`;
  return { host, root, prompt, dryRun };
}

export async function runWorkflow(mode: WorkflowMode, args: string[]): Promise<number> {
  const session = await prepareWorkflow(mode, args, process.stdin.isTTY === true && process.stdout.isTTY === true);
  console.log(`${session.dryRun ? 'Would start' : 'Starting'} ${session.host} Guardian ${mode} in ${session.root}.`);
  if (session.dryRun) { console.log(session.prompt); return 0; }
  return await launchWorkflow(session);
}

export async function launchWorkflow(session: WorkflowSession): Promise<number> {
  if (session.dryRun) throw new Error('Cannot launch a dry-run session');
  return await new Promise<number>((resolve, reject): void => {
    const child = spawn(session.host, [session.prompt], { cwd: session.root, stdio: 'inherit', shell: false });
    child.once('error', reject);
    child.once('exit', (code: number | null): void => resolve(code ?? 1));
  });
}
