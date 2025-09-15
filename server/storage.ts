/**
 * Storage Facade - Delegates to domain services while maintaining backward compatibility
 */

import {
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

// Import all services
import * as authService from './services/auth.service.js';
import * as vendorsService from './services/vendors.service.js';
import * as clientsService from './services/clients.service.js';
import * as brandsService from './services/brands.service.js';
import * as categoriesService from './services/categories.service.js';
import * as paymentMethodsService from './services/paymentMethods.service.js';
import * as itemsService from './services/items.service.js';
import * as paymentsService from './services/payments.service.js';
import * as payoutsService from './services/payouts.service.js';
import * as expensesService from './services/expenses.service.js';
import * as installmentsService from './services/installments.service.js';
import * as dashboardService from './services/dashboard.service.js';
import * as metricsService from './services/metrics.service.js';
import * as financialHealthService from './services/financialHealth.service.js';
import * as biService from './services/bi.service.js';
import * as contractTemplatesService from './services/contractTemplates.service.js';
import * as contractsService from './services/contracts.service.js';

// Re-export helper functions for backward compatibility
export { toDbNumeric, toDbNumericOptional, toDbDate, toDbDateOptional, toDbTimestamp } from './services/utils/db-helpers.js';

export interface IStorage {
  // Authentication user methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: CreateUserRequest): Promise<User>;
  updateUser(id: string, user: UpdateUserRequest): Promise<User>;
  updateLastLogin(id: string): Promise<void>;
  getUsers(): Promise<User[]>;

  // Vendor methods
  getVendors(): Promise<Vendor[]>;
  getVendor(id: string): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: string, vendor: Partial<InsertVendor>): Promise<Vendor>;
  deleteVendor(id: string): Promise<void>;

  // Client methods
  getClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: string): Promise<void>;

  // Brand methods
  getBrands(): Promise<Brand[]>;
  getBrand(id: string): Promise<Brand | undefined>;
  createBrand(brand: InsertBrand): Promise<Brand>;
  updateBrand(id: string, brand: Partial<InsertBrand>): Promise<Brand>;
  deleteBrand(id: string): Promise<void>;

  // Category methods
  getCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(
    id: string,
    category: Partial<InsertCategory>,
  ): Promise<Category>;
  deleteCategory(id: string): Promise<void>;

  // Payment Method methods
  getPaymentMethods(): Promise<PaymentMethod[]>;
  getPaymentMethod(id: string): Promise<PaymentMethod | undefined>;
  createPaymentMethod(
    paymentMethod: InsertPaymentMethod,
  ): Promise<PaymentMethod>;
  updatePaymentMethod(
    id: string,
    paymentMethod: Partial<InsertPaymentMethod>,
  ): Promise<PaymentMethod>;
  deletePaymentMethod(id: string): Promise<void>;

  // Item methods
  getItems(vendorId?: string): Promise<Array<Item & { vendor: Vendor }>>;
  getItem(id: string): Promise<(Item & { vendor: Vendor }) | undefined>;
  createItem(item: InsertItem): Promise<Item>;
  updateItem(id: string, item: Partial<InsertItem>): Promise<Item>;
  deleteItem(id: string): Promise<void>;

  // Payment methods
  getPayments(): Promise<
    Array<ClientPayment & { item: Item & { vendor: Vendor }; client: Client }>
  >;
  getPaymentsByItem(
    itemId: string,
  ): Promise<Array<ClientPayment & { client: Client }>>;
  createPayment(payment: InsertClientPayment): Promise<ClientPayment>;
  updatePayment(
    id: string,
    payment: Partial<InsertClientPayment>,
  ): Promise<ClientPayment>;
  deletePayment(id: string): Promise<void>;

  // Payout methods
  getPayouts(): Promise<Array<VendorPayout & { item: Item; vendor: Vendor }>>;
  getPendingPayouts(): Promise<Array<Item & { vendor: Vendor }>>;
  createPayout(payout: InsertVendorPayout): Promise<VendorPayout>;
  getPayoutMetrics(): Promise<{
    totalPayoutsPaid: number;
    totalPayoutsAmount: number;
    pendingPayouts: number;
    upcomingPayouts: number;
    averagePayoutAmount: number;
    monthlyPayoutTrend: number;
  }>;
  getRecentPayouts(
    limit?: number,
  ): Promise<Array<VendorPayout & { item: Item; vendor: Vendor }>>;
  getUpcomingPayouts(): Promise<
    Array<{
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
    }>
  >;

  // Expense methods
  getExpenses(): Promise<Array<ItemExpense & { item: Item }>>;
  getExpensesByItem(itemId: string): Promise<ItemExpense[]>;
  createExpense(expense: InsertItemExpense): Promise<ItemExpense>;

  // Installment plan methods
  getInstallmentPlans(): Promise<
    Array<InstallmentPlan & { item: Item & { vendor: Vendor }; client: Client }>
  >;
  getInstallmentPlansByItem(
    itemId: string,
  ): Promise<Array<InstallmentPlan & { client: Client }>>;
  getInstallmentPlansByClient(
    clientId: string,
  ): Promise<Array<InstallmentPlan & { item: Item & { vendor: Vendor } }>>;
  createInstallmentPlan(plan: InsertInstallmentPlan): Promise<InstallmentPlan>;
  updateInstallmentPlan(
    id: string,
    plan: Partial<InsertInstallmentPlan>,
  ): Promise<InstallmentPlan>;
  deleteInstallmentPlan(id: string): Promise<void>;

  // Dashboard methods
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

  getFinancialDataByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<{
    totalRevenue: number;
    totalCosts: number;
    totalProfit: number;
    itemsSold: number;
    averageOrderValue: number;
    totalExpenses: number;
  }>;

  getRecentItems(limit?: number): Promise<Array<Item & { vendor: Vendor }>>;
  getTopPerformingItems(
    limit?: number,
  ): Promise<Array<Item & { vendor: Vendor; profit: number }>>;

  // Payment metrics methods
  getPaymentMetrics(): Promise<{
    totalPaymentsReceived: number;
    totalPaymentsAmount: number;
    overduePayments: number;
    upcomingPayments: number;
    averagePaymentAmount: number;
    monthlyPaymentTrend: number;
  }>;

  getUpcomingPayments(
    limit?: number,
  ): Promise<
    Array<InstallmentPlan & { item: Item & { vendor: Vendor }; client: Client }>
  >;
  getRecentPayments(
    limit?: number,
  ): Promise<
    Array<ClientPayment & { item: Item & { vendor: Vendor }; client: Client }>
  >;
  getOverduePayments(): Promise<
    Array<InstallmentPlan & { item: Item & { vendor: Vendor }; client: Client }>
  >;

  // Financial health score methods
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

  markInstallmentPaid(installmentId: string): Promise<InstallmentPlan>;
  sendPaymentReminder(installmentId: string): Promise<boolean>;

  // Data migration helper
  migrateLegacyBrands(): Promise<{
    brandsCreated: number;
    itemsUpdated: number;
    skippedItems: number;
  }>;

  // Luxette vendor inventory methods
  getLuxetteInventoryData(): Promise<{
    itemCount: number;
    totalCost: number;
    priceRange: { min: number; max: number };
  }>;

  // Business Intelligence data aggregation methods
  getReportKPIs(
    startDate: string,
    endDate: string,
    filters?: {
      vendorIds?: string[];
      clientIds?: string[];
      brandIds?: string[];
      categoryIds?: string[];
      itemStatuses?: string[];
    },
  ): Promise<{
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
    },
  ): Promise<
    Array<{
      period: string;
      value: number;
      count?: number;
    }>
  >;

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
    },
  ): Promise<
    Array<{
      groupId: string;
      groupName: string;
      revenue?: number;
      profit?: number;
      itemsSold?: number;
      avgOrderValue?: number;
    }>
  >;

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
    offset?: number,
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

  getPaymentMethodBreakdown(
    startDate: string,
    endDate: string,
    filters?: {
      vendorIds?: string[];
      clientIds?: string[];
      brandIds?: string[];
      categoryIds?: string[];
    },
  ): Promise<
    Array<{
      paymentMethod: string;
      totalAmount: number;
      transactionCount: number;
      percentage: number;
      avgTransactionAmount: number;
    }>
  >;

  // Contract Template methods (fixed - no duplicates)
  getContractTemplates(): Promise<ContractTemplate[]>;
  getContractTemplate(id: string): Promise<ContractTemplate | undefined>;
  createContractTemplate(
    template: InsertContractTemplate,
  ): Promise<ContractTemplate>;
  updateContractTemplate(
    id: string,
    template: Partial<InsertContractTemplate>,
  ): Promise<ContractTemplate>;
  deleteContractTemplate(id: string): Promise<void>;
  getDefaultContractTemplate(): Promise<ContractTemplate | undefined>;
  getDefaultTemplate(): Promise<ContractTemplate | undefined>;
  ensureDefaultContractTemplate(): Promise<ContractTemplate>;
  setDefaultTemplate(id: string): Promise<ContractTemplate>;

  // Contract methods
  getContracts(): Promise<
    Array<Contract & { vendor: Vendor; template?: ContractTemplate }>
  >;
  getContract(
    id: string,
  ): Promise<
    (Contract & { vendor: Vendor; template?: ContractTemplate }) | undefined
  >;
  getContractsByVendor(
    vendorId: string,
  ): Promise<Array<Contract & { vendor: Vendor; template?: ContractTemplate }>>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(
    id: string,
    contract: Partial<InsertContract>,
  ): Promise<Contract>;
  deleteContract(id: string): Promise<void>;
  finalizeContract(id: string, pdfUrl: string): Promise<Contract>;

  // Business Intelligence API methods
  getTotalSalesMonthToDate(): Promise<{ totalSales: number }>;
  getSumUpcomingPayments(): Promise<{ totalUpcomingPayments: number }>;
  getSumReadyPayouts(): Promise<{ totalReadyPayouts: number }>;
  getSumUpcomingPayouts(): Promise<{ totalUpcomingPayouts: number }>;
  getInventoryCostRange(): Promise<{ min: number; max: number }>;
  getInventoryMarketPriceRange(): Promise<{ min: number; max: number }>;
}

/**
 * DatabaseStorage Facade - Delegates all operations to domain services
 */
export class DatabaseStorage implements IStorage {
  // Authentication user methods
  async getUser(id: string): Promise<User | undefined> {
    return authService.getUser(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return authService.getUserByEmail(email);
  }

  async createUser(user: CreateUserRequest): Promise<User> {
    return authService.createUser(user);
  }

  async updateUser(id: string, user: UpdateUserRequest): Promise<User> {
    return authService.updateUser(id, user);
  }

  async updateLastLogin(id: string): Promise<void> {
    return authService.updateLastLogin(id);
  }

  async getUsers(): Promise<User[]> {
    return authService.getUsers();
  }

  // Vendor methods
  async getVendors(): Promise<Vendor[]> {
    return vendorsService.getVendors();
  }

  async getVendor(id: string): Promise<Vendor | undefined> {
    return vendorsService.getVendor(id);
  }

  async createVendor(vendor: InsertVendor): Promise<Vendor> {
    return vendorsService.createVendor(vendor);
  }

  async updateVendor(id: string, vendor: Partial<InsertVendor>): Promise<Vendor> {
    return vendorsService.updateVendor(id, vendor);
  }

  async deleteVendor(id: string): Promise<void> {
    return vendorsService.deleteVendor(id);
  }

  // Client methods
  async getClients(): Promise<Client[]> {
    return clientsService.getClients();
  }

  async getClient(id: string): Promise<Client | undefined> {
    return clientsService.getClient(id);
  }

  async createClient(client: InsertClient): Promise<Client> {
    return clientsService.createClient(client);
  }

  async updateClient(id: string, client: Partial<InsertClient>): Promise<Client> {
    return clientsService.updateClient(id, client);
  }

  async deleteClient(id: string): Promise<void> {
    return clientsService.deleteClient(id);
  }

  // Brand methods
  async getBrands(): Promise<Brand[]> {
    return brandsService.getBrands();
  }

  async getBrand(id: string): Promise<Brand | undefined> {
    return brandsService.getBrand(id);
  }

  async createBrand(brand: InsertBrand): Promise<Brand> {
    return brandsService.createBrand(brand);
  }

  async updateBrand(id: string, brand: Partial<InsertBrand>): Promise<Brand> {
    return brandsService.updateBrand(id, brand);
  }

  async deleteBrand(id: string): Promise<void> {
    return brandsService.deleteBrand(id);
  }

  async migrateLegacyBrands(): Promise<{
    brandsCreated: number;
    itemsUpdated: number;
    skippedItems: number;
  }> {
    return brandsService.migrateLegacyBrands();
  }

  // Category methods
  async getCategories(): Promise<Category[]> {
    return categoriesService.getCategories();
  }

  async getCategory(id: string): Promise<Category | undefined> {
    return categoriesService.getCategory(id);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    return categoriesService.createCategory(category);
  }

  async updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category> {
    return categoriesService.updateCategory(id, category);
  }

  async deleteCategory(id: string): Promise<void> {
    return categoriesService.deleteCategory(id);
  }

  // Payment Method methods
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    return paymentMethodsService.getPaymentMethods();
  }

  async getPaymentMethod(id: string): Promise<PaymentMethod | undefined> {
    return paymentMethodsService.getPaymentMethod(id);
  }

  async createPaymentMethod(paymentMethod: InsertPaymentMethod): Promise<PaymentMethod> {
    return paymentMethodsService.createPaymentMethod(paymentMethod);
  }

  async updatePaymentMethod(id: string, paymentMethod: Partial<InsertPaymentMethod>): Promise<PaymentMethod> {
    return paymentMethodsService.updatePaymentMethod(id, paymentMethod);
  }

  async deletePaymentMethod(id: string): Promise<void> {
    return paymentMethodsService.deletePaymentMethod(id);
  }

  // Item methods
  async getItems(vendorId?: string): Promise<Array<Item & { vendor: Vendor }>> {
    return itemsService.getItems(vendorId);
  }

  async getItem(id: string): Promise<(Item & { vendor: Vendor }) | undefined> {
    return itemsService.getItem(id);
  }

  async createItem(item: InsertItem): Promise<Item> {
    return itemsService.createItem(item);
  }

  async updateItem(id: string, item: Partial<InsertItem>): Promise<Item> {
    return itemsService.updateItem(id, item);
  }

  async deleteItem(id: string): Promise<void> {
    return itemsService.deleteItem(id);
  }

  async getRecentItems(limit?: number): Promise<Array<Item & { vendor: Vendor }>> {
    return itemsService.getRecentItems(limit);
  }

  async getTopPerformingItems(limit?: number): Promise<Array<Item & { vendor: Vendor; profit: number }>> {
    return itemsService.getTopPerformingItems(limit);
  }

  async getPendingPayouts(): Promise<Array<Item & { vendor: Vendor }>> {
    return itemsService.getPendingPayouts();
  }

  // Payment methods
  async getPayments(): Promise<Array<ClientPayment & { item: Item & { vendor: Vendor }; client: Client }>> {
    return paymentsService.getPayments();
  }

  async getPaymentsByItem(itemId: string): Promise<Array<ClientPayment & { client: Client }>> {
    return paymentsService.getPaymentsByItem(itemId);
  }

  async createPayment(payment: InsertClientPayment): Promise<ClientPayment> {
    return paymentsService.createPayment(payment);
  }

  async updatePayment(id: string, payment: Partial<InsertClientPayment>): Promise<ClientPayment> {
    return paymentsService.updatePayment(id, payment);
  }

  async deletePayment(id: string): Promise<void> {
    return paymentsService.deletePayment(id);
  }

  async getRecentPayments(limit?: number): Promise<Array<ClientPayment & { item: Item & { vendor: Vendor }; client: Client }>> {
    return paymentsService.getRecentPayments(limit);
  }

  async getPaymentMethodBreakdown(
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
  }>> {
    // For now, use the simpler version without filters
    return paymentsService.getPaymentMethodBreakdown(startDate, endDate);
  }

  // Payout methods
  async getPayouts(): Promise<Array<VendorPayout & { item: Item; vendor: Vendor }>> {
    return payoutsService.getPayouts();
  }

  async createPayout(payout: InsertVendorPayout): Promise<VendorPayout> {
    return payoutsService.createPayout(payout);
  }

  async getRecentPayouts(limit?: number): Promise<Array<VendorPayout & { item: Item; vendor: Vendor }>> {
    return payoutsService.getRecentPayouts(limit);
  }

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
    return payoutsService.getUpcomingPayouts();
  }

  async getPayoutMetrics(): Promise<{
    totalPayoutsPaid: number;
    totalPayoutsAmount: number;
    pendingPayouts: number;
    upcomingPayouts: number;
    averagePayoutAmount: number;
    monthlyPayoutTrend: number;
  }> {
    return payoutsService.getPayoutMetrics();
  }

  // Expense methods
  async getExpenses(): Promise<Array<ItemExpense & { item: Item }>> {
    return expensesService.getExpenses();
  }

  async getExpensesByItem(itemId: string): Promise<ItemExpense[]> {
    return expensesService.getExpensesByItem(itemId);
  }

  async createExpense(expense: InsertItemExpense): Promise<ItemExpense> {
    return expensesService.createExpense(expense);
  }

  // Installment plan methods
  async getInstallmentPlans(): Promise<Array<InstallmentPlan & { item: Item & { vendor: Vendor }; client: Client }>> {
    return installmentsService.getInstallmentPlans();
  }

  async getInstallmentPlansByItem(itemId: string): Promise<Array<InstallmentPlan & { client: Client }>> {
    return installmentsService.getInstallmentPlansByItem(itemId);
  }

  async getInstallmentPlansByClient(clientId: string): Promise<Array<InstallmentPlan & { item: Item & { vendor: Vendor } }>> {
    return installmentsService.getInstallmentPlansByClient(clientId);
  }

  async createInstallmentPlan(plan: InsertInstallmentPlan): Promise<InstallmentPlan> {
    return installmentsService.createInstallmentPlan(plan);
  }

  async updateInstallmentPlan(id: string, plan: Partial<InsertInstallmentPlan>): Promise<InstallmentPlan> {
    return installmentsService.updateInstallmentPlan(id, plan);
  }

  async deleteInstallmentPlan(id: string): Promise<void> {
    return installmentsService.deleteInstallmentPlan(id);
  }

  async markInstallmentPaid(installmentId: string): Promise<InstallmentPlan> {
    return installmentsService.markInstallmentPaid(installmentId);
  }

  async sendPaymentReminder(installmentId: string): Promise<boolean> {
    return installmentsService.sendPaymentReminder(installmentId);
  }

  async getUpcomingPayments(limit?: number): Promise<Array<InstallmentPlan & { item: Item & { vendor: Vendor }; client: Client }>> {
    return installmentsService.getUpcomingPayments(limit);
  }

  async getOverduePayments(): Promise<Array<InstallmentPlan & { item: Item & { vendor: Vendor }; client: Client }>> {
    return installmentsService.getOverduePayments();
  }

  // Dashboard methods
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
    return dashboardService.getDashboardMetrics();
  }

  async getFinancialDataByDateRange(
    startDate: string,
    endDate: string
  ): Promise<{
    totalRevenue: number;
    totalCosts: number;
    totalProfit: number;
    itemsSold: number;
    averageOrderValue: number;
    totalExpenses: number;
  }> {
    return dashboardService.getFinancialDataByDateRange(startDate, endDate);
  }

  async getLuxetteInventoryData(): Promise<{
    itemCount: number;
    totalCost: number;
    priceRange: { min: number; max: number };
  }> {
    return dashboardService.getLuxetteInventoryData();
  }

  // Payment metrics methods
  async getPaymentMetrics(): Promise<{
    totalPaymentsReceived: number;
    totalPaymentsAmount: number;
    overduePayments: number;
    upcomingPayments: number;
    averagePaymentAmount: number;
    monthlyPaymentTrend: number;
  }> {
    return metricsService.getPaymentMetrics();
  }

  // Financial health score methods
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
    return financialHealthService.getFinancialHealthScore();
  }

  // Business Intelligence methods
  async getReportKPIs(
    startDate: string,
    endDate: string,
    filters?: {
      vendorIds?: string[];
      clientIds?: string[];
      brandIds?: string[];
      categoryIds?: string[];
      itemStatuses?: string[];
    }
  ): Promise<{
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
  }> {
    return biService.getReportKPIs(startDate, endDate, filters);
  }

  async getTimeSeries(
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
  ): Promise<Array<{ period: string; value: number; count?: number }>> {
    return biService.getTimeSeries(metric, granularity, startDate, endDate, filters);
  }

  async getGroupedMetrics(
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
  }>> {
    return biService.getGroupedMetrics(groupBy, metrics, startDate, endDate, filters);
  }

  async getItemProfitability(
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
  }> {
    return biService.getItemProfitability(startDate, endDate, filters, limit, offset);
  }

  async getInventoryHealth(filters?: {
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
  }> {
    return biService.getInventoryHealth(filters);
  }

  // Contract Template methods
  async getContractTemplates(): Promise<ContractTemplate[]> {
    return contractTemplatesService.getContractTemplates();
  }

  async getContractTemplate(id: string): Promise<ContractTemplate | undefined> {
    return contractTemplatesService.getContractTemplate(id);
  }

  async createContractTemplate(template: InsertContractTemplate): Promise<ContractTemplate> {
    return contractTemplatesService.createContractTemplate(template);
  }

  async updateContractTemplate(id: string, template: Partial<InsertContractTemplate>): Promise<ContractTemplate> {
    return contractTemplatesService.updateContractTemplate(id, template);
  }

  async deleteContractTemplate(id: string): Promise<void> {
    return contractTemplatesService.deleteContractTemplate(id);
  }

  async getDefaultContractTemplate(): Promise<ContractTemplate | undefined> {
    return contractTemplatesService.getDefaultContractTemplate();
  }

  async getDefaultTemplate(): Promise<ContractTemplate | undefined> {
    return contractTemplatesService.getDefaultTemplate();
  }

  async ensureDefaultContractTemplate(): Promise<ContractTemplate> {
    return contractTemplatesService.ensureDefaultContractTemplate();
  }

  async setDefaultTemplate(id: string): Promise<ContractTemplate> {
    return contractTemplatesService.setDefaultTemplate(id);
  }

  // Contract methods
  async getContracts(): Promise<Array<Contract & { vendor: Vendor; template?: ContractTemplate }>> {
    return contractsService.getContracts();
  }

  async getContract(id: string): Promise<(Contract & { vendor: Vendor; template?: ContractTemplate }) | undefined> {
    return contractsService.getContract(id);
  }

  async getContractsByVendor(vendorId: string): Promise<Array<Contract & { vendor: Vendor; template?: ContractTemplate }>> {
    return contractsService.getContractsByVendor(vendorId);
  }

  async createContract(contract: InsertContract): Promise<Contract> {
    return contractsService.createContract(contract);
  }

  async updateContract(id: string, contract: Partial<InsertContract>): Promise<Contract> {
    return contractsService.updateContract(id, contract);
  }

  async deleteContract(id: string): Promise<void> {
    return contractsService.deleteContract(id);
  }

  async finalizeContract(id: string, pdfUrl: string): Promise<Contract> {
    return contractsService.updateContract(id, { pdfUrl, status: 'final' });
  }

  // Business Intelligence API methods (legacy)
  async getTotalSalesMonthToDate(): Promise<{ totalSales: number }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const data = await dashboardService.getFinancialDataByDateRange(
      startOfMonth.toISOString().split('T')[0],
      now.toISOString().split('T')[0]
    );
    return { totalSales: data.totalRevenue };
  }

  async getSumUpcomingPayments(): Promise<{ totalUpcomingPayments: number }> {
    const metrics = await dashboardService.getDashboardMetrics();
    return { totalUpcomingPayments: metrics.incomingPayments };
  }

  async getSumReadyPayouts(): Promise<{ totalReadyPayouts: number }> {
    const payouts = await payoutsService.getUpcomingPayouts();
    const readyPayouts = payouts.filter(p => p.isFullyPaid === false);
    const total = readyPayouts.reduce((sum, p) => sum + p.remainingBalance, 0);
    return { totalReadyPayouts: total };
  }

  async getSumUpcomingPayouts(): Promise<{ totalUpcomingPayouts: number }> {
    const metrics = await dashboardService.getDashboardMetrics();
    return { totalUpcomingPayouts: metrics.pendingPayouts.min };
  }

  async getInventoryCostRange(): Promise<{ min: number; max: number }> {
    const metrics = await dashboardService.getDashboardMetrics();
    return metrics.costRange;
  }

  async getInventoryMarketPriceRange(): Promise<{ min: number; max: number }> {
    const metrics = await dashboardService.getDashboardMetrics();
    return metrics.inventoryValueRange;
  }
}

// Export singleton instance for backward compatibility
export const storage = new DatabaseStorage();