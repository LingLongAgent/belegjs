import { describe, it, expect } from "vitest";
import type { Position } from "./model";
import {
  KLEINUNTERNEHMER_HINWEIS,
  lineNetCents,
  computeTotals,
  formatEuro,
  formatNumber,
  formatQuantity,
  formatPercent,
} from "./money";

function pos(overrides: Partial<Position> = {}): Position {
  return {
    description: "",
    quantity: 1,
    unitPriceCents: 0,
    taxRatePercent: 19,
    ...overrides,
  };
}

describe("lineNetCents", () => {
  it("multiplies quantity by unit price", () => {
    expect(lineNetCents(pos({ quantity: 3, unitPriceCents: 1000 }))).toBe(3000);
  });

  it("rounds fractional cent products to the nearest cent", () => {
    // 1.5 × 999 = 1498.5 → 1499
    expect(lineNetCents(pos({ quantity: 1.5, unitPriceCents: 999 }))).toBe(1499);
  });
});

describe("computeTotals (regular VAT)", () => {
  it("computes net, tax and gross for a single rate", () => {
    const totals = computeTotals(
      [pos({ quantity: 2, unitPriceCents: 5000, taxRatePercent: 19 })],
      false,
    );
    expect(totals.netCents).toBe(10000);
    expect(totals.taxCents).toBe(1900);
    expect(totals.grossCents).toBe(11900);
    expect(totals.kleinunternehmer).toBe(false);
  });

  it("groups by tax rate and sorts groups ascending", () => {
    const totals = computeTotals(
      [
        pos({ quantity: 1, unitPriceCents: 10000, taxRatePercent: 19 }),
        pos({ quantity: 1, unitPriceCents: 10000, taxRatePercent: 7 }),
        pos({ quantity: 1, unitPriceCents: 5000, taxRatePercent: 19 }),
      ],
      false,
    );
    expect(totals.taxGroups.map((g) => g.ratePercent)).toEqual([7, 19]);
    const [seven, nineteen] = totals.taxGroups;
    expect(seven.netCents).toBe(10000);
    expect(seven.taxCents).toBe(700);
    expect(nineteen.netCents).toBe(15000);
    expect(nineteen.taxCents).toBe(2850);
    expect(totals.netCents).toBe(25000);
    expect(totals.taxCents).toBe(3550);
    expect(totals.grossCents).toBe(28550);
  });

  it("taxes the summed group net once (no per-line rounding drift)", () => {
    // Two lines of 0.10 € at 19 %: group net 20 ct → tax round(3.8)=4 ct,
    // not 2×round(1.9)=4 — here equal, but verify on a drifting case:
    // three lines of 0.03 € → net 9 ct → tax round(1.71)=2 ct,
    // whereas per-line round(0.57)×3 = 0. Group rounding must win.
    const totals = computeTotals(
      [
        pos({ quantity: 1, unitPriceCents: 3, taxRatePercent: 19 }),
        pos({ quantity: 1, unitPriceCents: 3, taxRatePercent: 19 }),
        pos({ quantity: 1, unitPriceCents: 3, taxRatePercent: 19 }),
      ],
      false,
    );
    expect(totals.netCents).toBe(9);
    expect(totals.taxCents).toBe(2);
    expect(totals.grossCents).toBe(11);
  });

  it("exposes per-line net amounts in input order", () => {
    const totals = computeTotals(
      [
        pos({ quantity: 2, unitPriceCents: 100 }),
        pos({ quantity: 1, unitPriceCents: 250 }),
      ],
      false,
    );
    expect(totals.lineNetCents).toEqual([200, 250]);
  });
});

describe("computeTotals (Kleinunternehmer §19)", () => {
  it("charges no VAT and sets gross equal to net", () => {
    const totals = computeTotals(
      [pos({ quantity: 2, unitPriceCents: 5000, taxRatePercent: 19 })],
      true,
    );
    expect(totals.netCents).toBe(10000);
    expect(totals.taxCents).toBe(0);
    expect(totals.grossCents).toBe(10000);
    expect(totals.taxGroups).toEqual([]);
    expect(totals.kleinunternehmer).toBe(true);
  });

  it("exposes the §19 notice text", () => {
    expect(KLEINUNTERNEHMER_HINWEIS).toContain("§ 19");
  });
});

describe("German formatting", () => {
  it("formats euros with thousands dot and decimal comma", () => {
    // Non-breaking space before € — match loosely on the digits and symbol.
    expect(formatEuro(123456)).toMatch(/^1\.234,56\s€$/u);
    expect(formatEuro(0)).toMatch(/^0,00\s€$/u);
  });

  it("formats plain numbers German-style", () => {
    expect(formatNumber(1234.5)).toBe("1.234,50");
    expect(formatNumber(99, 0)).toBe("99");
  });

  it("formats quantities without forcing decimals", () => {
    expect(formatQuantity(3)).toBe("3");
    expect(formatQuantity(1.5)).toBe("1,5");
    expect(formatQuantity(0.25)).toBe("0,25");
  });

  it("formats VAT rates, dropping decimals for whole percents", () => {
    expect(formatPercent(19)).toBe("19 %");
    expect(formatPercent(7)).toBe("7 %");
    expect(formatPercent(19.5)).toBe("19,50 %");
  });
});
