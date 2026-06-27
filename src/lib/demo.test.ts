import { describe, expect, it } from "vitest";
import { demoDocuments } from "./demo";
import { documentToBlob } from "./pdf";
import { createStore } from "./store";

describe("demoDocuments", () => {
  it("liefert je ein Angebot, eine Rechnung und eine Mahnung", () => {
    const docs = demoDocuments();
    expect(docs.map((doc) => doc.type)).toEqual(["angebot", "rechnung", "mahnung"]);
  });

  it("vergibt eindeutige IDs", () => {
    const ids = demoDocuments().map((doc) => doc.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("liefert bei jedem Aufruf frische, unabhängige Objekte", () => {
    const first = demoDocuments();
    const second = demoDocuments();
    first[0].title = "verändert";
    expect(second[0].title).not.toBe("verändert");
  });

  it("füllt fehlende Config mit Defaults (Schrift gesetzt, Footer aus Override)", () => {
    const [angebot] = demoDocuments();
    expect(angebot.config.fontFamily).toBe("helvetica");
    expect(angebot.config.footer).not.toBe("");
  });

  it("erzeugt für jedes Demo-Dokument ein render-bereites PDF", () => {
    for (const doc of demoDocuments()) {
      const blob = documentToBlob(doc);
      expect(blob.size).toBeGreaterThan(0);
    }
  });

  it("ist als Startbestand eines Stores nutzbar (erstes Dokument aktiv)", () => {
    const store = createStore(demoDocuments());
    expect(store.documents).toHaveLength(3);
    expect(store.activeId).toBe("angebot-1");
  });
});
