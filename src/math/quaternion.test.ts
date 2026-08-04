import { describe, expect, test } from "bun:test";
import {
  canonicalize,
  fromAxisAngle,
  fromEulerZYX,
  multiply,
  rotateVector,
  sameOrientation,
  toAxisAngle,
  toEulerZYX,
} from "./quaternion";

const closeTuple = (actual: readonly number[], expected: readonly number[]) => {
  expected.forEach((value, index) => expect(actual[index]!).toBeCloseTo(value, 10));
};

describe("scalar-first Hamilton quaternions", () => {
  test("keeps vectors fixed at identity", () => {
    closeTuple(rotateVector([1, 0, 0, 0], [1, -2, 3]), [1, -2, 3]);
  });

  for (const [label, axis, source, positive, negative] of [
    ["X", [1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 0, -1]],
    ["Y", [0, 1, 0], [0, 0, 1], [1, 0, 0], [-1, 0, 0]],
    ["Z", [0, 0, 1], [1, 0, 0], [0, 1, 0], [0, -1, 0]],
  ] as const) {
    test(`rotates by +90 and -90 degrees around ${label}`, () => {
      closeTuple(
        rotateVector(fromAxisAngle({ axis, angle: Math.PI / 2 }), source),
        positive,
      );
      closeTuple(
        rotateVector(fromAxisAngle({ axis, angle: -Math.PI / 2 }), source),
        negative,
      );
    });
  }

  test("applies qA then qB with qB multiplied on the left", () => {
    const qA = fromAxisAngle({ axis: [1, 0, 0], angle: Math.PI / 2 });
    const qB = fromAxisAngle({ axis: [0, 0, 1], angle: Math.PI / 2 });
    closeTuple(rotateVector(multiply(qB, qA), [0, 1, 0]), [0, 0, 1]);
    expect(sameOrientation(multiply(qB, qA), multiply(qA, qB))).toBe(false);
  });

  test("round-trips Z-Y'-X'' Euler angles away from singularity", () => {
    const source = { roll: 0.3, pitch: -0.2, yaw: 0.7 };
    const result = toEulerZYX(fromEulerZYX(source));
    expect(result.roll).toBeCloseTo(source.roll, 10);
    expect(result.pitch).toBeCloseTo(source.pitch, 10);
    expect(result.yaw).toBeCloseTo(source.yaw, 10);
    expect(result.gimbalLocked).toBe(false);
  });

  test("uses Z-Y'-X'' order for mixed Euler angles", () => {
    closeTuple(
      fromEulerZYX({ roll: Math.PI / 2, pitch: 0, yaw: Math.PI / 2 }),
      [0.5, 0.5, 0.5, 0.5],
    );
    const result = toEulerZYX([0.5, 0.5, 0.5, 0.5]);
    expect(result.roll).toBeCloseTo(Math.PI / 2, 10);
    expect(result.pitch).toBeCloseTo(0, 10);
    expect(result.yaw).toBeCloseTo(Math.PI / 2, 10);
    expect(result.gimbalLocked).toBe(false);
  });

  test("marks the ZYX singularity at 90 degrees of pitch", () => {
    const q = fromEulerZYX({ roll: 0, pitch: Math.PI / 2, yaw: 0 });
    expect(toEulerZYX(q).gimbalLocked).toBe(true);
  });

  for (const [pitch, expectedYaw] of [
    [Math.PI / 2, Math.PI / 12],
    [-Math.PI / 2, (11 * Math.PI) / 36],
  ] as const) {
    test(`canonically reconstructs the ${pitch > 0 ? "+" : "-"}90 degree ZYX limit`, () => {
      const source = fromEulerZYX({
        roll: Math.PI / 9,
        pitch,
        yaw: (7 * Math.PI) / 36,
      });
      const extracted = toEulerZYX(source);

      expect(extracted.roll).toBeCloseTo(0, 10);
      expect(extracted.pitch).toBeCloseTo(pitch, 10);
      expect(extracted.yaw).toBeCloseTo(expectedYaw, 10);
      expect(extracted.gimbalLocked).toBe(true);

      const reconstructed = fromEulerZYX(extracted);
      const dot = source.reduce(
        (sum, value, index) => sum + value * reconstructed[index]!,
        0,
      );
      expect(Math.abs(dot)).toBeCloseTo(1, 10);
    });
  }

  for (const pitch of [89.999, -89.999].map((degrees) => (degrees * Math.PI) / 180)) {
    test(`keeps ${pitch > 0 ? "+" : "-"}89.999 degrees outside the ZYX singular branch`, () => {
      const sourceEuler = { roll: 0.31, pitch, yaw: -0.47 };
      const source = fromEulerZYX(sourceEuler);
      const extracted = toEulerZYX(source);

      expect(extracted.gimbalLocked).toBe(false);
      expect(extracted.pitch).toBeCloseTo(pitch, 10);
      expect(sameOrientation(fromEulerZYX(extracted), source)).toBe(true);
    });
  }

  test("treats q and -q as the same orientation", () => {
    const q = canonicalize([0.5, 0.5, 0.5, 0.5]);
    const negative = q.map((value) => -value) as [number, number, number, number];
    expect(sameOrientation(q, negative)).toBe(true);
    expect(toAxisAngle(q).angle).toBeCloseTo((2 * Math.PI) / 3, 10);
  });

  test("normalizes finite values and rejects the zero quaternion", () => {
    expect(canonicalize([2, 0, 0, 0])).toEqual([1, 0, 0, 0]);
    expect(() => canonicalize([0, 0, 0, 0])).toThrow(RangeError);
  });

  test("picks one representative per 180-degree rotation despite w = 0", () => {
    expect(canonicalize([0, 0, 0, -1])).toEqual([0, 0, 0, 1]);
    expect(canonicalize([0, -0.6, 0.8, 0])).toEqual([0, 0.6, -0.8, 0]);
    expect(canonicalize([0, -0.6, 0.8, 0])).toEqual(canonicalize([0, 0.6, -0.8, 0]));
  });
});
