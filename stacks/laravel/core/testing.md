---
paths:
  - "tests/**"
  - "database/factories/**"
---

# Testing Rules

## Pest (Required)

- Closure syntax: `test()`, `it()`, `beforeEach()`, `expect()`
- `php artisan make:test --pest` for new tests
- Chain with `->and()`: `expect($a)->toBe(1)->and($b)->toBe(2)`
- New `expect()` only when changing the subject

## Browser Tests (E2E)

- `User::factory()->active()` REQUIRED — without `active()` = intermittent 403
- Searchable Select: click `.fi-fo-select-wrp .fi-select-input-btn` → `[role="option"]`
- Submit buttons: `button[wire:target="create"]` (not `click('Create')`)

## Parallelization

- `function_exists('name')` wrapper for global functions in Pest
- Shared helpers: traits + `uses(Trait::class)`, not inheritance
- `LazilyRefreshDatabase` + SQLite in-memory

## Factories

- Use business fields (gravity, urgency, trend), NOT calculated fields (priority)
- Filament: `Livewire::actingAs($user)->test(Page::class)`
