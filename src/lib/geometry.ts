/**
 * DIN 5008 letter geometry (Form A & B) in millimetres on A4.
 *
 * Pure, deterministic constants/functions — the spec-critical core, kept free
 * of any rendering so it can be unit-tested directly. The only difference
 * between Form A and B is vertical: Form A puts the address field higher
 * (small/no letterhead), Form B lower (large letterhead); the fold marks move
 * with it.
 */
export type Form = "A" | "B";

export const PAGE = { width: 210, height: 297 } as const;
export const ADDRESS_FIELD = { left: 20, width: 85, height: 40 } as const;
export const BODY_MARGIN = { left: 25, right: 20 } as const;
export const HOLE_MARK_MM = 148.5;
/** Return-address + remark zone height on top of the address field. */
export const RETURN_ZONE_MM = 17.7;

export interface LetterGeometry {
  form: Form;
  addressFieldTop: number;
  firstFoldMark: number;
  secondFoldMark: number;
}

const GEOMETRY: Record<Form, LetterGeometry> = {
  A: { form: "A", addressFieldTop: 27, firstFoldMark: 87, secondFoldMark: 192 },
  B: { form: "B", addressFieldTop: 45, firstFoldMark: 105, secondFoldMark: 210 },
};

export function geometryFor(form: Form): LetterGeometry {
  return GEOMETRY[form];
}

/** Top of the recipient (Anschriftzone) where the address is printed. */
export function recipientZoneTop(form: Form): number {
  return geometryFor(form).addressFieldTop + RETURN_ZONE_MM;
}
