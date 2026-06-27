import { describe, expect, it } from "vitest";
import { documentToBlob, documentToDataUrl, renderLetter } from "./pdf";
import { createDocument } from "./model";
import type { BelegDocument } from "./model";

/** A fully-populated Rechnung exercising every renderer branch. */
function sampleInvoice(overrides: Partial<BelegDocument> = {}): BelegDocument {
  return createDocument("rechnung", {
    sender: {
      name: "Ling Long",
      street: "Weg 2",
      zip: "20095",
      city: "Hamburg",
    },
    recipient: {
      company: "Muster GmbH",
      name: "Erika Muster",
      street: "Hauptstraße 1",
      zip: "10115",
      city: "Berlin",
    },
    intro: "Sehr geehrte Frau Muster,\n\nvielen Dank für Ihren Auftrag.",
    outro: "Mit freundlichen Grüßen\nLing Long",
    meta: { number: "RE-2026-0001", date: "2026-06-27" },
    config: { ...createDocument("rechnung").config, footer: "Bank · IBAN DE00" },
    ...overrides,
  });
}

describe("renderLetter", () => {
  it("returns a jsPDF instance with one A4 page", () => {
    const pdf = renderLetter(sampleInvoice());
    const pages = pdf.getNumberOfPages();
    expect(pages).toBe(1);
    const size = pdf.internal.pageSize;
    expect(Math.round(size.getWidth())).toBe(210);
    expect(Math.round(size.getHeight())).toBe(297);
  });

  it("does not throw for a minimal, empty document", () => {
    expect(() => renderLetter(createDocument("angebot"))).not.toThrow();
  });

  it("honours every config flag without throwing", () => {
    const justified = sampleInvoice({
      config: {
        fontFamily: "times",
        footer: "",
        showPageNumbers: false,
        alignment: "justify",
        kleinunternehmer: true,
        form: "A",
      },
    });
    expect(() => renderLetter(justified)).not.toThrow();
  });
});

describe("output helpers", () => {
  it("documentToDataUrl returns a PDF data URI", () => {
    const url = documentToDataUrl(sampleInvoice());
    expect(url.startsWith("data:application/pdf")).toBe(true);
    expect(url.length).toBeGreaterThan(100);
  });

  it("documentToBlob returns a non-empty PDF blob", () => {
    const blob = documentToBlob(sampleInvoice());
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toContain("pdf");
    expect(blob.size).toBeGreaterThan(0);
  });
});
