# LOTUSim Quaternion Lab — design

Date: 2026-08-03  
Status: approved in conversation

## Purpose

Build a small graphical application that helps a developer understand
quaternions through direct manipulation, while staying mathematically exact
about the conventions used by LOTUSim, Gazebo and xdyn.

The application is a standalone, static Three.js laboratory. It starts with a
short guided tutorial that can be skipped at any time, then exposes the same
scene as a free sandbox.

The experience succeeds when a user can:

1. explain what a unit quaternion represents and relate it to an axis and an
   angle;
2. predict the effect and order of composed rotations, and explain Euler
   gimbal lock;
3. explain and recognize the xdyn NED/FRD to LOTUSim/Gazebo ENU/FLU
   conversion;
4. solve a final visual challenge covering those three abilities.

## Scope

### Included in V1

- French-language interface and explanations;
- one continuous Three.js laboratory;
- a short, skippable and restartable tutorial;
- a free sandbox using built-in examples only;
- synchronized quaternion, axis-angle and Euler representations;
- explicit LOTUSim, Gazebo and xdyn frame conventions;
- complete, collapsible mathematical explanations with external sources;
- a final challenge with explanatory feedback;
- desktop-first responsive layout and accessibility basics.

### Explicitly excluded from V1

- ROS, Gazebo or xdyn live connections;
- importing logs, messages or arbitrary scenario files;
- backend, authentication or database;
- saved accounts, scores, gamification or progression across devices;
- a heavy boat model, realistic water, textures or decorative effects;
- a UI framework, router, state library or internationalization framework.

## Canonical mathematical conventions

The labels and formulae below are part of the product, not implementation
details hidden from the learner.

| Context | World frame | Body frame | Quaternion convention |
| --- | --- | --- | --- |
| xdyn | NED: `x=North`, `y=East`, `z=Down` | FRD: `x=Forward`, `y=Right`, `z=Down` | Hamilton, body to world, scalar first `(qr,qi,qj,qk)=(w,x,y,z)` |
| LOTUSim/Gazebo | ENU: `x=East`, `y=North`, `z=Up` | FLU: `x=Forward`, `y=Left`, `z=Up` | Hamilton, body to world |
| Three.js boundary | ENU with a Z-up camera and grid | procedural boat authored as FLU | normalized constructor/storage order `(x,y,z,w)` |

The Euler teaching convention is yaw-pitch-roll `Z-Y'-X''`, matching the
LOTUSim/xdyn documentation. Angles are displayed in degrees and calculated in
radians.

The complete attitude conversion changes both the world frame and the body
frame:

```text
Q_NED_TO_ENU = (0, 1/sqrt(2), 1/sqrt(2), 0)
Q_FLU_TO_FRD = (0, 1, 0, 0)

q_ENU_FLU = Q_NED_TO_ENU ⊗ q_NED_FRD ⊗ Q_FLU_TO_FRD
```

All tuples in that formula are scalar first. The corresponding world-vector
mapping is:

```text
(x_north, y_east, z_down) -> (y_east, x_north, -z_down)
```

Ordinary conversion outputs follow the LOTUSim oracle's presentation rule
`w >= 0` for stable display. The double-cover lesson deliberately shows both
`q` and `-q` before that presentation rule; they represent the same physical
orientation and are always accepted as equivalent.

For active rotations, the product `q_b ⊗ q_a` means "apply `q_a`, then
`q_b`". The composition lesson labels this order explicitly instead of relying
on multiplication notation alone.

The canonical application state is a normalized ENU/FLU orientation. Any
input representation is validated and converted to this state; every other
representation is derived from it. Representations are never converted in a
chain, avoiding drift and order-dependent UI behavior.

The renderer uses ENU directly and configures its camera and grid as Z-up.
This avoids adding a hidden renderer-frame conversion. A single explicit
adapter changes component order from the mathematical `(w,x,y,z)` to the
Three.js `(x,y,z,w)` boundary.

## Source of truth

LOTUSim project behavior takes precedence over generic external explanations.
Implementation and tests will be checked against these sibling-repository
files:

- `../LOTUSim/docs/frames_check.py` — executable quaternion/frame oracle;
- `../LOTUSim/systems/physics_engine_interface/include/physics_engine_interface/xdyn_websocket.hpp`
  — conversion constants;
- `../LOTUSim/systems/physics_engine_interface/src/xdyn_websocket.cpp` — runtime
  conversion and wire order;
- `../LOTUSim/systems/physics_engine_interface/test/test_ned_enu_conversions.cpp`
  — known conversion cases.

External references complement but do not override those project conventions:

- [NASA TM-74839 — Euler angles, quaternions, and transformation matrices](https://ntrs.nasa.gov/citations/19770024290);
- [ROS 2 — Quaternion fundamentals](https://docs.ros.org/en/rolling/Tutorials/Intermediate/Tf2/Quaternion-Fundamentals.html);
- [Three.js — Quaternion](https://threejs.org/docs/pages/Quaternion.html);
- [SciPy — Rotation](https://docs.scipy.org/doc/scipy/reference/generated/scipy.spatial.transform.Rotation.html);
- [Solà — Why and How to Avoid the Flipped Quaternion Multiplication](https://arxiv.org/abs/1801.07478).

## Architecture

Use a standalone Vite + TypeScript application managed with Bun. Three.js is
the only required runtime dependency. The interface uses native DOM, CSS and
browser math markup; there is no frontend framework or backend.

The code has five small responsibilities:

- **math**: pure quaternion, axis-angle, Euler and frame-conversion functions;
- **state**: the canonical orientation and derived display values;
- **scene**: the boat, frames, camera, ghost orientation and animation;
- **tutorial**: static lesson content, current step and challenge answers;
- **UI**: controls, explanations, validation feedback and layout.

Data always flows in one direction:

```text
user action
  -> parse and validate
  -> convert to canonical ENU/FLU orientation
  -> derive all mathematical representations
  -> update scene, controls and explanation values
```

Changing the camera never changes the orientation. Changing the displayed
convention never changes the physical attitude; it changes only its
representation and labelled frames.

## Screen and navigation

The screen remains structurally stable throughout the tutorial and sandbox:

- top bar: current convention and an always-visible "Passer au bac à sable"
  action;
- center: Three.js scene with boat, world frame, body frame, horizon and grid;
- side panel: synchronized quaternion, axis-angle and Euler values and inputs;
- lesson panel: short explanation, requested action, navigation and expandable
  detail.

Skipping opens the sandbox immediately and keeps the current orientation.
"Reprendre le tutoriel" returns to the last step visited during the current
page session; "Recommencer" returns to the first step and identity orientation.
No mandatory completion or persistent progress is introduced.

## Tutorial

The tutorial reuses the same laboratory and progressively reveals controls.

### 1. Frames

Distinguish world and body frames, then compare NED/FRD with ENU/FLU. Axis
labels include both the letter and semantic direction. Switching convention
keeps the same physical orientation.

### 2. Axis-angle and quaternion

Manipulate a visible unit axis and angle. Build the quaternion progressively:

```text
q = (cos(theta/2), u * sin(theta/2))
```

Connect each live component to the visible axis and explain the half-angle.

### 3. Composition

Apply two rotations successively. A ghost boat shows the intermediate
orientation. Swapping the order makes non-commutativity visible before showing
the corresponding quaternion products.

### 4. Euler angles and gimbal lock

Manipulate yaw, pitch and roll in `Z-Y'-X''` order. At pitch `+/-90 degrees`,
show that the first and third rotation axes align and the Euler decomposition
can no longer distinguish two degrees of freedom uniquely. Make explicit that
the physical orientation still exists: the singularity belongs to this Euler
parameterization, while a unit quaternion continues to represent the
orientation without that coordinate singularity.

### 5. LOTUSim and xdyn

Show the same physical orientation side by side in NED/FRD and ENU/FLU. Animate
the world-frame transformation and body-frame transformation separately, then
show the complete product. Component order remains visible throughout.

### 6. Final challenge

Given a built-in xdyn quaternion, select the matching LOTUSim orientation from
a few visual proposals. Wrong answers diagnose one concrete confusion: world
swap missing, body swap missing, scalar/vector order swapped or multiplication
order reversed. A sign-flipped equivalent quaternion is accepted and reinforces
the double-cover concept. Feedback explains the result rather than merely
marking it right or wrong.

## Explanations

Each mathematical concept has two presentation levels:

1. an always-visible summary explaining what it is, why it matters and what to
   observe in the scene;
2. a collapsible "Comprendre en détail" section containing the precise
   definition, progressive derivation, a numerical example synchronized with
   the current scene, common pitfalls and source links.

Every symbol in a formula is defined and tied to a visible value or axis.
External sources open separately; all explanations and examples remain usable
offline.

## Visual direction and interaction

The result is a schematic naval laboratory, not a generic dashboard or a
realistic simulator.

- Build the boat from lightweight Three.js primitives, with an unmistakable
  bow and port/starboard sides.
- Use full lines for world axes and luminous lines for body axes.
- Distinguish every axis by color, letter and semantic name; never rely on
  color alone.
- Keep a grid, horizon and flat water plane as spatial references.
- Allow orbit, zoom and an always-visible camera reset.
- Offer replay, speed control and pause for teaching animations.
- Respect keyboard navigation, sufficient contrast and
  `prefers-reduced-motion`.

No visual element is added unless it helps read a frame, rotation or
intermediate state.

## Input validation and errors

- All numeric values must be finite.
- A zero quaternion and zero rotation axis are rejected inline while the last
  valid orientation remains displayed.
- A non-unit raw quaternion shows its norm and the normalized quaternion that
  is actually applied; normalization is never silent.
- Euler gimbal lock produces a pedagogical warning, not an application error.
- A broken external source link never blocks the lesson.
- Renderer initialization failure replaces the canvas with one clear error;
  errors are not swallowed.

## Verification

Pure math checks cover:

- identity;
- positive and negative 90-degree rotations about each axis;
- quaternion normalization and rejection of the zero quaternion;
- composition in both orders;
- equivalence of `q` and `-q` as orientations;
- NED/FRD to ENU/FLU vector and attitude conversion;
- conversion round-trip;
- the existing LOTUSim case where a `+90 degrees` xdyn heading becomes a
  `-90 degrees` ENU yaw.

Behavioral checks cover:

- starting, navigating, skipping, resuming and restarting the tutorial;
- synchronized scene and numeric representations;
- visible normalization and invalid-input feedback;
- the gimbal-lock demonstration;
- expandable detailed explanations and source links;
- final-challenge success and each diagnostic error category;
- keyboard access and reduced-motion behavior.

Delivery evidence requires a passing math test command, TypeScript check,
production build, a running local app and a browser smoke test of the critical
path. The application must function without network access except when the user
chooses an external source link.

## Deferred extensions

Only add log import, live LOTUSim/xdyn data, saved progress, more languages or a
detailed vessel asset after a demonstrated need. None of them influences the
V1 architecture.
