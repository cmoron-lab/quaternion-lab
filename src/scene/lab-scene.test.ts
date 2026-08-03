import { describe, expect, test } from "bun:test";
import * as THREE from "three";
import { createBoat, disposeSceneResources, toThreeQuaternion } from "./lab-scene";

describe("schematic scene boundary", () => {
  test("adapts and normalizes scalar-first domain order for Three.js", () => {
    const q = toThreeQuaternion([2, 1, -2, 4]);
    expect([q.w, q.x, q.y, q.z]).toEqual([0.4, 0.2, -0.4, 0.8]);
  });

  test("builds a labelled FLU boat without external assets", () => {
    const boat = createBoat();
    expect(boat.getObjectByName("hull")).toBeDefined();
    expect(boat.getObjectByName("bow")?.position.x).toBeGreaterThan(0);
    expect(boat.getObjectByName("port-marker")?.position.y).toBeGreaterThan(0);
    expect(boat.getObjectByName("starboard-marker")?.position.y).toBeLessThan(0);
    expect(boat.getObjectByName("body-axes")).toBeDefined();
  });

  test("disposes shared scene resources once", () => {
    const scene = new THREE.Scene();
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial();
    scene.add(new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, material));
    let geometryDisposals = 0;
    let materialDisposals = 0;
    geometry.addEventListener("dispose", () => geometryDisposals++);
    material.addEventListener("dispose", () => materialDisposals++);

    disposeSceneResources(scene);

    expect(geometryDisposals).toBe(1);
    expect(materialDisposals).toBe(1);
  });
});
