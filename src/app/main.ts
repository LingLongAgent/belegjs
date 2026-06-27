import {
  VERSION,
  addDocument,
  createStore,
  demoDocuments,
  downloadDocument,
  duplicateDocument,
  findDocument,
  loadStore,
  openDocument,
  removeDocument,
  saveStore,
} from "../lib";
import type { BelegDocument, DocType, DocumentStore } from "../lib";
import { createEditor } from "./editor";
import { createOverview } from "./overview";

/**
 * App bootstrap. The left column is a document overview (create/open/duplicate/
 * delete); the active document is edited in the 3-column editor (content · live
 * preview · config). M9 adds persistence: the store is loaded from localStorage
 * on boot (falling back to a demo set on first run) and saved after every change.
 */
const app = document.querySelector<HTMLDivElement>("#app");
if (app) {
  app.innerHTML = `<header class="topbar">
    <h1>belegjs <small>v${VERSION}</small></h1>
    <p class="muted">DIN-5008-Belege — Angebot · Rechnung · Mahnung</p>
  </header>`;

  // First run shows a ready demo set; afterwards the user's own documents return.
  let store: DocumentStore = loadStore() ?? createStore(demoDocuments());

  function activeDocument(): BelegDocument | undefined {
    return store.activeId ? findDocument(store, store.activeId) : undefined;
  }

  const shell = document.createElement("div");
  shell.className = "shell";

  // The editor edits the active document; when none is open we hide it.
  const editorWrap = document.createElement("div");
  editorWrap.className = "shell__editor";
  const editor = createEditor({
    document: activeDocument() ?? demoDocuments()[0],
    onDownload: (doc) => downloadDocument(doc),
    onChange: (doc) => {
      // Keep the store entry current so the overview reflects title/number edits.
      const index = store.documents.findIndex((entry) => entry.id === doc.id);
      if (index >= 0) {
        store.documents[index] = doc;
        overview.render(store);
        saveStore(store);
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
    saveStore(store);
  }

  syncActive();
}
