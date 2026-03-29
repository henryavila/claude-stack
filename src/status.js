import { readFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { readManifest } from './manifest.js';
import { hashContent } from './hash.js';

export function getStatus(projectDir) {
  const manifest = readManifest(projectDir);
  if (!manifest) {
    return { installed: false };
  }

  const rules = [];
  for (const [filePath, entry] of Object.entries(manifest.files)) {
    const absPath = join(projectDir, filePath);
    let state = 'unchanged';

    if (!existsSync(absPath)) {
      state = 'deleted';
    } else {
      const currentHash = hashContent(readFileSync(absPath, 'utf8'));
      if (currentHash !== entry.installed_hash) {
        state = 'modified';
      }
    }

    rules.push({
      file: basename(filePath),
      path: filePath,
      source: entry.source,
      state,
    });
  }

  return {
    installed: true,
    version: manifest.version,
    stack: manifest.stack,
    packages: manifest.packages || [],
    rules,
    installedAt: manifest.installed_at,
    updatedAt: manifest.updated_at,
  };
}

export async function status(projectDir) {
  const s = getStatus(projectDir);

  if (!s.installed) {
    console.log('\n  📦 Claude Stack — not installed.\n');
    console.log('  Run: npx @henryavila/claude-stack init\n');
    return;
  }

  console.log(`\n  📦 Claude Stack v${s.version} — ${s.stack || 'no stack'} (${s.packages.join(', ') || 'no packages'})\n`);

  const icons = { unchanged: '·', modified: '≡', deleted: '✗' };
  const labels = { unchanged: 'unchanged', modified: 'locally modified', deleted: 'deleted from disk' };

  for (const rule of s.rules) {
    console.log(`  ${icons[rule.state]} ${rule.file} (${labels[rule.state]})`);
  }

  console.log(`\n  Installed: ${s.installedAt}`);
  console.log(`  Updated: ${s.updatedAt}\n`);
}
