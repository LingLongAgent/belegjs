# belegjs

**JS-Bibliothek + interaktiver Editor** für **Angebote, Rechnungen und Mahnungen**
als **PDF nach DIN 5008**. Strikt typisiertes TypeScript, framework-agnostische
Kernbibliothek, Editor mit Vite, PDF via jsPDF, Tests mit Vitest.

## Zwei Teile

### Bibliothek (`src/lib`) — framework-agnostisch
Reine, getestete Logik ohne DOM-Abhängigkeit:

- **`model`** — Dokumentmodell (`BelegDocument`, `Address`, `Position`, `DocMeta`,
  `DocConfig`) plus `createDocument(type, overrides)` mit sicheren Defaults.
- **`geometry`** — DIN-5008-Maße, Formen A/B (Höhe des Anschriftfelds).
- **`money`** — Cent-Mathematik, USt je Satz, Kleinunternehmer §19 UStG,
  deutsche Zahlen-/Währungsformatierung (`computeTotals`, `formatEuro` …).
- **`layout` / `documents`** — DIN-5008-Textbausteine und typabhängige Inhalte
  (Positionstabelle, Summenblock, Notizen).
- **`pdf`** — `documentToBlob(doc)` / `documentToDataUrl(doc)`: rendert das
  Dokument aus seiner `DocConfig` zu einem PDF.
- **`download`** — `downloadDocument(doc)` löst den Datei-Download aus
  (sprechender, dateisystemsicherer Name).
- **`store`** — reine Datenebene für mehrere Dokumente (anlegen/öffnen/
  duplizieren/löschen).
- **`persistence`** — Store über `localStorage` sichern/laden (defensiv:
  fehlende Felder bekommen Defaults, kaputte Einträge werden verworfen).
- **`demo`** — `demoDocuments()`: ein Beispielsatz (Angebot, Rechnung, Mahnung).

```ts
import { createDocument, documentToBlob } from "belegjs";

const rechnung = createDocument("rechnung", {
  recipient: { name: "Erika Muster", city: "Berlin" },
  positions: [{ description: "Beratung", quantity: 2, unitPriceCents: 9000, taxRatePercent: 19 }],
});
const pdf = documentToBlob(rechnung); // → Blob, z. B. zum Speichern/Versenden
```

### Editor (`src/app`) — Vite
Drei Spalten, lebendige Vorschau:

- **Links — Übersicht:** Dokumentenliste mit Typ-Badges; anlegen, öffnen,
  duplizieren, löschen. Empty State, wenn nichts geöffnet ist.
- **Mitte — lebende PDF-Vorschau:** A4-„Blatt", aktualisiert sich bei jeder
  Eingabe.
- **Rechts — Konfiguration:** Schriftart, Footer, Seitenzahl, Ausrichtung,
  DIN-5008-Form, Kleinunternehmerregelung; oben der PDF-Download-Button.

Inhalte (Empfänger, Absender, Positionen, Texte) sind direkt editierbar. Der
Bestand wird automatisch in `localStorage` gespeichert und überlebt den Reload.

## Loslegen
```bash
npm install
npm run dev       # Editor lokal starten (Vite, --host fürs LAN)
```
Dann die angezeigte URL öffnen (Standard http://localhost:5173).

## Entwicklung
```bash
npm test          # Vitest (alle Tests)
npm run build     # tsc --noEmit + vite build (Produktions-Build nach dist/)
npm run preview   # gebauten Editor lokal ausliefern
```

Planung & Fortschritt: `docs/PROJECT_PLAN.md` und `docs/PROGRESS.md`.
