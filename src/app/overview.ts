/**
 * Document overview (M7) — the left column: a professional, intuitive list of
 * all documents with create, open, duplicate and delete actions and type badges.
 *
 * Problem: a user juggling several Angebote/Rechnungen/Mahnungen needs to see
 * them at a glance, switch between them, spin off copies and clean up — without
 * leaving the editor. This component renders the pure `DocumentStore` (M7 lib)
 * as a clickable list and reports user intent through callbacks; it owns no
 * document data itself, so the host stays the single source of truth.
 *
 * Approach: `createOverview` builds the DOM once and exposes `render(store)`,
 * which the host calls after every store change. Each row shows a type badge, the
 * title and the document number, highlights the active document, and carries
 * duplicate/delete buttons. A header offers "+ Angebot / Rechnung / Mahnung".
 * All actions are callbacks (onCreate/onOpen/onDuplicate/onDelete) — the host
 * decides how to mutate the store and re-render. No store math lives here.
 */
import { DOC_TYPE_LABEL } from "../lib";
import type { BelegDocument, DocType, DocumentStore } from "../lib";

/** A mounted overview list. */
export interface OverviewController {
  /** Root element; the host mounts it (typically the left column). */
  readonly element: HTMLElement;
  /** Re-render the list from the given store state. */
  render(store: DocumentStore): void;
}

export interface OverviewOptions {
  /** User asked to create a new document of this type. */
  onCreate(type: DocType): void;
  /** User clicked a row to open that document. */
  onOpen(id: string): void;
  /** User asked to duplicate this document. */
  onDuplicate(id: string): void;
  /** User asked to delete this document. */
  onDelete(id: string): void;
}

const DOC_TYPES = Object.keys(DOC_TYPE_LABEL) as DocType[];

export function createOverview(options: OverviewOptions): OverviewController {
  const element = document.createElement("aside");
  element.className = "overview";

  const header = document.createElement("div");
  header.className = "overview__header";
  const heading = document.createElement("h2");
  heading.textContent = "Dokumente";
  header.appendChild(heading);

  const actions = document.createElement("div");
  actions.className = "overview__new";
  for (const type of DOC_TYPES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn--new";
    button.dataset.type = type;
    button.textContent = `+ ${DOC_TYPE_LABEL[type]}`;
    button.addEventListener("click", () => options.onCreate(type));
    actions.appendChild(button);
  }
  header.appendChild(actions);
  element.appendChild(header);

  const list = document.createElement("div");
  list.className = "overview__list";
  element.appendChild(list);

  function buildRow(doc: BelegDocument, active: boolean): HTMLElement {
    const row = document.createElement("div");
    row.className = active ? "doc-row doc-row--active" : "doc-row";
    row.dataset.id = doc.id;

    const open = document.createElement("button");
    open.type = "button";
    open.className = "doc-row__open";
    open.addEventListener("click", () => options.onOpen(doc.id));

    const badge = document.createElement("span");
    badge.className = `badge badge--${doc.type}`;
    badge.textContent = DOC_TYPE_LABEL[doc.type];

    const texts = document.createElement("span");
    texts.className = "doc-row__texts";
    const title = document.createElement("span");
    title.className = "doc-row__title";
    title.textContent = doc.title || DOC_TYPE_LABEL[doc.type];
    const number = document.createElement("span");
    number.className = "doc-row__number";
    number.textContent = doc.meta.number || "ohne Nummer";
    texts.append(title, number);

    open.append(badge, texts);
    row.appendChild(open);

    const tools = document.createElement("div");
    tools.className = "doc-row__tools";
    const duplicate = document.createElement("button");
    duplicate.type = "button";
    duplicate.className = "icon-btn doc-row__duplicate";
    duplicate.title = "Duplizieren";
    duplicate.textContent = "⧉";
    duplicate.addEventListener("click", () => options.onDuplicate(doc.id));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "icon-btn doc-row__delete";
    remove.title = "Löschen";
    remove.textContent = "🗑";
    remove.addEventListener("click", () => options.onDelete(doc.id));
    tools.append(duplicate, remove);
    row.appendChild(tools);

    return row;
  }

  function render(store: DocumentStore): void {
    list.replaceChildren();
    if (store.documents.length === 0) {
      const empty = document.createElement("p");
      empty.className = "overview__empty";
      empty.textContent = "Noch keine Dokumente. Lege oben eines an.";
      list.appendChild(empty);
      return;
    }
    for (const doc of store.documents) {
      list.appendChild(buildRow(doc, doc.id === store.activeId));
    }
  }

  return { element, render };
}
