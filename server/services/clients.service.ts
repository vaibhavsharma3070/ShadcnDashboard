/**
 * Client service - handles all client-related database operations
 */

import { db } from '../db.js';
import { client, clientPayment, installmentPlan, type Client, type InsertClient } from '@shared/schema';
import { eq, desc, count } from 'drizzle-orm';
import { NotFoundError, ConflictError } from './utils/errors.js';

export async function getClients(): Promise<Client[]> {
  return await db.select().from(client).orderBy(desc(client.createdAt));
}

export async function getClient(id: string): Promise<Client | undefined> {
  const [result] = await db.select().from(client).where(eq(client.clientId, id));
  return result || undefined;
}

export async function createClient(insertClient: InsertClient): Promise<Client> {
  const [newClient] = await db
    .insert(client)
    .values({
      name: insertClient.name,
      phone: insertClient.phone,
      email: insertClient.email,
      billingAddr: insertClient.billingAddr,
      idNumber: insertClient.idNumber,
    })
    .returning();
  return newClient;
}

export async function updateClient(id: string, updateClient: Partial<InsertClient>): Promise<Client> {
  const [existingClient] = await db
    .select()
    .from(client)
    .where(eq(client.clientId, id));

  if (!existingClient) {
    throw new NotFoundError('Client', id);
  }

  const [updatedClient] = await db
    .update(client)
    .set({
      ...(updateClient.name !== undefined && { name: updateClient.name }),
      ...(updateClient.phone !== undefined && { phone: updateClient.phone }),
      ...(updateClient.email !== undefined && { email: updateClient.email }),
      ...(updateClient.billingAddr !== undefined && { billingAddr: updateClient.billingAddr }),
      ...(updateClient.idNumber !== undefined && { idNumber: updateClient.idNumber }),
    })
    .where(eq(client.clientId, id))
    .returning();

  return updatedClient;
}

export async function deleteClient(id: string): Promise<void> {
  const [existingClient] = await db
    .select()
    .from(client)
    .where(eq(client.clientId, id));

  if (!existingClient) {
    throw new NotFoundError('Client', id);
  }

  // Check if client has any payments
  const [paymentCount] = await db
    .select({ count: count() })
    .from(clientPayment)
    .where(eq(clientPayment.clientId, id));

  if (paymentCount.count > 0) {
    throw new ConflictError(`Cannot delete client: has ${paymentCount.count} payment records`);
  }

  // Check if client has any installment plans
  const [installmentCount] = await db
    .select({ count: count() })
    .from(installmentPlan)
    .where(eq(installmentPlan.clientId, id));

  if (installmentCount.count > 0) {
    throw new ConflictError(`Cannot delete client: has ${installmentCount.count} installment plans`);
  }

  await db.delete(client).where(eq(client.clientId, id));
}