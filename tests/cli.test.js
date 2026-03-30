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

  it('help shows all 4 commands', () => {
    const output = execSync(`node ${CLI}`, { encoding: 'utf8' });
    assert.ok(output.includes('Agent Standards'));
    assert.ok(output.includes('npx @henryavila/agent-standards init'));
    assert.ok(output.includes('npx @henryavila/agent-standards update'));
    assert.ok(output.includes('npx @henryavila/agent-standards status'));
    assert.ok(output.includes('npx @henryavila/agent-standards uninstall'));
    assert.ok(output.includes('init'));
    assert.ok(output.includes('update'));
    assert.ok(output.includes('status'));
    assert.ok(output.includes('uninstall'));
  });

  it('init creates expected structure', () => {
    execSync(`node ${CLI} init --non-interactive`, { cwd: tmpDir, encoding: 'utf8' });

    assert.ok(existsSync(join(tmpDir, '.claude', 'rules', 'agent-standards', 'testing.md')));
    assert.ok(existsSync(join(tmpDir, '.claude', 'settings.json')));
    assert.ok(existsSync(join(tmpDir, '.claude', 'settings.local.json')));
    assert.ok(existsSync(join(tmpDir, '.agent-standards', 'manifest.json')));

    const settings = JSON.parse(readFileSync(join(tmpDir, '.claude', 'settings.json'), 'utf8'));
    assert.ok(settings.permissions.deny.some(d => d.includes('migrate:fresh')));
  });

  it('status shows installation info', () => {
    execSync(`node ${CLI} init --non-interactive`, { cwd: tmpDir, encoding: 'utf8' });
    const output = execSync(`node ${CLI} status`, { cwd: tmpDir, encoding: 'utf8' });
    assert.ok(output.includes('laravel'));
    assert.ok(output.includes('testing.md'));
  });

  it('status shows not-installed for fresh project', () => {
    const freshDir = mkdtempSync(join(tmpdir(), 'cs-e2e-fresh-'));
    try {
      const output = execSync(`node ${CLI} status`, { cwd: freshDir, encoding: 'utf8' });
      assert.ok(output.includes('Agent Standards'));
      assert.ok(output.includes('npx @henryavila/agent-standards init'));
      assert.ok(output.includes('not installed'));
    } finally {
      rmSync(freshDir, { recursive: true, force: true });
    }
  });

  it('uninstall removes rules and manifest', () => {
    execSync(`node ${CLI} init --non-interactive`, { cwd: tmpDir, encoding: 'utf8' });
    execSync(`node ${CLI} uninstall`, { cwd: tmpDir, encoding: 'utf8' });

    assert.ok(!existsSync(join(tmpDir, '.claude', 'rules', 'agent-standards', 'testing.md')));
    assert.ok(!existsSync(join(tmpDir, '.agent-standards', 'manifest.json')));
  });
});
