// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { createDocument } from "../lib";
import type { DocumentStore } from "../lib";
import { createOverview } from "./overview";

function storeWith(...docs: ReturnType<typeof createDocument>[]): DocumentStore {
  return { documents: docs, activeId: docs[0]?.id ?? null };
}

function noopOptions() {
  return {
    onCreate: vi.fn(),
    onOpen: vi.fn(),
    onDuplicate: vi.fn(),
    onDelete: vi.fn(),
  };
}

describe("createOverview", () => {
  it("offers a create button per document type", () => {
    const options = noopOptions();
    const overview = createOverview(options);
    const buttons = Array.from(overview.element.querySelectorAll<HTMLButtonElement>(".btn--new"));
    expect(buttons.map((b) => b.dataset.type)).toEqual(["angebot", "rechnung", "mahnung"]);
    buttons[1].click();
    expect(options.onCreate).toHaveBeenCalledWith("rechnung");
  });

  it("shows an empty state when there are no documents", () => {
    const overview = createOverview(noopOptions());
    overview.render({ documents: [], activeId: null });
    expect(overview.element.querySelector(".overview__empty")).not.toBeNull();
    expect(overview.element.querySelectorAll(".doc-row")).toHaveLength(0);
  });

  it("renders one row per document with a type badge and number", () => {
    const overview = createOverview(noopOptions());
    overview.render(
      storeWith(
        createDocument("rechnung", { id: "rechnung-1", title: "Rechnung", meta: { number: "RE-1", date: "" } }),
        createDocument("angebot", { id: "angebot-1", title: "Angebot", meta: { number: "", date: "" } }),
      ),
    );
    const rows = Array.from(overview.element.querySelectorAll(".doc-row"));
    expect(rows).toHaveLength(2);
    expect(rows[0].querySelector(".badge")?.textContent).toBe("Rechnung");
    expect(rows[0].querySelector(".doc-row__number")?.textContent).toBe("RE-1");
    // Empty number falls back to a placeholder.
    expect(rows[1].querySelector(".doc-row__number")?.textContent).toBe("ohne Nummer");
  });

  it("marks the active document", () => {
    const overview = createOverview(noopOptions());
    overview.render({
      documents: [
        createDocument("rechnung", { id: "rechnung-1" }),
        createDocument("angebot", { id: "angebot-1" }),
      ],
      activeId: "angebot-1",
    });
    const active = overview.element.querySelectorAll(".doc-row--active");
    expect(active).toHaveLength(1);
    expect((active[0] as HTMLElement).dataset.id).toBe("angebot-1");
  });

  it("reports open, duplicate and delete with the document id", () => {
    const options = noopOptions();
    const overview = createOverview(options);
    overview.render(storeWith(createDocument("rechnung", { id: "rechnung-1" })));
    const row = overview.element.querySelector<HTMLElement>(".doc-row")!;
    row.querySelector<HTMLButtonElement>(".doc-row__open")!.click();
    row.querySelector<HTMLButtonElement>(".doc-row__duplicate")!.click();
    row.querySelector<HTMLButtonElement>(".doc-row__delete")!.click();
    expect(options.onOpen).toHaveBeenCalledWith("rechnung-1");
    expect(options.onDuplicate).toHaveBeenCalledWith("rechnung-1");
    expect(options.onDelete).toHaveBeenCalledWith("rechnung-1");
  });

  it("replaces rows on re-render rather than appending", () => {
    const overview = createOverview(noopOptions());
    overview.render(storeWith(createDocument("rechnung", { id: "rechnung-1" })));
    overview.render(storeWith(createDocument("angebot", { id: "angebot-1" })));
    expect(overview.element.querySelectorAll(".doc-row")).toHaveLength(1);
    expect(overview.element.querySelector<HTMLElement>(".doc-row")!.dataset.id).toBe("angebot-1");
  });
});
