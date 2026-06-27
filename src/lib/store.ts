/**
 * Document store (M7) — the pure data layer behind the overview list.
 *
 * Problem: the editor edits one document, but a user works with several
 * (Angebote, Rechnungen, Mahnungen) and wants to create, open, duplicate and
 * delete them from an overview. This module owns "the set of documents and which
 * one is open" as plain, framework-agnostic data plus total functions over it.
 * It holds no DOM and no rendering — the overview component (src/app) drives it
 * and reacts to the returned state — so every operation is trivially testable.
 *
 * Operations are pure: they take a store and return a new store, never mutating
 * the input. IDs are generated deterministically from the existing set (no
 * randomness, so tests are stable and a duplicated document gets a clean, unique
 * id like "rechnung-2").
 */
import { createDocument } from "./model";
import type { BelegDocument, DocType } from "./model";

/** The overview's state: all documents and the id of the open one (if any). */
export interface DocumentStore {
  documents: BelegDocument[];
  activeId: string | null;
}

/** An empty store — no documents, nothing open. */
export function createStore(documents: BelegDocument[] = []): DocumentStore {
  return {
    documents: documents.map(cloneDocument),
    activeId: documents.length > 0 ? documents[0].id : null,
  };
}

/**
 * A unique id of the form `<type>-<n>`, picking the lowest n ≥ 1 not already
 * taken. Deterministic (no randomness) so duplicating twice yields -2 then -3.
 */
export function nextDocumentId(type: DocType, takenIds: Iterable<string>): string {
  const taken = new Set(takenIds);
  let n = 1;
  while (taken.has(`${type}-${n}`)) n += 1;
  return `${type}-${n}`;
}

/** Deep-copy a document so store entries never share mutable references. */
export function cloneDocument(doc: BelegDocument): BelegDocument {
  return {
    ...doc,
    sender: { ...doc.sender },
    recipient: { ...doc.recipient },
    positions: doc.positions.map((position) => ({ ...position })),
    meta: { ...doc.meta },
    config: { ...doc.config },
  };
}

/** Look up a document by id, or undefined if it is not in the store. */
export function findDocument(
  store: DocumentStore,
  id: string,
): BelegDocument | undefined {
  return store.documents.find((doc) => doc.id === id);
}

/**
 * Create a fresh document of `type`, append it and make it the active one.
 * Returns the new store; read `activeId` to learn the new document's id.
 */
export function addDocument(
  store: DocumentStore,
  type: DocType,
): DocumentStore {
  const id = nextDocumentId(type, store.documents.map((doc) => doc.id));
  const doc = createDocument(type, { id });
  return {
    documents: [...store.documents, doc],
    activeId: id,
  };
}

/** Mark a document as the open one. Unknown ids leave the store unchanged. */
export function openDocument(store: DocumentStore, id: string): DocumentStore {
  if (!findDocument(store, id)) return store;
  return { ...store, activeId: id };
}

/**
 * Copy a document — new unique id, title suffixed " (Kopie)" — insert it right
 * after the original and make the copy active. Unknown ids leave the store
 * unchanged.
 */
export function duplicateDocument(
  store: DocumentStore,
  id: string,
): DocumentStore {
  const index = store.documents.findIndex((doc) => doc.id === id);
  if (index < 0) return store;
  const original = store.documents[index];
  const copyId = nextDocumentId(original.type, store.documents.map((doc) => doc.id));
  const copy = cloneDocument(original);
  copy.id = copyId;
  copy.title = `${original.title} (Kopie)`;
  const documents = [...store.documents];
  documents.splice(index + 1, 0, copy);
  return { documents, activeId: copyId };
}

/**
 * Remove a document. If the removed one was active, the active selection moves
 * to its neighbour (or null when the store becomes empty). Unknown ids leave the
 * store unchanged.
 */
export function removeDocument(store: DocumentStore, id: string): DocumentStore {
  const index = store.documents.findIndex((doc) => doc.id === id);
  if (index < 0) return store;
  const documents = store.documents.filter((doc) => doc.id !== id);
  let activeId = store.activeId;
  if (store.activeId === id) {
    if (documents.length === 0) {
      activeId = null;
    } else {
      // Prefer the previous neighbour, else the new first document.
      activeId = documents[Math.max(0, index - 1)].id;
    }
  }
  return { documents, activeId };
}
