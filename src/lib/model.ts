/**
 * Document model for belegjs — the data a German business letter (Angebot,
 * Rechnung, Mahnung) carries, plus the presentation config (DocConfig).
 *
 * Problem: an editor and a PDF renderer both need one agreed, strictly-typed
 * shape for "what is in this document" and "how should it look". This module is
 * that contract. It deliberately holds no rendering or money math — only the
 * data and small, total constructors/guards that keep a document well-formed
 * (e.g. every document starts with a valid config). Type-specific extras
 * (Gültigkeit, Zahlungsziel, Mahnstufe …) are optional here and are exercised
 * by the document-type helpers in M4.
 */
import type { Form } from "./geometry";

/** The three document kinds belegjs produces. */
export type DocType = "angebot" | "rechnung" | "mahnung";

/** Horizontal alignment of the body text. */
export type Alignment = "left" | "justify";

/** Font families the renderer (jsPDF core fonts) can guarantee. */
export type FontFamily = "helvetica" | "times" | "courier";

/**
 * A postal address used for both Absender (sender) and Empfänger (recipient).
 * `name` is the only required line; everything else is optional so a private
 * person (no company) and a company (no contact person) both fit.
 */
export interface Address {
  name: string;
  company?: string;
  line1?: string;
  street?: string;
  zip?: string;
  city?: string;
  country?: string;
}

/**
 * One line item. Money is stored as integer cents to avoid float drift; the USt
 * math in M2 reads `unitPriceCents` and `taxRatePercent`. `quantity` may be
 * fractional (e.g. 1.5 hours).
 */
export interface Position {
  description: string;
  quantity: number;
  unitPriceCents: number;
  taxRatePercent: number;
}

/** Bookkeeping metadata shown in the DIN-5008 info block. */
export interface DocMeta {
  /** Document number, e.g. "RE-2026-0001". */
  number: string;
  /** ISO date (YYYY-MM-DD) the document was issued. */
  date: string;
  /** Optional customer reference / "Ihr Zeichen". */
  reference?: string;
}

/** Presentation config — the right-hand panel of the editor. */
export interface DocConfig {
  fontFamily: FontFamily;
  /** Footer line (bank details, contact …); empty string hides it. */
  footer: string;
  showPageNumbers: boolean;
  alignment: Alignment;
  /** §19 UStG small-business rule: when true, no USt is charged or shown. */
  kleinunternehmer: boolean;
  /** DIN 5008 letter form (A = high address field, B = low). */
  form: Form;
}

/**
 * A complete document. `type` discriminates the kind; type-specific fields are
 * optional and only meaningful for their kind (validUntil → Angebot,
 * dueDate/paymentTermDays → Rechnung, mahnung* → Mahnung).
 */
export interface BelegDocument {
  id: string;
  type: DocType;
  title: string;
  sender: Address;
  recipient: Address;
  /** Greeting/intro text above the position table. */
  intro: string;
  positions: Position[];
  /** Closing text below the table (e.g. "Mit freundlichen Grüßen"). */
  outro: string;
  meta: DocMeta;
  config: DocConfig;

  // Angebot
  validUntil?: string;
  // Rechnung
  dueDate?: string;
  // Mahnung
  mahnstufe?: number;
  mahngebuehrCents?: number;
  bezugsRechnung?: string;
}

/** Sensible defaults so a new document is always render-ready. */
export const DEFAULT_CONFIG: DocConfig = {
  fontFamily: "helvetica",
  footer: "",
  showPageNumbers: true,
  alignment: "left",
  kleinunternehmer: false,
  form: "B",
};

/** Human-readable German label for each document type. */
export const DOC_TYPE_LABEL: Record<DocType, string> = {
  angebot: "Angebot",
  rechnung: "Rechnung",
  mahnung: "Mahnung",
};

function emptyAddress(): Address {
  return { name: "" };
}

/**
 * Build a new, well-formed document of the given type. Callers may override any
 * field; anything omitted falls back to an empty-but-valid default, so the
 * editor and renderer never have to defend against missing structure.
 */
export function createDocument(
  type: DocType,
  overrides: Partial<BelegDocument> = {},
): BelegDocument {
  const base: BelegDocument = {
    id: overrides.id ?? `${type}-${type.length}`,
    type,
    title: DOC_TYPE_LABEL[type],
    sender: emptyAddress(),
    recipient: emptyAddress(),
    intro: "",
    positions: [],
    outro: "",
    meta: { number: "", date: "" },
    config: { ...DEFAULT_CONFIG },
  };
  return {
    ...base,
    ...overrides,
    // Never share the mutable config/meta references with the caller's object.
    config: { ...base.config, ...(overrides.config ?? {}) },
    meta: { ...base.meta, ...(overrides.meta ?? {}) },
  };
}

/** Type guard: is this a document of the given kind? */
export function isDocType(doc: BelegDocument, type: DocType): boolean {
  return doc.type === type;
}
