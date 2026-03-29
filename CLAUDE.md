# Claude Stack

NPM package that installs a structured Claude Code setup for any project, with optional stack modules. Today the only supported stack module is Laravel.

## Commands

```bash
npx @henryavila/claude-stack init        # Detect stack, install rules + settings
npx @henryavila/claude-stack update      # Update rules with conflict handling
npx @henryavila/claude-stack status      # Show installation status
npx @henryavila/claude-stack uninstall   # Remove claude-stack from project
npm test                                 # Run tests
```

## Project Structure

```
bin/cli.js          — CLI entry point (init | update | status | uninstall)
src/
  detect.js         — Detects supported stack modules from project files
  recommend.js      — Recommends optional MCPs, plugins, and tools
  rules.js          — Copies rule .md files into .claude/rules/ with frontmatter
  settings.js       — Creates/merges .claude/settings.json and .claude/settings.local.json
  manifest.js       — Tracks installed rules with 3-hash conflict handling
  hash.js           — SHA-256 hashing for manifest conflict detection
  init.js           — Orchestrates full init flow with rollback safety
  update.js         — Updates rules with interactive conflict resolution
  prompts.js        — Inquirer prompts for recommendations and conflicts
  status.js         — Shows installation state and rule health
  uninstall.js      — Clean removal preserving CLAUDE.md and memory
stacks/
  laravel/          — First supported stack module: rules + settings
prompts/
  analyze-claude-md.md     — Prompt for analyzing existing CLAUDE.md
  generate-claude-md.md    — Prompt for generating optimized CLAUDE.md
  generate-guidelines.md   — Prompt for generating project guidelines.md
tests/              — Node.js test runner tests for all modules
```

## Design Decisions

- Core setup is universal; stack modules are optional
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
