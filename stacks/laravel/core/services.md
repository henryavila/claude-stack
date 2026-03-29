---
paths:
  - "app/Services/**"
  - "app/ValueObjects/**"
---

# Services & SOLID

## SRP — Single Responsibility

- Models = data + simple queries + state checks
- Services = business logic + orchestration
- Pages/Controllers = thin, delegate to services
- Policies = authorization

## When to Create a Service

- Orchestrates multiple models
- Complex business logic
- Interacts with external system (email, API)
- Text/template processing

## Naming: `{Entity}{Action}Service`

Location: `App\Services\{Domain}`

## Value Objects for Return Types

```php
class ProcessAnalysisResponseResult {
    public function __construct(
        public readonly int $totalAnswered,
        public readonly int $yesCount,
        public readonly int $noCount,
    ) {}
}
```

## Anti-patterns

- God class (model does everything)
- `auth()` hardcoded — accept User as parameter with default
- Business logic in Pages — extract to Service
- Complex queries in controllers — extract to scopes/QueryBuilder
