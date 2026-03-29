import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readManifest, writeManifest } from '../src/manifest.js';

describe('manifest', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'cs-test-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns null when no manifest exists', () => {
    assert.equal(readManifest(tmpDir), null);
  });

  it('writes and reads manifest', () => {
    const data = { version: '0.1.0', files: { 'a.md': { installed_hash: 'abc' } } };
    writeManifest(tmpDir, data);
    const result = readManifest(tmpDir);
    assert.equal(result.version, '0.1.0');
    assert.equal(result.files['a.md'].installed_hash, 'abc');
    assert.ok(result.updated_at);
    assert.ok(result.installed_at);
  });

  it('preserves installed_at on second write', () => {
    const data = { version: '0.1.0', files: {} };
    writeManifest(tmpDir, data);
    const first = readManifest(tmpDir);

    writeManifest(tmpDir, { ...first, version: '0.2.0' });
    const second = readManifest(tmpDir);
    assert.equal(second.installed_at, first.installed_at);
    assert.equal(second.version, '0.2.0');
  });
});
