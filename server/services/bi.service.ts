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
  // Additional fields for frontend compatibility
  totalRevenue: number;
  totalProfit: number;
  totalItems: number;
  averageProfit: number;
  profitMargin: number;
  pendingPayments: number;
  overduePayments: number;
  revenueChange: number;
  profitChange: number;
  topPerformingBrand: string;
  topPerformingVendor: string;
}> {
  // Create date objects that include the full day (start at 00:00:00, end at 23:59:59.999)
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

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

  // Combine all conditions - payment conditions and item conditions (applied through join)
  const allConditions = [...paymentConditions, ...itemConditions].filter(Boolean);
  
  const paymentCondition = allConditions.length > 0 
    ? (allConditions.length === 1 ? allConditions[0] : and(...allConditions))
    : undefined;

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
    .from(item);
  
  // Build where condition for item query
  const itemWhereConditions = [
    eq(item.status, "sold"),
    sql`EXISTS (
      SELECT 1 FROM ${clientPayment} 
      WHERE ${clientPayment.itemId} = ${item.itemId}
      AND ${clientPayment.paidAt} >= ${start}
      AND ${clientPayment.paidAt} <= ${end}
    )`,
    ...itemConditions
  ].filter(Boolean);
  
  if (itemWhereConditions.length > 0) {
    itemQuery.where(
      itemWhereConditions.length === 1 
        ? itemWhereConditions[0] 
        : and(...itemWhereConditions)
    );
  }

  const [itemStats] = await itemQuery;

  // Expenses - use the adjusted start/end dates that include full days
  const expenseConditions = [
    gte(itemExpense.incurredAt, start),
    lte(itemExpense.incurredAt, end),
    ...itemConditions
  ].filter(Boolean); // Remove any undefined/null conditions
  
  const [expenseStats] = await db
    .select({
      totalExpenses: sql<number>`COALESCE(SUM(${itemExpense.amount}), 0)`,
    })
    .from(itemExpense)
    .innerJoin(item, eq(itemExpense.itemId, item.itemId))
    .where(expenseConditions.length > 0 ? and(...expenseConditions) : undefined);

  // Inventory turnover calculation
  const [inventoryStats] = await db
    .select({
      avgInventoryValue: sql<number>`AVG(${item.minCost})`,
      totalItems: count(),
    })
    .from(item)
    .where(buildFilterCondition(itemConditions) || undefined);

  // Get pending and overdue payments from installment plans
  const today = new Date();
  const [paymentStatus] = await db
    .select({
      pendingPayments: sql<number>`SUM(CASE WHEN ${installmentPlan.status} = 'pending' AND ${installmentPlan.dueDate} > ${today.toISOString().split('T')[0]} THEN 1 ELSE 0 END)`,
      overduePayments: sql<number>`SUM(CASE WHEN ${installmentPlan.status} = 'pending' AND ${installmentPlan.dueDate} <= ${today.toISOString().split('T')[0]} THEN 1 ELSE 0 END)`,
    })
    .from(installmentPlan);

  // Get top performing brand
  const [topBrand] = await db
    .select({
      brandName: brand.name,
      totalRevenue: sql<number>`COALESCE(SUM(${clientPayment.amount}), 0)`,
    })
    .from(clientPayment)
    .innerJoin(item, eq(clientPayment.itemId, item.itemId))
    .innerJoin(brand, eq(item.brandId, brand.brandId))
    .where(
      and(
        gte(clientPayment.paidAt, start),
        lte(clientPayment.paidAt, end),
        ...itemConditions
      )
    )
    .groupBy(brand.brandId, brand.name)
    .orderBy(desc(sql`SUM(${clientPayment.amount})`))
    .limit(1);

  // Get top performing vendor
  const [topVendor] = await db
    .select({
      vendorName: vendor.name,
      totalRevenue: sql<number>`COALESCE(SUM(${clientPayment.amount}), 0)`,
    })
    .from(clientPayment)
    .innerJoin(item, eq(clientPayment.itemId, item.itemId))
    .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
    .where(
      and(
        gte(clientPayment.paidAt, start),
        lte(clientPayment.paidAt, end),
        ...itemConditions
      )
    )
    .groupBy(vendor.vendorId, vendor.name)
    .orderBy(desc(sql`SUM(${clientPayment.amount})`))
    .limit(1);

  // Calculate previous period metrics for change percentage
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const prevStart = new Date(start);
  prevStart.setDate(prevStart.getDate() - daysDiff);
  prevStart.setHours(0, 0, 0, 0);
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  prevEnd.setHours(23, 59, 59, 999);

  const prevPaymentQuery = db
    .select({
      totalRevenue: sql<number>`COALESCE(SUM(${clientPayment.amount}), 0)`,
    })
    .from(clientPayment)
    .innerJoin(item, eq(clientPayment.itemId, item.itemId));
  
  const prevPaymentConditions = [
    gte(clientPayment.paidAt, prevStart),
    lte(clientPayment.paidAt, prevEnd),
    ...itemConditions
  ].filter(Boolean);
  
  if (prevPaymentConditions.length > 0) {
    prevPaymentQuery.where(
      prevPaymentConditions.length === 1 
        ? prevPaymentConditions[0] 
        : and(...prevPaymentConditions)
    );
  }
  
  const [prevPaymentStats] = await prevPaymentQuery;

  const prevItemQuery = db
    .select({
      totalMinCost: sql<number>`COALESCE(SUM(${item.minCost}), 0)`,
    })
    .from(item);
  
  // Build where condition for previous period item query
  const prevItemWhereConditions = [
    eq(item.status, "sold"),
    sql`EXISTS (
      SELECT 1 FROM ${clientPayment}
      WHERE ${clientPayment.itemId} = ${item.itemId}
      AND ${clientPayment.paidAt} >= ${prevStart}
      AND ${clientPayment.paidAt} <= ${prevEnd}
    )`,
    ...itemConditions
  ].filter(Boolean);
  
  if (prevItemWhereConditions.length > 0) {
    prevItemQuery.where(
      prevItemWhereConditions.length === 1 
        ? prevItemWhereConditions[0] 
        : and(...prevItemWhereConditions)
    );
  }

  const [prevItemStats] = await prevItemQuery;

  // Adjust previous period dates to include full days
  const prevStartAdjusted = new Date(prevStart);
  prevStartAdjusted.setHours(0, 0, 0, 0);
  const prevEndAdjusted = new Date(prevEnd);
  prevEndAdjusted.setHours(23, 59, 59, 999);
  
  const prevExpenseConditions = [
    gte(itemExpense.incurredAt, prevStartAdjusted),
    lte(itemExpense.incurredAt, prevEndAdjusted),
    ...itemConditions
  ].filter(Boolean);
  
  const [prevExpenseStats] = await db
    .select({
      totalExpenses: sql<number>`COALESCE(SUM(${itemExpense.amount}), 0)`,
    })
    .from(itemExpense)
    .innerJoin(item, eq(itemExpense.itemId, item.itemId))
    .where(prevExpenseConditions.length > 0 ? and(...prevExpenseConditions) : undefined);

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

  // Calculate additional metrics for frontend
  const totalItems = Number(inventoryStats.totalItems);
  const averageProfit = itemsSold > 0 ? netProfit / itemsSold : 0;
  const profitMargin = grossMargin; // Use gross margin as profit margin
  const pendingPayments = Number(paymentStatus.pendingPayments) || 0;
  const overduePayments = Number(paymentStatus.overduePayments) || 0;
  
  // Calculate change percentages
  const prevRevenue = Number(prevPaymentStats.totalRevenue);
  const prevCogs = Number(prevItemStats.totalMinCost);
  const prevExpenses = Number(prevExpenseStats.totalExpenses);
  const prevProfit = prevRevenue - prevCogs - prevExpenses;
  
  const revenueChange = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;
  const profitChange = prevProfit > 0 ? ((netProfit - prevProfit) / prevProfit) * 100 : 0;

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
    // Additional fields for frontend compatibility
    totalRevenue: revenue,
    totalProfit: netProfit,
    totalItems,
    averageProfit,
    profitMargin,
    pendingPayments,
    overduePayments,
    revenueChange,
    profitChange,
    topPerformingBrand: topBrand?.brandName || 'N/A',
    topPerformingVendor: topVendor?.vendorName || 'N/A',
  };
}

export async function getTimeSeries(
  metric: "revenue" | "profit" | "itemsSold" | "payments" | "expenses",
  granularity: "day" | "week" | "month",
  startDate: string,
  endDate: string,
  filters?: CommonFilters
): Promise<Array<{ period: string; value: number; count?: number }>> {
  // Create date objects that include the full day
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
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
          gte(clientPayment.paidAt, start),
          lte(clientPayment.paidAt, end),
          ...itemConditions
        )
      )
      .groupBy(sql`1`)
      .orderBy(sql`1`);

    const results = await query;

    return results.map((row: any) => {
      // Period is already formatted as YYYY-MM-DD string by formatDateForGrouping
      // But handle case where it might come back as Date or other type
      let periodStr = '';
      if (row.period) {
        if (typeof row.period === 'string') {
          periodStr = row.period;
        } else if (row.period instanceof Date) {
          periodStr = row.period.toISOString().split('T')[0];
        } else {
          periodStr = String(row.period).split('T')[0];
        }
      }
      return {
        period: periodStr,
        value: metric === "revenue" ? Number(row.totalAmount) : Number(row.paymentCount),
        count: Number(row.paymentCount),
      };
    });
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
          gte(clientPayment.paidAt, start),
          lte(clientPayment.paidAt, end),
          ...itemConditions
        )
      )
      .groupBy(sql`1`)
      .orderBy(sql`1`);

    const results = await query;

    return results.map((row: any) => {
      // Period is already formatted as YYYY-MM-DD string by formatDateForGrouping
      // But handle case where it might come back as Date or other type
      let periodStr = '';
      if (row.period) {
        if (typeof row.period === 'string') {
          periodStr = row.period;
        } else if (row.period instanceof Date) {
          periodStr = row.period.toISOString().split('T')[0];
        } else {
          periodStr = String(row.period).split('T')[0];
        }
      }
      return {
        period: periodStr,
        value: Number(row.revenue) - Number(row.costs),
      };
    });
  } else if (metric === "itemsSold") {
    // itemsSold - need to get first payment date per item and group by that
    const query = db
      .select({
        firstPaymentDate: sql<Date>`MIN(${clientPayment.paidAt})`,
        itemCount: count(),
      })
      .from(item)
      .innerJoin(clientPayment, eq(clientPayment.itemId, item.itemId))
      .where(
        and(
          eq(item.status, "sold"),
          gte(clientPayment.paidAt, start),
          lte(clientPayment.paidAt, end),
          ...itemConditions
        )
      )
      .groupBy(item.itemId)
      .having(sql`MIN(${clientPayment.paidAt}) >= ${start} AND MIN(${clientPayment.paidAt}) <= ${end}`);
    
    const itemResults = await query;
    
    // Group by period manually since we can't use formatDateForGrouping in a subquery easily
    const periodMap = new Map<string, number>();
    
    itemResults.forEach((row) => {
      if (row.firstPaymentDate) {
        const date = new Date(row.firstPaymentDate);
        let periodKey = '';
        
        if (granularity === 'day') {
          periodKey = date.toISOString().split('T')[0];
        } else if (granularity === 'week') {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          periodKey = weekStart.toISOString().split('T')[0];
        } else {
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
        }
        
        periodMap.set(periodKey, (periodMap.get(periodKey) || 0) + 1);
      }
    });
    
    return Array.from(periodMap.entries())
      .map(([period, value]) => ({
        period,
        value,
        count: value,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  } else if (metric === "expenses") {
    // Expenses timeseries - group expenses by incurred date
    const query = db
      .select({
        period: formatDateForGrouping(itemExpense.incurredAt, granularity),
        totalExpenses: sql<number>`COALESCE(SUM(${itemExpense.amount}), 0)`,
        expenseCount: count(),
      })
      .from(itemExpense)
      .innerJoin(item, eq(itemExpense.itemId, item.itemId))
      .where(
        and(
          gte(itemExpense.incurredAt, start),
          lte(itemExpense.incurredAt, end),
          ...itemConditions
        )
      )
      .groupBy(sql`1`)
      .orderBy(sql`1`);

    const results = await query;

    return results.map((row: any) => {
      // Period is already formatted as YYYY-MM-DD string by formatDateForGrouping
      // But handle case where it might come back as Date or other type
      let periodStr = '';
      if (row.period) {
        if (typeof row.period === 'string') {
          periodStr = row.period;
        } else if (row.period instanceof Date) {
          periodStr = row.period.toISOString().split('T')[0];
        } else {
          periodStr = String(row.period).split('T')[0];
        }
      }
      return {
        period: periodStr,
        value: Number(row.totalExpenses),
        count: Number(row.expenseCount),
      };
    });
  }
  
  // Default return for unknown metrics
  return [];
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
  profitMargin?: number;
  change?: number;
  itemCount?: number;
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

  // Get previous period data for change calculation
  const daysDiff = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
  const prevStart = new Date(startDate);
  prevStart.setDate(prevStart.getDate() - daysDiff);
  const prevEnd = new Date(startDate);
  prevEnd.setDate(prevEnd.getDate() - 1);

  const prevQuery = db
    .select({
      groupId: groupIdColumn,
      revenue: sql<number>`COALESCE(SUM(${clientPayment.amount}), 0)`,
    })
    .from(clientPayment)
    .innerJoin(item, eq(clientPayment.itemId, item.itemId))
    .innerJoin(groupTable, joinCondition)
    .where(
      and(
        gte(clientPayment.paidAt, prevStart),
        lte(clientPayment.paidAt, prevEnd),
        ...itemConditions
      )
    )
    .groupBy(groupIdColumn);

  const prevResults = await prevQuery;
  const prevRevenueMap = new Map(prevResults.map(r => [r.groupId, Number(r.revenue)]));

  return results.map((row) => {
    const revenue = Number(row.revenue);
    const costs = Number(row.costs);
    const profit = revenue - costs;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
    
    // Calculate change from previous period
    const prevRevenue = Number(prevRevenueMap.get(row.groupId) || 0);
    const change = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;

    const result: any = {
      groupId: row.groupId,
      groupName: row.groupName || "Unknown",
      itemCount: Number(row.itemCount), // Always include for frontend use
      profitMargin,
      change,
    };

    if (metrics.includes("revenue")) {
      result.revenue = revenue;
    }
    if (metrics.includes("profit")) {
      result.profit = profit;
    }
    if (metrics.includes("itemsSold")) {
      result.itemsSold = Number(row.itemCount);
    }
    if (metrics.includes("avgOrderValue")) {
      result.avgOrderValue = Number(row.paymentCount) > 0
        ? revenue / Number(row.paymentCount)
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
    status?: string;
    acquisitionDate?: string;
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

  // Get paginated results with brand join
  const results = await db
    .select({
      item: item,
      vendor: vendor,
      brand: brand,
      revenue: sql<number>`COALESCE(SUM(${clientPayment.amount}), 0)`,
      firstPaymentDate: sql<Date>`MIN(${clientPayment.paidAt})`,
      daysToSell: sql<number>`
        EXTRACT(DAY FROM MIN(${clientPayment.paidAt}) - ${item.createdAt})::INTEGER
      `,
    })
    .from(item)
    .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
    .leftJoin(brand, eq(item.brandId, brand.brandId))
    .innerJoin(clientPayment, eq(clientPayment.itemId, item.itemId))
    .where(
      and(
        eq(item.status, "sold"),
        gte(clientPayment.paidAt, new Date(startDate)),
        lte(clientPayment.paidAt, new Date(endDate)),
        ...itemConditions
      )
    )
    .groupBy(item.itemId, vendor.vendorId, brand.brandId)
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
      brand: row.brand?.name || row.item.brand || "", // Use brand table name, fallback to legacy field
      model: row.item.model || "",
      vendor: row.vendor.name || "",
      revenue,
      cost,
      profit,
      margin,
      soldDate: row.firstPaymentDate?.toISOString().split('T')[0],
      daysToSell: Number(row.daysToSell) || undefined,
      status: row.item.status, // Added for frontend
      acquisitionDate: row.item.acquisitionDate || undefined, // Added for frontend
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
  returnedItems: number;
  totalValue: number;
  averageAge: number;
  slowMovingItems: number;
  fastMovingItems: number;
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
      returnedItems: sql<number>`SUM(CASE WHEN ${item.status} = 'returned-to-vendor' THEN 1 ELSE 0 END)`,
      totalValue: sql<number>`COALESCE(SUM(${item.minCost}), 0)`,
      avgDaysInInventory: sql<number>`AVG(EXTRACT(DAY FROM CURRENT_DATE - ${item.createdAt}))`,
      slowMovingItems: sql<number>`SUM(CASE WHEN EXTRACT(DAY FROM CURRENT_DATE - ${item.createdAt}) > 90 AND ${item.status} IN ('in-store', 'reserved') THEN 1 ELSE 0 END)`,
      fastMovingItems: sql<number>`SUM(CASE WHEN EXTRACT(DAY FROM CURRENT_DATE - ${item.createdAt}) < 30 AND ${item.status} = 'sold' THEN 1 ELSE 0 END)`,
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
    returnedItems: Number(stats.returnedItems), // Renamed from partialPaidItems
    totalValue: Number(stats.totalValue),
    averageAge: Number(stats.avgDaysInInventory) || 0, // Renamed from avgDaysInInventory
    slowMovingItems: Number(stats.slowMovingItems), // Added
    fastMovingItems: Number(stats.fastMovingItems), // Added
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