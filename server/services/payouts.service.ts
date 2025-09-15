/**
 * Payout service - handles all vendor payout-related database operations
 */

import { db } from '../db.js';
import { 
  vendorPayout, item, vendor, clientPayment,
  type VendorPayout, type InsertVendorPayout, type Item, type Vendor
} from '@shared/schema';
import { eq, desc, sql, and, isNull, count, sum, gte, lte } from 'drizzle-orm';
import { toDbNumeric, toDbTimestamp } from './utils/db-helpers.js';
import { NotFoundError } from './utils/errors.js';

export async function getPayouts(): Promise<Array<VendorPayout & { item: Item; vendor: Vendor }>> {
  const results = await db
    .select()
    .from(vendorPayout)
    .innerJoin(item, eq(vendorPayout.itemId, item.itemId))
    .innerJoin(vendor, eq(vendorPayout.vendorId, vendor.vendorId))
    .orderBy(desc(vendorPayout.paidAt));

  return results.map((row) => ({
    ...row.vendor_payout,
    item: row.item,
    vendor: row.vendor,
  }));
}

export async function createPayout(insertPayout: InsertVendorPayout): Promise<VendorPayout> {
  // Transaction: Create payout and update fullyPaidAt timestamp if applicable
  return await db.transaction(async (tx) => {
    // Verify item exists
    const [existingItem] = await tx
      .select()
      .from(item)
      .where(eq(item.itemId, insertPayout.itemId));

    if (!existingItem) {
      throw new NotFoundError('Item', insertPayout.itemId);
    }

    // Verify vendor exists
    const [existingVendor] = await tx
      .select()
      .from(vendor)
      .where(eq(vendor.vendorId, insertPayout.vendorId));

    if (!existingVendor) {
      throw new NotFoundError('Vendor', insertPayout.vendorId);
    }

    // Create the payout
    const [newPayout] = await tx
      .insert(vendorPayout)
      .values({
        itemId: insertPayout.itemId,
        vendorId: insertPayout.vendorId,
        amount: toDbNumeric(insertPayout.amount),
        paidAt: toDbTimestamp(insertPayout.paidAt),
        notes: insertPayout.notes,
      })
      .returning();

    // Calculate total paid to vendor for this item
    const [{ totalPaid }] = await tx
      .select({
        totalPaid: sql<number>`COALESCE(SUM(${vendorPayout.amount}), 0)`,
      })
      .from(vendorPayout)
      .where(eq(vendorPayout.itemId, insertPayout.itemId));

    // Note: fullyPaidAt field doesn't exist in schema, removed update logic

    return newPayout;
  });
}

export async function getRecentPayouts(limit: number = 10): Promise<Array<VendorPayout & { item: Item; vendor: Vendor }>> {
  const results = await db
    .select()
    .from(vendorPayout)
    .innerJoin(item, eq(vendorPayout.itemId, item.itemId))
    .innerJoin(vendor, eq(vendorPayout.vendorId, vendor.vendorId))
    .orderBy(desc(vendorPayout.paidAt))
    .limit(limit);

  return results.map((row) => ({
    ...row.vendor_payout,
    item: row.item,
    vendor: row.vendor,
  }));
}

export async function getUpcomingPayouts(): Promise<Array<{
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
      item: item,
      vendor: vendor,
      totalPaid: sql<number>`COALESCE(SUM(${vendorPayout.amount}), 0)`,
      firstPaymentDate: sql<string>`MIN(${vendorPayout.paidAt})`,
      lastPaymentDate: sql<string>`MAX(${vendorPayout.paidAt})`,
      totalClientPayments: sql<number>`
        COALESCE((
          SELECT SUM(${clientPayment.amount})
          FROM ${clientPayment}
          WHERE ${clientPayment.itemId} = ${item.itemId}
        ), 0)
      `,
    })
    .from(item)
    .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
    .leftJoin(vendorPayout, eq(vendorPayout.itemId, item.itemId))
    .where(eq(item.status, "sold"))
    .groupBy(item.itemId, vendor.vendorId);

  return results.map((row) => {
    const minCost = Number(row.item.minCost || 0);
    const maxCost = Number(row.item.maxCost || 0);
    const totalPaid = Number(row.totalPaid);
    const salePrice = Number(row.totalClientPayments);
    const maxSalesPrice = Number(row.item.maxSalesPrice || 0);
    
    // Calculate vendor payout target using correct formula:
    // Payout = (1 - ((MaxSalesPrice - ActualSalesPrice) × 0.01)) × MaxCost
    const priceDifference = maxSalesPrice - salePrice;
    const adjustmentFactor = 1 - (priceDifference * 0.01);
    const vendorTarget = adjustmentFactor * maxCost;
    
    const remainingBalance = Math.max(0, vendorTarget - totalPaid);
    const paymentProgress = vendorTarget > 0 ? (totalPaid / vendorTarget) * 100 : 0;

    return {
      itemId: row.item.itemId,
      title: row.item.title || "",
      brand: row.item.brand || "",
      model: row.item.model || "",
      minSalesPrice: Number(row.item.minSalesPrice || 0),
      maxSalesPrice: Number(row.item.maxSalesPrice || 0),
      salePrice,
      minCost,
      maxCost,
      vendorPayoutAmount: vendorTarget, // Total amount to be paid to vendor
      totalPaid,
      remainingBalance,
      paymentProgress,
      isFullyPaid: paymentProgress >= 100,
      fullyPaidAt: undefined, // Field doesn't exist in schema
      firstPaymentDate: row.firstPaymentDate || undefined,
      lastPaymentDate: row.lastPaymentDate || undefined,
      vendor: row.vendor,
    };
  });
}

export async function getPayoutMetrics(): Promise<{
  totalPayoutsPaid: number;
  totalPayoutsAmount: number;
  pendingPayouts: number;
  upcomingPayouts: number;
  averagePayoutAmount: number;
  monthlyPayoutTrend: number;
}> {
  // Total payouts paid
  const [payoutStats] = await db
    .select({
      totalCount: count(),
      totalAmount: sql<number>`COALESCE(SUM(${vendorPayout.amount}), 0)`,
      avgAmount: sql<number>`COALESCE(AVG(${vendorPayout.amount}), 0)`,
    })
    .from(vendorPayout);

  // Pending payouts (sold items not fully paid out to vendor)
  const pendingResults = await db
    .select({
      itemId: item.itemId,
      totalPaid: sql<number>`COALESCE(SUM(${vendorPayout.amount}), 0)`,
      salePrice: sql<number>`
        COALESCE((
          SELECT SUM(${clientPayment.amount})
          FROM ${clientPayment}
          WHERE ${clientPayment.itemId} = ${item.itemId}
        ), 0)
      `,
    })
    .from(item)
    .leftJoin(vendorPayout, eq(vendorPayout.itemId, item.itemId))
    .where(eq(item.status, "sold"))
    .groupBy(item.itemId)
    .having(sql`COALESCE(SUM(${vendorPayout.amount}), 0) < (COALESCE((SELECT SUM(${clientPayment.amount}) FROM ${clientPayment} WHERE ${clientPayment.itemId} = ${item.itemId}), 0) * 0.70)`);

  const pendingCount = pendingResults.length;

  // Use same logic as pending for upcoming count
  const upcomingCount = pendingCount;

  // Monthly trend (compare last 30 days to previous 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const [currentMonthStats] = await db
    .select({
      amount: sql<number>`COALESCE(SUM(${vendorPayout.amount}), 0)`,
    })
    .from(vendorPayout)
    .where(gte(vendorPayout.paidAt, thirtyDaysAgo));

  const [previousMonthStats] = await db
    .select({
      amount: sql<number>`COALESCE(SUM(${vendorPayout.amount}), 0)`,
    })
    .from(vendorPayout)
    .where(
      and(
        gte(vendorPayout.paidAt, sixtyDaysAgo),
        lte(vendorPayout.paidAt, thirtyDaysAgo)
      )
    );

  const currentAmount = Number(currentMonthStats.amount);
  const previousAmount = Number(previousMonthStats.amount);
  const monthlyTrend = previousAmount > 0
    ? ((currentAmount - previousAmount) / previousAmount) * 100
    : 0;

  return {
    totalPayoutsPaid: Number(payoutStats.totalCount),
    totalPayoutsAmount: Number(payoutStats.totalAmount),
    pendingPayouts: pendingCount,
    upcomingPayouts: upcomingCount,
    averagePayoutAmount: Number(payoutStats.avgAmount),
    monthlyPayoutTrend: monthlyTrend,
  };
}