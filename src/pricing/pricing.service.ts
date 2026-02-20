import { Injectable } from '@nestjs/common';
import { PricingUnit } from '@prisma/client';
import { QuoteResult, UnitPreference } from './pricing.types';

const MS_PER_HOUR = 3600000;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const DAYS_PER_WEEK = 7;
const DAYS_PER_MONTH = 30;

@Injectable()
export class PricingService {
  /**
   * Compute quote for a listing over [startAt, endAt].
   * Returns chosenUnit, quantity, unitRate, subtotal, total (total = subtotal, no fees).
   */
  computeQuote(
    listingId: string,
    startAt: Date,
    endAt: Date,
    rates: {
      hourlyRate: unknown;
      dailyRate: unknown;
      weeklyRate: unknown;
      monthlyRate: unknown;
    },
    unitPreference?: UnitPreference,
  ): QuoteResult {
    const diffMs = endAt.getTime() - startAt.getTime();
    const durationHours = Math.ceil(diffMs / MS_PER_HOUR);
    const durationDays = Math.ceil(diffMs / MS_PER_DAY);

    const toNum = (v: unknown): number | null =>
      v != null ? Number(v) : null;
    const hourlyRate = toNum(rates.hourlyRate);
    const dailyRate = toNum(rates.dailyRate);
    const weeklyRate = toNum(rates.weeklyRate);
    const monthlyRate = toNum(rates.monthlyRate);

    const candidates: { unit: PricingUnit; quantity: number; unitRate: number; subtotal: number }[] = [];

    if (hourlyRate != null && hourlyRate > 0) {
      candidates.push({
        unit: 'HOUR',
        quantity: durationHours,
        unitRate: hourlyRate,
        subtotal: durationHours * hourlyRate,
      });
    }
    if (dailyRate != null && dailyRate > 0) {
      candidates.push({
        unit: 'DAY',
        quantity: Math.ceil(durationDays),
        unitRate: dailyRate,
        subtotal: Math.ceil(durationDays) * dailyRate,
      });
    }
    if (weeklyRate != null && weeklyRate > 0) {
      candidates.push({
        unit: 'WEEK',
        quantity: Math.ceil(durationDays / DAYS_PER_WEEK),
        unitRate: weeklyRate,
        subtotal: Math.ceil(durationDays / DAYS_PER_WEEK) * weeklyRate,
      });
    }
    if (monthlyRate != null && monthlyRate > 0) {
      candidates.push({
        unit: 'MONTH',
        quantity: Math.ceil(durationDays / DAYS_PER_MONTH),
        unitRate: monthlyRate,
        subtotal: Math.ceil(durationDays / DAYS_PER_MONTH) * monthlyRate,
      });
    }

    if (candidates.length === 0) {
      throw new Error('Listing has no rates set');
    }

    let chosen = candidates[0];
    if (unitPreference && unitPreference !== 'AUTO') {
      const byUnit = candidates.find((c) => c.unit === unitPreference);
      if (byUnit) chosen = byUnit;
    } else {
      chosen = candidates.reduce((a, b) => (a.subtotal < b.subtotal ? a : b));
    }

    return {
      listingId,
      chosenUnit: chosen.unit,
      quantity: chosen.quantity,
      unitRate: chosen.unitRate,
      subtotal: chosen.subtotal,
      total: chosen.subtotal,
    };
  }
}
