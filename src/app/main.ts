import {
  VERSION,
  addDocument,
  createDocument,
  createStore,
  duplicateDocument,
  findDocument,
  openDocument,
  removeDocument,
} from "../lib";
import type { BelegDocument, DocType, DocumentStore } from "../lib";
import { createEditor } from "./editor";
import { createOverview } from "./overview";

/**
 * App bootstrap. M7 adds the document overview (left column): a store of several
 * documents the user can create, open, duplicate and delete, with the active one
 * shown in the 3-column editor (content · live preview · config). Download (M8),
 * persistence (M9) and final polish (M10) follow.
 */
function demoInvoice(): BelegDocument {
  return createDocument("rechnung", {
    id: "rechnung-1",
    sender: { name: "Ling Long", street: "Werkstraße 2", zip: "20095", city: "Hamburg" },
    recipient: {
      company: "Muster GmbH",
      name: "Erika Muster",
      street: "Hauptstraße 1",
      zip: "10115",
      city: "Berlin",
    },
    intro:
      "Sehr geehrte Frau Muster,\n\nvielen Dank für Ihren Auftrag. Wir berechnen Ihnen die folgenden Leistungen.",
    outro: "Mit freundlichen Grüßen\nLing Long",
    meta: { number: "RE-2026-0001", date: "2026-06-27" },
    dueDate: "2026-07-14",
    positions: [
      { description: "Beratung", quantity: 2, unitPriceCents: 9000, taxRatePercent: 19 },
      { description: "Konzeption", quantity: 1, unitPriceCents: 45000, taxRatePercent: 19 },
    ],
    config: { ...createDocument("rechnung").config, footer: "Ling Long · IBAN DE00 0000 0000 0000 00" },
  });
}

const app = document.querySelector<HTMLDivElement>("#app");
if (app) {
  app.innerHTML = `<header class="topbar">
    <h1>belegjs <small>v${VERSION}</small></h1>
    <p class="muted">DIN-5008-Belege — Angebot · Rechnung · Mahnung</p>
  </header>`;

  let store: DocumentStore = createStore([demoInvoice()]);

  function activeDocument(): BelegDocument | undefined {
    return store.activeId ? findDocument(store, store.activeId) : undefined;
  }

  const shell = document.createElement("div");
  shell.className = "shell";

  // The editor edits the active document; when none is open we hide it.
  const editorWrap = document.createElement("div");
  editorWrap.className = "shell__editor";
  const editor = createEditor({
    document: activeDocument() ?? demoInvoice(),
    onChange: (doc) => {
      // Keep the store entry current so the overview reflects title/number edits.
      const index = store.documents.findIndex((entry) => entry.id === doc.id);
      if (index >= 0) {
        store.documents[index] = doc;
        overview.render(store);
      }
    },
  });
  editorWrap.appendChild(editor.element);

  const overview = createOverview({
    onCreate: (type: DocType) => {
      store = addDocument(store, type);
      syncActive();
    },
    onOpen: (id) => {
      store = openDocument(store, id);
      syncActive();
    },
    onDuplicate: (id) => {
      store = duplicateDocument(store, id);
      syncActive();
    },
    onDelete: (id) => {
      store = removeDocument(store, id);
      syncActive();
    },
  });

  shell.append(overview.element, editorWrap);
  app.appendChild(shell);

  /** Reflect the current store: load the active doc into the editor + redraw the list. */
  function syncActive(): void {
    const active = activeDocument();
    if (active) {
      editorWrap.hidden = false;
      editor.setDocument(active);
    } else {
      editorWrap.hidden = true;
    }
    overview.render(store);
  }

  syncActive();
}
