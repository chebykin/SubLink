# SubLink Backend

## Data Model

```mermaid
erDiagram
    creators ||--o{ plans : "has"
    plans ||--o{ subscriptions : "has"
    subscriptions ||--o{ charges : "has"

    creators {
        text id PK
        text evm_address UK
        text unlink_address UK
        text name
        text api_key UK
        text webhook_url
        text created_at
    }

    plans {
        text id PK
        text creator_id FK
        text name
        text description
        text amount
        int interval_seconds
        text spending_cap
        int active
        text created_at
    }

    subscriptions {
        text id PK
        text plan_id FK
        text auth_key_id
        text auth_public_key
        text unlink_address
        text account_keys_encrypted
        text status
        text total_spent
        int charge_count
        int consecutive_failures
        text last_charged_at
        text next_charge_at
        text created_at
        text cancelled_at
    }

    charges {
        text id PK
        text subscription_id FK
        text amount
        text status
        text unlink_tx_id
        text error_message
        text created_at
        text completed_at
    }
```

**creators** -- service providers who publish plans and receive payments via their Unlink address.

**plans** -- subscription offers (amount, interval, optional spending cap). Public by design so subscribers can discover them.

**subscriptions** -- a subscriber's active relationship to a plan. Identified by a derived auth key, not a stored wallet address. Holds the dedicated Unlink account keys so the backend can pull payments. One per `(auth_key_id, plan)` pair.

**charges** -- individual payment attempts. Tracks success/failure, Unlink transaction ID, and timing. History is append-only.

### Subscription lifecycle

```mermaid
stateDiagram-v2
    [*] --> active
    active --> completed : spending cap reached
    active --> cancelled : subscriber cancels
    active --> cancelled_by_failure : 3 consecutive failed charges
```
