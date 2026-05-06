# RENEW: Auto Detailing Management System
## Project Summary & System Capabilities

### 1. Core Business Impact
The RENEW platform transforms traditional, manual auto-detailing operations into a high-efficiency digital workflow. It is designed to solve common industry pain points:
*   **Zero Double-Bookings**: Uses a mathematical "Resource Exclusion" system to ensure slots, equipment, and staff are never double-booked.
*   **Centralized Command**: A single Admin Dashboard for managing the service catalog (SUV/Sedan pricing), staff accounts, and financial oversight.
*   **Payment Integrity**: A rigorous verification pipeline (**Unpaid → Verifying → Partial → Paid**) with overpayment protection and GCash receipt validation.
*   **Operational Freedom**: Automated email and in-app notifications reduce manual follow-ups, allowing staff to focus on high-quality detailing work.

### 2. The Customer Experience
Clients enjoy a premium, self-service journey that emphasizes transparency and convenience:
*   **24/7 "Service Bag"**: Customers can browse services and add them to their "Bag" even before logging in, retaining their choices across sessions.
*   **Streamlined Checkout**: A simple 5-step process: Service Selection → Login → Appointment Details → Summary → Confirmation.
*   **Total Transparency (The Activity Trail)**: Customers see a real-time audit log of their vehicle's progress (e.g., "Staff started service at 10:00 AM").
*   **Real-time Updates**: Live status tracking using **Supabase Realtime** (**Scheduled → In Progress → Curing → Ready for Pickup → Completed**).

### 3. Technical Architecture (v2)
*   **Database**: PostgreSQL with Row-Level Security (RLS) for bank-grade data isolation.
*   **Real-time**: Supabase Realtime for instant notification badges and status updates.
*   **Automated Emails**: Supabase Edge Functions integrated with Resend for transactional receipts and status alerts.
*   **Security**: Role-based access control (RBAC) ensuring Customers, Staff, and Admins only see what they are authorized to see.

---
*Created on: May 2026*
*Market: Rizal, Philippines*
