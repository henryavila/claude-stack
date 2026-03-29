import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const CLI = join(process.cwd(), 'bin', 'cli.js');

describe('CLI e2e', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'cs-e2e-'));
    writeFileSync(join(tmpDir, 'composer.json'), JSON.stringify({
      require: { 'laravel/framework': '^12.0' }
    }));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('shows help with no command', () => {
    const output = execSync(`node ${CLI}`, { encoding: 'utf8' });
    assert.ok(output.includes('Claude Stack'));
    assert.ok(output.includes('init'));
    assert.ok(output.includes('update'));
  });

  it('init creates expected structure', () => {
    execSync(`node ${CLI} init`, { cwd: tmpDir, encoding: 'utf8' });

    assert.ok(existsSync(join(tmpDir, '.claude', 'rules', 'claude-stack', 'testing.md')));
    assert.ok(existsSync(join(tmpDir, '.claude', 'settings.json')));
    assert.ok(existsSync(join(tmpDir, '.claude', 'settings.local.json')));
    assert.ok(existsSync(join(tmpDir, '.claude-stack', 'manifest.json')));

    const settings = JSON.parse(readFileSync(join(tmpDir, '.claude', 'settings.json'), 'utf8'));
    assert.ok(settings.permissions.deny.some(d => d.includes('migrate:fresh')));
  });
});
