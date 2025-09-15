/**
 * Vendor service - handles all vendor-related database operations
 */

import { db } from '../db.js';
import { vendor, item, vendorPayout, contract, type Vendor, type InsertVendor } from '@shared/schema';
import { eq, desc, count } from 'drizzle-orm';
import { NotFoundError, ConflictError } from './utils/errors.js';

export async function getVendors(): Promise<Vendor[]> {
  return await db.select().from(vendor).orderBy(desc(vendor.createdAt));
}

export async function getVendor(id: string): Promise<Vendor | undefined> {
  const [result] = await db.select().from(vendor).where(eq(vendor.vendorId, id));
  return result || undefined;
}

export async function createVendor(insertVendor: InsertVendor): Promise<Vendor> {
  const [newVendor] = await db
    .insert(vendor)
    .values({
      name: insertVendor.name,
      phone: insertVendor.phone,
      email: insertVendor.email,
      taxId: insertVendor.taxId,
      bankAccountNumber: insertVendor.bankAccountNumber,
      bankName: insertVendor.bankName,
      accountType: insertVendor.accountType,
    })
    .returning();
  return newVendor;
}

export async function updateVendor(id: string, updateVendor: Partial<InsertVendor>): Promise<Vendor> {
  const [existingVendor] = await db
    .select()
    .from(vendor)
    .where(eq(vendor.vendorId, id));

  if (!existingVendor) {
    throw new NotFoundError('Vendor', id);
  }

  const [updatedVendor] = await db
    .update(vendor)
    .set({
      ...(updateVendor.name !== undefined && { name: updateVendor.name }),
      ...(updateVendor.phone !== undefined && { phone: updateVendor.phone }),
      ...(updateVendor.email !== undefined && { email: updateVendor.email }),
      ...(updateVendor.taxId !== undefined && { taxId: updateVendor.taxId }),
      ...(updateVendor.bankAccountNumber !== undefined && { bankAccountNumber: updateVendor.bankAccountNumber }),
      ...(updateVendor.bankName !== undefined && { bankName: updateVendor.bankName }),
      ...(updateVendor.accountType !== undefined && { accountType: updateVendor.accountType }),
    })
    .where(eq(vendor.vendorId, id))
    .returning();

  return updatedVendor;
}

export async function deleteVendor(id: string): Promise<void> {
  const [existingVendor] = await db
    .select()
    .from(vendor)
    .where(eq(vendor.vendorId, id));

  if (!existingVendor) {
    throw new NotFoundError('Vendor', id);
  }

  // Check if vendor has any items
  const [itemCount] = await db
    .select({ count: count() })
    .from(item)
    .where(eq(item.vendorId, id));

  if (itemCount.count > 0) {
    throw new ConflictError(`Cannot delete vendor: has ${itemCount.count} items`);
  }

  // Check if vendor has any payouts
  const [payoutCount] = await db
    .select({ count: count() })
    .from(vendorPayout)
    .where(eq(vendorPayout.vendorId, id));

  if (payoutCount.count > 0) {
    throw new ConflictError(`Cannot delete vendor: has ${payoutCount.count} payout records`);
  }

  // Check if vendor has any contracts
  const [contractCount] = await db
    .select({ count: count() })
    .from(contract)
    .where(eq(contract.vendorId, id));

  if (contractCount.count > 0) {
    throw new ConflictError(`Cannot delete vendor: has ${contractCount.count} contracts`);
  }

  await db.delete(vendor).where(eq(vendor.vendorId, id));
}