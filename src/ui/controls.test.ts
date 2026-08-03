import { describe, expect, test } from "bun:test";
import {
  readFinite,
  validateAxisAngleInput,
  validateQuaternionInput,
} from "./controls";

describe("sandbox validation", () => {
  test("rejects non-finite input", () => {
    expect(readFinite("NaN", "roll").ok).toBe(false);
    expect(readFinite("", "roll").ok).toBe(false);
    expect(readFinite("   ", "roll").ok).toBe(false);
  });

  test("keeps normalization visible", () => {
    const result = validateQuaternionInput([2, 0, 0, 0]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual([1, 0, 0, 0]);
      expect(result.note).toContain("norme 2");
    }
  });

  test("explains canonical sign without changing the rotation", () => {
    const result = validateQuaternionInput([-1, 0, 0, 0]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual([1, 0, 0, 0]);
      expect(result.note).toContain("q et -q");
    }
  });

  test("rejects zero quaternion and zero axis", () => {
    expect(validateQuaternionInput([0, 0, 0, 0]).ok).toBe(false);
    expect(validateAxisAngleInput([0, 0, 0], Math.PI / 2).ok).toBe(false);
  });
});
