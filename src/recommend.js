import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

function readSettings(dir) {
  const settingsPath = join(dir, '.claude', 'settings.json');
  if (!existsSync(settingsPath)) return {};
  try {
    return JSON.parse(readFileSync(settingsPath, 'utf8'));
  } catch {
    return {};
  }
}

function hasPlugin(dir, pluginName) {
  const settings = readSettings(dir);
  const plugins = settings.enabledPlugins || {};
  return Object.keys(plugins).some(k => k.startsWith(pluginName) && plugins[k]);
}

function hasMcpServer(dir, serverName) {
  const settings = readSettings(dir);
  if (settings.mcpServers?.[serverName]) return true;
  const allows = settings.permissions?.allow || [];
  if (allows.some(a => a.includes(`mcp__${serverName}`))) return true;
  const plugins = settings.enabledPlugins || {};
  if (Object.keys(plugins).some(k => k.startsWith(serverName) && plugins[k])) return true;
  return false;
}

const RECOMMENDATIONS = [
  // Universal MCPs
  {
    id: 'context7',
    name: 'Context7',
    description: 'Contextual documentation for libraries (any project)',
    type: 'mcp',
    stacks: null, // all stacks
    detectInstalled: (dir) => hasMcpServer(dir, 'context7'),
    installCmd: null, // MCP install varies by setup
  },
  // Stack-specific MCPs
  {
    id: 'laravel-boost',
    name: 'Laravel Boost',
    description: 'Schema, tinker, docs for Laravel',
    type: 'mcp',
    stacks: ['laravel'],
    detectInstalled: (dir) => hasMcpServer(dir, 'laravel-boost'),
    installCmd: null,
  },
  // Tools
  {
    id: 'atomic-skills',
    name: 'Atomic Skills',
    description: 'Productivity skills (as-fix, as-hunt, as-prompt, etc.)',
    type: 'tool',
    stacks: null,
    detectInstalled: (dir) => existsSync(join(dir, '.atomic-skills', 'manifest.json')),
    installCmd: 'npx @henryavila/atomic-skills install',
  },
  {
    id: 'bmad-method',
    name: 'BMAD Method',
    description: 'Brainstorming, requirements elicitation, specialized agents',
    type: 'tool',
    stacks: null,
    detectInstalled: (dir) => existsSync(join(dir, '_bmad')),
    installCmd: 'npx bmad-method install',
  },
  {
    id: 'bmad-doc-architect',
    name: 'BMAD Doc Architect',
    description: 'Verified module documentation (includes BMAD Method)',
    type: 'tool',
    stacks: null,
    detectInstalled: (dir) => existsSync(join(dir, '_bmad', 'bmad-doc-architect', 'config.yaml')),
    installCmd: null, // Requires clone + custom install
  },
  // Plugins (Claude Code plugins — user must install inside Claude Code)
  {
    id: 'claude-mem',
    name: 'claude-mem',
    description: 'Persistent memory across sessions (search, timeline, auto-capture)',
    type: 'plugin',
    stacks: null,
    detectInstalled: (dir) => hasPlugin(dir, 'claude-mem'),
    installCmd: '/plugin install claude-mem@thedotmack',
  },
  {
    id: 'superpowers',
    name: 'Superpowers',
    description: 'Agentic skills framework (brainstorming, TDD, planning, code review)',
    type: 'plugin',
    stacks: null,
    detectInstalled: (dir) => hasPlugin(dir, 'superpowers'),
    installCmd: '/plugin install superpowers@claude-plugins-official',
  },
];

export function detectRecommendations(projectDir, stack) {
  return RECOMMENDATIONS
    .filter(rec => rec.stacks === null || rec.stacks.includes(stack))
    .map(rec => ({
      id: rec.id,
      name: rec.name,
      description: rec.description,
      type: rec.type,
      installed: rec.detectInstalled(projectDir),
      installCmd: rec.installCmd,
    }));
}
