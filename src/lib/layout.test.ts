import { describe, expect, it } from "vitest";
import {
  formatDateDE,
  infoBlockRows,
  recipientLines,
  senderReturnLine,
  subjectLine,
} from "./layout";
import { createDocument } from "./model";
import type { Address } from "./model";

describe("formatDateDE", () => {
  it("converts ISO dates to German notation", () => {
    expect(formatDateDE("2026-06-27")).toBe("27.06.2026");
  });

  it("returns malformed input unchanged (live-typing safety)", () => {
    expect(formatDateDE("2026-6-7")).toBe("2026-6-7");
    expect(formatDateDE("")).toBe("");
  });
});

describe("recipientLines", () => {
  it("lists company, name, street and zip+city in DIN order", () => {
    const address: Address = {
      company: "Muster GmbH",
      name: "Erika Muster",
      street: "Hauptstraße 1",
      zip: "10115",
      city: "Berlin",
    };
    expect(recipientLines(address)).toEqual([
      "Muster GmbH",
      "Erika Muster",
      "Hauptstraße 1",
      "10115 Berlin",
    ]);
  });

  it("drops empty fields so no blank lines appear", () => {
    expect(recipientLines({ name: "Max" })).toEqual(["Max"]);
  });

  it("falls back to line1 when street is absent and keeps country", () => {
    expect(
      recipientLines({ name: "Max", line1: "Postfach 12", country: "Österreich" }),
    ).toEqual(["Max", "Postfach 12", "Österreich"]);
  });
});

describe("senderReturnLine", () => {
  it("joins name, street and city with a middle dot", () => {
    expect(
      senderReturnLine({
        name: "Ling Long",
        street: "Weg 2",
        zip: "20095",
        city: "Hamburg",
      }),
    ).toBe("Ling Long · Weg 2 · 20095 Hamburg");
  });

  it("is empty for an empty address", () => {
    expect(senderReturnLine({ name: "" })).toBe("");
  });
});

describe("infoBlockRows", () => {
  it("always shows number and date, type-labelled", () => {
    const doc = createDocument("rechnung", {
      meta: { number: "RE-1", date: "2026-06-27" },
    });
    expect(infoBlockRows(doc)).toEqual([
      { label: "Rechnung-Nr.", value: "RE-1" },
      { label: "Datum", value: "27.06.2026" },
    ]);
  });

  it("adds the type-specific row for each kind", () => {
    const angebot = createDocument("angebot", {
      meta: { number: "AN-1", date: "2026-06-27" },
      validUntil: "2026-07-31",
    });
    expect(infoBlockRows(angebot)).toContainEqual({
      label: "Gültig bis",
      value: "31.07.2026",
    });

    const mahnung = createDocument("mahnung", {
      meta: { number: "MA-1", date: "2026-06-27" },
      mahnstufe: 2,
    });
    expect(infoBlockRows(mahnung)).toContainEqual({
      label: "Mahnstufe",
      value: "2",
    });
  });

  it("includes the customer reference when present", () => {
    const doc = createDocument("rechnung", {
      meta: { number: "RE-1", date: "2026-06-27", reference: "PO-9" },
    });
    expect(infoBlockRows(doc)).toContainEqual({
      label: "Ihr Zeichen",
      value: "PO-9",
    });
  });
});

describe("subjectLine", () => {
  it("combines title and number", () => {
    const doc = createDocument("rechnung", { meta: { number: "RE-7", date: "" } });
    expect(subjectLine(doc)).toBe("Rechnung Nr. RE-7");
  });

  it("falls back to the title alone without a number", () => {
    const doc = createDocument("angebot");
    expect(subjectLine(doc)).toBe("Angebot");
  });

  it("references the invoice for a Mahnung", () => {
    const doc = createDocument("mahnung", {
      meta: { number: "MA-1", date: "" },
      bezugsRechnung: "RE-7",
    });
    expect(subjectLine(doc)).toBe("Mahnung Nr. MA-1 zur Rechnung RE-7");
  });
});
