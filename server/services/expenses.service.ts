/**
 * Expense service - handles all expense-related database operations
 */

import { db } from '../db.js';
import { itemExpense, item, type ItemExpense, type InsertItemExpense, type Item } from '@shared/schema';
import { eq, desc, isNull } from 'drizzle-orm';
import { toDbNumeric } from './utils/db-helpers.js';
import { NotFoundError } from './utils/errors.js';

export async function getExpenses(): Promise<Array<ItemExpense & { item: Item | null }>> {
  try {
    const results = await db
      .select({
        expense: itemExpense,
        item: item,
      })
      .from(itemExpense)
      .leftJoin(item, eq(itemExpense.itemId, item.itemId))
      .orderBy(desc(itemExpense.incurredAt));

    return results.map((row) => ({
      ...row.expense,
      item: row.item,
    }));
  } catch (e) {
    console.error("🔥 getExpenses ERROR:", e);
    throw e;
  }
}

export async function getExpensesByItem(itemId: string): Promise<ItemExpense[]> {
  return db
    .select()
    .from(itemExpense)
    .where(eq(itemExpense.itemId, itemId))
    .orderBy(desc(itemExpense.incurredAt));
}

export async function getGeneralExpenses(): Promise<ItemExpense[]> {
  return db
    .select()
    .from(itemExpense)
    .where(isNull(itemExpense.itemId))
    .orderBy(desc(itemExpense.incurredAt));
}

export async function createExpense(insertExpense: InsertItemExpense): Promise<ItemExpense> {
  const [newExpense] = await db
    .insert(itemExpense)
    .values({
      itemId: insertExpense.itemId ?? null,
      expenseType: insertExpense.expenseType,
      amount: toDbNumeric(insertExpense.amount),
      incurredAt: new Date(insertExpense.incurredAt),
      notes: insertExpense.notes ?? "",
    })
    .returning();

  return newExpense;
}

export async function updateExpense(expenseId: string, updateData: Partial<InsertItemExpense>): Promise<ItemExpense> {
  const [updatedExpense] = await db
    .update(itemExpense)
    .set({
      ...(updateData.itemId !== undefined && { itemId: updateData.itemId ?? null }),
      ...(updateData.expenseType && { expenseType: updateData.expenseType }),
      ...(updateData.amount && { amount: toDbNumeric(updateData.amount) }),
      ...(updateData.incurredAt && { incurredAt: new Date(updateData.incurredAt) }),
      ...(updateData.notes !== undefined && { notes: updateData.notes }),
    })
    .where(eq(itemExpense.expenseId, expenseId))
    .returning();

  if (!updatedExpense) {
    throw new NotFoundError("Expense not found");
  }

  return updatedExpense;
}

export async function deleteExpense(expenseId: string): Promise<ItemExpense> {
  const [deletedExpense] = await db
    .delete(itemExpense)
    .where(eq(itemExpense.expenseId, expenseId))
    .returning();

  if (!deletedExpense) {
    throw new NotFoundError("Expense not found");
  }

  return deletedExpense;
}
