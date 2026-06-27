# belegjs — Progress

Neueste oben.

## Done

- **M2 · USt & Formatierung** — `money.ts`: Cent-Mathematik, `computeTotals` (USt je Satz gruppiert, Gruppen-Rundung, aufsteigend sortiert), Kleinunternehmer §19 (keine USt, Gross=Net, Hinweis), deutsche Formatierung (`formatEuro/Number/Quantity/Percent` via Intl de-DE). 12 neue Vitest (22 gesamt) grün, Build ok.
- **M1 · Dokumentmodell + Config** — Typen Angebot/Rechnung/Mahnung (Address, Position in Cent, DocMeta) + DocConfig (Schrift, Footer, Seitenzahl, Ausrichtung, Kleinunternehmer, Form). `createDocument`/`isDocType` mit Defaults & Deep-Copy. 10 Vitest grün, Build ok.
- **M0 · Scaffold** — Vite+TS + DIN-Geometrie (Form A/B) + Editor-Gerüst. 4 Vitest grün, Build ok.
