import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { updateNonInteractive } from '../src/update.js';
import { hashContent } from '../src/hash.js';
import { writeManifest, readManifest } from '../src/manifest.js';

describe('updateNonInteractive', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'cs-update-'));
    writeFileSync(join(tmpDir, 'composer.json'), JSON.stringify({
      require: { 'laravel/framework': '^12.0' }
    }));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('overwrites silently when only package changed', async () => {
    const oldContent = '# Old testing rules';
    const rulesDir = join(tmpDir, '.claude', 'rules', 'agent-standards');
    mkdirSync(rulesDir, { recursive: true });
    writeFileSync(join(rulesDir, 'testing.md'), oldContent);

    writeManifest(tmpDir, {
      version: '0.1.0',
      stack: 'laravel',
      packages: [],
      files: {
        '.claude/rules/agent-standards/testing.md': {
          installed_hash: hashContent(oldContent),
          source: 'laravel/core/testing.md',
        }
      }
    });

    const result = await updateNonInteractive(tmpDir);
    const newContent = readFileSync(join(rulesDir, 'testing.md'), 'utf8');

    assert.notEqual(newContent, oldContent);
    assert.ok(result.updated.length > 0 || result.added.length > 0);
  });

  it('keeps local edits when package unchanged', async () => {
    const originalContent = readFileSync(
      join(process.cwd(), 'stacks', 'laravel', 'core', 'testing.md'), 'utf8'
    );
    const userEdited = originalContent + '\n# My custom addition';

    const rulesDir = join(tmpDir, '.claude', 'rules', 'agent-standards');
    mkdirSync(rulesDir, { recursive: true });
    writeFileSync(join(rulesDir, 'testing.md'), userEdited);

    writeManifest(tmpDir, {
      version: '0.1.0',
      stack: 'laravel',
      packages: [],
      files: {
        '.claude/rules/agent-standards/testing.md': {
          installed_hash: hashContent(originalContent),
          source: 'laravel/core/testing.md',
        }
      }
    });

    const result = await updateNonInteractive(tmpDir);
    const afterUpdate = readFileSync(join(rulesDir, 'testing.md'), 'utf8');

    assert.ok(afterUpdate.includes('# My custom addition'));
    assert.ok(result.kept.includes('.claude/rules/agent-standards/testing.md'));
  });

  it('skips unchanged files', async () => {
    const content = readFileSync(
      join(process.cwd(), 'stacks', 'laravel', 'core', 'testing.md'), 'utf8'
    );

    const rulesDir = join(tmpDir, '.claude', 'rules', 'agent-standards');
    mkdirSync(rulesDir, { recursive: true });
    writeFileSync(join(rulesDir, 'testing.md'), content);

    writeManifest(tmpDir, {
      version: '0.1.0',
      stack: 'laravel',
      packages: [],
      files: {
        '.claude/rules/agent-standards/testing.md': {
          installed_hash: hashContent(content),
          source: 'laravel/core/testing.md',
        }
      }
    });

    const result = await updateNonInteractive(tmpDir);
    assert.ok(result.skipped.includes('.claude/rules/agent-standards/testing.md'));
  });

  it('throws when no manifest exists', async () => {
    await assert.rejects(async () => await updateNonInteractive(tmpDir), /No manifest found/);
  });

  it('removes orphaned files', async () => {
    const content = '# Old rule that no longer exists';
    const rulesDir = join(tmpDir, '.claude', 'rules', 'agent-standards');
    mkdirSync(rulesDir, { recursive: true });
    writeFileSync(join(rulesDir, 'obsolete.md'), content);

    writeManifest(tmpDir, {
      version: '0.1.0',
      stack: 'laravel',
      packages: [],
      files: {
        '.claude/rules/agent-standards/obsolete.md': {
          installed_hash: hashContent(content),
          source: 'laravel/core/obsolete.md',
        }
      }
    });

    const result = await updateNonInteractive(tmpDir);
    assert.ok(!existsSync(join(rulesDir, 'obsolete.md')));
    assert.ok(result.removed.includes('.claude/rules/agent-standards/obsolete.md'));
  });

  it('reinstalls locally deleted files', async () => {
    const content = readFileSync(
      join(process.cwd(), 'stacks', 'laravel', 'core', 'testing.md'), 'utf8'
    );
    const rulesDir = join(tmpDir, '.claude', 'rules', 'agent-standards');
    mkdirSync(rulesDir, { recursive: true });

    writeManifest(tmpDir, {
      version: '0.1.0',
      stack: 'laravel',
      packages: [],
      files: {
        '.claude/rules/agent-standards/testing.md': {
          installed_hash: hashContent(content),
          source: 'laravel/core/testing.md',
        }
      }
    });

    const result = await updateNonInteractive(tmpDir);
    assert.ok(existsSync(join(rulesDir, 'testing.md')));
    assert.ok(result.added.includes('.claude/rules/agent-standards/testing.md'));
  });

  // ── Additional edge case tests ──

  it('detects conflict when both local and package changed', async () => {
    const originalContent = '# Original content v1';
    const locallyEdited = '# Original content v1\n# User changes';

    const rulesDir = join(tmpDir, '.claude', 'rules', 'agent-standards');
    mkdirSync(rulesDir, { recursive: true });
    writeFileSync(join(rulesDir, 'testing.md'), locallyEdited);

    writeManifest(tmpDir, {
      version: '0.1.0',
      stack: 'laravel',
      packages: [],
      files: {
        '.claude/rules/agent-standards/testing.md': {
          installed_hash: hashContent(originalContent),
          source: 'laravel/core/testing.md',
        }
      }
    });

    const result = await updateNonInteractive(tmpDir);
    assert.ok(result.conflictPaths.includes('.claude/rules/agent-standards/testing.md'));
    // File on disk should remain untouched (user's version preserved)
    const afterUpdate = readFileSync(join(rulesDir, 'testing.md'), 'utf8');
    assert.equal(afterUpdate, locallyEdited);
  });

  it('preserves installed_hash in manifest for unresolved conflicts', async () => {
    const originalContent = '# Original content v1';
    const locallyEdited = '# Original content v1\n# User changes';
    const originalHash = hashContent(originalContent);

    const rulesDir = join(tmpDir, '.claude', 'rules', 'agent-standards');
    mkdirSync(rulesDir, { recursive: true });
    writeFileSync(join(rulesDir, 'testing.md'), locallyEdited);

    writeManifest(tmpDir, {
      version: '0.1.0',
      stack: 'laravel',
      packages: [],
      files: {
        '.claude/rules/agent-standards/testing.md': {
          installed_hash: originalHash,
          source: 'laravel/core/testing.md',
        }
      }
    });

    await updateNonInteractive(tmpDir);
    const manifest = readManifest(tmpDir);
    assert.equal(
      manifest.files['.claude/rules/agent-standards/testing.md'].installed_hash,
      originalHash
    );
  });

  it('adds newly detected package rules', async () => {
    const testingContent = readFileSync(
      join(process.cwd(), 'stacks', 'laravel', 'core', 'testing.md'), 'utf8'
    );

    const rulesDir = join(tmpDir, '.claude', 'rules', 'agent-standards');
    mkdirSync(rulesDir, { recursive: true });
    writeFileSync(join(rulesDir, 'testing.md'), testingContent);

    writeManifest(tmpDir, {
      version: '0.1.0',
      stack: 'laravel',
      packages: [],
      files: {
        '.claude/rules/agent-standards/testing.md': {
          installed_hash: hashContent(testingContent),
          source: 'laravel/core/testing.md',
        }
      }
    });

    writeFileSync(join(tmpDir, 'composer.json'), JSON.stringify({
      require: {
        'laravel/framework': '^12.0',
        'filament/filament': '^4.0',
      }
    }));

    const result = await updateNonInteractive(tmpDir);
    assert.ok(result.added.includes('.claude/rules/agent-standards/filament-v4.md'));
    assert.ok(existsSync(join(rulesDir, 'filament-v4.md')));
  });

  it('updates manifest with correct version and stack after update', async () => {
    const content = readFileSync(
      join(process.cwd(), 'stacks', 'laravel', 'core', 'testing.md'), 'utf8'
    );

    const rulesDir = join(tmpDir, '.claude', 'rules', 'agent-standards');
    mkdirSync(rulesDir, { recursive: true });
    writeFileSync(join(rulesDir, 'testing.md'), content);

    writeManifest(tmpDir, {
      version: '0.0.1',
      stack: 'laravel',
      packages: [],
      files: {
        '.claude/rules/agent-standards/testing.md': {
          installed_hash: hashContent(content),
          source: 'laravel/core/testing.md',
        }
      }
    });

    await updateNonInteractive(tmpDir);
    const manifest = readManifest(tmpDir);

    assert.equal(manifest.stack, 'laravel');
    assert.equal(manifest.version, '0.2.0');
    assert.ok(manifest.updated_at);
  });

  it('handles multiple files in different states simultaneously', async () => {
    const testingContent = readFileSync(
      join(process.cwd(), 'stacks', 'laravel', 'core', 'testing.md'), 'utf8'
    );
    const servicesContent = readFileSync(
      join(process.cwd(), 'stacks', 'laravel', 'core', 'services.md'), 'utf8'
    );

    const rulesDir = join(tmpDir, '.claude', 'rules', 'agent-standards');
    mkdirSync(rulesDir, { recursive: true });

    writeFileSync(join(rulesDir, 'testing.md'), testingContent);
    const editedServices = servicesContent + '\n# My edit';
    writeFileSync(join(rulesDir, 'services.md'), editedServices);
    writeFileSync(join(rulesDir, 'obsolete.md'), '# Obsolete');

    writeManifest(tmpDir, {
      version: '0.1.0',
      stack: 'laravel',
      packages: [],
      files: {
        '.claude/rules/agent-standards/testing.md': {
          installed_hash: hashContent(testingContent),
          source: 'laravel/core/testing.md',
        },
        '.claude/rules/agent-standards/services.md': {
          installed_hash: hashContent(servicesContent),
          source: 'laravel/core/services.md',
        },
        '.claude/rules/agent-standards/obsolete.md': {
          installed_hash: hashContent('# Obsolete'),
          source: 'laravel/core/obsolete.md',
        },
      }
    });

    const result = await updateNonInteractive(tmpDir);

    assert.ok(result.skipped.includes('.claude/rules/agent-standards/testing.md'));
    assert.ok(result.kept.includes('.claude/rules/agent-standards/services.md'));
    assert.ok(result.removed.includes('.claude/rules/agent-standards/obsolete.md'));
    assert.ok(result.added.includes('.claude/rules/agent-standards/database.md'));
    assert.ok(result.added.includes('.claude/rules/agent-standards/code-quality.md'));
  });

  it('handles empty manifest files map gracefully', async () => {
    writeManifest(tmpDir, {
      version: '0.1.0',
      stack: 'laravel',
      packages: [],
      files: {}
    });

    const result = await updateNonInteractive(tmpDir);

    assert.ok(result.added.length >= 4);
    assert.ok(result.updated.length === 0);
    assert.ok(result.removed.length === 0);
  });

  it('removes orphan even when file already deleted from disk', async () => {
    writeManifest(tmpDir, {
      version: '0.1.0',
      stack: 'laravel',
      packages: [],
      files: {
        '.claude/rules/agent-standards/gone.md': {
          installed_hash: hashContent('# Gone'),
          source: 'laravel/core/gone.md',
        }
      }
    });

    const result = await updateNonInteractive(tmpDir);
    assert.ok(result.removed.includes('.claude/rules/agent-standards/gone.md'));
  });

  it('manifest includes newly added package files after update', async () => {
    writeFileSync(join(tmpDir, 'composer.json'), JSON.stringify({
      require: {
        'laravel/framework': '^12.0',
        'mongodb/laravel-mongodb': '^5.0',
      }
    }));

    const testingContent = readFileSync(
      join(process.cwd(), 'stacks', 'laravel', 'core', 'testing.md'), 'utf8'
    );

    const rulesDir = join(tmpDir, '.claude', 'rules', 'agent-standards');
    mkdirSync(rulesDir, { recursive: true });
    writeFileSync(join(rulesDir, 'testing.md'), testingContent);

    writeManifest(tmpDir, {
      version: '0.1.0',
      stack: 'laravel',
      packages: [],
      files: {
        '.claude/rules/agent-standards/testing.md': {
          installed_hash: hashContent(testingContent),
          source: 'laravel/core/testing.md',
        }
      }
    });

    await updateNonInteractive(tmpDir);
    const manifest = readManifest(tmpDir);

    assert.ok(manifest.files['.claude/rules/agent-standards/mongodb.md']);
    assert.ok(manifest.files['.claude/rules/agent-standards/mongodb.md'].installed_hash);
    assert.deepEqual(manifest.packages, ['mongodb']);
  });

  // ── New Task 6 test: conflict object shape ──

  it('returns conflict objects with content when both changed', async () => {
    const originalContent = '# Original content v1';
    const locallyEdited = '# Original content v1\n# User changes';
    const rulesDir = join(tmpDir, '.claude', 'rules', 'agent-standards');
    mkdirSync(rulesDir, { recursive: true });
    writeFileSync(join(rulesDir, 'testing.md'), locallyEdited);
    writeManifest(tmpDir, {
      version: '0.1.0', stack: 'laravel', packages: [],
      files: { '.claude/rules/agent-standards/testing.md': { installed_hash: hashContent(originalContent), source: 'laravel/core/testing.md' } }
    });

    const result = await updateNonInteractive(tmpDir);
    assert.ok(result.conflicts.length > 0);
    assert.ok(result.conflicts[0].filePath);
    assert.ok(result.conflicts[0].localContent);
    assert.ok(result.conflicts[0].newContent);
  });

  it('preserves manifest metadata used by uninstall', async () => {
    writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({
      name: 'generic-project'
    }));

    writeManifest(tmpDir, {
      version: '0.1.0',
      stack: null,
      packages: [],
      meta: {
        createdSettings: true,
        createdLocalSettings: true,
      },
      files: {}
    });

    await updateNonInteractive(tmpDir);
    const manifest = readManifest(tmpDir);

    assert.deepEqual(manifest.meta, {
      createdSettings: true,
      createdLocalSettings: true,
    });
  });
});
