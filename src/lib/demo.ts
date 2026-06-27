/**
 * M9 · Demo-Dokumente — ein realistisch befüllter Beispielsatz.
 *
 * Problem: Beim ersten Start (oder leerem Speicher) soll der Editor nicht mit
 * einer leeren Liste begrüßen, sondern mit einem fertigen, professionell
 * wirkenden Beispiel je Dokumenttyp. So sieht der Nutzer sofort, was belegjs
 * kann, und hat Vorlagen zum Anpassen. Reine Daten, keine Seiteneffekte — die
 * Dokumente sind render- und speicherbereit (gültige IDs, Config, Positionen).
 */
import { createDocument, DEFAULT_CONFIG } from "./model";
import type { Address, BelegDocument, DocConfig } from "./model";

/** Demo-Config: Defaults plus die paar bewusst gesetzten Felder. */
function demoConfig(overrides: Partial<DocConfig>): DocConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

/** Ein gemeinsamer Absender, damit die Beispiele wie aus einer Firma wirken. */
const DEMO_SENDER: Address = {
  name: "Ling Long",
  company: "Ling Long Studio",
  street: "Werkstraße 2",
  zip: "20095",
  city: "Hamburg",
};

const DEMO_RECIPIENT: Address = {
  company: "Muster GmbH",
  name: "Erika Muster",
  street: "Hauptstraße 1",
  zip: "10115",
  city: "Berlin",
};

const DEMO_FOOTER = "Ling Long Studio · IBAN DE00 0000 0000 0000 00 · USt-IdNr. DE000000000";

function demoAngebot(): BelegDocument {
  return createDocument("angebot", {
    id: "angebot-1",
    title: "Angebot Website-Relaunch",
    sender: DEMO_SENDER,
    recipient: DEMO_RECIPIENT,
    intro:
      "Sehr geehrte Frau Muster,\n\nvielen Dank für Ihre Anfrage. Gerne unterbreiten wir Ihnen folgendes Angebot für den Relaunch Ihrer Website.",
    outro: "Wir freuen uns auf Ihre Rückmeldung.\n\nMit freundlichen Grüßen\nLing Long",
    meta: { number: "AN-2026-0007", date: "2026-06-20" },
    validUntil: "2026-07-20",
    positions: [
      { description: "Konzeption & Informationsarchitektur", quantity: 1, unitPriceCents: 120000, taxRatePercent: 19 },
      { description: "Design (Startseite + 4 Unterseiten)", quantity: 1, unitPriceCents: 240000, taxRatePercent: 19 },
      { description: "Umsetzung (Stunden)", quantity: 24, unitPriceCents: 9500, taxRatePercent: 19 },
    ],
    config: demoConfig({ footer: DEMO_FOOTER }),
  });
}

function demoRechnung(): BelegDocument {
  return createDocument("rechnung", {
    id: "rechnung-1",
    title: "Rechnung Beratung Juni",
    sender: DEMO_SENDER,
    recipient: DEMO_RECIPIENT,
    intro:
      "Sehr geehrte Frau Muster,\n\nvielen Dank für Ihren Auftrag. Wir berechnen Ihnen die folgenden Leistungen.",
    outro: "Mit freundlichen Grüßen\nLing Long",
    meta: { number: "RE-2026-0001", date: "2026-06-27" },
    dueDate: "2026-07-14",
    positions: [
      { description: "Beratung", quantity: 2, unitPriceCents: 9000, taxRatePercent: 19 },
      { description: "Konzeption", quantity: 1, unitPriceCents: 45000, taxRatePercent: 19 },
    ],
    config: demoConfig({ footer: DEMO_FOOTER }),
  });
}

function demoMahnung(): BelegDocument {
  return createDocument("mahnung", {
    id: "mahnung-1",
    title: "Zahlungserinnerung RE-2026-0001",
    sender: DEMO_SENDER,
    recipient: DEMO_RECIPIENT,
    intro:
      "Sehr geehrte Frau Muster,\n\nsicher ist es Ihrer Aufmerksamkeit entgangen: die folgende Rechnung ist noch offen.",
    outro: "Mit freundlichen Grüßen\nLing Long",
    meta: { number: "MA-2026-0001", date: "2026-06-27" },
    bezugsRechnung: "RE-2026-0001",
    mahnstufe: 1,
    mahngebuehrCents: 500,
    positions: [
      { description: "Offener Rechnungsbetrag RE-2026-0001", quantity: 1, unitPriceCents: 75600, taxRatePercent: 0 },
    ],
    config: demoConfig({ footer: DEMO_FOOTER, kleinunternehmer: true }),
  });
}

/**
 * Ein vollständiger Beispielsatz: je ein Angebot, eine Rechnung und eine Mahnung.
 * Jeder Aufruf liefert frische, voneinander unabhängige Objekte.
 */
export function demoDocuments(): BelegDocument[] {
  return [demoAngebot(), demoRechnung(), demoMahnung()];
}
