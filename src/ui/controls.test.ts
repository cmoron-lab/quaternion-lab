import { describe, expect, test } from "bun:test";
import {
  formatNorm,
  readFinite,
  renderControls,
  validateAxisAngleInput,
  validateQuaternionInput,
} from "./controls";
import type { OrientationSnapshot } from "../math/frames";

const controlRoot = () => {
  const values = new Map<string, { value: string }>();
  for (const id of [
    "qw", "qx", "qy", "qz", "norm-indicator",
    "axis-x", "axis-y", "axis-z", "axis-angle", "axis-angle-output",
    "roll", "pitch", "yaw", "roll-output", "pitch-output", "yaw-output",
  ]) {
    values.set(id, { value: "" });
  }
  return {
    root: {
      querySelector: (selector: string) => values.get(selector.slice(1)) ?? null,
    } as unknown as ParentNode,
    value: (id: string) => values.get(id)?.value,
  };
};

describe("sandbox validation", () => {
  test("rejects non-finite input", () => {
    expect(readFinite("NaN", "roll").ok).toBe(false);
    expect(readFinite("", "roll").ok).toBe(false);
    expect(readFinite("   ", "roll").ok).toBe(false);
  });

  test("explains normalization instead of just snapping", () => {
    const result = validateQuaternionInput([2, 0, 0, 0]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual([1, 0, 0, 0]);
      expect(result.note).toContain("norme 2");
      expect(result.note).toContain("unitaire");
    }
  });

  test("explains canonical sign without changing the rotation", () => {
    const result = validateQuaternionInput([-1, 0, 0, 0]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual([1, 0, 0, 0]);
      expect(result.note).toContain("q et -q");
      expect(result.note).toContain("w ≥ 0");
    }
  });

  test("formats the live norm indicator", () => {
    expect(formatNorm([1, 0, 0, 0])).toBe("‖q‖ = 1.000000");
    expect(formatNorm([0.5, 0.5, 0.5, 0.5])).toBe("‖q‖ = 1.000000");
    expect(formatNorm([Number.NaN, 0, 0, 0])).toBe("‖q‖ = —");
  });

  test("rejects zero quaternion and zero axis", () => {
    expect(validateQuaternionInput([0, 0, 0, 0]).ok).toBe(false);
    expect(validateAxisAngleInput([0, 0, 0], Math.PI / 2).ok).toBe(false);
  });

  test("renders rounded negative values as zero", () => {
    const controls = controlRoot();
    const snapshot = {
      enuFlu: [-1e-9, 0, 0, 0],
      nedFrd: [0, 0, 0, 1],
      axisAngle: { axis: [-1e-9, 0, 0], angle: -1e-9 },
      eulerEnu: { roll: -1e-9, pitch: 0, yaw: 0, gimbalLocked: false },
    } as OrientationSnapshot;

    renderControls(controls.root, snapshot);

    expect(controls.value("qw")).toBe("0.000000");
    expect(controls.value("axis-angle-output")).toBe("0.0°");
    expect(controls.value("roll-output")).toBe("0.0°");
  });
});
