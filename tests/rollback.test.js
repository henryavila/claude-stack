import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { rollbackInit } from '../src/init.js';
import { initNonInteractive } from '../src/init.js';

describe('rollbackInit', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'cs-rollback-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('removes written files', () => {
    const rulesDir = join(tmpDir, '.claude', 'rules', 'agent-standards');
    mkdirSync(rulesDir, { recursive: true });
    const file1 = join(rulesDir, 'testing.md');
    const file2 = join(rulesDir, 'services.md');
    writeFileSync(file1, '# test');
    writeFileSync(file2, '# test');

    const writtenFiles = [file1, file2];
    const preExisting = { settings: false, localSettings: false, manifest: false };
    const paths = {
      settings: join(tmpDir, '.claude', 'settings.json'),
      localSettings: join(tmpDir, '.claude', 'settings.local.json'),
      manifest: join(tmpDir, '.agent-standards', 'manifest.json'),
    };

    rollbackInit(writtenFiles, preExisting, paths);

    assert.ok(!existsSync(file1));
    assert.ok(!existsSync(file2));
  });

  it('removes settings and manifest created by init', () => {
    mkdirSync(join(tmpDir, '.claude'), { recursive: true });
    mkdirSync(join(tmpDir, '.agent-standards'), { recursive: true });

    const settingsPath = join(tmpDir, '.claude', 'settings.json');
    const localPath = join(tmpDir, '.claude', 'settings.local.json');
    const manifestPath = join(tmpDir, '.agent-standards', 'manifest.json');
    writeFileSync(settingsPath, '{}');
    writeFileSync(localPath, '{}');
    writeFileSync(manifestPath, '{}');

    const preExisting = { settings: false, localSettings: false, manifest: false };
    const paths = { settings: settingsPath, localSettings: localPath, manifest: manifestPath };

    rollbackInit([], preExisting, paths);

    assert.ok(!existsSync(settingsPath));
    assert.ok(!existsSync(localPath));
    assert.ok(!existsSync(manifestPath));
  });

  it('preserves pre-existing settings on rollback', () => {
    mkdirSync(join(tmpDir, '.claude'), { recursive: true });
    const settingsPath = join(tmpDir, '.claude', 'settings.json');
    writeFileSync(settingsPath, '{"existing": true}');

    const preExisting = { settings: true, localSettings: false, manifest: false };
    const paths = {
      settings: settingsPath,
      localSettings: join(tmpDir, '.claude', 'settings.local.json'),
      manifest: join(tmpDir, '.agent-standards', 'manifest.json'),
    };

    rollbackInit([], preExisting, paths);

    assert.ok(existsSync(settingsPath));
    assert.equal(readFileSync(settingsPath, 'utf8'), '{"existing": true}');
  });

  it('handles already-deleted files gracefully', () => {
    const paths = {
      settings: join(tmpDir, '.claude', 'settings.json'),
      localSettings: join(tmpDir, '.claude', 'settings.local.json'),
      manifest: join(tmpDir, '.agent-standards', 'manifest.json'),
    };

    assert.doesNotThrow(() => {
      rollbackInit([join(tmpDir, 'nonexistent.md')], { settings: false, localSettings: false, manifest: false }, paths);
    });
  });
});

describe('initNonInteractive rollback integration', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'cs-rollback-int-'));
    writeFileSync(join(tmpDir, 'composer.json'), JSON.stringify({
      require: { 'laravel/framework': '^12.0' }
    }));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('preserves pre-existing settings.json through successful init', () => {
    const claudeDir = join(tmpDir, '.claude');
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(join(claudeDir, 'settings.json'), '{"existing": true}');

    initNonInteractive(tmpDir);

    const settings = JSON.parse(readFileSync(join(claudeDir, 'settings.json'), 'utf8'));
    assert.equal(settings.existing, true); // preserved via merge
    assert.ok(settings.permissions); // merged stack settings
  });
});
