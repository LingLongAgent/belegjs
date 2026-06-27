import { describe, expect, it, vi } from "vitest";
import { createDocument } from "./model";
import { documentFileName, downloadDocument } from "./download";

describe("documentFileName", () => {
  it("baut den Namen aus Typ-Label und Belegnummer", () => {
    const doc = createDocument("rechnung", { meta: { number: "RE-2026-0001", date: "" } });
    expect(documentFileName(doc)).toBe("Rechnung-RE-2026-0001.pdf");
  });

  it("fällt ohne Nummer auf den Titel zurück", () => {
    const doc = createDocument("angebot", { title: "Webdesign Paket", meta: { number: "", date: "" } });
    expect(documentFileName(doc)).toBe("Angebot-Webdesign-Paket.pdf");
  });

  it("nutzt nur das Typ-Label, wenn weder Nummer noch sinnvoller Titel da sind", () => {
    const doc = createDocument("mahnung", { title: "   ", meta: { number: "", date: "" } });
    expect(documentFileName(doc)).toBe("Mahnung.pdf");
  });

  it("transliteriert Umlaute und entfernt unsichere Zeichen", () => {
    const doc = createDocument("rechnung", { meta: { number: "Übergröße/2024 #3", date: "" } });
    expect(documentFileName(doc)).toBe("Rechnung-Uebergroesse-2024-3.pdf");
  });

  it("kollabiert mehrfache Trenner und trimmt Ränder", () => {
    const doc = createDocument("angebot", { title: "  A   ---  B  ", meta: { number: "", date: "" } });
    expect(documentFileName(doc)).toBe("Angebot-A-B.pdf");
  });
});

describe("downloadDocument", () => {
  it("erzeugt eine Object-URL, klickt einen Anker und räumt wieder auf", () => {
    const click = vi.fn();
    const anchor = { href: "", download: "", click } as unknown as HTMLAnchorElement;
    const createObjectURL = vi.fn(() => "blob:fake");
    const revokeObjectURL = vi.fn();
    const env = {
      createElement: vi.fn(() => anchor),
      createObjectURL,
      revokeObjectURL,
    };
    const doc = createDocument("rechnung", { meta: { number: "RE-1", date: "" } });

    const name = downloadDocument(doc, env);

    expect(name).toBe("Rechnung-RE-1.pdf");
    expect(env.createElement).toHaveBeenCalledWith("a");
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(anchor.download).toBe("Rechnung-RE-1.pdf");
    expect(anchor.href).toBe("blob:fake");
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake");
  });
});
