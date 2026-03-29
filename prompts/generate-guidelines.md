# Generate guidelines.md

You are generating a **guidelines.md** file — the operational manual for this project. It should contain actionable, project-specific guidance that helps AI assistants (and developers) work effectively.

## Analysis Steps

1. **Build & Configuration**
   - Read `composer.json` / `package.json` scripts section
   - Check for `Makefile`, `Taskfile`, or custom build scripts
   - Identify framework-specific commands (artisan, npm scripts, etc.)

2. **Testing**
   - Read test config: `phpunit.xml`, `vitest.config.*`, `jest.config.*`, `playwright.config.*`
   - Identify test commands, coverage requirements, test database setup
   - Check CI/CD files (`.github/workflows/`, `.gitlab-ci.yml`)

3. **Code Quality**
   - Check formatter/linter configs: `pint.json`, `.eslintrc`, `prettier`, `biome.json`
   - Check static analysis: `phpstan.neon`, `larastan.neon`, `tsconfig.json`
   - Identify pre-commit hooks (`.husky/`, `.pre-commit-config.yaml`)

4. **Development Notes**
   - Coding standards and conventions used in this project
   - Environment setup requirements
   - Pre-push checklist items

## Output Format

Generate a `guidelines.md` file with these sections:

```markdown
# Guidelines

## Build & Run
<!-- Framework commands, environment setup, key scripts -->

## Testing
<!-- How to run tests, add new tests, CI/CD expectations -->

## Code Quality
<!-- Linting, formatting, static analysis commands -->

## Development Notes
<!-- Conventions, gotchas, pre-push checklist -->
```

## Rules

- Keep it under 150 lines
- Only include commands and info that are actually present in this project
- Be specific — use actual file paths and command names from the project
- Do not include generic advice — every line should be project-specific
- Use imperative mood ("Run X", not "You should run X")
