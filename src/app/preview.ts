/**
 * Live PDF preview — the editor's middle column.
 *
 * Problem: while the user edits content and config, they want to see the real
 * letter, not an approximation. The most faithful preview is the actual PDF the
 * library produces, shown on a scaled A4 "sheet" that updates on every change.
 *
 * Approach: `createPreview` builds a small, self-contained DOM controller. Its
 * `update(doc)` re-renders the document to a PDF blob, swaps the object URL on an
 * `<iframe>` and revokes the previous URL so repeated keystrokes never leak
 * memory. The sheet keeps the A4 aspect ratio (210:297) via CSS, so it always
 * reads as a scaled sheet of paper regardless of the column width. The geometry
 * decision (the aspect ratio) lives in a pure, tested constant; the DOM wiring is
 * deliberately thin so it can be exercised with a lightweight DOM test.
 */
import { PAGE, documentToBlob } from "../lib";
import type { BelegDocument } from "../lib";

/** A4 width-to-height ratio, derived from the page geometry (210 mm : 297 mm). */
export const A4_ASPECT_RATIO = PAGE.width / PAGE.height;

/** A live preview attached to a single root element. */
export interface PreviewController {
  /** Root element to place in the editor's middle column. */
  readonly element: HTMLElement;
  /** Re-render the given document into the preview. */
  update(doc: BelegDocument): void;
  /** Release the current object URL; call when removing the preview. */
  destroy(): void;
}

/**
 * Create a live preview controller. The returned `element` is detached from the
 * document; the caller mounts it. Nothing is rendered until the first `update`.
 */
export function createPreview(): PreviewController {
  const element = document.createElement("div");
  element.className = "preview";

  const sheet = document.createElement("div");
  sheet.className = "preview__sheet";
  sheet.style.aspectRatio = String(A4_ASPECT_RATIO);

  const frame = document.createElement("iframe");
  frame.className = "preview__pdf";
  frame.title = "PDF-Vorschau";
  sheet.appendChild(frame);
  element.appendChild(sheet);

  // The object URL currently shown; revoked before being replaced.
  let currentUrl: string | null = null;

  const revoke = (): void => {
    if (currentUrl) {
      URL.revokeObjectURL(currentUrl);
      currentUrl = null;
    }
  };

  const update = (doc: BelegDocument): void => {
    const blob = documentToBlob(doc);
    const nextUrl = URL.createObjectURL(blob);
    revoke();
    currentUrl = nextUrl;
    // Hide the PDF viewer's own toolbar/scrollbars so it reads as a sheet.
    frame.src = `${nextUrl}#toolbar=0&navpanes=0&view=FitH`;
  };

  return { element, update, destroy: revoke };
}
