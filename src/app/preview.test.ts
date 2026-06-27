// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { A4_ASPECT_RATIO, createPreview } from "./preview";
import { createDocument } from "../lib";

/** A4 is 210 mm by 297 mm, so the sheet ratio is 210/297 ≈ 0.707. */
describe("A4_ASPECT_RATIO", () => {
  it("is the 210:297 portrait ratio", () => {
    expect(A4_ASPECT_RATIO).toBeCloseTo(210 / 297, 6);
    expect(A4_ASPECT_RATIO).toBeLessThan(1);
  });
});

describe("createPreview", () => {
  // happy-dom does not implement object URLs; stub them so the controller can run.
  beforeEach(() => {
    let counter = 0;
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => `blob:fake-${counter++}`),
      revokeObjectURL: vi.fn(),
    });
  });

  it("builds a detached sheet holding the PDF iframe", () => {
    const preview = createPreview();
    expect(preview.element.isConnected).toBe(false);
    const sheet = preview.element.querySelector(".preview__sheet");
    const frame = preview.element.querySelector("iframe.preview__pdf");
    expect(sheet).not.toBeNull();
    expect(frame).not.toBeNull();
    // The sheet carries the A4 aspect ratio so it scales as a sheet of paper.
    // (The DOM may normalise "0.707" to the equivalent "0.707 / 1".)
    expect((sheet as HTMLElement).style.aspectRatio).toContain(String(A4_ASPECT_RATIO));
  });

  it("renders nothing into the frame until the first update", () => {
    const preview = createPreview();
    const frame = preview.element.querySelector<HTMLIFrameElement>("iframe")!;
    expect(frame.getAttribute("src")).toBeNull();
  });

  it("points the frame at a freshly created object URL on update", () => {
    const preview = createPreview();
    const frame = preview.element.querySelector<HTMLIFrameElement>("iframe")!;

    preview.update(createDocument("rechnung", { meta: { number: "RE-1", date: "2026-06-27" } }));

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(frame.src).toContain("blob:fake-0");
    // The viewer chrome is suppressed so the PDF reads as a plain sheet.
    expect(frame.src).toContain("toolbar=0");
  });

  it("revokes the previous URL when re-rendering, so keystrokes do not leak", () => {
    const preview = createPreview();
    const doc = createDocument("angebot");

    preview.update(doc);
    preview.update(doc);

    expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:fake-0");
  });

  it("revokes the live URL on destroy", () => {
    const preview = createPreview();
    preview.update(createDocument("mahnung"));

    preview.destroy();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:fake-0");
  });
});
