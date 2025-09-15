/**
 * =====================================================================
 * LUXETTE Luxury Consignment Management System - Storage Layer
 * =====================================================================
 * 
 * Comprehensive data access layer for the luxury consignment management
 * system. Organized by functional domains for maintainability and clarity.
 * 
 * Architecture:
 * - PostgreSQL database with Drizzle ORM
 * - Transactional operations where needed
 * - Type-safe operations with full TypeScript support
 * - Comprehensive error handling and validation
 */

import {
  vendor,
  client,
  item,
  clientPayment,
  vendorPayout,
  itemExpense,
  installmentPlan,
  users,
  brand,
  category,
  paymentMethod,
  contract,
  contractTemplate,
  type Vendor,
  type Client,
  type Item,
  type ClientPayment,
  type VendorPayout,
  type ItemExpense,
  type InstallmentPlan,
  type User,
  type Brand,
  type Category,
  type PaymentMethod,
  type Contract,
  type ContractTemplate,
  type ContractItemSnapshot,
  type InsertVendor,
  type InsertClient,
  type InsertItem,
  type InsertClientPayment,
  type InsertVendorPayout,
  type InsertItemExpense,
  type InsertInstallmentPlan,
  type InsertUser,
  type InsertBrand,
  type InsertCategory,
  type InsertPaymentMethod,
  type InsertContract,
  type InsertContractTemplate,
  type CreateUserRequest,
  type UpdateUserRequest,
} from "@shared/schema";
import { db } from "./db";
import {
  eq,
  desc,
  sum,
  count,
  sql,
  and,
  isNull,
  isNotNull,
  inArray,
} from "drizzle-orm";

// =====================================================================
// UTILITY FUNCTIONS
// =====================================================================

/**
 * Maps query results to proper Item & { vendor: Vendor } shape
 */
function mapItemRow(row: any): Item & { vendor: Vendor } {
  return { ...row.item, vendor: row.vendor };
}

/**
 * Maps query results to proper ClientPayment & { item: Item & { vendor: Vendor }; client: Client } shape
 */
function mapPaymentRow(row: any): ClientPayment & { item: Item & { vendor: Vendor }; client: Client } {
  return { ...row.client_payment, item: { ...row.item, vendor: row.vendor }, client: row.client };
}

/**
 * Maps query results to proper InstallmentPlan & { item: Item & { vendor: Vendor }; client: Client } shape
 */
function mapInstallmentRow(row: any): InstallmentPlan & { item: Item & { vendor: Vendor }; client: Client } {
  return { ...row.installment_plan, item: { ...row.item, vendor: row.vendor }, client: row.client };
}

/**
 * Maps query results to proper ItemExpense & { item: Item } shape
 */
function mapExpenseRow(row: any): ItemExpense & { item: Item } {
  return { ...row.item_expense, item: row.item };
}

/**
 * Maps query results to proper VendorPayout & { item: Item; vendor: Vendor } shape
 */
function mapPayoutRow(row: any): VendorPayout & { item: Item; vendor: Vendor } {
  return { ...row.vendor_payout, item: row.item, vendor: row.vendor };
}

/**
 * Converts various number/string formats to database-compatible numeric string.
 * @param v - Input value (number, string, null, or undefined)
 * @returns Database numeric string, defaults to "0" for null/undefined
 */
function toDbNumeric(v?: number | string | null): string {
  if (v == null) return "0";
  return typeof v === "string" ? v : v.toFixed(2);
}

/**
 * Converts various number/string formats to optional database numeric string.
 * @param v - Input value (number, string, null, or undefined)
 * @returns Database numeric string or null
 */
function toDbNumericOptional(v?: number | string | null): string | null {
  if (v == null) return null;
  return typeof v === "string" ? v : v.toFixed(2);
}

/**
 * Converts various date formats to database-compatible date string (YYYY-MM-DD).
 * @param v - Input value (Date, string, null, or undefined)
 * @returns Database date string, defaults to current date for null/undefined
 */
function toDbDate(v?: string | Date | null): string {
  if (v == null) return new Date().toISOString().slice(0, 10);
  const d = v instanceof Date ? v : new Date(v);
  return d.toISOString().slice(0, 10);
}

/**
 * Converts various date formats to optional database date string.
 * @param v - Input value (Date, string, null, or undefined)
 * @returns Database date string or null
 */
function toDbDateOptional(v?: string | Date | null): string | null {
  if (v == null) return null;
  const d = v instanceof Date ? v : new Date(v);
  return d.toISOString().slice(0, 10);
}

/**
 * Converts various date/time formats to database timestamp.
 * @param v - Input value (Date, string, null, or undefined)
 * @returns Database timestamp, defaults to current timestamp for null/undefined
 */
function toDbTimestamp(v?: string | Date | null): Date {
  if (v == null) return new Date();
  return v instanceof Date ? v : new Date(v);
}

// =====================================================================
// STORAGE INTERFACE DEFINITION
// =====================================================================

export interface IStorage {
  // ===================================================================
  // A) AUTHENTICATION & USER MANAGEMENT
  // ===================================================================
  
  /**
   * Retrieve user by ID.
   * @param id - User UUID
   * @returns User object or undefined if not found
   */
  getUser(id: string): Promise<User | undefined>;
  
  /**
   * Retrieve user by email address.
   * @param email - User email address
   * @returns User object or undefined if not found
   */
  getUserByEmail(email: string): Promise<User | undefined>;
  
  /**
   * Create a new user with encrypted password.
   * @param user - User creation data
   * @returns Created user object
   * @throws Error if email already exists
   */
  createUser(user: CreateUserRequest): Promise<User>;
  
  /**
   * Update existing user information.
   * @param id - User UUID
   * @param user - Partial user update data
   * @returns Updated user object
   * @throws Error if user not found
   */
  updateUser(id: string, user: UpdateUserRequest): Promise<User>;
  
  /**
   * Update user's last login timestamp.
   * @param id - User UUID
   */
  updateLastLogin(id: string): Promise<void>;
  
  /**
   * Retrieve all users ordered by creation date.
   * @returns Array of all users
   */
  getUsers(): Promise<User[]>;

  // ===================================================================
  // B) PARTIES MANAGEMENT (VENDORS & CLIENTS)
  // ===================================================================

  // --- Vendor Operations ---
  
  /**
   * Retrieve all vendors ordered by creation date.
   * @returns Array of all vendors
   */
  getVendors(): Promise<Vendor[]>;
  
  /**
   * Retrieve vendor by ID.
   * @param id - Vendor UUID
   * @returns Vendor object or undefined if not found
   */
  getVendor(id: string): Promise<Vendor | undefined>;
  
  /**
   * Create a new vendor.
   * @param vendor - Vendor creation data
   * @returns Created vendor object
   */
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  
  /**
   * Update existing vendor information.
   * @param id - Vendor UUID
   * @param vendor - Partial vendor update data
   * @returns Updated vendor object
   * @throws Error if vendor not found
   */
  updateVendor(id: string, vendor: Partial<InsertVendor>): Promise<Vendor>;
  
  /**
   * Delete a vendor.
   * @param id - Vendor UUID
   * @throws Error if vendor has associated items
   */
  deleteVendor(id: string): Promise<void>;

  // --- Client Operations ---
  
  /**
   * Retrieve all clients ordered by creation date.
   * @returns Array of all clients
   */
  getClients(): Promise<Client[]>;
  
  /**
   * Retrieve client by ID.
   * @param id - Client UUID
   * @returns Client object or undefined if not found
   */
  getClient(id: string): Promise<Client | undefined>;
  
  /**
   * Create a new client.
   * @param client - Client creation data
   * @returns Created client object
   */
  createClient(client: InsertClient): Promise<Client>;
  
  /**
   * Update existing client information.
   * @param id - Client UUID
   * @param client - Partial client update data
   * @returns Updated client object
   * @throws Error if client not found
   */
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client>;
  
  /**
   * Delete a client.
   * @param id - Client UUID
   * @throws Error if client has associated payments or installments
   */
  deleteClient(id: string): Promise<void>;

  // ===================================================================
  // C) MASTER DATA MANAGEMENT
  // ===================================================================

  // --- Brand Operations ---
  
  /**
   * Retrieve all brands ordered by creation date.
   * @returns Array of all brands
   */
  getBrands(): Promise<Brand[]>;
  
  /**
   * Retrieve brand by ID.
   * @param id - Brand UUID
   * @returns Brand object or undefined if not found
   */
  getBrand(id: string): Promise<Brand | undefined>;
  
  /**
   * Create a new brand.
   * @param brand - Brand creation data
   * @returns Created brand object
   */
  createBrand(brand: InsertBrand): Promise<Brand>;
  
  /**
   * Update existing brand information.
   * @param id - Brand UUID
   * @param brand - Partial brand update data
   * @returns Updated brand object
   * @throws Error if brand not found
   */
  updateBrand(id: string, brand: Partial<InsertBrand>): Promise<Brand>;
  
  /**
   * Delete a brand.
   * @param id - Brand UUID
   * @throws Error if brand is referenced by existing items
   */
  deleteBrand(id: string): Promise<void>;

  // --- Category Operations ---
  
  /**
   * Retrieve all categories ordered by creation date.
   * @returns Array of all categories
   */
  getCategories(): Promise<Category[]>;
  
  /**
   * Retrieve category by ID.
   * @param id - Category UUID
   * @returns Category object or undefined if not found
   */
  getCategory(id: string): Promise<Category | undefined>;
  
  /**
   * Create a new category.
   * @param category - Category creation data
   * @returns Created category object
   */
  createCategory(category: InsertCategory): Promise<Category>;
  
  /**
   * Update existing category information.
   * @param id - Category UUID
   * @param category - Partial category update data
   * @returns Updated category object
   * @throws Error if category not found
   */
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category>;
  
  /**
   * Delete a category.
   * @param id - Category UUID
   * @throws Error if category is referenced by existing items
   */
  deleteCategory(id: string): Promise<void>;

  // --- Payment Method Operations ---
  
  /**
   * Retrieve all payment methods ordered by creation date.
   * @returns Array of all payment methods
   */
  getPaymentMethods(): Promise<PaymentMethod[]>;
  
  /**
   * Retrieve payment method by ID.
   * @param id - Payment method UUID
   * @returns Payment method object or undefined if not found
   */
  getPaymentMethod(id: string): Promise<PaymentMethod | undefined>;
  
  /**
   * Create a new payment method.
   * @param paymentMethod - Payment method creation data
   * @returns Created payment method object
   */
  createPaymentMethod(paymentMethod: InsertPaymentMethod): Promise<PaymentMethod>;
  
  /**
   * Update existing payment method information.
   * @param id - Payment method UUID
   * @param paymentMethod - Partial payment method update data
   * @returns Updated payment method object
   * @throws Error if payment method not found
   */
  updatePaymentMethod(id: string, paymentMethod: Partial<InsertPaymentMethod>): Promise<PaymentMethod>;
  
  /**
   * Delete a payment method.
   * @param id - Payment method UUID
   */
  deletePaymentMethod(id: string): Promise<void>;

  // ===================================================================
  // D) INVENTORY MANAGEMENT
  // ===================================================================

  // --- Item Operations ---
  
  /**
   * Retrieve all items with vendor information, optionally filtered by vendor.
   * @param vendorId - Optional vendor UUID to filter by
   * @returns Array of items with vendor details
   */
  getItems(vendorId?: string): Promise<Array<Item & { vendor: Vendor }>>;
  
  /**
   * Retrieve item by ID with vendor information.
   * @param id - Item UUID
   * @returns Item with vendor details or undefined if not found
   */
  getItem(id: string): Promise<(Item & { vendor: Vendor }) | undefined>;
  
  /**
   * Create a new inventory item.
   * @param item - Item creation data
   * @returns Created item object
   */
  createItem(item: InsertItem): Promise<Item>;
  
  /**
   * Update existing item information.
   * @param id - Item UUID
   * @param item - Partial item update data
   * @returns Updated item object
   * @throws Error if item not found
   */
  updateItem(id: string, item: Partial<InsertItem>): Promise<Item>;
  
  /**
   * Delete an item.
   * @param id - Item UUID
   * @throws Error if item has associated payments or expenses
   */
  deleteItem(id: string): Promise<void>;

  // --- Expense Operations ---
  
  /**
   * Retrieve all item expenses with item details.
   * @returns Array of expenses with associated item information
   */
  getExpenses(): Promise<Array<ItemExpense & { item: Item }>>;
  
  /**
   * Retrieve expenses for a specific item.
   * @param itemId - Item UUID
   * @returns Array of expenses for the item
   */
  getExpensesByItem(itemId: string): Promise<ItemExpense[]>;
  
  /**
   * Create a new item expense.
   * @param expense - Expense creation data
   * @returns Created expense object
   */
  createExpense(expense: InsertItemExpense): Promise<ItemExpense>;

  // ===================================================================
  // E) FINANCIAL TRANSACTIONS
  // ===================================================================

  // --- Client Payment Operations ---
  
  /**
   * Retrieve all client payments with item and client details.
   * Side Effect: None (read-only operation)
   * @returns Array of payments with associated data
   */
  getPayments(): Promise<Array<ClientPayment & { item: Item & { vendor: Vendor }; client: Client }>>;
  
  /**
   * Retrieve payments for a specific item.
   * @param itemId - Item UUID
   * @returns Array of payments with client details
   */
  getPaymentsByItem(itemId: string): Promise<Array<ClientPayment & { client: Client }>>;
  
  /**
   * Create a new client payment.
   * Side Effect: Updates item status based on payment completeness (in-store -> partial -> sold)
   * @param payment - Payment creation data
   * @returns Created payment object
   */
  createPayment(payment: InsertClientPayment): Promise<ClientPayment>;
  
  /**
   * Update existing payment information.
   * Side Effect: Recalculates item status if amount changed
   * @param id - Payment UUID
   * @param payment - Partial payment update data
   * @returns Updated payment object
   * @throws Error if payment not found
   */
  updatePayment(id: string, payment: Partial<InsertClientPayment>): Promise<ClientPayment>;
  
  /**
   * Delete a client payment.
   * Side Effect: Recalculates item status after payment removal
   * @param id - Payment UUID
   * @throws Error if payment not found
   */
  deletePayment(id: string): Promise<void>;

  // --- Vendor Payout Operations ---
  
  /**
   * Retrieve all vendor payouts with item and vendor details.
   * @returns Array of payouts with associated data
   */
  getPayouts(): Promise<Array<VendorPayout & { item: Item; vendor: Vendor }>>;
  
  /**
   * Retrieve items that are sold but have no associated payout yet.
   * @returns Array of items pending payout with vendor details
   */
  getPendingPayouts(): Promise<Array<Item & { vendor: Vendor }>>;
  
  /**
   * Create a new vendor payout.
   * @param payout - Payout creation data
   * @returns Created payout object
   */
  createPayout(payout: InsertVendorPayout): Promise<VendorPayout>;
  
  /**
   * Get comprehensive payout metrics for dashboard display.
   * @returns Payout statistics and trends
   */
  getPayoutMetrics(): Promise<{
    totalPayoutsPaid: number;
    totalPayoutsAmount: number;
    pendingPayouts: number;
    upcomingPayouts: number;
    averagePayoutAmount: number;
    monthlyPayoutTrend: number;
  }>;
  
  /**
   * Retrieve recent payouts for activity feed.
   * @param limit - Maximum number of payouts to return (default: 10)
   * @returns Array of recent payouts with details
   */
  getRecentPayouts(limit?: number): Promise<Array<VendorPayout & { item: Item; vendor: Vendor }>>;
  
  /**
   * Get detailed upcoming payout information with payment progress.
   * @returns Array of items with payment progress and payout calculations
   */
  getUpcomingPayouts(): Promise<Array<{
    itemId: string;
    title: string;
    brand: string;
    model: string;
    minSalesPrice: number;
    maxSalesPrice: number;
    salePrice: number;
    minCost: number;
    maxCost: number;
    totalPaid: number;
    remainingBalance: number;
    paymentProgress: number;
    isFullyPaid: boolean;
    fullyPaidAt?: string;
    firstPaymentDate?: string;
    lastPaymentDate?: string;
    vendor: Vendor;
  }>>;

  // --- Installment Plan Operations ---
  
  /**
   * Retrieve all installment plans with item and client details.
   * @returns Array of installment plans with associated data
   */
  getInstallmentPlans(): Promise<Array<InstallmentPlan & { item: Item & { vendor: Vendor }; client: Client }>>;
  
  /**
   * Retrieve installment plans for a specific item.
   * @param itemId - Item UUID
   * @returns Array of installment plans with client details
   */
  getInstallmentPlansByItem(itemId: string): Promise<Array<InstallmentPlan & { client: Client }>>;
  
  /**
   * Retrieve installment plans for a specific client.
   * @param clientId - Client UUID
   * @returns Array of installment plans with item details
   */
  getInstallmentPlansByClient(clientId: string): Promise<Array<InstallmentPlan & { item: Item & { vendor: Vendor } }>>;
  
  /**
   * Create a new installment plan.
   * @param plan - Installment plan creation data
   * @returns Created installment plan object
   */
  createInstallmentPlan(plan: InsertInstallmentPlan): Promise<InstallmentPlan>;
  
  /**
   * Update existing installment plan information.
   * @param id - Installment plan UUID
   * @param plan - Partial installment plan update data
   * @returns Updated installment plan object
   * @throws Error if plan not found
   */
  updateInstallmentPlan(id: string, plan: Partial<InsertInstallmentPlan>): Promise<InstallmentPlan>;
  
  /**
   * Delete an installment plan.
   * @param id - Installment plan UUID
   */
  deleteInstallmentPlan(id: string): Promise<void>;

  // ===================================================================
  // F) ANALYTICS & REPORTING
  // ===================================================================

  // --- Dashboard Metrics ---
  
  /**
   * Get comprehensive dashboard metrics including financial summaries and ranges.
   * @returns Dashboard metrics with revenue, inventory, and profit calculations
   */
  getDashboardMetrics(): Promise<{
    totalRevenue: number;
    activeItems: number;
    pendingPayouts: { min: number; max: number };
    netProfit: { min: number; max: number };
    incomingPayments: number;
    upcomingPayouts: number;
    costRange: { min: number; max: number };
    inventoryValueRange: { min: number; max: number };
  }>;
  
  /**
   * Get financial data for a specific date range.
   * @param startDate - Start date (YYYY-MM-DD)
   * @param endDate - End date (YYYY-MM-DD)
   * @returns Financial metrics for the specified period
   */
  getFinancialDataByDateRange(startDate: string, endDate: string): Promise<{
    totalRevenue: number;
    totalCosts: number;
    totalProfit: number;
    itemsSold: number;
    averageOrderValue: number;
    totalExpenses: number;
  }>;
  
  /**
   * Retrieve recent items for activity feed.
   * @param limit - Maximum number of items to return (default: 10)
   * @returns Array of recent items with vendor details
   */
  getRecentItems(limit?: number): Promise<Array<Item & { vendor: Vendor }>>;
  
  /**
   * Get top performing items by profit.
   * @param limit - Maximum number of items to return (default: 5)
   * @returns Array of sold items with calculated profit
   */
  getTopPerformingItems(limit?: number): Promise<Array<Item & { vendor: Vendor; profit: number }>>;

  // --- Payment Analytics ---
  
  /**
   * Get comprehensive payment metrics for dashboard display.
   * @returns Payment statistics and trends
   */
  getPaymentMetrics(): Promise<{
    totalPaymentsReceived: number;
    totalPaymentsAmount: number;
    overduePayments: number;
    upcomingPayments: number;
    upcomingPaymentsAmount: number;
    averagePaymentAmount: number;
    monthlyPaymentTrend: number;
  }>;
  
  /**
   * Retrieve upcoming payments from installment plans.
   * @param limit - Maximum number of payments to return
   * @returns Array of upcoming installment payments
   */
  getUpcomingPayments(limit?: number): Promise<Array<InstallmentPlan & { item: Item & { vendor: Vendor }; client: Client }>>;
  
  /**
   * Retrieve recent client payments for activity feed.
   * @param limit - Maximum number of payments to return
   * @returns Array of recent payments with details
   */
  getRecentPayments(limit?: number): Promise<Array<ClientPayment & { item: Item & { vendor: Vendor }; client: Client }>>;
  
  /**
   * Retrieve overdue installment payments.
   * @returns Array of overdue installment plans
   */
  getOverduePayments(): Promise<Array<InstallmentPlan & { item: Item & { vendor: Vendor }; client: Client }>>;

  // --- Financial Health & Intelligence ---
  
  /**
   * Calculate comprehensive financial health score.
   * @returns Health score with factors and recommendations
   */
  getFinancialHealthScore(): Promise<{
    score: number;
    grade: string;
    factors: {
      paymentTimeliness: number;
      cashFlow: number;
      inventoryTurnover: number;
      profitMargin: number;
      clientRetention: number;
    };
    recommendations: string[];
  }>;
  
  /**
   * Mark an installment as paid.
   * @param installmentId - Installment plan UUID
   * @returns Updated installment plan object
   */
  markInstallmentPaid(installmentId: string): Promise<InstallmentPlan>;
  
  /**
   * Send payment reminder for an installment.
   * @param installmentId - Installment plan UUID
   * @returns Success status
   */
  sendPaymentReminder(installmentId: string): Promise<boolean>;

  // --- Business Intelligence & Reporting ---
  
  /**
   * Get comprehensive KPIs for business reporting.
   * @param startDate - Start date for analysis
   * @param endDate - End date for analysis
   * @param filters - Optional filters for data segmentation
   * @returns Comprehensive business metrics
   */
  getReportKPIs(startDate: string, endDate: string, filters?: {
    vendorIds?: string[];
    clientIds?: string[];
    brandIds?: string[];
    categoryIds?: string[];
    itemStatuses?: string[];
  }): Promise<{
    revenue: number;
    cogs: number;
    grossProfit: number;
    grossMargin: number;
    itemsSold: number;
    averageOrderValue: number;
    totalExpenses: number;
    netProfit: number;
    netMargin: number;
    paymentCount: number;
    uniqueClients: number;
    averageDaysToSell: number;
    inventoryTurnover: number;
  }>;
  
  /**
   * Get time series data for trend analysis.
   * @param metric - Metric to analyze
   * @param granularity - Time granularity for grouping
   * @param startDate - Start date for analysis
   * @param endDate - End date for analysis
   * @param filters - Optional filters for data segmentation
   * @returns Time series data points
   */
  getTimeSeries(
    metric: "revenue" | "profit" | "itemsSold" | "payments",
    granularity: "day" | "week" | "month",
    startDate: string,
    endDate: string,
    filters?: {
      vendorIds?: string[];
      clientIds?: string[];
      brandIds?: string[];
      categoryIds?: string[];
      itemStatuses?: string[];
    }
  ): Promise<Array<{
    period: string;
    value: number;
    count?: number;
  }>>;
  
  /**
   * Get grouped metrics for comparative analysis.
   * @param groupBy - Dimension to group by
   * @param metrics - Metrics to calculate for each group
   * @param startDate - Start date for analysis
   * @param endDate - End date for analysis
   * @param filters - Optional filters for data segmentation
   * @returns Grouped metrics data
   */
  getGroupedMetrics(
    groupBy: "brand" | "vendor" | "client" | "category",
    metrics: Array<"revenue" | "profit" | "itemsSold" | "avgOrderValue">,
    startDate: string,
    endDate: string,
    filters?: {
      vendorIds?: string[];
      clientIds?: string[];
      brandIds?: string[];
      categoryIds?: string[];
      itemStatuses?: string[];
    }
  ): Promise<Array<{
    groupId: string;
    groupName: string;
    revenue?: number;
    profit?: number;
    itemsSold?: number;
    avgOrderValue?: number;
  }>>;
  
  /**
   * Get detailed item profitability analysis.
   * @param startDate - Start date for analysis
   * @param endDate - End date for analysis
   * @param filters - Optional filters for data segmentation
   * @param limit - Maximum number of items to return
   * @param offset - Number of items to skip for pagination
   * @returns Paginated item profitability data
   */
  getItemProfitability(
    startDate: string,
    endDate: string,
    filters?: {
      vendorIds?: string[];
      clientIds?: string[];
      brandIds?: string[];
      categoryIds?: string[];
      itemStatuses?: string[];
    },
    limit?: number,
    offset?: number
  ): Promise<{
    items: Array<{
      itemId: string;
      title: string;
      brand: string;
      model: string;
      vendor: string;
      revenue: number;
      cost: number;
      profit: number;
      margin: number;
      soldDate?: string;
      daysToSell?: number;
    }>;
    totalCount: number;
  }>;
  
  /**
   * Get comprehensive inventory health analysis.
   * @param filters - Optional filters for data segmentation
   * @returns Inventory health metrics and breakdown
   */
  getInventoryHealth(filters?: {
    vendorIds?: string[];
    brandIds?: string[];
    categoryIds?: string[];
  }): Promise<{
    totalItems: number;
    inStoreItems: number;
    reservedItems: number;
    soldItems: number;
    partialPaidItems: number;
    totalValue: number;
    avgDaysInInventory: number;
    categoriesBreakdown: Array<{
      categoryId: string;
      categoryName: string;
      itemCount: number;
      totalValue: number;
      avgAge: number;
    }>;
    agingAnalysis: {
      under30Days: number;
      days30To90: number;
      days90To180: number;
      over180Days: number;
    };
  }>;
  
  /**
   * Get payment method breakdown for financial analysis.
   * @param startDate - Start date for analysis
   * @param endDate - End date for analysis
   * @param filters - Optional filters for data segmentation
   * @returns Payment method statistics
   */
  getPaymentMethodBreakdown(
    startDate: string,
    endDate: string,
    filters?: {
      vendorIds?: string[];
      clientIds?: string[];
      brandIds?: string[];
      categoryIds?: string[];
    }
  ): Promise<Array<{
    paymentMethod: string;
    totalAmount: number;
    transactionCount: number;
    percentage: number;
    avgTransactionAmount: number;
  }>>;
  
  /**
   * Get Luxette vendor inventory data for internal metrics.
   * @returns Luxette-specific inventory statistics
   */
  getLuxetteInventoryData(): Promise<{
    itemCount: number;
    totalCost: number;
    priceRange: { min: number; max: number };
  }>;

  // ===================================================================
  // G) CONTRACT MANAGEMENT
  // ===================================================================

  // --- Contract Template Operations ---
  
  /**
   * Retrieve all contract templates ordered by creation date.
   * @returns Array of all contract templates
   */
  getContractTemplates(): Promise<ContractTemplate[]>;
  
  /**
   * Retrieve contract template by ID.
   * @param id - Template UUID
   * @returns Contract template or undefined if not found
   */
  getContractTemplate(id: string): Promise<ContractTemplate | undefined>;
  
  /**
   * Create a new contract template.
   * Side Effect: If marked as default, unsets all other default templates
   * @param template - Template creation data
   * @returns Created contract template
   */
  createContractTemplate(template: InsertContractTemplate): Promise<ContractTemplate>;
  
  /**
   * Update existing contract template.
   * Side Effect: If marked as default, unsets all other default templates
   * @param id - Template UUID
   * @param template - Partial template update data
   * @returns Updated contract template
   * @throws Error if template not found
   */
  updateContractTemplate(id: string, template: Partial<InsertContractTemplate>): Promise<ContractTemplate>;
  
  /**
   * Delete a contract template.
   * @param id - Template UUID
   * @throws Error if template is referenced by existing contracts
   */
  deleteContractTemplate(id: string): Promise<void>;
  
  /**
   * Get the current default contract template.
   * @returns Default template or undefined if none set
   */
  getDefaultContractTemplate(): Promise<ContractTemplate | undefined>;
  
  /**
   * Ensure a default contract template exists, creating one if needed.
   * @returns Default contract template (existing or newly created)
   */
  ensureDefaultContractTemplate(): Promise<ContractTemplate>;
  
  // --- Legacy Contract Template Methods ---
  // @deprecated Use getDefaultContractTemplate instead
  getDefaultTemplate(): Promise<ContractTemplate | undefined>;
  
  // @deprecated Use updateContractTemplate with isDefault: true instead
  setDefaultTemplate(id: string): Promise<ContractTemplate>;

  // --- Contract Operations ---
  
  /**
   * Retrieve all contracts with vendor and template details.
   * @returns Array of contracts with associated data
   */
  getContracts(): Promise<Array<Contract & { vendor: Vendor; template?: ContractTemplate }>>;
  
  /**
   * Retrieve contract by ID with vendor and template details.
   * @param id - Contract UUID
   * @returns Contract with associated data or undefined if not found
   */
  getContract(id: string): Promise<(Contract & { vendor: Vendor; template?: ContractTemplate }) | undefined>;
  
  /**
   * Retrieve contracts for a specific vendor.
   * @param vendorId - Vendor UUID
   * @returns Array of vendor contracts with details
   */
  getContractsByVendor(vendorId: string): Promise<Array<Contract & { vendor: Vendor; template?: ContractTemplate }>>;
  
  /**
   * Create a new contract.
   * @param contract - Contract creation data
   * @returns Created contract object
   */
  createContract(contract: InsertContract): Promise<Contract>;
  
  /**
   * Update existing contract information.
   * @param id - Contract UUID
   * @param contract - Partial contract update data
   * @returns Updated contract object
   * @throws Error if contract not found
   */
  updateContract(id: string, contract: Partial<InsertContract>): Promise<Contract>;
  
  /**
   * Delete a contract.
   * @param id - Contract UUID
   */
  deleteContract(id: string): Promise<void>;
  
  /**
   * Finalize a contract by setting PDF URL and marking as finalized.
   * @param id - Contract UUID
   * @param pdfUrl - URL to the generated PDF contract
   * @returns Finalized contract object
   * @throws Error if contract not found or not in draft status
   */
  finalizeContract(id: string, pdfUrl: string): Promise<Contract>;

  // ===================================================================
  // H) UTILITIES & MIGRATIONS
  // ===================================================================
  
  /**
   * Migrate legacy brand data from item records to brand table.
   * @returns Migration statistics
   */
  migrateLegacyBrands(): Promise<{
    brandsCreated: number;
    itemsUpdated: number;
    skippedItems: number;
  }>;
}

// =====================================================================
// DATABASE STORAGE IMPLEMENTATION
// =====================================================================

export class DatabaseStorage implements IStorage {
  
  // ===================================================================
  // A) AUTHENTICATION & USER MANAGEMENT
  // ===================================================================
  
  /**
   * Retrieve user by ID.
   */
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  /**
   * Retrieve user by email address.
   */
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  /**
   * Create a new user with encrypted password.
   */
  async createUser(userData: CreateUserRequest): Promise<User> {
    const bcrypt = await import("bcrypt");
    const passwordHash = await bcrypt.hash(userData.password, 12);

    const insertData = {
      email: userData.email,
      name: userData.name,
      role: userData.role || ("staff" as const),
      active: userData.active ?? true,
      passwordHash: passwordHash,
    };

    const [user] = await db.insert(users).values(insertData).returning();
    return user;
  }

  /**
   * Update existing user information.
   */
  async updateUser(id: string, userData: UpdateUserRequest): Promise<User> {
    const updateData: any = {
      email: userData.email,
      name: userData.name,
      role: userData.role,
      active: userData.active,
    };

    if (userData.password) {
      const bcrypt = await import("bcrypt");
      updateData.passwordHash = await bcrypt.hash(userData.password, 12);
    }

    // Remove undefined values
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    if (!user) {
      throw new Error("Usuario no encontrado");
    }
    return user;
  }

  /**
   * Update user's last login timestamp.
   */
  async updateLastLogin(id: string): Promise<void> {
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, id));
  }

  /**
   * Retrieve all users ordered by creation date.
   */
  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  // ===================================================================
  // B) PARTIES MANAGEMENT (VENDORS & CLIENTS)
  // ===================================================================

  // --- Vendor Operations ---

  /**
   * Retrieve all vendors ordered by creation date.
   */
  async getVendors(): Promise<Vendor[]> {
    return await db.select().from(vendor).orderBy(desc(vendor.createdAt));
  }

  /**
   * Retrieve vendor by ID.
   */
  async getVendor(id: string): Promise<Vendor | undefined> {
    const [result] = await db
      .select()
      .from(vendor)
      .where(eq(vendor.vendorId, id));
    return result || undefined;
  }

  /**
   * Create a new vendor.
   */
  async createVendor(insertVendor: InsertVendor): Promise<Vendor> {
    const [result] = await db.insert(vendor).values(insertVendor).returning();
    return result;
  }

  /**
   * Update existing vendor information.
   */
  async updateVendor(
    id: string,
    updateVendor: Partial<InsertVendor>,
  ): Promise<Vendor> {
    const [result] = await db
      .update(vendor)
      .set(updateVendor)
      .where(eq(vendor.vendorId, id))
      .returning();
    if (!result) {
      throw new Error("Vendor not found");
    }
    return result;
  }

  /**
   * Delete a vendor.
   */
  async deleteVendor(id: string): Promise<void> {
    await db.delete(vendor).where(eq(vendor.vendorId, id));
  }

  // --- Client Operations ---

  /**
   * Retrieve all clients ordered by creation date.
   */
  async getClients(): Promise<Client[]> {
    return await db.select().from(client).orderBy(desc(client.createdAt));
  }

  /**
   * Retrieve client by ID.
   */
  async getClient(id: string): Promise<Client | undefined> {
    const [result] = await db
      .select()
      .from(client)
      .where(eq(client.clientId, id));
    return result || undefined;
  }

  /**
   * Create a new client.
   */
  async createClient(insertClient: InsertClient): Promise<Client> {
    const [result] = await db.insert(client).values(insertClient).returning();
    return result;
  }

  /**
   * Update existing client information.
   */
  async updateClient(
    id: string,
    updateClient: Partial<InsertClient>,
  ): Promise<Client> {
    const [result] = await db
      .update(client)
      .set(updateClient)
      .where(eq(client.clientId, id))
      .returning();
    if (!result) {
      throw new Error("Client not found");
    }
    return result;
  }

  /**
   * Delete a client.
   */
  async deleteClient(id: string): Promise<void> {
    await db.delete(client).where(eq(client.clientId, id));
  }

  // ===================================================================
  // C) MASTER DATA MANAGEMENT
  // ===================================================================

  // --- Brand Operations ---

  /**
   * Retrieve all brands ordered by creation date.
   */
  async getBrands(): Promise<Brand[]> {
    return await db.select().from(brand).orderBy(desc(brand.createdAt));
  }

  /**
   * Retrieve brand by ID.
   */
  async getBrand(id: string): Promise<Brand | undefined> {
    const [result] = await db.select().from(brand).where(eq(brand.brandId, id));
    return result || undefined;
  }

  /**
   * Create a new brand.
   */
  async createBrand(insertBrand: InsertBrand): Promise<Brand> {
    const [result] = await db.insert(brand).values(insertBrand).returning();
    return result;
  }

  /**
   * Update existing brand information.
   */
  async updateBrand(
    id: string,
    updateBrand: Partial<InsertBrand>,
  ): Promise<Brand> {
    const [result] = await db
      .update(brand)
      .set(updateBrand)
      .where(eq(brand.brandId, id))
      .returning();
    if (!result) {
      throw new Error("Brand not found");
    }
    return result;
  }

  /**
   * Delete a brand.
   * @throws Error if brand is referenced by existing items
   */
  async deleteBrand(id: string): Promise<void> {
    // Check if brand is referenced by any items
    const [referencedItems] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(item)
      .where(eq(item.brandId, id));

    if (Number(referencedItems.count) > 0) {
      throw new Error(
        "Cannot delete brand. It is referenced by existing items.",
      );
    }

    await db.delete(brand).where(eq(brand.brandId, id));
  }

  // --- Category Operations ---

  /**
   * Retrieve all categories ordered by creation date.
   */
  async getCategories(): Promise<Category[]> {
    return await db.select().from(category).orderBy(desc(category.createdAt));
  }

  /**
   * Retrieve category by ID.
   */
  async getCategory(id: string): Promise<Category | undefined> {
    const [result] = await db
      .select()
      .from(category)
      .where(eq(category.categoryId, id));
    return result || undefined;
  }

  /**
   * Create a new category.
   */
  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [result] = await db
      .insert(category)
      .values(insertCategory)
      .returning();
    return result;
  }

  /**
   * Update existing category information.
   */
  async updateCategory(
    id: string,
    updateCategory: Partial<InsertCategory>,
  ): Promise<Category> {
    const [result] = await db
      .update(category)
      .set(updateCategory)
      .where(eq(category.categoryId, id))
      .returning();
    if (!result) {
      throw new Error("Category not found");
    }
    return result;
  }

  /**
   * Delete a category.
   * @throws Error if category is referenced by existing items
   */
  async deleteCategory(id: string): Promise<void> {
    // Check if category is referenced by any items
    const [referencedItems] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(item)
      .where(eq(item.categoryId, id));

    if (Number(referencedItems.count) > 0) {
      throw new Error(
        "Cannot delete category. It is referenced by existing items.",
      );
    }

    await db.delete(category).where(eq(category.categoryId, id));
  }

  // --- Payment Method Operations ---

  /**
   * Retrieve all payment methods ordered by creation date.
   */
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    return await db
      .select()
      .from(paymentMethod)
      .orderBy(desc(paymentMethod.createdAt));
  }

  /**
   * Retrieve payment method by ID.
   */
  async getPaymentMethod(id: string): Promise<PaymentMethod | undefined> {
    const [result] = await db
      .select()
      .from(paymentMethod)
      .where(eq(paymentMethod.paymentMethodId, id));
    return result || undefined;
  }

  /**
   * Create a new payment method.
   */
  async createPaymentMethod(
    insertPaymentMethod: InsertPaymentMethod,
  ): Promise<PaymentMethod> {
    const [result] = await db
      .insert(paymentMethod)
      .values(insertPaymentMethod)
      .returning();
    return result;
  }

  /**
   * Update existing payment method information.
   */
  async updatePaymentMethod(
    id: string,
    updatePaymentMethod: Partial<InsertPaymentMethod>,
  ): Promise<PaymentMethod> {
    const [result] = await db
      .update(paymentMethod)
      .set(updatePaymentMethod)
      .where(eq(paymentMethod.paymentMethodId, id))
      .returning();
    if (!result) {
      throw new Error("Payment method not found");
    }
    return result;
  }

  /**
   * Delete a payment method.
   */
  async deletePaymentMethod(id: string): Promise<void> {
    await db.delete(paymentMethod).where(eq(paymentMethod.paymentMethodId, id));
  }

  // ===================================================================
  // D) INVENTORY MANAGEMENT
  // ===================================================================

  // --- Item Operations ---

  /**
   * Retrieve all items with vendor information, optionally filtered by vendor.
   */
  async getItems(vendorId?: string): Promise<Array<Item & { vendor: Vendor }>> {
    const results = vendorId ?
      await db
        .select()
        .from(item)
        .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
        .where(eq(item.vendorId, vendorId))
        .orderBy(desc(item.createdAt)) :
      await db
        .select()
        .from(item)
        .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
        .orderBy(desc(item.createdAt));
    
    return results.map(mapItemRow);
  }

  /**
   * Retrieve item by ID with vendor information.
   */
  async getItem(id: string): Promise<(Item & { vendor: Vendor }) | undefined> {
    const [result] = await db
      .select()
      .from(item)
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .where(eq(item.itemId, id));
    return result ? mapItemRow(result) : undefined;
  }

  /**
   * Create a new inventory item.
   */
  async createItem(itemData: InsertItem): Promise<Item> {
    // Prepare data for insertion with proper type conversion
    const insertData = {
      ...itemData,
      minCost: toDbNumeric(itemData.minCost),
      maxCost: toDbNumeric(itemData.maxCost),
      minSalesPrice: toDbNumeric(itemData.minSalesPrice),
      maxSalesPrice: toDbNumeric(itemData.maxSalesPrice),
      acquisitionDate: toDbDateOptional(itemData.acquisitionDate),
    };

    const [result] = await db.insert(item).values(insertData).returning();
    return result;
  }

  /**
   * Update existing item information.
   */
  async updateItem(id: string, itemData: Partial<InsertItem>): Promise<Item> {
    // Prepare update data with proper type conversion
    const updateData: any = { ...itemData };

    if (itemData.minCost !== undefined) {
      updateData.minCost = toDbNumeric(itemData.minCost);
    }
    if (itemData.maxCost !== undefined) {
      updateData.maxCost = toDbNumeric(itemData.maxCost);
    }
    if (itemData.minSalesPrice !== undefined) {
      updateData.minSalesPrice = toDbNumeric(itemData.minSalesPrice);
    }
    if (itemData.maxSalesPrice !== undefined) {
      updateData.maxSalesPrice = toDbNumeric(itemData.maxSalesPrice);
    }
    if (itemData.acquisitionDate !== undefined) {
      updateData.acquisitionDate = toDbDateOptional(itemData.acquisitionDate);
    }

    const [result] = await db
      .update(item)
      .set(updateData)
      .where(eq(item.itemId, id))
      .returning();
    if (!result) {
      throw new Error("Item not found");
    }
    return result;
  }

  /**
   * Delete an item.
   * @throws Error if item has associated payments or expenses
   */
  async deleteItem(id: string): Promise<void> {
    // Check for associated payments
    const [paymentsCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(clientPayment)
      .where(eq(clientPayment.itemId, id));

    if (Number(paymentsCount.count) > 0) {
      throw new Error(
        "Cannot delete item. It has associated payment records.",
      );
    }

    // Check for associated expenses
    const [expensesCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(itemExpense)
      .where(eq(itemExpense.itemId, id));

    if (Number(expensesCount.count) > 0) {
      throw new Error(
        "Cannot delete item. It has associated expense records.",
      );
    }

    await db.delete(item).where(eq(item.itemId, id));
  }

  // --- Expense Operations ---

  /**
   * Retrieve all item expenses with item details.
   */
  async getExpenses(): Promise<Array<ItemExpense & { item: Item }>> {
    const results = await db
      .select()
      .from(itemExpense)
      .innerJoin(item, eq(itemExpense.itemId, item.itemId))
      .orderBy(desc(itemExpense.incurredAt));
    
    return results.map(mapExpenseRow);
  }

  /**
   * Retrieve expenses for a specific item.
   */
  async getExpensesByItem(itemId: string): Promise<ItemExpense[]> {
    return await db
      .select()
      .from(itemExpense)
      .where(eq(itemExpense.itemId, itemId))
      .orderBy(desc(itemExpense.incurredAt));
  }

  /**
   * Create a new item expense.
   */
  async createExpense(expenseData: InsertItemExpense): Promise<ItemExpense> {
    // Prepare data for insertion with proper type conversion
    const insertData = {
      ...expenseData,
      amount: toDbNumeric(expenseData.amount),
      incurredAt: toDbTimestamp(expenseData.incurredAt),
    };

    const [result] = await db.insert(itemExpense).values(insertData).returning();
    return result;
  }

  // ===================================================================
  // E) FINANCIAL TRANSACTIONS
  // ===================================================================

  // --- Client Payment Operations ---

  /**
   * Retrieve all client payments with item and client details.
   * Side Effect: None (read-only operation)
   */
  async getPayments(): Promise<Array<ClientPayment & { item: Item & { vendor: Vendor }; client: Client }>> {
    const results = await db
      .select()
      .from(clientPayment)
      .innerJoin(item, eq(clientPayment.itemId, item.itemId))
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .innerJoin(client, eq(clientPayment.clientId, client.clientId))
      .orderBy(desc(clientPayment.paidAt));
    
    return results.map(mapPaymentRow);
  }

  /**
   * Retrieve payments for a specific item.
   */
  async getPaymentsByItem(itemId: string): Promise<Array<ClientPayment & { client: Client }>> {
    return await db
      .select()
      .from(clientPayment)
      .innerJoin(client, eq(clientPayment.clientId, client.clientId))
      .where(eq(clientPayment.itemId, itemId))
      .orderBy(desc(clientPayment.paidAt));
  }

  /**
   * Create a new client payment.
   * Side Effect: Updates item status based on payment completeness (in-store -> partial -> sold)
   */
  async createPayment(paymentData: InsertClientPayment): Promise<ClientPayment> {
    return await db.transaction(async (tx) => {
      // Prepare data for insertion with proper type conversion
      const insertData = {
        ...paymentData,
        amount: toDbNumeric(paymentData.amount),
        paidAt: toDbTimestamp(paymentData.paidAt),
      };

      // Create the payment
      const [payment] = await tx.insert(clientPayment).values(insertData).returning();

      // Update item status based on total payments
      await this.updateItemStatusAfterPaymentChange(paymentData.itemId, tx);

      return payment;
    });
  }

  /**
   * Update existing payment information.
   * Side Effect: Recalculates item status if amount changed
   */
  async updatePayment(id: string, paymentData: Partial<InsertClientPayment>): Promise<ClientPayment> {
    return await db.transaction(async (tx) => {
      // Get the existing payment to check if itemId changed
      const [existingPayment] = await tx
        .select()
        .from(clientPayment)
        .where(eq(clientPayment.paymentId, id));

      if (!existingPayment) {
        throw new Error("Payment not found");
      }

      // Prepare update data with proper type conversion
      const updateData: any = { ...paymentData };

      if (paymentData.amount !== undefined) {
        updateData.amount = toDbNumeric(paymentData.amount);
      }
      if (paymentData.paidAt !== undefined) {
        updateData.paidAt = toDbTimestamp(paymentData.paidAt);
      }

      // Update the payment
      const [payment] = await tx
        .update(clientPayment)
        .set(updateData)
        .where(eq(clientPayment.paymentId, id))
        .returning();

      // Update item status for the current item
      await this.updateItemStatusAfterPaymentChange(payment.itemId, tx);

      // If itemId changed, also update status for the old item
      if (paymentData.itemId && paymentData.itemId !== existingPayment.itemId) {
        await this.updateItemStatusAfterPaymentChange(existingPayment.itemId, tx);
      }

      return payment;
    });
  }

  /**
   * Delete a client payment.
   * Side Effect: Recalculates item status after payment removal
   */
  async deletePayment(id: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Get the payment to find the associated item
      const [payment] = await tx
        .select()
        .from(clientPayment)
        .where(eq(clientPayment.paymentId, id));

      if (!payment) {
        throw new Error("Payment not found");
      }

      // Delete the payment
      await tx.delete(clientPayment).where(eq(clientPayment.paymentId, id));

      // Update item status after payment removal
      await this.updateItemStatusAfterPaymentChange(payment.itemId, tx);
    });
  }

  /**
   * Helper method to update item status based on payment completeness.
   * @private
   */
  private async updateItemStatusAfterPaymentChange(itemId: string, tx: any): Promise<void> {
    // Get item details
    const [itemDetail] = await tx
      .select()
      .from(item)
      .where(eq(item.itemId, itemId));

    if (!itemDetail) return;

    // Calculate total payments for this item
    const [paymentSummary] = await tx
      .select({
        totalPaid: sum(clientPayment.amount),
      })
      .from(clientPayment)
      .where(eq(clientPayment.itemId, itemId));

    const totalPaid = Number(paymentSummary.totalPaid) || 0;
    const salePrice = Number(itemDetail.salePrice) || 0;

    // Determine new status based on payment completeness
    let newStatus = itemDetail.status;

    if (salePrice > 0) {
      if (totalPaid === 0) {
        newStatus = "in-store";
      } else if (totalPaid >= salePrice) {
        newStatus = "sold";
      } else {
        newStatus = "partial";
      }
    }

    // Update item status if it changed
    if (newStatus !== itemDetail.status) {
      await tx
        .update(item)
        .set({ status: newStatus })
        .where(eq(item.itemId, itemId));
    }
  }

  // --- Vendor Payout Operations ---

  /**
   * Retrieve all vendor payouts with item and vendor details.
   */
  async getPayouts(): Promise<Array<VendorPayout & { item: Item; vendor: Vendor }>> {
    return await db
      .select()
      .from(vendorPayout)
      .innerJoin(item, eq(vendorPayout.itemId, item.itemId))
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .orderBy(desc(vendorPayout.paidAt));
  }

  /**
   * Retrieve items that are sold but have no associated payout yet.
   */
  async getPendingPayouts(): Promise<Array<Item & { vendor: Vendor }>> {
    return await db
      .select()
      .from(item)
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .leftJoin(vendorPayout, eq(item.itemId, vendorPayout.itemId))
      .where(and(eq(item.status, "sold"), isNull(vendorPayout.payoutId)))
      .orderBy(desc(item.createdAt));
  }

  /**
   * Create a new vendor payout.
   */
  async createPayout(payoutData: InsertVendorPayout): Promise<VendorPayout> {
    // Prepare data for insertion with proper type conversion
    const insertData = {
      ...payoutData,
      amount: toDbNumeric(payoutData.amount),
      paidAt: toDbTimestamp(payoutData.paidAt),
    };

    const [result] = await db.insert(vendorPayout).values(insertData).returning();
    return result;
  }

  /**
   * Get comprehensive payout metrics for dashboard display.
   */
  async getPayoutMetrics(): Promise<{
    totalPayoutsPaid: number;
    totalPayoutsAmount: number;
    pendingPayouts: number;
    upcomingPayouts: number;
    averagePayoutAmount: number;
    monthlyPayoutTrend: number;
  }> {
    // Get total payouts count and amount
    const [payoutStats] = await db
      .select({
        totalPayoutsPaid: count(vendorPayout.payoutId),
        totalPayoutsAmount: sum(vendorPayout.amount),
      })
      .from(vendorPayout);

    // Get pending payouts count
    const [pendingStats] = await db
      .select({
        pendingPayouts: count(item.itemId),
      })
      .from(item)
      .leftJoin(vendorPayout, eq(item.itemId, vendorPayout.itemId))
      .where(and(eq(item.status, "sold"), isNull(vendorPayout.payoutId)));

    // Get this month's payouts for trend analysis
    const currentMonth = new Date().toISOString().slice(0, 7) + "%";
    const [monthlyStats] = await db
      .select({
        monthlyCount: count(vendorPayout.payoutId),
      })
      .from(vendorPayout)
      .where(sql`${vendorPayout.paidAt} LIKE ${currentMonth}`);

    const totalPayoutsAmount = Number(payoutStats.totalPayoutsAmount) || 0;
    const totalPayoutsPaid = Number(payoutStats.totalPayoutsPaid) || 0;
    const pendingPayouts = Number(pendingStats.pendingPayouts) || 0;
    const monthlyCount = Number(monthlyStats.monthlyCount) || 0;

    return {
      totalPayoutsPaid,
      totalPayoutsAmount,
      pendingPayouts,
      upcomingPayouts: pendingPayouts, // Same as pending for this implementation
      averagePayoutAmount: totalPayoutsPaid > 0 ? totalPayoutsAmount / totalPayoutsPaid : 0,
      monthlyPayoutTrend: monthlyCount,
    };
  }

  /**
   * Retrieve recent payouts for activity feed.
   */
  async getRecentPayouts(limit?: number): Promise<Array<VendorPayout & { item: Item; vendor: Vendor }>> {
    return await db
      .select()
      .from(vendorPayout)
      .innerJoin(item, eq(vendorPayout.itemId, item.itemId))
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .orderBy(desc(vendorPayout.payoutDate))
      .limit(limit || 10);
  }

  /**
   * Get detailed upcoming payout information with payment progress.
   */
  async getUpcomingPayouts(): Promise<Array<{
    itemId: string;
    title: string;
    brand: string;
    model: string;
    minSalesPrice: number;
    maxSalesPrice: number;
    salePrice: number;
    minCost: number;
    maxCost: number;
    totalPaid: number;
    remainingBalance: number;
    paymentProgress: number;
    isFullyPaid: boolean;
    fullyPaidAt?: string;
    firstPaymentDate?: string;
    lastPaymentDate?: string;
    vendor: Vendor;
  }>> {
    // Get sold items without payouts with payment information
    const results = await db
      .select()
      .from(item)
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .leftJoin(vendorPayout, eq(item.itemId, vendorPayout.itemId))
      .leftJoin(clientPayment, eq(item.itemId, clientPayment.itemId))
      .where(and(eq(item.status, "sold"), isNull(vendorPayout.payoutId)))
      .orderBy(desc(item.createdAt));

    // Group results by item and calculate payment totals
    const itemsMap = new Map();
    for (const row of results) {
      const itemId = row.item.itemId;
      
      if (!itemsMap.has(itemId)) {
        itemsMap.set(itemId, {
          ...row.item,
          vendor: row.vendor,
          payments: [],
        });
      }
      
      if (row.clientPayment) {
        itemsMap.get(itemId).payments.push(row.clientPayment);
      }
    }

    return Array.from(itemsMap.values()).map((itemData) => {
      const totalPaid = itemData.payments.reduce((sum: number, payment: any) => sum + Number(payment.amount), 0);
      const salePrice = Number(itemData.salePrice) || 0;
      const isFullyPaid = totalPaid >= salePrice;
      
      // Get payment dates
      const paymentDates = itemData.payments.map((p: any) => p.paymentDate).sort();
      const firstPaymentDate = paymentDates.length > 0 ? paymentDates[0] : undefined;
      const lastPaymentDate = paymentDates.length > 0 ? paymentDates[paymentDates.length - 1] : undefined;

      return {
        itemId: itemData.itemId,
        title: itemData.title,
        brand: itemData.brand || "",
        model: itemData.model || "",
        minSalesPrice: Number(itemData.minSalesPrice),
        maxSalesPrice: Number(itemData.maxSalesPrice),
        salePrice,
        minCost: Number(itemData.minCost),
        maxCost: Number(itemData.maxCost),
        totalPaid,
        remainingBalance: Math.max(0, salePrice - totalPaid),
        paymentProgress: salePrice > 0 ? Math.min(100, (totalPaid / salePrice) * 100) : 0,
        isFullyPaid,
        fullyPaidAt: isFullyPaid ? lastPaymentDate : undefined,
        firstPaymentDate,
        lastPaymentDate,
        vendor: itemData.vendor,
      };
    });
  }

  // --- Installment Plan Operations ---

  /**
   * Retrieve all installment plans with item and client details.
   */
  async getInstallmentPlans(): Promise<Array<InstallmentPlan & { item: Item & { vendor: Vendor }; client: Client }>> {
    return await db
      .select()
      .from(installmentPlan)
      .innerJoin(item, eq(installmentPlan.itemId, item.itemId))
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .innerJoin(client, eq(installmentPlan.clientId, client.clientId))
      .orderBy(desc(installmentPlan.nextPaymentDate));
  }

  /**
   * Retrieve installment plans for a specific item.
   */
  async getInstallmentPlansByItem(itemId: string): Promise<Array<InstallmentPlan & { client: Client }>> {
    return await db
      .select()
      .from(installmentPlan)
      .innerJoin(client, eq(installmentPlan.clientId, client.clientId))
      .where(eq(installmentPlan.itemId, itemId))
      .orderBy(desc(installmentPlan.nextPaymentDate));
  }

  /**
   * Retrieve installment plans for a specific client.
   */
  async getInstallmentPlansByClient(clientId: string): Promise<Array<InstallmentPlan & { item: Item & { vendor: Vendor } }>> {
    return await db
      .select()
      .from(installmentPlan)
      .innerJoin(item, eq(installmentPlan.itemId, item.itemId))
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .where(eq(installmentPlan.clientId, clientId))
      .orderBy(desc(installmentPlan.nextPaymentDate));
  }

  /**
   * Create a new installment plan.
   */
  async createInstallmentPlan(planData: InsertInstallmentPlan): Promise<InstallmentPlan> {
    // Prepare data for insertion with proper type conversion
    const insertData = {
      ...planData,
      totalAmount: toDbNumeric(planData.totalAmount),
      installmentAmount: toDbNumeric(planData.installmentAmount),
      paidAmount: toDbNumeric(planData.paidAmount || 0),
      startDate: toDbDate(planData.startDate),
      nextPaymentDate: toDbDateOptional(planData.nextPaymentDate),
      endDate: toDbDateOptional(planData.endDate),
      recordedAt: toDbTimestamp(planData.recordedAt),
    };

    const [result] = await db.insert(installmentPlan).values(insertData).returning();
    return result;
  }

  /**
   * Update existing installment plan information.
   */
  async updateInstallmentPlan(id: string, planData: Partial<InsertInstallmentPlan>): Promise<InstallmentPlan> {
    // Prepare update data with proper type conversion
    const updateData: any = { ...planData };

    if (planData.totalAmount !== undefined) {
      updateData.totalAmount = toDbNumeric(planData.totalAmount);
    }
    if (planData.installmentAmount !== undefined) {
      updateData.installmentAmount = toDbNumeric(planData.installmentAmount);
    }
    if (planData.paidAmount !== undefined) {
      updateData.paidAmount = toDbNumeric(planData.paidAmount);
    }
    if (planData.startDate !== undefined) {
      updateData.startDate = toDbDate(planData.startDate);
    }
    if (planData.nextPaymentDate !== undefined) {
      updateData.nextPaymentDate = toDbDateOptional(planData.nextPaymentDate);
    }
    if (planData.endDate !== undefined) {
      updateData.endDate = toDbDateOptional(planData.endDate);
    }
    if (planData.recordedAt !== undefined) {
      updateData.recordedAt = toDbTimestamp(planData.recordedAt);
    }

    const [result] = await db
      .update(installmentPlan)
      .set(updateData)
      .where(eq(installmentPlan.planId, id))
      .returning();
    if (!result) {
      throw new Error("Installment plan not found");
    }
    return result;
  }

  /**
   * Delete an installment plan.
   */
  async deleteInstallmentPlan(id: string): Promise<void> {
    await db.delete(installmentPlan).where(eq(installmentPlan.planId, id));
  }

  // ===================================================================
  // F) ANALYTICS & REPORTING
  // ===================================================================

  // --- Dashboard Metrics ---

  /**
   * Get comprehensive dashboard metrics including financial summaries and ranges.
   */
  async getDashboardMetrics(): Promise<{
    totalRevenue: number;
    activeItems: number;
    pendingPayouts: { min: number; max: number };
    netProfit: { min: number; max: number };
    incomingPayments: number;
    upcomingPayouts: number;
    costRange: { min: number; max: number };
    inventoryValueRange: { min: number; max: number };
  }> {
    // Get total revenue from payments
    const [revenueStats] = await db
      .select({
        totalRevenue: sum(clientPayment.amount),
      })
      .from(clientPayment);

    // Get active items count (in-store, reserved, partial)
    const [activeItemsStats] = await db
      .select({
        activeItems: count(item.itemId),
      })
      .from(item)
      .where(inArray(item.status, ["in-store", "reserved", "partial"]));

    // Get pending payouts range
    const [pendingPayoutStats] = await db
      .select({
        minPayout: sql<number>`MIN(CASE WHEN ${item.salePrice} IS NOT NULL THEN ${item.minCost} END)`,
        maxPayout: sql<number>`MAX(CASE WHEN ${item.salePrice} IS NOT NULL THEN ${item.maxCost} END)`,
        count: count(item.itemId),
      })
      .from(item)
      .leftJoin(vendorPayout, eq(item.itemId, vendorPayout.itemId))
      .where(and(eq(item.status, "sold"), isNull(vendorPayout.payoutId)));

    // Get upcoming payouts count
    const upcomingPayouts = Number(pendingPayoutStats.count) || 0;

    // Calculate cost range for all items
    const [costRangeStats] = await db
      .select({
        minCost: sql<number>`MIN(${item.minCost})`,
        maxCost: sql<number>`MAX(${item.maxCost})`,
      })
      .from(item);

    // Calculate inventory value range for active items
    const [inventoryValueStats] = await db
      .select({
        minValue: sql<number>`MIN(${item.minSalesPrice})`,
        maxValue: sql<number>`MAX(${item.maxSalesPrice})`,
      })
      .from(item)
      .where(inArray(item.status, ["in-store", "reserved", "partial"]));

    // Get upcoming installment payments count
    const today = new Date().toISOString().slice(0, 10);
    const [upcomingInstallments] = await db
      .select({
        incomingPayments: count(installmentPlan.planId),
      })
      .from(installmentPlan)
      .where(
        and(
          eq(installmentPlan.status, "active"),
          sql`${installmentPlan.nextPaymentDate} <= DATE('${today}', '+30 days')`
        )
      );

    return {
      totalRevenue: Number(revenueStats.totalRevenue) || 0,
      activeItems: Number(activeItemsStats.activeItems) || 0,
      pendingPayouts: {
        min: Number(pendingPayoutStats.minPayout) || 0,
        max: Number(pendingPayoutStats.maxPayout) || 0,
      },
      netProfit: {
        min: 0, // Calculated as revenue - costs - expenses (simplified for this implementation)
        max: Number(revenueStats.totalRevenue) || 0,
      },
      incomingPayments: Number(upcomingInstallments.incomingPayments) || 0,
      upcomingPayouts,
      costRange: {
        min: Number(costRangeStats.minCost) || 0,
        max: Number(costRangeStats.maxCost) || 0,
      },
      inventoryValueRange: {
        min: Number(inventoryValueStats.minValue) || 0,
        max: Number(inventoryValueStats.maxValue) || 0,
      },
    };
  }

  /**
   * Get financial data for a specific date range.
   */
  async getFinancialDataByDateRange(startDate: string, endDate: string): Promise<{
    totalRevenue: number;
    totalCosts: number;
    totalProfit: number;
    itemsSold: number;
    averageOrderValue: number;
    totalExpenses: number;
  }> {
    // Get revenue from payments in date range
    const [revenueStats] = await db
      .select({
        totalRevenue: sum(clientPayment.amount),
        paymentCount: count(clientPayment.paymentId),
      })
      .from(clientPayment)
      .where(
        and(
          sql`${clientPayment.paymentDate} >= ${startDate}`,
          sql`${clientPayment.paymentDate} <= ${endDate}`
        )
      );

    // Get items sold in date range (based on when they were marked as sold)
    const [soldItemsStats] = await db
      .select({
        itemsSold: count(item.itemId),
        totalMinCost: sum(item.minCost),
        totalMaxCost: sum(item.maxCost),
      })
      .from(item)
      .innerJoin(clientPayment, eq(item.itemId, clientPayment.itemId))
      .where(
        and(
          eq(item.status, "sold"),
          sql`${clientPayment.paymentDate} >= ${startDate}`,
          sql`${clientPayment.paymentDate} <= ${endDate}`
        )
      );

    // Get total expenses in date range
    const [expenseStats] = await db
      .select({
        totalExpenses: sum(itemExpense.amount),
      })
      .from(itemExpense)
      .where(
        and(
          sql`${itemExpense.expenseDate} >= ${startDate}`,
          sql`${itemExpense.expenseDate} <= ${endDate}`
        )
      );

    const totalRevenue = Number(revenueStats.totalRevenue) || 0;
    const itemsSold = Number(soldItemsStats.itemsSold) || 0;
    const totalCosts = Number(soldItemsStats.totalMinCost) || 0; // Using min cost as conservative estimate
    const totalExpenses = Number(expenseStats.totalExpenses) || 0;
    const paymentCount = Number(revenueStats.paymentCount) || 0;

    return {
      totalRevenue,
      totalCosts,
      totalProfit: totalRevenue - totalCosts - totalExpenses,
      itemsSold,
      averageOrderValue: paymentCount > 0 ? totalRevenue / paymentCount : 0,
      totalExpenses,
    };
  }

  /**
   * Retrieve recent items for activity feed.
   */
  async getRecentItems(limit?: number): Promise<Array<Item & { vendor: Vendor }>> {
    return await db
      .select()
      .from(item)
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .orderBy(desc(item.createdAt))
      .limit(limit || 10);
  }

  /**
   * Get top performing items by profit.
   */
  async getTopPerformingItems(limit?: number): Promise<Array<Item & { vendor: Vendor; profit: number }>> {
    // Get sold items with payment totals
    const results = await db
      .select()
      .from(item)
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .leftJoin(clientPayment, eq(item.itemId, clientPayment.itemId))
      .where(eq(item.status, "sold"))
      .orderBy(desc(item.createdAt));

    // Group by item and calculate profits
    const itemsMap = new Map();
    for (const row of results) {
      const itemId = row.item.itemId;
      
      if (!itemsMap.has(itemId)) {
        itemsMap.set(itemId, {
          ...row.item,
          vendor: row.vendor,
          payments: [],
        });
      }
      
      if (row.clientPayment) {
        itemsMap.get(itemId).payments.push(row.clientPayment);
      }
    }

    // Calculate profit for each item
    const itemsWithProfit = Array.from(itemsMap.values()).map((itemData) => {
      const totalRevenue = itemData.payments.reduce((sum: number, payment: any) => sum + Number(payment.amount), 0);
      const avgCost = (Number(itemData.minCost) + Number(itemData.maxCost)) / 2;
      const profit = totalRevenue - avgCost;
      
      return {
        ...itemData,
        profit,
      };
    });

    // Sort by profit and limit results
    return itemsWithProfit
      .sort((a, b) => b.profit - a.profit)
      .slice(0, limit || 5);
  }

  /**
   * Get Luxette vendor inventory data for internal metrics.
   */
  async getLuxetteInventoryData(): Promise<{
    itemCount: number;
    totalCost: number;
    priceRange: { min: number; max: number };
  }> {
    // Find Luxette vendor (case-insensitive search)
    const [luxetteVendor] = await db
      .select()
      .from(vendor)
      .where(sql`LOWER(${vendor.name}) LIKE '%luxette%'`);

    if (!luxetteVendor) {
      return {
        itemCount: 0,
        totalCost: 0,
        priceRange: { min: 0, max: 0 },
      };
    }

    const [luxetteStats] = await db
      .select({
        itemCount: count(item.itemId),
        totalMinCost: sum(item.minCost),
        totalMaxCost: sum(item.maxCost),
        minPrice: sql<number>`MIN(${item.minSalesPrice})`,
        maxPrice: sql<number>`MAX(${item.maxSalesPrice})`,
      })
      .from(item)
      .where(eq(item.vendorId, luxetteVendor.vendorId));

    const avgTotalCost = (Number(luxetteStats.totalMinCost) + Number(luxetteStats.totalMaxCost)) / 2;

    return {
      itemCount: Number(luxetteStats.itemCount) || 0,
      totalCost: avgTotalCost || 0,
      priceRange: {
        min: Number(luxetteStats.minPrice) || 0,
        max: Number(luxetteStats.maxPrice) || 0,
      },
    };
  }

  // --- Payment Analytics ---

  /**
   * Get comprehensive payment metrics for dashboard display.
   */
  async getPaymentMetrics(): Promise<{
    totalPaymentsReceived: number;
    totalPaymentsAmount: number;
    overduePayments: number;
    upcomingPayments: number;
    upcomingPaymentsAmount: number;
    averagePaymentAmount: number;
    monthlyPaymentTrend: number;
  }> {
    // Get total payments statistics
    const [paymentStats] = await db
      .select({
        totalPaymentsReceived: count(clientPayment.paymentId),
        totalPaymentsAmount: sum(clientPayment.amount),
      })
      .from(clientPayment);

    // Get overdue installment payments
    const today = new Date().toISOString().slice(0, 10);
    const [overdueStats] = await db
      .select({
        overduePayments: count(installmentPlan.planId),
      })
      .from(installmentPlan)
      .where(
        and(
          eq(installmentPlan.status, "active"),
          sql`${installmentPlan.nextPaymentDate} < '${today}'`
        )
      );

    // Get upcoming installment payments (next 30 days)
    const [upcomingStats] = await db
      .select({
        upcomingPayments: count(installmentPlan.planId),
        upcomingPaymentsAmount: sum(installmentPlan.installmentAmount),
      })
      .from(installmentPlan)
      .where(
        and(
          eq(installmentPlan.status, "active"),
          sql`${installmentPlan.nextPaymentDate} <= DATE('${today}', '+30 days')`,
          sql`${installmentPlan.nextPaymentDate} >= '${today}'`
        )
      );

    // Get this month's payments for trend analysis
    const currentMonth = new Date().toISOString().slice(0, 7) + "%";
    const [monthlyStats] = await db
      .select({
        monthlyCount: count(clientPayment.paymentId),
      })
      .from(clientPayment)
      .where(sql`${clientPayment.paymentDate} LIKE ${currentMonth}`);

    const totalPaymentsAmount = Number(paymentStats.totalPaymentsAmount) || 0;
    const totalPaymentsReceived = Number(paymentStats.totalPaymentsReceived) || 0;

    return {
      totalPaymentsReceived,
      totalPaymentsAmount,
      overduePayments: Number(overdueStats.overduePayments) || 0,
      upcomingPayments: Number(upcomingStats.upcomingPayments) || 0,
      upcomingPaymentsAmount: Number(upcomingStats.upcomingPaymentsAmount) || 0,
      averagePaymentAmount: totalPaymentsReceived > 0 ? totalPaymentsAmount / totalPaymentsReceived : 0,
      monthlyPaymentTrend: Number(monthlyStats.monthlyCount) || 0,
    };
  }

  /**
   * Retrieve upcoming payments from installment plans.
   */
  async getUpcomingPayments(limit?: number): Promise<Array<InstallmentPlan & { item: Item & { vendor: Vendor }; client: Client }>> {
    const today = new Date().toISOString().slice(0, 10);
    
    return await db
      .select()
      .from(installmentPlan)
      .innerJoin(item, eq(installmentPlan.itemId, item.itemId))
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .innerJoin(client, eq(installmentPlan.clientId, client.clientId))
      .where(
        and(
          eq(installmentPlan.status, "active"),
          sql`${installmentPlan.nextPaymentDate} <= DATE('${today}', '+30 days')`,
          sql`${installmentPlan.nextPaymentDate} >= '${today}'`
        )
      )
      .orderBy(installmentPlan.nextPaymentDate)
      .limit(limit || 10);
  }

  /**
   * Retrieve recent client payments for activity feed.
   */
  async getRecentPayments(limit?: number): Promise<Array<ClientPayment & { item: Item & { vendor: Vendor }; client: Client }>> {
    return await db
      .select()
      .from(clientPayment)
      .innerJoin(item, eq(clientPayment.itemId, item.itemId))
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .innerJoin(client, eq(clientPayment.clientId, client.clientId))
      .orderBy(desc(clientPayment.paymentDate))
      .limit(limit || 10);
  }

  /**
   * Retrieve overdue installment payments.
   */
  async getOverduePayments(): Promise<Array<InstallmentPlan & { item: Item & { vendor: Vendor }; client: Client }>> {
    const today = new Date().toISOString().slice(0, 10);
    
    return await db
      .select()
      .from(installmentPlan)
      .innerJoin(item, eq(installmentPlan.itemId, item.itemId))
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .innerJoin(client, eq(installmentPlan.clientId, client.clientId))
      .where(
        and(
          eq(installmentPlan.status, "active"),
          sql`${installmentPlan.nextPaymentDate} < '${today}'`
        )
      )
      .orderBy(installmentPlan.nextPaymentDate);
  }

  // --- Financial Health & Intelligence ---

  /**
   * Calculate comprehensive financial health score.
   */
  async getFinancialHealthScore(): Promise<{
    score: number;
    grade: string;
    factors: {
      paymentTimeliness: number;
      cashFlow: number;
      inventoryTurnover: number;
      profitMargin: number;
      clientRetention: number;
    };
    recommendations: string[];
  }> {
    // Calculate payment timeliness (overdue vs total active installments)
    const today = new Date().toISOString().slice(0, 10);
    const [timelinesStats] = await db
      .select({
        totalActive: count(installmentPlan.planId),
        overdue: sql<number>`SUM(CASE WHEN ${installmentPlan.nextPaymentDate} < '${today}' THEN 1 ELSE 0 END)`,
      })
      .from(installmentPlan)
      .where(eq(installmentPlan.status, "active"));

    const totalActive = Number(timelinesStats.totalActive) || 1;
    const overdue = Number(timelinesStats.overdue) || 0;
    const paymentTimeliness = Math.max(0, (totalActive - overdue) / totalActive * 100);

    // Calculate cash flow (payments vs payouts in last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    
    const [cashFlowStats] = await db
      .select({
        paymentsIn: sum(clientPayment.amount),
      })
      .from(clientPayment)
      .where(sql`${clientPayment.paymentDate} >= '${thirtyDaysAgo}'`);

    const [payoutsOut] = await db
      .select({
        payoutsOut: sum(vendorPayout.amount),
      })
      .from(vendorPayout)
      .where(sql`${vendorPayout.payoutDate} >= '${thirtyDaysAgo}'`);

    const paymentsIn = Number(cashFlowStats.paymentsIn) || 0;
    const payoutsOutAmount = Number(payoutsOut.payoutsOut) || 0;
    const cashFlow = paymentsIn > 0 ? Math.min(100, (paymentsIn - payoutsOutAmount) / paymentsIn * 100) : 50;

    // Calculate inventory turnover (sold vs total items)
    const [inventoryStats] = await db
      .select({
        totalItems: count(item.itemId),
        soldItems: sql<number>`SUM(CASE WHEN ${item.status} = 'sold' THEN 1 ELSE 0 END)`,
      })
      .from(item);

    const totalItems = Number(inventoryStats.totalItems) || 1;
    const soldItems = Number(inventoryStats.soldItems) || 0;
    const inventoryTurnover = (soldItems / totalItems) * 100;

    // Calculate profit margin (simple approximation)
    const [profitStats] = await db
      .select({
        totalRevenue: sum(clientPayment.amount),
      })
      .from(clientPayment);

    const [costStats] = await db
      .select({
        totalCosts: sum(item.minCost),
      })
      .from(item)
      .where(eq(item.status, "sold"));

    const totalRevenue = Number(profitStats.totalRevenue) || 1;
    const totalCosts = Number(costStats.totalCosts) || 0;
    const profitMargin = Math.max(0, (totalRevenue - totalCosts) / totalRevenue * 100);

    // Calculate client retention (clients with multiple purchases)
    const [clientStats] = await db
      .select({
        totalClients: count(client.clientId),
      })
      .from(client);

    const [repeatClients] = await db
      .select({
        repeatClients: sql<number>`COUNT(DISTINCT ${clientPayment.clientId})`,
      })
      .from(clientPayment)
      .groupBy(clientPayment.clientId)
      .having(sql`COUNT(${clientPayment.paymentId}) > 1`);

    const totalClients = Number(clientStats.totalClients) || 1;
    const repeatClientsCount = Number(repeatClients.repeatClients) || 0;
    const clientRetention = (repeatClientsCount / totalClients) * 100;

    // Calculate overall score
    const factors = {
      paymentTimeliness: Math.round(paymentTimeliness),
      cashFlow: Math.round(Math.max(0, cashFlow)),
      inventoryTurnover: Math.round(inventoryTurnover),
      profitMargin: Math.round(profitMargin),
      clientRetention: Math.round(clientRetention),
    };

    const score = Math.round(
      (factors.paymentTimeliness * 0.25) +
      (factors.cashFlow * 0.25) +
      (factors.inventoryTurnover * 0.2) +
      (factors.profitMargin * 0.2) +
      (factors.clientRetention * 0.1)
    );

    // Determine grade
    let grade = "F";
    if (score >= 90) grade = "A";
    else if (score >= 80) grade = "B";
    else if (score >= 70) grade = "C";
    else if (score >= 60) grade = "D";

    // Generate recommendations
    const recommendations: string[] = [];
    if (factors.paymentTimeliness < 80) {
      recommendations.push("Improve payment collection processes to reduce overdue accounts");
    }
    if (factors.cashFlow < 70) {
      recommendations.push("Monitor cash flow more closely and consider payment terms adjustments");
    }
    if (factors.inventoryTurnover < 50) {
      recommendations.push("Focus on moving slow-selling inventory and optimizing product mix");
    }
    if (factors.profitMargin < 60) {
      recommendations.push("Review pricing strategy and cost structure to improve margins");
    }
    if (factors.clientRetention < 40) {
      recommendations.push("Implement client retention strategies to encourage repeat business");
    }

    return {
      score,
      grade,
      factors,
      recommendations,
    };
  }

  // --- Business Intelligence & Reporting ---
  
  /**
   * Get comprehensive KPIs for business reporting.
   */
  async getReportKPIs(startDate: string, endDate: string, filters?: {
    vendorIds?: string[];
    clientIds?: string[];
    brandIds?: string[];
    categoryIds?: string[];
  }): Promise<{
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    itemsSold: number;
    activeItems: number;
    averageOrderValue: number;
    topSellingBrands: Array<{ brandName: string; itemCount: number; revenue: number }>;
    paymentMethodBreakdown: Array<{ method: string; count: number; amount: number }>;
  }> {
    // Basic implementation - can be expanded based on specific requirements
    const [revenueStats] = await db
      .select({
        totalRevenue: sum(clientPayment.amount),
        paymentCount: count(clientPayment.paymentId),
      })
      .from(clientPayment)
      .where(
        and(
          sql`${clientPayment.paidAt} >= ${startDate}`,
          sql`${clientPayment.paidAt} <= ${endDate}`
        )
      );

    const [itemStats] = await db
      .select({
        activeItems: count(item.itemId),
        totalCost: sum(item.minCost),
      })
      .from(item);

    const totalRevenue = Number(revenueStats.totalRevenue) || 0;
    const totalCost = Number(itemStats.totalCost) || 0;
    const paymentCount = Number(revenueStats.paymentCount) || 1;

    return {
      totalRevenue,
      totalCost,
      totalProfit: totalRevenue - totalCost,
      itemsSold: 0, // Would need complex query to calculate
      activeItems: Number(itemStats.activeItems) || 0,
      averageOrderValue: totalRevenue / paymentCount,
      topSellingBrands: [], // Would need complex join to calculate
      paymentMethodBreakdown: [], // Would need aggregation by payment method
    };
  }

  /**
   * Get time series data for analytics.
   */
  async getTimeSeries(
    metric: string,
    startDate: string,
    endDate: string,
    granularity: 'day' | 'week' | 'month'
  ): Promise<Array<{ date: string; value: number }>> {
    // Basic implementation for revenue time series
    if (metric === 'revenue') {
      const results = await db
        .select({
          date: sql<string>`DATE(${clientPayment.paidAt})`,
          value: sum(clientPayment.amount),
        })
        .from(clientPayment)
        .where(
          and(
            sql`${clientPayment.paidAt} >= ${startDate}`,
            sql`${clientPayment.paidAt} <= ${endDate}`
          )
        )
        .groupBy(sql`DATE(${clientPayment.paidAt})`)
        .orderBy(sql`DATE(${clientPayment.paidAt})`);

      return results.map(r => ({ date: r.date, value: Number(r.value) || 0 }));
    }
    
    return [];
  }

  /**
   * Get grouped metrics for dashboard widgets.
   */
  async getGroupedMetrics(
    groupBy: 'vendor' | 'brand' | 'category' | 'paymentMethod',
    metric: 'revenue' | 'itemCount' | 'profit',
    filters?: {
      startDate?: string;
      endDate?: string;
    }
  ): Promise<Array<{ group: string; value: number; label: string }>> {
    // Basic implementation for vendor grouping
    if (groupBy === 'vendor' && metric === 'revenue') {
      const results = await db
        .select({
          vendorName: vendor.name,
          revenue: sum(clientPayment.amount),
        })
        .from(clientPayment)
        .innerJoin(item, eq(clientPayment.itemId, item.itemId))
        .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
        .groupBy(vendor.vendorId, vendor.name)
        .orderBy(desc(sum(clientPayment.amount)));

      return results.map(r => ({
        group: r.vendorName || 'Unknown',
        value: Number(r.revenue) || 0,
        label: r.vendorName || 'Unknown'
      }));
    }

    return [];
  }

  /**
   * Get item profitability analysis.
   */
  async getItemProfitability(
    filters?: {
      vendorIds?: string[];
      brandIds?: string[];
      categoryIds?: string[];
      status?: string[];
    }
  ): Promise<Array<{
    itemId: string;
    title: string;
    brand: string;
    cost: number;
    revenue: number;
    profit: number;
    profitMargin: number;
    vendor: { name: string; vendorId: string };
  }>> {
    // Basic implementation
    const results = await db
      .select()
      .from(item)
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .leftJoin(clientPayment, eq(item.itemId, clientPayment.itemId))
      .where(eq(item.status, 'sold'));

    const itemMap = new Map();
    for (const row of results) {
      const itemId = row.item.itemId;
      
      if (!itemMap.has(itemId)) {
        itemMap.set(itemId, {
          ...row.item,
          vendor: row.vendor,
          payments: [],
        });
      }
      
      if (row.client_payment) {
        itemMap.get(itemId).payments.push(row.client_payment);
      }
    }

    return Array.from(itemMap.values()).map((itemData: any) => {
      const revenue = itemData.payments.reduce((sum: number, payment: any) => sum + Number(payment.amount), 0);
      const cost = (Number(itemData.minCost) + Number(itemData.maxCost)) / 2;
      const profit = revenue - cost;
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

      return {
        itemId: itemData.itemId,
        title: itemData.title || '',
        brand: itemData.brand || '',
        cost,
        revenue,
        profit,
        profitMargin,
        vendor: { name: itemData.vendor.name || '', vendorId: itemData.vendor.vendorId },
      };
    });
  }

  /**
   * Get inventory health metrics.
   */
  async getInventoryHealth(): Promise<{
    totalItems: number;
    activeItems: number;
    soldItems: number;
    averageDaysInInventory: number;
    slowMovingItems: number;
    topPerformers: Array<{ itemId: string; title: string; salesVelocity: number }>;
  }> {
    const [inventoryStats] = await db
      .select({
        totalItems: count(item.itemId),
        activeItems: sql<number>`SUM(CASE WHEN ${item.status} IN ('in-store', 'reserved', 'partial') THEN 1 ELSE 0 END)`,
        soldItems: sql<number>`SUM(CASE WHEN ${item.status} = 'sold' THEN 1 ELSE 0 END)`,
      })
      .from(item);

    return {
      totalItems: Number(inventoryStats.totalItems) || 0,
      activeItems: Number(inventoryStats.activeItems) || 0,
      soldItems: Number(inventoryStats.soldItems) || 0,
      averageDaysInInventory: 0, // Would need complex date calculations
      slowMovingItems: 0, // Would need analysis of inventory age
      topPerformers: [], // Would need sales velocity calculations
    };
  }

  /**
   * Get payment method breakdown.
   */
  async getPaymentMethodBreakdown(
    startDate?: string,
    endDate?: string
  ): Promise<Array<{ method: string; count: number; amount: number; percentage: number }>> {
    let query = db
      .select({
        method: clientPayment.paymentMethod,
        count: count(clientPayment.paymentId),
        amount: sum(clientPayment.amount),
      })
      .from(clientPayment)
      .groupBy(clientPayment.paymentMethod);

    if (startDate && endDate) {
      query = query.where(
        and(
          sql`${clientPayment.paidAt} >= ${startDate}`,
          sql`${clientPayment.paidAt} <= ${endDate}`
        )
      );
    }

    const results = await query;
    const totalAmount = results.reduce((sum, r) => sum + Number(r.amount), 0);

    return results.map(r => ({
      method: r.method,
      count: Number(r.count),
      amount: Number(r.amount) || 0,
      percentage: totalAmount > 0 ? (Number(r.amount) / totalAmount) * 100 : 0,
    }));
  }

  /**
   * Mark an installment as paid.
   */
  async markInstallmentPaid(installmentId: string): Promise<InstallmentPlan> {
    return await db.transaction(async (tx) => {
      // Get current installment plan
      const [plan] = await tx
        .select()
        .from(installmentPlan)
        .where(eq(installmentPlan.planId, installmentId));

      if (!plan) {
        throw new Error("Installment plan not found");
      }

      const currentPaidAmount = Number(plan.paidAmount);
      const installmentAmount = Number(plan.installmentAmount);
      const totalAmount = Number(plan.totalAmount);
      const newPaidAmount = currentPaidAmount + installmentAmount;

      // Calculate next payment date
      let nextPaymentDate = null;
      let status = plan.status;

      if (newPaidAmount >= totalAmount) {
        // Plan is fully paid
        status = "completed";
      } else if (plan.nextPaymentDate) {
        // Calculate next payment date based on frequency
        const currentDate = new Date(plan.nextPaymentDate);
        const frequency = plan.frequency || "monthly";
        
        switch (frequency) {
          case "weekly":
            currentDate.setDate(currentDate.getDate() + 7);
            break;
          case "biweekly":
            currentDate.setDate(currentDate.getDate() + 14);
            break;
          case "monthly":
            currentDate.setMonth(currentDate.getMonth() + 1);
            break;
          default:
            currentDate.setMonth(currentDate.getMonth() + 1);
        }
        
        nextPaymentDate = currentDate.toISOString().slice(0, 10);
      }

      // Update installment plan
      const [updatedPlan] = await tx
        .update(installmentPlan)
        .set({
          paidAmount: toDbNumeric(newPaidAmount),
          nextPaymentDate,
          status,
        })
        .where(eq(installmentPlan.planId, installmentId))
        .returning();

      return updatedPlan;
    });
  }

  /**
   * Send payment reminder for an installment.
   */
  async sendPaymentReminder(installmentId: string): Promise<boolean> {
    // Get installment plan details
    const [plan] = await db
      .select()
      .from(installmentPlan)
      .innerJoin(item, eq(installmentPlan.itemId, item.itemId))
      .innerJoin(client, eq(installmentPlan.clientId, client.clientId))
      .where(eq(installmentPlan.planId, installmentId));

    if (!plan) {
      throw new Error("Installment plan not found");
    }

    // In a real implementation, this would send an email, SMS, or other notification
    // For now, we'll just return true to indicate the reminder was "sent"
    console.log(`Payment reminder sent to ${plan.client.email} for installment ${installmentId}`);
    
    return true;
  }

  // ===================================================================
  // G) CONTRACT MANAGEMENT
  // ===================================================================

  // --- Contract Template Operations ---
  
  /**
   * Retrieve all contract templates.
   */
  async getContractTemplates(): Promise<ContractTemplate[]> {
    return await db.select().from(contractTemplate).orderBy(desc(contractTemplate.createdAt));
  }
  
  /**
   * Retrieve contract template by ID.
   */
  async getContractTemplate(id: string): Promise<ContractTemplate | undefined> {
    const [result] = await db.select().from(contractTemplate).where(eq(contractTemplate.templateId, id));
    return result || undefined;
  }
  
  /**
   * Create a new contract template.
   */
  async createContractTemplate(templateData: InsertContractTemplate): Promise<ContractTemplate> {
    const [result] = await db.insert(contractTemplate).values(templateData).returning();
    return result;
  }
  
  /**
   * Update existing contract template.
   */
  async updateContractTemplate(id: string, templateData: Partial<InsertContractTemplate>): Promise<ContractTemplate> {
    const [result] = await db
      .update(contractTemplate)
      .set(templateData)
      .where(eq(contractTemplate.templateId, id))
      .returning();
    if (!result) {
      throw new Error("Contract template not found");
    }
    return result;
  }
  
  /**
   * Delete a contract template.
   */
  async deleteContractTemplate(id: string): Promise<void> {
    await db.delete(contractTemplate).where(eq(contractTemplate.templateId, id));
  }

  // --- Contract Operations ---
  
  /**
   * Retrieve all contracts with vendor and template details.
   */
  async getContracts(): Promise<Array<Contract & { vendor: Vendor; template?: ContractTemplate }>> {
    const results = await db
      .select()
      .from(contract)
      .innerJoin(vendor, eq(contract.vendorId, vendor.vendorId))
      .leftJoin(contractTemplate, eq(contract.templateId, contractTemplate.templateId))
      .orderBy(desc(contract.createdAt));

    return results.map(row => ({
      ...row.contract,
      vendor: row.vendor,
      template: row.contract_template || undefined,
    }));
  }
  
  /**
   * Retrieve contract by ID with vendor and template details.
   */
  async getContract(id: string): Promise<(Contract & { vendor: Vendor; template?: ContractTemplate }) | undefined> {
    const [result] = await db
      .select()
      .from(contract)
      .innerJoin(vendor, eq(contract.vendorId, vendor.vendorId))
      .leftJoin(contractTemplate, eq(contract.templateId, contractTemplate.templateId))
      .where(eq(contract.contractId, id));

    if (!result) return undefined;

    return {
      ...result.contract,
      vendor: result.vendor,
      template: result.contract_template || undefined,
    };
  }
  
  /**
   * Retrieve contracts for a specific vendor.
   */
  async getContractsByVendor(vendorId: string): Promise<Array<Contract & { vendor: Vendor; template?: ContractTemplate }>> {
    const results = await db
      .select()
      .from(contract)
      .innerJoin(vendor, eq(contract.vendorId, vendor.vendorId))
      .leftJoin(contractTemplate, eq(contract.templateId, contractTemplate.templateId))
      .where(eq(contract.vendorId, vendorId))
      .orderBy(desc(contract.createdAt));

    return results.map(row => ({
      ...row.contract,
      vendor: row.vendor,
      template: row.contract_template || undefined,
    }));
  }
  
  /**
   * Create a new contract.
   */
  async createContract(contractData: InsertContract): Promise<Contract> {
    const [result] = await db.insert(contract).values(contractData).returning();
    return result;
  }
  
  /**
   * Update existing contract.
   */
  async updateContract(id: string, contractData: Partial<InsertContract>): Promise<Contract> {
    const [result] = await db
      .update(contract)
      .set(contractData)
      .where(eq(contract.contractId, id))
      .returning();
    if (!result) {
      throw new Error("Contract not found");
    }
    return result;
  }
  
  /**
   * Delete a contract.
   */
  async deleteContract(id: string): Promise<void> {
    await db.delete(contract).where(eq(contract.contractId, id));
  }
  
  /**
   * Finalize a contract by setting PDF URL and status.
   */
  async finalizeContract(id: string, pdfUrl: string): Promise<Contract> {
    const [result] = await db
      .update(contract)
      .set({ 
        pdfUrl,
        status: 'final' as const 
      })
      .where(eq(contract.contractId, id))
      .returning();
    if (!result) {
      throw new Error("Contract not found");
    }
    return result;
  }

  // ===================================================================
  // H) UTILITIES & MIGRATIONS
  // ===================================================================
  
  /**
   * Migrate legacy brand data from item records to brand table.
   */
  async migrateLegacyBrands(): Promise<{
    brandsCreated: number;
    itemsUpdated: number;
    skippedItems: number;
  }> {
    let brandsCreated = 0;
    let itemsUpdated = 0;
    let skippedItems = 0;

    // Get all items with legacy brand data (string brand field)
    const itemsWithLegacyBrands = await db
      .select()
      .from(item)
      .where(and(isNotNull(item.brand), isNull(item.brandId)));

    const brandMap = new Map<string, string>(); // brand name -> brandId

    for (const itemRow of itemsWithLegacyBrands) {
      const legacyBrandName = itemRow.brand?.trim();
      
      if (!legacyBrandName) {
        skippedItems++;
        continue;
      }

      let brandId = brandMap.get(legacyBrandName);
      
      if (!brandId) {
        // Check if brand already exists
        const [existingBrand] = await db
          .select()
          .from(brand)
          .where(eq(brand.name, legacyBrandName));
          
        if (existingBrand) {
          brandId = existingBrand.brandId;
        } else {
          // Create new brand
          const [newBrand] = await db
            .insert(brand)
            .values({ name: legacyBrandName })
            .returning();
          brandId = newBrand.brandId;
          brandsCreated++;
        }
        
        brandMap.set(legacyBrandName, brandId);
      }

      // Update item to reference brand table
      await db
        .update(item)
        .set({ 
          brandId: brandId,
          brand: null // Clear legacy field
        })
        .where(eq(item.itemId, itemRow.itemId));
      
      itemsUpdated++;
    }

    return {
      brandsCreated,
      itemsUpdated,
      skippedItems,
    };
  }
}

// Create and export storage instance
export const storage = new DatabaseStorage();