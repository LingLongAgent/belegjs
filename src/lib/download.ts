/**
 * M8 · Download — ein Dokument als PDF-Datei speichern.
 *
 * Problem: Der Nutzer will jedes Dokument als Datei mit einem sprechenden,
 * dateisystemsicheren Namen herunterladen. Die Namensbildung ist reine Logik
 * (und damit gründlich testbar); der eigentliche Download braucht nur einen
 * winzigen, injizierbaren DOM-Adapter, damit Tests ohne echten Browser laufen.
 */
import { DOC_TYPE_LABEL, type BelegDocument } from "./model";
import { documentToBlob } from "./pdf";

/** Umlaute/ß in ASCII überführen, damit Dateinamen überall tragfähig bleiben. */
const TRANSLITERATION: Record<string, string> = {
  ä: "ae", ö: "oe", ü: "ue", Ä: "Ae", Ö: "Oe", Ü: "Ue", ß: "ss",
};

/** Aus beliebigem Text einen dateinamen­sicheren Bestandteil machen. */
function slug(text: string): string {
  return text
    .replace(/[äöüÄÖÜß]/g, (char) => TRANSLITERATION[char] ?? char)
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Sprechender Dateiname: „<Typ>-<Belegnummer>.pdf", ersatzweise „<Typ>-<Titel>.pdf",
 * und falls beides leer ist nur „<Typ>.pdf".
 */
export function documentFileName(doc: BelegDocument): string {
  const label = DOC_TYPE_LABEL[doc.type];
  const detail = slug(doc.meta.number) || slug(doc.title);
  return detail ? `${label}-${detail}.pdf` : `${label}.pdf`;
}

/** Schmaler Umwelt-Adapter — im Browser aus `document`/`URL` zusammengesetzt. */
export interface DownloadEnv {
  createElement: (tag: "a") => HTMLAnchorElement;
  createObjectURL: (blob: Blob) => string;
  revokeObjectURL: (url: string) => void;
}

/** Standard-Adapter für den echten Browser. */
function browserEnv(): DownloadEnv {
  return {
    createElement: (tag) => document.createElement(tag),
    createObjectURL: (blob) => URL.createObjectURL(blob),
    revokeObjectURL: (url) => URL.revokeObjectURL(url),
  };
}

/**
 * Dokument als PDF rendern und herunterladen. Gibt den verwendeten Dateinamen
 * zurück. `env` ist nur für Tests gedacht; im Browser bleibt es weg.
 */
export function downloadDocument(doc: BelegDocument, env: DownloadEnv = browserEnv()): string {
  const fileName = documentFileName(doc);
  const url = env.createObjectURL(documentToBlob(doc));
  const anchor = env.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  env.revokeObjectURL(url);
  return fileName;
}
