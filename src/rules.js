import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashContent } from './hash.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const PACKAGE_ROOT = join(__dirname, '..');
// Use forward slashes consistently (not path.join) for manifest keys
export const RULES_DEST = '.claude/rules/claude-stack';

const STACK_RULES = {
  laravel: {
    core: ['testing.md', 'services.md', 'database.md', 'code-quality.md'],
    packages: {
      filament: 'filament-v4.md',
      'email-tracking': 'email-tracking.md',
      mongodb: 'mongodb.md',
    },
  },
};

export function getStackConfig(stack) {
  return STACK_RULES[stack] || null;
}

export function installRules(projectDir, stack, detectedPackages) {
  if (!stack || !STACK_RULES[stack]) return { files: [] };

  const config = STACK_RULES[stack];
  const destDir = join(projectDir, RULES_DEST);
  mkdirSync(destDir, { recursive: true });

  const installedFiles = [];

  // Install core rules
  for (const file of config.core) {
    const sourcePath = join(PACKAGE_ROOT, 'stacks', stack, 'core', file);
    if (!existsSync(sourcePath)) continue;

    const content = readFileSync(sourcePath, 'utf8');
    const destPath = join(destDir, file);
    writeFileSync(destPath, content, 'utf8');

    installedFiles.push({
      path: `${RULES_DEST}/${file}`,
      hash: hashContent(content),
      source: `${stack}/core/${file}`,
    });
  }

  // Install package-specific rules
  for (const pkg of detectedPackages) {
    const ruleFile = config.packages[pkg];
    if (!ruleFile) continue;

    const sourcePath = join(PACKAGE_ROOT, 'stacks', stack, 'packages', ruleFile);
    if (!existsSync(sourcePath)) continue;

    const content = readFileSync(sourcePath, 'utf8');
    const destPath = join(destDir, ruleFile);
    writeFileSync(destPath, content, 'utf8');

    installedFiles.push({
      path: `${RULES_DEST}/${ruleFile}`,
      hash: hashContent(content),
      source: `${stack}/packages/${ruleFile}`,
    });
  }

  return { files: installedFiles };
}
