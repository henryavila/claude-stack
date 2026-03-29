#!/usr/bin/env node

import { argv } from 'node:process';

const command = argv[2];

if (command === 'init') {
  const { init } = await import('../src/init.js');
  await init(process.cwd());
} else if (command === 'update') {
  const { update } = await import('../src/update.js');
  await update(process.cwd());
} else {
  console.log(`
  📦 Claude Stack — Optimized AI instructions for your project.

  Usage:
    npx @henryavila/claude-stack init      Set up AI instructions + stack rules
    npx @henryavila/claude-stack update    Update rules with conflict handling

  Docs: https://github.com/henryavila/claude-stack
  `);
}
