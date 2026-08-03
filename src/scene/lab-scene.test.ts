import { describe, expect, test } from "bun:test";
import * as THREE from "three";
import {
  createBoat,
  createWorldAxes,
  disposeSceneResources,
  toThreeQuaternion,
} from "./lab-scene";

describe("schematic scene boundary", () => {
  const directionOf = (axis: THREE.Object3D) =>
    new THREE.Vector3(0, 1, 0)
      .applyQuaternion(axis.quaternion)
      .toArray()
      .map((value) => Math.round(value));

  test("adapts and normalizes scalar-first domain order for Three.js", () => {
    const q = toThreeQuaternion([2, 1, -2, 4]);
    expect([q.w, q.x, q.y, q.z]).toEqual([0.4, 0.2, -0.4, 0.8]);
  });

  test("builds a labelled FLU boat without external assets", () => {
    const boat = createBoat();
    const hull = boat.getObjectByName("hull") as THREE.Mesh;
    hull.geometry.computeBoundingBox();
    expect(hull.geometry.boundingBox?.max.x).toBeGreaterThan(1.3);
    expect(boat.getObjectByName("bow")?.position.x).toBeGreaterThan(0);
    expect(boat.getObjectByName("port-marker")?.position.y).toBeGreaterThan(0);
    expect(boat.getObjectByName("starboard-marker")?.position.y).toBeLessThan(0);
    expect(boat.getObjectByName("body-axes")).toBeDefined();
  });

  test("gives FLU and FRD body glyphs their renderer directions and semantic names", () => {
    const boat = createBoat();
    const glyphs = (name: string) =>
      boat.getObjectByName(name)?.children.map((axis) => ({
        name: axis.name,
        direction: directionOf(axis),
      }));

    expect(glyphs("body-axes-flu")).toEqual([
      { name: "FLU X · Avant", direction: [1, 0, 0] },
      { name: "FLU Y · Gauche", direction: [0, 1, 0] },
      { name: "FLU Z · Haut", direction: [0, 0, 1] },
    ]);
    expect(glyphs("body-axes-frd")).toEqual([
      { name: "FRD X · Avant", direction: [1, 0, 0] },
      { name: "FRD Y · Droite", direction: [0, -1, 0] },
      { name: "FRD Z · Bas", direction: [0, 0, -1] },
    ]);
  });

  test("maps NED and ENU world glyphs into the ENU renderer", () => {
    const glyphs = (convention: "NED" | "ENU") =>
      createWorldAxes(convention).children.map((axis) => ({
        name: axis.name,
        direction: directionOf(axis),
      }));

    expect(glyphs("NED")).toEqual([
      { name: "NED X · Nord", direction: [0, 1, 0] },
      { name: "NED Y · Est", direction: [1, 0, 0] },
      { name: "NED Z · Bas", direction: [0, 0, -1] },
    ]);
    expect(glyphs("ENU")).toEqual([
      { name: "ENU X · Est", direction: [1, 0, 0] },
      { name: "ENU Y · Nord", direction: [0, 1, 0] },
      { name: "ENU Z · Haut", direction: [0, 0, 1] },
    ]);
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
