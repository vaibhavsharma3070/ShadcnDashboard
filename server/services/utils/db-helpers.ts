/**
 * Database helper functions for type conversion to match Drizzle's expected types
 */

export function toDbNumeric(v?: number | string | null): string {
  if (v == null) return "0";
  return typeof v === "string" ? v : v.toFixed(2);
}

export function toDbNumericOptional(v?: number | string | null): string | null {
  if (v == null) return null;
  return typeof v === "string" ? v : v.toFixed(2);
}

export function toDbDate(v?: string | Date | null): string {
  if (v == null) return new Date().toISOString().slice(0, 10);
  const d = v instanceof Date ? v : new Date(v);
  return d.toISOString().slice(0, 10);
}

export function toDbDateOptional(v?: string | Date | null): string | null {
  if (v == null) return null;
  const d = v instanceof Date ? v : new Date(v);
  return d.toISOString().slice(0, 10);
}

export function toDbTimestamp(v?: string | Date | null): Date {
  if (v == null) return new Date();
  return v instanceof Date ? v : new Date(v);
}