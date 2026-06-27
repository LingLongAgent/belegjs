# belegjs

**JS-Bibliothek + Editor** für **Angebote, Rechnungen und Mahnungen** als PDF
nach **DIN 5008**. Zwei Teile:

- **Bibliothek** (`src/lib`, framework-agnostisch, TypeScript): Dokumentmodell,
  DIN-5008-Geometrie, USt/Kleinunternehmer-Logik und ein **jsPDF-Renderer**
  (`renderPdf(doc, config)`).
- **Editor** (`src/app`, Vite): intuitive **Übersicht** der Dokumente und ein
  **3-Spalten-Editor** — mittig die PDF-Vorschau bearbeiten, rechts Konfiguration
  (Schriftart, Footer, Seitenzahl, Ausrichtung, Kleinunternehmerregelung …),
  Inhalte (Empfänger, Positionen, Texte) editierbar. Jedes Dokument als PDF
  herunterladbar.

## Entwicklung
```bash
npm install
npm test          # Vitest
npm run build     # tsc --noEmit + vite build
npm run dev       # Editor lokal (Vite, --host fürs LAN)
```
Status: Gerüst + DIN-Geometrie stehen — siehe `docs/PROJECT_PLAN.md`.
