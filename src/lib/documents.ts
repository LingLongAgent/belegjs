/**
 * Document-type content for belegjs — the parts that differ between an Angebot,
 * a Rechnung and a Mahnung, kept pure so they can be unit-tested without jsPDF.
 *
 * Problem: M3 renders the DIN-5008 letter frame and the flowing body, but the
 * substance of each document type lives between intro and outro and differs by
 * kind:
 *   - Angebot   — a position table, totals, and a validity note ("Gültig bis").
 *   - Rechnung  — a position table, totals, and a payment note ("Zahlungsziel").
 *   - Mahnung   — a reference to the open invoice, the dunning level, an added
 *                 Mahngebühr, the resulting Gesamtforderung and a new deadline.
 *
 * This module turns a `BelegDocument` (plus the money totals from M2) into
 * ready-to-draw structures — a column-aligned position table, a list of summary
 * rows, and the type-specific closing sentence(s). `pdf.ts` only positions and
 * prints them; all of the "which lines, which amounts, which wording" decisions
 * are made — and tested — here.
 */
import { formatDateDE } from "./layout";
import {
  computeTotals,
  formatEuro,
  formatPercent,
  formatQuantity,
  KLEINUNTERNEHMER_HINWEIS,
  lineNetCents,
  type DocumentTotals,
} from "./money";
import type { BelegDocument } from "./model";

/** Horizontal alignment of a table column. */
export type ColumnAlign = "left" | "right";

/**
 * A printable position table: parallel `headers`/`aligns` arrays describe the
 * columns, and each row in `rows` holds one pre-formatted cell string per
 * column. The USt. column is dropped entirely for a Kleinunternehmer document
 * (`showTax === false`), so the table never shows an empty or "0 %" tax column.
 */
export interface PositionTable {
  showTax: boolean;
  headers: string[];
  aligns: ColumnAlign[];
  rows: string[][];
}

/**
 * Build the position table for a document. Quantities, prices and line totals
 * are formatted the German way; the line total is quantity × unit price rounded
 * to the cent (the same `lineNetCents` the totals use, so table and summary can
 * never disagree). The tax column appears only when VAT is actually charged.
 */
export function buildPositionTable(doc: BelegDocument): PositionTable {
  const showTax = !doc.config.kleinunternehmer;
  const headers = showTax
    ? ["Pos.", "Beschreibung", "Menge", "Einzelpreis", "USt.", "Gesamt"]
    : ["Pos.", "Beschreibung", "Menge", "Einzelpreis", "Gesamt"];
  const aligns: ColumnAlign[] = showTax
    ? ["right", "left", "right", "right", "right", "right"]
    : ["right", "left", "right", "right", "right"];

  const rows = doc.positions.map((position, index) => {
    const cells = [
      String(index + 1),
      position.description,
      formatQuantity(position.quantity),
      formatEuro(position.unitPriceCents),
    ];
    if (showTax) cells.push(formatPercent(position.taxRatePercent));
    cells.push(formatEuro(lineNetCents(position)));
    return cells;
  });

  return { showTax, headers, aligns, rows };
}

/** One label/value line of the totals summary, e.g. "Nettobetrag" → "180,00 €". */
export interface SummaryRow {
  label: string;
  value: string;
  /** Emphasised rows (the final amount payable) are drawn bold by the renderer. */
  emphasised?: boolean;
}

/**
 * The money block shown under the position table.
 *
 * `rows` are the label/value lines (net, VAT per rate, gross, and for a Mahnung
 * the Mahngebühr and the resulting Gesamtforderung). `totalDueCents` is the
 * single amount the recipient must actually pay — the gross, plus the dunning
 * fee for a Mahnung. `kleinunternehmerHinweis` carries the §19 notice when VAT
 * is waived (otherwise `null`), so the renderer prints it once, in the right
 * place, without re-deriving the rule.
 */
export interface DocumentSummary {
  rows: SummaryRow[];
  totalDueCents: number;
  kleinunternehmerHinweis: string | null;
}

/**
 * Build the totals summary for a document from its computed money totals.
 *
 * Normal case: net, one "zzgl. X % USt" line per rate group, then a bold
 * "Gesamtbetrag" gross. Kleinunternehmer: a single bold "Gesamtbetrag" (net ==
 * gross) plus the §19 notice. A Mahnung additionally lists the open gross as
 * "Offener Betrag", the "Mahngebühr", and a bold "Gesamtforderung" that adds the
 * fee — which is also the amount due.
 */
export function buildSummary(
  doc: BelegDocument,
  totals: DocumentTotals,
): DocumentSummary {
  const rows: SummaryRow[] = [];
  const isMahnung = doc.type === "mahnung";
  const feeCents = isMahnung ? doc.mahngebuehrCents ?? 0 : 0;
  const grossLabel = isMahnung ? "Offener Betrag" : "Gesamtbetrag";

  if (totals.kleinunternehmer) {
    rows.push({
      label: grossLabel,
      value: formatEuro(totals.grossCents),
      emphasised: !isMahnung,
    });
  } else {
    rows.push({ label: "Nettobetrag", value: formatEuro(totals.netCents) });
    for (const group of totals.taxGroups) {
      rows.push({
        label: `zzgl. ${formatPercent(group.ratePercent)} USt.`,
        value: formatEuro(group.taxCents),
      });
    }
    rows.push({
      label: grossLabel,
      value: formatEuro(totals.grossCents),
      emphasised: !isMahnung,
    });
  }

  const totalDueCents = totals.grossCents + feeCents;
  if (isMahnung) {
    rows.push({ label: "Mahngebühr", value: formatEuro(feeCents) });
    rows.push({
      label: "Gesamtforderung",
      value: formatEuro(totalDueCents),
      emphasised: true,
    });
  }

  return {
    rows,
    totalDueCents,
    kleinunternehmerHinweis: totals.kleinunternehmer
      ? KLEINUNTERNEHMER_HINWEIS
      : null,
  };
}

/** German ordinal label for a dunning level, e.g. 1 → "1. Mahnung". */
export function mahnstufeLabel(stufe: number): string {
  return `${stufe}. Mahnung`;
}

/**
 * The type-specific closing sentence(s) printed below the summary, before the
 * outro. Empty string when nothing applies (e.g. an Angebot without a validity
 * date), so the renderer can simply skip a blank note.
 *
 * - Angebot:  validity note, when `validUntil` is set.
 * - Rechnung: payment request naming the gross and the due date, when `dueDate`
 *             is set.
 * - Mahnung:  references the open invoice, states the level, and asks for the
 *             Gesamtforderung (incl. fee) by the new deadline (`dueDate`).
 */
export function typeSpecificNote(
  doc: BelegDocument,
  summary: DocumentSummary,
): string {
  switch (doc.type) {
    case "angebot":
      return doc.validUntil
        ? `Dieses Angebot ist gültig bis zum ${formatDateDE(doc.validUntil)}.`
        : "";
    case "rechnung":
      return doc.dueDate
        ? `Bitte überweisen Sie den Gesamtbetrag bis zum ${formatDateDE(
            doc.dueDate,
          )}.`
        : "";
    case "mahnung":
      return buildMahnungNote(doc, summary);
  }
}

/**
 * Compose the dunning paragraph. Built from the parts that are present so a
 * half-filled Mahnung in the live editor still yields a sensible sentence:
 * the invoice reference, the dunning level, the total claim (incl. fee) and the
 * new payment deadline are each woven in only when known.
 */
function buildMahnungNote(doc: BelegDocument, summary: DocumentSummary): string {
  const level = doc.mahnstufe ? mahnstufeLabel(doc.mahnstufe) : "Mahnung";
  const invoice = doc.bezugsRechnung
    ? `unsere Rechnung ${doc.bezugsRechnung}`
    : "die offene Rechnung";

  const sentences = [
    `wir weisen Sie mit dieser ${level} darauf hin, dass ${invoice} bis heute nicht beglichen wurde.`,
  ];

  const claim = formatEuro(summary.totalDueCents);
  if (doc.dueDate) {
    sentences.push(
      `Bitte begleichen Sie die Gesamtforderung von ${claim} bis zum ${formatDateDE(
        doc.dueDate,
      )}.`,
    );
  } else {
    sentences.push(
      `Bitte begleichen Sie die Gesamtforderung von ${claim} umgehend.`,
    );
  }

  return sentences.join(" ");
}

/**
 * One call that assembles every type-specific piece a renderer or preview needs:
 * the money totals, the position table, the summary block and the closing note.
 * Keeps the totals computed exactly once and shared, so table, summary and note
 * are guaranteed consistent.
 */
export interface DocumentContent {
  totals: DocumentTotals;
  table: PositionTable;
  summary: DocumentSummary;
  note: string;
}

/** Build the full type-specific content of a document in one consistent pass. */
export function buildDocumentContent(doc: BelegDocument): DocumentContent {
  const totals = computeTotals(doc.positions, doc.config.kleinunternehmer);
  const table = buildPositionTable(doc);
  const summary = buildSummary(doc, totals);
  const note = typeSpecificNote(doc, summary);
  return { totals, table, summary, note };
}
