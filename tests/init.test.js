import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { initNonInteractive } from '../src/init.js';

describe('initNonInteractive', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'cs-init-'));
    // Create a Laravel project fixture
    writeFileSync(join(tmpDir, 'composer.json'), JSON.stringify({
      require: { 'laravel/framework': '^12.0', 'filament/filament': '^4.0' }
    }));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('detects stack and installs core rules', () => {
    const result = initNonInteractive(tmpDir);

    assert.equal(result.stack, 'laravel');
    assert.ok(result.rules.length > 0);
    assert.ok(existsSync(join(tmpDir, '.claude', 'rules', 'claude-stack', 'testing.md')));
    assert.ok(existsSync(join(tmpDir, '.claude', 'rules', 'claude-stack', 'services.md')));
  });

  it('installs package-specific rules', () => {
    const result = initNonInteractive(tmpDir);

    assert.ok(result.packages.includes('filament'));
    assert.ok(existsSync(join(tmpDir, '.claude', 'rules', 'claude-stack', 'filament-v4.md')));
  });

  it('creates settings.json with deny rules', () => {
    initNonInteractive(tmpDir);

    const settings = JSON.parse(readFileSync(join(tmpDir, '.claude', 'settings.json'), 'utf8'));
    assert.ok(settings.permissions.deny.length > 0);
    assert.ok(settings.permissions.deny.some(d => d.includes('migrate:fresh')));
  });

  it('creates settings.local.json with autoMemoryDirectory', () => {
    initNonInteractive(tmpDir);

    const local = JSON.parse(readFileSync(join(tmpDir, '.claude', 'settings.local.json'), 'utf8'));
    assert.ok(local.autoMemoryDirectory.endsWith('.ai/memory'));
  });

  it('writes manifest', () => {
    initNonInteractive(tmpDir);

    assert.ok(existsSync(join(tmpDir, '.claude-stack', 'manifest.json')));
  });

  it('detects CLAUDE.md status', () => {
    const result = initNonInteractive(tmpDir);
    assert.equal(result.claudeMdExists, false);
  });

  it('detects existing CLAUDE.md', () => {
    writeFileSync(join(tmpDir, 'CLAUDE.md'), '# My Project');
    const result = initNonInteractive(tmpDir);
    assert.equal(result.claudeMdExists, true);
  });

  it('returns alreadyInstalled when manifest exists', () => {
    // First init
    initNonInteractive(tmpDir);
    // Second init — should detect existing installation
    const result = initNonInteractive(tmpDir);
    assert.equal(result.alreadyInstalled, true);
  });

  it('adds .claude-stack/ and settings.local.json to .gitignore', () => {
    initNonInteractive(tmpDir);

    const gitignorePath = join(tmpDir, '.gitignore');
    assert.ok(existsSync(gitignorePath));
    const content = readFileSync(gitignorePath, 'utf8');
    assert.ok(content.includes('.claude-stack/'));
    assert.ok(content.includes('.claude/settings.local.json'));
  });

  it('does not duplicate gitignore entries on re-run', () => {
    // Manually create gitignore with entry already present
    writeFileSync(join(tmpDir, '.gitignore'), '.claude-stack/\n');
    // Remove manifest so init runs fresh
    initNonInteractive(tmpDir);

    const content = readFileSync(join(tmpDir, '.gitignore'), 'utf8');
    const count = content.split('.claude-stack/').length - 1;
    assert.equal(count, 1);
  });

  it('creates .ai/memory/ directory', () => {
    initNonInteractive(tmpDir);

    assert.ok(existsSync(join(tmpDir, '.ai', 'memory')));
  });

  it('returns guidelinesExists status', () => {
    const result = initNonInteractive(tmpDir);
    assert.equal(result.guidelinesExists, false);
  });

  it('detects existing guidelines.md', () => {
    writeFileSync(join(tmpDir, 'guidelines.md'), '# Guidelines');
    const result = initNonInteractive(tmpDir);
    assert.equal(result.guidelinesExists, true);
  });
});
