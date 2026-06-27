import { describe, expect, it } from "vitest";
import {
  createDocument,
  isDocType,
  DEFAULT_CONFIG,
  DOC_TYPE_LABEL,
  type BelegDocument,
} from "./model";

describe("document model", () => {
  it("creates a well-formed document for each type", () => {
    for (const type of ["angebot", "rechnung", "mahnung"] as const) {
      const doc = createDocument(type);
      expect(doc.type).toBe(type);
      expect(doc.title).toBe(DOC_TYPE_LABEL[type]);
      expect(doc.positions).toEqual([]);
      expect(doc.sender.name).toBe("");
      expect(doc.recipient.name).toBe("");
      expect(doc.config).toEqual(DEFAULT_CONFIG);
      expect(doc.meta).toEqual({ number: "", date: "" });
    }
  });

  it("applies overrides without mutating the defaults", () => {
    const doc = createDocument("rechnung", {
      recipient: { name: "Acme GmbH", city: "Berlin" },
      positions: [{ description: "Beratung", quantity: 2, unitPriceCents: 9000, taxRatePercent: 19 }],
    });
    expect(doc.recipient.name).toBe("Acme GmbH");
    expect(doc.positions).toHaveLength(1);
    // DEFAULT_CONFIG must be untouched by the override above.
    expect(DEFAULT_CONFIG.kleinunternehmer).toBe(false);
  });

  it("merges partial config and meta over the defaults", () => {
    const doc = createDocument("rechnung", {
      config: { kleinunternehmer: true } as BelegDocument["config"],
      meta: { number: "RE-1" } as BelegDocument["meta"],
    });
    expect(doc.config.kleinunternehmer).toBe(true);
    // Untouched config keys keep their defaults.
    expect(doc.config.form).toBe(DEFAULT_CONFIG.form);
    expect(doc.config.fontFamily).toBe(DEFAULT_CONFIG.fontFamily);
    expect(doc.meta.number).toBe("RE-1");
    expect(doc.meta.date).toBe("");
  });

  it("does not share config references between documents", () => {
    const a = createDocument("angebot");
    const b = createDocument("angebot");
    a.config.kleinunternehmer = true;
    expect(b.config.kleinunternehmer).toBe(false);
  });

  it("recognises the document kind via the type guard", () => {
    const doc = createDocument("mahnung");
    expect(isDocType(doc, "mahnung")).toBe(true);
    expect(isDocType(doc, "rechnung")).toBe(false);
  });

  it("carries type-specific fields when provided", () => {
    const angebot = createDocument("angebot", { validUntil: "2026-07-31" });
    const rechnung = createDocument("rechnung", { dueDate: "2026-07-14" });
    const mahnung = createDocument("mahnung", { mahnstufe: 1, mahngebuehrCents: 500 });
    expect(angebot.validUntil).toBe("2026-07-31");
    expect(rechnung.dueDate).toBe("2026-07-14");
    expect(mahnung.mahnstufe).toBe(1);
    expect(mahnung.mahngebuehrCents).toBe(500);
  });
});
