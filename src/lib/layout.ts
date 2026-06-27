/**
 * Pure layout helpers for the DIN-5008 letter — the "what text goes where"
 * decisions, kept free of jsPDF so they can be unit-tested directly.
 *
 * Problem: a DIN-5008 business letter has a fixed information architecture
 * (return line + recipient block in the Anschriftfeld, a right-aligned info
 * block, a Betreff, then the flowing body). Which lines appear depends on the
 * data (a private recipient has no company; a Mahnung shows a Mahnstufe an
 * Angebot does not). This module turns a `BelegDocument` into ready-to-draw
 * strings; `pdf.ts` only positions and prints them.
 */
import type { Address, BelegDocument } from "./model";
import { DOC_TYPE_LABEL } from "./model";

/** A labelled row of the right-hand info block, e.g. { label: "Datum", value: "27.06.2026" }. */
export interface InfoRow {
  label: string;
  value: string;
}

/**
 * Convert an ISO date (YYYY-MM-DD) to German notation (DD.MM.YYYY). Returns the
 * input unchanged if it is not a well-formed ISO date, so a half-typed value in
 * the editor never throws during live preview.
 */
export function formatDateDE(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const [, year, month, day] = match;
  return `${day}.${month}.${year}`;
}

/**
 * The recipient block (Anschriftzone) as individual lines, in DIN-5008 order:
 * company, person/name, street, "zip city", country. Empty fields are dropped
 * so no blank lines appear. `street` is preferred over the generic `line1`.
 */
export function recipientLines(address: Address): string[] {
  const cityLine = [address.zip, address.city].filter(Boolean).join(" ").trim();
  return [
    address.company,
    address.name,
    address.street ?? address.line1,
    cityLine,
    address.country,
  ].filter((line): line is string => Boolean(line && line.trim()));
}

/**
 * The small return-address line printed above the recipient block (the line
 * shown through a window envelope). Joins the sender's key parts with " · ".
 * Returns an empty string when the sender has no name.
 */
export function senderReturnLine(address: Address): string {
  const cityLine = [address.zip, address.city].filter(Boolean).join(" ").trim();
  return [address.name, address.street ?? address.line1, cityLine]
    .filter((part) => part && part.trim())
    .join(" · ");
}

/**
 * Rows of the right-hand info block. Always shows the document number and date;
 * adds the customer reference and the type-specific date/level when present
 * (Angebot → "Gültig bis", Rechnung → "Fällig am", Mahnung → "Mahnstufe").
 */
export function infoBlockRows(doc: BelegDocument): InfoRow[] {
  const rows: InfoRow[] = [];
  if (doc.meta.number) {
    rows.push({ label: `${DOC_TYPE_LABEL[doc.type]}-Nr.`, value: doc.meta.number });
  }
  if (doc.meta.date) {
    rows.push({ label: "Datum", value: formatDateDE(doc.meta.date) });
  }
  if (doc.meta.reference) {
    rows.push({ label: "Ihr Zeichen", value: doc.meta.reference });
  }
  if (doc.type === "angebot" && doc.validUntil) {
    rows.push({ label: "Gültig bis", value: formatDateDE(doc.validUntil) });
  }
  if (doc.type === "rechnung" && doc.dueDate) {
    rows.push({ label: "Fällig am", value: formatDateDE(doc.dueDate) });
  }
  if (doc.type === "mahnung" && doc.mahnstufe) {
    rows.push({ label: "Mahnstufe", value: String(doc.mahnstufe) });
  }
  return rows;
}

/**
 * The Betreff (subject) line. Uses the document title and number when a number
 * exists ("Rechnung Nr. RE-2026-0001"), otherwise just the title. A Mahnung
 * appends the referenced invoice if known.
 */
export function subjectLine(doc: BelegDocument): string {
  const base = doc.meta.number
    ? `${doc.title} Nr. ${doc.meta.number}`
    : doc.title;
  if (doc.type === "mahnung" && doc.bezugsRechnung) {
    return `${base} zur Rechnung ${doc.bezugsRechnung}`;
  }
  return base;
}
