/**
 * Dashboard service - handles all dashboard metrics and analytics
 */

import { db } from '../db.js';
import { item, vendor, clientPayment, vendorPayout, itemExpense, installmentPlan } from '@shared/schema';
import { eq, sql, and, isNull, count, sum, desc, gte, lte } from 'drizzle-orm';
import type { Item, Vendor } from '@shared/schema';

export async function getDashboardMetrics(): Promise<{
  totalRevenue: number;
  activeItems: number;
  pendingPayouts: { min: number; max: number };
  netProfit: { min: number; max: number };
  incomingPayments: number;
  upcomingPayouts: number;
  costRange: { min: number; max: number };
  inventoryValueRange: { min: number; max: number };
}> {
  // Total revenue from all client payments
  const [revenueResult] = await db
    .select({
      totalRevenue: sql<number>`COALESCE(SUM(${clientPayment.amount}), 0)`,
    })
    .from(clientPayment);

  // Active items (in-store or reserved)
  const [activeItemsResult] = await db
    .select({
      count: count(),
    })
    .from(item)
    .where(sql`${item.status} IN ('in-store', 'reserved')`);

  // Pending payouts (sold items not fully paid to vendor)
  const pendingPayoutsResults = await db
    .select({
      minCost: item.minCost,
      maxCost: item.maxCost,
      totalPaid: sql<number>`COALESCE(SUM(${vendorPayout.amount}), 0)`,
    })
    .from(item)
    .leftJoin(vendorPayout, eq(vendorPayout.itemId, item.itemId))
    .where(eq(item.status, "sold"))
    .groupBy(item.itemId);

  let pendingMin = 0;
  let pendingMax = 0;
  for (const row of pendingPayoutsResults) {
    const minCost = Number(row.minCost || 0);
    const maxCost = Number(row.maxCost || 0);
    const paid = Number(row.totalPaid);
    pendingMin += Math.max(0, minCost - paid);
    pendingMax += Math.max(0, maxCost - paid);
  }

  // Net profit calculation
  const [costsResult] = await db
    .select({
      totalMinCost: sql<number>`COALESCE(SUM(${item.minCost}), 0)`,
      totalMaxCost: sql<number>`COALESCE(SUM(${item.maxCost}), 0)`,
    })
    .from(item)
    .where(eq(item.status, "sold"));

  const [expensesResult] = await db
    .select({
      totalExpenses: sql<number>`COALESCE(SUM(${itemExpense.amount}), 0)`,
    })
    .from(itemExpense);

  const totalRevenue = Number(revenueResult.totalRevenue);
  const totalExpenses = Number(expensesResult.totalExpenses);
  const totalMinCost = Number(costsResult.totalMinCost);
  const totalMaxCost = Number(costsResult.totalMaxCost);

  const netProfitMin = totalRevenue - totalMaxCost - totalExpenses;
  const netProfitMax = totalRevenue - totalMinCost - totalExpenses;

  // Incoming payments (active installment plans)
  const [incomingResult] = await db
    .select({
      totalRemaining: sql<number>`COALESCE(SUM(${installmentPlan.amount} - ${installmentPlan.paidAmount}), 0)`,
    })
    .from(installmentPlan)
    .where(eq(installmentPlan.status, "pending"));

  // Upcoming payouts count
  const [upcomingPayoutsResult] = await db
    .select({
      count: count(),
    })
    .from(item)
    .where(eq(item.status, "sold"));

  // Cost range of all items
  const [costRangeResult] = await db
    .select({
      minCost: sql<number>`MIN(${item.minCost})`,
      maxCost: sql<number>`MAX(${item.maxCost})`,
    })
    .from(item);

  // Inventory value range (active items only)
  const [inventoryValueResult] = await db
    .select({
      minValue: sql<number>`COALESCE(SUM(${item.minCost}), 0)`,
      maxValue: sql<number>`COALESCE(SUM(${item.maxCost}), 0)`,
    })
    .from(item)
    .where(sql`${item.status} IN ('in-store', 'reserved')`);

  return {
    totalRevenue,
    activeItems: Number(activeItemsResult.count),
    pendingPayouts: { min: pendingMin, max: pendingMax },
    netProfit: { min: netProfitMin, max: netProfitMax },
    incomingPayments: Number(incomingResult.totalRemaining),
    upcomingPayouts: Number(upcomingPayoutsResult.count),
    costRange: {
      min: Number(costRangeResult.minCost || 0),
      max: Number(costRangeResult.maxCost || 0),
    },
    inventoryValueRange: {
      min: Number(inventoryValueResult.minValue),
      max: Number(inventoryValueResult.maxValue),
    },
  };
}

export async function getFinancialDataByDateRange(
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
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Revenue from payments in date range
  const [revenueResult] = await db
    .select({
      totalRevenue: sql<number>`COALESCE(SUM(${clientPayment.amount}), 0)`,
      paymentCount: count(),
    })
    .from(clientPayment)
    .where(and(gte(clientPayment.paidAt, start), lte(clientPayment.paidAt, end)));

  // Items sold in date range (based on first payment date)
  const soldItemsResults = await db
    .select({
      itemId: item.itemId,
      minCost: item.minCost,
      maxCost: item.maxCost,
      firstPaymentDate: sql<Date>`MIN(${clientPayment.paidAt})`,
    })
    .from(item)
    .innerJoin(clientPayment, eq(clientPayment.itemId, item.itemId))
    .where(eq(item.status, "sold"))
    .groupBy(item.itemId)
    .having(and(gte(sql`MIN(${clientPayment.paidAt})`, start), lte(sql`MIN(${clientPayment.paidAt})`, end)));

  let totalCosts = 0;
  const itemsSold = soldItemsResults.length;

  for (const row of soldItemsResults) {
    // Use minCost if available, otherwise maxCost
    totalCosts += Number(row.minCost || row.maxCost || 0);
  }

  // Expenses in date range
  const [expensesResult] = await db
    .select({
      totalExpenses: sql<number>`COALESCE(SUM(${itemExpense.amount}), 0)`,
    })
    .from(itemExpense)
    .where(and(gte(itemExpense.incurredAt, start), lte(itemExpense.incurredAt, end)));

  const totalRevenue = Number(revenueResult.totalRevenue);
  const totalExpenses = Number(expensesResult.totalExpenses);
  const paymentCount = Number(revenueResult.paymentCount);
  const averageOrderValue = paymentCount > 0 ? totalRevenue / paymentCount : 0;
  const totalProfit = totalRevenue - totalCosts - totalExpenses;

  return {
    totalRevenue,
    totalCosts,
    totalProfit,
    itemsSold,
    averageOrderValue,
    totalExpenses,
  };
}

export async function getLuxetteInventoryData(): Promise<{
  itemCount: number;
  totalCost: number;
  priceRange: { min: number; max: number };
}> {
  // Find Luxette vendor
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

  // Get Luxette inventory stats
  const [stats] = await db
    .select({
      itemCount: count(),
      totalMinCost: sql<number>`COALESCE(SUM(${item.minCost}), 0)`,
      totalMaxCost: sql<number>`COALESCE(SUM(${item.maxCost}), 0)`,
      minPrice: sql<number>`MIN(${item.minSalesPrice})`,
      maxPrice: sql<number>`MAX(${item.maxSalesPrice})`,
    })
    .from(item)
    .where(and(eq(item.vendorId, luxetteVendor.vendorId), eq(item.status, "in-store")));

  return {
    itemCount: Number(stats.itemCount),
    totalCost: Number(stats.totalMinCost || stats.totalMaxCost || 0),
    priceRange: {
      min: Number(stats.minPrice || 0),
      max: Number(stats.maxPrice || 0),
    },
  };
}