# RENEW: Entity Relationship Diagram (ERD)
## Database Architecture (v2)

This diagram represents the current relational structure of the RENEW Auto Detailing platform.

```mermaid
erDiagram
    PROFILES ||--o{ BOOKINGS_V2 : "as customer"
    PROFILES ||--o{ BOOKINGS_V2 : "as staff"
    PROFILES ||--o{ BOOKING_EVENTS : "as actor"
    PROFILES ||--o{ BOOKING_MESSAGES : "as sender"
    PROFILES ||--o{ NOTIFICATIONS : "receives"

    RESOURCES ||--o{ BOOKINGS_V2 : "holds"
    
    BOOKINGS_V2 ||--o{ BOOKING_SERVICES_V2 : "includes"
    BOOKINGS_V2 ||--o{ PAYMENTS_V2 : "has"
    BOOKINGS_V2 ||--o{ REFUNDS_V2 : "has"
    BOOKINGS_V2 ||--o{ BOOKING_EVENTS : "logs"
    BOOKINGS_V2 ||--o{ BOOKING_MESSAGES : "chat_history"
    
    SERVICES_V2 ||--o{ BOOKING_SERVICES_V2 : "defined_in"
    SERVICES_V2 ||--o{ SERVICE_PRICING : "has_pricing"
    
    PACKAGES_V2 ||--o{ BOOKINGS_V2 : "optionally_applied"
    PACKAGES_V2 ||--o{ PACKAGE_SERVICES_V2 : "contains"
    SERVICES_V2 ||--o{ PACKAGE_SERVICES_V2 : "part_of_package"

    PROFILES {
        uuid id PK
        text full_name
        text email
        text phone_number
        user_role role
        boolean is_active
    }

    BOOKINGS_V2 {
        uuid id PK
        uuid customer_id FK
        uuid staff_id FK
        uuid resource_id FK
        uuid package_id FK
        booking_status_v2 status
        timestamp start_datetime
        timestamp end_datetime
        numeric total_price
    }

    SERVICES_V2 {
        uuid id PK
        text name
        booking_type type
        numeric base_duration
        boolean is_active
    }

    SERVICE_PRICING {
        uuid id PK
        uuid service_id FK
        vehicle_type type
        numeric price
    }

    BOOKING_SERVICES_V2 {
        uuid id PK
        uuid booking_id FK
        uuid service_id FK
        numeric price_at_booking
    }

    PAYMENTS_V2 {
        uuid id PK
        uuid booking_id FK
        numeric amount
        payment_method method
        payment_status status
        text reference_number
        text receipt_url
    }

    BOOKING_EVENTS {
        uuid id PK
        uuid booking_id FK
        uuid actor_id FK
        text event_type
        jsonb metadata
    }

    BOOKING_MESSAGES {
        uuid id PK
        uuid booking_id FK
        uuid sender_id FK
        text message
        text media_url
    }

    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        text title
        text message
        boolean is_read
    }
```

### Key Relationships Summary:
1.  **Profiles (Users)**: Central entity for Customers, Staff, and Admins.
2.  **Bookings_v2**: The heart of the system, connecting Customers, Staff, and Resources.
3.  **Resource Management**: Every booking is tied to a specific `resource` (detailing bay), which is used for collision detection.
4.  **Flexible Pricing**: `services_v2` are mapped through `service_pricing` to handle different costs for Sedans vs SUVs.
5.  **Audit & Trail**: `booking_events` tracks all lifecycle changes for transparency.
