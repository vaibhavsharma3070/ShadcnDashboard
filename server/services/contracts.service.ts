/**
 * Contract service - handles all contract-related database operations
 */

import { db } from '../db.js';
import { 
  contract, contractTemplate, vendor, item,
  type Contract, type InsertContract, type Vendor, type ContractTemplate, type ContractItemSnapshot
} from '@shared/schema';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { toDbTimestamp } from './utils/db-helpers.js';
import { NotFoundError } from './utils/errors.js';

export async function getContracts(): Promise<Array<Contract & { vendor: Vendor; template?: ContractTemplate }>> {
  const results = await db
    .select()
    .from(contract)
    .innerJoin(vendor, eq(contract.vendorId, vendor.vendorId))
    .leftJoin(contractTemplate, eq(contract.templateId, contractTemplate.templateId))
    .orderBy(desc(contract.createdAt));

  return results.map((row) => ({
    ...row.contract,
    vendor: row.vendor,
    template: row.contract_template || undefined,
  }));
}

export async function getContract(
  id: string
): Promise<(Contract & { vendor: Vendor; template?: ContractTemplate }) | undefined> {
  const results = await db
    .select()
    .from(contract)
    .innerJoin(vendor, eq(contract.vendorId, vendor.vendorId))
    .leftJoin(contractTemplate, eq(contract.templateId, contractTemplate.templateId))
    .where(eq(contract.contractId, id));

  if (results.length === 0) {
    return undefined;
  }

  return {
    ...results[0].contract,
    vendor: results[0].vendor,
    template: results[0].contract_template || undefined,
  };
}

export async function getContractsByVendor(
  vendorId: string
): Promise<Array<Contract & { vendor: Vendor; template?: ContractTemplate }>> {
  const results = await db
    .select()
    .from(contract)
    .innerJoin(vendor, eq(contract.vendorId, vendor.vendorId))
    .leftJoin(contractTemplate, eq(contract.templateId, contractTemplate.templateId))
    .where(eq(contract.vendorId, vendorId))
    .orderBy(desc(contract.createdAt));

  return results.map((row) => ({
    ...row.contract,
    vendor: row.vendor,
    template: row.contract_template || undefined,
  }));
}

export async function createContract(insertContract: InsertContract): Promise<Contract> {
  // Transaction to create contract and update item statuses
  return await db.transaction(async (tx) => {
    // Verify vendor exists
    const [existingVendor] = await tx
      .select()
      .from(vendor)
      .where(eq(vendor.vendorId, insertContract.vendorId));

    if (!existingVendor) {
      throw new NotFoundError('Vendor', insertContract.vendorId);
    }

    // If template specified, verify it exists
    if (insertContract.templateId) {
      const [existingTemplate] = await tx
        .select()
        .from(contractTemplate)
        .where(eq(contractTemplate.templateId, insertContract.templateId));

      if (!existingTemplate) {
        throw new NotFoundError('Contract Template', insertContract.templateId);
      }
    }

    // Use provided itemSnapshots or empty array
    const itemSnapshots = insertContract.itemSnapshots || [];

    // Create the contract
    const [newContract] = await tx
      .insert(contract)
      .values({
        vendorId: insertContract.vendorId,
        templateId: insertContract.templateId,
        status: insertContract.status || "draft",
        termsText: insertContract.termsText || "Términos y condiciones estándar",
        itemSnapshots: itemSnapshots,
      })
      .returning();

    return newContract;
  });
}

export async function updateContract(
  id: string,
  updateContract: Partial<InsertContract>
): Promise<Contract> {
  const [existingContract] = await db
    .select()
    .from(contract)
    .where(eq(contract.contractId, id));

  if (!existingContract) {
    throw new NotFoundError('Contract', id);
  }

  // Use provided itemSnapshots if available
  const itemSnapshots = updateContract.itemSnapshots;

  const [updatedContract] = await db
    .update(contract)
    .set({
      ...(updateContract.vendorId !== undefined && { vendorId: updateContract.vendorId }),
      ...(updateContract.templateId !== undefined && { templateId: updateContract.templateId }),
      ...(updateContract.status !== undefined && { status: updateContract.status }),
      ...(updateContract.termsText !== undefined && { termsText: updateContract.termsText }),
      ...(itemSnapshots !== undefined && { itemSnapshots }),
    })
    .where(eq(contract.contractId, id))
    .returning();

  return updatedContract;
}

export async function deleteContract(id: string): Promise<void> {
  const [existingContract] = await db
    .select()
    .from(contract)
    .where(eq(contract.contractId, id));

  if (!existingContract) {
    throw new NotFoundError('Contract', id);
  }

  if (existingContract.status === "final") {
    throw new Error("Cannot delete a final contract");
  }

  await db.delete(contract).where(eq(contract.contractId, id));
}