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

  it('overwrites silently when only package changed', () => {
    const oldContent = '# Old testing rules';
    const rulesDir = join(tmpDir, '.claude', 'rules', 'claude-stack');
    mkdirSync(rulesDir, { recursive: true });
    writeFileSync(join(rulesDir, 'testing.md'), oldContent);

    writeManifest(tmpDir, {
      version: '0.1.0',
      stack: 'laravel',
      packages: [],
      files: {
        '.claude/rules/claude-stack/testing.md': {
          installed_hash: hashContent(oldContent),
          source: 'laravel/core/testing.md',
        }
      }
    });

    const result = updateNonInteractive(tmpDir);
    const newContent = readFileSync(join(rulesDir, 'testing.md'), 'utf8');

    assert.notEqual(newContent, oldContent);
    assert.ok(result.updated.length > 0 || result.added.length > 0);
  });

  it('keeps local edits when package unchanged', () => {
    const originalContent = readFileSync(
      join(process.cwd(), 'stacks', 'laravel', 'core', 'testing.md'), 'utf8'
    );
    const userEdited = originalContent + '\n# My custom addition';

    const rulesDir = join(tmpDir, '.claude', 'rules', 'claude-stack');
    mkdirSync(rulesDir, { recursive: true });
    writeFileSync(join(rulesDir, 'testing.md'), userEdited);

    writeManifest(tmpDir, {
      version: '0.1.0',
      stack: 'laravel',
      packages: [],
      files: {
        '.claude/rules/claude-stack/testing.md': {
          installed_hash: hashContent(originalContent),
          source: 'laravel/core/testing.md',
        }
      }
    });

    const result = updateNonInteractive(tmpDir);
    const afterUpdate = readFileSync(join(rulesDir, 'testing.md'), 'utf8');

    assert.ok(afterUpdate.includes('# My custom addition'));
    assert.ok(result.kept.includes('.claude/rules/claude-stack/testing.md'));
  });

  it('skips unchanged files', () => {
    const content = readFileSync(
      join(process.cwd(), 'stacks', 'laravel', 'core', 'testing.md'), 'utf8'
    );

    const rulesDir = join(tmpDir, '.claude', 'rules', 'claude-stack');
    mkdirSync(rulesDir, { recursive: true });
    writeFileSync(join(rulesDir, 'testing.md'), content);

    writeManifest(tmpDir, {
      version: '0.1.0',
      stack: 'laravel',
      packages: [],
      files: {
        '.claude/rules/claude-stack/testing.md': {
          installed_hash: hashContent(content),
          source: 'laravel/core/testing.md',
        }
      }
    });

    const result = updateNonInteractive(tmpDir);
    assert.ok(result.skipped.includes('.claude/rules/claude-stack/testing.md'));
  });

  it('throws when no manifest exists', () => {
    assert.throws(() => updateNonInteractive(tmpDir), /No manifest found/);
  });

  it('removes orphaned files', () => {
    const content = '# Old rule that no longer exists';
    const rulesDir = join(tmpDir, '.claude', 'rules', 'claude-stack');
    mkdirSync(rulesDir, { recursive: true });
    writeFileSync(join(rulesDir, 'obsolete.md'), content);

    writeManifest(tmpDir, {
      version: '0.1.0',
      stack: 'laravel',
      packages: [],
      files: {
        '.claude/rules/claude-stack/obsolete.md': {
          installed_hash: hashContent(content),
          source: 'laravel/core/obsolete.md',
        }
      }
    });

    const result = updateNonInteractive(tmpDir);
    assert.ok(!existsSync(join(rulesDir, 'obsolete.md')));
    assert.ok(result.removed.includes('.claude/rules/claude-stack/obsolete.md'));
  });

  it('reinstalls locally deleted files', () => {
    // File in manifest but deleted from disk
    const content = readFileSync(
      join(process.cwd(), 'stacks', 'laravel', 'core', 'testing.md'), 'utf8'
    );
    const rulesDir = join(tmpDir, '.claude', 'rules', 'claude-stack');
    mkdirSync(rulesDir, { recursive: true });
    // Don't write testing.md to disk — simulates user deletion

    writeManifest(tmpDir, {
      version: '0.1.0',
      stack: 'laravel',
      packages: [],
      files: {
        '.claude/rules/claude-stack/testing.md': {
          installed_hash: hashContent(content),
          source: 'laravel/core/testing.md',
        }
      }
    });

    const result = updateNonInteractive(tmpDir);
    assert.ok(existsSync(join(rulesDir, 'testing.md')));
    assert.ok(result.added.includes('.claude/rules/claude-stack/testing.md'));
  });

  // ── Additional edge case tests ──

  it('detects conflict when both local and package changed', () => {
    const originalContent = '# Original content v1';
    const locallyEdited = '# Original content v1\n# User changes';

    const rulesDir = join(tmpDir, '.claude', 'rules', 'claude-stack');
    mkdirSync(rulesDir, { recursive: true });
    writeFileSync(join(rulesDir, 'testing.md'), locallyEdited);

    writeManifest(tmpDir, {
      version: '0.1.0',
      stack: 'laravel',
      packages: [],
      files: {
        '.claude/rules/claude-stack/testing.md': {
          installed_hash: hashContent(originalContent),
          source: 'laravel/core/testing.md',
        }
      }
    });

    const result = updateNonInteractive(tmpDir);
    assert.ok(result.conflicts.includes('.claude/rules/claude-stack/testing.md'));
    // File on disk should remain untouched (user's version preserved)
    const afterUpdate = readFileSync(join(rulesDir, 'testing.md'), 'utf8');
    assert.equal(afterUpdate, locallyEdited);
  });

  it('preserves installed_hash in manifest for unresolved conflicts', () => {
    const originalContent = '# Original content v1';
    const locallyEdited = '# Original content v1\n# User changes';
    const originalHash = hashContent(originalContent);

    const rulesDir = join(tmpDir, '.claude', 'rules', 'claude-stack');
    mkdirSync(rulesDir, { recursive: true });
    writeFileSync(join(rulesDir, 'testing.md'), locallyEdited);

    writeManifest(tmpDir, {
      version: '0.1.0',
      stack: 'laravel',
      packages: [],
      files: {
        '.claude/rules/claude-stack/testing.md': {
          installed_hash: originalHash,
          source: 'laravel/core/testing.md',
        }
      }
    });

    updateNonInteractive(tmpDir);
    const manifest = readManifest(tmpDir);
    // Old installed_hash should be preserved so conflict is re-detected
    assert.equal(
      manifest.files['.claude/rules/claude-stack/testing.md'].installed_hash,
      originalHash
    );
  });

  it('adds newly detected package rules', () => {
    // Start with only core files in manifest (no packages)
    const testingContent = readFileSync(
      join(process.cwd(), 'stacks', 'laravel', 'core', 'testing.md'), 'utf8'
    );

    const rulesDir = join(tmpDir, '.claude', 'rules', 'claude-stack');
    mkdirSync(rulesDir, { recursive: true });
    writeFileSync(join(rulesDir, 'testing.md'), testingContent);

    writeManifest(tmpDir, {
      version: '0.1.0',
      stack: 'laravel',
      packages: [],
      files: {
        '.claude/rules/claude-stack/testing.md': {
          installed_hash: hashContent(testingContent),
          source: 'laravel/core/testing.md',
        }
      }
    });

    // Now add filament to composer.json so it gets detected
    writeFileSync(join(tmpDir, 'composer.json'), JSON.stringify({
      require: {
        'laravel/framework': '^12.0',
        'filament/filament': '^4.0',
      }
    }));

    const result = updateNonInteractive(tmpDir);
    assert.ok(result.added.includes('.claude/rules/claude-stack/filament-v4.md'));
    assert.ok(existsSync(join(rulesDir, 'filament-v4.md')));
  });

  it('updates manifest with correct version and stack after update', () => {
    const content = readFileSync(
      join(process.cwd(), 'stacks', 'laravel', 'core', 'testing.md'), 'utf8'
    );

    const rulesDir = join(tmpDir, '.claude', 'rules', 'claude-stack');
    mkdirSync(rulesDir, { recursive: true });
    writeFileSync(join(rulesDir, 'testing.md'), content);

    writeManifest(tmpDir, {
      version: '0.0.1',
      stack: 'laravel',
      packages: [],
      files: {
        '.claude/rules/claude-stack/testing.md': {
          installed_hash: hashContent(content),
          source: 'laravel/core/testing.md',
        }
      }
    });

    updateNonInteractive(tmpDir);
    const manifest = readManifest(tmpDir);

    assert.equal(manifest.stack, 'laravel');
    assert.equal(manifest.version, '0.1.0');
    assert.ok(manifest.updated_at);
  });

  it('handles multiple files in different states simultaneously', () => {
    const testingContent = readFileSync(
      join(process.cwd(), 'stacks', 'laravel', 'core', 'testing.md'), 'utf8'
    );
    const servicesContent = readFileSync(
      join(process.cwd(), 'stacks', 'laravel', 'core', 'services.md'), 'utf8'
    );

    const rulesDir = join(tmpDir, '.claude', 'rules', 'claude-stack');
    mkdirSync(rulesDir, { recursive: true });

    // testing.md: unchanged (skip)
    writeFileSync(join(rulesDir, 'testing.md'), testingContent);
    // services.md: locally edited (keep)
    const editedServices = servicesContent + '\n# My edit';
    writeFileSync(join(rulesDir, 'services.md'), editedServices);
    // obsolete.md: orphan (remove)
    writeFileSync(join(rulesDir, 'obsolete.md'), '# Obsolete');

    writeManifest(tmpDir, {
      version: '0.1.0',
      stack: 'laravel',
      packages: [],
      files: {
        '.claude/rules/claude-stack/testing.md': {
          installed_hash: hashContent(testingContent),
          source: 'laravel/core/testing.md',
        },
        '.claude/rules/claude-stack/services.md': {
          installed_hash: hashContent(servicesContent),
          source: 'laravel/core/services.md',
        },
        '.claude/rules/claude-stack/obsolete.md': {
          installed_hash: hashContent('# Obsolete'),
          source: 'laravel/core/obsolete.md',
        },
      }
    });

    const result = updateNonInteractive(tmpDir);

    assert.ok(result.skipped.includes('.claude/rules/claude-stack/testing.md'));
    assert.ok(result.kept.includes('.claude/rules/claude-stack/services.md'));
    assert.ok(result.removed.includes('.claude/rules/claude-stack/obsolete.md'));
    // database.md and code-quality.md are new (not in old manifest)
    assert.ok(result.added.includes('.claude/rules/claude-stack/database.md'));
    assert.ok(result.added.includes('.claude/rules/claude-stack/code-quality.md'));
  });

  it('handles empty manifest files map gracefully', () => {
    writeManifest(tmpDir, {
      version: '0.1.0',
      stack: 'laravel',
      packages: [],
      files: {}
    });

    const result = updateNonInteractive(tmpDir);

    // All core files should be added as new
    assert.ok(result.added.length >= 4);
    assert.ok(result.updated.length === 0);
    assert.ok(result.removed.length === 0);
  });

  it('removes orphan even when file already deleted from disk', () => {
    // File is in manifest but doesn't exist on disk AND is no longer in package
    writeManifest(tmpDir, {
      version: '0.1.0',
      stack: 'laravel',
      packages: [],
      files: {
        '.claude/rules/claude-stack/gone.md': {
          installed_hash: hashContent('# Gone'),
          source: 'laravel/core/gone.md',
        }
      }
    });

    const result = updateNonInteractive(tmpDir);
    assert.ok(result.removed.includes('.claude/rules/claude-stack/gone.md'));
  });

  it('manifest includes newly added package files after update', () => {
    writeFileSync(join(tmpDir, 'composer.json'), JSON.stringify({
      require: {
        'laravel/framework': '^12.0',
        'mongodb/laravel-mongodb': '^5.0',
      }
    }));

    const testingContent = readFileSync(
      join(process.cwd(), 'stacks', 'laravel', 'core', 'testing.md'), 'utf8'
    );

    const rulesDir = join(tmpDir, '.claude', 'rules', 'claude-stack');
    mkdirSync(rulesDir, { recursive: true });
    writeFileSync(join(rulesDir, 'testing.md'), testingContent);

    writeManifest(tmpDir, {
      version: '0.1.0',
      stack: 'laravel',
      packages: [],
      files: {
        '.claude/rules/claude-stack/testing.md': {
          installed_hash: hashContent(testingContent),
          source: 'laravel/core/testing.md',
        }
      }
    });

    updateNonInteractive(tmpDir);
    const manifest = readManifest(tmpDir);

    assert.ok(manifest.files['.claude/rules/claude-stack/mongodb.md']);
    assert.ok(manifest.files['.claude/rules/claude-stack/mongodb.md'].installed_hash);
    assert.deepEqual(manifest.packages, ['mongodb']);
  });
});
