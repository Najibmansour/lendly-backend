import { PricingUnit } from '@prisma/client';

export type UnitPreference = 'AUTO' | PricingUnit;

export interface QuoteResult {
  listingId: string;
  chosenUnit: PricingUnit;
  quantity: number;
  unitRate: number;
  subtotal: number;
  total: number;
}

export interface ListingRates {
  hourlyRate: number | null;
  dailyRate: number | null;
  weeklyRate: number | null;
  monthlyRate: number | null;
}
