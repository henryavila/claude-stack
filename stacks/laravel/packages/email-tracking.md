---
paths:
  - "app/Mail/**"
  - "app/Enums/EmailType.php"
  - "tests/**/Email*"
  - "tests/**/Mail*"
---

# Email Tracking (henryavila/email-tracking)

## Creating a Mailable

```php
use HenryAvila\EmailTracking\Mail\TrackableMail;

class MyMail extends TrackableMail implements ShouldQueue
{
    use Queueable;

    public function __construct(public $model)
    {
        parent::__construct($this->model, 'emails.my-notification');
    }

    protected function getEmailType(): EmailType
    {
        return EmailType::OFFICIAL_NOTIFICATION;
    }
}
```

## EmailType Enum

Define an `EmailType` enum to categorize your mailables:

| Type | Usage |
|------|-------|
| `OFFICIAL_NOTIFICATION` | Notifications to external entities |
| `WORKFLOW_ACTION` | Internal actions (approvals, rejections) |
| `USER_CONFIRMATION` | Confirmation of user action |
| `AUTOMATED_REMINDER` | Automated reminders |
| `REPORT` | Reports |
| `SYSTEM_MESSAGE` | System messages (maintenance, etc.) |
| `GENERAL` | Fallback |

## Critical Filtering

ALWAYS filter by type before making decisions:
```php
// CORRECT
$officialEmails = $this->emails()->officialNotifications()->get();

// WRONG — mixes all types
$this->emails->contains(fn ($e) => $e->isDelivered());
```

## Anti-patterns

- Do NOT omit `getEmailType()` — every mailable MUST implement it
- Do NOT use `$this->emails` without filtering by type
