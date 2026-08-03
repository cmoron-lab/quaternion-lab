export type Vec3 = readonly [x: number, y: number, z: number];
export type Quaternion = readonly [w: number, x: number, y: number, z: number];
export type EulerZYX = Readonly<{ roll: number; pitch: number; yaw: number }>;
export type EulerZYXResult = EulerZYX & Readonly<{ gimbalLocked: boolean }>;
export type AxisAngle = Readonly<{ axis: Vec3; angle: number }>;

const EPSILON = 1e-10;
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function multiply(a: Quaternion, b: Quaternion): Quaternion {
  const [aw, ax, ay, az] = a;
  const [bw, bx, by, bz] = b;
  return [
    aw * bw - ax * bx - ay * by - az * bz,
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
  ];
}

export const conjugate = ([w, x, y, z]: Quaternion): Quaternion => [
  w,
  -x,
  -y,
  -z,
];

export function normalize(q: Quaternion): Quaternion {
  const length = Math.hypot(...q);
  if (!Number.isFinite(length) || length < EPSILON) {
    throw new RangeError("Un quaternion nul ne représente aucune rotation.");
  }
  return q.map((value) => value / length) as [number, number, number, number];
}

export function canonicalize(q: Quaternion): Quaternion {
  const normalized = normalize(q);
  return normalized[0] < 0
    ? (normalized.map((value) => -value) as [number, number, number, number])
    : normalized;
}

export function rotateVector(q: Quaternion, vector: Vec3): Vec3 {
  const unit = normalize(q);
  const rotated = multiply(multiply(unit, [0, ...vector]), conjugate(unit));
  return [rotated[1], rotated[2], rotated[3]];
}

export function fromAxisAngle({ axis, angle }: AxisAngle): Quaternion {
  const length = Math.hypot(...axis);
  if (!Number.isFinite(length) || length < EPSILON) {
    throw new RangeError("L'axe de rotation ne peut pas être nul.");
  }
  const scale = Math.sin(angle / 2) / length;
  return canonicalize([
    Math.cos(angle / 2),
    axis[0] * scale,
    axis[1] * scale,
    axis[2] * scale,
  ]);
}

export function toAxisAngle(q: Quaternion): AxisAngle {
  const [w, x, y, z] = canonicalize(q);
  const angle = 2 * Math.acos(clamp(w, -1, 1));
  const vectorLength = Math.sqrt(Math.max(0, 1 - w * w));
  return vectorLength < EPSILON
    ? { axis: [1, 0, 0], angle: 0 }
    : { axis: [x / vectorLength, y / vectorLength, z / vectorLength], angle };
}

export function fromEulerZYX({ roll, pitch, yaw }: EulerZYX): Quaternion {
  const [cr, sr] = [Math.cos(roll / 2), Math.sin(roll / 2)];
  const [cp, sp] = [Math.cos(pitch / 2), Math.sin(pitch / 2)];
  const [cy, sy] = [Math.cos(yaw / 2), Math.sin(yaw / 2)];
  return canonicalize([
    cr * cp * cy + sr * sp * sy,
    sr * cp * cy - cr * sp * sy,
    cr * sp * cy + sr * cp * sy,
    cr * cp * sy - sr * sp * cy,
  ]);
}

export function toEulerZYX(q: Quaternion): EulerZYXResult {
  const [w, x, y, z] = normalize(q);
  const sinPitch = clamp(2 * (w * y - z * x), -1, 1);
  const gimbalLocked = Math.abs(Math.abs(sinPitch) - 1) < 1e-9;
  if (gimbalLocked) {
    return {
      roll: 0,
      pitch: sinPitch < 0 ? -Math.PI / 2 : Math.PI / 2,
      yaw: Math.atan2(2 * (w * z - x * y), 1 - 2 * (x * x + z * z)),
      gimbalLocked,
    };
  }
  return {
    roll: Math.atan2(2 * (w * x + y * z), 1 - 2 * (x * x + y * y)),
    pitch: Math.asin(sinPitch),
    yaw: Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z)),
    gimbalLocked,
  };
}

export function sameOrientation(
  a: Quaternion,
  b: Quaternion,
  tolerance = 1e-9,
): boolean {
  const qa = normalize(a);
  const qb = normalize(b);
  const dot = qa.reduce(
    (sum, value, index) => sum + value * qb[index]!,
    0,
  );
  return Math.abs(Math.abs(dot) - 1) <= tolerance;
}
