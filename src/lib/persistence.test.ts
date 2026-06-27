import { describe, expect, it } from "vitest";
import { createDocument } from "./model";
import { addDocument, createStore } from "./store";
import { demoDocuments } from "./demo";
import {
  STORAGE_KEY,
  clearStore,
  deserializeStore,
  loadStore,
  saveStore,
  serializeStore,
  type StorageLike,
} from "./persistence";

/** Ein In-Memory-Speicher, der StorageLike erfüllt — kein echter Browser nötig. */
function fakeStorage(initial: Record<string, string> = {}): StorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    map,
    getItem: (key) => (map.has(key) ? (map.get(key) as string) : null),
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

describe("serializeStore / deserializeStore", () => {
  it("ist ein verlustfreier Round-Trip für Dokumente und activeId", () => {
    const store = createStore(demoDocuments());
    const restored = deserializeStore(serializeStore(store));
    expect(restored).not.toBeNull();
    expect(restored?.activeId).toBe(store.activeId);
    expect(restored?.documents).toEqual(store.documents);
  });

  it("liefert null bei ungültigem JSON", () => {
    expect(deserializeStore("{kaputt")).toBeNull();
  });

  it("liefert null, wenn der Rumpf keine documents-Liste hat", () => {
    expect(deserializeStore(JSON.stringify({ activeId: "x" }))).toBeNull();
  });

  it("füllt fehlende Config/Meta eines gespeicherten Dokuments mit Defaults", () => {
    const json = JSON.stringify({
      documents: [{ id: "rechnung-1", type: "rechnung", title: "Alt" }],
      activeId: "rechnung-1",
    });
    const restored = deserializeStore(json);
    expect(restored?.documents[0].config.fontFamily).toBe("helvetica");
    expect(restored?.documents[0].meta.number).toBe("");
    expect(restored?.documents[0].positions).toEqual([]);
  });

  it("verwirft Dokumente mit unbekanntem oder fehlendem Typ", () => {
    const json = JSON.stringify({
      documents: [
        { id: "ok", type: "angebot" },
        { id: "bad", type: "quittung" },
        { id: "none" },
        "nonsense",
      ],
      activeId: "ok",
    });
    const restored = deserializeStore(json);
    expect(restored?.documents.map((doc) => doc.id)).toEqual(["ok"]);
  });

  it("korrigiert eine activeId, die auf kein vorhandenes Dokument zeigt", () => {
    const json = JSON.stringify({
      documents: [{ id: "angebot-1", type: "angebot" }],
      activeId: "weg",
    });
    expect(deserializeStore(json)?.activeId).toBe("angebot-1");
  });

  it("setzt activeId auf null, wenn keine Dokumente übrig sind", () => {
    const json = JSON.stringify({ documents: [], activeId: "x" });
    expect(deserializeStore(json)?.activeId).toBeNull();
  });

  it("rettet ungültige positions zu einem leeren Array", () => {
    const json = JSON.stringify({
      documents: [{ id: "rechnung-1", type: "rechnung", positions: "nope" }],
      activeId: "rechnung-1",
    });
    expect(deserializeStore(json)?.documents[0].positions).toEqual([]);
  });
});

describe("saveStore / loadStore", () => {
  it("schreibt unter dem Storage-Key und liest denselben Store wieder", () => {
    const storage = fakeStorage();
    const store = addDocument(createStore(), "rechnung");
    saveStore(store, storage);
    expect(storage.map.has(STORAGE_KEY)).toBe(true);
    const loaded = loadStore(storage);
    expect(loaded?.documents).toEqual(store.documents);
    expect(loaded?.activeId).toBe(store.activeId);
  });

  it("liefert null, wenn nichts gespeichert ist", () => {
    expect(loadStore(fakeStorage())).toBeNull();
  });

  it("liefert null, wenn kein Speicher verfügbar ist", () => {
    expect(loadStore(null)).toBeNull();
    expect(() => saveStore(createStore(), null)).not.toThrow();
  });

  it("schluckt Schreibfehler, statt zu werfen", () => {
    const broken: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error("voll");
      },
      removeItem: () => {},
    };
    expect(() => saveStore(createStore([createDocument("angebot")]), broken)).not.toThrow();
  });
});

describe("clearStore", () => {
  it("entfernt den gespeicherten Store", () => {
    const storage = fakeStorage();
    saveStore(createStore(demoDocuments()), storage);
    clearStore(storage);
    expect(loadStore(storage)).toBeNull();
  });
});
