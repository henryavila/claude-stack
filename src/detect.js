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
    try {
      const composer = JSON.parse(readFileSync(composerPath, 'utf8'));
      const deps = { ...composer.require, ...composer['require-dev'] };
      if (deps['laravel/framework']) return 'laravel';
    } catch {
      console.warn('Warning: could not parse composer.json — skipping');
    }
  }

  const packagePath = join(projectDir, 'package.json');
  if (existsSync(packagePath)) {
    try {
      const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps['react']) return 'react';
    } catch {
      console.warn('Warning: could not parse package.json — skipping');
    }
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

  try {
    const composer = JSON.parse(readFileSync(composerPath, 'utf8'));
    const deps = { ...composer.require, ...composer['require-dev'] };
    const detected = [];

    for (const [pkg, name] of Object.entries(LARAVEL_PACKAGES)) {
      if (deps[pkg]) detected.push(name);
    }

    return detected;
  } catch {
    console.warn('Warning: could not parse composer.json — skipping package detection');
    return [];
  }
}
