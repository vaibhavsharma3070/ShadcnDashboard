# Consignment Management System

## Overview

This is a luxury consignment management system built with React, TypeScript, and Express. The application manages pre-owned luxury goods (watches, handbags, fashion accessories) through a consignment model where vendors supply items, the company manages sales, and clients can purchase items with full or partial payments.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### July 15, 2025 - Installment Payment Management & Client Assignment
- **New Feature**: Automatic client assignment for purchased items
  - Items are now automatically assigned to clients after purchase (full or installment)
  - Payment forms auto-populate assigned client instead of showing dropdown
  - Streamlined payment process for items with existing owners
- **New Feature**: Upcoming Payments section in item details
  - Shows pending installment payments with due dates
  - "Mark as Paid" button for each pending installment
  - Automatically creates payment records when installments are marked as paid
  - Real-time updates to payment history and remaining balances
- **Backend Enhancement**: Enhanced `markInstallmentPaid` function
  - Now creates corresponding payment records in payment history
  - Updates installment status and paid amount
  - Maintains data consistency between installments and payments

### July 15, 2025 - Data Type Consistency Fixes
- **Issue**: Payment forms were failing due to data type mismatches between frontend forms, API validation, and database schemas
- **Root Cause**: Forms sent string values for numeric/date fields, but Drizzle Zod schemas expected exact types
- **Solution**: Enhanced insert schemas with preprocessing for automatic type conversion:
  - `insertClientPaymentSchema`: Added preprocessing for `amount` (string → number) and `paidAt` (string → Date)
  - `insertVendorPayoutSchema`: Added preprocessing for `amount` and `paidAt`
  - `insertItemExpenseSchema`: Added preprocessing for `amount` and `incurredAt`
  - `insertInstallmentPlanSchema`: Added preprocessing for `amount` and `dueDate`
  - `insertItemSchema`: Added preprocessing for `agreedVendorPayout`, `listPrice`, and `acquisitionDate`
- **Result**: All forms now work consistently with proper data type handling and validation

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state
- **UI Framework**: Tailwind CSS with shadcn/ui components
- **Build Tool**: Vite for development and build process
- **Theme**: Next-themes for dark/light mode support

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (@neondatabase/serverless)
- **Session Management**: PostgreSQL-backed sessions (connect-pg-simple)
- **API Style**: REST endpoints with JSON responses

### Project Structure
```
├── client/          # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Route components
│   │   ├── hooks/       # Custom React hooks
│   │   └── lib/         # Utilities and query client
├── server/          # Express backend
│   ├── routes.ts    # API route definitions
│   ├── storage.ts   # Database operations
│   └── db.ts        # Database connection
├── shared/          # Shared types and schemas
│   └── schema.ts    # Drizzle database schema
└── migrations/      # Database migrations
```

## Key Components

### Database Schema
The system uses PostgreSQL with the following main entities:
- **Vendors**: Suppliers of luxury items with contact information
- **Clients**: Customers who purchase items
- **Items**: Luxury goods with pricing, condition, and status tracking
- **Client Payments**: Payment records (supports partial payments)
- **Vendor Payouts**: Payments to vendors after successful sales
- **Item Expenses**: Costs associated with items (authentication, repairs)

### User Interface
- **Dashboard**: Overview with metrics, recent items, and top performers
- **Inventory Management**: Item listing and status tracking
- **Vendor Management**: Vendor relationship management
- **Client Management**: Customer records and purchase history
- **Payment Processing**: Client payment tracking
- **Payout Management**: Vendor payment processing
- **Expense Tracking**: Item-related cost management
- **Reports & Analytics**: Business intelligence and profitability analysis

### API Endpoints
- GET `/api/dashboard/metrics` - Business metrics
- GET `/api/dashboard/recent-items` - Recent inventory
- GET `/api/dashboard/top-performing` - Top performing items
- CRUD operations for vendors, clients, items, payments, payouts, and expenses

## Data Flow

1. **Item Intake**: Vendors consign items with agreed payout amounts
2. **Inventory Management**: Items are catalogued with pricing and condition
3. **Sales Process**: Clients make full or partial payments toward items
4. **Payout Processing**: Vendors are paid after items are fully paid
5. **Expense Tracking**: Authentication and repair costs are recorded
6. **Profitability Analysis**: Real-time profit calculations across all transactions

## External Dependencies

### Frontend Dependencies
- **UI Components**: Radix UI primitives with shadcn/ui styling
- **Form Handling**: React Hook Form with Zod validation
- **Data Fetching**: TanStack Query for server state management
- **Styling**: Tailwind CSS with CSS variables for theming
- **Icons**: Lucide React icons

### Backend Dependencies
- **Database**: Neon serverless PostgreSQL
- **ORM**: Drizzle ORM with Zod schema validation
- **Session Storage**: PostgreSQL-backed sessions
- **Development**: TSX for TypeScript execution, ESBuild for production builds

## Deployment Strategy

### Development
- **Frontend**: Vite dev server with hot module replacement
- **Backend**: TSX with auto-restart on file changes
- **Database**: Neon serverless PostgreSQL connection
- **Environment**: Replit-optimized with development banners and error overlays

### Production Build
- **Frontend**: Vite build outputs to `dist/public`
- **Backend**: ESBuild bundles server code to `dist/index.js`
- **Database**: Drizzle migrations run via `npm run db:push`
- **Deployment**: Single Node.js process serving both API and static files

### Business Logic
The system implements a consignment model where:
- Profit = Client Payments - Vendor Payout - Item Expenses
- Vendors are only paid after items are fully paid by clients
- Items can have multiple payment installments from clients
- All financial transactions are tracked for reporting and analytics

The application is designed for internal use by store operators, finance staff, and business owners to manage the complete consignment lifecycle from item intake to final sale and payout.