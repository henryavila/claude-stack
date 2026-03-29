import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('prompts module', () => {
  it('exports promptRecommendations and promptConflict', async () => {
    const mod = await import('../src/prompts.js');
    assert.equal(typeof mod.promptRecommendations, 'function');
    assert.equal(typeof mod.promptConflict, 'function');
  });
});
