import { snapshotFromEnu, snapshotFromNed, type OrientationSnapshot } from "../math/frames";
import { fromEulerZYX, type Quaternion } from "../math/quaternion";
import { LabScene } from "../scene/lab-scene";
import {
  bindControls,
  renderControls,
  type Preset,
  type ValidationResult,
} from "./controls";

const byId = <T extends HTMLElement>(root: ParentNode, id: string): T => {
  const element = root.querySelector<T>(`#${id}`);
  if (!element) throw new Error(`L'élément #${id} est introuvable.`);
  return element;
};

const presetSnapshot = (preset: Preset): OrientationSnapshot => {
  switch (preset) {
    case "identity-enu":
      return snapshotFromEnu([1, 0, 0, 0]);
    case "roll-30":
      return snapshotFromEnu(fromEulerZYX({ roll: Math.PI / 6, pitch: 0, yaw: 0 }));
    case "pitch-90":
      return snapshotFromEnu(fromEulerZYX({ roll: 0, pitch: Math.PI / 2, yaw: 0 }));
    case "xdyn-north":
      return snapshotFromNed([1, 0, 0, 0]);
    case "xdyn-east":
      return snapshotFromNed(fromEulerZYX({ roll: 0, pitch: 0, yaw: Math.PI / 2 }));
  }
};

export function mountLabApp(root: HTMLElement): void {
  const container = byId<HTMLElement>(root, "scene-container");
  const validation = byId<HTMLElement>(root, "validation-message");
  const normalization = byId<HTMLElement>(root, "normalization-note");
  const gimbalWarning = byId<HTMLElement>(root, "gimbal-warning");
  const resetCamera = byId<HTMLButtonElement>(root, "reset-camera");
  const sandbox = byId<HTMLElement>(root, "sandbox");
  const lesson = byId<HTMLElement>(root, "lesson-panel");

  let scene: LabScene;
  try {
    scene = new LabScene(container);
  } catch (error) {
    console.error("La scène 3D n'a pas pu démarrer.", error);
    container.textContent = "La scène 3D n'a pas pu démarrer sur ce navigateur.";
    return;
  }

  let snapshot = snapshotFromEnu([1, 0, 0, 0]);
  const render = (next: OrientationSnapshot, note: string | null = null) => {
    scene.setGhostOrientation(snapshot === next ? null : snapshot.enuFlu);
    snapshot = next;
    scene.setOrientation(snapshot.enuFlu);
    renderControls(root, snapshot);
    validation.textContent = "";
    normalization.textContent = note ?? "";
    gimbalWarning.textContent = snapshot.eulerEnu.gimbalLocked
      ? "Singularité de Cardan : à ±90° de tangage, roulis et lacet ne sont plus indépendants."
      : "";
  };
  const update = <T>(
    result: ValidationResult<T>,
    derive: (value: T) => OrientationSnapshot,
  ) => {
    if (!result.ok) {
      validation.textContent = result.message;
      normalization.textContent = "";
      return;
    }
    render(derive(result.value), result.note);
  };

  render(snapshot);
  resetCamera.addEventListener("click", () => scene.resetCamera());
  byId<HTMLButtonElement>(root, "sandbox-jump").addEventListener("click", () => {
    sandbox.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  byId<HTMLButtonElement>(root, "tutorial-resume").addEventListener("click", () => {
    lesson.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  new ResizeObserver(() => scene.resize()).observe(container);

  bindControls(root, {
    onQuaternion: (result) => update(result, snapshotFromEnu),
    onAxisAngle: (result) => update(result, snapshotFromEnu),
    onEuler: (result) => update(result, (euler) => snapshotFromEnu(fromEulerZYX(euler))),
    onPreset: (preset) => render(presetSnapshot(preset)),
  });
}
