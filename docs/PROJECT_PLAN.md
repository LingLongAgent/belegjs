# belegjs — Projektplan (MVP)

**Produkt:** JS-Bibliothek + interaktiver Editor für Angebote/Rechnungen/Mahnungen
als **DIN-5008-PDF**. Repo: `LingLongAgent/belegjs`. Stack: Vite + TypeScript,
jsPDF (PDF), Vitest (Tests). node_modules ist gitignored → bei Bedarf `npm install`.

## Leitprinzip
Übersicht **intuitiv & professionell**. Editor = 3 Spalten: links/Übersicht,
**Mitte = lebende PDF-Vorschau**, **rechts = Konfiguration** (Schriftart, Footer,
Seitenzahl, Ausrichtung, Kleinunternehmer an/aus …). Inhalte (Empfänger, Positionen,
Texte) direkt editierbar. Jedes Dokument als **PDF herunterladbar**.

## Grundregeln (pro Aufgabe)
- EINEN offenen `[ ]`-Punkt solide umsetzen. KISS, strikt typisiert.
- **Jede Funktion getestet** (Vitest; pure Logik gründlich).
- Gate vor Commit: `npm test` grün UND `npm run build` (tsc + vite) fehlerfrei. Nie rot.
- Commit referenziert den Punkt, **push**, Issue schließen. Haken hier + PROGRESS.md.

## Aufgaben
- [x] M0 · Scaffold — Vite+TS, DIN-Geometrie (Form A/B), Editor-Gerüst, Tests+Build. (4 Tests grün)
- [x] M1 (#1) · Dokumentmodell + Config — Typen für Angebot/Rechnung/Mahnung (Absender, Empfänger, Positionen, Meta) + DocConfig (Schrift, Footer, Seitenzahl, Ausrichtung, Kleinunternehmer, Form). Tests.
- [x] M2 (#2) · USt & Formatierung — Cent-Beträge, USt je Satz, Kleinunternehmer §19 (keine USt + Hinweis), deutsche Zahlen/Währung. Tests.
- [x] M3 (#3) · PDF-Renderer (jsPDF) — DIN-5008-Brief (Anschriftfeld, Infoblock, Betreff, Fließtext, Footer/Seitenzahl, Ausrichtung, Schriftart) aus DocConfig → Blob/DataURL. Tests.
- [ ] M4 (#4) · Dokumenttypen — Angebot (Positionen+Gültigkeit), Rechnung (Positionen+Summen+Zahlungsziel), Mahnung (Rechnungsbezug+Stufe+Gebühr+Frist). Tests.
- [ ] M5 (#5) · Live-Vorschau — A4-„Papier"-Vorschau (skaliert), aktualisiert sich aus Modell+Config (mittlere Spalte). Tests wo möglich.
- [ ] M6 (#6) · 3-Spalten-Editor — Mitte Vorschau, rechts Config-Panel (Schrift/Footer/Seitenzahl/Ausrichtung/Kleinunternehmer), Inhalte editierbar (Empfänger, Positionen, Texte), reaktiver State.
- [ ] M7 (#7) · Übersicht — intuitive, professionelle Dokumentenliste: anlegen/öffnen/duplizieren/löschen, Typ-Badges.
- [ ] M8 (#8) · Download — PDF je Dokument erzeugen + herunterladen.
- [ ] M9 (#9) · Persistenz + Demo — localStorage-Store + Demo-Dokumente, „Neues Dokument"-Flow. Tests.
- [ ] M10 (#10) · Politur — responsive, Empty States, professionelles Design, README (Lib + App), Build/Preview.

## Done-Log
Siehe `docs/PROGRESS.md`.
