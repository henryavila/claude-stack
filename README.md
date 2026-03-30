# Agent Standards

Operational quality standards for AI agents, with a universal core and optional stack modules.

## Brand Asset

The primary hero image should be generated from `prompts/branding/agent-standards-viz-image.md` and saved as `assets/agent-standards-hero.png`.

When the asset exists, use this snippet in the README to render it consistently on GitHub and npm:

```md
<p align="center">
  <img
    src="https://raw.githubusercontent.com/henryavila/agent-standards/main/assets/agent-standards-hero.png"
    alt="Agent Standards hero"
    width="100%"
  />
</p>
```

Today:

- every project gets the universal `core`
- Laravel is the only supported stack module

## What `init` installs

For any project, `agent-standards init` sets up the base agent structure:

- `.claude/settings.json`
- `.claude/settings.local.json`
- `.agent-standards/manifest.json`
- `.ai/memory/`

If the project matches a supported stack module, Agent Standards also applies stack-specific rules and settings.

Current support matrix:

- `laravel`: supported
- anything else: core only

## Commands

```bash
npx @henryavila/agent-standards init
npx @henryavila/agent-standards update
npx @henryavila/agent-standards status
npx @henryavila/agent-standards uninstall
npm test
```

## How It Works

### Core

The core layer is universal. It prepares the project for AI-agent workflows without assuming a framework-specific module is available.

Core responsibilities:

- create and merge Claude settings safely
- create local memory configuration
- track installed files in a manifest
- recommend MCPs, plugins, and helper tools

### Stack modules

Stack modules are optional overlays.

When a supported stack is detected, Agent Standards can:

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

`uninstall` removes what Agent Standards installed while preserving project-owned content such as:

- `CLAUDE.md`
- `guidelines.md`
- `.ai/memory/`

## Development

Run the full suite with:

```bash
npm test
```

The project uses Node's built-in test runner and keeps most logic in small modules under `src/`.
