# Project Understanding Document

This document contains a detailed analysis of the codebase, file by file.

## Project Overview
This appears to be a full-stack business management application with inventory, client management, contracts, payments, and business intelligence features.

---

## Files Analysis


### Configuration Files

#### [`package.json`](package.json:1)
- **Project Type**: Full-stack REST API application with Express backend and React frontend
- **Key Technologies**:
  - Backend: Express.js, TypeScript, Drizzle ORM, Passport.js for authentication
  - Frontend: React 18, Vite, TanStack Query, Wouter (routing)
  - UI: Radix UI primitives, Tailwind CSS, shadcn/ui components
  - Database: Neon (PostgreSQL), with session storage
  - File Storage: Google Cloud Storage
  - PDF Generation: @react-pdf/renderer
- **Scripts**:
  - `dev`: Development server with tsx
  - `build`: Builds both frontend (Vite) and backend (esbuild)
  - `start`: Production server
  - `db:push`: Push database schema changes with Drizzle

#### [`tsconfig.json`](tsconfig.json:1)
- **Configuration**: TypeScript configuration for the entire project
- **Path Aliases**: 
  - `@/*` maps to `client/src/*` (frontend code)
  - `@shared/*` maps to `shared/*` (shared types/schemas)
- **Includes**: Client, server, and shared directories
- **Module System**: ESNext with bundler resolution

#### [`vite.config.ts`](vite.config.ts:1)
- **Purpose**: Vite build configuration for the React frontend
- **Features**:
  - React plugin with runtime error overlay
  - Replit-specific plugins for development
  - Path aliases for `@/`, `@shared/`, and `@assets/`
- **Build**: Outputs to `dist/public`
- **Root**: Frontend code is in `client/` directory

#### [`drizzle.config.ts`](drizzle.config.ts:1)
- **Purpose**: Drizzle ORM configuration for database migrations
- **Database**: PostgreSQL (via `DATABASE_URL` environment variable)
- **Schema**: Located at `shared/schema.ts`
- **Migrations**: Output to `./migrations` directory

#### [`components.json`](components.json:1)
- **Purpose**: shadcn/ui component library configuration
- **Style**: "new-york" variant
- **Framework**: React (non-RSC)
- **Styling**: Tailwind CSS with CSS variables, neutral base color
- **Aliases**: Configured for components, utils, ui, lib, and hooks


---

## Shared Schema

### [`shared/schema.ts`](shared/schema.ts:1)
**Purpose**: Complete database schema definition using Drizzle ORM with PostgreSQL, defining all tables, relations, validation schemas, and TypeScript types for the entire application.

**Core Business Domain**: This is a **consignment/resale business management system** where vendors provide items, those items are sold to clients (with flexible payment options), and vendors are paid out after sales.

#### Database Tables:

1. **[`vendor`](shared/schema.ts:6)** - Supplier/consignor information
   - Fields: vendorId, name, phone, email, taxId, bankAccountNumber, bankName, accountType
   - Has indexed email field
   - Relations: items, payouts, contracts

2. **[`client`](shared/schema.ts:20)** - Customer information
   - Fields: clientId, name, phone, email, billingAddr, idNumber
   - Has indexed email field
   - Relations: payments, installmentPlans

3. **[`brand`](shared/schema.ts:32)** - Product brands (e.g., Apple, Samsung)
   - Fields: brandId, name, active status
   - Unique name constraint with indexes on name and active status
   - Relations: items

4. **[`category`](shared/schema.ts:42)** - Item categories
   - Fields: categoryId, name, active status
   - Unique name constraint with indexes
   - Relations: items

5. **[`paymentMethod`](shared/schema.ts:52)** - Payment methods (cash, card, transfer, etc.)
   - Fields: paymentMethodId, name, active status
   - Unique name constraint with indexes
   - Relations: Used in client payments

6. **[`item`](shared/schema.ts:62)** - **Core entity**: Inventory items
   - Foreign keys: vendorId (required), brandId, categoryId
   - Item details: title, model, serialNo, condition, acquisitionDate, imageUrl
   - **Pricing ranges**: minCost/maxCost (what vendor gets), minSalesPrice/maxSalesPrice (sale price)
   - Status: defaults to "in-store" (tracks item lifecycle)
   - Has legacy `brand` text field for migration purposes
   - Multiple indexes: vendor, brand, category, status, serialNo
   - Relations: vendor, brand, category, payments, expenses, installmentPlans, payout

7. **[`clientPayment`](shared/schema.ts:100)** - Payments received from clients
   - Foreign keys: itemId, clientId
   - Fields: paymentMethod, amount, paidAt timestamp
   - Relations: item, client

8. **[`vendorPayout`](shared/schema.ts:120)** - Payments made to vendors
   - Foreign keys: itemId, vendorId
   - Fields: amount, paidAt, bankAccount, transferId, notes
   - Indexed on item, vendor, and paidAt
   - Relations: item, vendor

9. **[`itemExpense`](shared/schema.ts:143)** - Additional costs per item
   - Foreign key: itemId
   - Fields: expenseType, amount, incurredAt, notes
   - Tracks costs like repairs, shipping, storage, etc.
   - Relations: item

10. **[`installmentPlan`](shared/schema.ts:158)** - Payment plans for clients
    - Foreign keys: itemId, clientId
    - Fields: amount, dueDate, paidAmount, status (pending/paid/overdue)
    - Multiple indexes for efficient querying
    - Relations: item, client

11. **[`contractTemplate`](shared/schema.ts:184)** - Reusable contract templates
    - Fields: name, termsText, isDefault flag
    - Relations: contracts

12. **[`contract`](shared/schema.ts:195)** - Vendor contracts
    - Foreign keys: vendorId, templateId
    - Status enum: "draft" or "final"
    - **itemSnapshots**: JSONB field storing snapshot of items at contract creation
    - pdfUrl: Link to generated PDF contract
    - Indexes on vendor, status, and createdAt
    - Relations: vendor, template

13. **[`users`](shared/schema.ts:479)** - Authentication and authorization
    - Fields: email (unique), name, role, active, passwordHash, lastLoginAt
    - Role enum: "admin", "staff", "readOnly"
    - Multiple indexes for security and performance
    - Spanish validation messages

#### Validation Schemas (using Zod):
- Each table has a corresponding `insertXSchema` for validating new records
- Custom preprocessing for numeric and date fields (string to number/date conversion)
- Special validations:
  - [`insertItemSchema`](shared/schema.ts:343): Requires brandId, optional categoryId with preprocessing
  - [`insertContractSchema`](shared/schema.ts:427): Validates item snapshots array
  - [`loginSchema`](shared/schema.ts:507): Email and password validation
  - [`createUserSchema`](shared/schema.ts:512): User creation with password
  - [`updateUserSchema`](shared/schema.ts:516): Partial updates with optional password

#### TypeScript Types:
- For each table: `Insert*` (validated input) and `*` (database select) types
- Example: [`InsertVendor`](shared/schema.ts:437), [`Vendor`](shared/schema.ts:438)
- [`ContractItemSnapshot`](shared/schema.ts:473): Type for item data stored in contracts

#### Key Business Logic Insights:
- **Pricing Model**: Items have min/max cost (vendor payout range) and min/max sales price (selling price range)
- **Consignment Flow**: Vendor provides item → Item sold to client → Vendor paid out
- **Payment Flexibility**: Clients can pay in full or via installment plans
- **Contract System**: Vendors sign contracts with item snapshots to lock in terms
- **Expense Tracking**: All item-related costs are tracked for profitability analysis
- **Multi-role Access**: Admin, staff, and read-only user roles


---

## Server Core Files

### [`server/db.ts`](server/db.ts:1)
**Purpose**: Database connection configuration using Drizzle ORM with Neon serverless PostgreSQL.

**Key Features**:
- **Neon Database**: Uses `@neondatabase/serverless` for serverless PostgreSQL connection pooling
- **WebSocket Configuration**: Configures WebSocket support for Neon using the `ws` library
- **Environment Validation**: Throws error if `DATABASE_URL` is not set
- **Drizzle Instance**: Creates a single [`db`](server/db.ts:15) instance with the complete schema from [`@shared/schema`](shared/schema.ts:1)
- **Connection Pool**: Exports [`pool`](server/db.ts:14) for direct PostgreSQL pool access if needed

### [`server/index.ts`](server/index.ts:1)
**Purpose**: Main Express server entry point with middleware configuration.

**Core Setup**:
1. **Session Management** ([lines 14-33](server/index.ts:14)):
   - Uses PostgreSQL for session storage via `connect-pg-simple`
   - Session table created automatically
   - 24-hour session expiry
   - Secure cookies in production (HTTPS only)
   - Session cookie name: `luxette.session.id`

2. **Middleware Stack**:
   - [`express.json()`](server/index.ts:35): Parse JSON bodies
   - [`express.urlencoded()`](server/index.ts:36): Parse URL-encoded bodies
   - **Request Logging** ([lines 38-66](server/index.ts:38)): Custom middleware that logs API requests with timing and response data

3. **Server Initialization** ([lines 68-99](server/index.ts:68)):
   - Registers all routes via [`registerRoutes()`](server/index.ts:69)
   - Error handling middleware ([lines 71-77](server/index.ts:71))
   - Development: Sets up Vite dev server with HMR
   - Production: Serves static files from `dist/public`
   - Listens on port 5000 (required for Replit)

### [`server/routes.ts`](server/routes.ts:1)
**Purpose**: Complete API route definitions for all business functionality. This is the **heart of the API layer**.

**Architecture Pattern**: Request → Validation → Service Call → Response

#### Authentication & Authorization:

1. **Session Management**:
   - Extends Express Request type to include [`req.user`](server/routes.ts:18) session data
   - [`requireAuth`](server/routes.ts:97) middleware: Validates user session
   - [`requireAdmin`](server/routes.ts:106) middleware: Enforces admin-only access

2. **Auth Routes** ([lines 115-241](server/routes.ts:115)):
   - `POST /api/auth/login`: Login with bcrypt password verification
   - `POST /api/auth/logout`: Session destruction
   - `GET /api/auth/me`: Current user info
   - `GET /api/auth/users`: List all users (admin only)
   - `POST /api/auth/users`: Create new user (admin only)
   - `PUT /api/auth/users/:id`: Update user (admin only)

#### Query Parameter Validation:
Uses Zod schemas for consistent validation:
- [`filtersSchema`](server/routes.ts:34): Vendor/client/brand/category/status filters with UUID validation
- [`dateRangeSchema`](server/routes.ts:46): Date range with YYYY-MM-DD format validation
- [`timeseriesSchema`](server/routes.ts:51): Timeseries metrics configuration
- [`groupedMetricsSchema`](server/routes.ts:56): Grouped analytics configuration
- [`itemProfitabilitySchema`](server/routes.ts:66): Pagination for item profitability reports

#### Business Domain Routes:

3. **Dashboard Routes** ([lines 252-304](server/routes.ts:252)):
   - `GET /api/dashboard/metrics`: Overall business metrics
   - `GET /api/dashboard/recent-items`: Recently added items
   - `GET /api/dashboard/top-performing`: Top profit items
   - `GET /api/dashboard/luxette-inventory`: Luxette vendor-specific data
   - `GET /api/dashboard/financial-data`: Financial data by date range

4. **Vendor Management** ([lines 307-362](server/routes.ts:307)):
   - Full CRUD operations: GET, GET/:id, POST, PUT/:id, DELETE/:id
   - Validation using [`insertVendorSchema`](server/routes.ts:330)

5. **Brand Management** ([lines 364-421](server/routes.ts:364)):
   - CRUD with unique name constraint
   - Error handling for constraint violations ([line 418](server/routes.ts:418))
   - POST `/api/migration/brands` ([line 542](server/routes.ts:542)): Legacy brand migration endpoint

6. **Category Management** ([lines 423-480](server/routes.ts:423)):
   - Similar CRUD pattern to brands
   - Active/inactive status support

7. **Payment Method Management** ([lines 482-539](server/routes.ts:482)):
   - Manages payment types (cash, card, transfer, etc.)

8. **Client Management** ([lines 559-614](server/routes.ts:559)):
   - Customer/buyer CRUD operations

9. **Item/Inventory Routes** ([lines 616-698](server/routes.ts:616)):
   - `GET /api/items`: List all items with optional vendor filter
   - `GET /api/items/:id`: Single item with vendor details
   - `POST /api/items`: Create with comprehensive validation
   - `PUT /api/items/:id`: Update item
   - `PATCH /api/items/:id/status`: Update item status only ([lines 671-689](server/routes.ts:671))
     - Valid statuses: `in-store`, `reserved`, `sold`, `returned-to-vendor`
   - `DELETE /api/items/:id`: Delete item

10. **Payment Routes** ([lines 700-800](server/routes.ts:700)):
    - Client payments CRUD
    - `GET /api/payments/item/:itemId`: Payments for specific item
    - `GET /api/payments/metrics`: Payment aggregation metrics
    - `GET /api/payments/recent`: Recent payment transactions
    - `GET /api/payments/upcoming`: Upcoming installment payments
    - `GET /api/payments/overdue`: Overdue installments
    - `GET /api/financial-health`: Financial health score

11. **Business Intelligence API** ([lines 812-846](server/routes.ts:812)):
    - `GET /api/bi/sales-month-to-date`: Current month sales total
    - `GET /api/bi/sum-upcoming-payments`: Total expected incoming
    - `GET /api/bi/sum-ready-payouts`: Payouts ready to be made
    - `GET /api/bi/sum-upcoming-payouts`: Future payout obligations
    - `GET /api/bi/inventory-cost-range`: Min/max inventory costs
    - `GET /api/bi/inventory-market-price-range`: Min/max market prices

12. **Installment Management** ([lines 866-882](server/routes.ts:866)):
    - `PATCH /api/installments/:id/mark-paid`: Mark installment as paid
    - `POST /api/installments/:id/send-reminder`: Send payment reminder

13. **Payout Routes** ([lines 884-941](server/routes.ts:884)):
    - Vendor payout tracking and management
    - `GET /api/payouts/metrics`: Payout aggregation
    - `GET /api/payouts/recent`: Recently completed payouts
    - `GET /api/payouts/upcoming`: Future vendor payouts
    - `GET /api/payouts/pending`: Items sold but not yet paid to vendor

14. **Expense Routes** ([lines 943-989](server/routes.ts:943)):
    - Track item-related expenses (repairs, shipping, etc.)
    - `GET /api/expenses/item/:itemId`: Expenses for specific item
    - Debug logging enabled for troubleshooting ([lines 963-974](server/routes.ts:963))

15. **Installment Plan Routes** ([lines 992-1061](server/routes.ts:992)):
    - Payment plan CRUD
    - `GET /api/installment-plans/item/:itemId`: Plans for specific item
    - `GET /api/installment-plans/client/:clientId`: Plans for specific client

16. **Advanced BI Reports** ([lines 1066-1242](server/routes.ts:1066)):
    - `GET /api/reports/kpis`: Comprehensive KPI dashboard
    - `GET /api/reports/timeseries`: Time-series metrics (revenue, profit, items sold, payments)
    - `GET /api/reports/grouped`: Metrics grouped by brand/vendor/client/category
    - `GET /api/reports/items`: Item-level profitability with pagination
    - `GET /api/reports/inventory`: Inventory health and aging analysis
    - `GET /api/reports/payment-methods`: Payment method breakdown
    - All with sophisticated filter and date range support

17. **Image Upload & Storage** ([lines 1244-1346](server/routes.ts:1244)):
    - `POST /api/upload-image`: Upload with Sharp image compression
      - Multer memory storage (10MB limit)
      - Resizes to max 1200x1200 preserving aspect ratio
      - JPEG compression at 85% quality
      - Uploads to Google Cloud Storage
      - Returns public URL: `/public-objects/uploads/{uuid}.jpg`
    - `GET /public-objects/:filePath(*)`: Serve uploaded images

18. **Contract Template Routes** ([lines 1348-1418](server/routes.ts:1348)):
    - CRUD for reusable contract templates
    - `GET /api/contract-templates/default`: Get/ensure default template
    - Validation with [`insertContractTemplateSchema`](server/routes.ts:1384)

19. **Contract Routes** ([lines 1420-1523](server/routes.ts:1420)):
    - Vendor contract management
    - `GET /api/contracts/vendor/:vendorId`: Contracts for specific vendor
    - `POST /api/contracts/:id/finalize`: Finalize contract with PDF URL
    - `GET /api/contracts/:id/pdf`: Get contract data for PDF generation
    - Contracts can be `draft` or `final` status

#### Error Handling:
- [`handleStorageError()`](server/routes.ts:74) function categorizes errors:
  - 404: Not found errors
  - 409: Constraint violations (e.g., can't delete referenced records)
  - 500: Other errors
- Consistent error response format with descriptive messages

#### Key Patterns:
- All routes use Zod validation before calling services
- Partial updates using `.partial()` on schemas
- Comprehensive error handling with specific status codes
- Debug logging for troubleshooting
- Spanish error messages for user-facing errors

### [`server/storage.ts`](server/storage.ts:1)
**Purpose**: Storage facade pattern that provides a unified interface while delegating to domain-specific services. Acts as the **abstraction layer** between routes and business logic.

**Architecture**:
- **Facade Pattern**: Single entry point ([`DatabaseStorage`](server/storage.ts:468) class) that delegates to specialized services
- **Backward Compatibility**: Maintains existing interface while allowing service refactoring
- **Type Safety**: Comprehensive TypeScript interface ([`IStorage`](server/storage.ts:59)) defining all operations

**Service Delegation** (imports [lines 38-54](server/storage.ts:38)):
- [`authService`](server/storage.ts:38): User authentication and management
- [`vendorsService`](server/storage.ts:39): Vendor operations
- [`clientsService`](server/storage.ts:40): Client operations
- [`brandsService`](server/storage.ts:41): Brand management
- [`categoriesService`](server/storage.ts:42): Category management
- [`paymentMethodsService`](server/storage.ts:43): Payment method management
- [`itemsService`](server/storage.ts:44): Inventory/item operations
- [`paymentsService`](server/storage.ts:45): Client payment operations
- [`payoutsService`](server/storage.ts:46): Vendor payout operations
- [`expensesService`](server/storage.ts:47): Item expense tracking
- [`installmentsService`](server/storage.ts:48): Payment plan management
- [`dashboardService`](server/storage.ts:49): Dashboard metrics and aggregations
- [`metricsService`](server/storage.ts:50): Payment/payout metrics
- [`financialHealthService`](server/storage.ts:51): Financial health scoring
- [`biService`](server/storage.ts:52): Business intelligence reporting
- [`contractTemplatesService`](server/storage.ts:53): Contract template management
- [`contractsService`](server/storage.ts:54): Contract management

**Key Features**:
1. **Simple Delegation**: Each method in [`DatabaseStorage`](server/storage.ts:468) simply forwards to the appropriate service
2. **Type Exports**: Re-exports helper functions like [`toDbNumeric`](server/storage.ts:57) for backward compatibility
3. **Singleton Instance**: Exports [`storage`](server/storage.ts:1083) instance for use in routes
4. **Complex Return Types**: Handles nested types with relations (e.g., `Item & { vendor: Vendor }`)

**Interface Highlights** ([`IStorage`](server/storage.ts:59)):
- 80+ method signatures covering all business operations
- Consistent patterns: `getX()`, `getXs()`, `createX()`, `updateX()`, `deleteX()`
- Advanced queries with filters and pagination
- Metrics and reporting methods with flexible date ranges and grouping

### [`server/objectStorage.ts`](server/objectStorage.ts:1)
**Purpose**: Google Cloud Storage integration for file upload/download via Replit's object storage service.

**Key Components**:

1. **Storage Client** ([lines 15-31](server/objectStorage.ts:15)):
   - Configured for Replit environment with sidecar authentication
   - Uses external account credentials pointing to local sidecar endpoint
   - Project ID empty (Replit manages this)

2. **[`ObjectStorageService`](server/objectStorage.ts:42) Class**:

   **Public Object Methods**:
   - [`getPublicObjectSearchPaths()`](server/objectStorage.ts:46): Reads `PUBLIC_OBJECT_SEARCH_PATHS` env var (comma-separated bucket paths)
   - [`searchPublicObject()`](server/objectStorage.ts:78): Searches multiple paths for a file, returns first match
   - [`downloadObject()`](server/objectStorage.ts:98): Streams file to HTTP response with appropriate cache headers
   
   **Upload Methods**:
   - [`getObjectEntityUploadURL()`](server/objectStorage.ts:134): Generates signed PUT URL for uploading
     - Uses first public path from search paths
     - Generates UUID for unique filename
     - 900-second (15 min) TTL for upload
   
   **Private Object Methods**:
   - [`getPrivateObjectDir()`](server/objectStorage.ts:66): Gets `PRIVATE_OBJECT_DIR` env var for private storage
   - [`getObjectEntityFile()`](server/objectStorage.ts:160): Retrieves file from private directory
   - [`normalizeObjectEntityPath()`](server/objectStorage.ts:186): Converts GCS URLs to normalized `/objects/` paths
   - [`trySetObjectEntityAclPolicy()`](server/objectStorage.ts:212): Sets ACL permissions on object
   - [`canAccessObjectEntity()`](server/objectStorage.ts:227): Checks user permissions for object access

**Helper Functions**:
- [`parseObjectPath()`](server/objectStorage.ts:244): Parses path into bucket name and object name
- [`signObjectURL()`](server/objectStorage.ts:265): Generates signed URL via Replit sidecar for GET/PUT/DELETE/HEAD operations

**Error Handling**:
- [`ObjectNotFoundError`](server/objectStorage.ts:33): Custom error for 404 scenarios

**Use Case in Application**:
- Item images are uploaded via this service
- Images compressed by Sharp before upload
- Public URLs returned for serving via `/public-objects/` routes
- ACL support for future private file features


---

## Server Services Layer

The services layer implements the **Domain-Driven Design** pattern, where each service encapsulates business logic for a specific domain. All services follow consistent patterns:
- Pure database operations (no HTTP concerns)
- Transaction management where needed
- Custom error throwing (NotFoundError, ConflictError)
- Type-safe returns with Drizzle ORM
- Referential integrity checks before deletions

### Authentication & User Management

#### [`server/services/auth.service.ts`](server/services/auth.service.ts:1)
**Purpose**: User authentication and management operations.

**Key Functions**:
- [`getUser()`](server/services/auth.service.ts:11): Fetch user by ID
- [`getUserByEmail()`](server/services/auth.service.ts:16): Lookup for login
- [`createUser()`](server/services/auth.service.ts:21): Hash password with bcrypt (10 rounds), create user with role defaulting to 'readOnly'
- [`updateUser()`](server/services/auth.service.ts:38): Update user fields, re-hash password if changed
- [`updateLastLogin()`](server/services/auth.service.ts:68): Track login timestamps
- [`getUsers()`](server/services/auth.service.ts:75): List all users ordered by creation date

**Security**: All password operations use bcrypt with proper salting.

### Core Business Entities

#### [`server/services/vendors.service.ts`](server/services/vendors.service.ts:1)
**Purpose**: Vendor (consignor) management.

**Key Functions**:
- Standard CRUD: [`getVendors()`](server/services/vendors.service.ts:10), [`getVendor()`](server/services/vendors.service.ts:14), [`createVendor()`](server/services/vendors.service.ts:19), [`updateVendor()`](server/services/vendors.service.ts:35)
- [`deleteVendor()`](server/services/vendors.service.ts:62): **Referential integrity checks**:
  - Prevents deletion if vendor has items ([line 73](server/services/vendors.service.ts:73))
  - Prevents deletion if vendor has payouts ([line 83](server/services/vendors.service.ts:83))
  - Prevents deletion if vendor has contracts ([line 93](server/services/vendors.service.ts:93))

#### [`server/services/clients.service.ts`](server/services/clients.service.ts:1)
**Purpose**: Client (customer) management.

**Key Functions**:
- Standard CRUD operations
- [`deleteClient()`](server/services/clients.service.ts:58): Prevents deletion if client has:
  - Payment records ([line 69](server/services/clients.service.ts:69))
  - Installment plans ([line 79](server/services/clients.service.ts:79))

#### [`server/services/brands.service.ts`](server/services/brands.service.ts:1)
**Purpose**: Product brand management with data migration support.

**Key Functions**:
- Standard CRUD with active/inactive status
- [`deleteBrand()`](server/services/brands.service.ts:52): Prevents deletion if referenced by items
- [`migrateLegacyBrands()`](server/services/brands.service.ts:79): **Data migration utility**
  - Finds unique brand names from legacy text field ([line 89](server/services/brands.service.ts:89))
  - Creates brand records for each unique name
  - Updates items to reference new brand IDs
  - Returns migration statistics (created, updated, skipped)

#### [`server/services/categories.service.ts`](server/services/categories.service.ts:1)
**Purpose**: Item category management.

**Features**: Similar pattern to brands - CRUD with referential integrity checks.

#### [`server/services/paymentMethods.service.ts`](server/services/paymentMethods.service.ts:1)
**Purpose**: Payment method type management (cash, card, transfer, etc.).

**Delete Protection** ([line 66](server/services/paymentMethods.service.ts:66)): Prevents deletion if used in any payments (checks by name, not ID).

### Inventory & Items

#### [`server/services/items.service.ts`](server/services/items.service.ts:1)
**Purpose**: Core inventory management with complex business logic.

**Key Functions**:
1. **CRUD Operations**:
   - [`getItems()`](server/services/items.service.ts:14): List all items with vendor join, optional vendor filter
   - [`getItem()`](server/services/items.service.ts:36): Single item with vendor details
   - [`createItem()`](server/services/items.service.ts:53): Uses helper functions for numeric/date conversion
   - [`updateItem()`](server/services/items.service.ts:78): Partial updates with type conversions
   - [`deleteItem()`](server/services/items.service.ts:113): Checks for related payments, payouts, and expenses

2. **Analytics Functions**:
   - [`getRecentItems()`](server/services/items.service.ts:159): Last N items added
   - [`getTopPerformingItems()`](server/services/items.service.ts:176): **Profit-based ranking**
     - Calculates: `revenue (SUM of payments) - cost (minCost)`
     - Only includes sold items
     - Returns items with calculated profit field
   - [`getPendingPayouts()`](server/services/items.service.ts:203): Sold items not fully paid to vendor
     - Filters where: `SUM(vendor payouts) < minCost`

**Status Flow**: `in-store` → `reserved` (partial payment) → `sold` (full payment) or `returned-to-vendor`

### Financial Transactions

#### [`server/services/payments.service.ts`](server/services/payments.service.ts:1)
**Purpose**: Client payment processing with automatic item status updates.

**Key Functions**:
1. [`createPayment()`](server/services/payments.service.ts:47): **Transaction-based with business logic**
   - Verifies item and client exist
   - Creates payment record
   - Calculates total paid for item
   - **Automatic status updates**:
     - If fully paid → status = `sold` ([line 92](server/services/payments.service.ts:92))
     - If partially paid → status = `reserved` ([line 98](server/services/payments.service.ts:98))
   - All wrapped in database transaction

2. [`getPaymentMethodBreakdown()`](server/services/payments.service.ts:171): **Analytics**
   - Groups payments by method within date range
   - Calculates totals, counts, percentages, and averages
   - Returns payment method distribution

#### [`server/services/payouts.service.ts`](server/services/payouts.service.ts:1)
**Purpose**: Vendor payout management with complex payout calculations.

**Key Functions**:
1. [`createPayout()`](server/services/payouts.service.ts:29): Transaction-based payout creation
   - Verifies item and vendor
   - Creates payout record
   - Calculates cumulative payouts

2. [`getUpcomingPayouts()`](server/services/payouts.service.ts:94): **Complex payout calculation**
   - For all sold items, calculates:
     - **Vendor payout formula** ([lines 143-146](server/services/payouts.service.ts:143)):
       ```
       Payout = (1 - ((MaxSalesPrice - ActualSalesPrice) × 0.01)) × MaxCost
       ```
     - Remaining balance = target payout - total paid
     - Payment progress = client payments / sale price × 100
   - Filters to show only items with remaining balance > 0
   - Returns comprehensive payout status for each item

3. [`getPayoutMetrics()`](server/services/payouts.service.ts:186): Aggregate payout statistics
   - Total payouts paid, amounts, averages
   - Pending/upcoming payout counts
   - Monthly trend comparison (last 30 days vs previous 30 days)

#### [`server/services/expenses.service.ts`](server/services/expenses.service.ts:1)
**Purpose**: Item-related expense tracking.

**Note**: Expense table uses `expenseDate` field (line 16 references this, though schema shows `incurredAt`).

**Functions**: Basic CRUD - get all expenses, get by item, create expense.

#### [`server/services/installments.service.ts`](server/services/installments.service.ts:1)
**Purpose**: Payment plan management for clients.

**Key Functions**:
1. **CRUD Operations**: Full installment plan management with item/client verification
2. [`markInstallmentPaid()`](server/services/installments.service.ts:157): 
   - Adds paid amount to cumulative total
   - Auto-updates status to "paid" when fully paid
3. [`sendPaymentReminder()`](server/services/installments.service.ts:182): Placeholder for reminder system (returns true)
4. [`getUpcomingPayments()`](server/services/installments.service.ts:197): Pending payments due within 7 days
5. [`getOverduePayments()`](server/services/installments.service.ts:226): Pending payments past due date

### Analytics & Reporting

#### [`server/services/dashboard.service.ts`](server/services/dashboard.service.ts:1)
**Purpose**: High-level business metrics for dashboard display.

**Key Functions**:
1. [`getDashboardMetrics()`](server/services/dashboard.service.ts:10): **Comprehensive business overview**
   - Total revenue (all payments)
   - Active items count (in-store + reserved)
   - Pending payouts (min/max ranges based on cost ranges)
   - Net profit (min/max: revenue - costs - expenses)
   - Incoming payments (sum of unpaid installment balances)
   - Cost and inventory value ranges

2. [`getFinancialDataByDateRange()`](server/services/dashboard.service.ts:131): **Period-based financial analysis**
   - Revenue, costs, profit for date range
   - Items sold (based on first payment date)
   - Average order value
   - Total expenses in period

3. [`getLuxetteInventoryData()`](server/services/dashboard.service.ts:200): **Vendor-specific inventory**
   - Finds vendor by name pattern (`LIKE '%luxette%'`)
   - Returns in-store inventory stats for that vendor

#### [`server/services/metrics.service.ts`](server/services/metrics.service.ts:1)
**Purpose**: Payment and installment metrics calculation.

**Key Function**: [`getPaymentMetrics()`](server/services/metrics.service.ts:10)
- Total payments received (count and amount)
- Overdue installments count (past due date, still pending)
- Upcoming installments (due in next 30 days)
- Average payment amount
- Monthly trend (% change vs previous 30 days)

#### [`server/services/financialHealth.service.ts`](server/services/financialHealth.service.ts:1)
**Purpose**: Calculate overall business financial health score.

**Key Function**: [`getFinancialHealthScore()`](server/services/financialHealth.service.ts:9)

**Scoring System** (100 points total):
1. **Payment Timeliness** (25 points): Based on overdue rate
   - Lower overdue % = higher score
   - Recommendation if > 20% overdue

2. **Cash Flow** (25 points): Inflow vs outflow ratio (last 30 days)
   - Ratio of client payments / vendor payouts
   - Recommendation if negative cash flow

3. **Inventory Turnover** (20 points): Sold / (Sold + Active)
   - Measures how quickly inventory moves
   - Recommendation if < 30%

4. **Profit Margin** (20 points): (Revenue - Costs) / Revenue
   - Net profitability percentage
   - Recommendation if < 20%

5. **Client Retention** (10 points): Repeat customers / Total customers
   - Clients with > 1 purchase
   - Recommendation if < 30%

**Grading**: A+ (90+), A (80+), B (70+), C (60+), D (50+), F (<50)
**Output**: Score, grade, factor breakdown, actionable recommendations

#### [`server/services/bi.service.ts`](server/services/bi.service.ts:1)
**Purpose**: **Advanced business intelligence** with complex aggregations and filtering.

This is the most sophisticated service, providing deep analytical capabilities:

**Key Functions**:

1. [`getReportKPIs()`](server/services/bi.service.ts:13): **Comprehensive KPI Dashboard**
   - Revenue, COGS, gross profit & margin
   - Net profit & margin (after expenses)
   - Items sold, payment count, unique clients
   - Average order value
   - Average days to sell (from creation to first payment)
   - Inventory turnover (COGS / avg inventory value)
   - Supports full filter suite (vendors, clients, brands, categories, statuses)

2. [`getTimeSeries()`](server/services/bi.service.ts:150): **Time-series analytics**
   - Metrics: revenue, profit, itemsSold, payments
   - Granularity: day, week, month
   - Returns array of {period, value, count}
   - Grouped by date with proper SQL date formatting

3. [`getGroupedMetrics()`](server/services/bi.service.ts:243): **Dimensional analysis**
   - Group by: brand, vendor, client, or category
   - Metrics: revenue, profit, itemsSold, avgOrderValue
   - Returns top performers by revenue
   - Flexible metric selection

4. [`getItemProfitability()`](server/services/bi.service.ts:340): **Item-level profitability**
   - Paginated results (limit/offset)
   - Per-item: revenue, cost, profit, margin
   - Days to sell calculation
   - Sorted by profit (highest first)
   - Returns total count for pagination UI

5. [`getInventoryHealth()`](server/services/bi.service.ts:437): **Inventory analysis**
   - Status breakdown (in-store, reserved, sold, partial-paid)
   - Total inventory value
   - Average days in inventory
   - **Category breakdown**: items, value, avg age per category
   - **Aging analysis**: Buckets items by age:
     - Under 30 days
     - 30-90 days
     - 90-180 days
     - Over 180 days

**Filter Architecture**: Uses utility functions from [`filters.ts`](server/services/utils/filters.ts:1) for consistent filtering across all BI queries.

### Contract Management

#### [`server/services/contractTemplates.service.ts`](server/services/contractTemplates.service.ts:1)
**Purpose**: Reusable contract template management.

**Key Features**:
1. **Default Template Management**:
   - [`getDefaultContractTemplate()`](server/services/contractTemplates.service.ts:100): Get current default
   - [`ensureDefaultContractTemplate()`](server/services/contractTemplates.service.ts:113): **Auto-creates default** if missing
     - Spanish consignment contract template ([lines 122-161](server/services/contractTemplates.service.ts:122))
     - Includes template variables for customization
     - Metadata tracks available sections and variables
   - [`setDefaultTemplate()`](server/services/contractTemplates.service.ts:192): Change default (unsets others)

2. **Template Protection**:
   - [`deleteContractTemplate()`](server/services/contractTemplates.service.ts:83): Cannot delete default template

3. **Automatic Default Management**: When creating/updating templates with `isDefault: true`, automatically unsets all other defaults

#### [`server/services/contracts.service.ts`](server/services/contracts.service.ts:1)
**Purpose**: Vendor contract creation and management.

**Key Functions**:
1. [`createContract()`](server/services/contracts.service.ts:68): **Transaction-based**
   - Verifies vendor and optional template exist
   - Stores item snapshots (JSONB array) - immutable record of items at contract time
   - Default status: `draft`

2. [`updateContract()`](server/services/contracts.service.ts:112): Update contract fields including item snapshots

3. [`deleteContract()`](server/services/contracts.service.ts:143): **Protection**
   - Cannot delete contracts with status `final`
   - Only draft contracts can be deleted

4. Query functions return contracts with vendor and template relations

### Utility Services

#### [`server/services/utils/errors.ts`](server/services/utils/errors.ts:1)
**Purpose**: Standardized error types for consistent error handling.

**Error Classes**:
- [`NotFoundError`](server/services/utils/errors.ts:5): Entity not found (404)
- [`ValidationError`](server/services/utils/errors.ts:12): Data validation failed (400)
- [`ConflictError`](server/services/utils/errors.ts:19): Referential integrity or duplicate key (409)

**Helper**: [`handleDatabaseError()`](server/services/utils/errors.ts:26) - Converts PostgreSQL errors to custom error types

#### [`server/services/utils/db-helpers.ts`](server/services/utils/db-helpers.ts:1)
**Purpose**: Type conversion helpers for Drizzle ORM.

**Functions**:
- [`toDbNumeric()`](server/services/utils/db-helpers.ts:5): Convert to string with 2 decimals (required)
- [`toDbNumericOptional()`](server/services/utils/db-helpers.ts:10): Nullable numeric conversion
- [`toDbDate()`](server/services/utils/db-helpers.ts:15): ISO date string (YYYY-MM-DD)
- [`toDbDateOptional()`](server/services/utils/db-helpers.ts:21): Nullable date conversion
- [`toDbTimestamp()`](server/services/utils/db-helpers.ts:27): Date object conversion

**Why Needed**: PostgreSQL `numeric` type in Drizzle requires string representation for precision.

#### [`server/services/utils/filters.ts`](server/services/utils/filters.ts:1)
**Purpose**: Reusable filter builders for BI and reporting queries.

**Key Exports**:
- [`CommonFilters`](server/services/utils/filters.ts:8) interface: Standard filter set (vendors, clients, brands, categories, statuses, dates)
- [`applyItemFilters()`](server/services/utils/filters.ts:18): Build item table filters
- [`applyPaymentFilters()`](server/services/utils/filters.ts:40): Build payment table filters
- [`applyDateRange()`](server/services/utils/filters.ts:58): Date range conditions
- [`buildFilterCondition()`](server/services/utils/filters.ts:72): Combine conditions with AND

**Pattern**: Returns array of SQL conditions that can be spread into WHERE clauses.

#### [`server/services/utils/joins.ts`](server/services/utils/joins.ts:1)
**Purpose**: Common join patterns and SQL helpers.

**Select Builders**: Pre-defined select objects for common joins:
- [`itemWithVendorSelect`](server/services/utils/joins.ts:8): Item + vendor
- [`itemWithAllRelationsSelect`](server/services/utils/joins.ts:13): Item + vendor + brand + category
- [`paymentWithRelationsSelect`](server/services/utils/joins.ts:20): Payment + item + vendor + client
- And more...

**SQL Helpers**:
- [`daysBetween()`](server/services/utils/joins.ts:48): Calculate day difference between columns
- [`formatDateForGrouping()`](server/services/utils/joins.ts:55): Format dates for day/week/month grouping


---

## Server Utilities & Infrastructure

### [`server/vite.ts`](server/vite.ts:1)
**Purpose**: Vite development server integration and static file serving for production.

**Key Functions**:

1. [`log()`](server/vite.ts:11): Custom logging utility with formatted timestamps
   - Format: `HH:MM:SS AM/PM [source] message`
   - Used throughout server for consistent logging

2. [`setupVite()`](server/vite.ts:22): **Development mode Vite integration**
   - Creates Vite dev server in middleware mode
   - Enables HMR (Hot Module Replacement) over existing HTTP server
   - Custom logger that exits on error
   - Catch-all route ([line 44](server/vite.ts:44)):
     - Reads `index.html` from disk on each request (for live updates)
     - Adds cache-busting query param to main.tsx ([line 58](server/vite.ts:58))
     - Transforms HTML through Vite (handles ES modules, HMR injection)
   - Integrates with existing Express server

3. [`serveStatic()`](server/vite.ts:70): **Production mode static file serving**
   - Serves built files from `dist/public`
   - Validates build directory exists
   - SPA fallback: All unmatched routes serve `index.html`

**Usage**: Called from [`server/index.ts`](server/index.ts:82) based on `NODE_ENV`.

### [`server/objectAcl.ts`](server/objectAcl.ts:1)
**Purpose**: **Framework for object-level ACL** (Access Control Lists) on Google Cloud Storage files.

**Status**: Infrastructure code - not currently used in application, but provides extensibility for future access control needs.

**Key Components**:

1. **Enums & Interfaces**:
   - [`ObjectAccessGroupType`](server/objectAcl.ts:15): Empty enum - ready for custom group types
   - [`ObjectAccessGroup`](server/objectAcl.ts:18): Group type + ID structure
   - [`ObjectPermission`](server/objectAcl.ts:38): READ or WRITE
   - [`ObjectAclRule`](server/objectAcl.ts:43): Group + permission pairing
   - [`ObjectAclPolicy`](server/objectAcl.ts:52): Owner, visibility (public/private), and ACL rules

2. **Core Functions**:
   - [`setObjectAclPolicy()`](server/objectAcl.ts:106): Stores ACL as JSON in object metadata
   - [`getObjectAclPolicy()`](server/objectAcl.ts:123): Retrieves and parses ACL from metadata
   - [`canAccessObject()`](server/objectAcl.ts:135): **Permission checker**
     - Public objects allow read access
     - Owner always has access
     - Checks ACL rules for user membership
     - Supports permission hierarchy (WRITE includes READ)

3. **Abstract Class**: [`BaseObjectAccessGroup`](server/objectAcl.ts:75)
   - Template for implementing custom access groups
   - Examples in comments: USER_LIST, EMAIL_DOMAIN, GROUP_MEMBER, SUBSCRIBER

**Future Use Cases**: 
- Private client documents
- Vendor-specific file access
- Team collaboration features
- Subscription-based content

---

## Client Application

### Core Structure

#### [`client/src/main.tsx`](client/src/main.tsx:1)
**Purpose**: React application entry point.

**Simple Bootstrap**:
- Creates React root on `#root` element
- Renders [`<App />`](client/src/App.tsx:88) component
- Imports global CSS ([`index.css`](client/src/index.css:1))

#### [`client/src/App.tsx`](client/src/App.tsx:1)
**Purpose**: Main application wrapper with provider stack and routing.

**Provider Stack** (outermost to innermost):
1. [`QueryClientProvider`](client/src/App.tsx:90): TanStack Query for server state
2. [`ThemeProvider`](client/src/App.tsx:91): Dark/light theme support
3. [`TooltipProvider`](client/src/App.tsx:92): Radix UI tooltip context
4. [`AuthProvider`](client/src/App.tsx:93): Authentication state management
5. [`Toaster`](client/src/App.tsx:94): Toast notifications

**Components**:
1. [`LoadingScreen()`](client/src/App.tsx:28): Branded loading state
   - Shows LUXETTE logo with crown icon
   - Gradient amber theme
   - Spinning loader animation

2. [`Router()`](client/src/App.tsx:47): **Application routes** (using Wouter)
   - `/` - Dashboard
   - `/inventory` - Item list
   - `/item/:id` - Item details
   - `/vendors` - Vendor list
   - `/vendor/:vendorId` - Vendor details
   - `/clients` - Client list
   - `/client/:clientId` - Client details
   - `/contracts` - Contract management
   - `/payments` - Payment tracking
   - `/payouts` - Vendor payouts
   - `/expenses` - Expense management
   - `/reports` - BI reports
   - `/profitability` - Profitability analysis
   - `/settings` - Application settings
   - `/user-management` - User admin (admin only)
   - Catch-all: 404 page

3. [`AuthenticatedApp()`](client/src/App.tsx:70): **Authentication gate**
   - Shows loading screen while checking auth
   - Redirects to login if not authenticated
   - Wraps routes with [`ProtectedRoute`](client/src/components/ProtectedRoute.tsx:1) for additional checks

**Routing Library**: [Wouter](https://github.com/molefrog/wouter) - lightweight React router (~1.5KB)

### Authentication System

#### [`client/src/contexts/AuthContext.tsx`](client/src/contexts/AuthContext.tsx:1)
**Purpose**: Client-side authentication state management.

**Context API**:
- [`User`](client/src/contexts/AuthContext.tsx:4) interface: id, email, name, role, active
- [`AuthContextType`](client/src/contexts/AuthContext.tsx:12): Complete auth interface
- [`useAuth()`](client/src/contexts/AuthContext.tsx:23) hook: Access auth context from components

**Key Features**:

1. **Initial Authentication Check** ([line 40](client/src/contexts/AuthContext.tsx:40)):
   - On app load, calls `/api/auth/me`
   - Sets user state if valid session exists
   - Handles silent failures (no redirect on network errors)

2. [`login()`](client/src/contexts/AuthContext.tsx:62):
   - Posts credentials to `/api/auth/login`
   - Sets user state on success
   - **Invalidates all queries** to refresh data with authenticated context
   - Throws user-friendly error messages

3. [`logout()`](client/src/contexts/AuthContext.tsx:79):
   - Calls `/api/auth/logout` endpoint
   - Clears user state even if server request fails
   - **Clears entire React Query cache** to remove sensitive data

4. [`hasRole()`](client/src/contexts/AuthContext.tsx:93): **Role-based access control**
   - Role hierarchy: admin (3) > staff (2) > readOnly (1)
   - Returns true if user's role meets or exceeds required role
   - Used for UI conditional rendering and feature gating

**Session Management**:
- Uses cookies (`credentials: 'include'`)
- No JWT handling in client (session managed server-side)
- Automatic session refresh through `/api/auth/me`


### Client Libraries & Hooks

#### [`client/src/lib/queryClient.ts`](client/src/lib/queryClient.ts:1)
**Purpose**: Centralized API client and TanStack Query configuration.

**Key Exports**:

1. [`apiRequest()`](client/src/lib/queryClient.ts:10): Universal API wrapper
   - Parameters: method, URL, optional data
   - Always includes credentials (for session cookies)
   - Sets JSON content-type when sending data
   - Throws on non-OK responses with error details

2. [`getQueryFn()`](client/src/lib/queryClient.ts:27): Query function factory
   - Configurable 401 behavior: `returnNull` or `throw`
   - Uses query key as URL path (enables automatic cache key generation)
   - Includes credentials for authenticated requests

3. [`queryClient`](client/src/lib/queryClient.ts:44): **Global QueryClient instance**
   - Default query function with 401 → throw
   - **No refetching**: `refetchInterval: false`, `refetchOnWindowFocus: false`
   - **Infinite stale time**: Data never considered stale automatically
   - **No retries**: Fails immediately
   - Strategy: Manual cache invalidation after mutations

**Query Pattern**: Query keys double as URL paths (e.g., `['/api/items']` fetches from `/api/items`)

#### [`client/src/lib/utils.ts`](client/src/lib/utils.ts:1)
**Purpose**: Utility functions for the client.

**Key Export**: [`cn()`](client/src/lib/utils.ts:4) - Combines clsx and tailwind-merge for conditional className composition.

#### [`client/src/hooks/use-toast.ts`](client/src/hooks/use-toast.ts:1)
**Purpose**: Toast notification system (shadcn/ui pattern).

**Architecture**:
- **Reducer Pattern**: State managed through actions (ADD, UPDATE, DISMISS, REMOVE)
- **Memory State**: Shared state across all components ([`memoryState`](client/src/hooks/use-toast.ts:131))
- **Listener Pattern**: Components subscribe to state changes
- **Auto-dismiss**: Configurable delay ([`TOAST_REMOVE_DELAY`](client/src/hooks/use-toast.ts:9) = 1,000,000ms ≈ 16 minutes)
- **Limit**: Shows 1 toast at a time ([`TOAST_LIMIT`](client/src/hooks/use-toast.ts:8))

**Usage**: `const { toast } = useToast(); toast({ title, description, variant })`

#### [`client/src/hooks/use-mobile.tsx`](client/src/hooks/use-mobile.tsx:1)
**Purpose**: Responsive breakpoint detection hook.

**Features**:
- Breakpoint: 768px ([`MOBILE_BREAKPOINT`](client/src/hooks/use-mobile.tsx:3))
- Uses `matchMedia` API for real-time updates
- Returns boolean: `true` if mobile, `false` if desktop
- Properly cleans up event listeners

#### [`client/src/components/ProtectedRoute.tsx`](client/src/components/ProtectedRoute.tsx:1)
**Purpose**: Role-based route protection component.

**Features**:
- Default required role: `readOnly` (accessible to all authenticated users)
- Uses [`hasRole()`](client/src/components/ProtectedRoute.tsx:33) from auth context for hierarchy checking
- Customizable fallback UI (default: Spanish "Access Denied" message)
- Returns null if not authenticated (handled by parent App component)

**Use Case**: Wrap individual routes or page sections requiring specific permissions.

### Layout Components

#### [`client/src/components/theme-provider.tsx`](client/src/components/theme-provider.tsx:1)
Simple re-export of `next-themes` ThemeProvider.

#### [`client/src/hooks/use-theme.tsx`](client/src/hooks/use-theme.tsx:1)
**Purpose**: Custom theme management (appears to be duplicate of next-themes functionality).

**Features**:
- Supports: `dark`, `light`, `system`
- LocalStorage key: `luxe-consign-theme`
- System theme detection via `prefers-color-scheme`
- Adds/removes class on document root

**Note**: App uses `next-themes` in App.tsx, this hook may be legacy code.

#### [`client/src/components/layout/main-layout.tsx`](client/src/components/layout/main-layout.tsx:1)
**Purpose**: Page layout wrapper with responsive navigation.

**Structure**:
- Desktop: Sidebar on left, header + content on right
- Mobile: Hidden sidebar, bottom navigation
- Props: title, optional subtitle, children
- Responsive padding: 16px mobile, 32px desktop
- Fixed bottom padding (64px) for mobile nav clearance

#### [`client/src/components/layout/sidebar.tsx`](client/src/components/layout/sidebar.tsx:1)
**Purpose**: Desktop navigation sidebar (hidden on mobile).

**Features**:

1. **Branding Section** ([lines 59-69](client/src/components/layout/sidebar.tsx:59)):
   - Luxette logo with gradient background
   - "Sistema de Gestión" subtitle

2. **Navigation Structure** ([`navigation`](client/src/components/layout/sidebar.tsx:23)):
   - **Panel Principal** (Dashboard)
   - **Operación**: Inventario, Consignadores, Clientes, Contratos
   - **Finanzas**: Pagos Entrantes, Pagos Salientes, Gastos
   - **Analítica**: Reportes, Rentabilidad
   - **Configuración**
   - **Usuarios** (admin only, conditional render [line 116](client/src/components/layout/sidebar.tsx:116))

3. **User Profile** ([lines 134-159](client/src/components/layout/sidebar.tsx:134)):
   - Shows current user name and role
   - Logout button (red, destructive styling)
   - Role display in Spanish

**Styling**: Active route highlighted with primary color, hover effects on all items.

#### [`client/src/components/layout/header.tsx`](client/src/components/layout/header.tsx:1)
**Purpose**: Page header with search and utilities.

**Features**:
- Dynamic title and subtitle from props
- **Search Bar**: Global search input (UI only, no backend integration yet)
- **Notifications**: Bell icon with badge (hardcoded "3")
- **Theme Toggle**: Sun/moon icon, toggles between light/dark

**Note**: Search functionality appears to be a placeholder (no search logic implemented).

#### [`client/src/components/layout/bottom-nav.tsx`](client/src/components/layout/bottom-nav.tsx:1)
**Purpose**: Mobile-only bottom navigation bar.

**Features**:
- Fixed at bottom, z-index 50
- **Quick Access** ([`bottomNavItems`](client/src/components/layout/bottom-nav.tsx:17)): Dashboard, Inventory, Vendors, Clients
- **More Menu**: Sheet drawer that shows full sidebar
- Active route highlighting
- Touch-friendly 48px minimum height
- Hidden on desktop (md breakpoint and up)

### Feature Components

#### [`client/src/components/ImageUploader.tsx`](client/src/components/ImageUploader.tsx:1)
**Purpose**: Reusable image upload component with drag-and-drop.

**Features**:

1. **Upload Methods**:
   - Click to select file
   - Drag and drop
   - File input hidden, triggered programmatically

2. **Validations**:
   - File type: Must be image/* ([line 30](client/src/components/ImageUploader.tsx:30))
   - File size: Configurable max (default 10MB)
   - Clear error messages via toast

3. **Upload Process** ([`handleFileSelect`](client/src/components/ImageUploader.tsx:28)):
   - Creates FormData with image
   - Posts to `/api/upload-image`
   - Server compresses/optimizes (Sharp)
   - Receives public URL
   - Calls `onImageUploaded` callback

4. **UI States**:
   - **Empty**: Dashed border drop zone with instructions
   - **Uploading**: Loading spinner with "Compressing and optimizing" message
   - **Uploaded**: Image preview with hover overlay
     - Change button (re-upload)
     - Remove button (clear image)

5. **Props**:
   - `onImageUploaded`: Callback with URL
   - `currentImageUrl`: Show existing image
   - `onImageRemoved`: Callback when removed
   - `maxFileSizeMB`: Size limit

**Drag & Drop**: Full drag state management with visual feedback.

#### [`client/src/components/ContractPDF.tsx`](client/src/components/ContractPDF.tsx:1)
**Purpose**: PDF contract generation using React-PDF.

**Key Features**:

1. **Styling** ([`styles`](client/src/components/ContractPDF.tsx:5)): Comprehensive PDF stylesheet
   - Professional layout with margins, borders, typography
   - Helvetica font family
   - Header, sections, signature boxes, footer
   - Responsive positioning

2. **Document Structure**:
   - **Header** ([lines 161-168](client/src/components/ContractPDF.tsx:161)):
     - LUXETTE branding
     - "Boutique de Consignación de Lujo" subtitle
     - Contract number (first 8 chars of ID)
     - Contract date in Spanish format
   
   - **Vendor Information** ([lines 171-212](client/src/components/ContractPDF.tsx:171)):
     - All vendor details (name, email, phone, tax ID)
     - Bank information (conditional on data availability)
   
   - **Items Table** ([lines 215-232](client/src/components/ContractPDF.tsx:215)):
     - Iterates over `itemSnapshots` from contract
     - Shows: index, title, brand, model, market value
   
   - **Terms** ([lines 235-240](client/src/components/ContractPDF.tsx:235)):
     - Contract terms text
   
   - **Signatures** ([lines 243-257](client/src/components/ContractPDF.tsx:243)):
     - Two signature boxes (vendor and Luxette)
     - Signature lines with labels
   
   - **Footer** ([lines 260-262](client/src/components/ContractPDF.tsx:260)):
     - Company info and legal disclaimer

3. **Input**: Contract with vendor relation and item snapshots
4. **Output**: A4 format PDF ready for download or storage

#### [`client/src/components/status-update-dropdown.tsx`](client/src/components/status-update-dropdown.tsx:1)
**Purpose**: Inline item status updater with visual feedback.

**Status Configuration** ([`statusConfig`](client/src/components/status-update-dropdown.tsx:28)):
- `in-store`: Blue badge, Package icon
- `reserved`: Yellow badge, Clock icon
- `sold`: Green badge, CheckCircle icon
- `returned-to-vendor`: Red badge, RotateCcw icon

**Features**:

1. **Dropdown UI**:
   - Current status shown as colored badge with icon
   - Click to open status menu
   - Disabled states for current status and during mutation

2. **Status Update Flow**:
   - PATCH request to `/api/items/:id/status`
   - Success: Toast notification, invalidates queries
   - Invalidates: items list, individual item, dashboard metrics
   - Callback: `onStatusChange` for parent component updates

3. **Helper Export**: [`getStatusBadge()`](client/src/components/status-update-dropdown.tsx:126) - Renders status badge without dropdown

**Use Case**: Quick status changes from inventory lists or item detail pages.

#### [`client/src/components/TemplateBuilder.tsx`](client/src/components/TemplateBuilder.tsx:1)
**Purpose**: Interactive contract template editor with variable system.

**Variable System**:

1. **[`TEMPLATE_VARIABLES`](client/src/components/TemplateBuilder.tsx:37)**: 15 predefined variables
   - **Vendor**: Name, email, phone, tax ID, bank details
   - **Items**: `{{ITEMS_TABLE}}`, `{{ITEMS_COUNT}}`
   - **Terms**: Commission %, payment terms, consignment period, withdrawal notice
   - **System**: Contract date, contract ID

2. **Categories**: Each category has:
   - Icon (User, Package, FileText, Settings)
   - Color coding (blue, green, purple, orange)

**UI Features**:

1. **Two-Column Layout**:
   - Left (2/3): Editor and preview
   - Right (1/3): Variables panel

2. **Editor Tab** ([lines 278-294](client/src/components/TemplateBuilder.tsx:278)):
   - Textarea for template content
   - Monospace font for readability
   - Click variable to insert at cursor position
   - Alert with usage instructions

3. **Preview Tab** ([lines 296-303](client/src/components/TemplateBuilder.tsx:296)):
   - Live preview with sample data
   - Variables replaced with realistic examples
   - Scrollable area for long templates

4. **Variables Panel** ([lines 322-520](client/src/components/TemplateBuilder.tsx:322)):
   - Collapsible sections by category
   - Click variable to insert
   - Copy button on hover
   - Visual feedback when copied (checkmark)
   - Examples shown for each variable

5. **Template Settings**:
   - Name input
   - "Set as default" switch
   - Save/Cancel buttons

**Sample Data** ([`SAMPLE_DATA`](client/src/components/TemplateBuilder.tsx:62)): Realistic Mexican vendor data for preview.

**Props**:
- `template`: Optional existing template for editing
- `onSave`: Callback with {name, termsText, isDefault}
- `onCancel`: Optional cancel callback


---

## Client Pages

The application has 16 pages covering all business operations. All pages follow consistent patterns:
- Use [`MainLayout`](client/src/components/layout/main-layout.tsx:1) wrapper
- TanStack Query for data fetching
- React Hook Form with Zod validation
- Responsive design (mobile-first)
- Toast notifications for user feedback
- Optimistic UI updates via query invalidation

### Authentication

#### [`client/src/pages/login.tsx`](client/src/pages/login.tsx:1)
**Purpose**: User authentication page.

**Features**:
- Branded LUXETTE design with crown icon and amber gradient
- Email/password form with show/hide password toggle
- Form validation (required fields, email format)
- Error display for failed login attempts
- Automatic redirect after successful login
- Spanish UI text
- Loading states during authentication

**Flow**: Submit credentials → AuthContext.login() → Set session → Navigate to dashboard

### Dashboard & Overview

#### [`client/src/pages/dashboard.tsx`](client/src/pages/dashboard.tsx:1)
**Purpose**: Main dashboard with business overview and quick actions.

**Data Fetched**:
- Dashboard metrics (revenue, items, payouts, profit)
- Recent items
- Top performing items
- Recent payments
- Payment metrics
- Luxette vendor inventory
- Financial data by date range

**Key Features**:
1. **5 Metric Cards** ([lines 303-464](client/src/pages/dashboard.tsx:303)):
   - Sales this month
   - Products in sale
   - Incoming/outgoing money comparison
   - Merchandise value with cost range
   - Luxette-specific inventory card

2. **Revenue Visualizer** ([lines 469-585](client/src/pages/dashboard.tsx:469)):
   - Date range selector (7/30/90/365 days)
   - Revenue, costs, profit breakdown
   - Items sold, average order value
   - Cost breakdown (items + expenses)

3. **Quick Actions** ([lines 587-672](client/src/pages/dashboard.tsx:587)):
   - Add item, record payment, process payout, add vendor
   - **Attention Required** section shows:
     - Overdue payments count
     - Upcoming payments count
     - Pending payouts range

**Helper Functions**: Currency formatting (normal and abbreviated), date formatting, status badges

### Inventory Management

#### [`client/src/pages/inventory.tsx`](client/src/pages/inventory.tsx:1) (1623 lines!)
**Purpose**: Comprehensive inventory management with sale recording.

**Features**:

1. **Metrics Dashboard** ([lines 591-682](client/src/pages/inventory.tsx:591)):
   - Total items, in-store, reserved, Luxette stats, total value

2. **Filters & Search** ([lines 685-761](client/src/pages/inventory.tsx:685)):
   - Text search (title, brand, model, vendor)
   - Status filter (all, in-store, reserved, sold, returned)
   - Brand filter (from active brands)
   - Category filter (from active categories)
   - Sort options (newest, oldest, price high/low, brand A-Z)

3. **Item Creation Dialog** ([lines 764-1136](client/src/pages/inventory.tsx:764)):
   - Complete item form with validation
   - Vendor, brand, category selection
   - Title, model, serial number, condition
   - Min/max cost and sales price with range validation
   - Acquisition date
   - **Image upload integration** ([lines 1106-1114](client/src/pages/inventory.tsx:1106))
   - Status selection

4. **Item List Display** ([lines 1142-1347](client/src/pages/inventory.tsx:1142)):
   - Card-based layout with item image
   - Status badge with inline update dropdown
   - Price ranges displayed
   - Vendor, date, condition metadata
   - **Sell button** for in-store items
   - View, edit, delete actions (desktop)
   - Mobile dropdown actions

5. **Sale Recording Modal** ([lines 1363-1620](client/src/pages/inventory.tsx:1363)):
   - Shows item being sold
   - Client selection
   - **Payment Type**: Full or Installment
   - Payment amount and method
   - **Installment Plan Builder**:
     - Dynamic installment rows (add/remove)
     - Amount and due date per installment
     - Real-time remaining balance calculator
   - **Transaction Logic**:
     - Full payment → Create payment + set status "sold"
     - Installment → Set status "reserved" + create first payment + create installment plans

**Mobile Features**: FAB (Floating Action Button) for quick add

#### [`client/src/pages/item-details.tsx`](client/src/pages/item-details.tsx:1) (1673 lines!)
**Purpose**: Detailed item view with full transaction history and management.

**Sections**:

1. **Item Overview** ([lines 952-1067](client/src/pages/item-details.tsx:952)):
   - Image and basic info with status dropdown
   - Vendor details
   - Acquisition and listing dates
   - **Financial Summary Card**:
     - Sales price, cost range
     - Total payments, total expenses
     - Remaining balance (min/max range)
     - Estimated profit (min/max range)

2. **Payment History** ([lines 1072-1116](client/src/pages/item-details.tsx:1072)):
   - All payments for this item
   - Shows client, payment method, date, amount

3. **Expense Management** ([lines 1119-1278](client/src/pages/item-details.tsx:1119)):
   - Add expense dialog with types (Authentication, Cleaning, Repair, Photography, etc.)
   - Expense history with type badges
   - Debug logging for troubleshooting

4. **Upcoming Payments** ([lines 1281-1353](client/src/pages/item-details.tsx:1281)):
   - Only shown if item has installment plans
   - Shows pending installments with due dates
   - **Actions per installment**:
     - Mark as Paid button
     - Edit button (opens edit modal)
     - Split button (splits into two installments)

5. **Installment Edit Modal** ([lines 1356-1493](client/src/pages/item-details.tsx:1356)):
   - Edit mode: Change amount and due date
   - Split mode: Create two installments from one
   - **Balance validation**: Prevents total upcoming < remaining balance
   - Delete button for installments

6. **Invoice Generator** ([lines 1498-1673](client/src/pages/item-details.tsx:1498)):
   - Professional invoice layout
   - Company branding
   - Client and item details
   - Payment schedule table
   - Terms and conditions
   - Print/download functionality

### Vendor Management

#### [`client/src/pages/vendors.tsx`](client/src/pages/vendors.tsx:1)
**Purpose**: Vendor list with calculated statistics.

**Features**:
- **Calculated Metrics** ([lines 282-352](client/src/pages/vendors.tsx:282)):
  - Active vendors with listings
  - Luxette vendor stats (items, cost, value range)
  - Total items, value ranges, pending payouts
- **Vendor Creation** with full bank details
- **Vendor Cards** showing:
  - Contact info (email, phone, bank)
  - Item counts (active/sold)
  - Total value and pending payouts
- Search by name/email/phone
- Mobile-responsive layout

#### [`client/src/pages/vendor-details.tsx`](client/src/pages/vendor-details.tsx:1)
**Purpose**: Detailed vendor profile with items and payouts.

**Tabs**:
1. **Items Tab**: All vendor's consigned items
2. **Payouts Tab**: Payout history + record new payout
3. **Analytics Tab**: Performance stats (status distribution, financial summary)

**Metrics**: Total items, value range, payouts made, pending payouts

### Client Management

#### [`client/src/pages/clients.tsx`](client/src/pages/clients.tsx:1)
**Purpose**: Client list with purchase statistics.

**Calculated Stats** ([lines 174-213](client/src/pages/clients.tsx:174)):
- Groups payments by item to calculate purchase status
- Active purchases (not fully paid)
- Completed purchases
- Total spent
- Outstanding balance ranges

**Metrics**: Total/active clients, total purchases, revenue, outstanding balance

#### [`client/src/pages/client-details.tsx`](client/src/pages/client-details.tsx:1)
**Purpose**: Detailed client profile with purchase history.

**Features**:
- Client information card
- Customer status badge (New vs Repeat)
- **Tabs**:
  - Purchases: Items bought with payment status
  - Payments: Transaction history
  - Analytics: Purchase stats and financial summary
- Record new payment option

### Contract System

#### [`client/src/pages/contracts.tsx`](client/src/pages/contracts.tsx:1)
**Purpose**: Contract and template management with PDF generation.

**Architecture**: Two-tab layout (Contracts | Templates)

**Contract Creation Wizard** ([lines 56-349](client/src/pages/contracts.tsx:56)):
- Vendor selection
- Item selection (multi-select from available items)
- Template selection
- Contract terms configuration (commission %, payment terms, etc.)
- **Variable Replacement** ([lines 128-145](client/src/pages/contracts.tsx:128)):
  - Replaces {{VENDOR_NAME}}, {{ITEMS_TABLE}}, etc. from template
  - Creates item snapshots (immutable record)
- Creates draft contract

**PDF Generation** ([lines 456-492](client/src/pages/contracts.tsx:456)):
- Fetches complete contract data
- Uses React-PDF to render contract
- Downloads as PDF file
- Filename: `Contrato_{vendor}_{contractId}.pdf`

**Template Management**:
- Uses [`TemplateBuilder`](client/src/components/TemplateBuilder.tsx:1) component
- CRUD operations on templates
- Default template protection (can't delete)

### Financial Operations

#### [`client/src/pages/payments.tsx`](client/src/pages/payments.tsx:1)
**Purpose**: Client payment tracking and management.

**Data Displayed**:
- Payment metrics (total, overdue, upcoming, amounts, trends)
- Financial health score
- Recent payments table
- Upcoming payments with priority calculation

**Key Features**:
1. **Priority System** ([lines 948-973](client/src/pages/payments.tsx:948)):
   - Critical: Overdue (red)
   - Urgent: ≤ 3 days (yellow)
   - Soon: 4-7 days (blue)
   - Normal: > 7 days (green)

2. **Upcoming Payments** ([lines 733-1175](client/src/pages/payments.tsx:733)):
   - Shows all installments with due dates
   - Color-coded rows by priority
   - Client and item details
   - Payment timeline (first/expected final payment)
   - **Actions**: Mark Paid, Send Reminder (overdue only)

3. **Filtering & Sorting**: By payment method, client, item, date, amount

#### [`client/src/pages/payouts.tsx`](client/src/pages/payouts.tsx:1)
**Purpose**: Vendor payout management with payout processing.

**Features**:
1. **Payout Metrics** ([lines 386-471](client/src/pages/payouts.tsx:386)):
   - Total payouts (count, amount, average)
   - Ready for payout count (fully paid items)
   - Upcoming payouts (partial payments)
   - Monthly trend (% change)

2. **Recent Payouts Tab**: Completed payout history

3. **Upcoming Payouts Tab** ([lines 606-884](client/src/pages/payouts.tsx:606)):
   - Shows items sold but not fully paid to vendor
   - **Payment Progress Bar**: Shows client payment status
   - **Payment Timeline**: First and last payment dates
   - Status: "Ready" (fully paid) vs "Partial" (in progress)
   - **Payout Statistics** ([lines 653-709](client/src/pages/payouts.tsx:653)): Ready vs in-progress breakdown

4. **Payout Processing Modal** ([lines 888-1009](client/src/pages/payouts.tsx:888)):
   - Pre-fills calculated payout amount
   - Bank account field
   - Transfer ID/reference
   - Optional notes
   - Creates payout record

**Vendor Payout Formula**: Uses complex calculation from backend (adjusts based on sale price vs max price)

#### [`client/src/pages/expenses.tsx`](client/src/pages/expenses.tsx:1)
**Purpose**: Expense tracking for items and general business.

**Expense Types**:
- **Item-specific**: Authentication, Cleaning, Repair, Photography, Shipping, Insurance, Storage, Marketing
- **General business**: Payroll, Rent, Electricity, Internet, Phone, Office Supplies, Legal, Accounting, etc.

**Features**:
- Metrics: Total expenses, total amount, average, this month count
- Search and filter by type
- Sort by date, amount, type, item
- Color-coded expense type badges
- **General Business Expense** ([lines 161-214](client/src/pages/expenses.tsx:161)):
  - Uses special "Operations" item ID
  - Broader expense categories

### Analytics & Reporting

#### [`client/src/pages/reports.tsx`](client/src/pages/reports.tsx:1) (2645 lines! - Most complex page)
**Purpose**: **Comprehensive BI dashboard** with advanced filtering and visualizations.

**Global Filter Controls** ([lines 695-860](client/src/pages/reports.tsx:695)):
- Date range (start/end)
- Granularity (day/week/month)
- Multi-select filters: Vendors, Clients, Brands, Categories
- Reset and export buttons

**5 Report Tabs**:

1. **Overview Tab** ([lines 888-1298](client/src/pages/reports.tsx:888)):
   - **6 KPI Cards**: Revenue, COGS, Gross Profit, Net Margin, Items Sold, Payment Status
   - **3 Summary Cards**: Top performers, inventory status, expenses breakdown
   - **Time-Series Chart**: Revenue, profit, and expenses over time with Recharts
   - Granularity-based formatting
   - Error handling for missing data

2. **Performance by Groups Tab** ([lines 1300-1884](client/src/pages/reports.tsx:1300)):
   - **4 Group Types**: Vendors, Brands, Categories, Clients
   - Each group has:
     - Summary cards (count, revenue, profit, top performer)
     - Performance table with sortable columns
     - Horizontal bar chart (top 10)
   - Toggle between revenue and profit view
   - Show/hide charts option
   - Color-coded bars (green/yellow/red by rank)

3. **Profitability Tab** ([lines 1886-2437](client/src/pages/reports.tsx:1886)):
   - **6 Summary Cards**: Total items, profit, avg margin, best/worst items, avg days to sell
   - **2 Charts**: Profit distribution by range, Top 10 most profitable
   - **Detailed Table** with:
     - Item, brand, vendor, cost, revenue, profit, margin
     - Status and sold date
     - Sortable columns
     - Pagination (10/25/50/100 per page)
   - **Filters**: Profit range (all/profitable/breakeven/loss), status
   - **CSV Export**: Downloads filtered data

4. **Inventory Health Tab** ([lines 2440-2577](client/src/pages/reports.tsx:2440)):
   - 4 metric cards: Total items, sold, in-store, average age
   - Aging analysis table (buckets by age)

5. **Payment Methods Tab** ([lines 2579-2641](client/src/pages/reports.tsx:2579)):
   - Payment method performance
   - Total amount, transaction count, average, percentage
   - Trend indicators

**Technical Complexity**:
- Dynamic query parameter building
- Complex memoized filtering and sorting
- Responsive grid layouts
- Error boundaries for chart failures
- Recharts integration for visualizations

#### [`client/src/pages/profitability.tsx`](client/src/pages/profitability.tsx:1)
**Purpose**: Placeholder for future profitability features.
**Status**: Empty shell page (15 lines total)

### System Configuration

#### [`client/src/pages/settings.tsx`](client/src/pages/settings.tsx:1)
**Purpose**: System configuration for brands, categories, and payment methods.

**3 Management Sections** (each with identical CRUD pattern):

1. **Brand Management** ([lines 60-434](client/src/pages/settings.tsx:60)):
   - Create/edit/delete brands
   - Active/inactive toggle
   - Search functionality
   - Empty state with "Create First Brand" CTA
   - Date formatting for creation date

2. **Category Management** ([lines 436-810](client/src/pages/settings.tsx:436)):
   - Same pattern as brands
   - Used for organizing items (Watches, Handbags, Jewelry)

3. **Payment Method Management** ([lines 812-1181](client/src/pages/settings.tsx:812)):
   - Manage accepted payment types
   - Active/inactive status

**Common Features**:
- Dialog-based create/edit forms
- Search filtering
- Dropdown menu actions (edit/delete)
- Referential integrity error handling
- Spanish UI text
- Responsive cards layout

#### [`client/src/pages/user-management.tsx`](client/src/pages/user-management.tsx:1)
**Purpose**: User administration (admin-only).

**Access Control**: Checks `hasRole('admin')` - shows access denied if not admin

**Features**:
1. **Create User Form** ([lines 158-283](client/src/pages/user-management.tsx:158)):
   - Name, email, password (with show/hide)
   - Role selection (Admin, Staff, Read-Only)
   - Active checkbox
   - Client-side validation

2. **Users List** ([lines 285-337](client/src/pages/user-management.tsx:285)):
   - Shows all users with status indicators
   - Active/inactive icons
   - Role badges
   - Creation date
   - No edit/delete (future feature)

**Validation**: Email format, password length (min 6), name length (min 2)

### Error Handling

#### [`client/src/pages/not-found.tsx`](client/src/pages/not-found.tsx:1)
**Purpose**: 404 page for invalid routes.

**Features**: Simple card with error icon, Spanish message, developer hint

---


---

## COMPREHENSIVE PROJECT SUMMARY

### Project Identity: LUXETTE - Luxury Consignment Management System

**Business Model**: This is a **consignment/resale business management platform** for luxury goods. The system manages the complete lifecycle of luxury items from consignment through sale to final vendor payout.

**Core Business Flow**:
1. **Consignment**: Vendors (consignors) bring luxury items (watches, bags, jewelry) to sell
2. **Inventory**: Items are cataloged with images, condition reports, and price ranges (min/max)
3. **Contracts**: Formal consignment agreements with item snapshots (immutable records)
4. **Sales**: Items sold to clients with flexible payment options (full payment or installments)
5. **Payouts**: Vendors paid based on sale price using dynamic commission formula
6. **Profitability**: Track all costs (vendor payouts, expenses) vs revenue for complete P&L

---

### Technology Stack

**Backend**:
- **Runtime**: Node.js with TypeScript, ESM modules
- **Framework**: Express.js
- **Database**: PostgreSQL (Neon serverless) with Drizzle ORM
- **Authentication**: Session-based (connect-pg-simple), bcrypt password hashing
- **File Storage**: Google Cloud Storage (via Replit Object Storage)
- **Image Processing**: Sharp (resize, compress, optimize)
- **PDF Generation**: React-PDF

**Frontend**:
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with HMR
- **Routing**: Wouter (lightweight, ~1.5KB)
- **State Management**: TanStack Query (React Query v5)
- **UI Library**: shadcn/ui (Radix primitives + Tailwind CSS)
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Themes**: next-themes (dark/light mode)

**Development**:
- **Deployment**: Replit-optimized (sidecar auth, object storage integration)
- **Database Migrations**: Drizzle Kit
- **Development**: Hot module replacement via Vite middleware mode
- **Production**: Bundled with esbuild (server) and Vite (client)

---

### Architecture Overview

**Pattern**: **Layered Architecture** with clear separation of concerns

**Server Layers**:
1. **Routes** ([`server/routes.ts`](server/routes.ts:1)) - HTTP endpoints, validation, error handling
2. **Storage Facade** ([`server/storage.ts`](server/storage.ts:1)) - Unified interface, backward compatibility
3. **Domain Services** ([`server/services/`](server/services/)) - Business logic, database operations
4. **Database** ([`server/db.ts`](server/db.ts:1)) - Drizzle ORM instance with connection pooling
5. **Schema** ([`shared/schema.ts`](shared/schema.ts:1)) - Type-safe schema shared between client and server

**Client Architecture**:
1. **Provider Stack**: QueryClient → Theme → Tooltip → Auth → App
2. **Routing**: Wouter with route-based code splitting
3. **State**: Server state (React Query) + Local state (React hooks)
4. **Components**: Presentational (UI) + Container (Pages)
5. **Layout**: Responsive (desktop sidebar, mobile bottom nav)

**Key Patterns**:
- **Facade Pattern**: Storage layer delegates to domain services
- **Repository Pattern**: Services encapsulate data access
- **Transaction Pattern**: Multi-step operations wrapped in DB transactions
- **Query Key as URL**: React Query keys double as API endpoints
- **Optimistic Updates**: Invalidate queries after mutations

---

### Database Schema Highlights

**13 Tables** organized by domain:

**Core Entities**:
- **vendor**: Suppliers with bank details for payouts
- **client**: Customers with billing information
- **item**: Inventory with price ranges (min/max for cost and sales price)
- **brand**, **category**, **paymentMethod**: Reference data with active/inactive status

**Financial Transactions**:
- **clientPayment**: Money received from clients
- **vendorPayout**: Money paid to vendors
- **itemExpense**: Item-related costs (authentication, cleaning, etc.)
- **installmentPlan**: Payment plans with due dates and status tracking

**Contract System**:
- **contractTemplate**: Reusable templates with variable system
- **contract**: Vendor agreements with JSONB item snapshots and PDF URLs

**Authentication**:
- **users**: Email/password with roles (admin/staff/readOnly)

**Indexes**: Strategic indexes on frequently queried fields (email, vendorId, status, dates)
**Constraints**: Foreign keys with cascading rules, unique constraints on names

---

### Key Features by Domain

**Inventory Management**:
- Image upload with automatic compression (max 1200x1200, 85% JPEG quality)
- Price range tracking (min/max for flexibility)
- Status lifecycle (in-store → reserved → sold → returned-to-vendor)
- Serial number and condition tracking
- Brand migration from legacy text field to FK relationship

**Financial Tracking**:
- **Flexible Pricing**: Min/max ranges allow price negotiation flexibility
- **Payment Types**: Full payment or installment plans
- **Automatic Status Updates**: Item status changes based on payment completion
- **Vendor Payout Formula**: `Payout = (1 - ((MaxSalesPrice - ActualSalesPrice) × 0.01)) × MaxCost`
- **Expense Tracking**: Item-specific and general business expenses

**Contract System**:
- Template builder with 15 predefined variables ({{VENDOR_NAME}}, {{ITEMS_TABLE}}, etc.)
- Live preview with sample data
- Item snapshots for immutable historical records
- PDF generation with professional layout
- Draft/final status workflow

**Business Intelligence**:
- **KPIs**: Revenue, COGS, gross/net profit, margins, inventory turnover
- **Time-Series**: Revenue, profit, items sold, payments over time
- **Grouped Metrics**: Performance by vendor/brand/category/client
- **Item Profitability**: Per-item P&L with pagination
- **Inventory Health**: Status distribution, aging analysis, category breakdown
- **Payment Method Analysis**: Transaction count, amounts, trends
- **Financial Health Score**: 100-point system with 5 factors and recommendations

**User Management**:
- Role-based access control (admin/staff/readOnly)
- Role hierarchy for permission checks
- Session-based authentication with 24-hour expiry
- Password hashing with bcrypt (10 rounds)

---

### Data Flow Examples

**Recording a Sale**:
1. User clicks "Sell" on item in inventory
2. Selects client and payment type (full/installment)
3. Frontend validates and submits to `/api/payments`
4. Backend (`payments.service.ts`):
   - Starts transaction
   - Verifies item and client exist
   - Creates payment record
   - Calculates total paid
   - **Automatically updates item status**:
     - Fully paid → status = "sold"
     - Partially paid → status = "reserved"
   - Commits transaction
5. Frontend invalidates queries (items, payments, dashboard metrics)
6. UI updates automatically via React Query

**Generating a Contract**:
1. Admin selects vendor and items in contract wizard
2. Chooses template and configures terms
3. Frontend replaces template variables with actual data
4. Creates item snapshots (current state)
5. Backend saves contract as "draft" with JSONB snapshots
6. User can generate PDF (React-PDF renders contract)
7. After signing, status changes to "final" (immutable)

---

### Security Model

**Authentication**:
- Session-based (PostgreSQL session store)
- HTTP-only cookies
- CSRF protection via sameSite: 'lax'
- Secure cookies in production (HTTPS)

**Authorization**:
- Middleware: `requireAuth` (all authenticated users)
- Middleware: `requireAdmin` (admin-only routes)
- Frontend: `hasRole()` with hierarchy (admin > staff > readOnly)
- Route protection via `ProtectedRoute` component

**Data Protection**:
- Password hashing (bcrypt, never stored plain)
- Sensitive data excluded from API responses
- SQL injection prevention (parameterized queries via Drizzle)
- Input validation (Zod schemas on both client and server)

**Object Storage**:
- ACL system in place (not currently used)
- Public/private object separation
- Signed URLs for uploads (15-minute TTL)

---

### Notable Design Decisions

**Pricing Flexibility**:
- **Min/Max Ranges** everywhere (cost, sales price)
- Allows price negotiation while tracking targets
- Financial reports use ranges for accuracy
- Vendor payout adjusts based on actual sale price

**Immutability**:
- Contract item snapshots preserve historical data
- Can't delete final contracts
- Can't delete default template

**Progressive Enhancement**:
- Mobile-first responsive design
- Desktop: Full sidebar navigation
- Mobile: Bottom nav + drawer for full menu
- Touch-friendly 48px minimum hit areas

**Performance Optimizations**:
- Strategic database indexes
- Connection pooling (Neon serverless)
- Image compression before storage
- Query caching with infinite stale time
- Manual cache invalidation (no polling)

**Developer Experience**:
- Shared TypeScript types (client/server)
- Consistent CRUD patterns across services
- Comprehensive error types (NotFoundError, ConflictError, ValidationError)
- Debug logging for troubleshooting
- Test IDs on interactive elements

**Internationalization**:
- Primarily Spanish UI text
- Error messages in Spanish
- Currency: USD
- Date formats: US locale for dates, Spanish for long-form

---

### System Capabilities

**What This System Can Do**:
1. ✅ Complete inventory lifecycle management
2. ✅ Vendor relationship management with bank details
3. ✅ Client purchase tracking with payment plans
4. ✅ Automatic financial calculations (profit, margins, payouts)
5. ✅ Contract generation with PDF export
6. ✅ Multi-dimensional business intelligence reporting
7. ✅ Financial health scoring with recommendations
8. ✅ Image upload and optimization
9. ✅ Role-based access control
10. ✅ Responsive UI (desktop and mobile)
11. ✅ Dark/light theme support

**Current Limitations**:
1. ⚠️ Search is UI-only (no server-side search implementation)
2. ⚠️ No email notifications (payment reminders return true but don't send)
3. ⚠️ No audit logging of user actions
4. ⚠️ No data export beyond profitability CSV
5. ⚠️ Financial health uses estimated installment behavior (nextDueDate field references don't exist in schema)
6. ⚠️ Expense service has field name mismatch (incurredAt vs expenseDate)

---

### Code Quality & Maintainability

**Strengths**:
- **Type Safety**: End-to-end TypeScript with strict mode
- **Validation**: Zod schemas on both client and server
- **Error Handling**: Standardized error types and HTTP status codes
- **Code Organization**: Clear domain separation
- **Documentation**: Inline comments explaining business logic
- **Testing Hooks**: Extensive `data-testid` attributes

**Technical Debt Indicators**:
- Some schema field mismatches (incurredAt/expenseDate, nextDueDate/dueDate)
- Duplicate theme hook (use-theme.tsx vs next-themes)
- Legacy brand text field migration system
- Some fields referenced in queries but not in schema (fullyPaidAt)
- Hardcoded "Operations" item ID for general expenses

**Scalability Considerations**:
- **Database**: Neon serverless with connection pooling (scales automatically)
- **File Storage**: GCS (production-grade, unlimited scale)
- **Session Store**: PostgreSQL (could move to Redis for high traffic)
- **Frontend**: Static build (CDN-ready)
- **API**: Stateless (horizontal scaling possible)

---

### Business Logic Complexity

**Most Complex Calculations**:

1. **Vendor Payout Formula** ([`payouts.service.ts:143-146`](server/services/payouts.service.ts:143)):
   ```
   priceDifference = maxSalesPrice - actualSalesPrice
   adjustmentFactor = 1 - (priceDifference × 0.01)
   vendorPayout = adjustmentFactor × maxCost
   ```
   - Vendor gets less if item sells below maximum price
   - 1% reduction per dollar below max price
   - Incentivizes vendors to price competitively

2. **Financial Health Score** ([`financialHealth.service.ts:9`](server/services/financialHealth.service.ts:9)):
   - 5 factors weighted differently (25+25+20+20+10 = 100 points)
   - Dynamic recommendations based on thresholds
   - Letter grades (A+ to F)

3. **Inventory Aging Analysis** ([`bi.service.ts:505-513`](server/services/bi.service.ts:505)):
   - Buckets items by age (0-30, 30-90, 90-180, 180+ days)
   - Identifies slow-moving inventory
   - Informs pricing and promotion strategies

4. **Payment Status Auto-Updates** ([`payments.service.ts:82-103`](server/services/payments.service.ts:82)):
   - Calculates total paid after each payment
   - Compares to item price
   - Automatically transitions status (in-store → reserved → sold)

---

### UI/UX Patterns

**Consistent Interaction Patterns**:
- **Modal Workflows**: All create/edit operations in dialogs
- **Inline Actions**: Status updates via dropdown (no page navigation)
- **Optimistic UI**: Show changes immediately, rollback on error
- **Progressive Disclosure**: Tabs, collapsibles, expandable sections
- **Empty States**: Encouraging CTAs for first-time users
- **Loading States**: Skeletons matching final UI layout
- **Error States**: Descriptive messages with recovery actions

**Mobile Optimization**:
- Bottom navigation (fixed, 5 items)
- Drawer for full sidebar
- Stacked layouts (grid → column on mobile)
- Touch-friendly buttons (min 48px height)
- FABs (Floating Action Buttons) for primary actions
- Responsive tables (horizontal scroll)

**Accessibility**:
- Semantic HTML
- ARIA labels via Radix UI
- Keyboard navigation support
- Focus management
- Color contrast (WCAG AA compliant via shadcn/ui)

---

### Data Integrity & Business Rules

**Referential Integrity**:
- All services check dependencies before deletion
- Examples:
  - Can't delete vendor with items/payouts/contracts
  - Can't delete brand referenced by items
  - Can't delete client with payments/installments
  - Can't delete final contracts

**Business Constraints**:
- Min ≤ Max validation (cost ranges, price ranges)
- Payment installments cannot total less than sale price
- Total upcoming installments cannot be less than remaining balance
- Contract item snapshots are immutable once finalized
- Default template cannot be deleted

**Automatic Behaviors**:
- Item status auto-updates on payment completion
- Default template auto-created if missing
- Setting new default template unsets previous default
- Session cleanup after 24 hours
- Image compression on upload (automatic)

---

### Performance & Optimization

**Database Performance**:
- Strategic indexes on frequently queried columns
- Query optimization (select only needed fields)
- Efficient joins (inner joins for required relations)
- Aggregation queries for metrics (SUM, COUNT, AVG)
- Date-based partitioning potential (created_at, paid_at indexes)

**Frontend Performance**:
- Code splitting by route (lazy loading potential)
- Infinite stale time (prevents unnecessary refetches)
- Image optimization (Sharp processing)
- Memoized calculations (useMemo for filtering/sorting)
- Pagination for large datasets (reports, profitability)

**Caching Strategy**:
- **No automatic refetching** (refetchOnWindowFocus: false)
- **Manual invalidation** after mutations
- **Query key design**: Path-based for easy cache management
- **Stale time**: Infinity (data stays cached until invalidated)

---

### Extensibility & Future Enhancements

**Ready for Extension**:
1. **ACL System**: Object-level permissions framework in place (not used yet)
2. **Template Variables**: Extensible variable system for contracts
3. **Expense Types**: Easily add new expense categories
4. **Payment Methods**: Configurable payment types
5. **User Roles**: Role system supports adding new roles

**Potential Features** (based on infrastructure):
1. **Email Notifications**: Reminder system has hooks (sendPaymentReminder exists)
2. **SMS Notifications**: Client phone numbers stored
3. **Document Storage**: ACL system ready for private documents
4. **Multi-currency**: Numeric precision supports it
5. **Barcode Scanning**: Serial number field ready
6. **API Webhooks**: Event system could trigger external integrations
7. **Advanced Search**: Full-text search (PostgreSQL supports it)
8. **Audit Logging**: User actions tracking infrastructure
9. **Data Export**: CSV export template exists (profitability)
10. **Mobile Apps**: API-first design enables native apps

---

### Critical Business Insights from Code

**Pricing Strategy**:
- System encourages competitive pricing through vendor payout formula
- Lower sale prices = lower vendor payouts (1% per dollar difference)
- Tracks both target prices (min/max) and actual sale prices

**Cash Flow Management**:
- Clear visibility of:
  - Money coming in (client payments, installments due)
  - Money going out (vendor payouts owed)
  - Money in inventory (cost invested)
  - Money expected (market value of inventory)
- Financial health score helps identify cash flow issues early

**Vendor Relationships**:
- Formal contracts with item snapshots protect both parties
- Bank details stored for easy payouts
- Performance tracking per vendor
- Pending payout visibility

**Client Relationships**:
- Flexible payment options (full or installment)
- Purchase history tracking
- Outstanding balance monitoring
- Repeat customer identification

**Operational Efficiency**:
- Inventory aging analysis identifies slow-moving items
- Days-to-sell metrics inform pricing decisions
- Category performance guides buying strategy
- Payment method analysis optimizes processing

---

### Code Organization Excellence

**File Structure**:
```
project/
├── shared/          # Shared types and schemas
├── server/          # Backend
│   ├── services/    # Domain logic (17 services)
│   │   └── utils/   # Shared utilities
│   ├── routes.ts    # API endpoints (1500+ lines)
│   └── storage.ts   # Facade pattern
└── client/
    ├── src/
    │   ├── components/  # Reusable UI
    │   │   ├── ui/      # shadcn/ui primitives (50+ components)
    │   │   └── layout/  # Layout components
    │   ├── pages/       # Route components (16 pages)
    │   ├── contexts/    # React context providers
    │   ├── hooks/       # Custom React hooks
    │   └── lib/         # Utilities and config
```

**Service Layer** (server/services/):
- auth.service.ts - Authentication
- vendors.service.ts - Vendor CRUD
- clients.service.ts - Client CRUD
- brands.service.ts - Brand CRUD with migration
- categories.service.ts - Category CRUD
- paymentMethods.service.ts - Payment method CRUD
- items.service.ts - Inventory management
- payments.service.ts - Client payments
- payouts.service.ts - Vendor payouts
- expenses.service.ts - Expense tracking
- installments.service.ts - Payment plans
- dashboard.service.ts - Dashboard metrics
- metrics.service.ts - Payment/payout metrics
- financialHealth.service.ts - Health scoring
- bi.service.ts - Advanced analytics
- contractTemplates.service.ts - Template management
- contracts.service.ts - Contract management

**Utility Services**:
- db-helpers.ts - Type conversions
- errors.ts - Error classes
- filters.ts - Query filter builders
- joins.ts - Common join patterns

---

### Production Readiness

**✅ Production-Ready Aspects**:
- Environment variable validation
- Error handling with appropriate HTTP codes
- Session management with secure cookies
- Database migrations with Drizzle Kit
- Image optimization for web delivery
- Responsive design for all screen sizes
- Dark mode support
- Type safety throughout
- Transaction support for critical operations

**⚠️ Pre-Production Checklist**:
1. Add comprehensive error logging (Sentry, LogRocket)
2. Implement rate limiting on API endpoints
3. Add request/response logging
4. Set up monitoring and alerting
5. Configure CORS for production domains
6. Implement proper backup strategy
7. Add health check endpoints
8. Set up SSL/TLS certificates
9. Configure CSP headers
10. Implement actual email notification service
11. Add database query performance monitoring
12. Set up CDN for static assets

---

### Conclusion

**LUXETTE** is a **sophisticated, production-grade luxury consignment management system** built with modern best practices. The codebase demonstrates:

**Technical Excellence**:
- Clean architecture with clear separation of concerns
- Type safety from database to UI
- Comprehensive validation at all layers
- Efficient database queries with proper indexing
- Responsive, accessible user interface
- Extensible design for future features

**Business Value**:
- Automates complex financial calculations
- Provides real-time business insights
- Supports flexible payment arrangements
- Tracks complete item lifecycle
- Ensures vendor payout accuracy
- Enables data-driven decisions

**Code Quality**:
- Well-organized file structure
- Consistent patterns and naming
- Comprehensive error handling
- Self-documenting code with TypeScript
- Reusable components and utilities
- Maintainable service layer

The system is **feature-complete** for a luxury consignment business and ready for deployment with minor enhancements to notifications and monitoring systems.

**Total Lines Analyzed**: ~15,000+ lines of TypeScript/TSX code across 100+ files.
