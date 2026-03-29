---
paths:
  - "app/Filament/**"
---

# Filament v4 Rules

## Namespace v3 → v4 (error #1)

| v3 (WRONG) | v4 (CORRECT) |
|-------------|-------------|
| `Filament\Forms\Get` | `Filament\Schemas\Components\Utilities\Get` |
| `Filament\Forms\Set` | `Filament\Schemas\Components\Utilities\Set` |
| `Filament\Forms\Components\Tabs` | `Filament\Schemas\Components\Tabs` |
| `Filament\Forms\Components\Tabs\Tab` | `Filament\Schemas\Components\Tabs\Tab` |
| `Filament\Infolists\Components\HtmlEntry` | **Removed** → `TextEntry::make()->html()` |
| `Filament\Forms\Components\Placeholder` | **Deprecated** → `Filament\Schemas\Components\Text` |
| `Filament\Schemas\Components\Actions\Action` | **Does not exist** → `Filament\Actions\Action` inside `SchemaActions::make()` |

Verification after writing any Filament code:
```bash
grep -rn 'use Filament\\Forms\\Get\|use Filament\\Forms\\Set\|HtmlEntry\|Forms\\Components\\Placeholder\|Forms\\Components\\Tabs' app/Filament/
```

## Three Namespaces

| Need | Namespace |
|-----------|-----------|
| Layout (Section, Grid, Tabs, Text) | `Filament\Schemas\Components\*` |
| Display (TextEntry, IconEntry) | `Filament\Infolists\Components\*` |
| Input (TextInput, Select, Toggle) | `Filament\Forms\Components\*` |
| Actions | `Filament\Actions\Action` |
| Utilities (Get, Set) | `Filament\Schemas\Components\Utilities\*` |
| Enums (TextSize, Width) | `Filament\Support\Enums\*` |

## Base Classes

Extend your project's base classes if applicable. Common pattern:

| Class | Should extend |
|--------|---------|
| Resource | Your project's `AbstractResource` (or Filament default) |
| ListRecords | Your project's `AbstractListRecords` (or Filament default) |
| CreateRecord | Your project's `AbstractCreateRecord` (or Filament default) |
| EditRecord | Your project's `AbstractEditRecord` (or Filament default) |
| ViewRecord | Your project's `AbstractViewRecord` (or Filament default) |
| RelationManager | Your project's `AbstractRelationManager` (or Filament default) |

## Type Signatures (Fatal Errors)

```php
// Icon property — MUST include BackedEnum
protected static string|null|\BackedEnum $icon = 'heroicon-o-document';

// $view in custom Pages — NEVER static
protected string $view = 'filament.pages.my-page';

// getNavigationIcon — call parent first
public static function getNavigationIcon(): string|\BackedEnum|Htmlable|null {
    return parent::getNavigationIcon() ?? static::$model::getIcon();
}
```

## API Differences

- TextEntry: `->hint()` (NOT `->description()`)
- TextColumn: `->description()` (NOT `->hint()`)
- Labels: `->hiddenLabel()` (NOT `->label('')`)
- Actions: `->schema([...])` (NOT `->form([...])`)
- Select enums: `MyEnum::options()` (NOT `MyEnum::class`)
- Table tabs: `getTabs()` in ListRecords (NOT `$table->tabs()`)

## Schema Delegation (NEVER inline)

```php
// In the Resource — delegate to dedicated class
public static function form(Schema $schema): Schema {
    return ResourceNameForm::configure($schema);
}
```

## View Pages: Infolist vs Blade

- < 30 items in relations → Filament Infolist
- 30+ items → Livewire Blade component (RepeatableEntry causes timeout at 80+)
- Use `<x-filament::section>` in Blade to maintain design system

## Rich Text (Trix → TipTap)

- `getDirty()` false positives → `normalizeHtmlForComparison()`
- RichEditor empty stores `<p></p>` → `blank(strip_tags($value))`
- Activity log with HTML → `stripHtmlForStorage()`

## RelationManagers

- Same panel: reuse `RelatedTable::configure($table)` + TableViewAction
- Cross-panel: inline columns + `OtherTable::getFilters()`
- Icon type: `string|null|\BackedEnum` (NOT `?string`)

## Modals

```blade
{{-- Modals OUTSIDE the form --}}
<form wire:submit="send">{{ $this->form }}</form>
<x-filament-actions::modals />
```

## Inline Actions

```php
use Filament\Schemas\Components\Actions as SchemaActions;
use Filament\Actions\Action;  // NOT Filament\Schemas\Components\Actions\Action
SchemaActions::make([Action::make('x')->schema([...])->action(fn (array $data) => ...)])->columnSpanFull();
```

## DI in Livewire

Livewire does NOT support constructor DI. Use `app(MyService::class)` in the method.
