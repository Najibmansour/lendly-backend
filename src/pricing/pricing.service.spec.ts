import { PricingService } from './pricing.service';
import { PricingUnit } from '@prisma/client';

describe('PricingService', () => {
  let service: PricingService;

  beforeEach(() => {
    service = new PricingService();
  });

  it('computes hourly quote for hourly-only listing', () => {
    const quote = service.computeQuote(
      'listing-1',
      new Date('2026-06-01T10:00:00.000Z'),
      new Date('2026-06-01T13:00:00.000Z'),
      {
        hourlyRate: 10,
        dailyRate: null,
        weeklyRate: null,
      },
    );

    expect(quote.chosenUnit).toBe(PricingUnit.HOUR);
    expect(quote.quantity).toBe(3);
    expect(quote.unitRate).toBe(10);
    expect(quote.subtotal).toBe(30);
    expect(quote.total).toBe(30);
  });

  it('chooses cheapest unit when AUTO preference is used', () => {
    const quote = service.computeQuote(
      'listing-1',
      new Date('2026-06-01T10:00:00.000Z'),
      new Date('2026-06-02T10:00:00.000Z'),
      {
        hourlyRate: 10,
        dailyRate: 80,
        weeklyRate: 400,
      },
    );

    expect(quote.chosenUnit).toBe(PricingUnit.DAY);
    expect(quote.quantity).toBe(1);
    expect(quote.unitRate).toBe(80);
    expect(quote.subtotal).toBe(80);
  });

  it('respects explicit HOUR unit preference even if another unit is cheaper', () => {
    const quote = service.computeQuote(
      'listing-1',
      new Date('2026-06-01T10:00:00.000Z'),
      new Date('2026-06-02T10:00:00.000Z'),
      {
        hourlyRate: 10,
        dailyRate: 80,
        weeklyRate: null,
      },
      'HOUR',
    );

    expect(quote.chosenUnit).toBe(PricingUnit.HOUR);
    expect(quote.quantity).toBe(24);
    expect(quote.unitRate).toBe(10);
    expect(quote.subtotal).toBe(240);
  });

  it('throws when no rates are available', () => {
    expect(() =>
      service.computeQuote(
        'listing-1',
        new Date('2026-06-01T10:00:00.000Z'),
        new Date('2026-06-01T11:00:00.000Z'),
        {
          hourlyRate: null,
          dailyRate: null,
          weeklyRate: null,
        },
      ),
    ).toThrow('Listing has no rates set');
  });
});
