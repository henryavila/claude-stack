---
paths:
  - "app/**"
  - "tests/**"
---

# Code Quality Rules

## PHP Standards

- `declare(strict_types=1)` in every PHP file
- `sprintf()` for string concatenation, not the `.` operator
- Null checks: `$model === null`, never `! $model`
- `$request->validated()`, never `$request->all()`

## Comments

- Comments explain WHY, not WHAT
- Self-documenting code reduces the need for comments

## Policies

- Co-located with models: `App\Models\{Domain}\Policies\`

## Testing

- NEVER `Mockery::mock('alias:...')` — use partial mocks or container injection
