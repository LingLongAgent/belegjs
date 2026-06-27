// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { createEmptyState } from "./emptyState";

describe("createEmptyState", () => {
  it("zeigt eine Überschrift und einen Hinweis", () => {
    const element = createEmptyState(() => {});
    expect(element.querySelector("h2")?.textContent).toContain("Kein Dokument");
    expect(element.querySelector(".empty-state__hint")?.textContent).toBeTruthy();
  });

  it("bietet je einen Button für Angebot, Rechnung und Mahnung", () => {
    const element = createEmptyState(() => {});
    const types = Array.from(element.querySelectorAll("button")).map((b) => b.dataset.type);
    expect(types).toEqual(["angebot", "rechnung", "mahnung"]);
  });

  it("ruft onCreate mit dem Typ des geklickten Buttons", () => {
    const onCreate = vi.fn();
    const element = createEmptyState(onCreate);
    const button = element.querySelector<HTMLButtonElement>('button[data-type="rechnung"]');
    button?.click();
    expect(onCreate).toHaveBeenCalledWith("rechnung");
  });
});
