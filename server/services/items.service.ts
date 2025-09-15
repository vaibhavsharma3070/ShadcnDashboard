/**
 * Item service - handles all item-related database operations
 */

import { db } from '../db.js';
import { 
  item, vendor, brand, category, clientPayment, vendorPayout, itemExpense,
  type Item, type InsertItem, type Vendor 
} from '@shared/schema';
import { eq, desc, sql, and, isNull, or, sum, count } from 'drizzle-orm';
import { toDbNumeric, toDbNumericOptional, toDbDate } from './utils/db-helpers.js';
import { NotFoundError, ConflictError } from './utils/errors.js';

export async function getItems(vendorId?: string): Promise<Array<Item & { vendor: Vendor }>> {
  const query = db
    .select()
    .from(item)
    .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
    .orderBy(desc(item.createdAt));

  if (vendorId) {
    const results = await query.where(eq(item.vendorId, vendorId));
    return results.map((row) => ({
      ...row.item,
      vendor: row.vendor,
    }));
  }

  const results = await query;
  return results.map((row) => ({
    ...row.item,
    vendor: row.vendor,
  }));
}

export async function getItem(id: string): Promise<(Item & { vendor: Vendor }) | undefined> {
  const results = await db
    .select()
    .from(item)
    .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
    .where(eq(item.itemId, id));

  if (results.length === 0) {
    return undefined;
  }

  return {
    ...results[0].item,
    vendor: results[0].vendor,
  };
}

export async function createItem(insertItem: InsertItem): Promise<Item> {
  const [newItem] = await db
    .insert(item)
    .values({
      vendorId: insertItem.vendorId,
      brandId: insertItem.brandId,
      categoryId: insertItem.categoryId,
      title: insertItem.title,
      brand: insertItem.brand,
      model: insertItem.model,
      serialNo: insertItem.serialNo,
      condition: insertItem.condition,
      acquisitionDate: toDbDate(insertItem.acquisitionDate),
      minCost: toDbNumericOptional(insertItem.minCost),
      maxCost: toDbNumericOptional(insertItem.maxCost),
      minSalesPrice: toDbNumericOptional(insertItem.minSalesPrice),
      maxSalesPrice: toDbNumericOptional(insertItem.maxSalesPrice),
      imageUrl: insertItem.imageUrl,
      status: insertItem.status || "in-store",
    })
    .returning();

  return newItem;
}

export async function updateItem(id: string, updateItem: Partial<InsertItem>): Promise<Item> {
  const [existingItem] = await db
    .select()
    .from(item)
    .where(eq(item.itemId, id));

  if (!existingItem) {
    throw new NotFoundError('Item', id);
  }

  const [updatedItem] = await db
    .update(item)
    .set({
      ...(updateItem.vendorId !== undefined && { vendorId: updateItem.vendorId }),
      ...(updateItem.brandId !== undefined && { brandId: updateItem.brandId }),
      ...(updateItem.categoryId !== undefined && { categoryId: updateItem.categoryId }),
      ...(updateItem.title !== undefined && { title: updateItem.title }),
      ...(updateItem.brand !== undefined && { brand: updateItem.brand }),
      ...(updateItem.model !== undefined && { model: updateItem.model }),
      ...(updateItem.serialNo !== undefined && { serialNo: updateItem.serialNo }),
      ...(updateItem.condition !== undefined && { condition: updateItem.condition }),
      ...(updateItem.acquisitionDate !== undefined && { acquisitionDate: toDbDate(updateItem.acquisitionDate) }),
      ...(updateItem.minCost !== undefined && { minCost: toDbNumericOptional(updateItem.minCost) }),
      ...(updateItem.maxCost !== undefined && { maxCost: toDbNumericOptional(updateItem.maxCost) }),
      ...(updateItem.minSalesPrice !== undefined && { minSalesPrice: toDbNumericOptional(updateItem.minSalesPrice) }),
      ...(updateItem.maxSalesPrice !== undefined && { maxSalesPrice: toDbNumericOptional(updateItem.maxSalesPrice) }),
      ...(updateItem.imageUrl !== undefined && { imageUrl: updateItem.imageUrl }),
      ...(updateItem.status !== undefined && { status: updateItem.status }),
    })
    .where(eq(item.itemId, id))
    .returning();

  return updatedItem;
}

export async function deleteItem(id: string): Promise<void> {
  const [existingItem] = await db
    .select()
    .from(item)
    .where(eq(item.itemId, id));

  if (!existingItem) {
    throw new NotFoundError('Item', id);
  }

  // Check if item has any payments
  const [paymentCount] = await db
    .select({ count: count() })
    .from(clientPayment)
    .where(eq(clientPayment.itemId, id));

  if (paymentCount.count > 0) {
    throw new ConflictError(`Cannot delete item: has ${paymentCount.count} payment records`);
  }

  // Check if item has any payouts
  const [payoutCount] = await db
    .select({ count: count() })
    .from(vendorPayout)
    .where(eq(vendorPayout.itemId, id));

  if (payoutCount.count > 0) {
    throw new ConflictError(`Cannot delete item: has ${payoutCount.count} payout records`);
  }

  // Check if item has any expenses
  const [expenseCount] = await db
    .select({ count: count() })
    .from(itemExpense)
    .where(eq(itemExpense.itemId, id));

  if (expenseCount.count > 0) {
    throw new ConflictError(`Cannot delete item: has ${expenseCount.count} expense records`);
  }

  await db.delete(item).where(eq(item.itemId, id));
}

/**
 * Get recent items with vendor information
 */
export async function getRecentItems(limit: number = 10): Promise<Array<Item & { vendor: Vendor }>> {
  const results = await db
    .select()
    .from(item)
    .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
    .orderBy(desc(item.createdAt))
    .limit(limit);

  return results.map((row) => ({
    ...row.item,
    vendor: row.vendor,
  }));
}

/**
 * Get top performing items by profit
 */
export async function getTopPerformingItems(limit: number = 10): Promise<Array<Item & { vendor: Vendor; profit: number }>> {
  const results = await db
    .select({
      item: item,
      vendor: vendor,
      totalRevenue: sql<number>`COALESCE(SUM(${clientPayment.amount}), 0)`,
      totalCost: sql<number>`COALESCE(${item.minCost}, 0)`,
      profit: sql<number>`COALESCE(SUM(${clientPayment.amount}), 0) - COALESCE(${item.minCost}, 0)`,
    })
    .from(item)
    .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
    .leftJoin(clientPayment, eq(clientPayment.itemId, item.itemId))
    .where(eq(item.status, "sold"))
    .groupBy(item.itemId, vendor.vendorId)
    .orderBy(desc(sql`COALESCE(SUM(${clientPayment.amount}), 0) - COALESCE(${item.minCost}, 0)`))
    .limit(limit);

  return results.map((row) => ({
    ...row.item,
    vendor: row.vendor,
    profit: Number(row.profit),
  }));
}

/**
 * Get pending payouts - items that are sold but not fully paid out to vendor
 */
export async function getPendingPayouts(): Promise<Array<Item & { vendor: Vendor }>> {
  const results = await db
    .select({
      item: item,
      vendor: vendor,
      totalPaid: sql<number>`COALESCE(SUM(${vendorPayout.amount}), 0)`,
    })
    .from(item)
    .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
    .leftJoin(vendorPayout, eq(vendorPayout.itemId, item.itemId))
    .where(eq(item.status, "sold"))
    .groupBy(item.itemId, vendor.vendorId)
    .having(sql`COALESCE(SUM(${vendorPayout.amount}), 0) < COALESCE(${item.minCost}, 0)`);

  return results.map((row) => ({
    ...row.item,
    vendor: row.vendor,
  }));
}