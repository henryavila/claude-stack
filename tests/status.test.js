import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { getStatus } from '../src/status.js';
import { initNonInteractive } from '../src/init.js';

describe('getStatus', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'cs-status-'));
    writeFileSync(join(tmpDir, 'composer.json'), JSON.stringify({
      require: { 'laravel/framework': '^12.0', 'filament/filament': '^4.0' }
    }));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns not-installed when no manifest', () => {
    const status = getStatus(tmpDir);
    assert.equal(status.installed, false);
  });

  it('returns full status after init', () => {
    initNonInteractive(tmpDir);
    const status = getStatus(tmpDir);

    assert.equal(status.installed, true);
    assert.equal(status.stack, 'laravel');
    assert.ok(status.packages.includes('filament'));
    assert.ok(status.rules.length > 0);
    assert.ok(status.version);
  });

  it('detects locally modified rules', () => {
    initNonInteractive(tmpDir);

    const rulePath = join(tmpDir, '.claude', 'rules', 'claude-stack', 'testing.md');
    writeFileSync(rulePath, readFileSync(rulePath, 'utf8') + '\n# edited');

    const status = getStatus(tmpDir);
    const testingRule = status.rules.find(r => r.file === 'testing.md');
    assert.equal(testingRule.state, 'modified');
  });

  it('detects deleted rules', () => {
    initNonInteractive(tmpDir);

    unlinkSync(join(tmpDir, '.claude', 'rules', 'claude-stack', 'testing.md'));

    const status = getStatus(tmpDir);
    const testingRule = status.rules.find(r => r.file === 'testing.md');
    assert.equal(testingRule.state, 'deleted');
  });
});
