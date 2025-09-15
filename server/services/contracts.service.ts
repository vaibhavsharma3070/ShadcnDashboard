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

    // If items specified, create snapshots
    let itemSnapshots: ContractItemSnapshot[] = [];
    if (insertContract.itemIds && insertContract.itemIds.length > 0) {
      const items = await tx
        .select()
        .from(item)
        .where(inArray(item.itemId, insertContract.itemIds));

      itemSnapshots = items.map(itm => ({
        itemId: itm.itemId,
        title: itm.title || "",
        brand: itm.brand || "",
        model: itm.model || "",
        serialNo: itm.serialNo || "",
        condition: itm.condition || "",
        minCost: itm.minCost || "0",
        maxCost: itm.maxCost || "0",
        minSalesPrice: itm.minSalesPrice || "0",
        maxSalesPrice: itm.maxSalesPrice || "0",
        status: itm.status,
      }));
    }

    // Create the contract
    const [newContract] = await tx
      .insert(contract)
      .values({
        vendorId: insertContract.vendorId,
        templateId: insertContract.templateId,
        content: insertContract.content,
        metadata: insertContract.metadata,
        status: insertContract.status || "draft",
        signedAt: insertContract.signedAt ? toDbTimestamp(insertContract.signedAt) : undefined,
        expiresAt: insertContract.expiresAt ? toDbTimestamp(insertContract.expiresAt) : undefined,
        itemIds: insertContract.itemIds,
        itemSnapshots: itemSnapshots.length > 0 ? itemSnapshots : undefined,
        signatureUrl: insertContract.signatureUrl,
        pdfUrl: insertContract.pdfUrl,
        terms: insertContract.terms,
        commissionPercentage: insertContract.commissionPercentage,
        paymentTermsDays: insertContract.paymentTermsDays,
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

  // If updating items, create new snapshots
  let itemSnapshots: ContractItemSnapshot[] | undefined;
  if (updateContract.itemIds && updateContract.itemIds.length > 0) {
    const items = await db
      .select()
      .from(item)
      .where(inArray(item.itemId, updateContract.itemIds));

    itemSnapshots = items.map(itm => ({
      itemId: itm.itemId,
      title: itm.title || "",
      brand: itm.brand || "",
      model: itm.model || "",
      serialNo: itm.serialNo || "",
      condition: itm.condition || "",
      minCost: itm.minCost || "0",
      maxCost: itm.maxCost || "0",
      minSalesPrice: itm.minSalesPrice || "0",
      maxSalesPrice: itm.maxSalesPrice || "0",
      status: itm.status,
    }));
  }

  const [updatedContract] = await db
    .update(contract)
    .set({
      ...(updateContract.content !== undefined && { content: updateContract.content }),
      ...(updateContract.metadata !== undefined && { metadata: updateContract.metadata }),
      ...(updateContract.status !== undefined && { status: updateContract.status }),
      ...(updateContract.signedAt !== undefined && { signedAt: toDbTimestamp(updateContract.signedAt) }),
      ...(updateContract.expiresAt !== undefined && { expiresAt: toDbTimestamp(updateContract.expiresAt) }),
      ...(updateContract.itemIds !== undefined && { itemIds: updateContract.itemIds }),
      ...(itemSnapshots !== undefined && { itemSnapshots }),
      ...(updateContract.signatureUrl !== undefined && { signatureUrl: updateContract.signatureUrl }),
      ...(updateContract.pdfUrl !== undefined && { pdfUrl: updateContract.pdfUrl }),
      ...(updateContract.terms !== undefined && { terms: updateContract.terms }),
      ...(updateContract.commissionPercentage !== undefined && { commissionPercentage: updateContract.commissionPercentage }),
      ...(updateContract.paymentTermsDays !== undefined && { paymentTermsDays: updateContract.paymentTermsDays }),
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

  if (existingContract.status === "active") {
    throw new Error("Cannot delete an active contract");
  }

  await db.delete(contract).where(eq(contract.contractId, id));
}