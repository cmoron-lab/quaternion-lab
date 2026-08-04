import { describe, expect, test } from "bun:test";
import { fromEulerZYX, sameOrientation } from "./quaternion";
import {
  enuFluToNedFrd,
  nedFrdToEnuFlu,
  nedVectorToEnu,
  snapshotFromNed,
} from "./frames";

describe("LOTUSim xdyn frame conversion", () => {
  test("maps NED vectors by swapping X/Y and flipping Z", () => {
    expect(nedVectorToEnu([1, 2, 3])).toEqual([2, 1, -3]);
  });

  test("maps North heading to +90 degree ENU yaw", () => {
    const enu = nedFrdToEnuFlu([1, 0, 0, 0]);
    const northEnu = fromEulerZYX({ roll: 0, pitch: 0, yaw: Math.PI / 2 });
    expect(sameOrientation(enu, northEnu)).toBe(true);
  });

  test("maps +90 degree NED heading to zero ENU yaw", () => {
    const eastNed = fromEulerZYX({ roll: 0, pitch: 0, yaw: Math.PI / 2 });
    expect(sameOrientation(nedFrdToEnuFlu(eastNed), [1, 0, 0, 0])).toBe(true);
  });

  test("keeps roll, flips pitch, and remaps yaw for a full attitude", () => {
    const rad = (degrees: number) => (degrees * Math.PI) / 180;
    const ned = fromEulerZYX({ roll: rad(10), pitch: rad(20), yaw: rad(30) });
    const enu = fromEulerZYX({ roll: rad(10), pitch: rad(-20), yaw: rad(60) });
    expect(sameOrientation(nedFrdToEnuFlu(ned), enu)).toBe(true);
  });

  test("round-trips an arbitrary attitude", () => {
    const source = fromEulerZYX({ roll: 0.2, pitch: -0.1, yaw: 0.8 });
    expect(sameOrientation(enuFluToNedFrd(nedFrdToEnuFlu(source)), source)).toBe(true);
  });

  test("derives all views from one canonical ENU orientation", () => {
    const snapshot = snapshotFromNed([1, 0, 0, 0]);
    expect(snapshot.eulerEnu.yaw).toBeCloseTo(Math.PI / 2, 10);
    expect(sameOrientation(snapshot.nedFrd, [1, 0, 0, 0])).toBe(true);
  });
});
