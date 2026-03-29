import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync, readdirSync, rmdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { detectStack, detectPackages } from './detect.js';
import { readManifest, writeManifest } from './manifest.js';
import { hashContent } from './hash.js';
import { getStackConfig, PACKAGE_ROOT } from './rules.js';

const RULES_DEST = '.claude/rules/claude-stack';

/**
 * Build map of what the package wants to install now, WITHOUT writing.
 */
function buildNewFilesMap(stack, packages) {
  const newFiles = new Map();
  const config = getStackConfig(stack);
  if (!config) return newFiles;

  for (const file of config.core) {
    const sourcePath = join(PACKAGE_ROOT, 'stacks', stack, 'core', file);
    if (existsSync(sourcePath)) {
      newFiles.set(`${RULES_DEST}/${file}`, readFileSync(sourcePath, 'utf8'));
    }
  }
  for (const pkg of packages) {
    const ruleFile = config.packages[pkg];
    if (!ruleFile) continue;
    const sourcePath = join(PACKAGE_ROOT, 'stacks', stack, 'packages', ruleFile);
    if (existsSync(sourcePath)) {
      newFiles.set(`${RULES_DEST}/${ruleFile}`, readFileSync(sourcePath, 'utf8'));
    }
  }
  return newFiles;
}

/**
 * Non-interactive update — 3-hash conflict resolution.
 */
export function updateNonInteractive(projectDir) {
  const manifest = readManifest(projectDir);
  if (!manifest) {
    throw new Error('No manifest found. Run `claude-stack init` first.');
  }

  const stack = detectStack(projectDir);
  const packages = stack ? detectPackages(projectDir, stack) : [];
  const newFiles = buildNewFilesMap(stack, packages);
  const result = { updated: [], kept: [], skipped: [], added: [], conflicts: [], removed: [] };

  // 3-hash comparison for existing manifest files
  for (const [filePath, entry] of Object.entries(manifest.files)) {
    const absPath = join(projectDir, filePath);
    const newContent = newFiles.get(filePath);

    if (!newContent) {
      // File no longer in package — orphan, remove
      if (existsSync(absPath)) {
        unlinkSync(absPath);
        try {
          const dir = dirname(absPath);
          if (readdirSync(dir).length === 0) rmdirSync(dir);
        } catch {}
      }
      result.removed.push(filePath);
      continue;
    }

    if (!existsSync(absPath)) {
      // File deleted locally — reinstall from package
      mkdirSync(dirname(absPath), { recursive: true });
      writeFileSync(absPath, newContent, 'utf8');
      result.added.push(filePath);
      newFiles.delete(filePath);
      continue;
    }

    const installedHash = entry.installed_hash;
    const currentHash = hashContent(readFileSync(absPath, 'utf8'));
    const newHash = hashContent(newContent);

    const localUnchanged = currentHash === installedHash;
    const packageUnchanged = installedHash === newHash;

    if (localUnchanged && packageUnchanged) {
      result.skipped.push(filePath);
    } else if (localUnchanged && !packageUnchanged) {
      writeFileSync(absPath, newContent, 'utf8');
      result.updated.push(filePath);
    } else if (!localUnchanged && packageUnchanged) {
      result.kept.push(filePath);
    } else {
      // Both changed — conflict (interactive mode would prompt user)
      result.conflicts.push(filePath);
    }

    newFiles.delete(filePath);
  }

  // New files not in old manifest
  for (const [filePath, content] of newFiles) {
    const absPath = join(projectDir, filePath);
    mkdirSync(dirname(absPath), { recursive: true });
    writeFileSync(absPath, content, 'utf8');
    result.added.push(filePath);
  }

  // Rebuild manifest — preserve old hashes for unresolved conflicts
  rebuildManifest(projectDir, stack, packages, manifest, result.conflicts);

  return result;
}

function rebuildManifest(projectDir, stack, packages, oldManifest, conflicts = []) {
  const rulesDir = join(projectDir, '.claude', 'rules', 'claude-stack');
  const filesMap = {};

  if (existsSync(rulesDir)) {
    for (const file of readdirSync(rulesDir)) {
      const filePath = `${RULES_DEST}/${file}`;
      // For unresolved conflicts, preserve old installed_hash so conflict
      // is re-detected on next update
      if (conflicts.includes(filePath) && oldManifest?.files?.[filePath]) {
        filesMap[filePath] = oldManifest.files[filePath];
      } else {
        const content = readFileSync(join(rulesDir, file), 'utf8');
        filesMap[filePath] = {
          installed_hash: hashContent(content),
          source: `${stack}/${file}`,
        };
      }
    }
  }

  const pkg = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf8'));
  writeManifest(projectDir, {
    version: pkg.version,
    stack,
    packages,
    files: filesMap,
  });
}

/**
 * Interactive update.
 */
export async function update(projectDir) {
  console.log('\n  📦 Claude Stack — Updating rules...\n');

  try {
    const result = updateNonInteractive(projectDir);

    for (const f of result.updated) console.log(`  ↑ ${f} (updated)`);
    for (const f of result.added) console.log(`  + ${f} (added)`);
    for (const f of result.kept) console.log(`  ≡ ${f} (local edits kept)`);
    for (const f of result.skipped) console.log(`  · ${f} (unchanged)`);
    for (const f of result.removed) console.log(`  ✗ ${f} (removed)`);
    for (const f of result.conflicts) console.log(`  ⚠ ${f} (CONFLICT — both changed)`);

    console.log(`\n  Done. ${result.updated.length} updated, ${result.added.length} added, ${result.kept.length} kept, ${result.removed.length} removed.\n`);
  } catch (e) {
    console.error(`  Error: ${e.message}\n`);
  }
}
