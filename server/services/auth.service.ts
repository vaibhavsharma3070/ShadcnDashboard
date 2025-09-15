/**
 * Auth service - handles all authentication and user-related database operations
 */

import { db } from '../db.js';
import { users, type User, type CreateUserRequest, type UpdateUserRequest } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { NotFoundError } from './utils/errors.js';

export async function getUser(id: string): Promise<User | undefined> {
  const [result] = await db.select().from(users).where(eq(users.id, id));
  return result || undefined;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const [result] = await db.select().from(users).where(eq(users.email, email));
  return result || undefined;
}

export async function createUser(user: CreateUserRequest): Promise<User> {
  const passwordHash = await bcrypt.hash(user.password, 10);
  
  const [newUser] = await db
    .insert(users)
    .values({
      email: user.email,
      name: user.name,
      passwordHash,
      role: user.role || 'readOnly',
      active: user.active !== undefined ? user.active : true,
    })
    .returning();
  
  return newUser;
}

export async function updateUser(id: string, user: UpdateUserRequest): Promise<User> {
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, id));

  if (!existingUser) {
    throw new NotFoundError('User', id);
  }

  const updateData: any = {
    ...(user.email !== undefined && { email: user.email }),
    ...(user.name !== undefined && { name: user.name }),
    ...(user.role !== undefined && { role: user.role }),
    ...(user.active !== undefined && { active: user.active }),
  };

  if (user.password) {
    updateData.passwordHash = await bcrypt.hash(user.password, 10);
  }

  const [updatedUser] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, id))
    .returning();

  return updatedUser;
}

export async function updateLastLogin(id: string): Promise<void> {
  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, id));
}

export async function getUsers(): Promise<User[]> {
  return await db.select().from(users).orderBy(desc(users.createdAt));
}