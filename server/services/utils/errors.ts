/**
 * Standardized error handling utilities
 */

export class NotFoundError extends Error {
  constructor(entity: string, id?: string) {
    super(id ? `${entity} with id ${id} not found` : `${entity} not found`);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export function handleDatabaseError(error: unknown, context: string): never {
  if (error instanceof Error) {
    if (error.message.includes('violates foreign key constraint')) {
      throw new ConflictError(`Cannot perform operation: ${context} - referenced by other records`);
    }
    if (error.message.includes('duplicate key value')) {
      throw new ConflictError(`Duplicate value error in ${context}`);
    }
    throw error;
  }
  throw new Error(`Unknown error in ${context}`);
}