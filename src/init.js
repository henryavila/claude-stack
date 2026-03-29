import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { detectStack, detectPackages } from './detect.js';
import { installRules, PACKAGE_ROOT } from './rules.js';
import { mergeSettings, generateLocalSettings } from './settings.js';
import { readManifest, writeManifest } from './manifest.js';
import { detectRecommendations } from './recommend.js';

/**
 * Non-interactive init — testable core logic.
 * If already installed (manifest exists), delegates to update instead.
 */
export function initNonInteractive(projectDir) {
  // Check if already installed — redirect to update
  const existingManifest = readManifest(projectDir);
  if (existingManifest) {
    return { alreadyInstalled: true };
  }

  const stack = detectStack(projectDir);
  const packages = stack ? detectPackages(projectDir, stack) : [];

  // Install rules
  const { files: ruleFiles } = installRules(projectDir, stack, packages);

  // Merge settings
  if (stack) {
    const stackSettingsPath = join(PACKAGE_ROOT, 'stacks', stack, 'settings.json');
    if (existsSync(stackSettingsPath)) {
      const stackSettings = JSON.parse(readFileSync(stackSettingsPath, 'utf8'));
      mergeSettings(projectDir, stackSettings);
    }
  } else {
    // Even without stack, create base settings
    mergeSettings(projectDir, {});
  }

  // Generate local settings
  generateLocalSettings(projectDir);

  // Write manifest
  const filesMap = {};
  for (const f of ruleFiles) {
    filesMap[f.path] = { installed_hash: f.hash, source: f.source };
  }
  writeManifest(projectDir, {
    version: getPackageVersion(),
    stack,
    packages,
    files: filesMap,
  });

  // Check CLAUDE.md
  const claudeMdExists = existsSync(join(projectDir, 'CLAUDE.md'));

  // Detect recommendations
  const recommendations = detectRecommendations(projectDir, stack);

  return {
    stack,
    packages,
    rules: ruleFiles,
    claudeMdExists,
    recommendations,
  };
}

function getPackageVersion() {
  const pkg = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf8'));
  return pkg.version;
}

/**
 * Interactive init — entry point from CLI.
 */
export async function init(projectDir) {
  console.log('\n  📦 Claude Stack — Optimized AI instructions for your project.\n');

  const result = initNonInteractive(projectDir);

  if (result.alreadyInstalled) {
    console.log('  Já instalado. Use `claude-stack update` para atualizar.\n');
    return;
  }

  // Display stack detection
  if (result.stack) {
    console.log(`  Stack detectada: ${result.stack}`);
    if (result.packages.length > 0) {
      console.log(`  Packages detectados: ${result.packages.join(', ')}`);
    }
  } else {
    console.log('  Nenhuma stack detectada (instalando estrutura base).');
  }

  // Display installed rules
  console.log('');
  for (const f of result.rules) {
    console.log(`  ✓ ${f.path}`);
  }

  console.log('  ✓ .claude/settings.json (deny rules merged)');
  console.log('  ✓ .claude/settings.local.json (autoMemoryDirectory)');

  // CLAUDE.md guidance
  console.log('');
  if (!result.claudeMdExists) {
    const promptPath = join(PACKAGE_ROOT, 'prompts', 'generate-claude-md.md');
    if (existsSync(promptPath)) {
      console.log('  📝 CLAUDE.md não encontrado.');
      console.log('  Use o prompt em prompts/generate-claude-md.md para gerar um otimizado.');
      console.log('  Ou peça à IA: "Gere um CLAUDE.md otimizado para este projeto"');
    }
  } else {
    console.log('  📝 CLAUDE.md encontrado — considere revisar com prompts/analyze-claude-md.md');
  }

  // Recommendations
  const notInstalled = result.recommendations.filter(r => !r.installed);
  if (notInstalled.length > 0) {
    console.log('\n  💡 Ferramentas recomendadas:\n');
    for (const rec of notInstalled) {
      const cmd = rec.installCmd ? ` → ${rec.installCmd}` : '';
      console.log(`     ${rec.name} — ${rec.description}${cmd}`);
    }
  }

  console.log('');
}
