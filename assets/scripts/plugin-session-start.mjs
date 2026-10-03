import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// A project profile controls ADHD on/off when present. AGENTS.md loads the
// rules in that case, so this hook does not inject a second copy.
if (!existsSync(join(process.cwd(), '.guardian/config.json'))) {
  const rules = readFileSync(new URL('./adhd.md', import.meta.url), 'utf8');
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: rules } }));
}
