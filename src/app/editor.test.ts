// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { createEditor } from "./editor";
import type { EditorController } from "./editor";
import type { PreviewController } from "./preview";
import { createDocument } from "../lib";
import type { BelegDocument } from "../lib";

/**
 * The editor is wired to a stub preview so these tests assert the reactive
 * behaviour (state mutation + preview refresh) without rendering a real PDF.
 */
function fakePreview(): PreviewController & { updates: BelegDocument[] } {
  const element = document.createElement("div");
  element.className = "preview";
  const updates: BelegDocument[] = [];
  return {
    element,
    updates,
    update: (doc) => updates.push(doc),
    destroy: vi.fn(),
  };
}

function mount(doc: BelegDocument) {
  const preview = fakePreview();
  let lastChange: BelegDocument | null = null;
  const editor: EditorController = createEditor({
    document: doc,
    previewFactory: () => preview,
    onChange: (next) => {
      lastChange = next;
    },
  });
  document.body.replaceChildren(editor.element);
  return { editor, preview, changes: () => lastChange };
}

describe("createEditor — layout", () => {
  it("builds three columns: content, preview, config", () => {
    const { editor } = mount(createDocument("rechnung"));
    expect(editor.element.querySelector(".editor__col--content")).not.toBeNull();
    expect(editor.element.querySelector(".editor__col--preview")).not.toBeNull();
    expect(editor.element.querySelector(".editor__col--config")).not.toBeNull();
  });

  it("places the preview element in the middle column", () => {
    const { editor, preview } = mount(createDocument("angebot"));
    const middle = editor.element.querySelector(".editor__col--preview")!;
    expect(middle.contains(preview.element)).toBe(true);
  });

  it("renders the preview once on mount", () => {
    const { preview } = mount(createDocument("rechnung"));
    expect(preview.updates.length).toBe(1);
  });
});

describe("createEditor — content editing", () => {
  it("updates the recipient name and re-renders", () => {
    const { editor, preview, changes } = mount(createDocument("rechnung"));
    const nameInput = Array.from(editor.element.querySelectorAll<HTMLInputElement>("input")).find(
      (input) =>
        input.previousElementSibling?.textContent === "Name" &&
        input.closest(".editor__section")?.querySelector("h3")?.textContent === "Empfänger",
    )!;
    const before = preview.updates.length;

    nameInput.value = "Erika Muster";
    nameInput.dispatchEvent(new Event("input"));

    expect(editor.getDocument().recipient.name).toBe("Erika Muster");
    expect(changes()?.recipient.name).toBe("Erika Muster");
    expect(preview.updates.length).toBe(before + 1);
  });

  it("adds and removes positions", () => {
    const { editor } = mount(createDocument("rechnung"));
    const addButton = editor.element.querySelector<HTMLButtonElement>(".position__add")!;

    addButton.click();
    addButton.click();
    expect(editor.getDocument().positions.length).toBe(2);

    const firstRemove = editor.element.querySelector<HTMLButtonElement>(".position__remove")!;
    firstRemove.click();
    expect(editor.getDocument().positions.length).toBe(1);
  });

  it("converts euro input into integer cents for a position price", () => {
    const doc = createDocument("rechnung", {
      positions: [{ description: "A", quantity: 1, unitPriceCents: 0, taxRatePercent: 19 }],
    });
    const { editor } = mount(doc);
    const priceInput = Array.from(editor.element.querySelectorAll<HTMLInputElement>("input[type=number]")).find(
      (input) => input.previousElementSibling?.textContent === "Einzelpreis (€)",
    )!;

    priceInput.value = "45.50";
    priceInput.dispatchEvent(new Event("input"));

    expect(editor.getDocument().positions[0].unitPriceCents).toBe(4550);
  });

  it("swaps type-specific fields when the document type changes", () => {
    const { editor } = mount(createDocument("rechnung"));
    const labels = () =>
      Array.from(editor.element.querySelectorAll(".field__label")).map((el) => el.textContent);
    expect(labels()).toContain("Fällig am");

    const typeSelect = editor.element.querySelector<HTMLSelectElement>("select")!;
    typeSelect.value = "mahnung";
    typeSelect.dispatchEvent(new Event("change"));

    expect(editor.getDocument().type).toBe("mahnung");
    expect(labels()).toContain("Mahnstufe");
    expect(labels()).not.toContain("Fällig am");
  });
});

describe("createEditor — config panel", () => {
  it("toggles the Kleinunternehmer rule", () => {
    const { editor } = mount(createDocument("rechnung"));
    const checkbox = Array.from(editor.element.querySelectorAll<HTMLInputElement>("input[type=checkbox]")).find(
      (input) => input.nextElementSibling?.textContent?.includes("Kleinunternehmer"),
    )!;

    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change"));

    expect(editor.getDocument().config.kleinunternehmer).toBe(true);
  });

  it("changes the font family from the config select", () => {
    const { editor } = mount(createDocument("angebot"));
    const fontSelect = Array.from(editor.element.querySelectorAll<HTMLSelectElement>("select")).find(
      (select) => select.previousElementSibling?.textContent === "Schriftart",
    )!;

    fontSelect.value = "times";
    fontSelect.dispatchEvent(new Event("change"));

    expect(editor.getDocument().config.fontFamily).toBe("times");
  });
});

describe("createEditor — lifecycle", () => {
  it("replaces the document with setDocument and re-renders", () => {
    const { editor, preview } = mount(createDocument("rechnung"));
    const before = preview.updates.length;

    editor.setDocument(createDocument("angebot", { title: "Mein Angebot" }));

    expect(editor.getDocument().type).toBe("angebot");
    expect(editor.getDocument().title).toBe("Mein Angebot");
    expect(preview.updates.length).toBe(before + 1);
  });

  it("destroys the preview", () => {
    const { editor, preview } = mount(createDocument("mahnung"));
    editor.destroy();
    expect(preview.destroy).toHaveBeenCalled();
  });
});

describe("createEditor — Download", () => {
  it("ruft onDownload mit dem aktuellen Dokument, wenn der Button geklickt wird", () => {
    const preview = fakePreview();
    const onDownload = vi.fn();
    const editor = createEditor({
      document: createDocument("rechnung", { meta: { number: "RE-9", date: "" } }),
      previewFactory: () => preview,
      onDownload,
    });
    document.body.replaceChildren(editor.element);

    const button = editor.element.querySelector<HTMLButtonElement>(".editor__download");
    expect(button).not.toBeNull();
    button!.click();

    expect(onDownload).toHaveBeenCalledOnce();
    expect(onDownload.mock.calls[0][0].meta.number).toBe("RE-9");
  });
});
