/**
 * Common filter utilities for database queries
 */

import { and, inArray, gte, lte, sql, type SQL } from "drizzle-orm";
import { item, vendor, client, brand, category, clientPayment, vendorPayout } from "@shared/schema";

export interface CommonFilters {
  vendorIds?: string[];
  clientIds?: string[];
  brandIds?: string[];
  categoryIds?: string[];
  itemStatuses?: string[];
  startDate?: string;
  endDate?: string;
}

export function applyItemFilters(filters?: CommonFilters): SQL[] {
  const conditions: SQL[] = [];
  
  if (filters?.vendorIds?.length) {
    conditions.push(inArray(item.vendorId, filters.vendorIds));
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
  
  return conditions;
}

export function applyPaymentFilters(filters?: CommonFilters): SQL[] {
  const conditions: SQL[] = [];
  
  if (filters?.clientIds?.length) {
    conditions.push(inArray(clientPayment.clientId, filters.clientIds));
  }
  
  if (filters?.startDate) {
    conditions.push(gte(clientPayment.paidAt, new Date(filters.startDate)));
  }
  
  if (filters?.endDate) {
    conditions.push(lte(clientPayment.paidAt, new Date(filters.endDate)));
  }
  
  return conditions;
}

export function applyDateRange(column: any, startDate?: string, endDate?: string): SQL[] {
  const conditions: SQL[] = [];
  
  if (startDate) {
    conditions.push(gte(column, new Date(startDate)));
  }
  
  if (endDate) {
    conditions.push(lte(column, new Date(endDate)));
  }
  
  return conditions;
}

export function buildFilterCondition(conditions: SQL[]): SQL | undefined {
  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return and(...conditions);
}