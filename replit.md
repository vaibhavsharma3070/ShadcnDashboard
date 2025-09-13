# Luxury Consignment Management System

## Overview

This project is a comprehensive luxury consignment management system designed for pre-owned luxury goods (watches, handbags, fashion accessories, jewelry). It provides end-to-end business management, including inventory tracking, financial reporting, vendor/client relationship management, payment processing (including installment plans), expense tracking, and business intelligence analytics. The system supports a complete consignment business model from item intake to sales, vendor payouts, and detailed profitability analysis.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application is built with a modern web stack, featuring a React frontend and a Node.js Express backend.

**Technology Stack:**
*   **Frontend:** React 18 (TypeScript), Wouter (routing), TanStack Query v5 (server state), Tailwind CSS (styling), shadcn/ui (component library), Vite (build tool), next-themes (theme management), React Hook Form with Zod (form handling), Recharts (charts).
*   **Backend:** Node.js with Express.js (TypeScript, ES modules), PostgreSQL (database), Drizzle ORM (type-safe ORM), connect-pg-simple (session management), TSX (hot-reload).

**Core Features:**
*   **Inventory Management:** Detailed item cataloging, status tracking, bulk operations, and photo uploads.
*   **Client & Vendor Management:** Comprehensive profiles, transaction history, and relationship tracking.
*   **Financial Management:** Payment processing (including flexible installment plans with balance protection), vendor payout management, and item-specific expense tracking.
*   **Contract Management:** Complete contract creation wizard with vendor/item selection, automatic template variable replacement, professional PDF generation in Spanish with LUXETTE branding, and comprehensive template builder with variable reference guide and live preview.
*   **Authentication & Security:** Secure login system with Spanish UI, bcrypt password hashing, session-based authentication using PostgreSQL, route protection for all pages, and API endpoint protection with proper session management.
*   **Business Intelligence:** Comprehensive reporting suite with KPIs, time-series analysis, grouped performance metrics (by brand, vendor, client, category), item profitability, inventory health, and payment method audits.
*   **UI/UX:** Responsive design, dark/light mode, accessible components, and intuitive dashboards.

**Data Model:**
The PostgreSQL database uses a normalized schema with core entities including `vendors`, `clients`, `brands`, `categories`, `payment_methods`, `items`, `client_payments`, `vendor_payouts`, `item_expenses`, and `installment_plans`. Referential integrity is enforced with foreign key constraints.

**Business Logic:**
The system enforces a strict consignment model:
1.  **Item Intake:** Vendors consign items with agreed payout terms.
2.  **Sales & Payments:** Clients purchase items with flexible payment options, including installment plans with validation to prevent total upcoming payments from falling below remaining balances.
3.  **Payouts:** Vendors are paid only after client payments are complete.
4.  **Financials:** Cash-basis accounting, profit calculation (Client Payments - Vendor Payout - Item Expenses), COGS, and margin analysis.

**API Endpoints:**
A RESTful API supports all core functionalities:
*   **Dashboard:** Metrics, recent items, top performers.
*   **CRUD for Entities:** Vendors, Clients, Brands, Categories, Payment Methods, Items.
*   **Financial Transactions:** Payments, Payouts, Expenses.
*   **Installment Plans:** Creation, updates, deletions, and status management.
*   **Business Intelligence:** Dedicated endpoints for various reports (KPIs, time-series, grouped data, item profitability, inventory, payment methods).
*   **File Management:** Image uploads to cloud storage.

## External Dependencies

*   **Database:** Neon Database (serverless PostgreSQL)
*   **Cloud Storage:** Google Cloud Storage (for item images)
*   **Frontend Libraries:** Radix UI primitives, shadcn/ui, TanStack Query, Recharts, Wouter
*   **Backend Libraries:** Drizzle ORM, Zod, connect-pg-simple