/**
 * The 3-column editor (M6) — left: editable content, middle: live PDF preview,
 * right: configuration panel.
 *
 * Problem: a user wants to edit a German business letter (recipient, line items,
 * texts) and its presentation (font, footer, alignment, §19 small-business rule …)
 * and immediately see the resulting DIN-5008 PDF. This module wires content and
 * config inputs to a single mutable document and re-renders the preview on every
 * change.
 *
 * Approach: `createEditor` keeps one `BelegDocument` as the single source of
 * truth. Plain inputs mutate it and call `emit()`, which pushes the document into
 * the preview and notifies `onChange`. Text edits never rebuild the DOM (so focus
 * and caret survive keystrokes); only structural changes — adding/removing a
 * position or switching the document type — re-render their section. The preview
 * is injectable so the wiring can be unit-tested without rendering a real PDF.
 */
import { DOC_TYPE_LABEL } from "../lib";
import type {
  Alignment,
  BelegDocument,
  DocType,
  FontFamily,
  Position,
} from "../lib";
import type { Form } from "../lib";
import { createPreview } from "./preview";
import type { PreviewController } from "./preview";

/** A mounted editor bound to one document. */
export interface EditorController {
  /** Root element holding the three columns; the caller mounts it. */
  readonly element: HTMLElement;
  /** The current, live document (the editor's source of truth). */
  getDocument(): BelegDocument;
  /** Replace the edited document and re-render everything. */
  setDocument(doc: BelegDocument): void;
  /** Release the preview's resources; call when removing the editor. */
  destroy(): void;
}

export interface EditorOptions {
  /** The document to edit. */
  document: BelegDocument;
  /** Called after every change with the updated document. */
  onChange?: (doc: BelegDocument) => void;
  /** Called when the user clicks „PDF herunterladen" with the current document. */
  onDownload?: (doc: BelegDocument) => void;
  /** Preview factory; defaults to the real PDF preview. Injected in tests. */
  previewFactory?: () => PreviewController;
}

// ── small typed DOM builders ────────────────────────────────────────────────

/** Wrap a control in a labelled field row. */
function field(labelText: string, control: HTMLElement): HTMLLabelElement {
  const label = document.createElement("label");
  label.className = "field";
  const span = document.createElement("span");
  span.className = "field__label";
  span.textContent = labelText;
  label.append(span, control);
  return label;
}

function textInput(value: string, onInput: (value: string) => void): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "text";
  input.value = value;
  input.addEventListener("input", () => onInput(input.value));
  return input;
}

function dateInput(value: string, onInput: (value: string) => void): HTMLInputElement {
  const input = textInput(value, onInput);
  input.type = "date";
  return input;
}

function numberInput(
  value: number,
  step: string,
  onInput: (value: number) => void,
): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "number";
  input.step = step;
  input.value = String(value);
  input.addEventListener("input", () => {
    const parsed = parseFloat(input.value.replace(",", "."));
    onInput(Number.isFinite(parsed) ? parsed : 0);
  });
  return input;
}

function textArea(value: string, onInput: (value: string) => void): HTMLTextAreaElement {
  const area = document.createElement("textarea");
  area.rows = 3;
  area.value = value;
  area.addEventListener("input", () => onInput(area.value));
  return area;
}

function selectInput<T extends string>(
  options: ReadonlyArray<{ value: T; label: string }>,
  value: T,
  onChange: (value: T) => void,
): HTMLSelectElement {
  const select = document.createElement("select");
  for (const option of options) {
    const el = document.createElement("option");
    el.value = option.value;
    el.textContent = option.label;
    select.appendChild(el);
  }
  select.value = value;
  select.addEventListener("change", () => onChange(select.value as T));
  return select;
}

function checkboxField(
  labelText: string,
  checked: boolean,
  onChange: (checked: boolean) => void,
): HTMLLabelElement {
  const label = document.createElement("label");
  label.className = "field field--check";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  input.addEventListener("change", () => onChange(input.checked));
  const span = document.createElement("span");
  span.className = "field__label";
  span.textContent = labelText;
  label.append(input, span);
  return label;
}

function section(title: string): HTMLElement {
  const el = document.createElement("section");
  el.className = "editor__section";
  const heading = document.createElement("h3");
  heading.textContent = title;
  el.appendChild(heading);
  return el;
}

const DOC_TYPE_OPTIONS: ReadonlyArray<{ value: DocType; label: string }> = (
  Object.keys(DOC_TYPE_LABEL) as DocType[]
).map((type) => ({ value: type, label: DOC_TYPE_LABEL[type] }));

const FONT_OPTIONS: ReadonlyArray<{ value: FontFamily; label: string }> = [
  { value: "helvetica", label: "Helvetica (serifenlos)" },
  { value: "times", label: "Times (Serife)" },
  { value: "courier", label: "Courier (Monospace)" },
];

const ALIGN_OPTIONS: ReadonlyArray<{ value: Alignment; label: string }> = [
  { value: "left", label: "Linksbündig" },
  { value: "justify", label: "Blocksatz" },
];

const FORM_OPTIONS: ReadonlyArray<{ value: Form; label: string }> = [
  { value: "A", label: "Form A (hohes Anschriftfeld)" },
  { value: "B", label: "Form B (tiefes Anschriftfeld)" },
];

/** Cents → euro number for an input (4500 → 45). */
function centsToEuro(cents: number): number {
  return Math.round(cents) / 100;
}

/** Euro number from an input → integer cents (45.5 → 4550). */
function euroToCents(euro: number): number {
  return Math.round(euro * 100);
}

export function createEditor(options: EditorOptions): EditorController {
  let doc = options.document;
  const preview = (options.previewFactory ?? createPreview)();

  const element = document.createElement("div");
  element.className = "editor";

  const contentColumn = document.createElement("div");
  contentColumn.className = "editor__col editor__col--content";

  const previewColumn = document.createElement("div");
  previewColumn.className = "editor__col editor__col--preview";
  previewColumn.appendChild(preview.element);

  const configColumn = document.createElement("div");
  configColumn.className = "editor__col editor__col--config";

  element.append(contentColumn, previewColumn, configColumn);

  /** Push the current document into the preview and notify the caller. */
  const emit = (): void => {
    preview.update(doc);
    options.onChange?.(doc);
  };

  // ── content column (rebuilt on structural change) ─────────────────────────

  function renderContent(): void {
    contentColumn.replaceChildren();

    const docSection = section("Dokument");
    docSection.appendChild(
      field(
        "Typ",
        selectInput(DOC_TYPE_OPTIONS, doc.type, (type) => {
          // Keep all content; only swap the discriminator and its default title.
          doc = { ...doc, type, title: DOC_TYPE_LABEL[type] };
          renderContent();
          emit();
        }),
      ),
    );
    docSection.appendChild(
      field("Titel", textInput(doc.title, (value) => {
        doc.title = value;
        emit();
      })),
    );
    docSection.appendChild(
      field("Nummer", textInput(doc.meta.number, (value) => {
        doc.meta.number = value;
        emit();
      })),
    );
    docSection.appendChild(
      field("Datum", dateInput(doc.meta.date, (value) => {
        doc.meta.date = value;
        emit();
      })),
    );
    docSection.appendChild(
      field("Ihr Zeichen", textInput(doc.meta.reference ?? "", (value) => {
        doc.meta.reference = value || undefined;
        emit();
      })),
    );
    appendTypeSpecificFields(docSection);
    contentColumn.appendChild(docSection);

    contentColumn.appendChild(addressSection("Empfänger", doc.recipient));
    contentColumn.appendChild(addressSection("Absender", doc.sender));

    const textSection = section("Texte");
    textSection.appendChild(
      field("Einleitung", textArea(doc.intro, (value) => {
        doc.intro = value;
        emit();
      })),
    );
    textSection.appendChild(
      field("Schluss", textArea(doc.outro, (value) => {
        doc.outro = value;
        emit();
      })),
    );
    contentColumn.appendChild(textSection);

    contentColumn.appendChild(positionsSection());
  }

  function appendTypeSpecificFields(host: HTMLElement): void {
    if (doc.type === "angebot") {
      host.appendChild(
        field("Gültig bis", dateInput(doc.validUntil ?? "", (value) => {
          doc.validUntil = value || undefined;
          emit();
        })),
      );
    } else if (doc.type === "rechnung") {
      host.appendChild(
        field("Fällig am", dateInput(doc.dueDate ?? "", (value) => {
          doc.dueDate = value || undefined;
          emit();
        })),
      );
    } else {
      host.appendChild(
        field("Bezugsrechnung", textInput(doc.bezugsRechnung ?? "", (value) => {
          doc.bezugsRechnung = value || undefined;
          emit();
        })),
      );
      host.appendChild(
        field("Mahnstufe", numberInput(doc.mahnstufe ?? 1, "1", (value) => {
          doc.mahnstufe = value;
          emit();
        })),
      );
      host.appendChild(
        field("Mahngebühr (€)", numberInput(centsToEuro(doc.mahngebuehrCents ?? 0), "0.01", (value) => {
          doc.mahngebuehrCents = euroToCents(value);
          emit();
        })),
      );
    }
  }

  function addressSection(title: string, address: BelegDocument["recipient"]): HTMLElement {
    const host = section(title);
    host.appendChild(field("Firma", textInput(address.company ?? "", (value) => {
      address.company = value || undefined;
      emit();
    })));
    host.appendChild(field("Name", textInput(address.name, (value) => {
      address.name = value;
      emit();
    })));
    host.appendChild(field("Straße", textInput(address.street ?? "", (value) => {
      address.street = value || undefined;
      emit();
    })));
    const cityRow = document.createElement("div");
    cityRow.className = "field-row";
    cityRow.append(
      field("PLZ", textInput(address.zip ?? "", (value) => {
        address.zip = value || undefined;
        emit();
      })),
      field("Ort", textInput(address.city ?? "", (value) => {
        address.city = value || undefined;
        emit();
      })),
    );
    host.appendChild(cityRow);
    return host;
  }

  function positionsSection(): HTMLElement {
    const host = section("Positionen");
    const list = document.createElement("div");
    list.className = "positions";
    host.appendChild(list);

    const addRow = (position: Position): void => {
      const row = document.createElement("div");
      row.className = "position";

      row.appendChild(field("Beschreibung", textInput(position.description, (value) => {
        position.description = value;
        emit();
      })));
      const numbers = document.createElement("div");
      numbers.className = "field-row";
      numbers.append(
        field("Menge", numberInput(position.quantity, "0.01", (value) => {
          position.quantity = value;
          emit();
        })),
        field("Einzelpreis (€)", numberInput(centsToEuro(position.unitPriceCents), "0.01", (value) => {
          position.unitPriceCents = euroToCents(value);
          emit();
        })),
        field("USt (%)", numberInput(position.taxRatePercent, "0.1", (value) => {
          position.taxRatePercent = value;
          emit();
        })),
      );
      row.appendChild(numbers);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "btn btn--ghost position__remove";
      remove.textContent = "Position entfernen";
      remove.addEventListener("click", () => {
        const index = doc.positions.indexOf(position);
        if (index >= 0) doc.positions.splice(index, 1);
        row.remove();
        emit();
      });
      row.appendChild(remove);

      list.appendChild(row);
    };

    for (const position of doc.positions) addRow(position);

    const add = document.createElement("button");
    add.type = "button";
    add.className = "btn position__add";
    add.textContent = "+ Position hinzufügen";
    add.addEventListener("click", () => {
      const position: Position = {
        description: "",
        quantity: 1,
        unitPriceCents: 0,
        taxRatePercent: 19,
      };
      doc.positions.push(position);
      addRow(position);
      emit();
    });
    host.appendChild(add);
    return host;
  }

  // ── config column ─────────────────────────────────────────────────────────

  function renderConfig(): void {
    configColumn.replaceChildren();

    // Primary action sits above the settings so it is always reachable.
    const downloadButton = document.createElement("button");
    downloadButton.type = "button";
    downloadButton.className = "editor__download";
    downloadButton.textContent = "📄 PDF herunterladen";
    downloadButton.addEventListener("click", () => options.onDownload?.(doc));
    configColumn.appendChild(downloadButton);

    const host = section("Konfiguration");

    host.appendChild(field("Schriftart", selectInput(FONT_OPTIONS, doc.config.fontFamily, (value) => {
      doc.config.fontFamily = value;
      emit();
    })));
    host.appendChild(field("Ausrichtung", selectInput(ALIGN_OPTIONS, doc.config.alignment, (value) => {
      doc.config.alignment = value;
      emit();
    })));
    host.appendChild(field("DIN-5008-Form", selectInput(FORM_OPTIONS, doc.config.form, (value) => {
      doc.config.form = value;
      emit();
    })));
    host.appendChild(field("Footer", textInput(doc.config.footer, (value) => {
      doc.config.footer = value;
      emit();
    })));
    host.appendChild(checkboxField("Seitenzahl anzeigen", doc.config.showPageNumbers, (checked) => {
      doc.config.showPageNumbers = checked;
      emit();
    }));
    host.appendChild(checkboxField("Kleinunternehmer (§19 UStG)", doc.config.kleinunternehmer, (checked) => {
      doc.config.kleinunternehmer = checked;
      emit();
    }));

    configColumn.appendChild(host);
  }

  function renderAll(): void {
    renderContent();
    renderConfig();
  }

  renderAll();
  emit();

  return {
    element,
    getDocument: () => doc,
    setDocument: (next) => {
      doc = next;
      renderAll();
      emit();
    },
    destroy: () => preview.destroy(),
  };
}
