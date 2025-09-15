/**
 * Business Intelligence service - handles complex reporting and analytics
 */

import { db } from '../db.js';
import { 
  item, vendor, client, brand, category, clientPayment, vendorPayout, itemExpense, installmentPlan 
} from '@shared/schema';
import { eq, sql, and, gte, lte, desc, inArray, sum, count, isNotNull } from 'drizzle-orm';
import { applyItemFilters, applyPaymentFilters, buildFilterCondition, type CommonFilters } from './utils/filters.js';
import { formatDateForGrouping, daysBetween } from './utils/joins.js';

export async function getReportKPIs(
  startDate: string,
  endDate: string,
  filters?: CommonFilters
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
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Build filter conditions
  const itemConditions = applyItemFilters(filters);
  const paymentConditions = applyPaymentFilters({ ...filters, startDate, endDate });

  // Revenue and payment stats
  const paymentQuery = db
    .select({
      totalRevenue: sql<number>`COALESCE(SUM(${clientPayment.amount}), 0)`,
      paymentCount: count(),
      uniqueClients: sql<number>`COUNT(DISTINCT ${clientPayment.clientId})`,
    })
    .from(clientPayment)
    .innerJoin(item, eq(clientPayment.itemId, item.itemId));

  const paymentCondition = buildFilterCondition([
    ...paymentConditions,
    ...itemConditions.map(c => c), // Apply item filters through join
  ]);

  if (paymentCondition) {
    paymentQuery.where(paymentCondition);
  }

  const [paymentStats] = await paymentQuery;

  // Items sold and COGS
  const itemQuery = db
    .select({
      itemsSold: count(),
      totalMinCost: sql<number>`COALESCE(SUM(${item.minCost}), 0)`,
      totalMaxCost: sql<number>`COALESCE(SUM(${item.maxCost}), 0)`,
      avgDaysToSell: sql<number>`AVG(
        CASE 
          WHEN ${item.status} = 'sold' AND ${item.createdAt} IS NOT NULL 
          THEN EXTRACT(DAY FROM (
            SELECT MIN(${clientPayment.paidAt}) 
            FROM ${clientPayment} 
            WHERE ${clientPayment.itemId} = ${item.itemId}
          ) - ${item.createdAt})
          ELSE NULL 
        END
      )`,
    })
    .from(item)
    .where(
      and(
        eq(item.status, "sold"),
        sql`EXISTS (
          SELECT 1 FROM ${clientPayment} 
          WHERE ${clientPayment.itemId} = ${item.itemId}
          AND ${clientPayment.paidAt} >= ${start}
          AND ${clientPayment.paidAt} <= ${end}
        )`,
        ...itemConditions
      )
    );

  const [itemStats] = await itemQuery;

  // Expenses
  const [expenseStats] = await db
    .select({
      totalExpenses: sql<number>`COALESCE(SUM(${itemExpense.amount}), 0)`,
    })
    .from(itemExpense)
    .innerJoin(item, eq(itemExpense.itemId, item.itemId))
    .where(
      and(
        gte(itemExpense.expenseDate, startDate),
        lte(itemExpense.expenseDate, endDate),
        ...itemConditions
      )
    );

  // Inventory turnover calculation
  const [inventoryStats] = await db
    .select({
      avgInventoryValue: sql<number>`AVG(${item.minCost})`,
    })
    .from(item)
    .where(buildFilterCondition(itemConditions) || undefined);

  // Calculate metrics
  const revenue = Number(paymentStats.totalRevenue);
  const cogs = Number(itemStats.totalMinCost); // Use min cost for conservative COGS
  const totalExpenses = Number(expenseStats.totalExpenses);
  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - totalExpenses;
  const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  const itemsSold = Number(itemStats.itemsSold);
  const paymentCount = Number(paymentStats.paymentCount);
  const averageOrderValue = paymentCount > 0 ? revenue / paymentCount : 0;
  const uniqueClients = Number(paymentStats.uniqueClients);
  const averageDaysToSell = Number(itemStats.avgDaysToSell) || 0;
  const avgInventory = Number(inventoryStats.avgInventoryValue) || 0;
  const inventoryTurnover = avgInventory > 0 ? cogs / avgInventory : 0;

  return {
    revenue,
    cogs,
    grossProfit,
    grossMargin,
    itemsSold,
    averageOrderValue,
    totalExpenses,
    netProfit,
    netMargin,
    paymentCount,
    uniqueClients,
    averageDaysToSell,
    inventoryTurnover,
  };
}

export async function getTimeSeries(
  metric: "revenue" | "profit" | "itemsSold" | "payments",
  granularity: "day" | "week" | "month",
  startDate: string,
  endDate: string,
  filters?: CommonFilters
): Promise<Array<{ period: string; value: number; count?: number }>> {
  const itemConditions = applyItemFilters(filters);

  if (metric === "revenue" || metric === "payments") {
    const query = db
      .select({
        period: formatDateForGrouping(clientPayment.paidAt, granularity),
        totalAmount: sql<number>`COALESCE(SUM(${clientPayment.amount}), 0)`,
        paymentCount: count(),
      })
      .from(clientPayment)
      .innerJoin(item, eq(clientPayment.itemId, item.itemId))
      .where(
        and(
          gte(clientPayment.paidAt, new Date(startDate)),
          lte(clientPayment.paidAt, new Date(endDate)),
          ...itemConditions
        )
      )
      .groupBy(sql`1`)
      .orderBy(sql`1`);

    const results = await query;

    return results.map((row) => ({
      period: row.period?.toISOString().split('T')[0] || '',
      value: metric === "revenue" ? Number(row.totalAmount) : Number(row.paymentCount),
      count: Number(row.paymentCount),
    }));
  } else if (metric === "profit") {
    const query = db
      .select({
        period: formatDateForGrouping(clientPayment.paidAt, granularity),
        revenue: sql<number>`COALESCE(SUM(${clientPayment.amount}), 0)`,
        costs: sql<number>`COALESCE(SUM(${item.minCost}), 0)`,
      })
      .from(clientPayment)
      .innerJoin(item, eq(clientPayment.itemId, item.itemId))
      .where(
        and(
          gte(clientPayment.paidAt, new Date(startDate)),
          lte(clientPayment.paidAt, new Date(endDate)),
          ...itemConditions
        )
      )
      .groupBy(sql`1`)
      .orderBy(sql`1`);

    const results = await query;

    return results.map((row) => ({
      period: row.period?.toISOString().split('T')[0] || '',
      value: Number(row.revenue) - Number(row.costs),
    }));
  } else {
    // itemsSold
    const query = db
      .select({
        period: formatDateForGrouping(sql`(SELECT MIN(${clientPayment.paidAt}) FROM ${clientPayment} WHERE ${clientPayment.itemId} = ${item.itemId})`, granularity),
        itemCount: count(),
      })
      .from(item)
      .where(
        and(
          eq(item.status, "sold"),
          sql`EXISTS (
            SELECT 1 FROM ${clientPayment} 
            WHERE ${clientPayment.itemId} = ${item.itemId}
            AND ${clientPayment.paidAt} >= ${new Date(startDate)}
            AND ${clientPayment.paidAt} <= ${new Date(endDate)}
          )`,
          ...itemConditions
        )
      )
      .groupBy(sql`1`)
      .orderBy(sql`1`);

    const results = await query;

    return results.map((row) => ({
      period: row.period?.toISOString().split('T')[0] || '',
      value: Number(row.itemCount),
      count: Number(row.itemCount),
    }));
  }
}

export async function getGroupedMetrics(
  groupBy: "brand" | "vendor" | "client" | "category",
  metrics: Array<"revenue" | "profit" | "itemsSold" | "avgOrderValue">,
  startDate: string,
  endDate: string,
  filters?: CommonFilters
): Promise<Array<{
  groupId: string;
  groupName: string;
  revenue?: number;
  profit?: number;
  itemsSold?: number;
  avgOrderValue?: number;
}>> {
  const itemConditions = applyItemFilters(filters);

  let groupTable: any;
  let groupIdColumn: any;
  let groupNameColumn: any;
  let joinCondition: any;

  switch (groupBy) {
    case "brand":
      groupTable = brand;
      groupIdColumn = brand.brandId;
      groupNameColumn = brand.name;
      joinCondition = eq(item.brandId, brand.brandId);
      break;
    case "vendor":
      groupTable = vendor;
      groupIdColumn = vendor.vendorId;
      groupNameColumn = vendor.name;
      joinCondition = eq(item.vendorId, vendor.vendorId);
      break;
    case "client":
      groupTable = client;
      groupIdColumn = client.clientId;
      groupNameColumn = client.name;
      joinCondition = eq(clientPayment.clientId, client.clientId);
      break;
    case "category":
      groupTable = category;
      groupIdColumn = category.categoryId;
      groupNameColumn = category.name;
      joinCondition = eq(item.categoryId, category.categoryId);
      break;
  }

  const query = db
    .select({
      groupId: groupIdColumn,
      groupName: groupNameColumn,
      revenue: sql<number>`COALESCE(SUM(${clientPayment.amount}), 0)`,
      costs: sql<number>`COALESCE(SUM(${item.minCost}), 0)`,
      itemCount: sql<number>`COUNT(DISTINCT ${item.itemId})`,
      paymentCount: sql<number>`COUNT(${clientPayment.paymentId})`,
    })
    .from(clientPayment)
    .innerJoin(item, eq(clientPayment.itemId, item.itemId))
    .innerJoin(groupTable, joinCondition)
    .where(
      and(
        gte(clientPayment.paidAt, new Date(startDate)),
        lte(clientPayment.paidAt, new Date(endDate)),
        ...itemConditions
      )
    )
    .groupBy(groupIdColumn, groupNameColumn)
    .orderBy(desc(sql`SUM(${clientPayment.amount})`));

  const results = await query;

  return results.map((row) => {
    const result: any = {
      groupId: row.groupId,
      groupName: row.groupName || "Unknown",
    };

    if (metrics.includes("revenue")) {
      result.revenue = Number(row.revenue);
    }
    if (metrics.includes("profit")) {
      result.profit = Number(row.revenue) - Number(row.costs);
    }
    if (metrics.includes("itemsSold")) {
      result.itemsSold = Number(row.itemCount);
    }
    if (metrics.includes("avgOrderValue")) {
      result.avgOrderValue = Number(row.paymentCount) > 0
        ? Number(row.revenue) / Number(row.paymentCount)
        : 0;
    }

    return result;
  });
}

export async function getItemProfitability(
  startDate: string,
  endDate: string,
  filters?: CommonFilters,
  limit: number = 50,
  offset: number = 0
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
  const itemConditions = applyItemFilters(filters);

  // Get total count
  const [countResult] = await db
    .select({
      totalCount: count(),
    })
    .from(item)
    .where(
      and(
        eq(item.status, "sold"),
        sql`EXISTS (
          SELECT 1 FROM ${clientPayment} 
          WHERE ${clientPayment.itemId} = ${item.itemId}
          AND ${clientPayment.paidAt} >= ${new Date(startDate)}
          AND ${clientPayment.paidAt} <= ${new Date(endDate)}
        )`,
        ...itemConditions
      )
    );

  // Get paginated results
  const results = await db
    .select({
      item: item,
      vendor: vendor,
      revenue: sql<number>`COALESCE(SUM(${clientPayment.amount}), 0)`,
      firstPaymentDate: sql<Date>`MIN(${clientPayment.paidAt})`,
      daysToSell: sql<number>`
        EXTRACT(DAY FROM MIN(${clientPayment.paidAt}) - ${item.createdAt})::INTEGER
      `,
    })
    .from(item)
    .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
    .innerJoin(clientPayment, eq(clientPayment.itemId, item.itemId))
    .where(
      and(
        eq(item.status, "sold"),
        gte(clientPayment.paidAt, new Date(startDate)),
        lte(clientPayment.paidAt, new Date(endDate)),
        ...itemConditions
      )
    )
    .groupBy(item.itemId, vendor.vendorId)
    .orderBy(desc(sql`SUM(${clientPayment.amount}) - COALESCE(${item.minCost}, 0)`))
    .limit(limit)
    .offset(offset);

  const items = results.map((row) => {
    const revenue = Number(row.revenue);
    const cost = Number(row.item.minCost || row.item.maxCost || 0);
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return {
      itemId: row.item.itemId,
      title: row.item.title || "",
      brand: row.item.brand || "",
      model: row.item.model || "",
      vendor: row.vendor.name || "",
      revenue,
      cost,
      profit,
      margin,
      soldDate: row.firstPaymentDate?.toISOString().split('T')[0],
      daysToSell: Number(row.daysToSell) || undefined,
    };
  });

  return {
    items,
    totalCount: Number(countResult.totalCount),
  };
}

export async function getInventoryHealth(filters?: {
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
  const conditions: any[] = [];
  if (filters?.vendorIds?.length) {
    conditions.push(inArray(item.vendorId, filters.vendorIds));
  }
  if (filters?.brandIds?.length) {
    conditions.push(inArray(item.brandId, filters.brandIds));
  }
  if (filters?.categoryIds?.length) {
    conditions.push(inArray(item.categoryId, filters.categoryIds));
  }

  const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

  // Overall stats
  const [stats] = await db
    .select({
      totalItems: count(),
      inStoreItems: sql<number>`SUM(CASE WHEN ${item.status} = 'in-store' THEN 1 ELSE 0 END)`,
      reservedItems: sql<number>`SUM(CASE WHEN ${item.status} = 'reserved' THEN 1 ELSE 0 END)`,
      soldItems: sql<number>`SUM(CASE WHEN ${item.status} = 'sold' THEN 1 ELSE 0 END)`,
      partialPaidItems: sql<number>`SUM(CASE WHEN ${item.status} = 'partial-paid' THEN 1 ELSE 0 END)`,
      totalValue: sql<number>`COALESCE(SUM(${item.minCost}), 0)`,
      avgDaysInInventory: sql<number>`AVG(EXTRACT(DAY FROM CURRENT_DATE - ${item.createdAt}))`,
    })
    .from(item)
    .where(whereCondition);

  // Categories breakdown
  const categoriesResults = await db
    .select({
      categoryId: category.categoryId,
      categoryName: category.name,
      itemCount: count(),
      totalValue: sql<number>`COALESCE(SUM(${item.minCost}), 0)`,
      avgAge: sql<number>`AVG(EXTRACT(DAY FROM CURRENT_DATE - ${item.createdAt}))`,
    })
    .from(item)
    .innerJoin(category, eq(item.categoryId, category.categoryId))
    .where(whereCondition)
    .groupBy(category.categoryId, category.name);

  // Aging analysis
  const [aging] = await db
    .select({
      under30Days: sql<number>`SUM(CASE WHEN EXTRACT(DAY FROM CURRENT_DATE - ${item.createdAt}) < 30 THEN 1 ELSE 0 END)`,
      days30To90: sql<number>`SUM(CASE WHEN EXTRACT(DAY FROM CURRENT_DATE - ${item.createdAt}) BETWEEN 30 AND 90 THEN 1 ELSE 0 END)`,
      days90To180: sql<number>`SUM(CASE WHEN EXTRACT(DAY FROM CURRENT_DATE - ${item.createdAt}) BETWEEN 91 AND 180 THEN 1 ELSE 0 END)`,
      over180Days: sql<number>`SUM(CASE WHEN EXTRACT(DAY FROM CURRENT_DATE - ${item.createdAt}) > 180 THEN 1 ELSE 0 END)`,
    })
    .from(item)
    .where(and(sql`${item.status} IN ('in-store', 'reserved')`, whereCondition));

  return {
    totalItems: Number(stats.totalItems),
    inStoreItems: Number(stats.inStoreItems),
    reservedItems: Number(stats.reservedItems),
    soldItems: Number(stats.soldItems),
    partialPaidItems: Number(stats.partialPaidItems),
    totalValue: Number(stats.totalValue),
    avgDaysInInventory: Number(stats.avgDaysInInventory) || 0,
    categoriesBreakdown: categoriesResults.map((cat) => ({
      categoryId: cat.categoryId,
      categoryName: cat.categoryName || "Unknown",
      itemCount: Number(cat.itemCount),
      totalValue: Number(cat.totalValue),
      avgAge: Number(cat.avgAge) || 0,
    })),
    agingAnalysis: {
      under30Days: Number(aging.under30Days),
      days30To90: Number(aging.days30To90),
      days90To180: Number(aging.days90To180),
      over180Days: Number(aging.over180Days),
    },
  };
}