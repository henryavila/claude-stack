import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { installRules } from '../src/rules.js';

describe('installRules', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'cs-rules-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('copies core rules to .claude/rules/agent-standards/', () => {
    const result = installRules(tmpDir, 'laravel', []);
    const rulesDir = join(tmpDir, '.claude', 'rules', 'agent-standards');

    assert.ok(existsSync(join(rulesDir, 'testing.md')));
    assert.ok(existsSync(join(rulesDir, 'services.md')));
    assert.ok(existsSync(join(rulesDir, 'database.md')));
    assert.ok(existsSync(join(rulesDir, 'code-quality.md')));
    assert.ok(result.files.length >= 4);
  });

  it('copies package rules when packages detected', () => {
    const result = installRules(tmpDir, 'laravel', ['filament']);
    const rulesDir = join(tmpDir, '.claude', 'rules', 'agent-standards');

    assert.ok(existsSync(join(rulesDir, 'filament-v4.md')));
  });

  it('does not copy package rules when not detected', () => {
    installRules(tmpDir, 'laravel', []);
    const rulesDir = join(tmpDir, '.claude', 'rules', 'agent-standards');

    assert.ok(!existsSync(join(rulesDir, 'filament-v4.md')));
    assert.ok(!existsSync(join(rulesDir, 'email-tracking.md')));
    assert.ok(!existsSync(join(rulesDir, 'mongodb.md')));
  });

  it('returns installed files with hashes', () => {
    const result = installRules(tmpDir, 'laravel', ['filament']);
    assert.ok(result.files.length > 0);
    for (const f of result.files) {
      assert.ok(f.path);
      assert.ok(f.hash);
      assert.equal(f.hash.length, 64);
    }
  });

  it('does nothing when stack is null', () => {
    const result = installRules(tmpDir, null, []);
    assert.equal(result.files.length, 0);
  });
});
