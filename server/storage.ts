import { 
  vendor, client, item, clientPayment, vendorPayout, itemExpense, installmentPlan, users, brand, category, paymentMethod,
  type Vendor, type Client, type Item, type ClientPayment, type VendorPayout, type ItemExpense, type InstallmentPlan, type User, type Brand, type Category, type PaymentMethod,
  type InsertVendor, type InsertClient, type InsertItem, type InsertClientPayment, type InsertVendorPayout, type InsertItemExpense, type InsertInstallmentPlan, type InsertUser, type InsertBrand, type InsertCategory, type InsertPaymentMethod
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sum, count, sql, and, isNull, isNotNull } from "drizzle-orm";

// Helper functions for type conversion to match Drizzle's expected types
function toDbNumeric(v?: number | string | null): string {
  if (v == null) return '0';
  return typeof v === 'string' ? v : v.toFixed(2);
}

function toDbNumericOptional(v?: number | string | null): string | null {
  if (v == null) return null;
  return typeof v === 'string' ? v : v.toFixed(2);
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
  // Legacy user methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category>;
  deleteCategory(id: string): Promise<void>;
  
  // Payment Method methods
  getPaymentMethods(): Promise<PaymentMethod[]>;
  getPaymentMethod(id: string): Promise<PaymentMethod | undefined>;
  createPaymentMethod(paymentMethod: InsertPaymentMethod): Promise<PaymentMethod>;
  updatePaymentMethod(id: string, paymentMethod: Partial<InsertPaymentMethod>): Promise<PaymentMethod>;
  deletePaymentMethod(id: string): Promise<void>;
  
  // Item methods
  getItems(): Promise<Array<Item & { vendor: Vendor }>>;
  getItem(id: string): Promise<(Item & { vendor: Vendor }) | undefined>;
  createItem(item: InsertItem): Promise<Item>;
  updateItem(id: string, item: Partial<InsertItem>): Promise<Item>;
  deleteItem(id: string): Promise<void>;
  
  // Payment methods
  getPayments(): Promise<Array<ClientPayment & { item: Item & { vendor: Vendor }, client: Client }>>;
  getPaymentsByItem(itemId: string): Promise<Array<ClientPayment & { client: Client }>>;
  createPayment(payment: InsertClientPayment): Promise<ClientPayment>;
  updatePayment(id: string, payment: Partial<InsertClientPayment>): Promise<ClientPayment>;
  deletePayment(id: string): Promise<void>;
  
  // Payout methods
  getPayouts(): Promise<Array<VendorPayout & { item: Item, vendor: Vendor }>>;
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
  getRecentPayouts(limit?: number): Promise<Array<VendorPayout & { item: Item, vendor: Vendor }>>;
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
  
  // Expense methods
  getExpenses(): Promise<Array<ItemExpense & { item: Item }>>;
  getExpensesByItem(itemId: string): Promise<ItemExpense[]>;
  createExpense(expense: InsertItemExpense): Promise<ItemExpense>;
  
  // Installment plan methods
  getInstallmentPlans(): Promise<Array<InstallmentPlan & { item: Item & { vendor: Vendor }, client: Client }>>;
  getInstallmentPlansByItem(itemId: string): Promise<Array<InstallmentPlan & { client: Client }>>;
  getInstallmentPlansByClient(clientId: string): Promise<Array<InstallmentPlan & { item: Item & { vendor: Vendor } }>>;
  createInstallmentPlan(plan: InsertInstallmentPlan): Promise<InstallmentPlan>;
  updateInstallmentPlan(id: string, plan: Partial<InsertInstallmentPlan>): Promise<InstallmentPlan>;
  deleteInstallmentPlan(id: string): Promise<void>;
  
  // Dashboard methods
  getDashboardMetrics(): Promise<{
    totalRevenue: number;
    activeItems: number;
    pendingPayouts: { min: number; max: number };
    netProfit: { min: number; max: number };
  }>;
  
  getRecentItems(limit?: number): Promise<Array<Item & { vendor: Vendor }>>;
  getTopPerformingItems(limit?: number): Promise<Array<Item & { vendor: Vendor, profit: number }>>;
  
  // Payment metrics methods
  getPaymentMetrics(): Promise<{
    totalPaymentsReceived: number;
    totalPaymentsAmount: number;
    overduePayments: number;
    upcomingPayments: number;
    averagePaymentAmount: number;
    monthlyPaymentTrend: number;
  }>;
  
  getUpcomingPayments(limit?: number): Promise<Array<InstallmentPlan & { item: Item & { vendor: Vendor }, client: Client }>>;
  getRecentPayments(limit?: number): Promise<Array<ClientPayment & { item: Item & { vendor: Vendor }, client: Client }>>;
  getOverduePayments(): Promise<Array<InstallmentPlan & { item: Item & { vendor: Vendor }, client: Client }>>;
  
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
}

export class DatabaseStorage implements IStorage {
  // Legacy user methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Vendor methods
  async getVendors(): Promise<Vendor[]> {
    return await db.select().from(vendor).orderBy(desc(vendor.createdAt));
  }

  async getVendor(id: string): Promise<Vendor | undefined> {
    const [result] = await db.select().from(vendor).where(eq(vendor.vendorId, id));
    return result || undefined;
  }

  async createVendor(insertVendor: InsertVendor): Promise<Vendor> {
    const [result] = await db.insert(vendor).values(insertVendor).returning();
    return result;
  }

  async updateVendor(id: string, updateVendor: Partial<InsertVendor>): Promise<Vendor> {
    const [result] = await db.update(vendor).set(updateVendor).where(eq(vendor.vendorId, id)).returning();
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
    const [result] = await db.select().from(client).where(eq(client.clientId, id));
    return result || undefined;
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const [result] = await db.insert(client).values(insertClient).returning();
    return result;
  }

  async updateClient(id: string, updateClient: Partial<InsertClient>): Promise<Client> {
    const [result] = await db.update(client).set(updateClient).where(eq(client.clientId, id)).returning();
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

  async updateBrand(id: string, updateBrand: Partial<InsertBrand>): Promise<Brand> {
    const [result] = await db.update(brand).set(updateBrand).where(eq(brand.brandId, id)).returning();
    if (!result) {
      throw new Error("Brand not found");
    }
    return result;
  }

  async deleteBrand(id: string): Promise<void> {
    // Check if brand is referenced by any items
    const [referencedItems] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(item)
      .where(eq(item.brandId, id));
    
    if (Number(referencedItems.count) > 0) {
      throw new Error("Cannot delete brand. It is referenced by existing items.");
    }
    
    await db.delete(brand).where(eq(brand.brandId, id));
  }

  // Category methods
  async getCategories(): Promise<Category[]> {
    return await db.select().from(category).orderBy(desc(category.createdAt));
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const [result] = await db.select().from(category).where(eq(category.categoryId, id));
    return result || undefined;
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const [result] = await db.insert(category).values(insertCategory).returning();
    return result;
  }

  async updateCategory(id: string, updateCategory: Partial<InsertCategory>): Promise<Category> {
    const [result] = await db.update(category).set(updateCategory).where(eq(category.categoryId, id)).returning();
    if (!result) {
      throw new Error("Category not found");
    }
    return result;
  }

  async deleteCategory(id: string): Promise<void> {
    // Check if category is referenced by any items
    const [referencedItems] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(item)
      .where(eq(item.categoryId, id));
    
    if (Number(referencedItems.count) > 0) {
      throw new Error("Cannot delete category. It is referenced by existing items.");
    }
    
    await db.delete(category).where(eq(category.categoryId, id));
  }

  // Payment Method methods
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    return await db.select().from(paymentMethod).orderBy(desc(paymentMethod.createdAt));
  }

  async getPaymentMethod(id: string): Promise<PaymentMethod | undefined> {
    const [result] = await db.select().from(paymentMethod).where(eq(paymentMethod.paymentMethodId, id));
    return result || undefined;
  }

  async createPaymentMethod(insertPaymentMethod: InsertPaymentMethod): Promise<PaymentMethod> {
    const [result] = await db.insert(paymentMethod).values(insertPaymentMethod).returning();
    return result;
  }

  async updatePaymentMethod(id: string, updatePaymentMethod: Partial<InsertPaymentMethod>): Promise<PaymentMethod> {
    const [result] = await db.update(paymentMethod).set(updatePaymentMethod).where(eq(paymentMethod.paymentMethodId, id)).returning();
    if (!result) {
      throw new Error("Payment method not found");
    }
    return result;
  }

  async deletePaymentMethod(id: string): Promise<void> {
    // Check if payment method is referenced by any client payments
    const [referencedPayments] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(clientPayment)
      .where(eq(clientPayment.paymentMethod, id));
    
    if (Number(referencedPayments.count) > 0) {
      throw new Error("Cannot delete payment method. It is referenced by existing payments.");
    }
    
    await db.delete(paymentMethod).where(eq(paymentMethod.paymentMethodId, id));
  }

  // Item methods
  async getItems(): Promise<Array<Item & { vendor: Vendor }>> {
    return await db.select().from(item)
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .orderBy(desc(item.createdAt))
      .then(results => results.map(row => ({
        ...row.item,
        vendor: row.vendor
      })));
  }

  async getItem(id: string): Promise<(Item & { vendor: Vendor }) | undefined> {
    const [result] = await db.select().from(item)
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
      acquisitionDate: toDbDateOptional(insertItem.acquisitionDate)
    };
    const [result] = await db.insert(item).values(payload).returning();
    return result;
  }

  async updateItem(id: string, updateItem: Partial<InsertItem>): Promise<Item> {
    const payload: Partial<typeof item.$inferInsert> = {};
    // Only set fields that are defined and convert types
    if (updateItem.vendorId !== undefined) payload.vendorId = updateItem.vendorId;
    if (updateItem.brandId !== undefined) payload.brandId = updateItem.brandId;
    if (updateItem.categoryId !== undefined) payload.categoryId = updateItem.categoryId;
    if (updateItem.title !== undefined) payload.title = updateItem.title;
    if (updateItem.model !== undefined) payload.model = updateItem.model;
    if (updateItem.serialNo !== undefined) payload.serialNo = updateItem.serialNo;
    if (updateItem.condition !== undefined) payload.condition = updateItem.condition;
    if (updateItem.status !== undefined) payload.status = updateItem.status;
    if (updateItem.minCost !== undefined) payload.minCost = toDbNumericOptional(updateItem.minCost);
    if (updateItem.maxCost !== undefined) payload.maxCost = toDbNumericOptional(updateItem.maxCost);
    if (updateItem.minSalesPrice !== undefined) payload.minSalesPrice = toDbNumericOptional(updateItem.minSalesPrice);
    if (updateItem.maxSalesPrice !== undefined) payload.maxSalesPrice = toDbNumericOptional(updateItem.maxSalesPrice);
    if (updateItem.acquisitionDate !== undefined) payload.acquisitionDate = toDbDateOptional(updateItem.acquisitionDate);
    
    const [result] = await db.update(item).set(payload).where(eq(item.itemId, id)).returning();
    if (!result) {
      throw new Error("Item not found");
    }
    return result;
  }

  async deleteItem(id: string): Promise<void> {
    await db.delete(item).where(eq(item.itemId, id));
  }

  // Payment methods
  async getPayments(): Promise<Array<ClientPayment & { item: Item & { vendor: Vendor }, client: Client }>> {
    return await db.select().from(clientPayment)
      .innerJoin(item, eq(clientPayment.itemId, item.itemId))
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .innerJoin(client, eq(clientPayment.clientId, client.clientId))
      .orderBy(desc(clientPayment.paidAt))
      .then(results => results.map(row => ({
        ...row.client_payment,
        item: { ...row.item, vendor: row.vendor },
        client: row.client
      })));
  }

  async getPaymentsByItem(itemId: string): Promise<Array<ClientPayment & { client: Client }>> {
    return await db.select().from(clientPayment)
      .innerJoin(client, eq(clientPayment.clientId, client.clientId))
      .where(eq(clientPayment.itemId, itemId))
      .orderBy(desc(clientPayment.paidAt))
      .then(results => results.map(row => ({
        ...row.client_payment,
        client: row.client
      })));
  }

  async createPayment(insertPayment: InsertClientPayment): Promise<ClientPayment> {
    const payload: typeof clientPayment.$inferInsert = {
      ...insertPayment,
      amount: toDbNumeric(insertPayment.amount!),
      paidAt: toDbTimestamp(insertPayment.paidAt!)
    };
    const [result] = await db.insert(clientPayment).values(payload).returning();
    
    // Check if item is fully paid and update status
    const payments = await db.select({ amount: clientPayment.amount })
      .from(clientPayment)
      .where(eq(clientPayment.itemId, insertPayment.itemId));
    
    const itemData = await db.select({ maxSalesPrice: item.maxSalesPrice })
      .from(item)
      .where(eq(item.itemId, insertPayment.itemId));
    
    if (payments.length > 0 && itemData.length > 0) {
      const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const listPrice = Number(itemData[0].maxSalesPrice);
      
      if (totalPaid >= listPrice) {
        await db.update(item).set({ status: 'sold' }).where(eq(item.itemId, insertPayment.itemId));
      }
    }
    
    return result;
  }

  async updatePayment(id: string, updatePayment: Partial<InsertClientPayment>): Promise<ClientPayment> {
    const payload: Partial<typeof clientPayment.$inferInsert> = {};
    if (updatePayment.clientId !== undefined) payload.clientId = updatePayment.clientId;
    if (updatePayment.itemId !== undefined) payload.itemId = updatePayment.itemId;
    if (updatePayment.paymentMethod !== undefined) payload.paymentMethod = updatePayment.paymentMethod;
    if (updatePayment.amount !== undefined) payload.amount = toDbNumeric(updatePayment.amount);
    if (updatePayment.paidAt !== undefined) payload.paidAt = toDbTimestamp(updatePayment.paidAt);
    
    const [result] = await db.update(clientPayment)
      .set(payload)
      .where(eq(clientPayment.paymentId, id))
      .returning();
    
    if (!result) {
      throw new Error("Payment not found");
    }
    
    // If amount was updated, recalculate item payment status
    if (updatePayment.amount !== undefined) {
      const payments = await db.select({ amount: clientPayment.amount })
        .from(clientPayment)
        .where(eq(clientPayment.itemId, result.itemId));
      
      const itemData = await db.select({ maxSalesPrice: item.maxSalesPrice })
        .from(item)
        .where(eq(item.itemId, result.itemId));
      
      if (payments.length > 0 && itemData.length > 0) {
        const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const listPrice = Number(itemData[0].maxSalesPrice);
        
        // Update item status based on payment completeness
        if (totalPaid >= listPrice) {
          await db.update(item).set({ status: 'sold' }).where(eq(item.itemId, result.itemId));
        } else {
          await db.update(item).set({ status: 'partial' }).where(eq(item.itemId, result.itemId));
        }
      }
    }
    
    return result;
  }

  async deletePayment(id: string): Promise<void> {
    // First get the payment info to know which item to update
    const paymentToDelete = await db.select({ itemId: clientPayment.itemId })
      .from(clientPayment)
      .where(eq(clientPayment.paymentId, id));
    
    if (!paymentToDelete.length) {
      throw new Error("Payment not found");
    }
    
    const itemId = paymentToDelete[0].itemId;
    
    // Delete the payment
    await db.delete(clientPayment).where(eq(clientPayment.paymentId, id));
    
    // Recalculate item payment status after deletion
    const remainingPayments = await db.select({ amount: clientPayment.amount })
      .from(clientPayment)
      .where(eq(clientPayment.itemId, itemId));
    
    const itemData = await db.select({ maxSalesPrice: item.maxSalesPrice })
      .from(item)
      .where(eq(item.itemId, itemId));
    
    if (itemData.length > 0) {
      const totalPaid = remainingPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const listPrice = Number(itemData[0].maxSalesPrice);
      
      // Update item status based on remaining payments
      if (totalPaid >= listPrice) {
        await db.update(item).set({ status: 'sold' }).where(eq(item.itemId, itemId));
      } else if (totalPaid > 0) {
        await db.update(item).set({ status: 'partial' }).where(eq(item.itemId, itemId));
      } else {
        await db.update(item).set({ status: 'available' }).where(eq(item.itemId, itemId));
      }
    }
  }

  // Payout methods
  async getPayouts(): Promise<Array<VendorPayout & { item: Item, vendor: Vendor }>> {
    return await db.select().from(vendorPayout)
      .innerJoin(item, eq(vendorPayout.itemId, item.itemId))
      .innerJoin(vendor, eq(vendorPayout.vendorId, vendor.vendorId))
      .orderBy(desc(vendorPayout.paidAt))
      .then(results => results.map(row => ({
        ...row.vendor_payout,
        item: row.item,
        vendor: row.vendor
      })));
  }

  async getPendingPayouts(): Promise<Array<Item & { vendor: Vendor }>> {
    const soldItems = await db.select().from(item)
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .where(eq(item.status, 'sold'))
      .then(results => results.map(row => ({
        ...row.item,
        vendor: row.vendor
      })));
    
    const paidItemIds = await db.select({ itemId: vendorPayout.itemId })
      .from(vendorPayout)
      .then(results => results.map(row => row.itemId));
    
    return soldItems.filter(item => !paidItemIds.includes(item.itemId));
  }

  async createPayout(insertPayout: InsertVendorPayout): Promise<VendorPayout> {
    const payload: typeof vendorPayout.$inferInsert = {
      ...insertPayout,
      amount: toDbNumeric(insertPayout.amount!),
      paidAt: toDbTimestamp(insertPayout.paidAt!)
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
        totalPayoutsAmount: sql<number>`COALESCE(SUM(${vendorPayout.amount}), 0)`
      })
      .from(vendorPayout);

    // Get pending payouts (items fully paid but not yet paid out)
    const [pendingData] = await db
      .select({
        pendingPayouts: sql<number>`COUNT(DISTINCT ${item.itemId})`
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
          isNull(vendorPayout.payoutId)
        )
      );

    // Get upcoming payouts (items with partial payments)
    const [upcomingData] = await db
      .select({
        upcomingPayouts: sql<number>`COUNT(DISTINCT ${item.itemId})`
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
          isNull(vendorPayout.payoutId)
        )
      );

    // Calculate average payout amount
    const averagePayoutAmount = payoutData.totalPayoutsPaid > 0 
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
      monthlyPayoutTrend
    };
  }

  async getRecentPayouts(limit = 10): Promise<Array<VendorPayout & { item: Item, vendor: Vendor }>> {
    const results = await db
      .select()
      .from(vendorPayout)
      .innerJoin(item, eq(item.itemId, vendorPayout.itemId))
      .innerJoin(vendor, eq(vendor.vendorId, item.vendorId))
      .orderBy(desc(vendorPayout.paidAt))
      .limit(limit);
    
    return results.map(result => ({
      ...result.vendor_payout,
      item: result.item,
      vendor: result.vendor
    }));
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
        vendor: vendor
      })
      .from(item)
      .innerJoin(vendor, eq(vendor.vendorId, item.vendorId))
      .leftJoin(clientPayment, eq(clientPayment.itemId, item.itemId))
      .leftJoin(vendorPayout, eq(vendorPayout.itemId, item.itemId))
      .where(
        and(
          isNull(vendorPayout.payoutId),
          isNotNull(clientPayment.paymentId) // Only show items with payments
        )
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
        const salesPrice = parseFloat(result.maxSalesPrice || '0');
        const vendorPayoutAmount = parseFloat(result.maxCost || '0');
        const remainingBalance = salesPrice - totalPaid;
        const paymentProgress = salesPrice > 0 ? (totalPaid / salesPrice) * 100 : 0;
        const isFullyPaid = totalPaid >= salesPrice;

        // Determine the expected last payment date
        let expectedLastPaymentDate = result.lastPaymentDate;
        if (installmentPlans.length > 0) {
          // If there are installment plans, use the latest due date
          expectedLastPaymentDate = installmentPlans[0].dueDate;
        }

        return {
          itemId: result.itemId,
          title: result.title || '',
          brand: result.brand || '',
          model: result.model || '',
          minSalesPrice: parseFloat(result.minSalesPrice || '0'),
          maxSalesPrice: parseFloat(result.maxSalesPrice || '0'),
          salePrice: salesPrice,
          minCost: parseFloat(result.minCost || '0'),
          maxCost: parseFloat(result.maxCost || '0'),
          totalPaid,
          remainingBalance: Math.max(0, remainingBalance),
          paymentProgress: Math.min(100, paymentProgress),
          isFullyPaid,
          fullyPaidAt: isFullyPaid ? new Date().toISOString() : undefined,
          firstPaymentDate: result.firstPaymentDate,
          lastPaymentDate: expectedLastPaymentDate,
          vendor: result.vendor
        };
      })
    );

    return itemsWithInstallments;
  }

  // Expense methods
  async getExpenses(): Promise<Array<ItemExpense & { item: Item }>> {
    return await db.select().from(itemExpense)
      .innerJoin(item, eq(itemExpense.itemId, item.itemId))
      .orderBy(desc(itemExpense.incurredAt))
      .then(results => results.map(row => ({
        ...row.item_expense,
        item: row.item
      })));
  }

  async getExpensesByItem(itemId: string): Promise<ItemExpense[]> {
    return await db.select().from(itemExpense)
      .where(eq(itemExpense.itemId, itemId))
      .orderBy(desc(itemExpense.incurredAt));
  }

  async createExpense(insertExpense: InsertItemExpense): Promise<ItemExpense> {
    const payload: typeof itemExpense.$inferInsert = {
      ...insertExpense,
      amount: toDbNumeric(insertExpense.amount!),
      incurredAt: toDbTimestamp(insertExpense.incurredAt!)
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
  }> {
    const [revenueResult] = await db.select({ 
      total: sum(clientPayment.amount) 
    }).from(clientPayment);
    
    const [itemsResult] = await db.select({ 
      count: count() 
    }).from(item).where(sql`${item.status} IN ('in-store', 'reserved')`);
    
    const pendingPayouts = await this.getPendingPayouts();
    
    // Calculate min/max pending payouts using cost ranges
    const pendingPayoutsMin = pendingPayouts.reduce((sum, item) => 
      sum + Number(item.minCost || item.maxCost || 0), 0);
    const pendingPayoutsMax = pendingPayouts.reduce((sum, item) => 
      sum + Number(item.maxCost || item.minCost || 0), 0);
    
    const [expensesResult] = await db.select({ 
      total: sum(itemExpense.amount) 
    }).from(itemExpense);
    
    const totalRevenue = Number(revenueResult.total || 0);
    const totalExpenses = Number(expensesResult.total || 0);
    
    // Calculate net profit ranges
    const netProfitMin = totalRevenue - totalExpenses - pendingPayoutsMax;
    const netProfitMax = totalRevenue - totalExpenses - pendingPayoutsMin;

    return {
      totalRevenue,
      activeItems: itemsResult.count,
      pendingPayouts: { min: pendingPayoutsMin, max: pendingPayoutsMax },
      netProfit: { min: netProfitMin, max: netProfitMax }
    };
  }

  async getRecentItems(limit = 10): Promise<Array<Item & { vendor: Vendor }>> {
    return await db.select().from(item)
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .orderBy(desc(item.createdAt))
      .limit(limit)
      .then(results => results.map(row => ({
        ...row.item,
        vendor: row.vendor
      })));
  }

  async getTopPerformingItems(limit = 5): Promise<Array<Item & { vendor: Vendor, profit: number }>> {
    const soldItems = await db.select().from(item)
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .where(eq(item.status, 'sold'))
      .then(results => results.map(row => ({
        ...row.item,
        vendor: row.vendor
      })));

    const itemsWithProfit = await Promise.all(
      soldItems.map(async (item) => {
        const payments = await db.select({ amount: clientPayment.amount })
          .from(clientPayment)
          .where(eq(clientPayment.itemId, item.itemId));
        
        const expenses = await db.select({ amount: itemExpense.amount })
          .from(itemExpense)
          .where(eq(itemExpense.itemId, item.itemId));
        
        const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
        const profit = totalPayments - Number(item.maxCost || 0) - totalExpenses;
        
        return { ...item, profit };
      })
    );

    return itemsWithProfit
      .sort((a, b) => b.profit - a.profit)
      .slice(0, limit);
  }

  async getInstallmentPlans(): Promise<Array<InstallmentPlan & { item: Item & { vendor: Vendor }, client: Client }>> {
    return await db
      .select()
      .from(installmentPlan)
      .innerJoin(item, eq(installmentPlan.itemId, item.itemId))
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .innerJoin(client, eq(installmentPlan.clientId, client.clientId))
      .orderBy(desc(installmentPlan.dueDate))
      .then(rows => rows.map(row => ({
        ...row.installment_plan,
        item: { ...row.item, vendor: row.vendor },
        client: row.client
      })));
  }

  async getInstallmentPlansByItem(itemId: string): Promise<Array<InstallmentPlan & { client: Client }>> {
    return await db
      .select()
      .from(installmentPlan)
      .innerJoin(client, eq(installmentPlan.clientId, client.clientId))
      .where(eq(installmentPlan.itemId, itemId))
      .orderBy(installmentPlan.dueDate)
      .then(rows => rows.map(row => ({
        ...row.installment_plan,
        client: row.client
      })));
  }

  async getInstallmentPlansByClient(clientId: string): Promise<Array<InstallmentPlan & { item: Item & { vendor: Vendor } }>> {
    return await db
      .select()
      .from(installmentPlan)
      .innerJoin(item, eq(installmentPlan.itemId, item.itemId))
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .where(eq(installmentPlan.clientId, clientId))
      .orderBy(installmentPlan.dueDate)
      .then(rows => rows.map(row => ({
        ...row.installment_plan,
        item: { ...row.item, vendor: row.vendor }
      })));
  }

  async createInstallmentPlan(insertPlan: InsertInstallmentPlan): Promise<InstallmentPlan> {
    const payload: typeof installmentPlan.$inferInsert = {
      ...insertPlan,
      amount: toDbNumeric(insertPlan.amount!),
      dueDate: toDbDate(insertPlan.dueDate!)
    };
    const [plan] = await db
      .insert(installmentPlan)
      .values(payload)
      .returning();
    return plan;
  }

  async updateInstallmentPlan(id: string, updatePlan: Partial<InsertInstallmentPlan>): Promise<InstallmentPlan> {
    const payload: Partial<typeof installmentPlan.$inferInsert> = {};
    if (updatePlan.clientId !== undefined) payload.clientId = updatePlan.clientId;
    if (updatePlan.itemId !== undefined) payload.itemId = updatePlan.itemId;
    if (updatePlan.amount !== undefined) payload.amount = toDbNumeric(updatePlan.amount);
    if (updatePlan.dueDate !== undefined) payload.dueDate = toDbDate(updatePlan.dueDate);
    
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
    const today = new Date().toISOString().split('T')[0];
    const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const [paymentsData, installmentsData] = await Promise.all([
      db
        .select({
          totalCount: count(),
          totalAmount: sum(clientPayment.amount),
          avgAmount: sql<number>`AVG(${clientPayment.amount})`,
          recentCount: sql<number>`COUNT(CASE WHEN ${clientPayment.paidAt} >= ${lastMonth} THEN 1 END)`
        })
        .from(clientPayment),
      db
        .select({
          overdueCount: sql<number>`COUNT(CASE WHEN ${installmentPlan.dueDate} < ${today} AND ${installmentPlan.status} = 'pending' THEN 1 END)`,
          upcomingCount: sql<number>`COUNT(CASE WHEN ${installmentPlan.dueDate} >= ${today} AND ${installmentPlan.status} = 'pending' THEN 1 END)`
        })
        .from(installmentPlan)
    ]);

    const payments = paymentsData[0];
    const installments = installmentsData[0];
    
    const monthlyTrend = payments.recentCount > 0 ? 
      ((payments.recentCount / Math.max(payments.totalCount - payments.recentCount, 1)) * 100) : 0;

    return {
      totalPaymentsReceived: payments.totalCount || 0,
      totalPaymentsAmount: Number(payments.totalAmount) || 0,
      overduePayments: installments.overdueCount || 0,
      upcomingPayments: installments.upcomingCount || 0,
      averagePaymentAmount: Number(payments.avgAmount) || 0,
      monthlyPaymentTrend: monthlyTrend
    };
  }

  async getUpcomingPayments(limit = 10): Promise<Array<InstallmentPlan & { item: Item & { vendor: Vendor }, client: Client }>> {
    const today = new Date().toISOString().split('T')[0];
    return await db
      .select()
      .from(installmentPlan)
      .innerJoin(item, eq(installmentPlan.itemId, item.itemId))
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .innerJoin(client, eq(installmentPlan.clientId, client.clientId))
      .where(eq(installmentPlan.status, 'pending'))
      .orderBy(installmentPlan.dueDate)
      .limit(limit)
      .then(rows => rows.map(row => ({
        ...row.installment_plan,
        item: { ...row.item, vendor: row.vendor },
        client: row.client
      })));
  }

  async getRecentPayments(limit = 10): Promise<Array<ClientPayment & { item: Item & { vendor: Vendor }, client: Client }>> {
    return await db
      .select()
      .from(clientPayment)
      .innerJoin(item, eq(clientPayment.itemId, item.itemId))
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .innerJoin(client, eq(clientPayment.clientId, client.clientId))
      .orderBy(desc(clientPayment.paidAt))
      .limit(limit)
      .then(rows => rows.map(row => ({
        ...row.client_payment,
        item: { ...row.item, vendor: row.vendor },
        client: row.client
      })));
  }

  async getOverduePayments(): Promise<Array<InstallmentPlan & { item: Item & { vendor: Vendor }, client: Client }>> {
    const today = new Date().toISOString().split('T')[0];
    return await db
      .select()
      .from(installmentPlan)
      .innerJoin(item, eq(installmentPlan.itemId, item.itemId))
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .innerJoin(client, eq(installmentPlan.clientId, client.clientId))
      .where(sql`${installmentPlan.dueDate} < ${today} AND ${installmentPlan.status} = 'pending'`)
      .orderBy(installmentPlan.dueDate)
      .then(rows => rows.map(row => ({
        ...row.installment_plan,
        item: { ...row.item, vendor: row.vendor },
        client: row.client
      })));
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
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Calculate payment timeliness (40% weight)
    const [paymentTimeliness] = await db
      .select({
        onTimePayments: sql<number>`COUNT(CASE WHEN ${installmentPlan.status} = 'paid' THEN 1 END)`,
        overduePayments: sql<number>`COUNT(CASE WHEN ${installmentPlan.dueDate} < ${today} AND ${installmentPlan.status} = 'pending' THEN 1 END)`,
        totalPayments: count()
      })
      .from(installmentPlan);

    const timelinessScore = paymentTimeliness.totalPayments > 0 ? 
      ((paymentTimeliness.onTimePayments / paymentTimeliness.totalPayments) * 100) : 100;

    // Calculate cash flow (25% weight)
    const [revenueData] = await db
      .select({
        currentMonthRevenue: sql<number>`SUM(CASE WHEN ${clientPayment.paidAt} >= ${thirtyDaysAgo} THEN ${clientPayment.amount} ELSE 0 END)`,
        previousMonthRevenue: sql<number>`SUM(CASE WHEN ${clientPayment.paidAt} >= ${sixtyDaysAgo} AND ${clientPayment.paidAt} < ${thirtyDaysAgo} THEN ${clientPayment.amount} ELSE 0 END)`,
        totalRevenue: sum(clientPayment.amount)
      })
      .from(clientPayment);

    const cashFlowScore = revenueData.previousMonthRevenue > 0 ? 
      Math.min(((revenueData.currentMonthRevenue / revenueData.previousMonthRevenue) * 50), 100) : 50;

    // Calculate inventory turnover (20% weight)
    const [inventoryData] = await db
      .select({
        soldItems: sql<number>`COUNT(CASE WHEN ${item.status} = 'sold' THEN 1 END)`,
        totalItems: count()
      })
      .from(item);

    const inventoryTurnoverScore = inventoryData.totalItems > 0 ? 
      ((inventoryData.soldItems / inventoryData.totalItems) * 100) : 0;

    // Calculate profit margin (10% weight)
    const [revenueTotal] = await db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(${clientPayment.amount}), 0)`
      })
      .from(clientPayment);

    const [payoutTotal] = await db
      .select({
        totalPayouts: sql<number>`COALESCE(SUM(${vendorPayout.amount}), 0)`
      })
      .from(vendorPayout);

    const [expenseTotal] = await db
      .select({
        totalExpenses: sql<number>`COALESCE(SUM(${itemExpense.amount}), 0)`
      })
      .from(itemExpense);

    const profitData = {
      totalRevenue: revenueTotal.totalRevenue,
      totalPayouts: payoutTotal.totalPayouts,
      totalExpenses: expenseTotal.totalExpenses
    };

    const totalCosts = profitData.totalPayouts + profitData.totalExpenses;
    const profitMarginScore = profitData.totalRevenue > 0 ? 
      (((profitData.totalRevenue - totalCosts) / profitData.totalRevenue) * 100) : 0;

    // Calculate client retention (5% weight)
    const [clientData] = await db
      .select({
        returningClients: sql<number>`COUNT(DISTINCT CASE WHEN payment_count > 1 THEN client_id END)`,
        totalClients: sql<number>`COUNT(DISTINCT client_id)`
      })
      .from(sql`(
        SELECT client_id, COUNT(*) as payment_count 
        FROM client_payment 
        GROUP BY client_id
      ) as client_stats`);

    const clientRetentionScore = clientData.totalClients > 0 ? 
      ((clientData.returningClients / clientData.totalClients) * 100) : 0;

    // Calculate weighted score
    const factors = {
      paymentTimeliness: Math.max(0, Math.min(100, timelinessScore)),
      cashFlow: Math.max(0, Math.min(100, cashFlowScore)),
      inventoryTurnover: Math.max(0, Math.min(100, inventoryTurnoverScore)),
      profitMargin: Math.max(0, Math.min(100, profitMarginScore)),
      clientRetention: Math.max(0, Math.min(100, clientRetentionScore))
    };

    const score = Math.round(
      (factors.paymentTimeliness * 0.4) +
      (factors.cashFlow * 0.25) +
      (factors.inventoryTurnover * 0.2) +
      (factors.profitMargin * 0.1) +
      (factors.clientRetention * 0.05)
    );

    // Determine grade
    let grade: string;
    if (score >= 90) grade = 'A+';
    else if (score >= 80) grade = 'A';
    else if (score >= 70) grade = 'B';
    else if (score >= 60) grade = 'C';
    else if (score >= 50) grade = 'D';
    else grade = 'F';

    // Generate recommendations
    const recommendations: string[] = [];
    if (factors.paymentTimeliness < 80) {
      recommendations.push("Improve payment collection processes and follow up on overdue payments");
    }
    if (factors.cashFlow < 60) {
      recommendations.push("Focus on increasing monthly revenue and diversifying payment methods");
    }
    if (factors.inventoryTurnover < 50) {
      recommendations.push("Optimize inventory management and consider price adjustments for slow-moving items");
    }
    if (factors.profitMargin < 30) {
      recommendations.push("Review pricing strategy and reduce operational costs");
    }
    if (factors.clientRetention < 40) {
      recommendations.push("Implement client retention strategies and improve customer service");
    }

    return {
      score,
      grade,
      factors,
      recommendations: recommendations.length > 0 ? recommendations : ["Maintain current performance levels"]
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
          isNull(item.brandId)
        )
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
            active: "true"
          })
          .returning();
        
        brandId = newBrand.brandId;
        brandsCreated++;
      }

      // Update all items with this brand name to reference the brandId
      const updateResult = await db
        .update(item)
        .set({ brandId: brandId })
        .where(
          and(
            eq(item.brand, brandRecord.brand),
            isNull(item.brandId)
          )
        );

      itemsUpdated += updateResult.rowCount || 0;
    }

    // Count items that couldn't be migrated (null or empty brand)
    const [skippedCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(item)
      .where(
        and(
          isNull(item.brandId),
          sql`(${item.brand} IS NULL OR ${item.brand} = '')`
        )
      );

    skippedItems = skippedCount.count;

    return {
      brandsCreated,
      itemsUpdated,
      skippedItems
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
        status: 'paid',
        paidAmount: plan.amount
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
          status: 'pending' // Keep status as pending but log the reminder
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
        status: item.status
      })
      .from(item)
      .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
      .where(
        and(
          sql`LOWER(${vendor.name}) LIKE '%luxette%'`,
          sql`${item.status} IN ('in-store', 'reserved')`
        )
      );

    const itemCount = luxetteItems.length;

    // Calculate total cost using minCost where available
    const totalCost = luxetteItems.reduce((sum, item) => {
      const cost = parseFloat(item.minCost || '0');
      return sum + cost;
    }, 0);

    // Calculate price range using sales prices
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    luxetteItems.forEach(item => {
      const itemMinPrice = parseFloat(item.minSalesPrice || '0');
      const itemMaxPrice = parseFloat(item.maxSalesPrice || '0');
      
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
        max: Math.round(maxPrice * 100) / 100
      }
    };
  }
}

export const storage = new DatabaseStorage();
