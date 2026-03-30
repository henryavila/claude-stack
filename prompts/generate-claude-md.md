# Prompt: Generate CLAUDE.md for This Project

You are generating a CLAUDE.md file for this project. CLAUDE.md is the primary instruction file that Claude Code reads at conversation start. It must be concise, high-signal, and avoid redundancy with other instruction sources.

## Key Constraint: Size Budget

Anthropic's documentation recommends CLAUDE.md under 200 lines. Beyond 200 lines, approximately 30% of directives are ignored or deprioritized by the model. Your target is ~100 lines of project-specific content. Every line must earn its place.

## Core Principle: Do Not Teach What AI Can Infer

If Claude can determine something by reading the code, it does NOT belong in CLAUDE.md. Examples of what to exclude:

- Framework conventions Claude already knows (e.g., "controllers go in app/Http/Controllers")
- Standard language idioms (e.g., "use async/await in Node.js")
- Information discoverable from package.json or composer.json (e.g., dependency list)
- File structure that follows framework defaults
- Standard testing patterns for the framework

Include ONLY: project-specific deviations, non-obvious conventions, critical safety rules, and commands that save time.

## Step 1: Analyze the Project

Read and analyze the following sources. Do not skip any.

**Package manifests:**
- `composer.json` (if exists) — framework, PHP version, key packages
- `package.json` (if exists) — framework, Node version, key packages

**Directory structure:**
- Run `ls` on the project root and key directories
- Identify non-standard directory structures or naming conventions
- Note any domain-driven or modular organization patterns

**Routes and entry points:**
- `routes/` directory (Laravel) or router configuration (React/Next.js)
- Identify route patterns, API versioning, or unusual routing conventions

**Models and data layer:**
- Identify the ORM, database type, any multi-database setup
- Note model organization patterns (flat vs. domain-grouped)

**Tests:**
- Identify test framework, test organization, and how to run them
- Note any special test setup (separate databases, Docker dependencies)

**CI/CD and tooling:**
- Look for `.github/workflows/`, `Makefile`, build scripts
- Identify linting, formatting, and static analysis tools

## Step 2: Read Installed Rules (Critical — Avoid Duplication)

Read all files in `.claude/rules/` (including subdirectories like `.claude/rules/agent-standards/`).

These rules are loaded conditionally by Claude Code based on file path context. The CLAUDE.md you generate must NOT duplicate any content from these rules. Instead, CLAUDE.md should reference them via a routing table (see structure below).

List every rule file you find and note its scope. You will reference these in the routing table.

## Step 3: Generate CLAUDE.md

Follow this exact structure (the "hub pattern"):

```markdown
# {Project Name} — AI Instructions

{One-line description. Framework, key tech, database, notable constraints. Max 2 lines.}

## Commands

\```bash
{test command}        # {description — ALWAYS include the primary test command}
{other commands}      # {lint, format, build — only non-obvious ones}
\```

## Universal Rules

{Bulleted list of project-wide rules that apply everywhere. These are:}
{- Safety rules (dangerous operations to never run)}
{- Project-specific conventions that deviate from framework defaults}
{- Code style rules not enforced by linters}
{- Domain-specific terminology or patterns}
{Max 10 items. If it only applies to certain files, it belongs in a path-scoped rule, not here.}

## {Optional: Tool/MCP Section}

{Only if the project uses MCPs or tools that Claude should invoke before coding.}
{Example: "Run `search-docs` before making changes" or "Use `database-schema` before migrations"}

## Project Structure

{Only if the project has a NON-OBVIOUS structure.}
{Show the pattern once with placeholders, not a full directory tree.}
{If the project follows standard framework structure, OMIT this section entirely.}

## Rules by Context (loaded on demand)

| Rule | When |
|------|------|
| `.claude/rules/...` | {brief description of when it activates} |
{List every rule file from .claude/rules/ with its activation context}
```

## Quality Checklist

Before outputting the final CLAUDE.md, verify:

- [ ] Total line count is under 120 lines (hard target ~100)
- [ ] No content duplicates what is in `.claude/rules/` files
- [ ] No content that Claude can infer from reading the codebase
- [ ] Commands section includes the primary test command
- [ ] Universal rules are truly universal (not path-specific)
- [ ] Every rule in the routing table corresponds to an actual file
- [ ] No framework documentation is repeated (Claude already knows Laravel/React/etc.)
- [ ] Safety-critical rules (destructive commands, production data) are present if applicable

## Output

Output ONLY the CLAUDE.md content, ready to be saved to the project root. Do not include explanations or commentary outside the file content. Do not wrap it in a code fence — output it as the raw file.
