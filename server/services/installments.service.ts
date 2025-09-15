/**
 * Installment service - handles all installment plan-related database operations
 */

import { db } from '../db.js';
import { 
  installmentPlan, item, vendor, client,
  type InstallmentPlan, type InsertInstallmentPlan, type Item, type Vendor, type Client
} from '@shared/schema';
import { eq, desc, and, lte, isNull, gte } from 'drizzle-orm';
import { toDbNumeric, toDbTimestamp } from './utils/db-helpers.js';
import { NotFoundError } from './utils/errors.js';

export async function getInstallmentPlans(): Promise<Array<InstallmentPlan & { item: Item & { vendor: Vendor }; client: Client }>> {
  const results = await db
    .select()
    .from(installmentPlan)
    .innerJoin(item, eq(installmentPlan.itemId, item.itemId))
    .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
    .innerJoin(client, eq(installmentPlan.clientId, client.clientId))
    .orderBy(desc(installmentPlan.nextDueDate));

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
    .orderBy(desc(installmentPlan.nextDueDate));

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
    .orderBy(desc(installmentPlan.nextDueDate));

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
      totalAmount: toDbNumeric(insertPlan.totalAmount),
      installmentAmount: toDbNumeric(insertPlan.installmentAmount),
      frequency: insertPlan.frequency,
      nextDueDate: toDbTimestamp(insertPlan.nextDueDate),
      remainingAmount: toDbNumeric(insertPlan.remainingAmount || insertPlan.totalAmount),
      status: insertPlan.status || "active",
      startDate: toDbTimestamp(insertPlan.startDate),
      lastPaidDate: insertPlan.lastPaidDate ? toDbTimestamp(insertPlan.lastPaidDate) : undefined,
      reminderSent: insertPlan.reminderSent || false,
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
      ...(updatePlan.totalAmount !== undefined && { totalAmount: toDbNumeric(updatePlan.totalAmount) }),
      ...(updatePlan.installmentAmount !== undefined && { installmentAmount: toDbNumeric(updatePlan.installmentAmount) }),
      ...(updatePlan.frequency !== undefined && { frequency: updatePlan.frequency }),
      ...(updatePlan.nextDueDate !== undefined && { nextDueDate: toDbTimestamp(updatePlan.nextDueDate) }),
      ...(updatePlan.remainingAmount !== undefined && { remainingAmount: toDbNumeric(updatePlan.remainingAmount) }),
      ...(updatePlan.status !== undefined && { status: updatePlan.status }),
      ...(updatePlan.lastPaidDate !== undefined && { lastPaidDate: toDbTimestamp(updatePlan.lastPaidDate) }),
      ...(updatePlan.reminderSent !== undefined && { reminderSent: updatePlan.reminderSent }),
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

export async function markInstallmentPaid(installmentId: string): Promise<InstallmentPlan> {
  const [plan] = await db
    .select()
    .from(installmentPlan)
    .where(eq(installmentPlan.installmentId, installmentId));

  if (!plan) {
    throw new NotFoundError('Installment Plan', installmentId);
  }

  const remainingAmount = Number(plan.remainingAmount) - Number(plan.installmentAmount);
  const newStatus = remainingAmount <= 0 ? "completed" : "active";

  // Calculate next due date based on frequency
  const currentDueDate = new Date(plan.nextDueDate);
  let nextDueDate = new Date(currentDueDate);

  switch (plan.frequency) {
    case "weekly":
      nextDueDate.setDate(nextDueDate.getDate() + 7);
      break;
    case "biweekly":
      nextDueDate.setDate(nextDueDate.getDate() + 14);
      break;
    case "monthly":
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      break;
    case "quarterly":
      nextDueDate.setMonth(nextDueDate.getMonth() + 3);
      break;
  }

  const [updatedPlan] = await db
    .update(installmentPlan)
    .set({
      remainingAmount: toDbNumeric(Math.max(0, remainingAmount)),
      lastPaidDate: new Date(),
      nextDueDate: newStatus === "active" ? nextDueDate : currentDueDate,
      status: newStatus,
      reminderSent: false,
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

  // Mark reminder as sent
  await db
    .update(installmentPlan)
    .set({ reminderSent: true })
    .where(eq(installmentPlan.installmentId, installmentId));

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
        eq(installmentPlan.status, "active"),
        lte(installmentPlan.nextDueDate, sevenDaysFromNow)
      )
    )
    .orderBy(installmentPlan.nextDueDate)
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
        eq(installmentPlan.status, "active"),
        lte(installmentPlan.nextDueDate, today)
      )
    )
    .orderBy(installmentPlan.nextDueDate);

  return results.map((row) => ({
    ...row.installment_plan,
    item: {
      ...row.item,
      vendor: row.vendor,
    },
    client: row.client,
  }));
}