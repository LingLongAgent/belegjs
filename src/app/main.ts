import { VERSION, createDocument } from "../lib";
import type { BelegDocument } from "../lib";
import { createPreview } from "./preview";

/**
 * Editor bootstrap. M5 wires the live PDF preview (middle column) to a demo
 * document so `npm run dev` shows a real, rendered letter. The surrounding
 * 3-column editor and overview are added in M6/M7.
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
    intro: "Sehr geehrte Frau Muster,\n\nvielen Dank für Ihren Auftrag. Wir berechnen Ihnen die folgenden Leistungen.",
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
  app.innerHTML = `<main class="shell">
    <h1>belegjs <small>v${VERSION}</small></h1>
    <p class="muted">Lebende PDF-Vorschau — der 3-Spalten-Editor folgt.</p>
  </main>`;

  const preview = createPreview();
  app.querySelector(".shell")!.appendChild(preview.element);
  preview.update(demoInvoice());
}
