import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const LARAVEL_PACKAGES = {
  'filament/filament': 'filament',
  'henryavila/email-tracking': 'email-tracking',
  'mongodb/laravel-mongodb': 'mongodb',
};

export function detectStack(projectDir) {
  const composerPath = join(projectDir, 'composer.json');
  if (existsSync(composerPath)) {
    const composer = JSON.parse(readFileSync(composerPath, 'utf8'));
    const deps = { ...composer.require, ...composer['require-dev'] };
    if (deps['laravel/framework']) return 'laravel';
  }

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
