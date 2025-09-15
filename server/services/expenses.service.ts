/**
 * Expense service - handles all expense-related database operations
 */

import { db } from '../db.js';
import { itemExpense, item, type ItemExpense, type InsertItemExpense } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { toDbNumeric, toDbDate } from './utils/db-helpers.js';
import { NotFoundError } from './utils/errors.js';

export async function getExpenses(): Promise<Array<ItemExpense & { item: typeof item.$inferSelect }>> {
  const results = await db
    .select()
    .from(itemExpense)
    .innerJoin(item, eq(itemExpense.itemId, item.itemId))
    .orderBy(desc(itemExpense.expenseDate));

  return results.map((row) => ({
    ...row.item_expense,
    item: row.item,
  }));
}

export async function getExpensesByItem(itemId: string): Promise<ItemExpense[]> {
  return await db
    .select()
    .from(itemExpense)
    .where(eq(itemExpense.itemId, itemId))
    .orderBy(desc(itemExpense.expenseDate));
}

export async function createExpense(insertExpense: InsertItemExpense): Promise<ItemExpense> {
  // Verify item exists
  const [existingItem] = await db
    .select()
    .from(item)
    .where(eq(item.itemId, insertExpense.itemId));

  if (!existingItem) {
    throw new NotFoundError('Item', insertExpense.itemId);
  }

  const [newExpense] = await db
    .insert(itemExpense)
    .values({
      itemId: insertExpense.itemId,
      category: insertExpense.category,
      description: insertExpense.description,
      amount: toDbNumeric(insertExpense.amount),
      expenseDate: toDbDate(insertExpense.expenseDate),
    })
    .returning();

  return newExpense;
}