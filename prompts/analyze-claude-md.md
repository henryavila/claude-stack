# Prompt: Analyze and Improve Existing CLAUDE.md

You are reviewing this project's CLAUDE.md file to identify improvements. Your goal is to make CLAUDE.md more effective as an AI instruction file — concise, high-signal, and properly structured.

**Important: Do NOT modify CLAUDE.md automatically. Produce an analysis report with actionable suggestions. The developer will decide what to apply.**

## Step 1: Read All Instruction Sources

Read these files before analyzing:

1. **`CLAUDE.md`** — the file under review
2. **`.claude/rules/`** — all rule files, including subdirectories (e.g., `.claude/rules/agent-standards/`). Read every file.
3. **`.claude/settings.json`** — check for deny rules and MCP configuration
4. **Project manifests** — `composer.json` and/or `package.json` for framework and dependency context

## Step 2: Analyze and Report

Produce a report with the following sections. For every issue found, reference specific line numbers from CLAUDE.md.

### 2.1 Size Check

- Count total lines in CLAUDE.md
- **Target: under 200 lines** (Anthropic's documentation indicates that beyond 200 lines, approximately 30% of directives are deprioritized by the model). Ideal is under 120 lines.
- If over 200 lines, flag this as a critical issue
- If between 120-200 lines, flag as a warning with reduction suggestions

### 2.2 Duplication with Rules

Compare CLAUDE.md content against every file in `.claude/rules/` (including `.claude/rules/agent-standards/`).

For each duplication found, report:
- The line(s) in CLAUDE.md
- The rule file that already covers this content
- Recommendation: remove from CLAUDE.md (the rule handles it)

Rules in `.claude/rules/` are loaded conditionally by Claude Code based on file path context. Content that exists in rules does not need to be repeated in CLAUDE.md.

### 2.3 Content That Should Be Path-Scoped Rules

Identify content in CLAUDE.md that only applies to specific file types or directories. This content is better placed in `.claude/rules/` with `paths:` frontmatter for conditional loading.

For each candidate, report:
- The line(s) in CLAUDE.md
- The file paths or patterns it applies to
- Suggested rule file name and `paths:` frontmatter

Example of a path-scoped rule with frontmatter:
```yaml
---
paths:
  - "tests/**"
  - "**/*Test.php"
---
```

### 2.4 Content AI Can Infer from Code

Identify lines in CLAUDE.md that tell Claude something it can determine by reading the codebase. These are candidates for removal.

Common examples:
- Framework conventions that Claude already knows
- Directory structure that follows framework defaults
- Dependency information readable from package manifests
- Standard patterns for the detected framework/language

For each candidate, explain what makes it inferable and recommend removal.

### 2.5 Structure Assessment

Check if CLAUDE.md follows the recommended "hub pattern":

1. **Project header** — name, one-line description with key tech
2. **Commands** — primary test command, build, lint (only non-obvious ones)
3. **Universal rules** — project-wide rules that apply everywhere (max ~10)
4. **Tool/MCP section** (optional) — tools Claude should use before coding
5. **Project structure** (optional) — only if non-obvious, pattern-based not exhaustive
6. **Rules routing table** — table listing `.claude/rules/` files and when they activate

Report:
- Which sections are present vs. missing
- Whether sections are in the recommended order
- Whether the routing table exists and is complete (covers all files in `.claude/rules/`)
- Whether universal rules are truly universal or should be path-scoped

### 2.6 Safety Rules Check

Verify that critical safety rules are present:
- Destructive database commands (if applicable to the stack)
- Production data protection (if applicable)
- Check if these are enforced via `.claude/settings.json` deny rules (preferred) rather than only in CLAUDE.md text

### 2.7 Missing Content

Identify anything important that SHOULD be in CLAUDE.md but is not:
- Missing test command
- Missing safety rules for the detected stack
- Missing routing table for installed rules
- Key project conventions not documented anywhere (not in CLAUDE.md, not in rules)

## Step 3: Summary and Prioritized Recommendations

End the report with:

1. **Overall health score**: Good / Needs Work / Critical
2. **Top 3 priority actions** — the changes with the highest impact, ordered by importance
3. **Estimated line count after fixes** — what the CLAUDE.md size would be if all recommendations are applied

Format each recommendation as:
```
[PRIORITY] Action description
  Lines affected: X-Y
  Reason: ...
  Suggested change: ...
```

## Output Format

Output the full analysis report in markdown. Be specific with line numbers. Be direct — no hedging or unnecessary qualifiers. If CLAUDE.md is already well-structured, say so briefly and focus only on minor improvements.
