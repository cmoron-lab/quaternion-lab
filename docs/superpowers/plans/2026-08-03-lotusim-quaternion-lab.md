# LOTUSim Quaternion Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire une application Three.js légère qui enseigne visuellement les quaternions puis les conventions xdyn NED/FRD et LOTUSim/Gazebo ENU/FLU.

**Architecture:** Une application Vite + TypeScript statique conserve une orientation canonique ENU/FLU et dérive toutes les autres représentations depuis cet état. Le noyau mathématique pur, la conversion de repères, la scène Three.js, le contenu pédagogique et l'orchestration DOM restent séparés sans framework ni backend.

**Tech Stack:** Bun 1.3+, TypeScript strict, Vite, Three.js, tests natifs `bun:test`, DOM/CSS natifs.

## Global Constraints

- La spécification approuvée est `docs/superpowers/specs/2026-08-03-lotusim-quaternion-lab-design.md`.
- Utiliser Bun uniquement; ne lancer ni npm, ni yarn, ni pnpm, ni `node` directement.
- Three.js est l'unique dépendance runtime; ne pas ajouter de framework UI, routeur, store, bibliothèque mathématique ou moteur de test.
- L'interface et les explications sont en français; les identifiants TypeScript restent en anglais.
- Les quaternions du domaine sont Hamilton et scalaire-premier: `[w, x, y, z]`.
- Une attitude transforme le repère corps vers le repère monde: `v_world = q ⊗ v_body ⊗ q*`.
- La conversion est `q_ENU_FLU = Q_NED_TO_ENU ⊗ q_NED_FRD ⊗ Q_FLU_TO_FRD` avec `Q_NED_TO_ENU = [0,√½,√½,0]` et `Q_FLU_TO_FRD = [0,1,0,0]`.
- Les cas corrects sont `heading_NED=0° -> yaw_ENU=+90°` et `heading_NED=+90° -> yaw_ENU=0°`; ne pas recopier les deux assertions C++ obsolètes décrites dans la spec.
- Comparer des orientations avec `abs(dot(q1,q2))`, jamais composante par composante, car `q` et `-q` sont équivalents.
- Le tutoriel reste skippable et reprenable pendant la session; aucune persistance n'est ajoutée.
- L'application fonctionne hors ligne hormis l'ouverture volontaire d'une source externe.
- Aucun fichier du dépôt frère `../LOTUSim` n'est modifié.

---

## File Map

- `package.json`: scripts Bun/Vite et dépendances minimales.
- `bun.lock`: verrou produit exclusivement par Bun.
- `.gitignore`: sorties locales `node_modules` et `dist`.
- `tsconfig.json`: TypeScript strict pour DOM et `bun:test`.
- `index.html`: structure sémantique stable du laboratoire.
- `src/main.ts`: composition de la scène, des contrôles et du tutoriel.
- `src/styles.css`: direction visuelle navale, responsive et reduced-motion.
- `src/math/quaternion.ts`: opérations quaternion/Euler/angle-axe pures.
- `src/math/quaternion.test.ts`: preuves du noyau de rotation.
- `src/math/frames.ts`: conversions NED/FRD ↔ ENU/FLU et snapshot canonique.
- `src/math/frames.test.ts`: oracles LOTUSim, cas de cap et aller-retour.
- `src/scene/lab-scene.ts`: objets Three.js, caméra Z-up et rendu schématique.
- `src/scene/lab-scene.test.ts`: frontière Three.js et structure du bateau.
- `src/tutorial/content.ts`: texte français, formules, pièges et sources.
- `src/tutorial/model.ts`: navigation en mémoire et évaluation du défi.
- `src/tutorial/model.test.ts`: navigation, exhaustivité et défi.
- `src/ui/controls.ts`: parsing, validation et synchronisation des contrôles.
- `src/ui/controls.test.ts`: validation des entrées numériques.
- `src/ui/app.ts`: orchestration DOM, tutoriel, comparaison et feedback.
- `README.md`: lancement, contrôles et conventions.

---

### Task 1: Project Shell and Scalar-First Quaternion Kernel

**Files:**
- Create: `package.json`
- Create: `bun.lock`
- Create: `.gitignore`
- Create: `tsconfig.json`
- Create: `index.html`
- Create: `src/main.ts`
- Create: `src/styles.css`
- Create: `src/math/quaternion.ts`
- Test: `src/math/quaternion.test.ts`

**Interfaces:**
- Consumes: aucune interface antérieure.
- Produces: `Vec3`, `Quaternion`, `EulerZYX`, `AxisAngle`, `normalize`, `canonicalize`, `multiply`, `conjugate`, `rotateVector`, `fromAxisAngle`, `toAxisAngle`, `fromEulerZYX`, `toEulerZYX`, `sameOrientation`.

- [ ] **Step 1: Write the failing quaternion tests**

```ts
// src/math/quaternion.test.ts
import { describe, expect, test } from "bun:test";
import {
  canonicalize,
  fromAxisAngle,
  fromEulerZYX,
  multiply,
  rotateVector,
  sameOrientation,
  toAxisAngle,
  toEulerZYX,
} from "./quaternion";

const closeTuple = (actual: readonly number[], expected: readonly number[]) => {
  expected.forEach((value, index) => expect(actual[index]!).toBeCloseTo(value, 10));
};

describe("scalar-first Hamilton quaternions", () => {
  test("keeps vectors fixed at identity", () => {
    closeTuple(rotateVector([1, 0, 0, 0], [1, -2, 3]), [1, -2, 3]);
  });

  for (const [label, axis, source, positive, negative] of [
    ["X", [1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 0, -1]],
    ["Y", [0, 1, 0], [0, 0, 1], [1, 0, 0], [-1, 0, 0]],
    ["Z", [0, 0, 1], [1, 0, 0], [0, 1, 0], [0, -1, 0]],
  ] as const) {
    test(`rotates by +90 and -90 degrees around ${label}`, () => {
      closeTuple(
        rotateVector(fromAxisAngle({ axis, angle: Math.PI / 2 }), source),
        positive,
      );
      closeTuple(
        rotateVector(fromAxisAngle({ axis, angle: -Math.PI / 2 }), source),
        negative,
      );
    });
  }

  test("applies qA then qB with qB multiplied on the left", () => {
    const qA = fromAxisAngle({ axis: [1, 0, 0], angle: Math.PI / 2 });
    const qB = fromAxisAngle({ axis: [0, 0, 1], angle: Math.PI / 2 });
    closeTuple(rotateVector(multiply(qB, qA), [0, 1, 0]), [0, 0, 1]);
    expect(sameOrientation(multiply(qB, qA), multiply(qA, qB))).toBe(false);
  });

  test("round-trips Z-Y'-X'' Euler angles away from singularity", () => {
    const source = { roll: 0.3, pitch: -0.2, yaw: 0.7 };
    const result = toEulerZYX(fromEulerZYX(source));
    expect(result.roll).toBeCloseTo(source.roll, 10);
    expect(result.pitch).toBeCloseTo(source.pitch, 10);
    expect(result.yaw).toBeCloseTo(source.yaw, 10);
    expect(result.gimbalLocked).toBe(false);
  });

  test("marks the ZYX singularity at 90 degrees of pitch", () => {
    const q = fromEulerZYX({ roll: 0, pitch: Math.PI / 2, yaw: 0 });
    expect(toEulerZYX(q).gimbalLocked).toBe(true);
  });

  test("treats q and -q as the same orientation", () => {
    const q = canonicalize([0.5, 0.5, 0.5, 0.5]);
    const negative = q.map((value) => -value) as [number, number, number, number];
    expect(sameOrientation(q, negative)).toBe(true);
    expect(toAxisAngle(q).angle).toBeCloseTo((2 * Math.PI) / 3, 10);
  });

  test("normalizes finite values and rejects the zero quaternion", () => {
    expect(canonicalize([2, 0, 0, 0])).toEqual([1, 0, 0, 0]);
    expect(() => canonicalize([0, 0, 0, 0])).toThrow(RangeError);
  });
});
```

- [ ] **Step 2: Run the focused test and confirm the missing module failure**

Run: `bun test ./src/math/quaternion.test.ts`
Expected: FAIL because `src/math/quaternion.ts` does not exist.

- [ ] **Step 3: Create the minimal Bun/Vite shell**

Create `package.json` with:

```json
{
  "name": "lotusim-quaternion-lab",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "test": "bun test",
    "typecheck": "tsc --noEmit",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview"
  }
}
```

Run:

```bash
bun add three
bun add -d vite typescript @types/bun @types/three
```

Create `tsconfig.json` with:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["bun"]
  },
  "include": ["src"]
}
```

Create `.gitignore` with `node_modules/`, `dist/` and `.DS_Store`. Create an
`index.html` containing `<div id="app">Chargement du laboratoire…</div>` and a
module script for `/src/main.ts`. `main.ts` imports `styles.css` and replaces
that text with `LOTUSim Quaternion Lab`. Keep CSS to a body reset in this task.

- [ ] **Step 4: Implement the scalar-first math functions**

```ts
// src/math/quaternion.ts
export type Vec3 = readonly [x: number, y: number, z: number];
export type Quaternion = readonly [w: number, x: number, y: number, z: number];
export type EulerZYX = Readonly<{ roll: number; pitch: number; yaw: number }>;
export type EulerZYXResult = EulerZYX & Readonly<{ gimbalLocked: boolean }>;
export type AxisAngle = Readonly<{ axis: Vec3; angle: number }>;

const EPSILON = 1e-10;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

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

export const conjugate = ([w, x, y, z]: Quaternion): Quaternion => [w, -x, -y, -z];

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
    ? normalized.map((value) => -value) as [number, number, number, number]
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
  return canonicalize([Math.cos(angle / 2), axis[0] * scale, axis[1] * scale, axis[2] * scale]);
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
  return {
    roll: Math.atan2(2 * (w * x + y * z), 1 - 2 * (x * x + y * y)),
    pitch: Math.asin(sinPitch),
    yaw: Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z)),
    gimbalLocked: Math.abs(Math.abs(sinPitch) - 1) < 1e-9,
  };
}

export function sameOrientation(a: Quaternion, b: Quaternion, tolerance = 1e-9): boolean {
  const qa = normalize(a);
  const qb = normalize(b);
  const dot = qa.reduce((sum, value, index) => sum + value * qb[index]!, 0);
  return Math.abs(Math.abs(dot) - 1) <= tolerance;
}
```

- [ ] **Step 5: Run kernel verification**

Run:

```bash
bun test ./src/math/quaternion.test.ts
bun run typecheck
bun run build
```

Expected: tests PASS, TypeScript exits 0, and Vite creates `dist/`.

- [ ] **Step 6: Commit the working foundation**

```bash
git add package.json bun.lock .gitignore tsconfig.json index.html src
git commit -m "feat: establish scalar-first rotation kernel"
```

---

### Task 2: LOTUSim Frame Conversion and Canonical Snapshot

**Files:**
- Create: `src/math/frames.ts`
- Test: `src/math/frames.test.ts`

**Interfaces:**
- Consumes: quaternion interfaces from Task 1.
- Produces: `Q_NED_TO_ENU`, `Q_FLU_TO_FRD`, `nedVectorToEnu`, `enuVectorToNed`, `nedFrdToEnuFlu`, `enuFluToNedFrd`, `OrientationSnapshot`, `snapshotFromEnu`, `snapshotFromNed`.

- [ ] **Step 1: Write corrected LOTUSim frame tests**

```ts
// src/math/frames.test.ts
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
```

- [ ] **Step 2: Run the frame test and confirm it fails**

Run: `bun test ./src/math/frames.test.ts`
Expected: FAIL because `src/math/frames.ts` does not exist.

- [ ] **Step 3: Implement the two-sided frame conversion**

```ts
// src/math/frames.ts
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
```

- [ ] **Step 4: Run all math checks**

Run:

```bash
bun test ./src/math/quaternion.test.ts ./src/math/frames.test.ts
bun run typecheck
```

Expected: all tests PASS and TypeScript exits 0.

- [ ] **Step 5: Commit the conventions**

```bash
git add src/math/frames.ts src/math/frames.test.ts
git commit -m "feat: encode LOTUSim frame conventions"
```

---

### Task 3: Lightweight Z-Up Three.js Scene

**Files:**
- Create: `src/scene/lab-scene.ts`
- Test: `src/scene/lab-scene.test.ts`
- Modify: `src/main.ts`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: canonical ENU/FLU `Quaternion` from Task 1.
- Produces: `toThreeQuaternion(q)`, `createBoat()`, and `LabScene` with
  `setOrientation`, `animateOrientation`, `pauseAnimation`, `replayAnimation`,
  `setAnimationSpeed`, `setGhostOrientation`, `setRotationAxis`,
  `setGimbalAngles`, `setComparison`, `setComparisonPhase`, `resetCamera`,
  `resize`, and `dispose`.

- [ ] **Step 1: Write a headless scene-structure test**

```ts
// src/scene/lab-scene.test.ts
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
```

- [ ] **Step 2: Run the scene test and confirm it fails**

Run: `bun test ./src/scene/lab-scene.test.ts`
Expected: FAIL because `src/scene/lab-scene.ts` does not exist.

- [ ] **Step 3: Implement the procedural boat and quaternion adapter**

Use `THREE.Group`, `BoxGeometry`, `ConeGeometry`, `MeshStandardMaterial` and
`ArrowHelper`. Author the hull in FLU: bow along `+X`, port at `+Y`, starboard
at `-Y`, up at `+Z`. Name the objects exactly as asserted. Port is red,
starboard is green, and a DOM legend added in Step 5 repeats every semantic
direction so color is never the only cue.

```ts
export const toThreeQuaternion = ([w, x, y, z]: Quaternion) =>
  new THREE.Quaternion(x, y, z, w).normalize();
```

- [ ] **Step 4: Implement `LabScene` with a Z-up camera**

Create one `WebGLRenderer`, `Scene`, `PerspectiveCamera` and `OrbitControls`
imported from `three/addons/controls/OrbitControls.js`. Set
`camera.up.set(0, 0, 1)`. Rotate `GridHelper` into the XY plane. Add world axes,
flat water, ambient light and directional light. Keep one main boat, one
transparent ghost, two optional comparison boats, one arbitrary-axis arrow and
three lightweight `TorusGeometry` Euler rings.

```ts
export class LabScene {
  constructor(container: HTMLElement);
  setOrientation(q: Quaternion): void;
  animateOrientation(q: Quaternion, durationMs?: number): void;
  pauseAnimation(paused: boolean): void;
  replayAnimation(): void;
  setAnimationSpeed(speed: 0.5 | 1): void;
  setGhostOrientation(q: Quaternion | null): void;
  setRotationAxis(axis: Vec3 | null): void;
  setGimbalAngles(euler: EulerZYX | null): void;
  setComparison(left: Quaternion | null, right: Quaternion | null): void;
  setComparisonPhase(phase: "none" | "world" | "body" | "full"): void;
  resetCamera(): void;
  resize(): void;
  dispose(): void;
}
```

`setComparison(null, null)` restores the centered main boat. With two values,
place the comparison boats at `x=-2` and `x=+2`; do not create a second
renderer. `setComparisonPhase` changes visibility/opacity of labelled world
and body axes only; never render the mixed-convention algebraic intermediate
as a physical FLU boat. Animate with Three.js quaternion slerp in the existing
`requestAnimationFrame` loop, retain start/target for replay, and cancel the
loop in `dispose`.

- [ ] **Step 5: Mount the first visible laboratory**

Replace the placeholder in `main.ts` with a `.scene-shell`, a canvas container,
a reset-camera button and this textual axis legend:

```text
Monde ENU: X Est · Y Nord · Z Haut
Corps FLU: X Avant · Y Gauche · Z Haut
```

Instantiate `LabScene` at identity, bind reset, and call `resize` through
`ResizeObserver`. Catch renderer startup errors once and replace the canvas
container with `La scène 3D n'a pas pu démarrer sur ce navigateur.`.

- [ ] **Step 6: Verify the scene**

Run:

```bash
bun test ./src/scene/lab-scene.test.ts
bun run typecheck
bun run build
bun run dev --host 127.0.0.1
```

Expected: tests and build PASS; the page shows a schematic boat, labelled axis
legend, Z-up grid, orbit controls and working camera reset. Stop the dev server.

- [ ] **Step 7: Commit the scene**

```bash
git add src/main.ts src/styles.css src/scene
git commit -m "feat: make frame orientation visible"
```

---

### Task 4: Pedagogical Content, Navigation, and Challenge Model

**Files:**
- Create: `src/tutorial/content.ts`
- Create: `src/tutorial/model.ts`
- Test: `src/tutorial/model.test.ts`

**Interfaces:**
- Consumes: `Quaternion` and corrected frame functions.
- Produces: `TUTORIAL_SCREENS`, `TutorialState`, `startTutorial`, `nextScreen`, `previousScreen`, `skipTutorial`, `resumeTutorial`, `restartTutorial`, `CHALLENGE_OPTIONS`, and `evaluateChallenge`.

- [ ] **Step 1: Write content and navigation contract tests**

```ts
// src/tutorial/model.test.ts
import { describe, expect, test } from "bun:test";
import { TUTORIAL_SCREENS } from "./content";
import {
  CHALLENGE_OPTIONS,
  evaluateChallenge,
  nextScreen,
  restartTutorial,
  resumeTutorial,
  skipTutorial,
  startTutorial,
} from "./model";

describe("tutorial", () => {
  test("contains five lessons and one final challenge", () => {
    expect(TUTORIAL_SCREENS.map((screen) => screen.id)).toEqual([
      "frames", "axis-angle", "composition", "gimbal-lock", "lotusim-xdyn", "challenge",
    ]);
    for (const screen of TUTORIAL_SCREENS) {
      expect(screen.summary.length).toBeGreaterThan(40);
      expect(screen.details.length).toBeGreaterThan(1);
      expect(screen.sources.length).toBeGreaterThan(0);
    }
  });

  test("skips and resumes without losing the in-memory step", () => {
    const advanced = nextScreen(startTutorial());
    const skipped = skipTutorial(advanced);
    expect(skipped.mode).toBe("sandbox");
    expect(resumeTutorial(skipped).screenIndex).toBe(1);
    expect(restartTutorial(skipped).screenIndex).toBe(0);
  });

  test("accepts equivalent signs and explains distractors", () => {
    expect(evaluateChallenge("correct").correct).toBe(true);
    expect(evaluateChallenge("sign-equivalent").correct).toBe(true);
    expect(evaluateChallenge("missing-world-swap").feedback).toContain("NED");
    expect(evaluateChallenge("missing-body-swap").feedback).toContain("FRD");
    expect(evaluateChallenge("reversed-order").feedback).toContain("ordre");
    expect(evaluateChallenge("scalar-last").feedback).toContain("qr");

    expect(CHALLENGE_OPTIONS.map(({ id, quaternion }) => [id, quaternion])).toEqual([
      ["correct", [1, 0, 0, 0]],
      ["sign-equivalent", [-1, 0, 0, 0]],
      ["missing-world-swap", [0, Math.SQRT1_2, Math.SQRT1_2, 0]],
      ["missing-body-swap", [0, 1, 0, 0]],
      ["reversed-order", [0, 0, 0, 1]],
      ["scalar-last", [0.5, 0.5, 0.5, 0.5]],
    ]);
  });
});
```

- [ ] **Step 2: Run the tutorial test and confirm it fails**

Run: `bun test ./src/tutorial/model.test.ts`
Expected: FAIL because tutorial modules do not exist.

- [ ] **Step 3: Define the complete lesson records**

Use this exact data shape:

```ts
export type TutorialScreen = Readonly<{
  id: "frames" | "axis-angle" | "composition" | "gimbal-lock" | "lotusim-xdyn" | "challenge";
  title: string;
  summary: string;
  observe: string;
  formula?: string;
  details: readonly string[];
  pitfalls: readonly string[];
  sources: readonly Readonly<{ label: string; url: string }>[];
}>;
```

Populate the six records with these exact teaching claims:

- **Repères:** a quaternion describes a body's orientation relative to a world
  frame, not four independent angles; define NED, FRD, ENU and FLU; show
  `v_world=q⊗v_body⊗q*`; explain that changing convention preserves attitude but
  changes components and that NED identity maps to `+90°` ENU yaw.
- **Angle–axe:** define unit axis `u`, angle `θ`,
  `q=(cos(θ/2),u sin(θ/2))`; derive unit norm; explain the half-angle and why
  `q` and `-q` encode the same rotation.
- **Composition:** applying active body-to-world rotation `A` then `B` produces
  `qB⊗qA`; demonstrate non-commutativity and distinguish world axes from
  already-rotated body axes.
- **Gimbal lock:** define Euler `Z-Y'-X''`; at pitch `±90°`, explain that first
  and third axes align, yaw and roll become coupled, and multiple Euler triples
  describe one attitude; state that this is a coordinate singularity and that
  converting a quaternion back to Euler still meets the Euler singularity.
- **LOTUSim/xdyn:** show both swap quaternions and the two-sided product; explain
  scalar-first xdyn order versus Three.js `(x,y,z,w)`; work
  `heading 0° -> yaw +90°` and `heading +90° -> yaw 0°`.
- **Défi:** ask for the ENU/FLU representation of xdyn
  `[√½,0,0,√½]`, accept identity and its negative, and introduce the diagnostic
  distractors returned by `evaluateChallenge`.

Attach URLs from the approved spec. The gimbal screen includes NASA and SciPy;
LOTUSim/xdyn includes ROS and the local convention wording. All explanations
remain present when links are offline.

- [ ] **Step 4: Implement pure session navigation and challenge evaluation**

```ts
export type TutorialState = Readonly<{
  mode: "tutorial" | "sandbox";
  screenIndex: number;
  detailsOpen: boolean;
}>;

export type ChallengeOptionId =
  | "correct"
  | "sign-equivalent"
  | "missing-world-swap"
  | "missing-body-swap"
  | "reversed-order"
  | "scalar-last";

// Import `Quaternion` from `../math/quaternion` in this module.
export const CHALLENGE_OPTIONS = [
  { id: "correct", quaternion: [1, 0, 0, 0] },
  { id: "sign-equivalent", quaternion: [-1, 0, 0, 0] },
  { id: "missing-world-swap", quaternion: [0, Math.SQRT1_2, Math.SQRT1_2, 0] },
  { id: "missing-body-swap", quaternion: [0, 1, 0, 0] },
  { id: "reversed-order", quaternion: [0, 0, 0, 1] },
  { id: "scalar-last", quaternion: [0.5, 0.5, 0.5, 0.5] },
] as const satisfies readonly Readonly<{
  id: ChallengeOptionId;
  quaternion: Quaternion;
}>[];
```

Clamp next/previous indices. `skipTutorial` changes only `mode`.
`resumeTutorial` restores `tutorial` at the same index. `restartTutorial`
returns index zero and closes details. `evaluateChallenge` returns concrete
French feedback for every ID; both first options are correct. For the challenge
input `q=[√½,0,0,√½]`, the world-swap omission is `q⊗Q_FLU_TO_FRD`, the
body-swap omission is `Q_NED_TO_ENU⊗q`, and reversed order is
`Q_FLU_TO_FRD⊗q⊗Q_NED_TO_ENU`; keep these derivations in comments next to the
literal options so each diagnostic remains auditable.

- [ ] **Step 5: Verify tutorial data and commit**

Run:

```bash
bun test ./src/tutorial/model.test.ts
bun run typecheck
```

Expected: PASS with no empty content record.

```bash
git add src/tutorial
git commit -m "feat: make quaternion lessons progressive"
```

---

### Task 5: Native Controls and Synchronized Sandbox

**Files:**
- Create: `src/ui/controls.ts`
- Test: `src/ui/controls.test.ts`
- Create: `src/ui/app.ts`
- Modify: `index.html`
- Modify: `src/main.ts`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: snapshots from Task 2 and `LabScene` from Task 3.
- Produces: `ValidationResult`, `validateQuaternionInput`, `validateAxisAngleInput`, `readFinite`, `bindControls`, `renderControls`, and `mountLabApp`.

- [ ] **Step 1: Write control-boundary tests**

```ts
// src/ui/controls.test.ts
import { describe, expect, test } from "bun:test";
import { readFinite, validateAxisAngleInput, validateQuaternionInput } from "./controls";

describe("sandbox validation", () => {
  test("rejects non-finite input", () => {
    expect(readFinite("NaN", "roll").ok).toBe(false);
  });

  test("keeps normalization visible", () => {
    const result = validateQuaternionInput([2, 0, 0, 0]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual([1, 0, 0, 0]);
      expect(result.note).toContain("norme 2");
    }
  });

  test("explains canonical sign without changing the rotation", () => {
    const result = validateQuaternionInput([-1, 0, 0, 0]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual([1, 0, 0, 0]);
      expect(result.note).toContain("q et -q");
    }
  });

  test("rejects zero quaternion and zero axis", () => {
    expect(validateQuaternionInput([0, 0, 0, 0]).ok).toBe(false);
    expect(validateAxisAngleInput([0, 0, 0], Math.PI / 2).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run the control test and confirm it fails**

Run: `bun test ./src/ui/controls.test.ts`
Expected: FAIL because `src/ui/controls.ts` does not exist.

- [ ] **Step 3: Implement explicit validation results**

```ts
export type ValidationResult<T> =
  | Readonly<{ ok: true; value: T; note: string | null }>
  | Readonly<{ ok: false; message: string }>;

export function readFinite(raw: string, label: string): ValidationResult<number>;
export function validateQuaternionInput(raw: Quaternion): ValidationResult<Quaternion>;
export function validateAxisAngleInput(axis: Vec3, angle: number): ValidationResult<Quaternion>;
```

`readFinite` uses `Number(raw)` and `Number.isFinite`. Quaternion validation
computes the raw norm, rejects norm `<1e-10`, normalizes, then canonicalizes to
`w >= 0`. It returns `Quaternion normalisé: norme X → 1` whenever
`|norm-1| > 1e-9` and `q et -q décrivent la même rotation; affichage canonique
w >= 0` whenever the sign flips; combine both notes if needed. Axis validation
delegates to `fromAxisAngle` and converts its `RangeError` into French feedback.
Never catch an error without returning or displaying it.

- [ ] **Step 4: Replace `index.html` with the stable semantic layout**

Create:

- a header containing convention badge, `Passer au bac à sable`,
  `Reprendre le tutoriel` and `Recommencer` buttons;
- `<main>` with a `section` for `#scene-container`, reset-camera button and
  textual axis legend;
- an `aside` with fieldsets for quaternion `w/x/y/z`, angle-axis, and Euler
  `roll/pitch/yaw`;
- degree ranges `roll/yaw [-180,180]`, `pitch [-90,90]`, angle-axis `[0,180]`,
  paired with numeric outputs;
- preset buttons: identity ENU, roll 30°, pitch 90°, xdyn North and xdyn East;
- `#validation-message`, `#normalization-note`, `#gimbal-warning` live regions;
- `#lesson-panel`, which Task 6 fills.

Every input has a real `<label>`. Buttons use `type="button"`. Do not encode
meaning only in placeholder text.

- [ ] **Step 5: Bind controls and render one canonical snapshot**

`bindControls` receives callbacks for quaternion, axis-angle, Euler and preset
updates. Use `change` for numeric quaternion fields and `input` for ranges.
`renderControls(snapshot)` writes all derived values without firing new input
events. Display six decimals for quaternion components and one decimal degree
for angles.

In `mountLabApp`:

1. start at identity ENU/FLU;
2. preserve the previous valid quaternion for the ghost boat;
3. validate input, derive a new snapshot, then update scene and every control;
4. retain the last valid state on error;
5. display normalization notes explicitly;
6. show the gimbal warning when `snapshot.eulerEnu.gimbalLocked` is true;
7. map xdyn presets through `snapshotFromNed`, never directly to Three.js.

- [ ] **Step 6: Verify the synchronized sandbox**

Run:

```bash
bun test ./src/ui/controls.test.ts
bun test
bun run typecheck
bun run build
bun run dev --host 127.0.0.1
```

Expected browser behavior: every input updates the boat and other
representations; quaternion `[2,0,0,0]` visibly normalizes; zero quaternion
leaves the previous attitude; pitch 90° shows the warning; xdyn North shows
ENU yaw +90° and xdyn East shows yaw 0°. Stop the server.

- [ ] **Step 7: Commit the sandbox**

```bash
git add index.html src/main.ts src/styles.css src/ui
git commit -m "feat: keep orientation views synchronized"
```

---

### Task 6: Skippable Tutorial, Detailed Explanations, Comparison, and Challenge

**Files:**
- Modify: `src/ui/app.ts`
- Modify: `src/scene/lab-scene.ts`
- Modify: `src/tutorial/content.ts`
- Modify: `src/tutorial/model.ts`
- Test: `src/tutorial/model.test.ts`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: tutorial state/model from Task 4 and controls from Task 5.
- Produces: complete guided flow using the existing `mountLabApp`; no new public module boundary.

- [ ] **Step 1: Add failing edge assertions to the tutorial model test**

Add assertions that `nextScreen` stops at the challenge, `previousScreen` stops
at frames, and every source URL starts with `https://`.

Run: `bun test ./src/tutorial/model.test.ts`
Expected: FAIL until clamping and source data satisfy the assertions.

- [ ] **Step 2: Render navigation without gating the sandbox**

Render title, `summary`, `observe`, formula, pitfalls and navigation for the
active screen. The short explanation remains visible. Put `details` and sources
inside native `<details><summary>Comprendre en détail</summary>`. External
anchors use `target="_blank"` and `rel="noreferrer"`.

Wire:

- skip → `skipTutorial`, hide lesson panel, keep current quaternion;
- resume → `resumeTutorial`, restore the same screen;
- restart → `restartTutorial`, reset to ENU identity;
- previous/next → update in-memory screen and apply its demonstration preset;
- details toggle → update `detailsOpen` without changing orientation.

- [ ] **Step 3: Add deterministic visual demonstrations**

Use these presets:

- frames: xdyn North converted to ENU;
- axis-angle: axis `[0,0,1]`, angle `60°`;
- axis-angle also offers `Afficher -q`; a separate equivalent-representation
  card flips the displayed signs while canonical controls and boat remain
  unchanged;
- composition: `A=roll 90°`, `B=yaw 90°`, ghost shows A and main boat shows
  `qB⊗qA`; a swap button shows `qA⊗qB`;
- gimbal lock: roll `20°`, pitch `90°`, yaw `35°`; show the three Euler rings
  aligning, plus reset;
- LOTUSim/xdyn: xdyn heading `0°`, two numeric convention cards and two boats
  representing the same physical attitude;
- challenge: xdyn `[√½,0,0,√½]` and no preselected answer.

For LOTUSim, expose `Monde`, `Corps`, `Conversion complète`. They highlight
`Q_NED_TO_ENU`, `Q_FLU_TO_FRD`, then the full product and call
`setComparisonPhase`; they do not introduce a different calculation path or
display a mixed-convention intermediate as a physical attitude.

Add `Rejouer`, `Pause/Reprendre` and speed `0,5× / 1×` controls backed by
the scene animation methods. With `prefers-reduced-motion`, orientation changes
jump to the target and replay remains available as a labelled action.

- [ ] **Step 4: Render and evaluate the final challenge**

Render one button per `CHALLENGE_OPTIONS` quaternion without exposing its
diagnostic ID. On selection, call `evaluateChallenge`, show full French
feedback in `aria-live="polite"`, and preview the chosen orientation. Both
identity signs pass. Retry clears feedback but not tutorial progress.

- [ ] **Step 5: Complete every expanded explanation**

Ensure each screen contains, in order:

1. exact definition;
2. derivation tied to current values;
3. numeric worked example;
4. common convention mistake;
5. external source links.

The gimbal copy must say `singularité de représentation` and
`l'orientation physique existe toujours`. LOTUSim copy must show
`(qr,qi,qj,qk)=(w,x,y,z)` and Three.js `(x,y,z,w)` together.

- [ ] **Step 6: Run automated and browser checks**

Run:

```bash
bun test
bun run typecheck
bun run build
bun run dev --host 127.0.0.1
```

Browser path:

1. advance frames → angle-axis → composition;
2. swap composition order and observe a different attitude;
3. open gimbal detail, trigger 90° pitch and read the warning;
4. advance to LOTUSim and switch its three explanation phases;
5. answer with identity and `-identity`, both accepted;
6. retry with missing body swap and read FRD feedback;
7. restart, skip immediately, then resume at frames.

Expected: no console errors, no network needed for local content, and controls
remain usable after navigation. Stop the dev server.

- [ ] **Step 7: Commit the complete learning flow**

```bash
git add src/ui/app.ts src/scene/lab-scene.ts src/tutorial src/styles.css
git commit -m "feat: explain quaternion traps in context"
```

---

### Task 7: Accessibility, Documentation, and Final Evidence

**Files:**
- Create: `README.md`
- Modify: `src/styles.css`
- Modify: `index.html`
- Modify: `src/ui/app.ts`

**Interfaces:**
- Consumes: complete application from Tasks 1–6.
- Produces: documented and verified V1; no new runtime API.

- [ ] **Step 1: Document the reproducible runbook**

Write `README.md` with these commands:

```bash
bun install
bun run dev
bun test
bun run typecheck
bun run build
bun run preview
```

Document tutorial/sandbox behavior, scalar-first xdyn convention, two-sided
formula, correct North/East heading examples, external sources, and the fact
that live simulation/log import are excluded.

- [ ] **Step 2: Finish responsive and accessible behavior**

Keep a desktop grid with scene dominant. At `max-width: 900px`, stack scene,
controls and lesson without hiding content. Ensure visible focus, readable
contrast, minimum 44px primary button targets, and labels in addition to axis
colors. Under `@media (prefers-reduced-motion: reduce)`, disable CSS transitions
and make teaching animations jump to their final state while replay remains
available.

Convention, quaternion values, warnings and challenge feedback remain readable
in DOM text independently of the canvas.

- [ ] **Step 3: Run the full local quality gate**

Run:

```bash
bun install --frozen-lockfile
bun test
bun run typecheck
bun run build
git diff --check
```

Expected: every command exits 0 and `dist/` contains a static build.

- [ ] **Step 4: Run the final browser smoke**

Start `bun run dev --host 127.0.0.1`, then verify desktop and narrow viewport:

- page loads without console error;
- camera orbit/reset works and axes remain labelled;
- tutorial is immediately skippable and later resumable;
- quaternion, angle-axis and Euler controls stay synchronized;
- invalid/normalized values are explicit;
- gimbal explanation is complete and collapsible;
- NED/FRD and ENU/FLU match the corrected heading relation;
- challenge diagnostics work;
- keyboard traversal reaches every control;
- reduced-motion emulation removes animated transitions;
- local app still works with network disabled.

Capture one desktop and one narrow screenshot outside Git unless the user asks
to version them. Stop the server cleanly.

- [ ] **Step 5: Commit documentation and final polish**

```bash
git add README.md index.html src/styles.css src/ui/app.ts
git commit -m "docs: make quaternion lab reproducible"
```

- [ ] **Step 6: Record final evidence**

Run:

```bash
git status --short --branch
git log --oneline --decorate -10
```

Expected: clean `main`, seven implementation commits after design/plan commits,
with retained test, typecheck, build and browser-smoke evidence.
