import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mergeSettings, generateLocalSettings } from '../src/settings.js';

describe('mergeSettings', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'cs-settings-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates settings.json when none exists', () => {
    const denyRules = ['Bash(php artisan migrate:fresh*)'];
    mergeSettings(tmpDir, { deny: denyRules });

    const settingsPath = join(tmpDir, '.claude', 'settings.json');
    assert.ok(existsSync(settingsPath));
    const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
    assert.ok(settings.permissions.deny.includes('Bash(php artisan migrate:fresh*)'));
    assert.equal(settings.enableAllProjectMcpServers, true);
  });

  it('merges deny rules into existing settings without overwriting', () => {
    const claudeDir = join(tmpDir, '.claude');
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(join(claudeDir, 'settings.json'), JSON.stringify({
      permissions: {
        allow: ['WebSearch'],
        deny: ['Bash(rm -rf *)']
      }
    }, null, 2));

    mergeSettings(tmpDir, { deny: ['Bash(php artisan migrate:fresh*)'] });

    const settings = JSON.parse(readFileSync(join(claudeDir, 'settings.json'), 'utf8'));
    assert.ok(settings.permissions.allow.includes('WebSearch'));
    assert.ok(settings.permissions.deny.includes('Bash(rm -rf *)'));
    assert.ok(settings.permissions.deny.includes('Bash(php artisan migrate:fresh*)'));
  });

  it('does not duplicate existing deny rules', () => {
    const claudeDir = join(tmpDir, '.claude');
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(join(claudeDir, 'settings.json'), JSON.stringify({
      permissions: {
        deny: ['Bash(php artisan migrate:fresh*)']
      }
    }, null, 2));

    mergeSettings(tmpDir, { deny: ['Bash(php artisan migrate:fresh*)'] });

    const settings = JSON.parse(readFileSync(join(claudeDir, 'settings.json'), 'utf8'));
    const count = settings.permissions.deny.filter(d => d === 'Bash(php artisan migrate:fresh*)').length;
    assert.equal(count, 1);
  });
});

describe('generateLocalSettings', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'cs-settings-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates settings.local.json with autoMemoryDirectory', () => {
    generateLocalSettings(tmpDir);

    const localPath = join(tmpDir, '.claude', 'settings.local.json');
    assert.ok(existsSync(localPath));
    const settings = JSON.parse(readFileSync(localPath, 'utf8'));
    assert.ok(settings.autoMemoryDirectory.startsWith(tmpDir));
    assert.ok(settings.autoMemoryDirectory.endsWith('.ai/memory'));
  });

  it('merges into existing settings.local.json without overwriting', () => {
    const claudeDir = join(tmpDir, '.claude');
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(join(claudeDir, 'settings.local.json'), JSON.stringify({
      permissions: { allow: ['Bash(git:*)'] }
    }, null, 2));

    generateLocalSettings(tmpDir);

    const settings = JSON.parse(readFileSync(join(claudeDir, 'settings.local.json'), 'utf8'));
    assert.ok(settings.permissions.allow.includes('Bash(git:*)'));
    assert.ok(settings.autoMemoryDirectory);
  });
});
