# Seedway Auto x Moto Detail Studio: Entity Relationship Diagram (ERD)
## Production Database Architecture (Standardized)

This diagram represents the stabilized nested relational structure implemented for production-grade stability.

```mermaid
erDiagram
    PROFILES ||--o{ BOOKINGS : "as customer"
    PROFILES ||--o{ BOOKINGS : "as staff"
    PROFILES ||--o{ NOTIFICATIONS : "receives"

    BOOKINGS ||--o{ BOOKING_VEHICLES : "contains fleet"
    BOOKINGS ||--o{ PAYMENTS : "financials"
    BOOKINGS ||--o{ AUDIT_LOGS : "logs history"
    BOOKINGS ||--o{ BOOKING_MESSAGES : "chat"

    BOOKING_VEHICLES ||--o{ BOOKING_VEHICLE_SERVICES : "assigned services"
    
    SERVICES ||--o{ SERVICE_PRICING : "has_pricing"
    SERVICES ||--o{ BOOKING_VEHICLE_SERVICES : "referenced_in"

    PROFILES {
        uuid id PK
        text first_name
        text last_name
        text full_name
        text email
        text phone_number
        user_role role
    }

    BOOKINGS {
        uuid id PK
        uuid customer_id FK
        uuid staff_id FK
        booking_status status
        timestamp start_datetime
        numeric total_amount
        text payment_status
        text service_status
    }

    BOOKING_VEHICLES {
        uuid id PK
        uuid booking_id FK
        text make
        text model
        text plate_number
        text vehicle_type
        text status
        numeric subtotal
    }

    BOOKING_VEHICLE_SERVICES {
        uuid id PK
        uuid vehicle_id FK
        uuid service_id FK
        text service_name_snapshot
        numeric price_snapshot
        integer quantity
    }

    PAYMENTS {
        uuid id PK
        uuid booking_id FK
        numeric amount
        text status
        text method
        text reference_number
        text receipt_url
    }

    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        text title
        text message
        text notification_type
        text action_url
        boolean is_read
    }

    SERVICES {
        uuid id PK
        text name
        text description
        numeric price
        integer duration_minutes
        boolean is_active
        text category
    }
```

### 🧬 Architectural Hierarchy:
1.  **Booking (Layer 1)**: The parent appointment. Handles scheduling, total pricing (`total_amount`), and customer association.
2.  **Vehicle (Layer 2)**: The unit-level detailing job. Each unit has its own status (`queued`, `in_progress`, `completed`).
3.  **Service (Layer 3)**: The specific work items performed on each vehicle. Stores snapshots of price/name at the time of booking to ensure historical audit integrity.
4.  **Payments**: Independent financial layer that tracks multiple payment attempts (Cash, GCash, etc.) against the booking total.
5.  **Audit Logs**: Comprehensive event tracking for every mutation across the studio operations.
