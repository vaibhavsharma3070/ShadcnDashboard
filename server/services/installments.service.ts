/**
 * Installment service - handles all installment plan-related database operations
 */

import { db } from '../db.js';
import { 
  installmentPlan, item, vendor, client,
  type InstallmentPlan, type InsertInstallmentPlan, type Item, type Vendor, type Client
} from '@shared/schema';
import { eq, desc, and, lte, gte } from 'drizzle-orm';
import { toDbNumeric } from './utils/db-helpers.js';
import { NotFoundError } from './utils/errors.js';

export async function getInstallmentPlans(): Promise<Array<InstallmentPlan & { item: Item & { vendor: Vendor }; client: Client }>> {
  const results = await db
    .select()
    .from(installmentPlan)
    .innerJoin(item, eq(installmentPlan.itemId, item.itemId))
    .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
    .innerJoin(client, eq(installmentPlan.clientId, client.clientId))
    .orderBy(desc(installmentPlan.dueDate));

  return results.map((row) => ({
    ...row.installment_plan,
    item: {
      ...row.item,
      vendor: row.vendor,
    },
    client: row.client,
  }));
}

export async function getInstallmentPlansByItem(itemId: string): Promise<Array<InstallmentPlan & { client: Client }>> {
  const results = await db
    .select()
    .from(installmentPlan)
    .innerJoin(client, eq(installmentPlan.clientId, client.clientId))
    .where(eq(installmentPlan.itemId, itemId))
    .orderBy(desc(installmentPlan.dueDate));

  return results.map((row) => ({
    ...row.installment_plan,
    client: row.client,
  }));
}

export async function getInstallmentPlansByClient(clientId: string): Promise<Array<InstallmentPlan & { item: Item & { vendor: Vendor } }>> {
  const results = await db
    .select()
    .from(installmentPlan)
    .innerJoin(item, eq(installmentPlan.itemId, item.itemId))
    .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
    .where(eq(installmentPlan.clientId, clientId))
    .orderBy(desc(installmentPlan.dueDate));

  return results.map((row) => ({
    ...row.installment_plan,
    item: {
      ...row.item,
      vendor: row.vendor,
    },
  }));
}

export async function createInstallmentPlan(insertPlan: InsertInstallmentPlan): Promise<InstallmentPlan> {
  // Verify item exists
  const [existingItem] = await db
    .select()
    .from(item)
    .where(eq(item.itemId, insertPlan.itemId));

  if (!existingItem) {
    throw new NotFoundError('Item', insertPlan.itemId);
  }

  // Verify client exists
  const [existingClient] = await db
    .select()
    .from(client)
    .where(eq(client.clientId, insertPlan.clientId));

  if (!existingClient) {
    throw new NotFoundError('Client', insertPlan.clientId);
  }

  const [newPlan] = await db
    .insert(installmentPlan)
    .values({
      itemId: insertPlan.itemId,
      clientId: insertPlan.clientId,
      amount: toDbNumeric(insertPlan.amount),
      dueDate: typeof insertPlan.dueDate === 'string' ? insertPlan.dueDate : insertPlan.dueDate.toISOString().split('T')[0],
    })
    .returning();

  return newPlan;
}

export async function updateInstallmentPlan(id: string, updatePlan: Partial<InsertInstallmentPlan>): Promise<InstallmentPlan> {
  const [existingPlan] = await db
    .select()
    .from(installmentPlan)
    .where(eq(installmentPlan.installmentId, id));

  if (!existingPlan) {
    throw new NotFoundError('Installment Plan', id);
  }

  const [updatedPlan] = await db
    .update(installmentPlan)
    .set({
      ...(updatePlan.amount !== undefined && { amount: toDbNumeric(updatePlan.amount) }),
      ...(updatePlan.dueDate !== undefined && { dueDate: typeof updatePlan.dueDate === 'string' ? updatePlan.dueDate : updatePlan.dueDate.toISOString().split('T')[0] }),
    })
    .where(eq(installmentPlan.installmentId, id))
    .returning();

  return updatedPlan;
}

export async function deleteInstallmentPlan(id: string): Promise<void> {
  const [existingPlan] = await db
    .select()
    .from(installmentPlan)
    .where(eq(installmentPlan.installmentId, id));

  if (!existingPlan) {
    throw new NotFoundError('Installment Plan', id);
  }

  await db.delete(installmentPlan).where(eq(installmentPlan.installmentId, id));
}

export async function getInstallmentPlan(id: string): Promise<(InstallmentPlan & { item: Item & { vendor: Vendor }; client: Client }) | undefined> {
  const results = await db
    .select()
    .from(installmentPlan)
    .innerJoin(item, eq(installmentPlan.itemId, item.itemId))
    .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
    .innerJoin(client, eq(installmentPlan.clientId, client.clientId))
    .where(eq(installmentPlan.installmentId, id));

  if (results.length === 0) {
    return undefined;
  }

  return {
    ...results[0].installment_plan,
    item: {
      ...results[0].item,
      vendor: results[0].vendor,
    },
    client: results[0].client,
  };
}

export async function markInstallmentPaid(installmentId: string, paidAmount: number): Promise<InstallmentPlan> {
  const [existingPlan] = await db
    .select()
    .from(installmentPlan)
    .where(eq(installmentPlan.installmentId, installmentId));

  if (!existingPlan) {
    throw new NotFoundError('Installment Plan', installmentId);
  }

  const totalPaid = Number(existingPlan.paidAmount) + paidAmount;
  const newStatus = totalPaid >= Number(existingPlan.amount) ? "paid" : "pending";

  const [updatedPlan] = await db
    .update(installmentPlan)
    .set({
      paidAmount: toDbNumeric(totalPaid),
      status: newStatus,
    })
    .where(eq(installmentPlan.installmentId, installmentId))
    .returning();

  return updatedPlan;
}

export async function sendPaymentReminder(installmentId: string): Promise<boolean> {
  const [plan] = await db
    .select()
    .from(installmentPlan)
    .where(eq(installmentPlan.installmentId, installmentId));

  if (!plan) {
    throw new NotFoundError('Installment Plan', installmentId);
  }

  // In a real implementation, this would send an actual reminder
  // For now, just return true to indicate success
  return true;
}

export async function getUpcomingPayments(limit: number = 10): Promise<Array<InstallmentPlan & { item: Item & { vendor: Vendor }; client: Client }>> {
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const results = await db
    .select()
    .from(installmentPlan)
    .innerJoin(item, eq(installmentPlan.itemId, item.itemId))
    .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
    .innerJoin(client, eq(installmentPlan.clientId, client.clientId))
    .where(
      and(
        eq(installmentPlan.status, "pending"),
        lte(installmentPlan.dueDate, sevenDaysFromNow.toISOString().split('T')[0])
      )
    )
    .orderBy(installmentPlan.dueDate)
    .limit(limit);

  return results.map((row) => ({
    ...row.installment_plan,
    item: {
      ...row.item,
      vendor: row.vendor,
    },
    client: row.client,
  }));
}

export async function getOverduePayments(): Promise<Array<InstallmentPlan & { item: Item & { vendor: Vendor }; client: Client }>> {
  const today = new Date();

  const results = await db
    .select()
    .from(installmentPlan)
    .innerJoin(item, eq(installmentPlan.itemId, item.itemId))
    .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
    .innerJoin(client, eq(installmentPlan.clientId, client.clientId))
    .where(
      and(
        eq(installmentPlan.status, "pending"),
        lte(installmentPlan.dueDate, today.toISOString().split('T')[0])
      )
    )
    .orderBy(installmentPlan.dueDate);

  return results.map((row) => ({
    ...row.installment_plan,
    item: {
      ...row.item,
      vendor: row.vendor,
    },
    client: row.client,
  }));
}