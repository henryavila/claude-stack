import { readFileSync, writeFileSync, existsSync, unlinkSync, rmSync, readdirSync, rmdirSync } from 'node:fs';
import { join } from 'node:path';
import { readManifest, MANIFEST_DIR } from './manifest.js';
import { PACKAGE_ROOT } from './rules.js';

export function uninstallNonInteractive(projectDir) {
  const manifest = readManifest(projectDir);
  if (!manifest) {
    throw new Error('Claude Stack is not installed in this project.');
  }

  const removedFiles = [];

  // 1. Remove installed rule files
  for (const filePath of Object.keys(manifest.files)) {
    const absPath = join(projectDir, filePath);
    if (existsSync(absPath)) {
      unlinkSync(absPath);
      removedFiles.push(filePath);
    }
  }

  // Clean up empty claude-stack rules directory
  const rulesDir = join(projectDir, '.claude', 'rules', 'claude-stack');
  try {
    if (existsSync(rulesDir) && readdirSync(rulesDir).length === 0) {
      rmdirSync(rulesDir);
    }
  } catch {}

  // 2. Remove deny rules from settings.json (only the ones we added)
  const settingsPath = join(projectDir, '.claude', 'settings.json');
  if (existsSync(settingsPath) && manifest.stack) {
    try {
      const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
      const stackSettingsPath = join(PACKAGE_ROOT, 'stacks', manifest.stack, 'settings.json');
      if (existsSync(stackSettingsPath)) {
        const stackSettings = JSON.parse(readFileSync(stackSettingsPath, 'utf8'));
        const denyToRemove = new Set(stackSettings.deny || []);

        if (settings.permissions?.deny) {
          settings.permissions.deny = settings.permissions.deny.filter(d => !denyToRemove.has(d));
        }
      }
      writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
    } catch {}
  }

  // 3. Remove autoMemoryDirectory from settings.local.json
  const localPath = join(projectDir, '.claude', 'settings.local.json');
  if (existsSync(localPath)) {
    try {
      const settings = JSON.parse(readFileSync(localPath, 'utf8'));
      delete settings.autoMemoryDirectory;
      writeFileSync(localPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
    } catch {}
  }

  // 4. Remove manifest directory
  rmSync(join(projectDir, MANIFEST_DIR), { recursive: true, force: true });

  return { removedFiles, stack: manifest.stack };
}

export async function uninstall(projectDir) {
  console.log('\n  📦 Claude Stack — Uninstalling...\n');

  try {
    const result = uninstallNonInteractive(projectDir);

    for (const f of result.removedFiles) {
      console.log(`  ✗ ${f}`);
    }

    console.log('\n  ✓ Settings cleaned (deny rules removed)');
    console.log('  ✓ Manifest removed');
    console.log('\n  Preserved: CLAUDE.md, guidelines.md, .ai/memory/');
    console.log(`\n  📦 Claude Stack uninstalled.\n`);
  } catch (e) {
    console.error(`  Error: ${e.message}\n`);
  }
}
