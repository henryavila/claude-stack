import { readFileSync, writeFileSync, existsSync, unlinkSync, rmSync, readdirSync, rmdirSync } from 'node:fs';
import { join } from 'node:path';
import { readManifest, MANIFEST_DIR } from './manifest.js';
import { PACKAGE_ROOT, RULES_DEST } from './rules.js';

function isDefaultCoreSettings(settings) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return false;

  const extraTopLevelKeys = Object.keys(settings)
    .filter(key => !['permissions', 'enableAllProjectMcpServers'].includes(key));
  if (extraTopLevelKeys.length > 0) return false;
  if (settings.enableAllProjectMcpServers !== true) return false;

  const permissions = settings.permissions;
  if (!permissions || typeof permissions !== 'object' || Array.isArray(permissions)) return false;

  const extraPermissionKeys = Object.keys(permissions)
    .filter(key => !['deny', 'allow'].includes(key));
  if (extraPermissionKeys.length > 0) return false;

  const deny = permissions.deny || [];
  const allow = permissions.allow || [];

  return Array.isArray(deny) && deny.length === 0
    && Array.isArray(allow) && allow.length === 0;
}

function isEmptyObject(value) {
  return !!value
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.keys(value).length === 0;
}

export function uninstallNonInteractive(projectDir) {
  const manifest = readManifest(projectDir);
  if (!manifest) {
    throw new Error('Agent Standards is not installed in this project.');
  }

  const removedFiles = [];
  const createdSettings = manifest.meta?.createdSettings === true;
  const createdLocalSettings = manifest.meta?.createdLocalSettings === true;

  // 1. Remove installed rule files
  for (const filePath of Object.keys(manifest.files)) {
    const absPath = join(projectDir, filePath);
    if (existsSync(absPath)) {
      unlinkSync(absPath);
      removedFiles.push(filePath);
    }
  }

  // Clean up empty Agent Standards rules directory
  const rulesDir = join(projectDir, RULES_DEST);
  try {
    if (existsSync(rulesDir) && readdirSync(rulesDir).length === 0) {
      rmdirSync(rulesDir);
    }
  } catch {}

  // 2. Remove deny rules from settings.json (only the ones we added)
  const settingsPath = join(projectDir, '.claude', 'settings.json');
  if (existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
      if (manifest.stack) {
        const stackSettingsPath = join(PACKAGE_ROOT, 'stacks', manifest.stack, 'settings.json');
        if (existsSync(stackSettingsPath)) {
          const stackSettings = JSON.parse(readFileSync(stackSettingsPath, 'utf8'));
          // Stack source uses flat `deny` key; installed settings uses `permissions.deny`
          const denyToRemove = new Set(stackSettings.deny || []);

          if (settings.permissions?.deny) {
            settings.permissions.deny = settings.permissions.deny.filter(d => !denyToRemove.has(d));
          }
        }
      }

      if (createdSettings && isDefaultCoreSettings(settings)) {
        unlinkSync(settingsPath);
      } else {
        writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
      }
    } catch {}
  }

  // 3. Remove autoMemoryDirectory from settings.local.json
  const localPath = join(projectDir, '.claude', 'settings.local.json');
  if (existsSync(localPath)) {
    try {
      const settings = JSON.parse(readFileSync(localPath, 'utf8'));
      delete settings.autoMemoryDirectory;

      if (createdLocalSettings && isEmptyObject(settings)) {
        unlinkSync(localPath);
      } else {
        writeFileSync(localPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
      }
    } catch {}
  }

  // 4. Remove manifest directory
  rmSync(join(projectDir, MANIFEST_DIR), { recursive: true, force: true });

  return { removedFiles, stack: manifest.stack };
}

export async function uninstall(projectDir) {
  console.log('\n  📦 Agent Standards — Uninstalling...\n');

  try {
    const result = uninstallNonInteractive(projectDir);

    for (const f of result.removedFiles) {
      console.log(`  ✗ ${f}`);
    }

    console.log('\n  ✓ Settings cleaned (deny rules removed)');
    console.log('  ✓ Manifest removed');
    console.log('\n  Preserved: CLAUDE.md, guidelines.md, .ai/memory/');
    console.log('\n  📦 Agent Standards uninstalled.\n');
  } catch (e) {
    console.error(`  Error: ${e.message}\n`);
  }
}
