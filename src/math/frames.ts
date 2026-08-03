import {
  canonicalize,
  multiply,
  toAxisAngle,
  toEulerZYX,
  type AxisAngle,
  type EulerZYXResult,
  type Quaternion,
  type Vec3,
} from "./quaternion";

const SQRT_HALF = Math.SQRT1_2;
export const Q_NED_TO_ENU: Quaternion = [0, SQRT_HALF, SQRT_HALF, 0];
export const Q_FLU_TO_FRD: Quaternion = [0, 1, 0, 0];

export const nedVectorToEnu = ([x, y, z]: Vec3): Vec3 => [y, x, -z];
export const enuVectorToNed = nedVectorToEnu;

export function nedFrdToEnuFlu(q: Quaternion): Quaternion {
  return canonicalize(multiply(multiply(Q_NED_TO_ENU, q), Q_FLU_TO_FRD));
}

export function enuFluToNedFrd(q: Quaternion): Quaternion {
  return canonicalize(multiply(multiply(Q_NED_TO_ENU, q), Q_FLU_TO_FRD));
}

export type OrientationSnapshot = Readonly<{
  enuFlu: Quaternion;
  nedFrd: Quaternion;
  eulerEnu: EulerZYXResult;
  axisAngle: AxisAngle;
}>;

export function snapshotFromEnu(q: Quaternion): OrientationSnapshot {
  const enuFlu = canonicalize(q);
  return {
    enuFlu,
    nedFrd: enuFluToNedFrd(enuFlu),
    eulerEnu: toEulerZYX(enuFlu),
    axisAngle: toAxisAngle(enuFlu),
  };
}

export const snapshotFromNed = (q: Quaternion): OrientationSnapshot =>
  snapshotFromEnu(nedFrdToEnuFlu(q));
