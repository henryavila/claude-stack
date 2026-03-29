---
paths:
  - "database/migrations/**"
---

# Database Rules

## Table Names in Raw Queries

```php
// CORRECT
$table = (new MyModel)->getTable();
DB::raw("SELECT COUNT(*) FROM {$table} WHERE ...")

// WRONG — hardcoded
DB::raw("SELECT COUNT(*) FROM my_models WHERE ...")
```

## Migrations Safety

- `php artisan migrate` — OK
- `php artisan migrate:rollback --step=1` — OK (not blocked by deny rule)
- `migrate:fresh`, `db:wipe`, `migrate:reset`, `migrate:refresh` — blocked by deny rules in settings
