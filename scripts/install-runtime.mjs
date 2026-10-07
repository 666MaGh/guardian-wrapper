import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// npm only honors overrides at an installation root. Keep graft's reviewed
// dependency tree isolated so consumers receive the same security update.
const runtime = fileURLToPath(new URL('../runtime/', import.meta.url));
const npm = process.env.npm_execpath;
const args = ['ci', '--omit=dev', '--prefix', runtime];
const env = { ...process.env };
// A lifecycle re-exports .npmrc settings as env flags. New npm versions reject
// allow-scripts env flags in project installs; let npm read the original .npmrc
// policy again. Outer global mode must not turn this private install global.
delete env.npm_config_allow_scripts;
delete env.npm_config_global;
const result = npm
  ? spawnSync(process.execPath, [npm, ...args], { stdio: 'inherit', env })
  : spawnSync('npm', args, { stdio: 'inherit', env, shell: false });
if (result.error) console.error(`Guardian runtime installation failed: ${result.error.message}`);
process.exitCode = result.status ?? 1;
