# Claude Stack

Structured Claude Code setup for any project, with optional stack modules.

Today:

- every project gets the universal `core`
- Laravel is the only supported stack module

## What `init` installs

For any project, `claude-stack init` sets up the base Claude structure:

- `.claude/settings.json`
- `.claude/settings.local.json`
- `.claude-stack/manifest.json`
- `.ai/memory/`

If the project matches a supported stack module, Claude Stack also applies stack-specific rules and settings.

Current support matrix:

- `laravel`: supported
- anything else: core only

## Commands

```bash
npx @henryavila/claude-stack init
npx @henryavila/claude-stack update
npx @henryavila/claude-stack status
npx @henryavila/claude-stack uninstall
npm test
```

## How It Works

### Core

The core layer is universal. It prepares the project for Claude Code without assuming a framework-specific module is available.

Core responsibilities:

- create and merge Claude settings safely
- create local memory configuration
- track installed files in a manifest
- recommend MCPs, plugins, and helper tools

### Stack modules

Stack modules are optional overlays.

When a supported stack is detected, Claude Stack can:

- install path-scoped rules
- merge stack-specific safety settings
- detect supported package add-ons for that stack

Today the only built-in module is Laravel, located under `stacks/laravel/`.

## Update model

`update` uses a manifest with installed hashes to handle:

- unchanged files
- package updates
- local edits
- deleted files
- orphaned files
- conflicts where both local and package content changed

This keeps local customizations intact unless the user explicitly overwrites them.

## Uninstall behavior

`uninstall` removes what Claude Stack installed while preserving project-owned content such as:

- `CLAUDE.md`
- `guidelines.md`
- `.ai/memory/`

## Development

Run the full suite with:

```bash
npm test
```

The project uses Node's built-in test runner and keeps most logic in small modules under `src/`.
