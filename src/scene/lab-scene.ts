import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { EulerZYX, Quaternion, Vec3 } from "../math/quaternion";

const INK = 0x082733;
const HORIZON = 0x2ca6b8;
const AMBER = 0xe9a23b;
const PORT = 0xd94b55;
const STARBOARD = 0x218b68;

type AxisGlyph = Readonly<{
  name: string;
  direction: Vec3;
  color: THREE.ColorRepresentation;
}>;

const FLU_AXES: readonly AxisGlyph[] = [
  { name: "FLU X · Avant", direction: [1, 0, 0], color: PORT },
  { name: "FLU Y · Gauche", direction: [0, 1, 0], color: STARBOARD },
  { name: "FLU Z · Haut", direction: [0, 0, 1], color: AMBER },
];

const FRD_AXES: readonly AxisGlyph[] = [
  { name: "FRD X · Avant", direction: [1, 0, 0], color: PORT },
  { name: "FRD Y · Droite", direction: [0, -1, 0], color: STARBOARD },
  { name: "FRD Z · Bas", direction: [0, 0, -1], color: AMBER },
];

const ENU_AXES: readonly AxisGlyph[] = [
  { name: "ENU X · Est", direction: [1, 0, 0], color: PORT },
  { name: "ENU Y · Nord", direction: [0, 1, 0], color: STARBOARD },
  { name: "ENU Z · Haut", direction: [0, 0, 1], color: AMBER },
];

const NED_AXES: readonly AxisGlyph[] = [
  { name: "NED X · Nord", direction: [0, 1, 0], color: PORT },
  { name: "NED Y · Est", direction: [1, 0, 0], color: STARBOARD },
  { name: "NED Z · Bas", direction: [0, 0, -1], color: AMBER },
];

export const toThreeQuaternion = ([w, x, y, z]: Quaternion) =>
  new THREE.Quaternion(x, y, z, w).normalize();

function createAxes(name: string, glyphs: readonly AxisGlyph[] = FLU_AXES): THREE.Group {
  const axes = new THREE.Group();
  axes.name = name;
  for (const glyph of glyphs) {
    const arrow = new THREE.ArrowHelper(
      new THREE.Vector3(...glyph.direction),
      undefined,
      1.25,
      glyph.color,
    );
    arrow.name = glyph.name;
    axes.add(arrow);
  }
  return axes;
}

export const createWorldAxes = (convention: "NED" | "ENU"): THREE.Group =>
  createAxes(`world-axes-${convention.toLowerCase()}`, convention === "NED" ? NED_AXES : ENU_AXES);

export function createBoat(): THREE.Group {
  const boat = new THREE.Group();
  boat.name = "boat";

  const hullShape = new THREE.Shape()
    .moveTo(-1.15, -0.45)
    .lineTo(0.75, -0.45)
    .lineTo(1.45, 0)
    .lineTo(0.75, 0.45)
    .lineTo(-1.15, 0.45)
    .closePath();
  const hull = new THREE.Mesh(
    new THREE.ExtrudeGeometry(hullShape, {
      depth: 0.35,
      bevelEnabled: false,
    }).translate(0, 0, -0.175),
    new THREE.MeshStandardMaterial({ color: INK, roughness: 0.65 }),
  );
  hull.name = "hull";
  boat.add(hull);

  const bow = new THREE.Object3D();
  bow.name = "bow";
  bow.position.x = 1.45;
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

  const axes = new THREE.Group();
  axes.name = "body-axes";
  axes.position.set(0, 0, 0.35);
  const fluAxes = createAxes("body-axes-flu", FLU_AXES);
  const frdAxes = createAxes("body-axes-frd", FRD_AXES);
  frdAxes.visible = false;
  axes.add(fluAxes, frdAxes);
  boat.add(axes);
  return boat;
}

type AnimationTrack = {
  object: THREE.Object3D;
  start: THREE.Quaternion;
  target: THREE.Quaternion;
};

type Animation = {
  tracks: readonly AnimationTrack[];
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
  private readonly comparisonLabels = document.createElement("div");
  private readonly boat = createBoat();
  private readonly ghost = createBoat();
  private readonly comparisonLeft = createBoat();
  private readonly comparisonRight = createBoat();
  private readonly worldAxes = createWorldAxes("ENU");
  private readonly comparisonWorldNed = createWorldAxes("NED");
  private readonly comparisonWorldEnu = createWorldAxes("ENU");
  private readonly rotationAxis = new THREE.ArrowHelper(
    new THREE.Vector3(1, 0, 0),
    undefined,
    2.2,
    AMBER,
  );
  private readonly gimbalRings = new THREE.Group();
  private animation?: Animation;
  private savedAnimation?: Pick<Animation, "tracks" | "durationMs">;
  private animationClock?: number;
  private animationSpeed = 1;
  private paused = false;
  private frame?: number;

  constructor(private readonly container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x123d4a);
    this.comparisonLabels.className = "scene-comparison-labels";
    for (const [convention, label] of [
      ["NED/FRD", "xdyn · monde NED / corps FRD"],
      ["ENU/FLU", "LOTUSim · monde ENU / corps FLU"],
    ] as const) {
      const item = document.createElement("span");
      item.dataset.convention = convention;
      item.textContent = label;
      this.comparisonLabels.append(item);
    }
    this.comparisonLabels.hidden = true;
    container.replaceChildren(this.renderer.domElement, this.comparisonLabels);

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
    this.scene.add(
      water,
      this.worldAxes,
      this.comparisonWorldNed,
      this.comparisonWorldEnu,
      this.boat,
    );
    this.worldAxes.position.set(-3.3, -2.6, -0.48);
    this.comparisonWorldNed.position.set(-2.7, -2, -0.48);
    this.comparisonWorldEnu.position.set(1.3, -2, -0.48);
    this.comparisonWorldNed.visible = false;
    this.comparisonWorldEnu.visible = false;

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
    this.savedAnimation = undefined;
    this.animationClock = undefined;
  }

  animateOrientation(q: Quaternion, durationMs = 900): void {
    this.animateObjects([[this.boat, q]], durationMs);
  }

  animateComparison(left: Quaternion, right: Quaternion, durationMs = 900): void {
    this.showComparison(true);
    this.animateObjects(
      [
        [this.comparisonLeft, left],
        [this.comparisonRight, right],
      ],
      durationMs,
    );
  }

  pauseAnimation(paused: boolean): void {
    this.paused = paused;
    this.animationClock = undefined;
  }

  canReplayAnimation(): boolean {
    return this.savedAnimation !== undefined;
  }

  replayAnimation(animate = true): void {
    if (!this.savedAnimation) return;
    const { tracks, durationMs } = this.savedAnimation;
    if (!animate) {
      for (const track of tracks) track.object.quaternion.copy(track.target);
      this.animation = undefined;
      this.animationClock = undefined;
      this.syncComparisonState();
      return;
    }
    for (const track of tracks) track.object.quaternion.copy(track.start);
    this.animation = {
      tracks: tracks.map((track) => ({
        object: track.object,
        start: track.start.clone(),
        target: track.target.clone(),
      })),
      durationMs,
      elapsedMs: 0,
    };
    this.animationClock = undefined;
    this.syncComparisonState();
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
    if (!euler) return;

    const z = new THREE.Vector3(0, 0, 1);
    const axes = [
      z.clone(),
      new THREE.Vector3(0, 1, 0).applyAxisAngle(z, euler.yaw),
      new THREE.Vector3(1, 0, 0)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), euler.pitch)
        .applyAxisAngle(z, euler.yaw),
    ];
    this.gimbalRings.children.forEach((ring, index) => {
      ring.quaternion.setFromUnitVectors(z, axes[index]!.normalize());
    });
  }

  setComparison(left: Quaternion | null, right: Quaternion | null): void {
    const comparing = left !== null && right !== null;
    this.showComparison(comparing);
    if (left) this.comparisonLeft.quaternion.copy(toThreeQuaternion(left));
    if (right) this.comparisonRight.quaternion.copy(toThreeQuaternion(right));
    this.syncComparisonState();
  }

  setComparisonPhase(phase: "none" | "world" | "body" | "full"): void {
    const showWorld = phase === "world" || phase === "full";
    const showBody = phase === "body" || phase === "full";
    const comparing = this.comparisonLeft.visible && this.comparisonRight.visible;
    this.worldAxes.visible = !comparing && showWorld;
    this.comparisonWorldNed.visible = comparing && showWorld;
    this.comparisonWorldEnu.visible = comparing && showWorld;
    for (const boat of [this.boat, this.comparisonLeft, this.comparisonRight]) {
      const axes = boat.getObjectByName("body-axes");
      if (!axes) continue;
      axes.visible = showBody;
      setOpacity(axes, 1);
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
    this.comparisonLabels.remove();
  }

  private readonly render = (now: number) => {
    this.frame = requestAnimationFrame(this.render);
    if (this.animation && !this.paused) {
      const last = this.animationClock ?? now;
      this.animation.elapsedMs += (now - last) * this.animationSpeed;
      this.animationClock = now;
      const progress = Math.min(this.animation.elapsedMs / this.animation.durationMs, 1);
      for (const track of this.animation.tracks) {
        track.object.quaternion.slerpQuaternions(track.start, track.target, progress);
      }
      this.syncComparisonState();
      if (progress === 1) this.animation = undefined;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  private animateObjects(
    targets: readonly (readonly [object: THREE.Object3D, target: Quaternion])[],
    durationMs: number,
  ): void {
    const tracks = targets.map(([object, target]) => ({
      object,
      start: object.quaternion.clone(),
      target: toThreeQuaternion(target),
    }));
    const replayDuration = Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 900;
    this.savedAnimation = {
      tracks: tracks.map((track) => ({
        object: track.object,
        start: track.start.clone(),
        target: track.target.clone(),
      })),
      durationMs: replayDuration,
    };
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
      for (const track of tracks) track.object.quaternion.copy(track.target);
      this.animation = undefined;
      this.animationClock = undefined;
      this.syncComparisonState();
      return;
    }
    this.animation = { tracks, durationMs, elapsedMs: 0 };
    this.animationClock = undefined;
  }

  private showComparison(comparing: boolean): void {
    this.boat.visible = !comparing;
    this.comparisonLeft.visible = comparing;
    this.comparisonRight.visible = comparing;
    this.comparisonLabels.hidden = !comparing;
    const leftFlu = this.comparisonLeft.getObjectByName("body-axes-flu");
    const leftFrd = this.comparisonLeft.getObjectByName("body-axes-frd");
    const rightFlu = this.comparisonRight.getObjectByName("body-axes-flu");
    const rightFrd = this.comparisonRight.getObjectByName("body-axes-frd");
    if (leftFlu) leftFlu.visible = false;
    if (leftFrd) leftFrd.visible = true;
    if (rightFlu) rightFlu.visible = true;
    if (rightFrd) rightFrd.visible = false;
    this.setComparisonPhase("full");
    this.syncComparisonState();
  }

  private syncComparisonState(): void {
    [this.comparisonLeft, this.comparisonRight].forEach((boat, index) => {
      const label = this.comparisonLabels.children[index] as HTMLElement | undefined;
      if (!label) return;
      const { w, x, y, z } = boat.quaternion;
      label.dataset.quaternion = [w, x, y, z].map((value) => value.toFixed(6)).join(",");
    });
  }
}
