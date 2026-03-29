---
paths:
  - "app/Models/**"
  - "tests/**"
  - "app/Filament/**"
---

# MongoDB with Laravel (laravel-mongodb)

## Model Setup

```php
use MongoDB\Laravel\Eloquent\Model;

class MyDocument extends Model
{
    protected $connection = 'mongodb';
}
```

## ObjectId Handling

- Always cast ObjectIds to string when used outside MongoDB context: `(string) $model->_id`
- Relationships between SQL and MongoDB models require explicit `(string)` casts

## Embedded Documents

Check `_ref`, not the field itself, when testing for null:
```php
// CORRECT
empty($data['area']['_ref'] ?? null);

// WRONG — embedded doc may exist as empty object
empty($data['area']);
```

## Testing

- Tag MongoDB tests with `@group mongodb` so they run separately: `composer test-mongo`
- MongoDB tests are NOT parallelizable (shared MongoDB instance)
- Do NOT mix MongoDB tests with the main parallel test suite

## Filament Integration

### Select with ObjectIds

ALWAYS use `mapWithKeys` with `(string)` cast for Select options:
```php
MyModel::orderBy('name')->get()->mapWithKeys(fn ($m) => [(string) $m->_id => $m->name]);
```

### Embedded Docs Null Check

When checking embedded document fields in Filament forms:
```php
empty($data['area']['_ref'] ?? null);  // not empty($data['area'])
```

### Label Fallback Chains

MongoDB documents may have inconsistent field names. Use fallback chains:
```php
$document->nome ?? $document->assunto ?? sprintf('#%s', $document->id)
```
