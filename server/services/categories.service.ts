/**
 * Category service - handles all category-related database operations
 */

import { db } from '../db.js';
import { category, item, type Category, type InsertCategory } from '@shared/schema';
import { eq, desc, count } from 'drizzle-orm';
import { NotFoundError, ConflictError } from './utils/errors.js';

export async function getCategories(): Promise<Category[]> {
  return await db.select().from(category).orderBy(desc(category.createdAt));
}

export async function getCategory(id: string): Promise<Category | undefined> {
  const [result] = await db.select().from(category).where(eq(category.categoryId, id));
  return result || undefined;
}

export async function createCategory(insertCategory: InsertCategory): Promise<Category> {
  const [newCategory] = await db
    .insert(category)
    .values({
      name: insertCategory.name || "",
      active: insertCategory.active || "true",
    })
    .returning();
  return newCategory;
}

export async function updateCategory(
  id: string,
  updateCategory: Partial<InsertCategory>
): Promise<Category> {
  const [existingCategory] = await db
    .select()
    .from(category)
    .where(eq(category.categoryId, id));

  if (!existingCategory) {
    throw new NotFoundError('Category', id);
  }

  const [updatedCategory] = await db
    .update(category)
    .set({
      ...(updateCategory.name !== undefined && { name: updateCategory.name }),
      ...(updateCategory.active !== undefined && { active: updateCategory.active }),
    })
    .where(eq(category.categoryId, id))
    .returning();

  return updatedCategory;
}

export async function deleteCategory(id: string): Promise<void> {
  const [existingCategory] = await db
    .select()
    .from(category)
    .where(eq(category.categoryId, id));

  if (!existingCategory) {
    throw new NotFoundError('Category', id);
  }

  // Check if category is referenced by any items
  const [itemCount] = await db
    .select({ count: count() })
    .from(item)
    .where(eq(item.categoryId, id));

  if (itemCount.count > 0) {
    throw new ConflictError(`Cannot delete category: referenced by ${itemCount.count} items`);
  }

  await db.delete(category).where(eq(category.categoryId, id));
}