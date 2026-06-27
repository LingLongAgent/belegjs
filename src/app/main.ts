import { VERSION, createDocument } from "../lib";
import type { BelegDocument } from "../lib";
import { createEditor } from "./editor";

/**
 * Editor bootstrap. M6 mounts the full 3-column editor (content · live preview ·
 * config) on a demo invoice so `npm run dev` opens a real, editable document.
 * The document overview, download and persistence follow in M7–M9.
 */
function demoInvoice(): BelegDocument {
  return createDocument("rechnung", {
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

  const editor = createEditor({ document: demoInvoice() });
  app.appendChild(editor.element);
}
