/**
 * M9 · Persistenz — den Dokumentenbestand im Browser sichern und laden.
 *
 * Problem: Was der Nutzer anlegt und bearbeitet, soll einen Reload überleben.
 * Der natürliche Ort dafür ist `localStorage`. Heikel ist nicht das Schreiben,
 * sondern das Lesen: gespeicherte Daten können veraltet, unvollständig oder
 * (von Hand / durch einen früheren Build) beschädigt sein. Deshalb baut das
 * Deserialisieren jedes Dokument über `createDocument` neu auf — fehlende Config
 * oder Meta bekommt verlässliche Defaults, kaputte Einträge werden verworfen,
 * statt den Editor mit halben Objekten abstürzen zu lassen.
 *
 * Der Speicher ist über ein schmales `StorageLike` injizierbar, damit die Logik
 * ohne echten Browser (und ohne globalen Zustand) getestet werden kann.
 */
import { createDocument } from "./model";
import type { BelegDocument, DocType } from "./model";
import type { DocumentStore } from "./store";

/** Schlüssel im Speicher; die `v1`-Endung erlaubt spätere, saubere Migrationen. */
export const STORAGE_KEY = "belegjs.store.v1";

/** Der von belegjs genutzte Ausschnitt der Web-Storage-API (injizierbar). */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const DOC_TYPES: readonly DocType[] = ["angebot", "rechnung", "mahnung"];

function isDocType(value: unknown): value is DocType {
  return typeof value === "string" && (DOC_TYPES as readonly string[]).includes(value);
}

/**
 * Aus unsicheren, geparsten Daten ein wohlgeformtes Dokument bauen — oder `null`,
 * wenn der Typ fehlt/unbekannt ist. `createDocument` füllt fehlende Config/Meta
 * mit Defaults; Positionen werden nur übernommen, wenn sie wirklich ein Array sind.
 */
function reviveDocument(raw: unknown): BelegDocument | null {
  if (typeof raw !== "object" || raw === null) return null;
  const candidate = raw as Partial<BelegDocument>;
  if (!isDocType(candidate.type)) return null;
  const overrides: Partial<BelegDocument> = { ...candidate };
  if (!Array.isArray(candidate.positions)) overrides.positions = [];
  return createDocument(candidate.type, overrides);
}

/** Den Store als JSON-Text serialisieren (für `localStorage.setItem`). */
export function serializeStore(store: DocumentStore): string {
  return JSON.stringify({ documents: store.documents, activeId: store.activeId });
}

/**
 * JSON-Text zurück in einen Store verwandeln — defensiv: ungültiges JSON oder ein
 * falsch geformter Rumpf ergibt `null`, beschädigte Dokumente werden ausgesiebt,
 * und `activeId` wird auf ein vorhandenes Dokument korrigiert (sonst erstes/null).
 */
export function deserializeStore(json: string): DocumentStore | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const body = parsed as { documents?: unknown; activeId?: unknown };
  if (!Array.isArray(body.documents)) return null;

  const documents = body.documents
    .map(reviveDocument)
    .filter((doc): doc is BelegDocument => doc !== null);

  const wanted = typeof body.activeId === "string" ? body.activeId : null;
  const activeId =
    wanted !== null && documents.some((doc) => doc.id === wanted)
      ? wanted
      : documents.length > 0
        ? documents[0].id
        : null;

  return { documents, activeId };
}

/** Standard-Speicher im Browser; `null`, falls `localStorage` nicht verfügbar ist. */
function browserStorage(): StorageLike | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    // Zugriff auf localStorage kann (z. B. bei strengen Datenschutzeinstellungen) werfen.
    return null;
  }
}

/**
 * Den Store sichern. Schlägt das Schreiben fehl (Speicher voll/gesperrt), wird
 * der Fehler geschluckt — Persistenz ist Komfort, kein Grund die App zu stoppen.
 */
export function saveStore(store: DocumentStore, storage: StorageLike | null = browserStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, serializeStore(store));
  } catch {
    /* Speicher nicht beschreibbar — still ignorieren. */
  }
}

/**
 * Den gesicherten Store laden, oder `null`, wenn nichts (Gültiges) gespeichert ist.
 * Der Aufrufer entscheidet dann, ob er mit Demo-Dokumenten startet.
 */
export function loadStore(storage: StorageLike | null = browserStorage()): DocumentStore | null {
  if (!storage) return null;
  let json: string | null;
  try {
    json = storage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (json === null) return null;
  return deserializeStore(json);
}

/** Den gesicherten Store entfernen (z. B. „alles zurücksetzen"). */
export function clearStore(storage: StorageLike | null = browserStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    /* still ignorieren. */
  }
}
