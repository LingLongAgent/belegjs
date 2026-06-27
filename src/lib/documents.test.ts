import { describe, expect, it } from "vitest";
import {
  buildDocumentContent,
  buildPositionTable,
  buildSummary,
  mahnstufeLabel,
  typeSpecificNote,
} from "./documents";
import { computeTotals } from "./money";
import { createDocument } from "./model";
import type { BelegDocument, Position } from "./model";

/**
 * `Intl` puts a narrow/no-break space before the € sign; normalise it to a plain
 * space so exact string assertions stay readable instead of embedding U+202F.
 */
const norm = (text: string): string => text.replace(/[  ]/gu, " ");
const normRow = (row: string[]): string[] => row.map(norm);

const POSITIONS: Position[] = [
  { description: "Beratung", quantity: 2, unitPriceCents: 9000, taxRatePercent: 19 },
  { description: "Druck (7 %)", quantity: 1, unitPriceCents: 5000, taxRatePercent: 7 },
];

function docWith(
  type: BelegDocument["type"],
  overrides: Partial<BelegDocument> = {},
): BelegDocument {
  return createDocument(type, { positions: POSITIONS, ...overrides });
}

describe("buildPositionTable", () => {
  it("formats each position into German cells with a tax column", () => {
    const table = buildPositionTable(docWith("rechnung"));
    expect(table.showTax).toBe(true);
    expect(table.headers).toEqual([
      "Pos.",
      "Beschreibung",
      "Menge",
      "Einzelpreis",
      "USt.",
      "Gesamt",
    ]);
    expect(table.rows).toHaveLength(2);
    // Pos 1: 2 × 90,00 € @ 19 % → 180,00 €
    expect(normRow(table.rows[0])).toEqual([
      "1",
      "Beratung",
      "2",
      "90,00 €",
      "19 %",
      "180,00 €",
    ]);
    // Pos 2: 1 × 50,00 € @ 7 % → 50,00 €
    expect(normRow(table.rows[1])).toEqual([
      "2",
      "Druck (7 %)",
      "1",
      "50,00 €",
      "7 %",
      "50,00 €",
    ]);
  });

  it("drops the tax column for a Kleinunternehmer document", () => {
    const table = buildPositionTable(
      docWith("rechnung", { config: { kleinunternehmer: true } as BelegDocument["config"] }),
    );
    expect(table.showTax).toBe(false);
    expect(table.headers).toEqual([
      "Pos.",
      "Beschreibung",
      "Menge",
      "Einzelpreis",
      "Gesamt",
    ]);
    expect(normRow(table.rows[0])).toEqual(["1", "Beratung", "2", "90,00 €", "180,00 €"]);
  });

  it("aligns labels left and numbers right, one align per header", () => {
    const table = buildPositionTable(docWith("angebot"));
    expect(table.aligns).toHaveLength(table.headers.length);
    expect(table.aligns[1]).toBe("left"); // Beschreibung
    expect(table.aligns[table.aligns.length - 1]).toBe("right"); // Gesamt
  });

  it("yields no rows for a document without positions", () => {
    expect(buildPositionTable(createDocument("angebot")).rows).toEqual([]);
  });
});

describe("buildSummary", () => {
  it("lists net, one line per VAT rate, and a bold gross", () => {
    const doc = docWith("rechnung");
    const summary = buildSummary(doc, computeTotals(doc.positions, false));
    const labelValue = ({ label, value, emphasised }: (typeof summary.rows)[number]) => ({
      label,
      value: norm(value),
      ...(emphasised ? { emphasised } : {}),
    });
    // Net 230,00 €; VAT groups 7 % (3,50) and 19 % (34,20); gross 267,70 €.
    expect(labelValue(summary.rows[0])).toEqual({ label: "Nettobetrag", value: "230,00 €" });
    expect(labelValue(summary.rows[1])).toEqual({ label: "zzgl. 7 % USt.", value: "3,50 €" });
    expect(labelValue(summary.rows[2])).toEqual({ label: "zzgl. 19 % USt.", value: "34,20 €" });
    expect(labelValue(summary.rows[3])).toEqual({
      label: "Gesamtbetrag",
      value: "267,70 €",
      emphasised: true,
    });
    expect(summary.totalDueCents).toBe(26770);
    expect(summary.kleinunternehmerHinweis).toBeNull();
  });

  it("shows a single gross and the §19 notice for Kleinunternehmer", () => {
    const doc = docWith("rechnung", {
      config: { kleinunternehmer: true } as BelegDocument["config"],
    });
    const summary = buildSummary(doc, computeTotals(doc.positions, true));
    expect(summary.rows).toHaveLength(1);
    expect(summary.rows[0].label).toBe("Gesamtbetrag");
    expect(norm(summary.rows[0].value)).toBe("230,00 €");
    expect(summary.rows[0].emphasised).toBe(true);
    expect(summary.totalDueCents).toBe(23000);
    expect(summary.kleinunternehmerHinweis).toContain("§ 19 UStG");
  });

  it("adds Mahngebühr and a bold Gesamtforderung for a Mahnung", () => {
    const doc = docWith("mahnung", { mahngebuehrCents: 500 });
    const summary = buildSummary(doc, computeTotals(doc.positions, false));
    const labels = summary.rows.map((row) => row.label);
    expect(labels).toContain("Offener Betrag");
    expect(labels).toContain("Mahngebühr");
    const claim = summary.rows[summary.rows.length - 1];
    expect(claim.label).toBe("Gesamtforderung");
    expect(norm(claim.value)).toBe("272,70 €"); // 267,70 € open + 5,00 € fee
    expect(claim.emphasised).toBe(true);
    // The open gross is listed but not emphasised; only the claim is.
    expect(summary.rows.find((row) => row.label === "Offener Betrag")?.emphasised).toBeFalsy();
    expect(summary.totalDueCents).toBe(27270);
  });

  it("treats a missing Mahngebühr as zero", () => {
    const doc = docWith("mahnung");
    const summary = buildSummary(doc, computeTotals(doc.positions, false));
    const fee = summary.rows.find((row) => row.label === "Mahngebühr")?.value ?? "";
    expect(norm(fee)).toBe("0,00 €");
    expect(summary.totalDueCents).toBe(26770);
  });
});

describe("mahnstufeLabel", () => {
  it("renders the German ordinal dunning label", () => {
    expect(mahnstufeLabel(1)).toBe("1. Mahnung");
    expect(mahnstufeLabel(3)).toBe("3. Mahnung");
  });
});

describe("typeSpecificNote", () => {
  it("states the validity date of an Angebot", () => {
    const doc = docWith("angebot", { validUntil: "2026-07-31" });
    const note = typeSpecificNote(doc, buildSummary(doc, computeTotals(doc.positions, false)));
    expect(note).toBe("Dieses Angebot ist gültig bis zum 31.07.2026.");
  });

  it("is empty for an Angebot without a validity date", () => {
    const doc = docWith("angebot");
    expect(typeSpecificNote(doc, buildSummary(doc, computeTotals(doc.positions, false)))).toBe("");
  });

  it("asks for payment by the due date of a Rechnung", () => {
    const doc = docWith("rechnung", { dueDate: "2026-07-14" });
    const note = typeSpecificNote(doc, buildSummary(doc, computeTotals(doc.positions, false)));
    expect(note).toBe("Bitte überweisen Sie den Gesamtbetrag bis zum 14.07.2026.");
  });

  it("composes a Mahnung paragraph with reference, level, claim and deadline", () => {
    const doc = docWith("mahnung", {
      mahnstufe: 2,
      mahngebuehrCents: 500,
      bezugsRechnung: "RE-2026-0001",
      dueDate: "2026-07-10",
    });
    const note = norm(typeSpecificNote(doc, buildSummary(doc, computeTotals(doc.positions, false))));
    expect(note).toContain("2. Mahnung");
    expect(note).toContain("Rechnung RE-2026-0001");
    expect(note).toContain("272,70 €"); // gross + fee
    expect(note).toContain("bis zum 10.07.2026");
  });

  it("falls back to 'umgehend' when a Mahnung has no deadline", () => {
    const doc = docWith("mahnung", { mahnstufe: 1, mahngebuehrCents: 500 });
    const note = typeSpecificNote(doc, buildSummary(doc, computeTotals(doc.positions, false)));
    expect(note).toContain("umgehend");
    expect(note).toContain("die offene Rechnung");
  });
});

describe("buildDocumentContent", () => {
  it("returns consistent totals, table, summary and note in one pass", () => {
    const doc = docWith("rechnung", { dueDate: "2026-07-14" });
    const content = buildDocumentContent(doc);
    expect(content.totals.grossCents).toBe(26770);
    expect(content.table.rows).toHaveLength(2);
    expect(content.summary.totalDueCents).toBe(26770);
    expect(content.note).toContain("14.07.2026");
  });

  it("keeps table line totals and summary net in agreement", () => {
    const doc = docWith("rechnung");
    const content = buildDocumentContent(doc);
    const net = content.summary.rows.find((row) => row.label === "Nettobetrag");
    expect(norm(net?.value ?? "")).toBe("230,00 €");
    // 180,00 € + 50,00 € line totals sum to the 230,00 € net.
    const lastCol = content.table.headers.length - 1;
    expect(norm(content.table.rows[0][lastCol])).toBe("180,00 €");
    expect(norm(content.table.rows[1][lastCol])).toBe("50,00 €");
  });
});
