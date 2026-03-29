import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { detectStack, detectPackages } from './detect.js';
import { installRules, PACKAGE_ROOT } from './rules.js';
import { mergeSettings, generateLocalSettings } from './settings.js';
import { readManifest, writeManifest } from './manifest.js';
import { detectRecommendations } from './recommend.js';
import { promptRecommendations } from './prompts.js';
import { execSync } from 'node:child_process';

/**
 * Rollback helper — removes files created by init, preserves pre-existing ones.
 * Exported for testing.
 */
export function rollbackInit(writtenFiles, preExisting, paths) {
  for (const f of writtenFiles) {
    try { if (existsSync(f)) unlinkSync(f); } catch {}
  }
  if (!preExisting.settings && existsSync(paths.settings)) {
    try { unlinkSync(paths.settings); } catch {}
  }
  if (!preExisting.localSettings && existsSync(paths.localSettings)) {
    try { unlinkSync(paths.localSettings); } catch {}
  }
  if (!preExisting.manifest && existsSync(paths.manifest)) {
    try { unlinkSync(paths.manifest); } catch {}
  }
}

/**
 * Non-interactive init — testable core logic.
 * If already installed (manifest exists), delegates to update instead.
 */
export function initNonInteractive(projectDir) {
  const existingManifest = readManifest(projectDir);
  if (existingManifest) {
    return { alreadyInstalled: true };
  }

  const writtenFiles = [];

  // Snapshot pre-existing files BEFORE try
  const paths = {
    settings: join(projectDir, '.claude', 'settings.json'),
    localSettings: join(projectDir, '.claude', 'settings.local.json'),
    manifest: join(projectDir, '.claude-stack', 'manifest.json'),
  };
  const preExisting = {
    settings: existsSync(paths.settings),
    localSettings: existsSync(paths.localSettings),
    manifest: existsSync(paths.manifest),
  };

  try {
    const stack = detectStack(projectDir);
    const packages = stack ? detectPackages(projectDir, stack) : [];

    const { files: ruleFiles } = installRules(projectDir, stack, packages);
    for (const f of ruleFiles) {
      writtenFiles.push(join(projectDir, f.path));
    }

    let stackSettings = {};
    if (stack) {
      const stackSettingsPath = join(PACKAGE_ROOT, 'stacks', stack, 'settings.json');
      if (existsSync(stackSettingsPath)) {
        stackSettings = JSON.parse(readFileSync(stackSettingsPath, 'utf8'));
      }
    }
    mergeSettings(projectDir, stackSettings);

    generateLocalSettings(projectDir);

    const filesMap = {};
    for (const f of ruleFiles) {
      filesMap[f.path] = { installed_hash: f.hash, source: f.source };
    }
    writeManifest(projectDir, {
      version: getPackageVersion(),
      stack,
      packages,
      meta: {
        createdSettings: !preExisting.settings,
        createdLocalSettings: !preExisting.localSettings,
      },
      files: filesMap,
    });

    addToGitignore(projectDir);
    createMemoryDir(projectDir);

    const claudeMdExists = existsSync(join(projectDir, 'CLAUDE.md'));
    const guidelinesExists = existsSync(join(projectDir, 'guidelines.md'));
    const recommendations = detectRecommendations(projectDir, stack);

    return { stack, packages, rules: ruleFiles, claudeMdExists, guidelinesExists, recommendations };
  } catch (error) {
    rollbackInit(writtenFiles, preExisting, paths);
    throw error;
  }
}

function addToGitignore(projectDir) {
  const gitignorePath = join(projectDir, '.gitignore');
  let content = existsSync(gitignorePath) ? readFileSync(gitignorePath, 'utf8') : '';

  const entries = ['.claude-stack/', '.claude/settings.local.json'];
  let modified = false;

  for (const entry of entries) {
    if (!content.includes(entry)) {
      content += (content.endsWith('\n') || content === '' ? '' : '\n') + entry + '\n';
      modified = true;
    }
  }

  if (modified) {
    writeFileSync(gitignorePath, content, 'utf8');
  }
}

function createMemoryDir(projectDir) {
  mkdirSync(join(projectDir, '.ai', 'memory'), { recursive: true });
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
    console.log('  Nenhuma stack suportada detectada (instalando core).');
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

  // guidelines.md guidance
  if (!result.guidelinesExists) {
    console.log('  📝 guidelines.md não encontrado.');
    console.log('  Use o prompt em prompts/generate-guidelines.md para gerar.');
  } else {
    console.log('  📝 guidelines.md encontrado.');
  }

  // Recommendations
  const nonInteractive = process.argv.includes('--non-interactive') || process.env.CI;
  const notInstalled = result.recommendations.filter(r => !r.installed);

  if (notInstalled.length > 0 && !nonInteractive) {
    const selected = await promptRecommendations(result.recommendations);

    for (const rec of selected) {
      if (rec.type === 'tool' && rec.installCmd) {
        console.log(`\n  Installing ${rec.name}...`);
        try {
          execSync(rec.installCmd, { cwd: projectDir, stdio: 'inherit' });
          console.log(`  ✓ ${rec.name} installed`);
        } catch {
          console.log(`  ✗ ${rec.name} failed — run manually: ${rec.installCmd}`);
        }
      } else if (rec.type === 'plugin') {
        console.log(`\n  📋 ${rec.name}: run inside Claude Code → ${rec.installCmd}`);
      } else if (rec.type === 'mcp') {
        console.log(`\n  📋 ${rec.name}: configure MCP server in your Claude Code settings`);
      }
    }
  } else if (notInstalled.length > 0) {
    console.log('\n  💡 Ferramentas recomendadas:\n');
    for (const rec of notInstalled) {
      const cmd = rec.installCmd ? ` → ${rec.installCmd}` : '';
      console.log(`     ${rec.name} — ${rec.description}${cmd}`);
    }
  }

  console.log('');
}
