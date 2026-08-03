import { describe, expect, test } from "bun:test";
import { createBoat, toThreeQuaternion } from "./lab-scene";

describe("schematic scene boundary", () => {
  test("adapts scalar-first domain order to Three.js", () => {
    const q = toThreeQuaternion([0.5, 0.5, 0.5, 0.5]);
    expect([q.w, q.x, q.y, q.z]).toEqual([0.5, 0.5, 0.5, 0.5]);
  });

  test("builds a labelled FLU boat without external assets", () => {
    const boat = createBoat();
    expect(boat.getObjectByName("hull")).toBeDefined();
    expect(boat.getObjectByName("bow")).toBeDefined();
    expect(boat.getObjectByName("port-marker")).toBeDefined();
    expect(boat.getObjectByName("starboard-marker")).toBeDefined();
    expect(boat.getObjectByName("body-axes")).toBeDefined();
  });
});
