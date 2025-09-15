/**
 * Payment service - handles all client payment-related database operations
 */

import { db } from '../db.js';
import { 
  clientPayment, item, vendor, client,
  type ClientPayment, type InsertClientPayment, type Item, type Vendor, type Client
} from '@shared/schema';
import { eq, desc, sql, gte, lte, and } from 'drizzle-orm';
import { toDbNumeric, toDbTimestamp } from './utils/db-helpers.js';
import { NotFoundError } from './utils/errors.js';

export async function getPayments(): Promise<Array<ClientPayment & { item: Item & { vendor: Vendor }; client: Client }>> {
  const results = await db
    .select()
    .from(clientPayment)
    .innerJoin(item, eq(clientPayment.itemId, item.itemId))
    .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
    .innerJoin(client, eq(clientPayment.clientId, client.clientId))
    .orderBy(desc(clientPayment.paidAt));

  return results.map((row) => ({
    ...row.client_payment,
    item: {
      ...row.item,
      vendor: row.vendor,
    },
    client: row.client,
  }));
}

export async function getPaymentsByItem(itemId: string): Promise<Array<ClientPayment & { client: Client }>> {
  const results = await db
    .select()
    .from(clientPayment)
    .innerJoin(client, eq(clientPayment.clientId, client.clientId))
    .where(eq(clientPayment.itemId, itemId))
    .orderBy(desc(clientPayment.paidAt));

  return results.map((row) => ({
    ...row.client_payment,
    client: row.client,
  }));
}

export async function createPayment(insertPayment: InsertClientPayment): Promise<ClientPayment> {
  // Transaction: Create payment and update item status
  return await db.transaction(async (tx) => {
    // Verify item exists and get current status
    const [existingItem] = await tx
      .select()
      .from(item)
      .where(eq(item.itemId, insertPayment.itemId));

    if (!existingItem) {
      throw new NotFoundError('Item', insertPayment.itemId);
    }

    // Verify client exists
    const [existingClient] = await tx
      .select()
      .from(client)
      .where(eq(client.clientId, insertPayment.clientId));

    if (!existingClient) {
      throw new NotFoundError('Client', insertPayment.clientId);
    }

    // Create the payment
    const [newPayment] = await tx
      .insert(clientPayment)
      .values({
        itemId: insertPayment.itemId,
        clientId: insertPayment.clientId,
        paymentMethod: insertPayment.paymentMethod,
        amount: toDbNumeric(insertPayment.amount),
        paidAt: toDbTimestamp(insertPayment.paidAt),
      })
      .returning();

    // Calculate total paid for this item
    const [{ totalPaid }] = await tx
      .select({
        totalPaid: sql<number>`COALESCE(SUM(${clientPayment.amount}), 0)`,
      })
      .from(clientPayment)
      .where(eq(clientPayment.itemId, insertPayment.itemId));

    // Update item status if fully paid
    const itemPrice = existingItem.minSalesPrice || existingItem.maxSalesPrice || 0;
    if (Number(totalPaid) >= Number(itemPrice) && existingItem.status !== "sold") {
      await tx
        .update(item)
        .set({ status: "sold" })
        .where(eq(item.itemId, insertPayment.itemId));
    } else if (Number(totalPaid) > 0 && existingItem.status === "in-store") {
      // Mark as reserved if partial payment
      await tx
        .update(item)
        .set({ status: "reserved" })
        .where(eq(item.itemId, insertPayment.itemId));
    }

    return newPayment;
  });
}

export async function updatePayment(id: string, updatePayment: Partial<InsertClientPayment>): Promise<ClientPayment> {
  const [existingPayment] = await db
    .select()
    .from(clientPayment)
    .where(eq(clientPayment.paymentId, id));

  if (!existingPayment) {
    throw new NotFoundError('Payment', id);
  }

  const [updatedPayment] = await db
    .update(clientPayment)
    .set({
      ...(updatePayment.paymentMethod !== undefined && { paymentMethod: updatePayment.paymentMethod }),
      ...(updatePayment.amount !== undefined && { amount: toDbNumeric(updatePayment.amount) }),
      ...(updatePayment.paidAt !== undefined && { paidAt: toDbTimestamp(updatePayment.paidAt) }),
    })
    .where(eq(clientPayment.paymentId, id))
    .returning();

  return updatedPayment;
}

export async function deletePayment(id: string): Promise<void> {
  const [existingPayment] = await db
    .select()
    .from(clientPayment)
    .where(eq(clientPayment.paymentId, id));

  if (!existingPayment) {
    throw new NotFoundError('Payment', id);
  }

  await db.delete(clientPayment).where(eq(clientPayment.paymentId, id));
}

/**
 * Get recent payments with full details
 */
export async function getRecentPayments(limit: number = 10): Promise<Array<ClientPayment & { item: Item & { vendor: Vendor }; client: Client }>> {
  const results = await db
    .select()
    .from(clientPayment)
    .innerJoin(item, eq(clientPayment.itemId, item.itemId))
    .innerJoin(vendor, eq(item.vendorId, vendor.vendorId))
    .innerJoin(client, eq(clientPayment.clientId, client.clientId))
    .orderBy(desc(clientPayment.paidAt))
    .limit(limit);

  return results.map((row) => ({
    ...row.client_payment,
    item: {
      ...row.item,
      vendor: row.vendor,
    },
    client: row.client,
  }));
}

/**
 * Get payment method breakdown for analytics
 */
export async function getPaymentMethodBreakdown(
  startDate: string,
  endDate: string
): Promise<Array<{
  paymentMethod: string;
  totalAmount: number;
  transactionCount: number;
  percentage: number;
  avgTransactionAmount: number;
}>> {
  const results = await db
    .select({
      paymentMethod: clientPayment.paymentMethod,
      totalAmount: sql<number>`COALESCE(SUM(${clientPayment.amount}), 0)`,
      transactionCount: sql<number>`COUNT(*)`,
      avgTransactionAmount: sql<number>`AVG(${clientPayment.amount})`,
    })
    .from(clientPayment)
    .where(
      and(
        gte(clientPayment.paidAt, new Date(startDate)),
        lte(clientPayment.paidAt, new Date(endDate))
      )
    )
    .groupBy(clientPayment.paymentMethod)
    .orderBy(desc(sql`SUM(${clientPayment.amount})`));

  // Calculate grand total for percentage
  const grandTotal = results.reduce((sum, r) => sum + Number(r.totalAmount), 0);

  return results.map((row) => ({
    paymentMethod: row.paymentMethod,
    totalAmount: Number(row.totalAmount),
    transactionCount: Number(row.transactionCount),
    percentage: grandTotal > 0 ? (Number(row.totalAmount) / grandTotal) * 100 : 0,
    avgTransactionAmount: Number(row.avgTransactionAmount),
  }));
}