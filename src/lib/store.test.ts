import { describe, expect, it } from "vitest";
import { createDocument } from "./model";
import {
  addDocument,
  cloneDocument,
  createStore,
  duplicateDocument,
  findDocument,
  nextDocumentId,
  openDocument,
  removeDocument,
} from "./store";

describe("createStore", () => {
  it("starts empty with nothing active", () => {
    const store = createStore();
    expect(store.documents).toEqual([]);
    expect(store.activeId).toBeNull();
  });

  it("activates the first document when seeded", () => {
    const store = createStore([createDocument("rechnung", { id: "rechnung-1" })]);
    expect(store.activeId).toBe("rechnung-1");
  });

  it("deep-copies seeded documents so callers cannot mutate the store", () => {
    const seed = createDocument("rechnung", {
      id: "rechnung-1",
      positions: [{ description: "A", quantity: 1, unitPriceCents: 100, taxRatePercent: 19 }],
    });
    const store = createStore([seed]);
    seed.positions[0].description = "changed";
    expect(store.documents[0].positions[0].description).toBe("A");
  });
});

describe("nextDocumentId", () => {
  it("uses -1 for an empty set", () => {
    expect(nextDocumentId("angebot", [])).toBe("angebot-1");
  });

  it("picks the lowest free slot per type", () => {
    expect(nextDocumentId("rechnung", ["rechnung-1", "rechnung-3"])).toBe("rechnung-2");
    expect(nextDocumentId("rechnung", ["rechnung-1", "rechnung-2"])).toBe("rechnung-3");
  });

  it("is namespaced by type", () => {
    expect(nextDocumentId("mahnung", ["rechnung-1"])).toBe("mahnung-1");
  });
});

describe("cloneDocument", () => {
  it("produces an independent deep copy", () => {
    const original = createDocument("angebot", {
      sender: { name: "S" },
      recipient: { name: "R" },
      positions: [{ description: "X", quantity: 2, unitPriceCents: 50, taxRatePercent: 7 }],
    });
    const copy = cloneDocument(original);
    copy.recipient.name = "other";
    copy.positions[0].quantity = 99;
    copy.config.kleinunternehmer = true;
    expect(original.recipient.name).toBe("R");
    expect(original.positions[0].quantity).toBe(2);
    expect(original.config.kleinunternehmer).toBe(false);
  });
});

describe("addDocument", () => {
  it("appends a new document and makes it active", () => {
    const store = addDocument(createStore(), "angebot");
    expect(store.documents).toHaveLength(1);
    expect(store.documents[0].type).toBe("angebot");
    expect(store.activeId).toBe("angebot-1");
  });

  it("does not mutate the input store", () => {
    const base = createStore();
    addDocument(base, "rechnung");
    expect(base.documents).toHaveLength(0);
  });

  it("assigns unique ids across additions of the same type", () => {
    let store = createStore();
    store = addDocument(store, "rechnung");
    store = addDocument(store, "rechnung");
    expect(store.documents.map((doc) => doc.id)).toEqual(["rechnung-1", "rechnung-2"]);
  });
});

describe("openDocument", () => {
  it("sets the active id", () => {
    let store = addDocument(addDocument(createStore(), "rechnung"), "angebot");
    store = openDocument(store, "rechnung-1");
    expect(store.activeId).toBe("rechnung-1");
  });

  it("ignores unknown ids", () => {
    const store = addDocument(createStore(), "rechnung");
    expect(openDocument(store, "nope")).toBe(store);
  });
});

describe("duplicateDocument", () => {
  it("inserts a copy after the original and activates it", () => {
    let store = addDocument(addDocument(createStore(), "rechnung"), "angebot");
    store = duplicateDocument(store, "rechnung-1");
    expect(store.documents.map((doc) => doc.id)).toEqual([
      "rechnung-1",
      "rechnung-2",
      "angebot-1",
    ]);
    expect(store.activeId).toBe("rechnung-2");
  });

  it("marks the copy with a Kopie suffix and copies content deeply", () => {
    let store = createStore([
      createDocument("rechnung", {
        id: "rechnung-1",
        title: "Rechnung",
        positions: [{ description: "A", quantity: 1, unitPriceCents: 100, taxRatePercent: 19 }],
      }),
    ]);
    store = duplicateDocument(store, "rechnung-1");
    const copy = findDocument(store, "rechnung-2")!;
    expect(copy.title).toBe("Rechnung (Kopie)");
    copy.positions[0].description = "changed";
    expect(findDocument(store, "rechnung-1")!.positions[0].description).toBe("A");
  });

  it("ignores unknown ids", () => {
    const store = addDocument(createStore(), "rechnung");
    expect(duplicateDocument(store, "nope")).toBe(store);
  });
});

describe("removeDocument", () => {
  it("removes the document", () => {
    let store = addDocument(addDocument(createStore(), "rechnung"), "angebot");
    store = removeDocument(store, "rechnung-1");
    expect(store.documents.map((doc) => doc.id)).toEqual(["angebot-1"]);
  });

  it("moves the active selection to the previous neighbour", () => {
    let store = addDocument(addDocument(addDocument(createStore(), "rechnung"), "angebot"), "mahnung");
    store = openDocument(store, "angebot-1");
    store = removeDocument(store, "angebot-1");
    expect(store.activeId).toBe("rechnung-1");
  });

  it("falls back to the first document when removing the first active one", () => {
    let store = addDocument(addDocument(createStore(), "rechnung"), "angebot");
    store = openDocument(store, "rechnung-1");
    store = removeDocument(store, "rechnung-1");
    expect(store.activeId).toBe("angebot-1");
  });

  it("clears the active id when the store becomes empty", () => {
    let store = addDocument(createStore(), "rechnung");
    store = removeDocument(store, "rechnung-1");
    expect(store.activeId).toBeNull();
    expect(store.documents).toEqual([]);
  });

  it("keeps the active id when removing a non-active document", () => {
    let store = addDocument(addDocument(createStore(), "rechnung"), "angebot");
    store = openDocument(store, "angebot-1");
    store = removeDocument(store, "rechnung-1");
    expect(store.activeId).toBe("angebot-1");
  });

  it("ignores unknown ids", () => {
    const store = addDocument(createStore(), "rechnung");
    expect(removeDocument(store, "nope")).toBe(store);
  });
});
