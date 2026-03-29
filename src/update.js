import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync, readdirSync, rmdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { detectStack, detectPackages } from './detect.js';
import { readManifest, writeManifest } from './manifest.js';
import { hashContent } from './hash.js';
import { getStackConfig, PACKAGE_ROOT, RULES_DEST } from './rules.js';

/**
 * Build map of what the package wants to install now, WITHOUT writing.
 * Returns { newFiles: Map<destPath, content>, sourceMap: Map<destPath, sourceName> }
 */
function buildNewFilesMap(stack, packages) {
  const newFiles = new Map();
  const sourceMap = new Map();
  const config = getStackConfig(stack);
  if (!config) return { newFiles, sourceMap };

  for (const file of config.core) {
    const sourcePath = join(PACKAGE_ROOT, 'stacks', stack, 'core', file);
    if (existsSync(sourcePath)) {
      const destKey = `${RULES_DEST}/${file}`;
      newFiles.set(destKey, readFileSync(sourcePath, 'utf8'));
      sourceMap.set(destKey, `${stack}/core/${file}`);
    }
  }
  for (const pkg of packages) {
    const ruleFile = config.packages[pkg];
    if (!ruleFile) continue;
    const sourcePath = join(PACKAGE_ROOT, 'stacks', stack, 'packages', ruleFile);
    if (existsSync(sourcePath)) {
      const destKey = `${RULES_DEST}/${ruleFile}`;
      newFiles.set(destKey, readFileSync(sourcePath, 'utf8'));
      sourceMap.set(destKey, `${stack}/packages/${ruleFile}`);
    }
  }
  return { newFiles, sourceMap };
}

/**
 * Non-interactive update — 3-hash conflict resolution.
 * @param {string} projectDir
 * @param {object} options
 * @param {function} [options.onConflict] - async (filePath, localContent, newContent) => 'keep'|'overwrite'|'skip'
 */
export async function updateNonInteractive(projectDir, options = {}) {
  const manifest = readManifest(projectDir);
  if (!manifest) {
    throw new Error('No manifest found. Run `claude-stack init` first.');
  }

  const stack = detectStack(projectDir);
  const packages = stack ? detectPackages(projectDir, stack) : [];
  const { newFiles, sourceMap } = buildNewFilesMap(stack, packages);
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
      // Both changed — conflict
      result.conflicts.push({ filePath, localContent: readFileSync(absPath, 'utf8'), newContent });
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

  // Resolve conflicts if handler provided
  if (options.onConflict) {
    for (const conflict of result.conflicts) {
      const action = await options.onConflict(conflict.filePath, conflict.localContent, conflict.newContent);
      if (action === 'overwrite') {
        writeFileSync(join(projectDir, conflict.filePath), conflict.newContent, 'utf8');
        result.updated.push(conflict.filePath);
      } else if (action === 'keep') {
        result.kept.push(conflict.filePath);
      }
      // 'skip' — leave as conflict
    }
    // Remove resolved conflicts
    result.conflicts = result.conflicts.filter(c =>
      !result.updated.includes(c.filePath) && !result.kept.includes(c.filePath)
    );
  }

  // Extract filePath strings for rebuildManifest (it expects string[], not object[])
  const conflictPaths = result.conflicts.map(c => c.filePath);

  rebuildManifest(projectDir, stack, packages, manifest, conflictPaths, sourceMap);

  result.conflictPaths = conflictPaths;

  return result;
}

function rebuildManifest(projectDir, stack, packages, oldManifest, conflicts = [], sourceMap = new Map()) {
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
        const source = sourceMap.get(filePath) || oldManifest?.files?.[filePath]?.source || `${stack}/${file}`;
        filesMap[filePath] = {
          installed_hash: hashContent(content),
          source,
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

import { promptConflict } from './prompts.js';

/**
 * Interactive update.
 */
export async function update(projectDir) {
  console.log('\n  📦 Claude Stack — Updating rules...\n');

  try {
    const result = await updateNonInteractive(projectDir, {
      onConflict: async (filePath, localContent, newContent) => {
        let action = await promptConflict(filePath);
        while (action === 'diff') {
          console.log('\n  --- Local (on disk) ---');
          console.log(localContent.slice(0, 500) + (localContent.length > 500 ? '\n  ...(truncated)' : ''));
          console.log('\n  --- Package (new) ---');
          console.log(newContent.slice(0, 500) + (newContent.length > 500 ? '\n  ...(truncated)' : ''));
          action = await promptConflict(filePath);
        }
        return action;
      }
    });

    for (const f of result.updated) console.log(`  ↑ ${f} (updated)`);
    for (const f of result.added) console.log(`  + ${f} (added)`);
    for (const f of result.kept) console.log(`  ≡ ${f} (local edits kept)`);
    for (const f of result.skipped) console.log(`  · ${f} (unchanged)`);
    for (const f of result.removed) console.log(`  ✗ ${f} (removed)`);
    for (const c of result.conflicts) console.log(`  ⚠ ${c.filePath} (CONFLICT — skipped)`);

    const resolved = result.updated.length + result.kept.length;
    console.log(`\n  Done. ${result.updated.length} updated, ${result.added.length} added, ${result.kept.length} kept, ${result.removed.length} removed.`);
    if (result.conflicts.length > 0) {
      console.log(`  ${result.conflicts.length} unresolved conflict(s) — re-run update to resolve.\n`);
    } else {
      console.log('');
    }
  } catch (e) {
    console.error(`  Error: ${e.message}\n`);
  }
}
