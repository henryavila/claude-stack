# Claude Stack

NPM package that installs optimized AI rules and settings per stack (Laravel, React, etc.) for Claude Code.

## Commands

```bash
npx @henryavila/claude-stack init      # Detect stack, install rules + settings
npx @henryavila/claude-stack update    # Update rules with conflict handling
npm test                               # Run tests
```

## Project Structure

```
bin/cli.js          — CLI entry point (init | update)
src/
  detect.js         — Stack detection from project files (composer.json, package.json)
  recommend.js      — Recommends core + optional package rules for detected stack
  rules.js          — Copies rule .md files into .claude/rules/ with frontmatter
  settings.js       — Merges stack settings.json into .claude/settings.json (never replaces)
  manifest.js       — Tracks installed rules with 3-hash conflict handling
  hash.js           — SHA-256 hashing for manifest conflict detection
  init.js           — Orchestrates full init flow (detect -> recommend -> install)
  update.js         — Updates rules, handles conflicts (ours/theirs/skip)
stacks/
  laravel/          — Laravel stack: core rules, package rules, settings.json
prompts/
  analyze-claude-md.md   — Prompt for analyzing existing CLAUDE.md
  generate-claude-md.md  — Prompt for generating optimized CLAUDE.md
tests/              — Node.js test runner tests for all modules
```

## Design Decisions

- Rules use `paths:` frontmatter for conditional loading by Claude Code
- Settings.json: deep merge with existing (NEVER replace)
- Manifest uses 3-hash system (original, installed, current) for conflict detection
- CLAUDE.md generated via AI-optimized prompt (NOT static template)

## Memória

Consulte `.ai/memory/MEMORY.md` para contexto geral.
- `design.md` — design completo, decisões, estrutura, pendências
- `ecosystem.md` — mapa dos 9 repos do ecossistema

## Referências

- atomic-skills (pattern de installer): `~/packages/atomic-skills/src/`
- Projeto Arch (fonte dos rules): `~/arch/.claude/rules/`
