#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { catalog, verifyBundle, version } from './bundle.js';
import { applyPlan } from './files.js';
import { graftRoot, runGraft, toolAvailable, watchEvents } from './graft.js';
import { installationProblems, planInstall, planUninstall, projectRoot, readInstallation } from './install.js';
import { exportPlugin } from './plugin.js';
import { prepareMigration } from './migration.js';
import { runOnboarding } from './onboarding.js';
import { runChats } from './chats.js';
import type { InitOptions, Plan, Profile } from './types.js';

const help: string = `Guardian Wrapper ${version}

guardian-wrapper init [project] [--groups engineering,productivity|all|core]
  [--skills tdd,code-review] [--hosts claude,codex] [--adhd on|off]
  [--graft on|off] [--watch] [--dry-run]
guardian-wrapper update [project] [same options]
guardian-wrapper doctor [project]
guardian-wrapper migrate [project] [--from-project <path>] [--from-chat <file>] [--dry-run]
guardian-wrapper onboard [project] [--host claude|codex]
  [--from-project <path>] [--from-chat <file>] [--chats|--no-chats] [--query <text>]
  [--export <file-or-directory>] [--source all|claude|codex|exports] [--select <ids>] [--resume] [--dry-run]
guardian-wrapper chats [project] [--query <text>] [--export <file-or-directory>]
  [--source all|claude|codex|exports] [--select <id,id>] [--dry-run]
guardian-wrapper config [project] adhd on|off [--dry-run]
guardian-wrapper uninstall [project] [--dry-run]
guardian-wrapper graft [project] build|check|ask|grep|map|callers|skeleton|viz [args]
guardian-wrapper watch [project]
guardian-wrapper list
guardian-wrapper export-plugin <new-directory> [--groups all|...] [--adhd on|off]

Default: Claude Code + Codex, core + engineering + productivity, ADHD on,
structural graft on, no background watcher. All 37 Matt skills are available.
No publication or global agent configuration changes. Node >=22.12.0 required.
`;

interface Parsed {
  positionals: string[];
  options: InitOptions;
  dryRun: boolean;
}

function parse(args: string[]): Parsed {
  const result: Parsed = { positionals: [], options: {}, dryRun: false };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === undefined) continue;
    if (arg === '--dry-run') { result.dryRun = true; continue; }
    if (arg === '--watch') { result.options.watch = true; continue; }
    if (arg === '--no-watch') { result.options.watch = false; continue; }
    if (!arg.startsWith('--')) { result.positionals.push(arg); continue; }
    const value = args[++index];
    if (value === undefined || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
    if (arg === '--groups') result.options.groups = value.split(',');
    else if (arg === '--skills') result.options.skills = value.split(',');
    else if (arg === '--hosts') result.options.hosts = value.split(',');
    else if (arg === '--adhd' || arg === '--graft') {
      if (value !== 'on' && value !== 'off') throw new Error(`${arg} expects on or off`);
      if (arg === '--adhd') result.options.adhd = value === 'on';
      else result.options.graft = value === 'on';
    } else throw new Error(`Unknown option: ${arg}`);
  }
  return result;
}

function printPlan(plan: Plan, verbose: boolean): void {
  console.log(`Project: ${plan.root}`);
  console.log(`${plan.changes.length} file changes`);
  for (const change of verbose ? plan.changes : plan.changes.slice(0, 5)) console.log(`${change.after === null ? 'remove' : change.before === null ? 'create' : 'update'} ${change.path}`);
  if (!verbose && plan.changes.length > 5) console.log(`${plan.changes.length - 5} additional changes; --dry-run shows the complete plan.`);
}

function shadows(profile: Profile): string[] {
  const results: string[] = [];
  for (const host of profile.hosts) {
    const shelf = host === 'claude' ? '.claude/skills' : '.agents/skills';
    const found = profile.skills.filter(name => existsSync(join(homedir(), shelf, name)));
    if (found.length > 0) results.push(`${host}: global copies may shadow/duplicate ${found.join(', ')}; verify the project-local provider in a fresh session`);
  }
  return results;
}

function doctor(root: string): number {
  const errors = installationProblems(root);
  for (const error of errors) console.error(`ERROR ${error}`);
  const installation = readInstallation(root);
  if (installation === null) return 1;
  console.log(`Guardian ${installation.version}; ${installation.profile.skills.length} skills; ADHD ${installation.profile.adhd ? 'on' : 'off'}`);
  if (errors.length === 0) console.log('Owned files and instruction blocks: integrity OK');
  for (const notice of shadows(installation.profile)) console.log(`NOTICE ${notice}`);
  for (const host of installation.profile.hosts) console.log(`${host} executable: ${toolAvailable(host) ? 'available' : 'unavailable'}; skill discovery is not certified by this check`);
  console.log(`Git: ${toolAvailable('git') ? 'available' : 'unavailable (required for Git workflows)'}`);
  let missingRequired = false;
  if (installation.profile.graft) {
    console.log(`Graft runtime: ${graftRoot()} (pinned 0.21.1)`);
    const present = existsSync(join(root, 'graft/INDEX.md')) && existsSync(join(root, 'graft/.graph/wiring.json'));
    console.log(`Structural graph: ${present ? 'present; run graft check for freshness' : 'missing; run graft build'}`);
    if (!present) missingRequired = true;
  }
  if (installation.profile.watch) {
    const available = toolAvailable('fswatch');
    console.log(`fswatch: ${available ? 'available' : 'missing (required for watch)'}`);
    if (!available) missingRequired = true;
  }
  const capabilities: Array<{ names: string[]; tools: string[]; note: string }> = [
    { names: ['to-spec', 'to-tickets', 'triage', 'wayfinder', 'implement-spec'], tools: ['gh', 'glab'], note: 'External trackers are optional; configure docs/agents/issue-tracker.md or use local records. Authentication is not checked.' },
    { names: ['git-guardrails-claude-code'], tools: ['bash', 'jq'], note: 'Claude hook installation is opt-in; this is not a Codex process guard.' },
    { names: ['scaffold-exercises'], tools: ['pnpm'], note: 'Requires the target course project and ai-hero-cli.' },
    { names: ['wizard', 'diagnosing-bugs'], tools: ['bash', 'curl'], note: 'Browser and test tools depend on the target workflow.' },
  ];
  for (const capability of capabilities) {
    if (!capability.names.some(name => installation.profile.skills.includes(name))) continue;
    console.log(`${capability.tools.map(tool => `${tool}=${toolAvailable(tool) ? 'available' : 'missing'}`).join(', ')}. ${capability.note}`);
  }
  console.log('Subagent access, app tests, typecheck/lint setup and CI gates must be verified in the host/project; installation alone does not certify them.');
  return errors.length > 0 || missingRequired ? 1 : 0;
}

async function install(root: string, options: InitOptions, dryRun: boolean): Promise<number> {
  const plan = planInstall(root, options);
  printPlan(plan, dryRun);
  if (dryRun) {
    console.log('Dry run: no writes, downloads, graph build or watcher.');
    return 0;
  }
  if (plan.installation?.profile.graft) await runGraft(root, ['build']);
  applyPlan(plan);
  console.log(`Setup installed. ${plan.installation?.profile.skills.length ?? 0} skills. No semantic project adoption has run.`);
  for (const notice of shadows(plan.installation?.profile ?? { hosts: [], skills: [], adhd: false, graft: false, watch: false })) console.log(`NOTICE ${notice}`);
  console.log('Open a fresh Claude Code/Codex session here. Use Guardian to adopt the project, or run node .guardian/bin/guardian.mjs doctor .');
  return 0;
}

export async function main(args: string[]): Promise<number> {
  try {
    const command = args[0] ?? 'help';
    if (['help', '--help', '-h'].includes(command)) { console.log(help); return 0; }
    if (command === '--version') { console.log(version); return 0; }
    verifyBundle();
    if (command === 'migrate') { prepareMigration(args.slice(1)); return 0; }
    if (command === 'chats') { runChats(args.slice(1)); return 0; }
    if (command === 'onboard') return await runOnboarding(args.slice(1), realpathSync(process.argv[1] ?? 'dist/cli.js'));
    if (command === 'list') {
      for (const skill of catalog()) console.log(`${skill.group.padEnd(13)} ${skill.name}${skill.userOnly ? ' (user only)' : ''}`);
      return 0;
    }
    if (command === 'graft') {
      const implicitProject = ['build', 'check', 'ask', 'grep', 'map', 'callers', 'skeleton', 'viz'].includes(args[1] ?? '');
      const root = projectRoot(implicitProject ? '.' : args[1] ?? '.');
      const graftArgs = args.slice(implicitProject ? 1 : 2);
      await runGraft(root, graftArgs.length > 0 ? graftArgs : ['build']);
      return 0;
    }
    if (command === 'watch-events') {
      await watchEvents(projectRoot(args[1] ?? '.'));
      return 0;
    }
    if (command === 'watch') {
      const root = projectRoot(args[1] ?? '.');
      const installation = readInstallation(root);
      if (!installation?.profile.watch) throw new Error('Install the watch script with init --watch first');
      if (installationProblems(root).length > 0) throw new Error('Run doctor and resolve modified/missing files before starting watch');
      if (!toolAvailable('fswatch')) throw new Error('fswatch is missing (macOS: brew install fswatch)');
      return await new Promise<number>((resolvePromise, reject): void => {
        const child = spawn('bash', [join(root, 'scripts/watch-graft.sh'), root], { stdio: 'inherit' });
        child.once('error', reject);
        child.once('exit', (code: number | null): void => resolvePromise(code ?? 1));
      });
    }
    const parsed = parse(args.slice(1));
    if (command === 'export-plugin') {
      const path = parsed.positionals[0];
      if (path === undefined) throw new Error('Choose a new export directory');
      if (parsed.dryRun) throw new Error('export-plugin writes a new directory; --dry-run is not supported');
      const { selectProfile } = await import('./install.js');
      exportPlugin(resolve(path), selectProfile(parsed.options));
      console.log(`Claude plugin exported to ${resolve(path)}. Validate with claude plugin validate <directory>.`);
      return 0;
    }
    const configOffset = command === 'config' && parsed.positionals[0] === 'adhd' ? 0 : 1;
    const root = projectRoot(configOffset === 0 ? '.' : parsed.positionals[0] ?? '.');
    if (command === 'init' || command === 'update') {
      if (parsed.positionals.length > 1) throw new Error('Expected one project path');
      if (command === 'update' && readInstallation(root) === null) throw new Error('Run init before update');
      return await install(root, parsed.options, parsed.dryRun);
    }
    if (command === 'doctor') return doctor(root);
    if (command === 'config') {
      if (parsed.positionals[configOffset] !== 'adhd' || !['on', 'off'].includes(parsed.positionals[configOffset + 1] ?? '')) throw new Error('Use config <project> adhd on|off');
      if (readInstallation(root) === null) throw new Error('Run init first');
      return await install(root, { adhd: parsed.positionals[configOffset + 1] === 'on' }, parsed.dryRun);
    }
    if (command === 'uninstall') {
      const plan = planUninstall(root);
      printPlan(plan, parsed.dryRun);
      if (!parsed.dryRun) applyPlan(plan);
      console.log(parsed.dryRun ? 'Dry run: no files removed.' : 'Owned installation removed. Generated graft cache, empty folders and unrelated files are retained.');
      return 0;
    }
    throw new Error(`Unknown command: ${command}`);
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) process.exitCode = await main(process.argv.slice(2));
