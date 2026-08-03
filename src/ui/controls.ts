import { fromAxisAngle, type EulerZYX, type Quaternion, type Vec3 } from "../math/quaternion";
import type { OrientationSnapshot } from "../math/frames";

export type ValidationResult<T> =
  | Readonly<{ ok: true; value: T; note: string | null }>
  | Readonly<{ ok: false; message: string }>;

export type Preset = "identity-enu" | "roll-30" | "pitch-90" | "xdyn-north" | "xdyn-east";

export type ControlCallbacks = Readonly<{
  onQuaternion: (result: ValidationResult<Quaternion>) => void;
  onAxisAngle: (result: ValidationResult<Quaternion>) => void;
  onEuler: (result: ValidationResult<EulerZYX>) => void;
  onPreset: (preset: Preset) => void;
}>;

const quaternionFields = ["qw", "qx", "qy", "qz"] as const;
const axisFields = ["axis-x", "axis-y", "axis-z"] as const;
const eulerFields = ["roll", "pitch", "yaw"] as const;

const element = <T extends HTMLElement>(root: ParentNode, id: string): T => {
  const found = root.querySelector<T>(`#${id}`);
  if (!found) throw new Error(`Le contrôle #${id} est introuvable.`);
  return found;
};

const readFields = <T extends readonly string[]>(
  root: ParentNode,
  ids: T,
): ValidationResult<{ readonly [K in keyof T]: number }> => {
  const values: number[] = [];
  for (const id of ids) {
    const result = readFinite(element<HTMLInputElement>(root, id).value, id);
    if (!result.ok) return result;
    values.push(result.value);
  }
  return { ok: true, value: values as { readonly [K in keyof T]: number }, note: null };
};

export function readFinite(raw: string, label: string): ValidationResult<number> {
  if (raw.trim() === "") return { ok: false, message: `${label} doit être un nombre fini.` };
  const value = Number(raw);
  return Number.isFinite(value)
    ? { ok: true, value, note: null }
    : { ok: false, message: `${label} doit être un nombre fini.` };
}

export function validateQuaternionInput(raw: Quaternion): ValidationResult<Quaternion> {
  const norm = Math.hypot(...raw);
  if (!Number.isFinite(norm) || norm < 1e-10) {
    return { ok: false, message: "Le quaternion ne peut pas être nul." };
  }

  let value = raw.map((component) => component / norm) as [number, number, number, number];
  const notes: string[] = [];
  if (Math.abs(norm - 1) > 1e-9) {
    notes.push(
      `Quaternion normalisé : norme ${norm} → 1 — un quaternion d'orientation est unitaire, vos valeurs ont été mises à l'échelle`,
    );
  }
  if (value[0] < 0) {
    value = value.map((component) => -component || 0) as [number, number, number, number];
    notes.push("q et -q décrivent la même orientation — affichage canonique avec w ≥ 0");
  }
  return { ok: true, value, note: notes.join(" · ") || null };
}

export function validateAxisAngleInput(
  axis: Vec3,
  angle: number,
): ValidationResult<Quaternion> {
  try {
    return { ok: true, value: fromAxisAngle({ axis, angle }), note: null };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof RangeError ? error.message : "Angle-axe invalide.",
    };
  }
}

const quaternionFromFields = (root: ParentNode): ValidationResult<Quaternion> => {
  const values = readFields(root, quaternionFields);
  return values.ok
    ? validateQuaternionInput(values.value as Quaternion)
    : values;
};

const axisAngleFromFields = (root: ParentNode): ValidationResult<Quaternion> => {
  const axis = readFields(root, axisFields);
  const degrees = readFinite(element<HTMLInputElement>(root, "axis-angle").value, "angle");
  if (!axis.ok) return axis;
  if (!degrees.ok) return degrees;
  return validateAxisAngleInput(axis.value as Vec3, (degrees.value * Math.PI) / 180);
};

const eulerFromFields = (root: ParentNode): ValidationResult<EulerZYX> => {
  const values = readFields(root, eulerFields);
  if (!values.ok) return values;
  const [roll, pitch, yaw] = values.value;
  return {
    ok: true,
    value: {
      roll: (roll * Math.PI) / 180,
      pitch: (pitch * Math.PI) / 180,
      yaw: (yaw * Math.PI) / 180,
    },
    note: null,
  };
};

export function bindControls(root: ParentNode, callbacks: ControlCallbacks): void {
  const bindChange = (ids: readonly string[], update: () => void) => {
    for (const id of ids) element<HTMLInputElement>(root, id).addEventListener("change", update);
  };
  const bindInput = (ids: readonly string[], update: () => void) => {
    for (const id of ids) element<HTMLInputElement>(root, id).addEventListener("input", update);
  };

  bindChange(quaternionFields, () => callbacks.onQuaternion(quaternionFromFields(root)));
  const updateNormIndicator = () => {
    const values = quaternionFields.map((id) => {
      const raw = element<HTMLInputElement>(root, id).value;
      return raw.trim() === "" ? Number.NaN : Number(raw);
    });
    element<HTMLElement>(root, "norm-indicator").textContent = formatNorm(values);
  };
  bindInput(quaternionFields, updateNormIndicator);
  bindChange(axisFields, () => callbacks.onAxisAngle(axisAngleFromFields(root)));
  bindInput(["axis-angle"], () => callbacks.onAxisAngle(axisAngleFromFields(root)));
  bindInput(eulerFields, () => callbacks.onEuler(eulerFromFields(root)));

  root.querySelectorAll<HTMLButtonElement>("button[data-preset]").forEach((button) => {
    button.addEventListener("click", () => callbacks.onPreset(button.dataset.preset as Preset));
  });
}

const formatFixed = (value: number, digits: number) => {
  const formatted = value.toFixed(digits);
  return Number(formatted) === 0 ? (0).toFixed(digits) : formatted;
};

const formatQuaternion = (value: number) => formatFixed(value, 6);
const formatDegrees = (radians: number) => formatFixed((radians * 180) / Math.PI, 1);

export function formatNorm(values: readonly number[]): string {
  return values.every((value) => Number.isFinite(value))
    ? `‖q‖ = ${Math.hypot(...values).toFixed(6)}`
    : "‖q‖ = —";
}

export function renderControls(root: ParentNode, snapshot: OrientationSnapshot): void {
  snapshot.enuFlu.forEach((value, index) => {
    element<HTMLInputElement>(root, quaternionFields[index]!).value = formatQuaternion(value);
  });
  element<HTMLElement>(root, "norm-indicator").textContent = formatNorm(snapshot.enuFlu);
  snapshot.axisAngle.axis.forEach((value, index) => {
    element<HTMLInputElement>(root, axisFields[index]!).value = formatQuaternion(value);
  });

  const axisDegrees = formatDegrees(snapshot.axisAngle.angle);
  element<HTMLInputElement>(root, "axis-angle").value = axisDegrees;
  element<HTMLOutputElement>(root, "axis-angle-output").value = `${axisDegrees}°`;

  for (const [id, value] of [
    ["roll", snapshot.eulerEnu.roll],
    ["pitch", snapshot.eulerEnu.pitch],
    ["yaw", snapshot.eulerEnu.yaw],
  ] as const) {
    const degrees = formatDegrees(value);
    element<HTMLInputElement>(root, id).value = degrees;
    element<HTMLOutputElement>(root, `${id}-output`).value = `${degrees}°`;
  }
}
