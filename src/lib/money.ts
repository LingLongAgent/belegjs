/**
 * Money math and German formatting for belegjs.
 *
 * Problem: a Rechnung must show net amounts, VAT (USt) per rate, and a gross
 * total — correct to the cent and presented the German way ("1.234,56 €",
 * "19 %"). Floats drift, so every amount is an integer number of cents and only
 * formatting converts to a human string. VAT is computed per *rate group* (all
 * positions sharing a tax rate are summed, then taxed once) which is the legally
 * expected rounding behaviour on German invoices — taxing each line separately
 * would accumulate rounding errors.
 *
 * §19 UStG (Kleinunternehmer): when enabled, no VAT is charged or shown and the
 * document must carry a notice. `computeTotals` then reports zero tax and a
 * gross equal to the net, and the renderer adds `KLEINUNTERNEHMER_HINWEIS`.
 */
import type { Position } from "./model";

/** Standard §19 UStG small-business notice printed when VAT is waived. */
export const KLEINUNTERNEHMER_HINWEIS =
  "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.";

/** Net/tax/gross subtotal for all positions sharing one VAT rate. */
export interface TaxGroup {
  ratePercent: number;
  netCents: number;
  taxCents: number;
  grossCents: number;
}

/** Full money breakdown of a document's positions. */
export interface DocumentTotals {
  /** Net amount per position, in input order. */
  lineNetCents: number[];
  /** Subtotals per VAT rate, ascending by rate. Empty if kleinunternehmer. */
  taxGroups: TaxGroup[];
  netCents: number;
  taxCents: number;
  grossCents: number;
  /** Whether §19 was applied (no VAT). */
  kleinunternehmer: boolean;
}

/**
 * Net amount of a single position: quantity × unit price, rounded to the cent.
 * Quantities may be fractional (e.g. 1.5 h), so the product is rounded once.
 */
export function lineNetCents(position: Position): number {
  return Math.round(position.quantity * position.unitPriceCents);
}

/**
 * Compute net, VAT-per-rate and gross totals for a set of positions.
 *
 * When `kleinunternehmer` is true no VAT is applied: tax is zero, gross equals
 * net and `taxGroups` is empty. Otherwise positions are grouped by their tax
 * rate, each group's net is summed and taxed once, and groups are returned
 * sorted ascending by rate so the renderer lists "7 %" before "19 %".
 */
export function computeTotals(
  positions: Position[],
  kleinunternehmer: boolean,
): DocumentTotals {
  const lineNets = positions.map(lineNetCents);
  const netCents = lineNets.reduce((sum, cents) => sum + cents, 0);

  if (kleinunternehmer) {
    return {
      lineNetCents: lineNets,
      taxGroups: [],
      netCents,
      taxCents: 0,
      grossCents: netCents,
      kleinunternehmer: true,
    };
  }

  const netByRate = new Map<number, number>();
  positions.forEach((position, index) => {
    const rate = position.taxRatePercent;
    netByRate.set(rate, (netByRate.get(rate) ?? 0) + lineNets[index]);
  });

  const taxGroups: TaxGroup[] = [...netByRate.entries()]
    .sort(([rateA], [rateB]) => rateA - rateB)
    .map(([ratePercent, groupNet]) => {
      const taxCents = Math.round((groupNet * ratePercent) / 100);
      return {
        ratePercent,
        netCents: groupNet,
        taxCents,
        grossCents: groupNet + taxCents,
      };
    });

  const taxCents = taxGroups.reduce((sum, group) => sum + group.taxCents, 0);

  return {
    lineNetCents: lineNets,
    taxGroups,
    netCents,
    taxCents,
    grossCents: netCents + taxCents,
    kleinunternehmer: false,
  };
}

const euroFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

/** Format integer cents as a German euro string, e.g. 123456 → "1.234,56 €". */
export function formatEuro(cents: number): string {
  return euroFormatter.format(cents / 100);
}

/**
 * Format a number the German way (comma decimal, dot thousands) with a fixed
 * number of fraction digits. Used for unit prices shown without a currency
 * symbol and other plain numbers.
 */
export function formatNumber(value: number, fractionDigits = 2): string {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/**
 * Format a quantity for the position table: German notation, no forced decimals
 * (3 → "3", 1.5 → "1,5") but up to three places for fractional hours/units.
 */
export function formatQuantity(quantity: number): string {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(quantity);
}

/**
 * Format a VAT rate for display: a whole percent drops its decimals
 * (19 → "19 %"), a fractional one keeps them (19.5 → "19,5 %").
 */
export function formatPercent(ratePercent: number): string {
  const digits = Number.isInteger(ratePercent) ? 0 : 2;
  return `${formatNumber(ratePercent, digits)} %`;
}
