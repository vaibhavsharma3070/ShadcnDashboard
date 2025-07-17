# Luxury Consignment Management System

A sophisticated web application for managing luxury goods consignment operations, providing comprehensive inventory tracking, financial management, and customer relationship tools.

## 🎯 Overview

This system is designed for luxury consignment businesses dealing with high-value items like watches, handbags, jewelry, and fashion accessories. It manages the complete consignment lifecycle from vendor intake through client sales and final vendor payouts.

### Key Features

- **📊 Dashboard Analytics** - Real-time business metrics and performance tracking
- **📦 Inventory Management** - Complete item lifecycle tracking with status management
- **🏪 Vendor Management** - Vendor relationships, agreements, and payout processing
- **👥 Client Management** - Customer profiles, purchase history, and payment tracking
- **💰 Payment Processing** - Flexible payment options including installment plans
- **📈 Financial Analytics** - Profit tracking, expense management, and financial health scoring
- **🎨 Modern UI/UX** - Responsive design with dark/light mode support
- **🔐 Data Security** - PostgreSQL database with robust validation and error handling

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript for type safety and modern development
- **Vite** for fast development and optimized builds
- **Tailwind CSS** for utility-first styling
- **shadcn/ui** for consistent, accessible UI components
- **TanStack Query** for efficient server state management
- **React Hook Form** with Zod validation for form handling
- **Wouter** for lightweight client-side routing
- **Framer Motion** for smooth animations

### Backend
- **Node.js** with Express.js for the API server
- **TypeScript** for end-to-end type safety
- **Drizzle ORM** for type-safe database operations
- **PostgreSQL** (via Neon) for reliable data storage
- **Zod** for runtime data validation
- **Express Sessions** for session management

### Development Tools
- **ESBuild** for fast production builds
- **TSX** for development with hot reload
- **Drizzle Kit** for database migrations
- **PostCSS** with Autoprefixer for CSS processing

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **pnpm** package manager
- **PostgreSQL** database (we recommend Neon for cloud deployment)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd consignment-management-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
   NODE_ENV=development
   ```

4. **Initialize the database**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5000`

### Database Setup (Neon)

For cloud deployment with Neon PostgreSQL:

1. **Create a Neon account** at [neon.tech](https://neon.tech)
2. **Create a new project** and database
3. **Copy the connection string** from your Neon dashboard
4. **Add it to your `.env` file** as `DATABASE_URL`

## 📁 Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   │   ├── ui/       # shadcn/ui components
│   │   │   └── layout/   # Layout components
│   │   ├── pages/        # Route components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utilities and configurations
│   │   └── index.css     # Global styles and CSS variables
│   └── index.html        # HTML template
├── server/                # Backend Express application
│   ├── db.ts            # Database connection setup
│   ├── index.ts         # Express server entry point
│   ├── routes.ts        # API route definitions
│   ├── storage.ts       # Database operations and business logic
│   └── vite.ts          # Vite integration for development
├── shared/               # Shared types and schemas
│   └── schema.ts        # Drizzle database schema and Zod validation
├── migrations/          # Database migration files
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── tailwind.config.ts   # Tailwind CSS configuration
├── vite.config.ts       # Vite build configuration
└── drizzle.config.ts    # Drizzle ORM configuration
```

## 🗄️ Database Schema

The system uses PostgreSQL with the following core entities:

### Core Tables

- **vendors** - Supplier information and contact details
- **clients** - Customer profiles and billing information
- **items** - Inventory items with condition, pricing, and status
- **client_payments** - Payment records from customers
- **vendor_payouts** - Payments to vendors after sales
- **item_expenses** - Costs associated with items (authentication, repairs)
- **installment_plans** - Payment plans for customers

### Key Relationships

- Items belong to vendors (many-to-one)
- Payments are linked to items and clients (many-to-one)
- Installment plans connect items and clients (many-to-one)
- Expenses are associated with items (many-to-one)

## 🔧 API Endpoints

### Dashboard
- `GET /api/dashboard/metrics` - Business overview metrics
- `GET /api/dashboard/recent-items` - Recently added items
- `GET /api/dashboard/top-performing` - Top performing items by profit

### Inventory Management
- `GET /api/items` - List all items with vendor information
- `GET /api/items/:id` - Get specific item details
- `POST /api/items` - Add new item to inventory
- `PUT /api/items/:id` - Update item information
- `DELETE /api/items/:id` - Remove item from inventory

### Vendor Management
- `GET /api/vendors` - List all vendors
- `GET /api/vendors/:id` - Get vendor details
- `POST /api/vendors` - Create new vendor
- `PUT /api/vendors/:id` - Update vendor information
- `DELETE /api/vendors/:id` - Remove vendor

### Client Management
- `GET /api/clients` - List all clients
- `GET /api/clients/:id` - Get client details with purchase history
- `POST /api/clients` - Create new client
- `PUT /api/clients/:id` - Update client information
- `DELETE /api/clients/:id` - Remove client

### Payment Processing
- `GET /api/payments` - List all payments
- `POST /api/payments` - Record new payment
- `GET /api/payments/metrics` - Payment analytics
- `GET /api/payments/recent` - Recent payments
- `GET /api/payments/overdue` - Overdue payments

### Installment Plans
- `GET /api/installments` - List installment plans
- `POST /api/installments` - Create payment plan
- `PUT /api/installments/:id` - Update installment
- `DELETE /api/installments/:id` - Remove installment
- `POST /api/installments/:id/mark-paid` - Mark installment as paid

## 💼 Business Logic

### Consignment Flow

1. **Vendor Intake** - Vendors consign items with agreed payout amounts
2. **Inventory Management** - Items are catalogued with condition and pricing
3. **Sales Process** - Clients purchase items with full or partial payments
4. **Payment Processing** - Support for upfront payments or installment plans
5. **Vendor Payouts** - Vendors are paid after items are fully paid by clients
6. **Expense Tracking** - Authentication, repair, and other costs are tracked
7. **Profit Analysis** - Real-time profit calculations across all transactions

### Financial Calculations

- **Profit = Client Payments - Vendor Payout - Item Expenses**
- **Payment Progress = Total Paid / Item Price**
- **Remaining Balance = Item Price - Total Paid**

## 🎨 UI Components

### Core Components

- **Dashboard** - Business metrics and quick actions
- **Inventory Table** - Sortable, filterable item listing
- **Payment Forms** - Flexible payment processing with validation
- **Status Badges** - Visual status indicators for items and payments
- **Data Tables** - Reusable table components with pagination
- **Charts** - Financial analytics and trend visualization

### Design System

- **Color Scheme** - Consistent light/dark mode support
- **Typography** - Professional font hierarchy
- **Spacing** - Consistent spacing scale
- **Icons** - Lucide React icons for actions and states
- **Animations** - Smooth transitions and micro-interactions

## 🔒 Security Features

- **Input Validation** - Zod schemas for runtime validation
- **SQL Injection Prevention** - Parameterized queries via Drizzle ORM
- **Session Management** - Express sessions with PostgreSQL storage
- **Environment Variables** - Secure configuration management
- **Error Handling** - Comprehensive error boundaries and logging

## 📈 Analytics & Reporting

### Dashboard Metrics
- Total revenue and active items
- Pending payouts and net profit
- Payment timeline tracking
- Financial health scoring

### Financial Analytics
- Monthly payment trends
- Vendor payout analysis
- Expense tracking by category
- Profit margin calculations

### Performance Tracking
- Top performing items
- Client payment behavior
- Inventory turnover rates
- Payment completion times

## 🚀 Deployment

### Development

```bash
# Start development server
npm run dev

# Run type checking
npm run check

# Push database changes
npm run db:push
```

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm run start
```

### Environment Variables

Required environment variables for production:

```env
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
NODE_ENV=production
```

### Deployment Platforms

#### Recommended: Replit Deployments
1. Connect your repository to Replit
2. Configure environment variables in the Replit dashboard
3. Click "Deploy" to automatically build and deploy

#### Alternative: Railway
1. Connect your GitHub repository
2. Set environment variables in Railway dashboard
3. Railway will automatically deploy on push

#### Alternative: Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in project directory
3. Configure environment variables in Vercel dashboard

## 🧪 Testing

### Manual Testing Workflow

1. **Database Setup** - Ensure PostgreSQL connection is working
2. **Vendor Management** - Create vendors and verify data persistence
3. **Inventory Management** - Add items and test status updates
4. **Client Management** - Create clients and test relationship tracking
5. **Payment Processing** - Test full and partial payment scenarios
6. **Installment Plans** - Create and manage payment plans
7. **Financial Reports** - Verify calculations and analytics

### Common Test Scenarios

- **Full Payment Flow** - Vendor → Item → Client → Full Payment → Vendor Payout
- **Installment Payment** - Vendor → Item → Client → Installment Plan → Multiple Payments
- **Expense Tracking** - Item → Authentication Cost → Repair Cost → Profit Calculation
- **Status Updates** - Item status changes through the consignment lifecycle

## 🛠️ Development

### Code Style

- **TypeScript** - Strict type checking enabled
- **ESLint** - Code linting and formatting
- **Prettier** - Code formatting (via editor integration)
- **Modular Architecture** - Separated concerns between frontend and backend

### Development Workflow

1. **Feature Development** - Create feature branches
2. **Type Safety** - Ensure TypeScript compliance
3. **Database Changes** - Use `npm run db:push` for schema updates
4. **Testing** - Manual testing of core workflows
5. **Documentation** - Update README for significant changes

### Adding New Features

1. **Update Schema** - Modify `shared/schema.ts` if database changes needed
2. **Backend Logic** - Add to `server/storage.ts` and `server/routes.ts`
3. **Frontend Components** - Create components in `client/src/components/`
4. **Pages** - Add route components in `client/src/pages/`
5. **Navigation** - Update `client/src/App.tsx` for new routes

## 📚 Dependencies

### Core Dependencies

- **@neondatabase/serverless** - PostgreSQL client for Neon
- **drizzle-orm** - Type-safe database operations
- **express** - Web framework for Node.js
- **react** - UI library
- **tailwindcss** - Utility-first CSS framework
- **zod** - Schema validation

### Development Dependencies

- **typescript** - Type checking
- **vite** - Build tool and dev server
- **drizzle-kit** - Database migration tool
- **tsx** - TypeScript execution for development

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:

1. Check the existing issues on GitHub
2. Create a new issue with detailed description
3. Include steps to reproduce any bugs
4. Provide environment details (Node.js version, OS, etc.)

## 🎯 Roadmap

### Short Term
- [ ] Enhanced reporting dashboard
- [ ] Email notifications for overdue payments
- [ ] Batch operations for inventory management
- [ ] Advanced filtering and search capabilities

### Medium Term
- [ ] Mobile responsive improvements
- [ ] API documentation with Swagger
- [ ] Automated testing suite
- [ ] Performance optimization

### Long Term
- [ ] Multi-location support
- [ ] Integration with accounting systems
- [ ] Advanced analytics and forecasting
- [ ] Mobile application

---

## 📊 System Requirements

### Minimum Requirements
- Node.js 18+
- 2GB RAM
- PostgreSQL 13+
- Modern web browser

### Recommended Requirements
- Node.js 20+
- 4GB RAM
- PostgreSQL 15+
- Chrome/Firefox/Safari latest versions

---

Built with ❤️ for luxury consignment businesses