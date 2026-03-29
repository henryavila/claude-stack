import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { uninstallNonInteractive } from '../src/uninstall.js';
import { initNonInteractive } from '../src/init.js';

describe('uninstallNonInteractive', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'cs-uninstall-'));
    writeFileSync(join(tmpDir, 'composer.json'), JSON.stringify({
      require: { 'laravel/framework': '^12.0' }
    }));
    // Install first
    initNonInteractive(tmpDir);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('removes all installed rule files', () => {
    uninstallNonInteractive(tmpDir);

    assert.ok(!existsSync(join(tmpDir, '.claude', 'rules', 'claude-stack')));
  });

  it('removes manifest directory', () => {
    uninstallNonInteractive(tmpDir);

    assert.ok(!existsSync(join(tmpDir, '.claude-stack')));
  });

  it('removes deny rules from settings.json but preserves other settings', () => {
    // Add custom setting before uninstall
    const settingsPath = join(tmpDir, '.claude', 'settings.json');
    const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
    settings.customKey = true;
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

    uninstallNonInteractive(tmpDir);

    const after = JSON.parse(readFileSync(settingsPath, 'utf8'));
    assert.equal(after.customKey, true);
    // Deny rules added by claude-stack should be removed
    const denyRules = after.permissions?.deny || [];
    assert.ok(!denyRules.some(d => d.includes('migrate:fresh')));
  });

  it('removes autoMemoryDirectory from settings.local.json', () => {
    uninstallNonInteractive(tmpDir);

    const localPath = join(tmpDir, '.claude', 'settings.local.json');
    if (existsSync(localPath)) {
      const settings = JSON.parse(readFileSync(localPath, 'utf8'));
      assert.equal(settings.autoMemoryDirectory, undefined);
    }
  });

  it('does NOT remove CLAUDE.md', () => {
    writeFileSync(join(tmpDir, 'CLAUDE.md'), '# My Project');
    uninstallNonInteractive(tmpDir);

    assert.ok(existsSync(join(tmpDir, 'CLAUDE.md')));
  });

  it('does NOT remove .ai/memory/', () => {
    uninstallNonInteractive(tmpDir);

    assert.ok(existsSync(join(tmpDir, '.ai', 'memory')));
  });

  it('throws when not installed', () => {
    rmSync(join(tmpDir, '.claude-stack'), { recursive: true, force: true });
    assert.throws(() => uninstallNonInteractive(tmpDir), /not installed/i);
  });

  it('returns list of removed files', () => {
    const result = uninstallNonInteractive(tmpDir);
    assert.ok(result.removedFiles.length > 0);
  });
});
