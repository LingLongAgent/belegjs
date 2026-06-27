/**
 * M10 · Empty State — was die Editor-Fläche zeigt, wenn kein Dokument offen ist.
 *
 * Problem: Löscht der Nutzer alle Dokumente (oder startet mit leerem Speicher),
 * darf die große rechte Fläche nicht einfach leer/grau bleiben — das wirkt wie
 * ein Fehler. Stattdessen begrüßt ein freundlicher Platzhalter mit einer klaren
 * Handlung: ein neues Dokument anlegen. Dieselben drei Typ-Buttons wie in der
 * Übersicht, damit man auch von hier sofort loslegt.
 *
 * Reine DOM-Komponente: sie kennt keinen Store, meldet die Absicht per Callback
 * (`onCreate(type)`) und ist damit ohne App-Zustand testbar.
 */
import { DOC_TYPE_LABEL } from "../lib";
import type { DocType } from "../lib";

const DOC_TYPES = Object.keys(DOC_TYPE_LABEL) as DocType[];

/**
 * Baue den Empty-State-Platzhalter. `onCreate` wird mit dem gewählten Typ
 * aufgerufen, wenn der Nutzer einen der „Neu"-Buttons drückt.
 */
export function createEmptyState(onCreate: (type: DocType) => void): HTMLElement {
  const element = document.createElement("div");
  element.className = "empty-state";

  const card = document.createElement("div");
  card.className = "empty-state__card";

  const heading = document.createElement("h2");
  heading.textContent = "Kein Dokument geöffnet";

  const hint = document.createElement("p");
  hint.className = "empty-state__hint";
  hint.textContent = "Leg ein neues Dokument an, um loszulegen.";

  const actions = document.createElement("div");
  actions.className = "empty-state__actions";
  for (const type of DOC_TYPES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn";
    button.dataset.type = type;
    button.textContent = `+ ${DOC_TYPE_LABEL[type]}`;
    button.addEventListener("click", () => onCreate(type));
    actions.appendChild(button);
  }

  card.append(heading, hint, actions);
  element.appendChild(card);
  return element;
}
