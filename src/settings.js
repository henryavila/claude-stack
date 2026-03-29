import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function mergeSettings(projectDir, stackSettings) {
  const claudeDir = join(projectDir, '.claude');
  mkdirSync(claudeDir, { recursive: true });

  const settingsPath = join(claudeDir, 'settings.json');
  let settings = {};

  if (existsSync(settingsPath)) {
    settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
  }

  if (!settings.permissions) settings.permissions = {};
  if (!settings.permissions.deny) settings.permissions.deny = [];
  if (!settings.permissions.allow) settings.permissions.allow = [];

  for (const rule of (stackSettings.deny || [])) {
    if (!settings.permissions.deny.includes(rule)) {
      settings.permissions.deny.push(rule);
    }
  }

  for (const rule of (stackSettings.allow || [])) {
    if (!settings.permissions.allow.includes(rule)) {
      settings.permissions.allow.push(rule);
    }
  }

  if (settings.enableAllProjectMcpServers === undefined) {
    settings.enableAllProjectMcpServers = true;
  }

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
}

export function generateLocalSettings(projectDir) {
  const claudeDir = join(projectDir, '.claude');
  mkdirSync(claudeDir, { recursive: true });

  const localPath = join(claudeDir, 'settings.local.json');
  let settings = {};

  if (existsSync(localPath)) {
    settings = JSON.parse(readFileSync(localPath, 'utf8'));
  }

  settings.autoMemoryDirectory = join(projectDir, '.ai', 'memory');

  writeFileSync(localPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
}
