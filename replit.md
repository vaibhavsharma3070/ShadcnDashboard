# Luxury Consignment Management System

## Overview
This project is a comprehensive luxury consignment management system for pre-owned luxury goods. It offers end-to-end business management, including inventory tracking, financial reporting, vendor/client relationship management, payment processing (including installment plans), expense tracking, and business intelligence analytics. The system supports the entire consignment process from item intake to sales, vendor payouts, and detailed profitability analysis, aiming to provide a complete solution for luxury consignment businesses.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application is built with a modern web stack, featuring a React frontend and a Node.js Express backend.

**Technology Stack:**
*   **Frontend:** React 18 (TypeScript), Wouter, TanStack Query v5, Tailwind CSS, shadcn/ui, Vite, next-themes, React Hook Form with Zod, Recharts.
*   **Backend:** Node.js with Express.js (TypeScript, ES modules), PostgreSQL, Drizzle ORM, connect-pg-simple, TSX.

**Core Features:**
*   **Inventory Management:** Detailed item cataloging, status tracking, bulk operations, and photo uploads.
*   **Client & Vendor Management:** Comprehensive profiles, transaction history, and relationship tracking.
*   **Financial Management:** Payment processing (including flexible installment plans with balance protection), vendor payout management, and item-specific expense tracking.
*   **Contract Management:** Complete contract creation wizard with professional PDF generation in Spanish with LUXETTE branding, and a comprehensive template builder.
*   **Authentication & Security:** Secure login system with Spanish UI, bcrypt password hashing, session-based authentication using PostgreSQL, route and API endpoint protection, and admin-only user management with role-based access control.
*   **Business Intelligence:** Comprehensive reporting suite with KPIs, time-series analysis, grouped performance metrics, item profitability, inventory health, and payment method audits.
*   **UI/UX:** Responsive design, dark/light mode, accessible components, and intuitive dashboards.

**Data Model:**
A normalized PostgreSQL schema with entities like `vendors`, `clients`, `brands`, `categories`, `payment_methods`, `items`, `client_payments`, `vendor_payouts`, `item_expenses`, and `installment_plans`.

**Business Logic:**
The system enforces a strict consignment model: Item Intake, Sales & Payments (with installment plan validation), and Vendor Payouts only after client payments are complete. Financials are based on cash-basis accounting for profit, COGS, and margin analysis.

**API Endpoints:**
A RESTful API provides endpoints for Dashboard metrics, CRUD operations for core entities (Vendors, Clients, Items, etc.), Financial Transactions (Payments, Payouts, Expenses), Installment Plans, Business Intelligence reports, and File Management.

## External Dependencies
*   **Database:** Neon Database (serverless PostgreSQL)
*   **Cloud Storage:** Google Cloud Storage (for item images)
*   **Frontend Libraries:** Radix UI primitives, shadcn/ui, TanStack Query, Recharts, Wouter
*   **Backend Libraries:** Drizzle ORM, Zod, connect-pg-simple