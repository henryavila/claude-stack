import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { detectRecommendations } from '../src/recommend.js';

describe('detectRecommendations', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'cs-recommend-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('always recommends context7 MCP', () => {
    const recs = detectRecommendations(tmpDir, null);
    const context7 = recs.find(r => r.id === 'context7');
    assert.ok(context7);
    assert.equal(context7.type, 'mcp');
    assert.equal(context7.installed, false);
  });

  it('recommends laravel-boost for Laravel stack', () => {
    const recs = detectRecommendations(tmpDir, 'laravel');
    const boost = recs.find(r => r.id === 'laravel-boost');
    assert.ok(boost);
    assert.equal(boost.type, 'mcp');
  });

  it('does not recommend laravel-boost for non-Laravel', () => {
    const recs = detectRecommendations(tmpDir, 'react');
    const boost = recs.find(r => r.id === 'laravel-boost');
    assert.equal(boost, undefined);
  });

  it('always recommends atomic-skills and bmad', () => {
    const recs = detectRecommendations(tmpDir, null);
    assert.ok(recs.find(r => r.id === 'atomic-skills'));
    assert.ok(recs.find(r => r.id === 'bmad-method'));
    assert.ok(recs.find(r => r.id === 'bmad-doc-architect'));
  });

  it('marks bmad as installed when _bmad/ exists', () => {
    mkdirSync(join(tmpDir, '_bmad'), { recursive: true });
    const recs = detectRecommendations(tmpDir, null);
    const bmad = recs.find(r => r.id === 'bmad-method');
    assert.equal(bmad.installed, true);
  });

  it('marks doc-architect as installed when config exists', () => {
    mkdirSync(join(tmpDir, '_bmad', 'bmad-doc-architect'), { recursive: true });
    writeFileSync(join(tmpDir, '_bmad', 'bmad-doc-architect', 'config.yaml'), 'test: true');
    const recs = detectRecommendations(tmpDir, null);
    const doc = recs.find(r => r.id === 'bmad-doc-architect');
    assert.equal(doc.installed, true);
  });
});
