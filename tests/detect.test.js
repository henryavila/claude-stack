import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { detectStack, detectPackages } from '../src/detect.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('detectStack', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'cs-detect-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('detects Laravel from composer.json', () => {
    copyFileSync(
      join(__dirname, 'fixtures/laravel-composer.json'),
      join(tmpDir, 'composer.json')
    );
    const result = detectStack(tmpDir);
    assert.equal(result, 'laravel');
  });

  it('detects React from package.json', () => {
    copyFileSync(
      join(__dirname, 'fixtures/react-package.json'),
      join(tmpDir, 'package.json')
    );
    const result = detectStack(tmpDir);
    assert.equal(result, 'react');
  });

  it('returns null when no stack detected', () => {
    const result = detectStack(tmpDir);
    assert.equal(result, null);
  });

  it('prefers Laravel when both exist', () => {
    copyFileSync(
      join(__dirname, 'fixtures/laravel-composer.json'),
      join(tmpDir, 'composer.json')
    );
    copyFileSync(
      join(__dirname, 'fixtures/react-package.json'),
      join(tmpDir, 'package.json')
    );
    const result = detectStack(tmpDir);
    assert.equal(result, 'laravel');
  });
});

describe('detectPackages', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'cs-detect-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('detects Laravel packages from composer.json', () => {
    copyFileSync(
      join(__dirname, 'fixtures/laravel-composer.json'),
      join(tmpDir, 'composer.json')
    );
    const packages = detectPackages(tmpDir, 'laravel');
    assert.ok(packages.includes('filament'));
    assert.ok(packages.includes('email-tracking'));
    assert.ok(!packages.includes('mongodb'));
  });

  it('returns empty array when no composer.json', () => {
    const packages = detectPackages(tmpDir, 'laravel');
    assert.deepEqual(packages, []);
  });
});
