import { 
  vendor, client, item, clientPayment, vendorPayout, itemExpense, users,
  type Vendor, type Client, type Item, type ClientPayment, type VendorPayout, type ItemExpense, type User,
  type InsertVendor, type InsertClient, type InsertItem, type InsertClientPayment, type InsertVendorPayout, type InsertItemExpense, type InsertUser
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sum, count, sql } from "drizzle-orm";

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
  
  // Payout methods
  getPayouts(): Promise<Array<VendorPayout & { item: Item, vendor: Vendor }>>;
  getPendingPayouts(): Promise<Array<Item & { vendor: Vendor }>>;
  createPayout(payout: InsertVendorPayout): Promise<VendorPayout>;
  
  // Expense methods
  getExpenses(): Promise<Array<ItemExpense & { item: Item }>>;
  getExpensesByItem(itemId: string): Promise<ItemExpense[]>;
  createExpense(expense: InsertItemExpense): Promise<ItemExpense>;
  
  // Dashboard methods
  getDashboardMetrics(): Promise<{
    totalRevenue: number;
    activeItems: number;
    pendingPayouts: number;
    netProfit: number;
  }>;
  
  getRecentItems(limit?: number): Promise<Array<Item & { vendor: Vendor }>>;
  getTopPerformingItems(limit?: number): Promise<Array<Item & { vendor: Vendor, profit: number }>>;
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
    return result;
  }

  async deleteClient(id: string): Promise<void> {
    await db.delete(client).where(eq(client.clientId, id));
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
    const [result] = await db.insert(item).values(insertItem).returning();
    return result;
  }

  async updateItem(id: string, updateItem: Partial<InsertItem>): Promise<Item> {
    const [result] = await db.update(item).set(updateItem).where(eq(item.itemId, id)).returning();
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
    const [result] = await db.insert(clientPayment).values(insertPayment).returning();
    
    // Check if item is fully paid and update status
    const payments = await db.select({ amount: clientPayment.amount })
      .from(clientPayment)
      .where(eq(clientPayment.itemId, insertPayment.itemId));
    
    const itemData = await db.select({ listPrice: item.listPrice })
      .from(item)
      .where(eq(item.itemId, insertPayment.itemId));
    
    if (payments.length > 0 && itemData.length > 0) {
      const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const listPrice = Number(itemData[0].listPrice);
      
      if (totalPaid >= listPrice) {
        await db.update(item).set({ status: 'sold' }).where(eq(item.itemId, insertPayment.itemId));
      }
    }
    
    return result;
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
    const [result] = await db.insert(vendorPayout).values(insertPayout).returning();
    return result;
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
    const [result] = await db.insert(itemExpense).values(insertExpense).returning();
    return result;
  }

  // Dashboard methods
  async getDashboardMetrics(): Promise<{
    totalRevenue: number;
    activeItems: number;
    pendingPayouts: number;
    netProfit: number;
  }> {
    const [revenueResult] = await db.select({ 
      total: sum(clientPayment.amount) 
    }).from(clientPayment);
    
    const [itemsResult] = await db.select({ 
      count: count() 
    }).from(item).where(sql`${item.status} IN ('in-store', 'reserved')`);
    
    const pendingPayouts = await this.getPendingPayouts();
    const pendingPayoutsTotal = pendingPayouts.reduce((sum, item) => 
      sum + Number(item.agreedVendorPayout || 0), 0);
    
    const [expensesResult] = await db.select({ 
      total: sum(itemExpense.amount) 
    }).from(itemExpense);
    
    const totalRevenue = Number(revenueResult.total || 0);
    const totalExpenses = Number(expensesResult.total || 0);
    const netProfit = totalRevenue - totalExpenses - pendingPayoutsTotal;

    return {
      totalRevenue,
      activeItems: itemsResult.count,
      pendingPayouts: pendingPayoutsTotal,
      netProfit
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
        const profit = totalPayments - Number(item.agreedVendorPayout || 0) - totalExpenses;
        
        return { ...item, profit };
      })
    );

    return itemsWithProfit
      .sort((a, b) => b.profit - a.profit)
      .slice(0, limit);
  }
}

export const storage = new DatabaseStorage();
