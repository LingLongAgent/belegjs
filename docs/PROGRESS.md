# belegjs — Progress

Neueste oben.

## Done

- **M4 · Dokumenttypen** — `documents.ts`: reine, getestete typabhängige Inhalte. `buildPositionTable` (Pos./Beschreibung/Menge/Einzelpreis/USt./Gesamt; USt.-Spalte entfällt bei Kleinunternehmer), `buildSummary` (Netto, USt je Satz, fetter Gesamtbetrag; §19-Hinweis; Mahnung: Offener Betrag + Mahngebühr + fette Gesamtforderung), `typeSpecificNote` (Angebot „gültig bis", Rechnung Zahlungsziel, Mahnung-Absatz mit Bezug/Stufe/Forderung/Frist), `buildDocumentContent` rechnet Totals einmal und hält Tabelle/Summe/Notiz konsistent. `pdf.ts` zeichnet jetzt Positionstabelle (Spaltenbreiten, Beschreibungsumbruch), rechtsbündigen Summenblock (fette Beträge, §19-Hinweis) und die Notiz zwischen Intro und Outro. 19 neue Vitest (59 gesamt) grün, Build ok.
- **M3 · PDF-Renderer (jsPDF)** — `layout.ts`: reine, getestete DIN-5008-Textbausteine (`formatDateDE`, `recipientLines`, `senderReturnLine`, `infoBlockRows`, `subjectLine`) — kennt die Anschrift-/Infoblock-Regeln, typabhängige Zeilen (Gültig bis/Fällig am/Mahnstufe), ohne jsPDF. `pdf.ts`: `renderLetter` zeichnet Faltmarken, Anschriftfeld (Rücksendezeile + Empfänger), rechtsbündigen Infoblock, fetten Betreff, umbrochenen Fließtext (Ausrichtung links/Blocksatz), Footer + Seitenzahl — alles aus DocConfig (Schrift, Form A/B). `documentToBlob`/`documentToDataUrl` für Download/Vorschau. 18 neue Vitest (40 gesamt) grün, Build ok. (Positionstabelle folgt in M4.)
- **M2 · USt & Formatierung** — `money.ts`: Cent-Mathematik, `computeTotals` (USt je Satz gruppiert, Gruppen-Rundung, aufsteigend sortiert), Kleinunternehmer §19 (keine USt, Gross=Net, Hinweis), deutsche Formatierung (`formatEuro/Number/Quantity/Percent` via Intl de-DE). 12 neue Vitest (22 gesamt) grün, Build ok.
- **M1 · Dokumentmodell + Config** — Typen Angebot/Rechnung/Mahnung (Address, Position in Cent, DocMeta) + DocConfig (Schrift, Footer, Seitenzahl, Ausrichtung, Kleinunternehmer, Form). `createDocument`/`isDocType` mit Defaults & Deep-Copy. 10 Vitest grün, Build ok.
- **M0 · Scaffold** — Vite+TS + DIN-Geometrie (Form A/B) + Editor-Gerüst. 4 Vitest grün, Build ok.
