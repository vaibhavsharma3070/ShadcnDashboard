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

// Helper functions for type conversion to match Drizzle's expected types
function toDbNumeric(v?: number | string | null): string {
  if (v == null) return "0";
  return typeof v === "string" ? v : v.toFixed(2);
}

function toDbNumericOptional(v?: number | string | null): string | null {
  if (v == null) return null;
  return typeof v === "string" ? v : v.toFixed(2);
}

function toDbDate(v?: string | Date | null): string {
  if (v == null) return new Date().toISOString().slice(0, 10);
  const d = v instanceof Date ? v : new Date(v);
  return d.toISOString().slice(0, 10);
}

function toDbDateOptional(v?: string | Date | null): string | null {
  if (v == null) return null;
  const d = v instanceof Date ? v : new Date(v);
  return d.toISOString().slice(0, 10);
}

function toDbTimestamp(v?: string | Date | null): Date {
  if (v == null) return new Date();
  return v instanceof Date ? v : new Date(v);
}

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

  // Contract Template methods
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
  ensureDefaultContractTemplate(): Promise<ContractTemplate>;

  // Contract Template methods
  getContractTemplates(): Promise<ContractTemplate[]>;
  getContractTemplate(id: string): Promise<ContractTemplate | undefined>;
  getDefaultTemplate(): Promise<ContractTemplate | undefined>;
  createContractTemplate(
    template: InsertContractTemplate,
  ): Promise<ContractTemplate>;
  updateContractTemplate(
    id: string,
    template: Partial<InsertContractTemplate>,
  ): Promise<ContractTemplate>;
  deleteContractTemplate(id: string): Promise<void>;
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

export class DatabaseStorage implements IStorage {
  // Authentication user methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

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

  async updateLastLogin(id: string): Promise<void> {
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, id));
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  // Vendor methods
  async getVendors(): Promise<Vendor[]> {
    return await db.select().from(vendor).orderBy(desc(vendor.createdAt));
  }

  async getVendor(id: string): Promise<Vendor | undefined> {
    const [result] = await db
      .select()
      .from(vendor)
      .where(eq(vendor.vendorId, id));
    return result || undefined;
  }

  async createVendor(insertVendor: InsertVendor): Promise<Vendor> {
    const [result] = await db.insert(vendor).values(insertVendor).returning();
    return result;
  }

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

  async deleteVendor(id: string): Promise<void> {
    await db.delete(vendor).where(eq(vendor.vendorId, id));
  }

  // Client methods
  async getClients(): Promise<Client[]> {
    return await db.select().from(client).orderBy(desc(client.createdAt));
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [result] = await db
      .select()
      .from(client)
      .where(eq(client.clientId, id));
    return result || undefined;
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const [result] = await db.insert(client).values(insertClient).returning();
    return result;
  }

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

  async deleteClient(id: string): Promise<void> {
    await db.delete(client).where(eq(client.clientId, id));
  }

  // Brand methods
  async getBrands(): Promise<Brand[]> {
    return await db.select().from(brand).orderBy(desc(brand.createdAt));
  }

  async getBrand(id: string): Promise<Brand | undefined> {
    const [result] = await db.select().from(brand).where(eq(brand.brandId, id));
    return result || undefined;
  }

  async createBrand(insertBrand: InsertBrand): Promise<Brand> {
    const [result] = await db.insert(brand).values(insertBrand).returning();
    return result;
  }

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

  // Category methods
  async getCategories(): Promise<Category[]> {
    return await db.select().from(category).orderBy(desc(category.createdAt));
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const [result] = await db
      .select()
      .from(category)
      .where(eq(category.categoryId, id));
    return result || undefined;
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [result] = await db
      .insert(category)
      .values(insertCategory)
      .returning();
    return result;
  }

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

  // Payment Method methods
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    return await db
      .select()
      .from(paymentMethod)
      .orderBy(desc(paymentMethod.createdAt));
  }

  async getPaymentMethod(id: string): Promise<PaymentMethod | undefined> {
    const [result] = await db
      .select()
      .from(paymentMethod)
      .where(eq(paymentMethod.paymentMethodId, id));
    return result || undefined;
  }

  async createPaymentMethod(
    insertPaymentMethod: InsertPaymentMethod,
  ): Promise<PaymentMethod> {
    const [result] = await db
      .insert(paymentMethod)
      .values(insertPaymentMethod)
      .returning();
    return result;
  }

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

  async deletePaymentMethod(id: string): Promise<void> {
    // Check if payment method is referenced by any client payments
    const [referencedPayments] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(clientPayment)
      .where(eq(clientPayment.paymentMethod, id));

    if (Number(referencedPayments.count) > 0) {
      throw new Error(
        "Cannot delete payment method. It is referenced by existing payments.",
      );
    }

    await db.delete(paymentMethod).where(eq(paymentMethod.paymentMethodId, id));
  }

  // Item methods
  async getItems(vendorId?: string): Promise<Array<Item & { vendor: Vendor }>> {
    const baseQuery = db
      .select()
      .from(item)
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId));

    const query = vendorId
      ? baseQuery.where(eq(item.vendorId, vendorId))
      : baseQuery;

    return await query.orderBy(desc(item.createdAt)).then((results) =>
      results.map((row) => ({
        ...row.item,
        vendor: row.vendor,
      })),
    );
  }

  async getItem(id: string): Promise<(Item & { vendor: Vendor }) | undefined> {
    const [result] = await db
      .select()
      .from(item)
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .where(eq(item.itemId, id));

    return result ? { ...result.item, vendor: result.vendor } : undefined;
  }

  async createItem(insertItem: InsertItem): Promise<Item> {
    const payload: typeof item.$inferInsert = {
      ...insertItem,
      minCost: toDbNumericOptional(insertItem.minCost),
      maxCost: toDbNumericOptional(insertItem.maxCost),
      minSalesPrice: toDbNumericOptional(insertItem.minSalesPrice),
      maxSalesPrice: toDbNumericOptional(insertItem.maxSalesPrice),
      acquisitionDate: toDbDateOptional(insertItem.acquisitionDate),
    };
    const [result] = await db.insert(item).values(payload).returning();
    return result;
  }

  async updateItem(id: string, updateItem: Partial<InsertItem>): Promise<Item> {
    const payload: Partial<typeof item.$inferInsert> = {};
    // Only set fields that are defined and convert types
    if (updateItem.vendorId !== undefined)
      payload.vendorId = updateItem.vendorId;
    if (updateItem.brandId !== undefined) payload.brandId = updateItem.brandId;
    if (updateItem.categoryId !== undefined)
      payload.categoryId = updateItem.categoryId;
    if (updateItem.title !== undefined) payload.title = updateItem.title;
    if (updateItem.model !== undefined) payload.model = updateItem.model;
    if (updateItem.serialNo !== undefined)
      payload.serialNo = updateItem.serialNo;
    if (updateItem.condition !== undefined)
      payload.condition = updateItem.condition;
    if (updateItem.status !== undefined) payload.status = updateItem.status;
    if (updateItem.minCost !== undefined)
      payload.minCost = toDbNumericOptional(updateItem.minCost);
    if (updateItem.maxCost !== undefined)
      payload.maxCost = toDbNumericOptional(updateItem.maxCost);
    if (updateItem.minSalesPrice !== undefined)
      payload.minSalesPrice = toDbNumericOptional(updateItem.minSalesPrice);
    if (updateItem.maxSalesPrice !== undefined)
      payload.maxSalesPrice = toDbNumericOptional(updateItem.maxSalesPrice);
    if (updateItem.acquisitionDate !== undefined)
      payload.acquisitionDate = toDbDateOptional(updateItem.acquisitionDate);

    const [result] = await db
      .update(item)
      .set(payload)
      .where(eq(item.itemId, id))
      .returning();
    if (!result) {
      throw new Error("Item not found");
    }
    return result;
  }

  async deleteItem(id: string): Promise<void> {
    await db.delete(item).where(eq(item.itemId, id));
  }

  // Payment methods
  async getPayments(): Promise<
    Array<ClientPayment & { item: Item & { vendor: Vendor }; client: Client }>
  > {
    return await db
      .select()
      .from(clientPayment)
      .innerJoin(item, eq(clientPayment.itemId, item.itemId))
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .innerJoin(client, eq(clientPayment.clientId, client.clientId))
      .orderBy(desc(clientPayment.paidAt))
      .then((results) =>
        results.map((row) => ({
          ...row.client_payment,
          item: { ...row.item, vendor: row.vendor },
          client: row.client,
        })),
      );
  }

  async getPaymentsByItem(
    itemId: string,
  ): Promise<Array<ClientPayment & { client: Client }>> {
    return await db
      .select()
      .from(clientPayment)
      .innerJoin(client, eq(clientPayment.clientId, client.clientId))
      .where(eq(clientPayment.itemId, itemId))
      .orderBy(desc(clientPayment.paidAt))
      .then((results) =>
        results.map((row) => ({
          ...row.client_payment,
          client: row.client,
        })),
      );
  }

  async createPayment(
    insertPayment: InsertClientPayment,
  ): Promise<ClientPayment> {
    const payload: typeof clientPayment.$inferInsert = {
      ...insertPayment,
      amount: toDbNumeric(insertPayment.amount!),
      paidAt: toDbTimestamp(insertPayment.paidAt!),
    };
    const [result] = await db.insert(clientPayment).values(payload).returning();

    // Check if item is fully paid and update status
    const payments = await db
      .select({ amount: clientPayment.amount })
      .from(clientPayment)
      .where(eq(clientPayment.itemId, insertPayment.itemId));

    const itemData = await db
      .select({ maxSalesPrice: item.maxSalesPrice })
      .from(item)
      .where(eq(item.itemId, insertPayment.itemId));

    if (payments.length > 0 && itemData.length > 0) {
      const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const listPrice = Number(itemData[0].maxSalesPrice);

      if (totalPaid >= listPrice) {
        await db
          .update(item)
          .set({ status: "sold" })
          .where(eq(item.itemId, insertPayment.itemId));
      }
    }

    return result;
  }

  async updatePayment(
    id: string,
    updatePayment: Partial<InsertClientPayment>,
  ): Promise<ClientPayment> {
    const payload: Partial<typeof clientPayment.$inferInsert> = {};
    if (updatePayment.clientId !== undefined)
      payload.clientId = updatePayment.clientId;
    if (updatePayment.itemId !== undefined)
      payload.itemId = updatePayment.itemId;
    if (updatePayment.paymentMethod !== undefined)
      payload.paymentMethod = updatePayment.paymentMethod;
    if (updatePayment.amount !== undefined)
      payload.amount = toDbNumeric(updatePayment.amount);
    if (updatePayment.paidAt !== undefined)
      payload.paidAt = toDbTimestamp(updatePayment.paidAt);

    const [result] = await db
      .update(clientPayment)
      .set(payload)
      .where(eq(clientPayment.paymentId, id))
      .returning();

    if (!result) {
      throw new Error("Payment not found");
    }

    // If amount was updated, recalculate item payment status
    if (updatePayment.amount !== undefined) {
      const payments = await db
        .select({ amount: clientPayment.amount })
        .from(clientPayment)
        .where(eq(clientPayment.itemId, result.itemId));

      const itemData = await db
        .select({ maxSalesPrice: item.maxSalesPrice })
        .from(item)
        .where(eq(item.itemId, result.itemId));

      if (payments.length > 0 && itemData.length > 0) {
        const totalPaid = payments.reduce(
          (sum, p) => sum + Number(p.amount),
          0,
        );
        const listPrice = Number(itemData[0].maxSalesPrice);

        // Update item status based on payment completeness
        if (totalPaid >= listPrice) {
          await db
            .update(item)
            .set({ status: "sold" })
            .where(eq(item.itemId, result.itemId));
        } else {
          await db
            .update(item)
            .set({ status: "partial" })
            .where(eq(item.itemId, result.itemId));
        }
      }
    }

    return result;
  }

  async deletePayment(id: string): Promise<void> {
    // First get the payment info to know which item to update
    const paymentToDelete = await db
      .select({ itemId: clientPayment.itemId })
      .from(clientPayment)
      .where(eq(clientPayment.paymentId, id));

    if (!paymentToDelete.length) {
      throw new Error("Payment not found");
    }

    const itemId = paymentToDelete[0].itemId;

    // Delete the payment
    await db.delete(clientPayment).where(eq(clientPayment.paymentId, id));

    // Recalculate item payment status after deletion
    const remainingPayments = await db
      .select({ amount: clientPayment.amount })
      .from(clientPayment)
      .where(eq(clientPayment.itemId, itemId));

    const itemData = await db
      .select({ maxSalesPrice: item.maxSalesPrice })
      .from(item)
      .where(eq(item.itemId, itemId));

    if (itemData.length > 0) {
      const totalPaid = remainingPayments.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );
      const listPrice = Number(itemData[0].maxSalesPrice);

      // Update item status based on remaining payments
      if (totalPaid >= listPrice) {
        await db
          .update(item)
          .set({ status: "sold" })
          .where(eq(item.itemId, itemId));
      } else if (totalPaid > 0) {
        await db
          .update(item)
          .set({ status: "partial" })
          .where(eq(item.itemId, itemId));
      } else {
        await db
          .update(item)
          .set({ status: "available" })
          .where(eq(item.itemId, itemId));
      }
    }
  }

  // Payout methods
  async getPayouts(): Promise<
    Array<VendorPayout & { item: Item; vendor: Vendor }>
  > {
    return await db
      .select()
      .from(vendorPayout)
      .innerJoin(item, eq(vendorPayout.itemId, item.itemId))
      .innerJoin(vendor, eq(vendorPayout.vendorId, vendor.vendorId))
      .orderBy(desc(vendorPayout.paidAt))
      .then((results) =>
        results.map((row) => ({
          ...row.vendor_payout,
          item: row.item,
          vendor: row.vendor,
        })),
      );
  }

  async getPendingPayouts(): Promise<Array<Item & { vendor: Vendor }>> {
    const soldItems = await db
      .select()
      .from(item)
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .where(eq(item.status, "sold"))
      .then((results) =>
        results.map((row) => ({
          ...row.item,
          vendor: row.vendor,
        })),
      );

    const paidItemIds = await db
      .select({ itemId: vendorPayout.itemId })
      .from(vendorPayout)
      .then((results) => results.map((row) => row.itemId));

    return soldItems.filter((item) => !paidItemIds.includes(item.itemId));
  }

  async createPayout(insertPayout: InsertVendorPayout): Promise<VendorPayout> {
    const payload: typeof vendorPayout.$inferInsert = {
      ...insertPayout,
      amount: toDbNumeric(insertPayout.amount!),
      paidAt: toDbTimestamp(insertPayout.paidAt!),
    };
    const [result] = await db.insert(vendorPayout).values(payload).returning();
    return result;
  }

  async getPayoutMetrics(): Promise<{
    totalPayoutsPaid: number;
    totalPayoutsAmount: number;
    pendingPayouts: number;
    upcomingPayouts: number;
    averagePayoutAmount: number;
    monthlyPayoutTrend: number;
  }> {
    // Get total payouts
    const [payoutData] = await db
      .select({
        totalPayoutsPaid: sql<number>`COUNT(*)`,
        totalPayoutsAmount: sql<number>`COALESCE(SUM(${vendorPayout.amount}), 0)`,
      })
      .from(vendorPayout);

    // Get pending payouts (items fully paid but not yet paid out)
    const [pendingData] = await db
      .select({
        pendingPayouts: sql<number>`COUNT(DISTINCT ${item.itemId})`,
      })
      .from(item)
      .leftJoin(clientPayment, eq(clientPayment.itemId, item.itemId))
      .leftJoin(vendorPayout, eq(vendorPayout.itemId, item.itemId))
      .where(
        and(
          sql`${item.maxSalesPrice} <= (
            SELECT COALESCE(SUM(${clientPayment.amount}), 0) 
            FROM ${clientPayment} 
            WHERE ${clientPayment.itemId} = ${item.itemId}
          )`,
          isNull(vendorPayout.payoutId),
        ),
      );

    // Get upcoming payouts (items with partial payments)
    const [upcomingData] = await db
      .select({
        upcomingPayouts: sql<number>`COUNT(DISTINCT ${item.itemId})`,
      })
      .from(item)
      .leftJoin(clientPayment, eq(clientPayment.itemId, item.itemId))
      .leftJoin(vendorPayout, eq(vendorPayout.itemId, item.itemId))
      .where(
        and(
          sql`${item.maxSalesPrice} > (
            SELECT COALESCE(SUM(${clientPayment.amount}), 0) 
            FROM ${clientPayment} 
            WHERE ${clientPayment.itemId} = ${item.itemId}
          )`,
          isNull(vendorPayout.payoutId),
        ),
      );

    // Calculate average payout amount
    const averagePayoutAmount =
      payoutData.totalPayoutsPaid > 0
        ? payoutData.totalPayoutsAmount / payoutData.totalPayoutsPaid
        : 0;

    // Calculate monthly trend (simple mock for now)
    const monthlyPayoutTrend = 5.2; // This would be calculated from historical data

    return {
      totalPayoutsPaid: payoutData.totalPayoutsPaid,
      totalPayoutsAmount: payoutData.totalPayoutsAmount,
      pendingPayouts: pendingData.pendingPayouts,
      upcomingPayouts: upcomingData.upcomingPayouts,
      averagePayoutAmount,
      monthlyPayoutTrend,
    };
  }

  async getRecentPayouts(
    limit = 10,
  ): Promise<Array<VendorPayout & { item: Item; vendor: Vendor }>> {
    const results = await db
      .select()
      .from(vendorPayout)
      .innerJoin(item, eq(item.itemId, vendorPayout.itemId))
      .innerJoin(vendor, eq(vendor.vendorId, item.vendorId))
      .orderBy(desc(vendorPayout.paidAt))
      .limit(limit);

    return results.map((result) => ({
      ...result.vendor_payout,
      item: result.item,
      vendor: result.vendor,
    }));
  }

  async getUpcomingPayouts(): Promise<
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
  > {
    const results = await db
      .select({
        itemId: item.itemId,
        title: item.title,
        brand: item.brand,
        model: item.model,
        minSalesPrice: item.minSalesPrice,
        maxSalesPrice: item.maxSalesPrice,
        salePrice: item.maxSalesPrice, // Use max sales price as the sale price
        minCost: item.minCost,
        maxCost: item.maxCost,
        totalPaid: sql<number>`COALESCE(SUM(${clientPayment.amount}), 0)`,
        firstPaymentDate: sql<string>`MIN(${clientPayment.paidAt})`,
        lastPaymentDate: sql<string>`MAX(${clientPayment.paidAt})`,
        vendor: vendor,
      })
      .from(item)
      .innerJoin(vendor, eq(vendor.vendorId, item.vendorId))
      .leftJoin(clientPayment, eq(clientPayment.itemId, item.itemId))
      .leftJoin(vendorPayout, eq(vendorPayout.itemId, item.itemId))
      .where(
        and(
          isNull(vendorPayout.payoutId),
          isNotNull(clientPayment.paymentId), // Only show items with payments
        ),
      )
      .groupBy(item.itemId, vendor.vendorId);

    // Now get installment plans for each item to determine the expected last payment date
    const itemsWithInstallments = await Promise.all(
      results.map(async (result) => {
        const installmentPlans = await db
          .select()
          .from(installmentPlan)
          .where(eq(installmentPlan.itemId, result.itemId))
          .orderBy(desc(installmentPlan.dueDate));

        const totalPaid = result.totalPaid;
        const salesPrice = parseFloat(result.maxSalesPrice || "0");
        const vendorPayoutAmount = parseFloat(result.maxCost || "0");
        const remainingBalance = salesPrice - totalPaid;
        const paymentProgress =
          salesPrice > 0 ? (totalPaid / salesPrice) * 100 : 0;
        const isFullyPaid = totalPaid >= salesPrice;

        // Determine the expected last payment date
        let expectedLastPaymentDate = result.lastPaymentDate;
        if (installmentPlans.length > 0) {
          // If there are installment plans, use the latest due date
          expectedLastPaymentDate = installmentPlans[0].dueDate;
        }

        return {
          itemId: result.itemId,
          title: result.title || "",
          brand: result.brand || "",
          model: result.model || "",
          minSalesPrice: parseFloat(result.minSalesPrice || "0"),
          maxSalesPrice: parseFloat(result.maxSalesPrice || "0"),
          salePrice: salesPrice,
          minCost: parseFloat(result.minCost || "0"),
          maxCost: parseFloat(result.maxCost || "0"),
          totalPaid,
          remainingBalance: Math.max(0, remainingBalance),
          paymentProgress: Math.min(100, paymentProgress),
          isFullyPaid,
          fullyPaidAt: isFullyPaid ? new Date().toISOString() : undefined,
          firstPaymentDate: result.firstPaymentDate,
          lastPaymentDate: expectedLastPaymentDate,
          vendor: result.vendor,
        };
      }),
    );

    return itemsWithInstallments;
  }

  // Expense methods
  async getExpenses(): Promise<Array<ItemExpense & { item: Item }>> {
    return await db
      .select()
      .from(itemExpense)
      .innerJoin(item, eq(itemExpense.itemId, item.itemId))
      .orderBy(desc(itemExpense.incurredAt))
      .then((results) =>
        results.map((row) => ({
          ...row.item_expense,
          item: row.item,
        })),
      );
  }

  async getExpensesByItem(itemId: string): Promise<ItemExpense[]> {
    return await db
      .select()
      .from(itemExpense)
      .where(eq(itemExpense.itemId, itemId))
      .orderBy(desc(itemExpense.incurredAt));
  }

  async createExpense(insertExpense: InsertItemExpense): Promise<ItemExpense> {
    const payload: typeof itemExpense.$inferInsert = {
      ...insertExpense,
      amount: toDbNumeric(insertExpense.amount!),
      incurredAt: toDbTimestamp(insertExpense.incurredAt!),
    };
    const [result] = await db.insert(itemExpense).values(payload).returning();
    return result;
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
    const [revenueResult] = await db
      .select({
        total: sum(clientPayment.amount),
      })
      .from(clientPayment);

    const [itemsResult] = await db
      .select({
        count: count(),
      })
      .from(item)
      .where(sql`${item.status} IN ('in-store')`);

    const [valueAgg] = await db
      .select({
        // min: sum of minSalesPrice (or 0)
        minValue: sql<number>`COALESCE(SUM(COALESCE(${item.minSalesPrice}, 0)), 0)`,
        // max: sum of maxSalesPrice, falling back to minSalesPrice when max is null
        maxValue: sql<number>`COALESCE(SUM(COALESCE(${item.maxSalesPrice}, ${item.minSalesPrice}, 0)), 0)`,
      })
      .from(item)
      .where(sql`${item.status} IN ('in-store')`);

    const pendingPayouts = await this.getPendingPayouts();

    // Calculate min/max pending payouts using cost ranges
    const pendingPayoutsMin = pendingPayouts.reduce(
      (sum, item) => sum + Number(item.minCost || item.maxCost || 0),
      0,
    );
    const pendingPayoutsMax = pendingPayouts.reduce(
      (sum, item) => sum + Number(item.maxCost || item.minCost || 0),
      0,
    );

    const [expensesResult] = await db
      .select({
        total: sum(itemExpense.amount),
      })
      .from(itemExpense);

    const totalRevenue = Number(revenueResult.total || 0);
    const totalExpenses = Number(expensesResult.total || 0);

    // Calculate net profit ranges
    const netProfitMin = totalRevenue - totalExpenses - pendingPayoutsMax;
    const netProfitMax = totalRevenue - totalExpenses - pendingPayoutsMin;

    // Calculate incoming payments from sold items (fixed amounts, not ranges)
    const soldItems = await db
      .select()
      .from(item)
      .where(eq(item.status, "sold"));

    let incomingPayments = 0;
    for (const soldItem of soldItems) {
      const payments = await db
        .select({ amount: clientPayment.amount })
        .from(clientPayment)
        .where(eq(clientPayment.itemId, soldItem.itemId));
      incomingPayments += payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );
    }

    // Calculate upcoming payouts using formula: (Actual sales price / highest market value) * highest item cost
    let upcomingPayouts = 0;
    for (const soldItem of soldItems) {
      const payments = await db
        .select({ amount: clientPayment.amount })
        .from(clientPayment)
        .where(eq(clientPayment.itemId, soldItem.itemId));

      const actualSalesPrice = payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0,
      );
      const highestMarketValue = Number(
        soldItem.maxSalesPrice || soldItem.minSalesPrice || 0,
      );
      const highestItemCost = Number(soldItem.maxCost || soldItem.minCost || 0);

      if (highestMarketValue > 0) {
        const payoutAmount =
          (actualSalesPrice / highestMarketValue) * highestItemCost;
        upcomingPayouts += payoutAmount;
      }
    }

    // Calculate cost ranges for active items
    const activeItems = await db
      .select()
      .from(item)
      .where(sql`${item.status} IN ('in-store')`);

    const costRange = activeItems.reduce(
      (acc, item) => ({
        min: acc.min + Number(item.minCost || 0),
        max: acc.max + Number(item.maxCost || item.minCost || 0),
      }),
      { min: 0, max: 0 },
    );

    return {
      totalRevenue,
      activeItems: itemsResult.count,
      pendingPayouts: { min: pendingPayoutsMin, max: pendingPayoutsMax },
      netProfit: { min: netProfitMin, max: netProfitMax },
      incomingPayments,
      upcomingPayouts,
      costRange,
      inventoryValueRange: {
        min: Number(valueAgg?.minValue || 0),
        max: Number(valueAgg?.maxValue || 0),
      },
    };
  }

  async getRecentItems(limit = 10): Promise<Array<Item & { vendor: Vendor }>> {
    return await db
      .select()
      .from(item)
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .orderBy(desc(item.createdAt))
      .limit(limit)
      .then((results) =>
        results.map((row) => ({
          ...row.item,
          vendor: row.vendor,
        })),
      );
  }

  async getTopPerformingItems(
    limit = 5,
  ): Promise<Array<Item & { vendor: Vendor; profit: number }>> {
    const soldItems = await db
      .select()
      .from(item)
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .where(eq(item.status, "sold"))
      .then((results) =>
        results.map((row) => ({
          ...row.item,
          vendor: row.vendor,
        })),
      );

    const itemsWithProfit = await Promise.all(
      soldItems.map(async (item) => {
        const payments = await db
          .select({ amount: clientPayment.amount })
          .from(clientPayment)
          .where(eq(clientPayment.itemId, item.itemId));

        const expenses = await db
          .select({ amount: itemExpense.amount })
          .from(itemExpense)
          .where(eq(itemExpense.itemId, item.itemId));

        const totalPayments = payments.reduce(
          (sum, p) => sum + Number(p.amount),
          0,
        );
        const totalExpenses = expenses.reduce(
          (sum, e) => sum + Number(e.amount),
          0,
        );
        const profit =
          totalPayments - Number(item.maxCost || 0) - totalExpenses;

        return { ...item, profit };
      }),
    );

    return itemsWithProfit.sort((a, b) => b.profit - a.profit).slice(0, limit);
  }

  async getFinancialDataByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<{
    totalRevenue: number;
    totalCosts: number;
    totalProfit: number;
    itemsSold: number;
    averageOrderValue: number;
    totalExpenses: number;
  }> {
    // Get payments within date range
    const [revenueResult] = await db
      .select({
        total: sum(clientPayment.amount),
        count: count(),
      })
      .from(clientPayment)
      .where(
        sql`${clientPayment.paidAt} >= ${startDate} AND ${clientPayment.paidAt} <= ${endDate}`,
      );

    // Get expenses within date range
    const [expensesResult] = await db
      .select({
        total: sum(itemExpense.amount),
      })
      .from(itemExpense)
      .where(
        sql`${itemExpense.incurredAt} >= ${startDate} AND ${itemExpense.incurredAt} <= ${endDate}`,
      );

    // Get items that had payments within date range to calculate costs
    const paymentsInRange = await db
      .select({
        itemId: clientPayment.itemId,
        amount: clientPayment.amount,
      })
      .from(clientPayment)
      .where(
        sql`${clientPayment.paidAt} >= ${startDate} AND ${clientPayment.paidAt} <= ${endDate}`,
      );

    const uniqueItemIds = [...new Set(paymentsInRange.map((p) => p.itemId))];

    let totalCosts = 0;
    if (uniqueItemIds.length > 0) {
      const itemsWithPayments = await db
        .select()
        .from(item)
        .where(inArray(item.itemId, uniqueItemIds));

      totalCosts = itemsWithPayments.reduce(
        (sum, item) => sum + Number(item.maxCost || item.minCost || 0),
        0,
      );
    }

    const totalRevenue = Number(revenueResult.total || 0);
    const totalExpenses = Number(expensesResult.total || 0);
    const itemsSold = uniqueItemIds.length;

    const totalProfit = totalRevenue - totalCosts - totalExpenses;
    const averageOrderValue = itemsSold > 0 ? totalRevenue / itemsSold : 0;

    return {
      totalRevenue,
      totalCosts,
      totalProfit,
      itemsSold,
      averageOrderValue,
      totalExpenses,
    };
  }

  async getInstallmentPlans(): Promise<
    Array<InstallmentPlan & { item: Item & { vendor: Vendor }; client: Client }>
  > {
    return await db
      .select()
      .from(installmentPlan)
      .innerJoin(item, eq(installmentPlan.itemId, item.itemId))
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .innerJoin(client, eq(installmentPlan.clientId, client.clientId))
      .orderBy(desc(installmentPlan.dueDate))
      .then((rows) =>
        rows.map((row) => ({
          ...row.installment_plan,
          item: { ...row.item, vendor: row.vendor },
          client: row.client,
        })),
      );
  }

  async getInstallmentPlansByItem(
    itemId: string,
  ): Promise<Array<InstallmentPlan & { client: Client }>> {
    return await db
      .select()
      .from(installmentPlan)
      .innerJoin(client, eq(installmentPlan.clientId, client.clientId))
      .where(eq(installmentPlan.itemId, itemId))
      .orderBy(installmentPlan.dueDate)
      .then((rows) =>
        rows.map((row) => ({
          ...row.installment_plan,
          client: row.client,
        })),
      );
  }

  async getInstallmentPlansByClient(
    clientId: string,
  ): Promise<Array<InstallmentPlan & { item: Item & { vendor: Vendor } }>> {
    return await db
      .select()
      .from(installmentPlan)
      .innerJoin(item, eq(installmentPlan.itemId, item.itemId))
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .where(eq(installmentPlan.clientId, clientId))
      .orderBy(installmentPlan.dueDate)
      .then((rows) =>
        rows.map((row) => ({
          ...row.installment_plan,
          item: { ...row.item, vendor: row.vendor },
        })),
      );
  }

  async createInstallmentPlan(
    insertPlan: InsertInstallmentPlan,
  ): Promise<InstallmentPlan> {
    const payload: typeof installmentPlan.$inferInsert = {
      ...insertPlan,
      amount: toDbNumeric(insertPlan.amount!),
      dueDate: toDbDate(insertPlan.dueDate!),
    };
    const [plan] = await db.insert(installmentPlan).values(payload).returning();
    return plan;
  }

  async updateInstallmentPlan(
    id: string,
    updatePlan: Partial<InsertInstallmentPlan>,
  ): Promise<InstallmentPlan> {
    const payload: Partial<typeof installmentPlan.$inferInsert> = {};
    if (updatePlan.clientId !== undefined)
      payload.clientId = updatePlan.clientId;
    if (updatePlan.itemId !== undefined) payload.itemId = updatePlan.itemId;
    if (updatePlan.amount !== undefined)
      payload.amount = toDbNumeric(updatePlan.amount);
    if (updatePlan.dueDate !== undefined)
      payload.dueDate = toDbDate(updatePlan.dueDate);

    const [plan] = await db
      .update(installmentPlan)
      .set(payload)
      .where(eq(installmentPlan.installmentId, id))
      .returning();
    return plan;
  }

  async deleteInstallmentPlan(id: string): Promise<void> {
    await db
      .delete(installmentPlan)
      .where(eq(installmentPlan.installmentId, id));
  }

  async getPaymentMetrics(): Promise<{
    totalPaymentsReceived: number;
    totalPaymentsAmount: number;
    overduePayments: number;
    upcomingPayments: number;
    averagePaymentAmount: number;
    monthlyPaymentTrend: number;
  }> {
    const today = new Date().toISOString().split("T")[0];
    const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const [paymentsData, installmentsData] = await Promise.all([
      db
        .select({
          totalCount: count(),
          totalAmount: sum(clientPayment.amount),
          avgAmount: sql<number>`AVG(${clientPayment.amount})`,
          recentCount: sql<number>`COUNT(CASE WHEN ${clientPayment.paidAt} >= ${lastMonth} THEN 1 END)`,
        })
        .from(clientPayment),
      db
        .select({
          overdueCount: sql<number>`COUNT(CASE WHEN ${installmentPlan.dueDate} < ${today} AND ${installmentPlan.status} = 'pending' THEN 1 END)`,
          upcomingCount: sql<number>`COUNT(CASE WHEN ${installmentPlan.dueDate} >= ${today} AND ${installmentPlan.status} = 'pending' THEN 1 END)`,
        })
        .from(installmentPlan),
    ]);

    const payments = paymentsData[0];
    const installments = installmentsData[0];

    const monthlyTrend =
      payments.recentCount > 0
        ? (payments.recentCount /
            Math.max(payments.totalCount - payments.recentCount, 1)) *
          100
        : 0;

    return {
      totalPaymentsReceived: payments.totalCount || 0,
      totalPaymentsAmount: Number(payments.totalAmount) || 0,
      overduePayments: installments.overdueCount || 0,
      upcomingPayments: installments.upcomingCount || 0,
      averagePaymentAmount: Number(payments.avgAmount) || 0,
      monthlyPaymentTrend: monthlyTrend,
    };
  }

  async getUpcomingPayments(
    limit = 10,
  ): Promise<
    Array<InstallmentPlan & { item: Item & { vendor: Vendor }; client: Client }>
  > {
    const today = new Date().toISOString().split("T")[0];
    return await db
      .select()
      .from(installmentPlan)
      .innerJoin(item, eq(installmentPlan.itemId, item.itemId))
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .innerJoin(client, eq(installmentPlan.clientId, client.clientId))
      .where(eq(installmentPlan.status, "pending"))
      .orderBy(installmentPlan.dueDate)
      .limit(limit)
      .then((rows) =>
        rows.map((row) => ({
          ...row.installment_plan,
          item: { ...row.item, vendor: row.vendor },
          client: row.client,
        })),
      );
  }

  async getRecentPayments(
    limit = 10,
  ): Promise<
    Array<ClientPayment & { item: Item & { vendor: Vendor }; client: Client }>
  > {
    return await db
      .select()
      .from(clientPayment)
      .innerJoin(item, eq(clientPayment.itemId, item.itemId))
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .innerJoin(client, eq(clientPayment.clientId, client.clientId))
      .orderBy(desc(clientPayment.paidAt))
      .limit(limit)
      .then((rows) =>
        rows.map((row) => ({
          ...row.client_payment,
          item: { ...row.item, vendor: row.vendor },
          client: row.client,
        })),
      );
  }

  async getOverduePayments(): Promise<
    Array<InstallmentPlan & { item: Item & { vendor: Vendor }; client: Client }>
  > {
    const today = new Date().toISOString().split("T")[0];
    return await db
      .select()
      .from(installmentPlan)
      .innerJoin(item, eq(installmentPlan.itemId, item.itemId))
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .innerJoin(client, eq(installmentPlan.clientId, client.clientId))
      .where(
        sql`${installmentPlan.dueDate} < ${today} AND ${installmentPlan.status} = 'pending'`,
      )
      .orderBy(installmentPlan.dueDate)
      .then((rows) =>
        rows.map((row) => ({
          ...row.installment_plan,
          item: { ...row.item, vendor: row.vendor },
          client: row.client,
        })),
      );
  }

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
    const today = new Date().toISOString().split("T")[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // Calculate payment timeliness (40% weight)
    const [paymentTimeliness] = await db
      .select({
        onTimePayments: sql<number>`COUNT(CASE WHEN ${installmentPlan.status} = 'paid' THEN 1 END)`,
        overduePayments: sql<number>`COUNT(CASE WHEN ${installmentPlan.dueDate} < ${today} AND ${installmentPlan.status} = 'pending' THEN 1 END)`,
        totalPayments: count(),
      })
      .from(installmentPlan);

    const timelinessScore =
      paymentTimeliness.totalPayments > 0
        ? (paymentTimeliness.onTimePayments / paymentTimeliness.totalPayments) *
          100
        : 100;

    // Calculate cash flow (25% weight)
    const [revenueData] = await db
      .select({
        currentMonthRevenue: sql<number>`SUM(CASE WHEN ${clientPayment.paidAt} >= ${thirtyDaysAgo} THEN ${clientPayment.amount} ELSE 0 END)`,
        previousMonthRevenue: sql<number>`SUM(CASE WHEN ${clientPayment.paidAt} >= ${sixtyDaysAgo} AND ${clientPayment.paidAt} < ${thirtyDaysAgo} THEN ${clientPayment.amount} ELSE 0 END)`,
        totalRevenue: sum(clientPayment.amount),
      })
      .from(clientPayment);

    const cashFlowScore =
      revenueData.previousMonthRevenue > 0
        ? Math.min(
            (revenueData.currentMonthRevenue /
              revenueData.previousMonthRevenue) *
              50,
            100,
          )
        : 50;

    // Calculate inventory turnover (20% weight)
    const [inventoryData] = await db
      .select({
        soldItems: sql<number>`COUNT(CASE WHEN ${item.status} = 'sold' THEN 1 END)`,
        totalItems: count(),
      })
      .from(item);

    const inventoryTurnoverScore =
      inventoryData.totalItems > 0
        ? (inventoryData.soldItems / inventoryData.totalItems) * 100
        : 0;

    // Calculate profit margin (10% weight)
    const [revenueTotal] = await db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(${clientPayment.amount}), 0)`,
      })
      .from(clientPayment);

    const [payoutTotal] = await db
      .select({
        totalPayouts: sql<number>`COALESCE(SUM(${vendorPayout.amount}), 0)`,
      })
      .from(vendorPayout);

    const [expenseTotal] = await db
      .select({
        totalExpenses: sql<number>`COALESCE(SUM(${itemExpense.amount}), 0)`,
      })
      .from(itemExpense);

    const profitData = {
      totalRevenue: revenueTotal.totalRevenue,
      totalPayouts: payoutTotal.totalPayouts,
      totalExpenses: expenseTotal.totalExpenses,
    };

    const totalCosts = profitData.totalPayouts + profitData.totalExpenses;
    const profitMarginScore =
      profitData.totalRevenue > 0
        ? ((profitData.totalRevenue - totalCosts) / profitData.totalRevenue) *
          100
        : 0;

    // Calculate client retention (5% weight)
    const [clientData] = await db.select({
      returningClients: sql<number>`COUNT(DISTINCT CASE WHEN payment_count > 1 THEN client_id END)`,
      totalClients: sql<number>`COUNT(DISTINCT client_id)`,
    }).from(sql`(
        SELECT client_id, COUNT(*) as payment_count 
        FROM client_payment 
        GROUP BY client_id
      ) as client_stats`);

    const clientRetentionScore =
      clientData.totalClients > 0
        ? (clientData.returningClients / clientData.totalClients) * 100
        : 0;

    // Calculate weighted score
    const factors = {
      paymentTimeliness: Math.max(0, Math.min(100, timelinessScore)),
      cashFlow: Math.max(0, Math.min(100, cashFlowScore)),
      inventoryTurnover: Math.max(0, Math.min(100, inventoryTurnoverScore)),
      profitMargin: Math.max(0, Math.min(100, profitMarginScore)),
      clientRetention: Math.max(0, Math.min(100, clientRetentionScore)),
    };

    const score = Math.round(
      factors.paymentTimeliness * 0.4 +
        factors.cashFlow * 0.25 +
        factors.inventoryTurnover * 0.2 +
        factors.profitMargin * 0.1 +
        factors.clientRetention * 0.05,
    );

    // Determine grade
    let grade: string;
    if (score >= 90) grade = "A+";
    else if (score >= 80) grade = "A";
    else if (score >= 70) grade = "B";
    else if (score >= 60) grade = "C";
    else if (score >= 50) grade = "D";
    else grade = "F";

    // Generate recommendations
    const recommendations: string[] = [];
    if (factors.paymentTimeliness < 80) {
      recommendations.push(
        "Improve payment collection processes and follow up on overdue payments",
      );
    }
    if (factors.cashFlow < 60) {
      recommendations.push(
        "Focus on increasing monthly revenue and diversifying payment methods",
      );
    }
    if (factors.inventoryTurnover < 50) {
      recommendations.push(
        "Optimize inventory management and consider price adjustments for slow-moving items",
      );
    }
    if (factors.profitMargin < 30) {
      recommendations.push(
        "Review pricing strategy and reduce operational costs",
      );
    }
    if (factors.clientRetention < 40) {
      recommendations.push(
        "Implement client retention strategies and improve customer service",
      );
    }

    return {
      score,
      grade,
      factors,
      recommendations:
        recommendations.length > 0
          ? recommendations
          : ["Maintain current performance levels"],
    };
  }

  // Data migration helper - backfill brandId from legacy brand text field
  async migrateLegacyBrands(): Promise<{
    brandsCreated: number;
    itemsUpdated: number;
    skippedItems: number;
  }> {
    // Get all distinct brand names from existing items that have text brand values but no brandId
    const distinctBrands = await db
      .selectDistinct({ brand: item.brand })
      .from(item)
      .where(
        and(
          isNotNull(item.brand),
          sql`${item.brand} != ''`,
          isNull(item.brandId),
        ),
      );

    let brandsCreated = 0;
    let itemsUpdated = 0;
    let skippedItems = 0;

    for (const brandRecord of distinctBrands) {
      if (!brandRecord.brand) continue;

      const brandName = brandRecord.brand.trim();
      if (!brandName) continue;

      // Check if this brand already exists
      const [existingBrand] = await db
        .select()
        .from(brand)
        .where(eq(brand.name, brandName));

      let brandId: string;

      if (existingBrand) {
        // Use existing brand
        brandId = existingBrand.brandId;
      } else {
        // Create new brand
        const [newBrand] = await db
          .insert(brand)
          .values({
            name: brandName,
            active: "true",
          })
          .returning();

        brandId = newBrand.brandId;
        brandsCreated++;
      }

      // Update all items with this brand name to reference the brandId
      const updateResult = await db
        .update(item)
        .set({ brandId: brandId })
        .where(and(eq(item.brand, brandRecord.brand), isNull(item.brandId)));

      itemsUpdated += updateResult.rowCount || 0;
    }

    // Count items that couldn't be migrated (null or empty brand)
    const [skippedCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(item)
      .where(
        and(
          isNull(item.brandId),
          sql`(${item.brand} IS NULL OR ${item.brand} = '')`,
        ),
      );

    skippedItems = skippedCount.count;

    return {
      brandsCreated,
      itemsUpdated,
      skippedItems,
    };
  }

  async markInstallmentPaid(installmentId: string): Promise<InstallmentPlan> {
    // Get the installment plan details first
    const [plan] = await db
      .select()
      .from(installmentPlan)
      .where(eq(installmentPlan.installmentId, installmentId));

    if (!plan) {
      throw new Error("Installment plan not found");
    }

    // Create a payment record for this installment
    await db.insert(clientPayment).values({
      itemId: plan.itemId,
      clientId: plan.clientId,
      amount: plan.amount,
      paymentMethod: "Installment Payment",
      paidAt: new Date(),
    });

    // Update the installment plan status to paid
    const [updatedPlan] = await db
      .update(installmentPlan)
      .set({
        status: "paid",
        paidAmount: plan.amount,
      })
      .where(eq(installmentPlan.installmentId, installmentId))
      .returning();

    return updatedPlan;
  }

  async sendPaymentReminder(installmentId: string): Promise<boolean> {
    // In a real implementation, this would send an email/SMS reminder
    // For now, we'll just update a lastReminder field if it exists
    try {
      await db
        .update(installmentPlan)
        .set({
          // Add a lastReminder field in the future
          status: "pending", // Keep status as pending but log the reminder
        })
        .where(eq(installmentPlan.installmentId, installmentId));
      return true;
    } catch (error) {
      return false;
    }
  }

  async getLuxetteInventoryData(): Promise<{
    itemCount: number;
    totalCost: number;
    priceRange: { min: number; max: number };
  }> {
    // Get all items from the Luxette vendor
    const luxetteItems = await db
      .select({
        minCost: item.minCost,
        maxCost: item.maxCost,
        minSalesPrice: item.minSalesPrice,
        maxSalesPrice: item.maxSalesPrice,
        status: item.status,
      })
      .from(item)
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .where(
        and(
          sql`LOWER(${vendor.name}) LIKE '%luxette%'`,
          sql`${item.status} IN ('in-store', 'reserved')`,
        ),
      );

    const itemCount = luxetteItems.length;

    // Calculate total cost using minCost where available
    const totalCost = luxetteItems.reduce((sum, item) => {
      const cost = parseFloat(item.minCost || "0");
      return sum + cost;
    }, 0);

    // Calculate price range using sales prices
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    luxetteItems.forEach((item) => {
      const itemMinPrice = parseFloat(item.minSalesPrice || "0");
      const itemMaxPrice = parseFloat(item.maxSalesPrice || "0");

      if (itemMinPrice > 0) {
        minPrice = Math.min(minPrice, itemMinPrice);
      }
      if (itemMaxPrice > 0) {
        maxPrice = Math.max(maxPrice, itemMaxPrice);
      }
    });

    // If no valid prices found, set to 0
    if (minPrice === Infinity) minPrice = 0;
    if (maxPrice === -Infinity) maxPrice = 0;

    return {
      itemCount,
      totalCost: Math.round(totalCost * 100) / 100, // Round to 2 decimal places
      priceRange: {
        min: Math.round(minPrice * 100) / 100,
        max: Math.round(maxPrice * 100) / 100,
      },
    };
  }

  // Business Intelligence data aggregation methods
  async getReportKPIs(
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
  }> {
    // Build where conditions based on filters
    const buildWhereConditions = () => {
      const conditions = [
        sql`${clientPayment.paidAt} >= ${startDate}`,
        sql`${clientPayment.paidAt} <= ${endDate}`,
      ];

      if (filters?.vendorIds?.length) {
        conditions.push(inArray(vendor.vendorId, filters.vendorIds));
      }
      if (filters?.clientIds?.length) {
        conditions.push(inArray(client.clientId, filters.clientIds));
      }
      if (filters?.brandIds?.length) {
        conditions.push(inArray(item.brandId, filters.brandIds));
      }
      if (filters?.categoryIds?.length) {
        conditions.push(inArray(item.categoryId, filters.categoryIds));
      }
      if (filters?.itemStatuses?.length) {
        conditions.push(inArray(item.status, filters.itemStatuses));
      }

      return and(...conditions);
    };

    // Get revenue and payment data
    const [revenueData] = await db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(${clientPayment.amount}), 0)`,
        paymentCount: sql<number>`COUNT(${clientPayment.paymentId})`,
        uniqueClients: sql<number>`COUNT(DISTINCT ${clientPayment.clientId})`,
        uniqueItems: sql<number>`COUNT(DISTINCT ${clientPayment.itemId})`,
      })
      .from(clientPayment)
      .innerJoin(item, eq(clientPayment.itemId, item.itemId))
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .innerJoin(client, eq(clientPayment.clientId, client.clientId))
      .leftJoin(brand, eq(item.brandId, brand.brandId))
      .leftJoin(category, eq(item.categoryId, category.categoryId))
      .where(buildWhereConditions());

    // Get COGS (Cost of Goods Sold) based on items that had payments
    const soldItemsData = await db
      .selectDistinct({
        itemId: clientPayment.itemId,
        minCost: item.minCost,
        maxCost: item.maxCost,
      })
      .from(clientPayment)
      .innerJoin(item, eq(clientPayment.itemId, item.itemId))
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .innerJoin(client, eq(clientPayment.clientId, client.clientId))
      .leftJoin(brand, eq(item.brandId, brand.brandId))
      .leftJoin(category, eq(item.categoryId, category.categoryId))
      .where(buildWhereConditions());

    const cogs = soldItemsData.reduce((sum, item) => {
      const cost = Number(item.maxCost || item.minCost || 0);
      return sum + cost;
    }, 0);

    // Get expenses for sold items
    const soldItemIds = soldItemsData.map((item) => item.itemId);
    let totalExpenses = 0;

    if (soldItemIds.length > 0) {
      const [expenseData] = await db
        .select({
          totalExpenses: sql<number>`COALESCE(SUM(${itemExpense.amount}), 0)`,
        })
        .from(itemExpense)
        .where(
          and(
            inArray(itemExpense.itemId, soldItemIds),
            sql`${itemExpense.incurredAt} >= ${startDate}`,
            sql`${itemExpense.incurredAt} <= ${endDate}`,
          ),
        );
      totalExpenses = Number(expenseData.totalExpenses || 0);
    }

    // Get average days to sell
    const soldItemsWithDates = await db
      .select({
        itemId: item.itemId,
        acquisitionDate: item.acquisitionDate,
        firstPaymentDate: sql<string>`MIN(${clientPayment.paidAt})`,
      })
      .from(item)
      .innerJoin(clientPayment, eq(item.itemId, clientPayment.itemId))
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .innerJoin(client, eq(clientPayment.clientId, client.clientId))
      .leftJoin(brand, eq(item.brandId, brand.brandId))
      .leftJoin(category, eq(item.categoryId, category.categoryId))
      .where(buildWhereConditions())
      .groupBy(item.itemId, item.acquisitionDate);

    const averageDaysToSell =
      soldItemsWithDates.length > 0
        ? soldItemsWithDates.reduce((sum, item) => {
            if (item.acquisitionDate && item.firstPaymentDate) {
              const acquisitionDate = new Date(item.acquisitionDate);
              const soldDate = new Date(item.firstPaymentDate);
              const days = Math.max(
                0,
                Math.floor(
                  (soldDate.getTime() - acquisitionDate.getTime()) /
                    (1000 * 60 * 60 * 24),
                ),
              );
              return sum + days;
            }
            return sum;
          }, 0) / soldItemsWithDates.length
        : 0;

    // Calculate KPIs
    const revenue = Number(revenueData.totalRevenue || 0);
    const itemsSold = Number(revenueData.uniqueItems || 0);
    const paymentCount = Number(revenueData.paymentCount || 0);
    const uniqueClients = Number(revenueData.uniqueClients || 0);

    const grossProfit = revenue - cogs;
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const netProfit = grossProfit - totalExpenses;
    const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    const averageOrderValue = paymentCount > 0 ? revenue / paymentCount : 0;

    // Simple inventory turnover approximation (revenue / average inventory value)
    const averageInventoryValue = cogs / (itemsSold || 1);
    const inventoryTurnover =
      averageInventoryValue > 0 ? revenue / averageInventoryValue : 0;

    return {
      revenue: Math.round(revenue * 100) / 100,
      cogs: Math.round(cogs * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      grossMargin: Math.round(grossMargin * 100) / 100,
      itemsSold,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      netMargin: Math.round(netMargin * 100) / 100,
      paymentCount,
      uniqueClients,
      averageDaysToSell: Math.round(averageDaysToSell * 10) / 10,
      inventoryTurnover: Math.round(inventoryTurnover * 100) / 100,
    };
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
    },
  ): Promise<
    Array<{
      period: string;
      value: number;
      count?: number;
    }>
  > {
    // Build where conditions based on filters
    const buildWhereConditions = () => {
      const conditions = [
        sql`${clientPayment.paidAt} >= ${startDate}`,
        sql`${clientPayment.paidAt} <= ${endDate}`,
      ];

      if (filters?.vendorIds?.length) {
        conditions.push(inArray(vendor.vendorId, filters.vendorIds));
      }
      if (filters?.clientIds?.length) {
        conditions.push(inArray(client.clientId, filters.clientIds));
      }
      if (filters?.brandIds?.length) {
        conditions.push(inArray(item.brandId, filters.brandIds));
      }
      if (filters?.categoryIds?.length) {
        conditions.push(inArray(item.categoryId, filters.categoryIds));
      }
      if (filters?.itemStatuses?.length) {
        conditions.push(inArray(item.status, filters.itemStatuses));
      }

      return and(...conditions);
    };

    // Date truncation based on granularity
    const dateTrunc = {
      day: sql`DATE(${clientPayment.paidAt})`,
      week: sql`DATE_TRUNC('week', ${clientPayment.paidAt})`,
      month: sql`DATE_TRUNC('month', ${clientPayment.paidAt})`,
    }[granularity];

    if (metric === "revenue") {
      const results = await db
        .select({
          period: dateTrunc,
          value: sql<number>`SUM(${clientPayment.amount})`,
          count: sql<number>`COUNT(${clientPayment.paymentId})`,
        })
        .from(clientPayment)
        .innerJoin(item, eq(clientPayment.itemId, item.itemId))
        .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
        .innerJoin(client, eq(clientPayment.clientId, client.clientId))
        .leftJoin(brand, eq(item.brandId, brand.brandId))
        .leftJoin(category, eq(item.categoryId, category.categoryId))
        .where(buildWhereConditions())
        .groupBy(dateTrunc)
        .orderBy(dateTrunc);

      return results.map((row) => ({
        period: row.period.toString(),
        value: Number(row.value || 0),
        count: Number(row.count || 0),
      }));
    }

    if (metric === "payments") {
      const results = await db
        .select({
          period: dateTrunc,
          value: sql<number>`COUNT(${clientPayment.paymentId})`,
          count: sql<number>`COUNT(DISTINCT ${clientPayment.clientId})`,
        })
        .from(clientPayment)
        .innerJoin(item, eq(clientPayment.itemId, item.itemId))
        .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
        .innerJoin(client, eq(clientPayment.clientId, client.clientId))
        .leftJoin(brand, eq(item.brandId, brand.brandId))
        .leftJoin(category, eq(item.categoryId, category.categoryId))
        .where(buildWhereConditions())
        .groupBy(dateTrunc)
        .orderBy(dateTrunc);

      return results.map((row) => ({
        period: row.period.toString(),
        value: Number(row.value || 0),
        count: Number(row.count || 0), // unique clients
      }));
    }

    if (metric === "itemsSold") {
      const results = await db
        .select({
          period: dateTrunc,
          value: sql<number>`COUNT(DISTINCT ${clientPayment.itemId})`,
          count: sql<number>`COUNT(${clientPayment.paymentId})`,
        })
        .from(clientPayment)
        .innerJoin(item, eq(clientPayment.itemId, item.itemId))
        .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
        .innerJoin(client, eq(clientPayment.clientId, client.clientId))
        .leftJoin(brand, eq(item.brandId, brand.brandId))
        .leftJoin(category, eq(item.categoryId, category.categoryId))
        .where(buildWhereConditions())
        .groupBy(dateTrunc)
        .orderBy(dateTrunc);

      return results.map((row) => ({
        period: row.period.toString(),
        value: Number(row.value || 0),
        count: Number(row.count || 0), // payment count
      }));
    }

    if (metric === "profit") {
      // For profit, we need to get revenue and subtract costs and expenses
      const revenueResults = await db
        .select({
          period: dateTrunc,
          revenue: sql<number>`SUM(${clientPayment.amount})`,
          itemIds: sql<string[]>`ARRAY_AGG(DISTINCT ${clientPayment.itemId})`,
        })
        .from(clientPayment)
        .innerJoin(item, eq(clientPayment.itemId, item.itemId))
        .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
        .innerJoin(client, eq(clientPayment.clientId, client.clientId))
        .leftJoin(brand, eq(item.brandId, brand.brandId))
        .leftJoin(category, eq(item.categoryId, category.categoryId))
        .where(buildWhereConditions())
        .groupBy(dateTrunc)
        .orderBy(dateTrunc);

      const results = [];
      for (const row of revenueResults) {
        let profit = Number(row.revenue || 0);

        // Subtract costs for items sold in this period
        if (row.itemIds && row.itemIds.length > 0) {
          const itemCosts = await db
            .select({
              totalCost: sql<number>`SUM(COALESCE(${item.maxCost}, ${item.minCost}, 0))`,
            })
            .from(item)
            .where(inArray(item.itemId, row.itemIds));

          profit -= Number(itemCosts[0]?.totalCost || 0);

          // Subtract expenses for items sold in this period
          const itemExpenses = await db
            .select({
              totalExpenses: sql<number>`SUM(${itemExpense.amount})`,
            })
            .from(itemExpense)
            .where(inArray(itemExpense.itemId, row.itemIds));

          profit -= Number(itemExpenses[0]?.totalExpenses || 0);
        }

        results.push({
          period: row.period.toString(),
          value: Math.round(profit * 100) / 100,
          count: row.itemIds?.length || 0,
        });
      }

      return results;
    }

    return [];
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
  > {
    // Build where conditions based on filters
    const buildWhereConditions = () => {
      const conditions = [
        sql`${clientPayment.paidAt} >= ${startDate}`,
        sql`${clientPayment.paidAt} <= ${endDate}`,
      ];

      if (filters?.vendorIds?.length) {
        conditions.push(inArray(vendor.vendorId, filters.vendorIds));
      }
      if (filters?.clientIds?.length) {
        conditions.push(inArray(client.clientId, filters.clientIds));
      }
      if (filters?.brandIds?.length) {
        conditions.push(inArray(item.brandId, filters.brandIds));
      }
      if (filters?.categoryIds?.length) {
        conditions.push(inArray(item.categoryId, filters.categoryIds));
      }
      if (filters?.itemStatuses?.length) {
        conditions.push(inArray(item.status, filters.itemStatuses));
      }

      return and(...conditions);
    };

    // Select appropriate grouping fields
    const getGroupFields = () => {
      switch (groupBy) {
        case "brand":
          return {
            groupId: brand.brandId,
            groupName: sql<string>`COALESCE(${brand.name}, ${item.brand}, 'Unknown Brand')`,
          };
        case "vendor":
          return {
            groupId: vendor.vendorId,
            groupName: sql<string>`COALESCE(${vendor.name}, 'Unknown Vendor')`,
          };
        case "client":
          return {
            groupId: client.clientId,
            groupName: sql<string>`COALESCE(${client.name}, 'Unknown Client')`,
          };
        case "category":
          return {
            groupId: category.categoryId,
            groupName: sql<string>`COALESCE(${category.name}, 'Unknown Category')`,
          };
        default:
          throw new Error(`Invalid groupBy: ${groupBy}`);
      }
    };

    const groupFields = getGroupFields();

    // Build select fields based on requested metrics
    const selectFields: any = {
      groupId: groupFields.groupId,
      groupName: groupFields.groupName,
    };

    if (metrics.includes("revenue")) {
      selectFields.revenue = sql<number>`SUM(${clientPayment.amount})`;
    }
    if (metrics.includes("itemsSold")) {
      selectFields.itemsSold = sql<number>`COUNT(DISTINCT ${clientPayment.itemId})`;
    }
    if (metrics.includes("avgOrderValue")) {
      selectFields.avgOrderValue = sql<number>`AVG(${clientPayment.amount})`;
    }
    if (metrics.includes("profit")) {
      selectFields.itemIds = sql<
        string[]
      >`ARRAY_AGG(DISTINCT ${clientPayment.itemId})`;
    }

    const results = await db
      .select(selectFields)
      .from(clientPayment)
      .innerJoin(item, eq(clientPayment.itemId, item.itemId))
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .innerJoin(client, eq(clientPayment.clientId, client.clientId))
      .leftJoin(brand, eq(item.brandId, brand.brandId))
      .leftJoin(category, eq(item.categoryId, category.categoryId))
      .where(buildWhereConditions())
      .groupBy(groupFields.groupId, groupFields.groupName)
      .orderBy(desc(selectFields.revenue || sql<number>`COUNT(*)`));

    // Calculate profit if requested
    const finalResults = [];
    for (const row of results) {
      const result: any = {
        groupId: row.groupId,
        groupName: row.groupName,
      };

      if (metrics.includes("revenue")) {
        result.revenue = Math.round(Number(row.revenue || 0) * 100) / 100;
      }
      if (metrics.includes("itemsSold")) {
        result.itemsSold = Number(row.itemsSold || 0);
      }
      if (metrics.includes("avgOrderValue")) {
        result.avgOrderValue =
          Math.round(Number(row.avgOrderValue || 0) * 100) / 100;
      }

      if (metrics.includes("profit") && row.itemIds && row.itemIds.length > 0) {
        let profit = Number(row.revenue || 0);

        // Subtract costs
        const itemCosts = await db
          .select({
            totalCost: sql<number>`SUM(COALESCE(${item.maxCost}, ${item.minCost}, 0))`,
          })
          .from(item)
          .where(inArray(item.itemId, row.itemIds));

        profit -= Number(itemCosts[0]?.totalCost || 0);

        // Subtract expenses
        const itemExpenses = await db
          .select({
            totalExpenses: sql<number>`SUM(${itemExpense.amount})`,
          })
          .from(itemExpense)
          .where(inArray(itemExpense.itemId, row.itemIds));

        profit -= Number(itemExpenses[0]?.totalExpenses || 0);

        result.profit = Math.round(profit * 100) / 100;
      }

      finalResults.push(result);
    }

    return finalResults;
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
    limit = 50,
    offset = 0,
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
    // Build where conditions based on filters
    const buildWhereConditions = () => {
      const conditions = [
        sql`${clientPayment.paidAt} >= ${startDate}`,
        sql`${clientPayment.paidAt} <= ${endDate}`,
      ];

      if (filters?.vendorIds?.length) {
        conditions.push(inArray(vendor.vendorId, filters.vendorIds));
      }
      if (filters?.clientIds?.length) {
        conditions.push(inArray(client.clientId, filters.clientIds));
      }
      if (filters?.brandIds?.length) {
        conditions.push(inArray(item.brandId, filters.brandIds));
      }
      if (filters?.categoryIds?.length) {
        conditions.push(inArray(item.categoryId, filters.categoryIds));
      }
      if (filters?.itemStatuses?.length) {
        conditions.push(inArray(item.status, filters.itemStatuses));
      }

      return and(...conditions);
    };

    // Get item revenue data with pagination
    const itemsData = await db
      .select({
        itemId: item.itemId,
        title: sql<string>`COALESCE(${item.title}, 'Unknown Item')`,
        brand: sql<string>`COALESCE(${brand.name}, ${item.brand}, 'Unknown Brand')`,
        model: sql<string>`COALESCE(${item.model}, '')`,
        vendor: sql<string>`COALESCE(${vendor.name}, 'Unknown Vendor')`,
        revenue: sql<number>`SUM(${clientPayment.amount})`,
        cost: sql<number>`COALESCE(${item.maxCost}, ${item.minCost}, 0)`,
        acquisitionDate: item.acquisitionDate,
        firstSaleDate: sql<string>`MIN(${clientPayment.paidAt})`,
      })
      .from(clientPayment)
      .innerJoin(item, eq(clientPayment.itemId, item.itemId))
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .innerJoin(client, eq(clientPayment.clientId, client.clientId))
      .leftJoin(brand, eq(item.brandId, brand.brandId))
      .leftJoin(category, eq(item.categoryId, category.categoryId))
      .where(buildWhereConditions())
      .groupBy(
        item.itemId,
        item.title,
        brand.name,
        item.brand,
        item.model,
        vendor.name,
        item.maxCost,
        item.minCost,
        item.acquisitionDate,
      )
      .orderBy(desc(sql<number>`SUM(${clientPayment.amount})`)) // Order by revenue
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const [countResult] = await db
      .select({
        totalCount: sql<number>`COUNT(DISTINCT ${item.itemId})`,
      })
      .from(clientPayment)
      .innerJoin(item, eq(clientPayment.itemId, item.itemId))
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .innerJoin(client, eq(clientPayment.clientId, client.clientId))
      .leftJoin(brand, eq(item.brandId, brand.brandId))
      .leftJoin(category, eq(item.categoryId, category.categoryId))
      .where(buildWhereConditions());

    // Get expenses for each item
    const itemIds = itemsData.map((item) => item.itemId);
    let expensesMap: Record<string, number> = {};

    if (itemIds.length > 0) {
      const expensesData = await db
        .select({
          itemId: itemExpense.itemId,
          totalExpenses: sql<number>`SUM(${itemExpense.amount})`,
        })
        .from(itemExpense)
        .where(inArray(itemExpense.itemId, itemIds))
        .groupBy(itemExpense.itemId);

      expensesMap = expensesData.reduce(
        (acc, expense) => {
          acc[expense.itemId] = Number(expense.totalExpenses || 0);
          return acc;
        },
        {} as Record<string, number>,
      );
    }

    const items = itemsData.map((item) => {
      const revenue = Number(item.revenue || 0);
      const cost = Number(item.cost || 0);
      const expenses = expensesMap[item.itemId] || 0;
      const totalCost = cost + expenses;
      const profit = revenue - totalCost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      // Calculate days to sell
      let daysToSell: number | undefined;
      if (item.acquisitionDate && item.firstSaleDate) {
        const acquisitionDate = new Date(item.acquisitionDate);
        const soldDate = new Date(item.firstSaleDate);
        daysToSell = Math.max(
          0,
          Math.floor(
            (soldDate.getTime() - acquisitionDate.getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        );
      }

      return {
        itemId: item.itemId,
        title: item.title,
        brand: item.brand,
        model: item.model,
        vendor: item.vendor,
        revenue: Math.round(revenue * 100) / 100,
        cost: Math.round(totalCost * 100) / 100,
        profit: Math.round(profit * 100) / 100,
        margin: Math.round(margin * 100) / 100,
        soldDate: item.firstSaleDate
          ? new Date(item.firstSaleDate).toISOString().split("T")[0]
          : undefined,
        acquisitionDate: item.acquisitionDate
          ? new Date(item.acquisitionDate).toISOString().split("T")[0]
          : undefined,
        daysToSell,
      };
    });

    return {
      items,
      totalCount: Number(countResult.totalCount || 0),
    };
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
    // Build where conditions based on filters
    const buildWhereConditions = () => {
      const conditions: any[] = [];

      if (filters?.vendorIds?.length) {
        conditions.push(inArray(vendor.vendorId, filters.vendorIds));
      }
      if (filters?.brandIds?.length) {
        conditions.push(inArray(item.brandId, filters.brandIds));
      }
      if (filters?.categoryIds?.length) {
        conditions.push(inArray(item.categoryId, filters.categoryIds));
      }

      return conditions.length > 0 ? and(...conditions) : undefined;
    };

    const whereConditions = buildWhereConditions();

    // Get overall inventory stats
    const [overallStats] = await db
      .select({
        totalItems: sql<number>`COUNT(*)`,
        inStoreItems: sql<number>`COUNT(CASE WHEN ${item.status} = 'in-store' THEN 1 END)`,
        reservedItems: sql<number>`COUNT(CASE WHEN ${item.status} = 'reserved' THEN 1 END)`,
        soldItems: sql<number>`COUNT(CASE WHEN ${item.status} = 'sold' THEN 1 END)`,
        partialPaidItems: sql<number>`COUNT(CASE WHEN ${item.status} = 'partial' THEN 1 END)`,
        totalValue: sql<number>`SUM(COALESCE(${item.maxSalesPrice}, ${item.minSalesPrice}, 0))`,
        avgDaysInInventory: sql<number>`AVG(CASE WHEN ${item.acquisitionDate} IS NOT NULL THEN DATE_PART('day', NOW() - ${item.acquisitionDate}::timestamp) ELSE NULL END)`,
      })
      .from(item)
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .leftJoin(brand, eq(item.brandId, brand.brandId))
      .leftJoin(category, eq(item.categoryId, category.categoryId))
      .where(whereConditions);

    // Get category breakdown
    const categoriesBreakdown = await db
      .select({
        categoryId: sql<string>`COALESCE(${category.categoryId}::text, 'unknown')`,
        categoryName: sql<string>`COALESCE(${category.name}, 'Unknown Category')`,
        itemCount: sql<number>`COUNT(*)`,
        totalValue: sql<number>`SUM(COALESCE(${item.maxSalesPrice}, ${item.minSalesPrice}, 0))`,
        avgAge: sql<number>`AVG(CASE WHEN ${item.acquisitionDate} IS NOT NULL THEN DATE_PART('day', NOW() - ${item.acquisitionDate}::timestamp) ELSE NULL END)`,
      })
      .from(item)
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .leftJoin(brand, eq(item.brandId, brand.brandId))
      .leftJoin(category, eq(item.categoryId, category.categoryId))
      .where(whereConditions)
      .groupBy(
        sql`COALESCE(${category.categoryId}::text, 'unknown')`,
        sql`COALESCE(${category.name}, 'Unknown Category')`,
      )
      .orderBy(desc(sql<number>`COUNT(*)`));

    // Get aging analysis
    const [agingStats] = await db
      .select({
        under30Days: sql<number>`COUNT(CASE WHEN ${item.acquisitionDate} IS NOT NULL AND DATE_PART('day', NOW() - ${item.acquisitionDate}::timestamp) < 30 THEN 1 END)`,
        days30To90: sql<number>`COUNT(CASE WHEN ${item.acquisitionDate} IS NOT NULL AND DATE_PART('day', NOW() - ${item.acquisitionDate}::timestamp) BETWEEN 30 AND 90 THEN 1 END)`,
        days90To180: sql<number>`COUNT(CASE WHEN ${item.acquisitionDate} IS NOT NULL AND DATE_PART('day', NOW() - ${item.acquisitionDate}::timestamp) BETWEEN 91 AND 180 THEN 1 END)`,
        over180Days: sql<number>`COUNT(CASE WHEN ${item.acquisitionDate} IS NOT NULL AND DATE_PART('day', NOW() - ${item.acquisitionDate}::timestamp) > 180 THEN 1 END)`,
      })
      .from(item)
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .leftJoin(brand, eq(item.brandId, brand.brandId))
      .leftJoin(category, eq(item.categoryId, category.categoryId))
      .where(whereConditions);

    return {
      totalItems: Number(overallStats.totalItems || 0),
      inStoreItems: Number(overallStats.inStoreItems || 0),
      reservedItems: Number(overallStats.reservedItems || 0),
      soldItems: Number(overallStats.soldItems || 0),
      partialPaidItems: Number(overallStats.partialPaidItems || 0),
      totalValue: Math.round(Number(overallStats.totalValue || 0) * 100) / 100,
      avgDaysInInventory:
        Math.round(Number(overallStats.avgDaysInInventory || 0) * 10) / 10,
      categoriesBreakdown: categoriesBreakdown.map((cat) => ({
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        itemCount: Number(cat.itemCount || 0),
        totalValue: Math.round(Number(cat.totalValue || 0) * 100) / 100,
        avgAge: Math.round(Number(cat.avgAge || 0) * 10) / 10,
      })),
      agingAnalysis: {
        under30Days: Number(agingStats.under30Days || 0),
        days30To90: Number(agingStats.days30To90 || 0),
        days90To180: Number(agingStats.days90To180 || 0),
        over180Days: Number(agingStats.over180Days || 0),
      },
    };
  }

  async getPaymentMethodBreakdown(
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
  > {
    // Build where conditions based on filters
    const buildWhereConditions = () => {
      const conditions = [
        sql`${clientPayment.paidAt} >= ${startDate}`,
        sql`${clientPayment.paidAt} <= ${endDate}`,
      ];

      if (filters?.vendorIds?.length) {
        conditions.push(inArray(vendor.vendorId, filters.vendorIds));
      }
      if (filters?.clientIds?.length) {
        conditions.push(inArray(client.clientId, filters.clientIds));
      }
      if (filters?.brandIds?.length) {
        conditions.push(inArray(item.brandId, filters.brandIds));
      }
      if (filters?.categoryIds?.length) {
        conditions.push(inArray(item.categoryId, filters.categoryIds));
      }

      return and(...conditions);
    };

    // Get total amount for percentage calculation
    const [totalStats] = await db
      .select({
        grandTotal: sql<number>`SUM(${clientPayment.amount})`,
      })
      .from(clientPayment)
      .innerJoin(item, eq(clientPayment.itemId, item.itemId))
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .innerJoin(client, eq(clientPayment.clientId, client.clientId))
      .leftJoin(brand, eq(item.brandId, brand.brandId))
      .leftJoin(category, eq(item.categoryId, category.categoryId))
      .where(buildWhereConditions());

    const grandTotal = Number(totalStats.grandTotal || 0);

    // Get payment method breakdown
    const results = await db
      .select({
        paymentMethod: clientPayment.paymentMethod,
        totalAmount: sql<number>`SUM(${clientPayment.amount})`,
        transactionCount: sql<number>`COUNT(*)`,
        avgTransactionAmount: sql<number>`AVG(${clientPayment.amount})`,
      })
      .from(clientPayment)
      .innerJoin(item, eq(clientPayment.itemId, item.itemId))
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .innerJoin(client, eq(clientPayment.clientId, client.clientId))
      .leftJoin(brand, eq(item.brandId, brand.brandId))
      .leftJoin(category, eq(item.categoryId, category.categoryId))
      .where(buildWhereConditions())
      .groupBy(clientPayment.paymentMethod)
      .orderBy(desc(sql<number>`SUM(${clientPayment.amount})`));

    return results.map((row) => {
      const totalAmount = Number(row.totalAmount || 0);
      const percentage = grandTotal > 0 ? (totalAmount / grandTotal) * 100 : 0;

      return {
        paymentMethod: row.paymentMethod || "Unknown",
        totalAmount: Math.round(totalAmount * 100) / 100,
        transactionCount: Number(row.transactionCount || 0),
        percentage: Math.round(percentage * 100) / 100,
        avgTransactionAmount:
          Math.round(Number(row.avgTransactionAmount || 0) * 100) / 100,
      };
    });
  }

  // Contract Template methods
  async getContractTemplates(): Promise<ContractTemplate[]> {
    return await db
      .select()
      .from(contractTemplate)
      .orderBy(desc(contractTemplate.createdAt));
  }

  async getContractTemplate(id: string): Promise<ContractTemplate | undefined> {
    const [result] = await db
      .select()
      .from(contractTemplate)
      .where(eq(contractTemplate.templateId, id));
    return result || undefined;
  }

  async createContractTemplate(
    insertTemplate: InsertContractTemplate,
  ): Promise<ContractTemplate> {
    // Use transaction to ensure only one template can be default
    const result = await db.transaction(async (tx) => {
      // If this template should be default, unset all other defaults first
      if (insertTemplate.isDefault) {
        await tx
          .update(contractTemplate)
          .set({ isDefault: false })
          .where(eq(contractTemplate.isDefault, true));
      }

      const [newTemplate] = await tx
        .insert(contractTemplate)
        .values(insertTemplate)
        .returning();
      return newTemplate;
    });

    return result;
  }

  async updateContractTemplate(
    id: string,
    updateTemplate: Partial<InsertContractTemplate>,
  ): Promise<ContractTemplate> {
    // Use transaction to ensure only one template can be default
    const result = await db.transaction(async (tx) => {
      // If setting this template as default, unset all other defaults first
      if (updateTemplate.isDefault) {
        await tx
          .update(contractTemplate)
          .set({ isDefault: false })
          .where(
            and(
              eq(contractTemplate.isDefault, true),
              sql`${contractTemplate.templateId} != ${id}`,
            ),
          );
      }

      const [updatedTemplate] = await tx
        .update(contractTemplate)
        .set(updateTemplate)
        .where(eq(contractTemplate.templateId, id))
        .returning();

      if (!updatedTemplate) {
        throw new Error("Contract template not found");
      }

      return updatedTemplate;
    });

    return result;
  }

  async deleteContractTemplate(id: string): Promise<void> {
    // Check if template is referenced by any contracts
    const [referencedContracts] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(contract)
      .where(eq(contract.templateId, id));

    if (Number(referencedContracts.count) > 0) {
      throw new Error(
        "Cannot delete contract template. It is referenced by existing contracts.",
      );
    }

    await db
      .delete(contractTemplate)
      .where(eq(contractTemplate.templateId, id));
  }

  async getDefaultContractTemplate(): Promise<ContractTemplate | undefined> {
    const [result] = await db
      .select()
      .from(contractTemplate)
      .where(eq(contractTemplate.isDefault, true));
    return result || undefined;
  }

  async ensureDefaultContractTemplate(): Promise<ContractTemplate> {
    // Check if default template already exists
    const existing = await this.getDefaultContractTemplate();
    if (existing) {
      return existing;
    }

    // Create comprehensive default contract template
    const defaultTemplate: InsertContractTemplate = {
      name: "Contrato de Consignación Estándar",
      description:
        "Plantilla estándar para contratos de consignación de artículos de lujo",
      termsText: `
CONTRATO DE CONSIGNACIÓN DE ARTÍCULOS DE LUJO

Entre: {{VENDOR_NAME}}
Dirección: {{VENDOR_ADDRESS}}
Teléfono: {{VENDOR_PHONE}}
Email: {{VENDOR_EMAIL}}
Identificación Fiscal: {{VENDOR_TAX_ID}}

Y: LUXETTE CONSIGNMENT
Dirección: [Dirección de la empresa]
Teléfono: [Teléfono de la empresa]
Email: [Email de la empresa]

ARTÍCULOS EN CONSIGNACIÓN:
{{ITEMS_TABLE}}

TÉRMINOS Y CONDICIONES:

1. CONSIGNACIÓN: El Consignador entrega los artículos listados arriba a LUXETTE CONSIGNMENT para su venta en consignación.

2. PRECIO DE VENTA: Los precios de venta se establecen de mutuo acuerdo y pueden ser ajustados con el consentimiento de ambas partes.

3. COMISIÓN: LUXETTE CONSIGNMENT retendrá una comisión del {{COMMISSION_PERCENTAGE}}% sobre el precio de venta final de cada artículo.

4. PAGO AL CONSIGNADOR: El pago se realizará dentro de {{PAYMENT_TERMS}} días después de la venta completa del artículo.

5. RESPONSABILIDAD: LUXETTE CONSIGNMENT se responsabiliza por el cuidado razonable de los artículos mientras estén en su posesión.

6. PERÍODO DE CONSIGNACIÓN: Los artículos permanecerán en consignación por un período de {{CONSIGNMENT_PERIOD}} meses, renovable por acuerdo mutuo.

7. RETIRO DE ARTÍCULOS: El Consignador puede retirar artículos no vendidos con {{WITHDRAWAL_NOTICE}} días de aviso previo.

8. CONDICIÓN DE LOS ARTÍCULOS: El Consignador garantiza que todos los artículos están en la condición declarada y son de su propiedad legítima.

9. AUTENTICIDAD: El Consignador garantiza la autenticidad de todos los artículos de marca y se responsabiliza por cualquier problema de autenticidad.

10. SEGURO: Los artículos están cubiertos por el seguro de LUXETTE CONSIGNMENT mientras estén en las instalaciones.

INFORMACIÓN BANCARIA DEL CONSIGNADOR:
Banco: {{VENDOR_BANK_NAME}}
Número de Cuenta: {{VENDOR_ACCOUNT_NUMBER}}
Tipo de Cuenta: {{VENDOR_ACCOUNT_TYPE}}

Fecha del Contrato: {{CONTRACT_DATE}}

___________________________                    ___________________________
{{VENDOR_NAME}}                                 LUXETTE CONSIGNMENT
Consignador                                     Representante Autorizado

Fecha: _______________                          Fecha: _______________
      `,
      variables: JSON.stringify([
        "VENDOR_NAME",
        "VENDOR_ADDRESS",
        "VENDOR_PHONE",
        "VENDOR_EMAIL",
        "VENDOR_TAX_ID",
        "VENDOR_BANK_NAME",
        "VENDOR_ACCOUNT_NUMBER",
        "VENDOR_ACCOUNT_TYPE",
        "ITEMS_TABLE",
        "COMMISSION_PERCENTAGE",
        "PAYMENT_TERMS",
        "CONSIGNMENT_PERIOD",
        "WITHDRAWAL_NOTICE",
        "CONTRACT_DATE",
      ]),
      isDefault: true,
    };

    return await this.createContractTemplate(defaultTemplate);
  }

  async setDefaultTemplate(id: string): Promise<ContractTemplate> {
    // Use transaction to ensure only one template can be default
    const result = await db.transaction(async (tx) => {
      // First, unset all other defaults
      await tx
        .update(contractTemplate)
        .set({ isDefault: false })
        .where(eq(contractTemplate.isDefault, true));

      // Then set the specified template as default
      const [updatedTemplate] = await tx
        .update(contractTemplate)
        .set({ isDefault: true })
        .where(eq(contractTemplate.templateId, id))
        .returning();

      if (!updatedTemplate) {
        throw new Error("Template not found");
      }

      return updatedTemplate;
    });

    return result;
  }

  // Contract methods
  async getContracts(): Promise<
    Array<Contract & { vendor: Vendor; template?: ContractTemplate }>
  > {
    const results = await db
      .select({
        // Contract fields
        contractId: contract.contractId,
        vendorId: contract.vendorId,
        templateId: contract.templateId,
        status: contract.status,
        termsText: contract.termsText,
        itemSnapshots: contract.itemSnapshots,
        pdfUrl: contract.pdfUrl,
        createdAt: contract.createdAt,
        // Vendor fields
        vendor: {
          vendorId: vendor.vendorId,
          name: vendor.name,
          phone: vendor.phone,
          email: vendor.email,
          taxId: vendor.taxId,
          bankAccountNumber: vendor.bankAccountNumber,
          bankName: vendor.bankName,
          accountType: vendor.accountType,
          createdAt: vendor.createdAt,
        },
        // Template fields (optional)
        template: {
          templateId: contractTemplate.templateId,
          name: contractTemplate.name,
          termsText: contractTemplate.termsText,
          isDefault: contractTemplate.isDefault,
          createdAt: contractTemplate.createdAt,
        },
      })
      .from(contract)
      .innerJoin(vendor, eq(contract.vendorId, vendor.vendorId))
      .leftJoin(
        contractTemplate,
        eq(contract.templateId, contractTemplate.templateId),
      )
      .orderBy(desc(contract.createdAt));

    return results.map((row) => ({
      contractId: row.contractId,
      vendorId: row.vendorId,
      templateId: row.templateId,
      status: row.status,
      termsText: row.termsText,
      itemSnapshots: row.itemSnapshots,
      pdfUrl: row.pdfUrl,
      createdAt: row.createdAt,
      vendor: row.vendor,
      template: row.template.templateId ? row.template : undefined,
    }));
  }

  async getContract(
    id: string,
  ): Promise<
    (Contract & { vendor: Vendor; template?: ContractTemplate }) | undefined
  > {
    const [result] = await db
      .select({
        // Contract fields
        contractId: contract.contractId,
        vendorId: contract.vendorId,
        templateId: contract.templateId,
        status: contract.status,
        termsText: contract.termsText,
        itemSnapshots: contract.itemSnapshots,
        pdfUrl: contract.pdfUrl,
        createdAt: contract.createdAt,
        // Vendor fields
        vendor: {
          vendorId: vendor.vendorId,
          name: vendor.name,
          phone: vendor.phone,
          email: vendor.email,
          taxId: vendor.taxId,
          bankAccountNumber: vendor.bankAccountNumber,
          bankName: vendor.bankName,
          accountType: vendor.accountType,
          createdAt: vendor.createdAt,
        },
        // Template fields (optional)
        template: {
          templateId: contractTemplate.templateId,
          name: contractTemplate.name,
          termsText: contractTemplate.termsText,
          isDefault: contractTemplate.isDefault,
          createdAt: contractTemplate.createdAt,
        },
      })
      .from(contract)
      .innerJoin(vendor, eq(contract.vendorId, vendor.vendorId))
      .leftJoin(
        contractTemplate,
        eq(contract.templateId, contractTemplate.templateId),
      )
      .where(eq(contract.contractId, id));

    if (!result) {
      return undefined;
    }

    return {
      contractId: result.contractId,
      vendorId: result.vendorId,
      templateId: result.templateId,
      status: result.status,
      termsText: result.termsText,
      itemSnapshots: result.itemSnapshots,
      pdfUrl: result.pdfUrl,
      createdAt: result.createdAt,
      vendor: result.vendor,
      template: result.template.templateId ? result.template : undefined,
    };
  }

  async getContractsByVendor(
    vendorId: string,
  ): Promise<
    Array<Contract & { vendor: Vendor; template?: ContractTemplate }>
  > {
    const results = await db
      .select({
        // Contract fields
        contractId: contract.contractId,
        vendorId: contract.vendorId,
        templateId: contract.templateId,
        status: contract.status,
        termsText: contract.termsText,
        itemSnapshots: contract.itemSnapshots,
        pdfUrl: contract.pdfUrl,
        createdAt: contract.createdAt,
        // Vendor fields
        vendor: {
          vendorId: vendor.vendorId,
          name: vendor.name,
          phone: vendor.phone,
          email: vendor.email,
          taxId: vendor.taxId,
          bankAccountNumber: vendor.bankAccountNumber,
          bankName: vendor.bankName,
          accountType: vendor.accountType,
          createdAt: vendor.createdAt,
        },
        // Template fields (optional)
        template: {
          templateId: contractTemplate.templateId,
          name: contractTemplate.name,
          termsText: contractTemplate.termsText,
          isDefault: contractTemplate.isDefault,
          createdAt: contractTemplate.createdAt,
        },
      })
      .from(contract)
      .innerJoin(vendor, eq(contract.vendorId, vendor.vendorId))
      .leftJoin(
        contractTemplate,
        eq(contract.templateId, contractTemplate.templateId),
      )
      .where(eq(contract.vendorId, vendorId))
      .orderBy(desc(contract.createdAt));

    return results.map((row) => ({
      contractId: row.contractId,
      vendorId: row.vendorId,
      templateId: row.templateId,
      status: row.status,
      termsText: row.termsText,
      itemSnapshots: row.itemSnapshots,
      pdfUrl: row.pdfUrl,
      createdAt: row.createdAt,
      vendor: row.vendor,
      template: row.template.templateId ? row.template : undefined,
    }));
  }

  async createContract(insertContract: InsertContract): Promise<Contract> {
    const [result] = await db
      .insert(contract)
      .values(insertContract)
      .returning();
    return result;
  }

  async updateContract(
    id: string,
    updateContract: Partial<InsertContract>,
  ): Promise<Contract> {
    const [result] = await db
      .update(contract)
      .set(updateContract)
      .where(eq(contract.contractId, id))
      .returning();
    if (!result) {
      throw new Error("Contract not found");
    }
    return result;
  }

  async deleteContract(id: string): Promise<void> {
    await db.delete(contract).where(eq(contract.contractId, id));
  }

  async finalizeContract(id: string, pdfUrl: string): Promise<Contract> {
    // First check that the contract exists and is in draft status
    const [existingContract] = await db
      .select()
      .from(contract)
      .where(eq(contract.contractId, id));

    if (!existingContract) {
      throw new Error("Contract not found");
    }

    if (existingContract.status !== "draft") {
      throw new Error("Only draft contracts can be finalized");
    }

    const [result] = await db
      .update(contract)
      .set({
        status: "final" as const,
        pdfUrl: pdfUrl,
      })
      .where(eq(contract.contractId, id))
      .returning();

    if (!result) {
      throw new Error("Failed to finalize contract");
    }

    return result;
  }

  // Business Intelligence API method implementations
  async getTotalSalesMonthToDate(): Promise<{ totalSales: number }> {
    // Get payments for items with status 'sold' made this month
    const [result] = await db
      .select({
        totalSales: sql<number>`COALESCE(SUM(${clientPayment.amount}), 0)`,
      })
      .from(clientPayment)
      .innerJoin(item, eq(item.itemId, clientPayment.itemId))
      .where(
        and(
          eq(item.status, "sold"),
          sql`${clientPayment.paidAt} >= DATE_TRUNC('month', CURRENT_DATE)`,
          sql`${clientPayment.paidAt} < CURRENT_DATE + INTERVAL '1 day'`
        )
      );

    return { totalSales: Number(result.totalSales) || 0 };
  }

  async getSumUpcomingPayments(): Promise<{ totalUpcomingPayments: number }> {
    const [result] = await db
      .select({
        totalUpcomingPayments: sql<number>`COALESCE(SUM(${installmentPlan.amount} - ${installmentPlan.paidAmount}), 0)`,
      })
      .from(installmentPlan)
      .where(
        and(
          eq(installmentPlan.status, "pending"),
          sql`${installmentPlan.dueDate} >= CURRENT_DATE`
        )
      );

    return { totalUpcomingPayments: Number(result.totalUpcomingPayments) || 0 };
  }

  async getSumReadyPayouts(): Promise<{ totalReadyPayouts: number }> {
    // Items that are fully paid but haven't been paid out yet
    const fullyPaidItems = await db
      .select({
        itemId: item.itemId,
        maxSalesPrice: item.maxSalesPrice,
        totalPaid: sql<number>`COALESCE(SUM(${clientPayment.amount}), 0)`,
        hasPayout: sql<number>`COUNT(${vendorPayout.payoutId})`,
      })
      .from(item)
      .leftJoin(clientPayment, eq(clientPayment.itemId, item.itemId))
      .leftJoin(vendorPayout, eq(vendorPayout.itemId, item.itemId))
      .where(isNotNull(item.maxSalesPrice))
      .groupBy(item.itemId, item.maxSalesPrice)
      .having(
        and(
          sql`COALESCE(SUM(${clientPayment.amount}), 0) >= COALESCE(CAST(${item.maxSalesPrice} AS NUMERIC), 0)`,
          sql`COUNT(${vendorPayout.payoutId}) = 0`
        )
      );

    let totalReadyPayouts = 0;
    for (const itemData of fullyPaidItems) {
      // Calculate vendor share (assuming 70% to vendor, 30% to house)
      const vendorShare = Number(itemData.maxSalesPrice || 0) * 0.7;
      totalReadyPayouts += vendorShare;
    }

    return { totalReadyPayouts };
  }

  async getSumUpcomingPayouts(): Promise<{ totalUpcomingPayouts: number }> {
    // Items with partial payments but not yet fully paid (future payouts when they become fully paid)
    const partiallyPaidItems = await db
      .select({
        itemId: item.itemId,
        maxSalesPrice: item.maxSalesPrice,
        totalPaid: sql<number>`COALESCE(SUM(${clientPayment.amount}), 0)`,
        hasPayout: sql<number>`COUNT(${vendorPayout.payoutId})`,
      })
      .from(item)
      .leftJoin(clientPayment, eq(clientPayment.itemId, item.itemId))
      .leftJoin(vendorPayout, eq(vendorPayout.itemId, item.itemId))
      .where(
        and(
          isNotNull(item.maxSalesPrice),
          sql`COALESCE(SUM(${clientPayment.amount}), 0) > 0`
        )
      )
      .groupBy(item.itemId, item.maxSalesPrice)
      .having(
        and(
          sql`COALESCE(SUM(${clientPayment.amount}), 0) < COALESCE(CAST(${item.maxSalesPrice} AS NUMERIC), 0)`,
          sql`COUNT(${vendorPayout.payoutId}) = 0`
        )
      );

    let totalUpcomingPayouts = 0;
    for (const itemData of partiallyPaidItems) {
      // Calculate vendor share (assuming 70% to vendor, 30% to house)
      const vendorShare = Number(itemData.maxSalesPrice || 0) * 0.7;
      totalUpcomingPayouts += vendorShare;
    }

    return { totalUpcomingPayouts };
  }

  async getInventoryCostRange(): Promise<{ min: number; max: number }> {
    const [result] = await db
      .select({
        min: sql<number>`COALESCE(SUM(CAST(${item.minCost} AS NUMERIC)), 0)`,
        max: sql<number>`COALESCE(SUM(CAST(${item.maxCost} AS NUMERIC)), 0)`,
      })
      .from(item)
      .where(eq(item.status, "in-store"));

    return {
      min: Number(result.min) || 0,
      max: Number(result.max) || 0,
    };
  }

  async getInventoryMarketPriceRange(): Promise<{ min: number; max: number }> {
    const [result] = await db
      .select({
        min: sql<number>`COALESCE(SUM(CAST(${item.minSalesPrice} AS NUMERIC)), 0)`,
        max: sql<number>`COALESCE(SUM(CAST(${item.maxSalesPrice} AS NUMERIC)), 0)`,
      })
      .from(item)
      .where(eq(item.status, "in-store"));

    return {
      min: Number(result.min) || 0,
      max: Number(result.max) || 0,
    };
  }
}

export const storage = new DatabaseStorage();
