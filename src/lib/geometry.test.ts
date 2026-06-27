import { describe, expect, it } from "vitest";
import { geometryFor, recipientZoneTop, PAGE } from "./geometry";

describe("DIN 5008 geometry", () => {
  it("places Form A's address field higher than Form B", () => {
    expect(geometryFor("A").addressFieldTop).toBe(27);
    expect(geometryFor("B").addressFieldTop).toBe(45);
    expect(geometryFor("A").addressFieldTop).toBeLessThan(geometryFor("B").addressFieldTop);
  });
  it("has the correct fold marks per form", () => {
    expect([geometryFor("A").firstFoldMark, geometryFor("A").secondFoldMark]).toEqual([87, 192]);
    expect([geometryFor("B").firstFoldMark, geometryFor("B").secondFoldMark]).toEqual([105, 210]);
  });
  it("places the recipient below the field top", () => {
    expect(recipientZoneTop("A")).toBeGreaterThan(geometryFor("A").addressFieldTop);
  });
  it("uses A4 dimensions", () => {
    expect(PAGE).toEqual({ width: 210, height: 297 });
  });
});
