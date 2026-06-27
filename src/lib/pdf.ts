/**
 * DIN-5008 letter renderer — turns a `BelegDocument` into a jsPDF document.
 *
 * Problem: the letter frame (Anschriftfeld, fold marks, info block, Betreff,
 * flowing body, footer with optional page numbers) must sit at the exact
 * millimetre positions DIN 5008 prescribes, honour the user's DocConfig
 * (font, alignment, footer, page numbers, Form A/B) and stay byte-deterministic
 * so the live preview can re-render on every keystroke. Geometry comes from
 * `geometry.ts`, the text content from `layout.ts`; this module only positions
 * and prints, then hands back a jsPDF instance (or a Blob/DataURL for download).
 *
 * Scope: M3 renders the letter skeleton and the flowing body text (intro +
 * outro). The position table and totals are added by the document-type work in
 * M4; this renderer leaves vertical room and a hook (`bodyTextTop`) for them.
 */
import { jsPDF } from "jspdf";
import {
  BODY_MARGIN,
  PAGE,
  geometryFor,
  recipientZoneTop,
} from "./geometry";
import {
  infoBlockRows,
  recipientLines,
  senderReturnLine,
  subjectLine,
} from "./layout";
import type { BelegDocument } from "./model";

/** Millimetres of usable text width between the left and right body margins. */
const BODY_WIDTH = PAGE.width - BODY_MARGIN.left - BODY_MARGIN.right;
/** Left edge (mm) of the right-aligned info block. */
const INFO_BLOCK_LEFT = 125;
/** Footer baseline, measured up from the bottom edge (mm). */
const FOOTER_FROM_BOTTOM = 12;
/** Body font size in points; line height derived from it. */
const BODY_PT = 11;
const SUBJECT_PT = 11;
const SMALL_PT = 8;

/** Convert points to millimetres (1 pt = 1/72 in, 1 in = 25.4 mm). */
function ptToMm(points: number): number {
  return (points * 25.4) / 72;
}

/** Single-spaced line height in mm for a given point size (1.15 leading). */
function lineHeightMm(points: number): number {
  return ptToMm(points) * 1.15;
}

/**
 * Draw the two horizontal fold marks (Faltmarken) and the centre hole mark in
 * the left margin — the discreet registration ticks of a DIN-5008 letter.
 */
function drawFoldMarks(pdf: jsPDF, doc: BelegDocument): void {
  const geometry = geometryFor(doc.config.form);
  pdf.setLineWidth(0.2);
  pdf.setDrawColor(120);
  for (const y of [geometry.firstFoldMark, geometry.secondFoldMark]) {
    pdf.line(5, y, 9, y);
  }
  pdf.line(5, PAGE.height / 2, 8, PAGE.height / 2);
  pdf.setDrawColor(0);
}

/**
 * Draw the Anschriftfeld: the small return-address line on top, then the
 * recipient block beneath it. Returns nothing; positions are fixed by Form A/B.
 */
function drawAddressField(pdf: jsPDF, doc: BelegDocument): void {
  const geometry = geometryFor(doc.config.form);
  const returnLine = senderReturnLine(doc.sender);
  if (returnLine) {
    pdf.setFontSize(SMALL_PT);
    pdf.text(returnLine, BODY_MARGIN.left, geometry.addressFieldTop + 4);
  }

  pdf.setFontSize(BODY_PT);
  let y = recipientZoneTop(doc.config.form) + lineHeightMm(BODY_PT);
  for (const line of recipientLines(doc.recipient)) {
    pdf.text(line, BODY_MARGIN.left, y);
    y += lineHeightMm(BODY_PT);
  }
}

/**
 * Draw the right-hand info block (label/value pairs). Returns the y position
 * just below it so the caller knows how far down the page the header reaches.
 */
function drawInfoBlock(pdf: jsPDF, doc: BelegDocument): number {
  const rows = infoBlockRows(doc);
  pdf.setFontSize(SMALL_PT);
  let y = recipientZoneTop(doc.config.form) + lineHeightMm(SMALL_PT);
  for (const row of rows) {
    pdf.text(row.label, INFO_BLOCK_LEFT, y);
    pdf.text(row.value, PAGE.width - BODY_MARGIN.right, y, { align: "right" });
    y += lineHeightMm(SMALL_PT);
  }
  return y;
}

/**
 * First baseline (mm) of the Betreff. Sits a fixed gap below the address zone,
 * so it tracks Form A/B automatically (the recipient block allows ~6 lines and
 * the info block is shorter, so clearing the address zone clears both).
 */
function subjectTop(doc: BelegDocument): number {
  return recipientZoneTop(doc.config.form) + 36;
}

/**
 * Draw the Betreff (bold) and return the baseline below it where the body text
 * begins.
 */
function drawSubject(pdf: jsPDF, doc: BelegDocument): number {
  const y = subjectTop(doc);
  pdf.setFont(doc.config.fontFamily, "bold");
  pdf.setFontSize(SUBJECT_PT);
  pdf.text(subjectLine(doc), BODY_MARGIN.left, y);
  pdf.setFont(doc.config.fontFamily, "normal");
  return y + lineHeightMm(SUBJECT_PT) * 1.5;
}

/**
 * Draw a paragraph block with wrapping and the configured alignment, starting
 * at `top`. Returns the baseline below the block. Blank source lines become
 * paragraph gaps so intro and outro keep their structure.
 */
function drawParagraphs(
  pdf: jsPDF,
  text: string,
  top: number,
  doc: BelegDocument,
): number {
  pdf.setFontSize(BODY_PT);
  const lineHeight = lineHeightMm(BODY_PT);
  const align = doc.config.alignment === "justify" ? "justify" : "left";
  let y = top;
  for (const paragraph of text.split("\n")) {
    if (paragraph.trim() === "") {
      y += lineHeight;
      continue;
    }
    const wrapped: string[] = pdf.splitTextToSize(paragraph, BODY_WIDTH);
    pdf.text(wrapped, BODY_MARGIN.left, y, { align });
    y += wrapped.length * lineHeight;
  }
  return y;
}

/** Draw the footer line and, when enabled, a right-aligned page number. */
function drawFooter(pdf: jsPDF, doc: BelegDocument): void {
  const y = PAGE.height - FOOTER_FROM_BOTTOM;
  pdf.setFontSize(SMALL_PT);
  pdf.setTextColor(90);
  if (doc.config.footer.trim()) {
    pdf.text(doc.config.footer, BODY_MARGIN.left, y);
  }
  if (doc.config.showPageNumbers) {
    pdf.text("Seite 1 von 1", PAGE.width - BODY_MARGIN.right, y, {
      align: "right",
    });
  }
  pdf.setTextColor(0);
}

/**
 * Render a document to a fresh jsPDF instance (A4 portrait, millimetres).
 * Holds no shared state, so the same input always lays out identically — only
 * jsPDF's embedded creation timestamp differs between runs.
 */
export function renderLetter(doc: BelegDocument): jsPDF {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  pdf.setFont(doc.config.fontFamily, "normal");

  drawFoldMarks(pdf, doc);
  drawAddressField(pdf, doc);
  drawInfoBlock(pdf, doc);
  const bodyTop = drawSubject(pdf, doc);

  const body = [doc.intro, doc.outro].filter((part) => part.trim()).join("\n\n");
  drawParagraphs(pdf, body, bodyTop, doc);

  drawFooter(pdf, doc);
  return pdf;
}

/** Render and return the document as a PDF Blob (for download / object URLs). */
export function documentToBlob(doc: BelegDocument): Blob {
  return renderLetter(doc).output("blob");
}

/** Render and return the document as a `data:application/pdf` URL (for previews). */
export function documentToDataUrl(doc: BelegDocument): string {
  return renderLetter(doc).output("datauristring");
}
