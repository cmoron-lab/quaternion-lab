import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { EulerZYX, Quaternion, Vec3 } from "../math/quaternion";

const INK = 0x082733;
const HORIZON = 0x2ca6b8;
const AMBER = 0xe9a23b;
const PORT = 0xd94b55;
const STARBOARD = 0x218b68;

export const toThreeQuaternion = ([w, x, y, z]: Quaternion) =>
  new THREE.Quaternion(x, y, z, w).normalize();

function createAxes(name: string): THREE.Group {
  const axes = new THREE.Group();
  axes.name = name;
  axes.add(
    new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), undefined, 1.25, PORT),
    new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), undefined, 1.25, STARBOARD),
    new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), undefined, 1.25, AMBER),
  );
  return axes;
}

export function createBoat(): THREE.Group {
  const boat = new THREE.Group();
  boat.name = "boat";

  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(2, 0.9, 0.35),
    new THREE.MeshStandardMaterial({ color: INK, roughness: 0.65 }),
  );
  hull.name = "hull";
  boat.add(hull);

  const bow = new THREE.Mesh(
    new THREE.ConeGeometry(0.48, 0.85, 4),
    new THREE.MeshStandardMaterial({ color: INK, roughness: 0.65 }),
  );
  bow.name = "bow";
  bow.rotation.z = -Math.PI / 2;
  bow.position.x = 1.3;
  boat.add(bow);

  for (const [name, color, y] of [
    ["port-marker", PORT, 0.48],
    ["starboard-marker", STARBOARD, -0.48],
  ] as const) {
    const marker = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.06, 0.16),
      new THREE.MeshStandardMaterial({ color, roughness: 0.5 }),
    );
    marker.name = name;
    marker.position.set(-0.15, y, 0.18);
    boat.add(marker);
  }

  const axes = createAxes("body-axes");
  axes.position.set(0, 0, 0.35);
  boat.add(axes);
  return boat;
}

type Animation = {
  start: THREE.Quaternion;
  target: THREE.Quaternion;
  durationMs: number;
  elapsedMs: number;
};

const setOpacity = (object: THREE.Object3D, opacity: number) => {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh || child instanceof THREE.Line)) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) {
      material.transparent = opacity < 1;
      material.opacity = opacity;
    }
  });
};

export function disposeSceneResources(scene: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  scene.traverse((object) => {
    const renderable = object as THREE.Object3D & {
      geometry?: unknown;
      material?: unknown;
    };
    if (renderable.geometry instanceof THREE.BufferGeometry) geometries.add(renderable.geometry);
    const objectMaterials = Array.isArray(renderable.material)
      ? renderable.material
      : [renderable.material];
    for (const material of objectMaterials) {
      if (material instanceof THREE.Material) materials.add(material);
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
}

export class LabScene {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly controls: OrbitControls;
  private readonly boat = createBoat();
  private readonly ghost = createBoat();
  private readonly comparisonLeft = createBoat();
  private readonly comparisonRight = createBoat();
  private readonly worldAxes = createAxes("world-axes");
  private readonly rotationAxis = new THREE.ArrowHelper(
    new THREE.Vector3(1, 0, 0),
    undefined,
    2.2,
    AMBER,
  );
  private readonly gimbalRings = new THREE.Group();
  private animation?: Animation;
  private savedAnimation?: Pick<Animation, "start" | "target" | "durationMs">;
  private animationClock?: number;
  private animationSpeed = 1;
  private paused = false;
  private frame?: number;

  constructor(private readonly container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x123d4a);
    container.replaceChildren(this.renderer.domElement);

    this.camera.up.set(0, 0, 1);
    this.resetCamera();
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0, 0);
    this.controls.enableDamping = true;

    const grid = new THREE.GridHelper(12, 12, HORIZON, 0x285664);
    grid.rotation.x = Math.PI / 2;
    grid.position.z = -0.5;
    this.scene.add(grid);

    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshStandardMaterial({ color: 0x174f5c, roughness: 0.82, metalness: 0.08 }),
    );
    water.position.z = -0.52;
    this.scene.add(water, this.worldAxes, this.boat);
    this.worldAxes.position.set(-3.3, -2.6, -0.48);

    this.ghost.name = "ghost";
    setOpacity(this.ghost, 0.24);
    this.ghost.visible = false;
    this.comparisonLeft.position.x = -2;
    this.comparisonRight.position.x = 2;
    this.comparisonLeft.visible = false;
    this.comparisonRight.visible = false;
    this.scene.add(this.ghost, this.comparisonLeft, this.comparisonRight);

    this.rotationAxis.name = "rotation-axis";
    this.rotationAxis.visible = false;
    this.scene.add(this.rotationAxis);

    this.gimbalRings.name = "gimbal-rings";
    const rings: readonly [THREE.ColorRepresentation, THREE.Euler][] = [
      [PORT, new THREE.Euler(0, 0, 0)],
      [STARBOARD, new THREE.Euler(Math.PI / 2, 0, 0)],
      [AMBER, new THREE.Euler(0, Math.PI / 2, 0)],
    ];
    for (const [color, rotation] of rings) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.45, 0.025, 8, 48),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.82 }),
      );
      ring.rotation.copy(rotation);
      this.gimbalRings.add(ring);
    }
    this.gimbalRings.visible = false;
    this.scene.add(this.gimbalRings);

    this.scene.add(new THREE.HemisphereLight(0xccecf0, 0x082733, 2));
    const light = new THREE.DirectionalLight(0xffffff, 2.5);
    light.position.set(3, -4, 6);
    this.scene.add(light);

    this.resize();
    this.frame = requestAnimationFrame(this.render);
  }

  setOrientation(q: Quaternion): void {
    this.boat.quaternion.copy(toThreeQuaternion(q));
    this.animation = undefined;
    this.animationClock = undefined;
  }

  animateOrientation(q: Quaternion, durationMs = 900): void {
    const start = this.boat.quaternion.clone();
    const target = toThreeQuaternion(q);
    this.savedAnimation = { start: start.clone(), target: target.clone(), durationMs };
    this.animation = { start, target, durationMs, elapsedMs: 0 };
    this.animationClock = undefined;
  }

  pauseAnimation(paused: boolean): void {
    this.paused = paused;
    this.animationClock = undefined;
  }

  replayAnimation(): void {
    if (!this.savedAnimation) return;
    const { start, target, durationMs } = this.savedAnimation;
    this.boat.quaternion.copy(start);
    this.animation = { start: start.clone(), target: target.clone(), durationMs, elapsedMs: 0 };
    this.animationClock = undefined;
  }

  setAnimationSpeed(speed: 0.5 | 1): void {
    this.animationSpeed = speed;
  }

  setGhostOrientation(q: Quaternion | null): void {
    this.ghost.visible = q !== null;
    if (q) this.ghost.quaternion.copy(toThreeQuaternion(q));
  }

  setRotationAxis(axis: Vec3 | null): void {
    if (!axis) {
      this.rotationAxis.visible = false;
      return;
    }
    const direction = new THREE.Vector3(...axis);
    this.rotationAxis.visible = direction.lengthSq() > 0;
    if (this.rotationAxis.visible) this.rotationAxis.setDirection(direction.normalize());
  }

  setGimbalAngles(euler: EulerZYX | null): void {
    this.gimbalRings.visible = euler !== null;
    if (euler) this.gimbalRings.rotation.set(euler.roll, euler.pitch, euler.yaw, "ZYX");
  }

  setComparison(left: Quaternion | null, right: Quaternion | null): void {
    const comparing = left !== null && right !== null;
    this.boat.visible = !comparing;
    this.comparisonLeft.visible = comparing;
    this.comparisonRight.visible = comparing;
    if (left) this.comparisonLeft.quaternion.copy(toThreeQuaternion(left));
    if (right) this.comparisonRight.quaternion.copy(toThreeQuaternion(right));
  }

  setComparisonPhase(phase: "none" | "world" | "body" | "full"): void {
    const showWorld = phase === "world" || phase === "full";
    const showBody = phase === "body" || phase === "full";
    this.worldAxes.visible = showWorld;
    for (const boat of [this.boat, this.comparisonLeft, this.comparisonRight]) {
      const axes = boat.getObjectByName("body-axes");
      if (!axes) continue;
      axes.visible = showBody;
      setOpacity(axes, phase === "full" ? 1 : 0.72);
    }
  }

  resetCamera(): void {
    this.camera.position.set(5.4, -6.2, 4.5);
    this.camera.lookAt(0, 0, 0);
    this.controls?.target.set(0, 0, 0);
  }

  resize(): void {
    const width = Math.max(this.container.clientWidth, 1);
    const height = Math.max(this.container.clientHeight, 1);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  dispose(): void {
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.controls.dispose();
    disposeSceneResources(this.scene);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private readonly render = (now: number) => {
    this.frame = requestAnimationFrame(this.render);
    if (this.animation && !this.paused) {
      const last = this.animationClock ?? now;
      this.animation.elapsedMs += (now - last) * this.animationSpeed;
      this.animationClock = now;
      const progress = Math.min(this.animation.elapsedMs / this.animation.durationMs, 1);
      this.boat.quaternion.slerpQuaternions(this.animation.start, this.animation.target, progress);
      if (progress === 1) this.animation = undefined;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };
}
