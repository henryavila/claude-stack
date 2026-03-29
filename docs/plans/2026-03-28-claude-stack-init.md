# Claude Stack — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a CLI tool (`npx @henryavila/claude-stack init`) that creates an optimized AI instruction structure for any project, with optional stack-specific rules.

**Architecture:** Node.js CLI with two layers — Core (directory structure, CLAUDE.md, settings, recommendations) and Extension (stack-specific rules via detection). Adapts installer patterns from atomic-skills (manifest, 3-hash conflict handling) without importing it as a dependency.

**Tech Stack:** Node.js 18+, ES modules, `node --test` for tests, `inquirer` for interactive prompts.

**Reference files:**
- Design: `.ai/memory/design.md`
- Atomic-skills patterns: `~/packages/atomic-skills/src/` (install.js, manifest.js, hash.js)
- Arch rules source: `~/arch/.claude/rules/` (testing.md, services.md, database.md, filament.md, email-tracking.md)
- Arch settings: `~/arch/.claude/settings.json`, `~/arch/.claude/settings.local.json`
- Arch CLAUDE.md: `~/arch/CLAUDE.md`

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `bin/cli.js`

**Step 1: Create package.json**

```json
{
  "name": "@henryavila/claude-stack",
  "version": "0.1.0",
  "description": "Optimized AI instruction structure for any project, with stack-specific rules.",
  "type": "module",
  "bin": {
    "claude-stack": "bin/cli.js"
  },
  "files": [
    "bin/",
    "src/",
    "stacks/",
    "prompts/"
  ],
  "scripts": {
    "test": "node --test tests/**/*.test.js"
  },
  "keywords": [
    "ai",
    "claude",
    "rules",
    "stack",
    "laravel",
    "react"
  ],
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/henryavila/claude-stack.git"
  },
  "dependencies": {
    "inquirer": "^12.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

**Step 2: Create bin/cli.js**

```javascript
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
```

**Step 3: Install dependencies**

Run: `cd /home/henry/packages/claude-stack && npm install`

**Step 4: Verify CLI shows help**

Run: `node bin/cli.js`
Expected: Help text with usage instructions.

**Step 5: Commit**

```bash
git add package.json package-lock.json bin/cli.js
git commit -m "feat: project scaffold with CLI entry point"
```

---

## Task 2: Hash + Manifest

**Files:**
- Create: `src/hash.js`
- Create: `src/manifest.js`
- Create: `tests/hash.test.js`
- Create: `tests/manifest.test.js`

**Step 1: Write failing tests for hash**

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hashContent } from '../src/hash.js';

describe('hashContent', () => {
  it('returns consistent SHA256 hex for same input', () => {
    const hash1 = hashContent('hello');
    const hash2 = hashContent('hello');
    assert.equal(hash1, hash2);
    assert.equal(hash1.length, 64); // SHA256 hex = 64 chars
  });

  it('returns different hashes for different input', () => {
    const hash1 = hashContent('hello');
    const hash2 = hashContent('world');
    assert.notEqual(hash1, hash2);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/hash.test.js`
Expected: FAIL — module not found.

**Step 3: Implement hash.js**

```javascript
import { createHash } from 'node:crypto';

export function hashContent(content) {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/hash.test.js`
Expected: PASS

**Step 5: Write failing tests for manifest**

```javascript
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
```

**Step 6: Run test to verify it fails**

Run: `npm test -- tests/manifest.test.js`
Expected: FAIL — module not found.

**Step 7: Implement manifest.js**

```javascript
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const MANIFEST_DIR = '.claude-stack';
const MANIFEST_FILE = 'manifest.json';

export function readManifest(projectDir) {
  const filePath = join(projectDir, MANIFEST_DIR, MANIFEST_FILE);
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

export function writeManifest(projectDir, data) {
  const dir = join(projectDir, MANIFEST_DIR);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  data.updated_at = new Date().toISOString();
  if (!data.installed_at) data.installed_at = data.updated_at;
  writeFileSync(join(dir, MANIFEST_FILE), JSON.stringify(data, null, 2) + '\n', 'utf8');
}
```

**Step 8: Run tests**

Run: `npm test`
Expected: ALL PASS

**Step 9: Commit**

```bash
git add src/hash.js src/manifest.js tests/hash.test.js tests/manifest.test.js
git commit -m "feat: hash and manifest modules with tests"
```

---

## Task 3: Stack Detection

**Files:**
- Create: `src/detect.js`
- Create: `tests/detect.test.js`
- Create: `tests/fixtures/laravel-composer.json`
- Create: `tests/fixtures/react-package.json`

**Step 1: Create test fixtures**

`tests/fixtures/laravel-composer.json`:
```json
{
  "name": "test/laravel-app",
  "require": {
    "php": "^8.3",
    "laravel/framework": "^12.0",
    "filament/filament": "^4.0",
    "henryavila/email-tracking": "^2.0"
  }
}
```

`tests/fixtures/react-package.json`:
```json
{
  "name": "test-react-app",
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

**Step 2: Write failing tests**

```javascript
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
```

**Step 3: Run test to verify it fails**

Run: `npm test -- tests/detect.test.js`
Expected: FAIL

**Step 4: Implement detect.js**

```javascript
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const LARAVEL_PACKAGES = {
  'filament/filament': 'filament',
  'henryavila/email-tracking': 'email-tracking',
  'mongodb/laravel-mongodb': 'mongodb',
};

export function detectStack(projectDir) {
  // Check Laravel first (higher priority for full-stack projects)
  const composerPath = join(projectDir, 'composer.json');
  if (existsSync(composerPath)) {
    const composer = JSON.parse(readFileSync(composerPath, 'utf8'));
    const deps = { ...composer.require, ...composer['require-dev'] };
    if (deps['laravel/framework']) return 'laravel';
  }

  // Check React
  const packagePath = join(projectDir, 'package.json');
  if (existsSync(packagePath)) {
    const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps['react']) return 'react';
  }

  return null;
}

export function detectPackages(projectDir, stack) {
  if (stack === 'laravel') {
    return detectLaravelPackages(projectDir);
  }
  return [];
}

function detectLaravelPackages(projectDir) {
  const composerPath = join(projectDir, 'composer.json');
  if (!existsSync(composerPath)) return [];

  const composer = JSON.parse(readFileSync(composerPath, 'utf8'));
  const deps = { ...composer.require, ...composer['require-dev'] };
  const detected = [];

  for (const [pkg, name] of Object.entries(LARAVEL_PACKAGES)) {
    if (deps[pkg]) detected.push(name);
  }

  return detected;
}
```

**Step 5: Run tests**

Run: `npm test`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add src/detect.js tests/detect.test.js tests/fixtures/
git commit -m "feat: stack and package detection (Laravel, React)"
```

---

## Task 4: Settings Merge

**Files:**
- Create: `src/settings.js`
- Create: `tests/settings.test.js`
- Create: `stacks/laravel/settings.json`

**Step 1: Create Laravel settings template**

`stacks/laravel/settings.json`:
```json
{
  "deny": [
    "Bash(php artisan migrate:fresh*)",
    "Bash(php artisan migrate:reset*)",
    "Bash(php artisan migrate:refresh*)",
    "Bash(php artisan db:wipe*)"
  ]
}
```

**Step 2: Write failing tests**

```javascript
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
```

**Step 3: Run test to verify it fails**

Run: `npm test -- tests/settings.test.js`
Expected: FAIL

**Step 4: Implement settings.js**

```javascript
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function mergeSettings(projectDir, stackSettings) {
  const claudeDir = join(projectDir, '.claude');
  mkdirSync(claudeDir, { recursive: true });

  const settingsPath = join(claudeDir, 'settings.json');
  let settings = {};

  if (existsSync(settingsPath)) {
    settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
  }

  // Ensure permissions structure
  if (!settings.permissions) settings.permissions = {};
  if (!settings.permissions.deny) settings.permissions.deny = [];
  if (!settings.permissions.allow) settings.permissions.allow = [];

  // Merge deny rules (no duplicates)
  for (const rule of (stackSettings.deny || [])) {
    if (!settings.permissions.deny.includes(rule)) {
      settings.permissions.deny.push(rule);
    }
  }

  // Merge allow rules (no duplicates)
  for (const rule of (stackSettings.allow || [])) {
    if (!settings.permissions.allow.includes(rule)) {
      settings.permissions.allow.push(rule);
    }
  }

  // Enable MCP auto-discovery
  if (settings.enableAllProjectMcpServers === undefined) {
    settings.enableAllProjectMcpServers = true;
  }

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
}

export function generateLocalSettings(projectDir) {
  const claudeDir = join(projectDir, '.claude');
  mkdirSync(claudeDir, { recursive: true });

  const localPath = join(claudeDir, 'settings.local.json');
  let settings = {};

  if (existsSync(localPath)) {
    settings = JSON.parse(readFileSync(localPath, 'utf8'));
  }

  // Set autoMemoryDirectory with absolute path
  settings.autoMemoryDirectory = join(projectDir, '.ai', 'memory');

  writeFileSync(localPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
}
```

**Step 5: Run tests**

Run: `npm test`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add src/settings.js tests/settings.test.js stacks/laravel/settings.json
git commit -m "feat: settings merge and local settings generation"
```

---

## Task 5: Rules Content — Extract from Arch

> **IMPORTANT:** This task MUST run BEFORE Task 6 (rule installation engine), because Task 6 tests depend on the source files existing in `stacks/`.

**Files:**
- Create: `stacks/laravel/core/testing.md`
- Create: `stacks/laravel/core/services.md`
- Create: `stacks/laravel/core/database.md`
- Create: `stacks/laravel/core/code-quality.md`
- Create: `stacks/laravel/packages/filament-v4.md`
- Create: `stacks/laravel/packages/email-tracking.md`
- Create: `stacks/laravel/packages/mongodb.md`

**Context:** Each rule must be extracted from `~/arch/.claude/rules/` and adapted:
- Remove project-specific content (CRCMG, GLPI, SBP, SPR, area-based permissions)
- Remove custom base class references (AbstractResource, etc.) — mark as "extend base classes per project convention"
- Keep generic patterns that apply to any Laravel project
- Keep `paths:` frontmatter for path-scoped loading

**Step 1: Create core rules**

Extract from Arch rules, removing project-specific content. The exact content should be adapted by reading each Arch rule and keeping only the generic, reusable parts:

**`stacks/laravel/core/testing.md`** — From `~/arch/.claude/rules/testing.md`:
- KEEP: Pest syntax, closure format, expect chaining
- KEEP: Browser test selectors, `User::factory()->active()`
- KEEP: Parallelization helpers (`function_exists` wrapper, `LazilyRefreshDatabase`)
- KEEP: Factory best practices (business fields, not calculated)
- REMOVE: PermissionSeeder auto-run (project-specific)
- REMOVE: MongoDB `@group mongodb` (move to mongodb.md)
- REMOVE: Sampling methodology reference (project-specific doc path)

**`stacks/laravel/core/services.md`** — From `~/arch/.claude/rules/services.md`:
- KEEP: Almost everything (95% reusable)
- KEEP: SRP, when to create service, naming convention, value objects, anti-patterns

**`stacks/laravel/core/database.md`** — From `~/arch/.claude/rules/database.md`:
- KEEP: `getTable()` in raw queries
- KEEP: Migrations safety (which commands are OK vs blocked)
- REMOVE: External models section (GLPI, SBP, SPR)
- REMOVE: `database/views/external_dbs/` references
- REMOVE: `INFORMATION_SCHEMA.COLUMNS` discovery

**`stacks/laravel/core/code-quality.md`** — NEW, extract from `~/arch/CLAUDE.md` universal rules:
- `declare(strict_types=1)` in every PHP file
- `sprintf()` for concatenation, not `.` operator
- Null checks: `$model === null`, never `! $model`
- `$request->validated()`, never `$request->all()`
- Comments explain WHY, not WHAT
- Policies co-located: `App\Models\{Domain}\Policies\`

**`stacks/laravel/packages/filament-v4.md`** — From `~/arch/.claude/rules/filament.md`:
- KEEP: Namespace v3 → v4 table, three namespaces, verification grep
- KEEP: Type signatures (fatal errors), API differences
- KEEP: Schema delegation pattern, view pages thresholds
- KEEP: Rich text migration, RelationManagers, modals, inline actions, DI warning
- REMOVE: Custom base classes (`AbstractResource`, etc.) — replace with "extend your project's base classes"
- REMOVE: `FilamentConfigurator` defaults (project-specific)
- REMOVE: MongoDB + Filament section (move to mongodb.md)

**`stacks/laravel/packages/email-tracking.md`** — From `~/arch/.claude/rules/email-tracking.md`:
- KEEP: Structure and pattern
- ADAPT: Class names to use generic package namespace instead of `App\Mail\TrackableMail`
- KEEP: EmailType enum, filtering pattern, anti-patterns

**`stacks/laravel/packages/mongodb.md`** — NEW, create from scratch:
- MongoDB with Laravel (laravel-mongodb package)
- Model extends `MongoDB\Laravel\Eloquent\Model`
- ObjectId handling (`(string)` cast)
- Embedded documents null-checking
- Testing: separate test group, not parallelizable
- Filament integration quirks (Select with ObjectIds, embedded docs)

**Step 2: Create all rule files**

Write each file with appropriate `paths:` frontmatter and adapted content.

**Step 3: Commit**

```bash
git add stacks/
git commit -m "feat: Laravel rules content (core + packages, extracted from Arch)"
```

---

## Task 6: Rule Installation Engine

**Files:**
- Create: `src/rules.js`
- Create: `tests/rules.test.js`

**Step 1: Write failing tests**

```javascript
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { installRules } from '../src/rules.js';

describe('installRules', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'cs-rules-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('copies core rules to .claude/rules/claude-stack/', () => {
    const result = installRules(tmpDir, 'laravel', []);
    const rulesDir = join(tmpDir, '.claude', 'rules', 'claude-stack');

    // Core rules should exist
    assert.ok(existsSync(join(rulesDir, 'testing.md')));
    assert.ok(existsSync(join(rulesDir, 'services.md')));
    assert.ok(existsSync(join(rulesDir, 'database.md')));
    assert.ok(existsSync(join(rulesDir, 'code-quality.md')));
    assert.ok(result.files.length >= 4);
  });

  it('copies package rules when packages detected', () => {
    const result = installRules(tmpDir, 'laravel', ['filament']);
    const rulesDir = join(tmpDir, '.claude', 'rules', 'claude-stack');

    assert.ok(existsSync(join(rulesDir, 'filament-v4.md')));
  });

  it('does not copy package rules when not detected', () => {
    installRules(tmpDir, 'laravel', []);
    const rulesDir = join(tmpDir, '.claude', 'rules', 'claude-stack');

    assert.ok(!existsSync(join(rulesDir, 'filament-v4.md')));
    assert.ok(!existsSync(join(rulesDir, 'email-tracking.md')));
    assert.ok(!existsSync(join(rulesDir, 'mongodb.md')));
  });

  it('returns installed files with hashes', () => {
    const result = installRules(tmpDir, 'laravel', ['filament']);
    assert.ok(result.files.length > 0);
    for (const f of result.files) {
      assert.ok(f.path);
      assert.ok(f.hash);
      assert.equal(f.hash.length, 64);
    }
  });

  it('does nothing when stack is null', () => {
    const result = installRules(tmpDir, null, []);
    assert.equal(result.files.length, 0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/rules.test.js`
Expected: FAIL

**Step 3: Implement rules.js**

```javascript
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashContent } from './hash.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const PACKAGE_ROOT = join(__dirname, '..');
// Use forward slashes consistently (not path.join) for manifest keys
const RULES_DEST = '.claude/rules/claude-stack';

const STACK_RULES = {
  laravel: {
    core: ['testing.md', 'services.md', 'database.md', 'code-quality.md'],
    packages: {
      filament: 'filament-v4.md',
      'email-tracking': 'email-tracking.md',
      mongodb: 'mongodb.md',
    },
  },
};

export function getStackConfig(stack) {
  return STACK_RULES[stack] || null;
}

export function installRules(projectDir, stack, detectedPackages) {
  if (!stack || !STACK_RULES[stack]) return { files: [] };

  const config = STACK_RULES[stack];
  const destDir = join(projectDir, RULES_DEST);
  mkdirSync(destDir, { recursive: true });

  const installedFiles = [];

  // Install core rules
  for (const file of config.core) {
    const sourcePath = join(PACKAGE_ROOT, 'stacks', stack, 'core', file);
    if (!existsSync(sourcePath)) continue;

    const content = readFileSync(sourcePath, 'utf8');
    const destPath = join(destDir, file);
    writeFileSync(destPath, content, 'utf8');

    installedFiles.push({
      path: `${RULES_DEST}/${file}`,
      hash: hashContent(content),
      source: `${stack}/core/${file}`,
    });
  }

  // Install package-specific rules
  for (const pkg of detectedPackages) {
    const ruleFile = config.packages[pkg];
    if (!ruleFile) continue;

    const sourcePath = join(PACKAGE_ROOT, 'stacks', stack, 'packages', ruleFile);
    if (!existsSync(sourcePath)) continue;

    const content = readFileSync(sourcePath, 'utf8');
    const destPath = join(destDir, ruleFile);
    writeFileSync(destPath, content, 'utf8');

    installedFiles.push({
      path: `${RULES_DEST}/${ruleFile}`,
      hash: hashContent(content),
      source: `${stack}/packages/${ruleFile}`,
    });
  }

  return { files: installedFiles };
}
```

**Step 4: Run tests**

Run: `npm test`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/rules.js tests/rules.test.js
git commit -m "feat: rule installation to .claude/rules/claude-stack/"
```

---

## Task 7: Prompts for CLAUDE.md

**Files:**
- Create: `prompts/generate-claude-md.md`
- Create: `prompts/analyze-claude-md.md`

**Step 1: Create generation prompt**

`prompts/generate-claude-md.md` — Prompt for AI to generate a CLAUDE.md from scratch. Must instruct the AI to:
- Analyze composer.json/package.json, directory structure, routes, models, tests
- Read `.claude/rules/` already installed (to avoid duplication)
- Generate max ~100 lines of project-specific content
- Follow hub pattern: metadata → commands → universal rules → context routing table
- Constraints: if AI can infer from code → don't include
- Reference the Arch CLAUDE.md as structural example (58 lines, hub pattern)

**Step 2: Create analysis prompt**

`prompts/analyze-claude-md.md` — Prompt for AI to review existing CLAUDE.md. Must:
- Check total size (< 200 lines recommended, cite Anthropic docs)
- Identify content that should be path-scoped rules instead of inline
- Find duplication with `.claude/rules/claude-stack/` rules
- Check structure (does it follow hub pattern?)
- Identify content AI can infer from code (remove candidates)
- Produce actionable suggestions, not auto-modify

**Step 3: Commit**

```bash
git add prompts/
git commit -m "feat: CLAUDE.md generation and analysis prompts"
```

---

## Task 8: Recommendations System

**Files:**
- Create: `src/recommend.js`
- Create: `tests/recommend.test.js`

**Step 1: Write failing tests**

```javascript
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
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/recommend.test.js`
Expected: FAIL

**Step 3: Implement recommend.js**

```javascript
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const RECOMMENDATIONS = [
  // Universal MCPs
  {
    id: 'context7',
    name: 'Context7',
    description: 'Contextual documentation for libraries (any project)',
    type: 'mcp',
    stacks: null, // all stacks
    detectInstalled: (dir) => false, // TODO: check settings.json for context7 MCP
    installCmd: null, // MCP install varies by setup
  },
  // Stack-specific MCPs
  {
    id: 'laravel-boost',
    name: 'Laravel Boost',
    description: 'Schema, tinker, docs for Laravel',
    type: 'mcp',
    stacks: ['laravel'],
    detectInstalled: (dir) => false, // TODO: check settings.json
    installCmd: null,
  },
  // Tools
  {
    id: 'atomic-skills',
    name: 'Atomic Skills',
    description: 'Productivity skills (as-fix, as-hunt, as-prompt, etc.)',
    type: 'tool',
    stacks: null,
    detectInstalled: (dir) => existsSync(join(dir, '.atomic-skills', 'manifest.json')),
    installCmd: 'npx @henryavila/atomic-skills install',
  },
  {
    id: 'bmad-method',
    name: 'BMAD Method',
    description: 'Brainstorming, requirements elicitation, specialized agents',
    type: 'tool',
    stacks: null,
    detectInstalled: (dir) => existsSync(join(dir, '_bmad')),
    installCmd: 'npx bmad-method install',
  },
  {
    id: 'bmad-doc-architect',
    name: 'BMAD Doc Architect',
    description: 'Verified module documentation (includes BMAD Method)',
    type: 'tool',
    stacks: null,
    detectInstalled: (dir) => existsSync(join(dir, '_bmad', 'bmad-doc-architect', 'config.yaml')),
    installCmd: null, // Requires clone + custom install
  },
];

export function detectRecommendations(projectDir, stack) {
  return RECOMMENDATIONS
    .filter(rec => rec.stacks === null || rec.stacks.includes(stack))
    .map(rec => ({
      id: rec.id,
      name: rec.name,
      description: rec.description,
      type: rec.type,
      installed: rec.detectInstalled(projectDir),
      installCmd: rec.installCmd,
    }));
}
```

**Step 4: Run tests**

Run: `npm test`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/recommend.js tests/recommend.test.js
git commit -m "feat: recommendation detection system (MCPs + tools)"
```

---

## Task 9: Init Command — Orchestration

**Files:**
- Create: `src/init.js`
- Create: `tests/init.test.js`

**Step 1: Write failing integration test**

```javascript
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { initNonInteractive } from '../src/init.js';

describe('initNonInteractive', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'cs-init-'));
    // Create a Laravel project fixture
    writeFileSync(join(tmpDir, 'composer.json'), JSON.stringify({
      require: { 'laravel/framework': '^12.0', 'filament/filament': '^4.0' }
    }));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('detects stack and installs core rules', () => {
    const result = initNonInteractive(tmpDir);

    assert.equal(result.stack, 'laravel');
    assert.ok(result.rules.length > 0);
    assert.ok(existsSync(join(tmpDir, '.claude', 'rules', 'claude-stack', 'testing.md')));
    assert.ok(existsSync(join(tmpDir, '.claude', 'rules', 'claude-stack', 'services.md')));
  });

  it('installs package-specific rules', () => {
    const result = initNonInteractive(tmpDir);

    assert.ok(result.packages.includes('filament'));
    assert.ok(existsSync(join(tmpDir, '.claude', 'rules', 'claude-stack', 'filament-v4.md')));
  });

  it('creates settings.json with deny rules', () => {
    initNonInteractive(tmpDir);

    const settings = JSON.parse(readFileSync(join(tmpDir, '.claude', 'settings.json'), 'utf8'));
    assert.ok(settings.permissions.deny.length > 0);
    assert.ok(settings.permissions.deny.some(d => d.includes('migrate:fresh')));
  });

  it('creates settings.local.json with autoMemoryDirectory', () => {
    initNonInteractive(tmpDir);

    const local = JSON.parse(readFileSync(join(tmpDir, '.claude', 'settings.local.json'), 'utf8'));
    assert.ok(local.autoMemoryDirectory.endsWith('.ai/memory'));
  });

  it('writes manifest', () => {
    initNonInteractive(tmpDir);

    assert.ok(existsSync(join(tmpDir, '.claude-stack', 'manifest.json')));
  });

  it('detects CLAUDE.md status', () => {
    const result = initNonInteractive(tmpDir);
    assert.equal(result.claudeMdExists, false);
  });

  it('detects existing CLAUDE.md', () => {
    writeFileSync(join(tmpDir, 'CLAUDE.md'), '# My Project');
    const result = initNonInteractive(tmpDir);
    assert.equal(result.claudeMdExists, true);
  });

  it('returns alreadyInstalled when manifest exists', () => {
    // First init
    initNonInteractive(tmpDir);
    // Second init — should detect existing installation
    const result = initNonInteractive(tmpDir);
    assert.equal(result.alreadyInstalled, true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/init.test.js`
Expected: FAIL

**Step 3: Implement init.js**

```javascript
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
```

**Step 4: Run tests**

Run: `npm test`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/init.js tests/init.test.js
git commit -m "feat: init command with orchestration (detect, rules, settings, manifest)"
```

---

## Task 10: Update Command with 3-Hash Conflict Handling

**Files:**
- Create: `src/update.js`
- Create: `tests/update.test.js`

**Step 1: Write failing tests**

```javascript
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { updateNonInteractive } from '../src/update.js';
import { hashContent } from '../src/hash.js';
import { writeManifest } from '../src/manifest.js';

describe('updateNonInteractive', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'cs-update-'));
    writeFileSync(join(tmpDir, 'composer.json'), JSON.stringify({
      require: { 'laravel/framework': '^12.0' }
    }));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('overwrites silently when only package changed', () => {
    // Simulate: file on disk = installed version, package has new version
    const oldContent = '# Old testing rules';
    const rulesDir = join(tmpDir, '.claude', 'rules', 'claude-stack');
    mkdirSync(rulesDir, { recursive: true });
    writeFileSync(join(rulesDir, 'testing.md'), oldContent);

    writeManifest(tmpDir, {
      version: '0.1.0',
      stack: 'laravel',
      packages: [],
      files: {
        '.claude/rules/claude-stack/testing.md': {
          installed_hash: hashContent(oldContent),
          source: 'laravel/core/testing.md',
        }
      }
    });

    const result = updateNonInteractive(tmpDir);
    const newContent = readFileSync(join(rulesDir, 'testing.md'), 'utf8');

    // Package content should have replaced old content
    assert.notEqual(newContent, oldContent);
    assert.ok(result.updated.length > 0 || result.added.length > 0);
  });

  it('keeps local edits when package unchanged', () => {
    // Simulate: user edited file, package has same version as installed
    const originalContent = readFileSync(
      join(process.cwd(), 'stacks', 'laravel', 'core', 'testing.md'), 'utf8'
    );
    const userEdited = originalContent + '\n# My custom addition';

    const rulesDir = join(tmpDir, '.claude', 'rules', 'claude-stack');
    mkdirSync(rulesDir, { recursive: true });
    writeFileSync(join(rulesDir, 'testing.md'), userEdited);

    writeManifest(tmpDir, {
      version: '0.1.0',
      stack: 'laravel',
      packages: [],
      files: {
        '.claude/rules/claude-stack/testing.md': {
          installed_hash: hashContent(originalContent),
          source: 'laravel/core/testing.md',
        }
      }
    });

    const result = updateNonInteractive(tmpDir);
    const afterUpdate = readFileSync(join(rulesDir, 'testing.md'), 'utf8');

    // User edit should be preserved
    assert.ok(afterUpdate.includes('# My custom addition'));
    assert.ok(result.kept.includes('.claude/rules/claude-stack/testing.md'));
  });

  it('skips unchanged files', () => {
    // Both local and package are same as installed
    const content = readFileSync(
      join(process.cwd(), 'stacks', 'laravel', 'core', 'testing.md'), 'utf8'
    );

    const rulesDir = join(tmpDir, '.claude', 'rules', 'claude-stack');
    mkdirSync(rulesDir, { recursive: true });
    writeFileSync(join(rulesDir, 'testing.md'), content);

    writeManifest(tmpDir, {
      version: '0.1.0',
      stack: 'laravel',
      packages: [],
      files: {
        '.claude/rules/claude-stack/testing.md': {
          installed_hash: hashContent(content),
          source: 'laravel/core/testing.md',
        }
      }
    });

    const result = updateNonInteractive(tmpDir);
    assert.ok(result.skipped.includes('.claude/rules/claude-stack/testing.md'));
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/update.test.js`
Expected: FAIL

**Step 3: Implement update.js**

```javascript
import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync, readdirSync, rmdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { detectStack, detectPackages } from './detect.js';
import { readManifest, writeManifest } from './manifest.js';
import { hashContent } from './hash.js';
import { getStackConfig, PACKAGE_ROOT } from './rules.js';

/**
 * Build map of what the package wants to install now, WITHOUT writing.
 * Reads source files from the package directly.
 */
const RULES_DEST = '.claude/rules/claude-stack';

function buildNewFilesMap(stack, packages) {
  const newFiles = new Map();
  const config = getStackConfig(stack);
  if (!config) return newFiles;

  for (const file of config.core) {
    const sourcePath = join(PACKAGE_ROOT, 'stacks', stack, 'core', file);
    if (existsSync(sourcePath)) {
      newFiles.set(`${RULES_DEST}/${file}`, readFileSync(sourcePath, 'utf8'));
    }
  }
  for (const pkg of packages) {
    const ruleFile = config.packages[pkg];
    if (!ruleFile) continue;
    const sourcePath = join(PACKAGE_ROOT, 'stacks', stack, 'packages', ruleFile);
    if (existsSync(sourcePath)) {
      newFiles.set(`${RULES_DEST}/${ruleFile}`, readFileSync(sourcePath, 'utf8'));
    }
  }
  return newFiles;
}

/**
 * Non-interactive update — 3-hash conflict resolution.
 */
export function updateNonInteractive(projectDir) {
  const manifest = readManifest(projectDir);
  if (!manifest) {
    throw new Error('No manifest found. Run `claude-stack init` first.');
  }

  const stack = detectStack(projectDir);
  const packages = stack ? detectPackages(projectDir, stack) : [];
  const newFiles = buildNewFilesMap(stack, packages);
  const result = { updated: [], kept: [], skipped: [], added: [], conflicts: [], removed: [] };

  // 3-hash comparison for existing manifest files
  for (const [filePath, entry] of Object.entries(manifest.files)) {
    const absPath = join(projectDir, filePath);
    const newContent = newFiles.get(filePath);

    if (!newContent) {
      // File no longer in package — orphan, remove
      if (existsSync(absPath)) {
        unlinkSync(absPath);
        try {
          const dir = dirname(absPath);
          if (readdirSync(dir).length === 0) rmdirSync(dir);
        } catch {}
      }
      result.removed.push(filePath);
      continue;
    }

    if (!existsSync(absPath)) {
      // File deleted locally — reinstall from package
      mkdirSync(dirname(absPath), { recursive: true });
      writeFileSync(absPath, newContent, 'utf8');
      result.added.push(filePath);
      newFiles.delete(filePath);
      continue;
    }

    const installedHash = entry.installed_hash;
    const currentHash = hashContent(readFileSync(absPath, 'utf8'));
    const newHash = hashContent(newContent);

    const localUnchanged = currentHash === installedHash;
    const packageUnchanged = installedHash === newHash;

    if (localUnchanged && packageUnchanged) {
      result.skipped.push(filePath);
    } else if (localUnchanged && !packageUnchanged) {
      writeFileSync(absPath, newContent, 'utf8');
      result.updated.push(filePath);
    } else if (!localUnchanged && packageUnchanged) {
      result.kept.push(filePath);
    } else {
      // Both changed — conflict (interactive mode would prompt user)
      result.conflicts.push(filePath);
    }

    newFiles.delete(filePath);
  }

  // New files not in old manifest
  for (const [filePath, content] of newFiles) {
    const absPath = join(projectDir, filePath);
    mkdirSync(dirname(absPath), { recursive: true });
    writeFileSync(absPath, content, 'utf8');
    result.added.push(filePath);
  }

  // Rebuild manifest — preserve old hashes for unresolved conflicts
  rebuildManifest(projectDir, stack, packages, manifest, result.conflicts);

  return result;
}

function rebuildManifest(projectDir, stack, packages, oldManifest, conflicts = []) {
  const rulesDir = join(projectDir, '.claude', 'rules', 'claude-stack');
  const filesMap = {};

  if (existsSync(rulesDir)) {
    for (const file of readdirSync(rulesDir)) {
      const filePath = `${RULES_DEST}/${file}`;
      // For unresolved conflicts, preserve old installed_hash so conflict
      // is re-detected on next update
      if (conflicts.includes(filePath) && oldManifest?.files?.[filePath]) {
        filesMap[filePath] = oldManifest.files[filePath];
      } else {
        const content = readFileSync(join(rulesDir, file), 'utf8');
        filesMap[filePath] = {
          installed_hash: hashContent(content),
          source: `${stack}/${file}`,
        };
      }
    }
  }

  const pkg = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf8'));
  writeManifest(projectDir, {
    version: pkg.version,
    stack,
    packages,
    files: filesMap,
  });
}

/**
 * Interactive update.
 */
export async function update(projectDir) {
  console.log('\n  📦 Claude Stack — Updating rules...\n');

  try {
    const result = updateNonInteractive(projectDir);

    for (const f of result.updated) console.log(`  ↑ ${f} (updated)`);
    for (const f of result.added) console.log(`  + ${f} (added)`);
    for (const f of result.kept) console.log(`  ≡ ${f} (local edits kept)`);
    for (const f of result.skipped) console.log(`  · ${f} (unchanged)`);
    for (const f of result.removed) console.log(`  ✗ ${f} (removed)`);
    for (const f of result.conflicts) console.log(`  ⚠ ${f} (CONFLICT — both changed)`);

    console.log(`\n  Done. ${result.updated.length} updated, ${result.added.length} added, ${result.kept.length} kept, ${result.removed.length} removed.\n`);
  } catch (e) {
    console.error(`  Error: ${e.message}\n`);
  }
}
```

**Note:** `update.js` imports `getStackConfig` and `PACKAGE_ROOT` from `rules.js` (Task 6) to avoid duplicating the stack config.

**Step 4: Run tests**

Run: `npm test`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/update.js tests/update.test.js
git commit -m "feat: update command with 3-hash conflict handling"
```

---

## Task 11: End-to-End CLI Test

**Files:**
- Create: `tests/cli.test.js`

**Step 1: Write E2E test**

```javascript
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const CLI = join(process.cwd(), 'bin', 'cli.js');

describe('CLI e2e', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'cs-e2e-'));
    writeFileSync(join(tmpDir, 'composer.json'), JSON.stringify({
      require: { 'laravel/framework': '^12.0' }
    }));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('shows help with no command', () => {
    const output = execSync(`node ${CLI}`, { encoding: 'utf8' });
    assert.ok(output.includes('Claude Stack'));
    assert.ok(output.includes('init'));
    assert.ok(output.includes('update'));
  });

  it('init creates expected structure', () => {
    execSync(`node ${CLI} init`, { cwd: tmpDir, encoding: 'utf8' });

    assert.ok(existsSync(join(tmpDir, '.claude', 'rules', 'claude-stack', 'testing.md')));
    assert.ok(existsSync(join(tmpDir, '.claude', 'settings.json')));
    assert.ok(existsSync(join(tmpDir, '.claude', 'settings.local.json')));
    assert.ok(existsSync(join(tmpDir, '.claude-stack', 'manifest.json')));

    const settings = JSON.parse(readFileSync(join(tmpDir, '.claude', 'settings.json'), 'utf8'));
    assert.ok(settings.permissions.deny.some(d => d.includes('migrate:fresh')));
  });
});
```

**Step 2: Run tests**

Run: `npm test`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add tests/cli.test.js
git commit -m "test: end-to-end CLI integration test"
```

---

## Task 12: Final Polish

**Files:**
- Modify: `CLAUDE.md`
- Modify: `bin/cli.js` — add `chmod +x`

**Step 1: Make CLI executable**

Run: `chmod +x bin/cli.js`

**Step 2: Update CLAUDE.md with actual commands**

Update `CLAUDE.md` to reflect the implemented commands and structure.

**Step 3: Run full test suite**

Run: `npm test`
Expected: ALL PASS

**Step 4: Commit**

```bash
git add bin/cli.js CLAUDE.md
git commit -m "chore: final polish — executable CLI, updated CLAUDE.md"
```

---

## Execution Notes

### Task Dependencies
```
Task 1 (scaffold) → Task 2 (hash+manifest) → Task 3 (detect) → Task 4 (settings)
     ↓
Task 5 (rules CONTENT) → Task 6 (rules ENGINE + tests) → Task 7 (prompts)
                                                              ↓
Task 8 (recommend) → Task 9 (init) → Task 10 (update) → Task 11 (e2e) → Task 12 (polish)
```

**IMPORTANT:** Task 5 (content files) MUST precede Task 6 (engine + tests). Tests in Task 6 assert on source files from `stacks/laravel/` that are created in Task 5.

### Parallel Opportunities
- Task 7 (prompts) and Task 8 (recommend) can run in parallel after Task 6
- Tasks 1-4 are sequential (each builds on the previous)

### Key Decisions During Implementation
- Rules content (Task 5) requires careful extraction — this is the most subjective task
- Prompts (Task 7) need to be well-crafted — test by actually running them on a sample project
- The recommendation install flow (Task 8) is currently detect-only — interactive install can be added later
- `rules.js` exports `getStackConfig` and `PACKAGE_ROOT` — shared with `update.js` to avoid DRY violation
