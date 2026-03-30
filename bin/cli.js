#!/usr/bin/env node

import { argv } from 'node:process';

const command = argv[2];

if (command === 'init') {
  const { init } = await import('../src/init.js');
  await init(process.cwd());
} else if (command === 'update') {
  const { update } = await import('../src/update.js');
  await update(process.cwd());
} else if (command === 'status') {
  const { status } = await import('../src/status.js');
  await status(process.cwd());
} else if (command === 'uninstall') {
  const { uninstall } = await import('../src/uninstall.js');
  await uninstall(process.cwd());
} else {
  console.log(`
  📦 Agent Standards — Operational quality standards for AI agents.

  Usage:
    npx @henryavila/agent-standards init        Set up AI instructions + stack rules
    npx @henryavila/agent-standards update      Update rules with conflict handling
    npx @henryavila/agent-standards status      Show installation status
    npx @henryavila/agent-standards uninstall   Remove Agent Standards from project

  Docs: https://github.com/henryavila/agent-standards
  `);
}
