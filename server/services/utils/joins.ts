/**
 * Common join patterns and select builders for database queries
 */

import { item, vendor, client, brand, category, clientPayment, vendorPayout, installmentPlan, itemExpense } from "@shared/schema";
import { sql } from "drizzle-orm";

export const itemWithVendorSelect = {
  item,
  vendor,
};

export const itemWithAllRelationsSelect = {
  item,
  vendor,
  brand,
  category,
};

export const paymentWithRelationsSelect = {
  clientPayment,
  item,
  vendor,
  client,
};

export const payoutWithRelationsSelect = {
  vendorPayout,
  item,
  vendor,
};

export const installmentWithRelationsSelect = {
  installmentPlan,
  item,
  vendor,
  client,
};

export const expenseWithItemSelect = {
  itemExpense,
  item,
};

/**
 * Helper to calculate days between dates
 */
export function daysBetween(startColumn: any, endColumn: any) {
  return sql`EXTRACT(DAY FROM ${endColumn} - ${startColumn})::INTEGER`;
}

/**
 * Helper to format date for grouping
 */
export function formatDateForGrouping(column: any, granularity: 'day' | 'week' | 'month') {
  if (granularity === 'day') {
    return sql`DATE(${column})`;
  } else if (granularity === 'week') {
    return sql`DATE_TRUNC('week', ${column})`;
  } else {
    return sql`DATE_TRUNC('month', ${column})`;
  }
}