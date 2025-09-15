# LUXETTE Luxury Consignment Management System

## Overview
LUXETTE is a comprehensive luxury consignment management system designed for businesses dealing with pre-owned luxury goods. It provides an end-to-end solution for managing inventory, tracking sales, processing payments (including installment plans), handling vendor relationships and payouts, and generating detailed financial and business intelligence reports. The system aims to streamline the entire consignment lifecycle from item intake to sale and profitability analysis, offering a robust platform for efficient business operations.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Technology Stack
The system is built with a modern web stack. The frontend utilizes React 18 with TypeScript, Wouter for routing, TanStack Query for data fetching, and Tailwind CSS with shadcn/ui for UI components. The backend is developed using Node.js with Express.js and TypeScript, interacting with a PostgreSQL database via Drizzle ORM. Authentication is session-based, with session data stored in PostgreSQL. Google Cloud Storage is used for image storage. The system incorporates a multi-role user management system and tracks core entities like vendors, clients, items, brands, and categories, along with transactions such as client payments, vendor payouts, and item expenses. Installment plans and contract management with PDF generation are also core features. API design follows RESTful principles with Zod schemas for validation and centralized error handling.

### Service Layer Architecture (Refactored)
The backend has been refactored from a monolithic storage.ts file (3,685 lines) into a clean service layer architecture with domain-driven design principles:

#### Service Organization
- **server/services/** - Domain-specific service modules (17 services)
  - `auth.service.ts` - User authentication and management
  - `vendors.service.ts` - Vendor CRUD operations
  - `clients.service.ts` - Client management
  - `brands.service.ts` - Brand management
  - `categories.service.ts` - Category management
  - `paymentMethods.service.ts` - Payment method handling
  - `items.service.ts` - Item inventory management
  - `payments.service.ts` - Client payment processing
  - `payouts.service.ts` - Vendor payout management
  - `expenses.service.ts` - Item expense tracking
  - `installments.service.ts` - Installment plan management
  - `dashboard.service.ts` - Dashboard metrics and analytics
  - `metrics.service.ts` - Payment and payout metrics
  - `financialHealth.service.ts` - Financial health calculations
  - `bi.service.ts` - Business Intelligence aggregations
  - `contractTemplates.service.ts` - Contract template management
  - `contracts.service.ts` - Contract generation and management

#### Utility Modules
- **server/services/utils/** - Shared utilities and helpers
  - `db-helpers.ts` - Database conversion functions (toDbNumeric, toDbDate, etc.)
  - `joins.ts` - Common query joins and select builders
  - `filters.ts` - Reusable filter logic for queries
  - `errors.ts` - Centralized error handling

#### Architecture Benefits
- **Separation of Concerns**: Each service handles a specific business domain
- **Maintainability**: Smaller, focused files are easier to understand and modify
- **Reusability**: Common logic extracted to utility modules
- **Testability**: Individual services can be tested in isolation
- **Performance**: Optimized query builders and reduced code duplication
- **Backward Compatibility**: Facade pattern preserves all existing API contracts

## External Dependencies
- **Database**: Neon Database (serverless PostgreSQL)
- **Cloud Storage**: Google Cloud Storage (for item images)
- **PDF Generation**: React PDF (for contracts)
- **Image Processing**: Sharp (for compression)

## Business Intelligence API Endpoints
LUXETTE includes 6 real-time business intelligence API endpoints for financial metrics and inventory tracking:

### Sales & Payments
- **`GET /api/bi/sales-month-to-date`** - Total sales for items marked as "sold" this month
  - Returns: `{ "totalSales": number }`
- **`GET /api/bi/sum-upcoming-payments`** - Sum of pending installment payments
  - Returns: `{ "totalUpcomingPayments": number }`

### Vendor Payouts  
- **`GET /api/bi/sum-ready-payouts`** - Sum of payouts ready for fully paid items
  - Returns: `{ "totalReadyPayouts": number }`
- **`GET /api/bi/sum-upcoming-payouts`** - Sum of future payouts for partially paid items  
  - Returns: `{ "totalUpcomingPayouts": number }`

### Inventory Metrics
- **`GET /api/bi/inventory-cost-range`** - Sum of min/max cost values for in-store inventory
  - Returns: `{ "min": number, "max": number }`
- **`GET /api/bi/inventory-market-price-range`** - Sum of min/max sales price values for in-store inventory
  - Returns: `{ "min": number, "max": number }`

**Security**: All BI endpoints require session authentication and return aggregated data only.

**Usage**: Access via TanStack Query in frontend or direct fetch calls when authenticated.