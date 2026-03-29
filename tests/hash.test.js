import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hashContent } from '../src/hash.js';

describe('hashContent', () => {
  it('returns consistent SHA256 hex for same input', () => {
    const hash1 = hashContent('hello');
    const hash2 = hashContent('hello');
    assert.equal(hash1, hash2);
    assert.equal(hash1.length, 64);
  });

  it('returns different hashes for different input', () => {
    const hash1 = hashContent('hello');
    const hash2 = hashContent('world');
    assert.notEqual(hash1, hash2);
  });
});
