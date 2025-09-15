/**
 * Payment Method service - handles all payment method-related database operations
 */

import { db } from '../db.js';
import { paymentMethod, clientPayment, type PaymentMethod, type InsertPaymentMethod } from '@shared/schema';
import { eq, desc, count } from 'drizzle-orm';
import { NotFoundError, ConflictError } from './utils/errors.js';

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  return await db.select().from(paymentMethod).orderBy(desc(paymentMethod.createdAt));
}

export async function getPaymentMethod(id: string): Promise<PaymentMethod | undefined> {
  const [result] = await db.select().from(paymentMethod).where(eq(paymentMethod.paymentMethodId, id));
  return result || undefined;
}

export async function createPaymentMethod(insertPaymentMethod: InsertPaymentMethod): Promise<PaymentMethod> {
  const [newPaymentMethod] = await db
    .insert(paymentMethod)
    .values({
      name: insertPaymentMethod.name || "",
      active: insertPaymentMethod.active || "true",
    })
    .returning();
  return newPaymentMethod;
}

export async function updatePaymentMethod(
  id: string,
  updatePaymentMethod: Partial<InsertPaymentMethod>
): Promise<PaymentMethod> {
  const [existingPaymentMethod] = await db
    .select()
    .from(paymentMethod)
    .where(eq(paymentMethod.paymentMethodId, id));

  if (!existingPaymentMethod) {
    throw new NotFoundError('Payment Method', id);
  }

  const [updatedPaymentMethod] = await db
    .update(paymentMethod)
    .set({
      ...(updatePaymentMethod.name !== undefined && { name: updatePaymentMethod.name }),
      ...(updatePaymentMethod.active !== undefined && { active: updatePaymentMethod.active }),
    })
    .where(eq(paymentMethod.paymentMethodId, id))
    .returning();

  return updatedPaymentMethod;
}

export async function deletePaymentMethod(id: string): Promise<void> {
  const [existingPaymentMethod] = await db
    .select()
    .from(paymentMethod)
    .where(eq(paymentMethod.paymentMethodId, id));

  if (!existingPaymentMethod) {
    throw new NotFoundError('Payment Method', id);
  }

  // Check if payment method is referenced by any payments
  const [paymentCount] = await db
    .select({ count: count() })
    .from(clientPayment)
    .where(eq(clientPayment.paymentMethod, existingPaymentMethod.name || ""));

  if (paymentCount.count > 0) {
    throw new ConflictError(`Cannot delete payment method: used in ${paymentCount.count} payments`);
  }

  await db.delete(paymentMethod).where(eq(paymentMethod.paymentMethodId, id));
}