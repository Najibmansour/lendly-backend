/**
 * Use Prisma's Decimal for all money in storage (no float math in DB).
 */
import { Prisma } from '@prisma/client';

/** Convert number to Prisma Decimal for storage (avoids float precision issues). */
export function toDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(String(value));
}

export function toDecimalOrUndefined(value: number | undefined): Prisma.Decimal | undefined {
  if (value === undefined) return undefined;
  return new Prisma.Decimal(String(value));
}
