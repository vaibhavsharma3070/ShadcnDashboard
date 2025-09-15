/**
 * Brand service - handles all brand-related database operations
 */

import { db } from '../db.js';
import { brand, item, type Brand, type InsertBrand } from '@shared/schema';
import { eq, desc, count, sql, isNull, and } from 'drizzle-orm';
import { NotFoundError, ConflictError } from './utils/errors.js';

export async function getBrands(): Promise<Brand[]> {
  return await db.select().from(brand).orderBy(desc(brand.createdAt));
}

export async function getBrand(id: string): Promise<Brand | undefined> {
  const [result] = await db.select().from(brand).where(eq(brand.brandId, id));
  return result || undefined;
}

export async function createBrand(insertBrand: InsertBrand): Promise<Brand> {
  const [newBrand] = await db
    .insert(brand)
    .values({
      name: insertBrand.name || "",
      active: insertBrand.active || "true",
    })
    .returning();
  return newBrand;
}

export async function updateBrand(id: string, updateBrand: Partial<InsertBrand>): Promise<Brand> {
  const [existingBrand] = await db
    .select()
    .from(brand)
    .where(eq(brand.brandId, id));

  if (!existingBrand) {
    throw new NotFoundError('Brand', id);
  }

  const [updatedBrand] = await db
    .update(brand)
    .set({
      ...(updateBrand.name !== undefined && { name: updateBrand.name }),
      ...(updateBrand.active !== undefined && { active: updateBrand.active }),
    })
    .where(eq(brand.brandId, id))
    .returning();

  return updatedBrand;
}

export async function deleteBrand(id: string): Promise<void> {
  const [existingBrand] = await db
    .select()
    .from(brand)
    .where(eq(brand.brandId, id));

  if (!existingBrand) {
    throw new NotFoundError('Brand', id);
  }

  // Check if brand is referenced by any items
  const [itemCount] = await db
    .select({ count: count() })
    .from(item)
    .where(eq(item.brandId, id));

  if (itemCount.count > 0) {
    throw new ConflictError(`Cannot delete brand: referenced by ${itemCount.count} items`);
  }

  await db.delete(brand).where(eq(brand.brandId, id));
}

/**
 * Migrate legacy brands from items table
 * Creates brand records for unique brand text values in items
 */
export async function migrateLegacyBrands(): Promise<{
  brandsCreated: number;
  itemsUpdated: number;
  skippedItems: number;
}> {
  let brandsCreated = 0;
  let itemsUpdated = 0;
  let skippedItems = 0;

  // Get all unique brand names from items where brandId is null
  const uniqueBrandNames = await db
    .selectDistinct({ brandName: item.brand })
    .from(item)
    .where(and(isNull(item.brandId), sql`${item.brand} IS NOT NULL AND ${item.brand} != ''`));

  // Create brands for each unique name
  for (const { brandName } of uniqueBrandNames) {
    if (!brandName) continue;

    try {
      // Check if brand already exists
      const [existingBrand] = await db
        .select()
        .from(brand)
        .where(eq(brand.name, brandName));

      let brandId: string;
      if (!existingBrand) {
        // Create new brand
        const [newBrand] = await db
          .insert(brand)
          .values({
            name: brandName,
            active: "true",
          })
          .returning();
        brandId = newBrand.brandId;
        brandsCreated++;
      } else {
        brandId = existingBrand.brandId;
      }

      // Update items with this brand name
      const result = await db
        .update(item)
        .set({ brandId })
        .where(and(eq(item.brand, brandName), isNull(item.brandId)));
      
      itemsUpdated += result.rowCount || 0;
    } catch (error) {
      console.error(`Failed to migrate brand "${brandName}":`, error);
      skippedItems++;
    }
  }

  return { brandsCreated, itemsUpdated, skippedItems };
}