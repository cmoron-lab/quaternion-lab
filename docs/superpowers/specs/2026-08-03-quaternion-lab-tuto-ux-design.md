# Quaternion Lab — Tutorial UX & Clarity Redesign (V2)

Date: 2026-08-03 · Status: approved by user · Supersedes nothing — builds on `2026-08-03-lotusim-quaternion-lab-design.md`

## Problem

The lab targets LOTUSim developers who will manipulate quaternions in xdyn/ROS code but are **not mathematicians** — developers with abstraction and learning capacity, no heavy math background. Three confirmed defects of the current version:

1. **Unstable tutorial layout.** Step 1 renders the lesson panel to the *right* of the 3D canvas; steps 2+ render it *below*, full width. Cause: the `lab--guided-intro` CSS modifier (`styles.css:78-79`) toggled by `showSandbox` (`model.ts:44`, `app.ts:310`).
2. **Content too abstract.** Formulas (Hamilton products, `v′ = q ⊗ (0,v) ⊗ q*`) appear at the top level of screens instead of supporting an action-first reading.
3. **Misleading terminology.** The app systematically avoids the word "quaternion" (everything is branded "orientation", including the title) and pseudo-translates frame acronyms ("Est · Nord · Haut" for ENU), while the developer will meet ENU/FLU/NED/FRD and "quaternion" in xdyn, ROS and Eigen docs.
4. **Unexplained sandbox snap-back.** Editing a quaternion component (e.g. `qw` 1.0 → 0.5 with other components at 0) renormalizes the quaternion, so `renderControls` rewrites the field to `1.000000`. The cause (norm constrained to 1) is only shown as a discreet note in `#normalization-note` (`app.ts:135`) that users do not perceive.

## Decisions (validated during brainstorming)

- **Audience:** LOTUSim developers, non-mathematicians, with abstraction capacity. The xdyn conversion stays the final payoff.
- **Terminology:** French UI, **English domain vocabulary** (quaternion, ENU/FLU/NED/FRD, gimbal lock, axis-angle, Euler angles, scalar-first) with a plain-language gloss at first use. Tone: professional, *vouvoiement*, not chummy.
- **Layout:** option C — lesson panel **left**, 3D scene **right**, one stable grid from step 1 to step 6 and in sandbox mode.
- **Pedagogy:** approach 1 — rewrite in place. Keep the 6 screens and the state machine; rewrite each screen's content on a fixed action-first pattern; formulas move down into "Comprendre en détail".
- **Sandbox:** the normalization snap-back behavior is correct and stays; it must be **explained, not surprising**.

## Design

### 1. Layout & chrome

- `.lab` becomes a fixed two-column grid: lesson left (`minmax(20rem, 0.65fr)`), scene right (`1.65fr`), for all tutorial steps and sandbox mode.
- Delete the `lab--guided-intro` modifier (`styles.css:78-79`, initial class at `index.html:23`) and the `showSandbox`-driven layout toggle (`model.ts:44`, `app.ts:310`).
- Step-specific interactive controls (θ slider, q/−q toggle, swap-order button, 90° trigger, phase buttons…) live **inside the lesson flow**, right below the manipulation instruction. The markup already exists in `screenSpecificMarkup` (`app.ts:234-299`); it is repositioned, not rewritten.
- `<aside id="sandbox">` only appears in **sandbox mode** (after the tutorial or via "Passer le tutoriel"), occupying the same left column slot as the lesson. One grid, two possible left-column contents.
- The convention badge shows **"Monde ENU · Corps FLU · xdyn NED/FRD"** from step 1. The scene legend becomes "Monde ENU : X East · Y North · Z Up / Corps FLU : X Forward · Y Left · Z Up" — no more "Est · Nord · Haut". The `showTechnicalConventions` wording switch (`model.ts:48`, `app.ts:311-315`) is removed.
- Responsive: below `56.25rem`, single column with the lesson above the scene (reading order preserved).

### 2. Terminology

- "Quaternion" returns everywhere: app title "Comprendre les quaternions" (`index.html:14`), scene title (`index.html:27`), aria-labels, preset "Orientation neutre" → "Quaternion identité". "Orientation" is kept only to name the concept (the boat's orientation), never as a euphemism for quaternion.
- Frame acronyms ENU / FLU / NED / FRD stay untranslated. First occurrence carries a gloss, e.g. "ENU (East–North–Up : X vers l'est, Y vers le nord, Z vers le haut)". Scene axis glyphs align to English ("ENU X · East", `lab-scene.ts:29-32`).
- Domain terms in English with a French gloss at first use: *gimbal lock* (verrouillage de cardan), *axis-angle*, *Euler angles*, *quaternion unitaire / identité*, *scalar-first (w, x, y, z)*.
- Fix the grammar slip "seuls son orientation" (`content.ts:29`).

### 3. Screen pattern

Each rewritten screen follows a fixed skeleton, in order, professional tone with *vouvoiement*:

1. **Title with the real term** — e.g. "Axis-angle : un quaternion, c'est un axe + un angle".
2. **« Manipulation »** — one action instruction first, imperative ("Faites glisser θ jusqu'à 90° et observez l'axe Y du corps"). The step's controls sit directly below it.
3. **« Ce que vous venez d'observer »** — 2-3 sentences of intuition tied to what the scene just showed. No formulas here.
4. **« À retenir »** — one synthetic takeaway sentence ("q et −q décrivent la même orientation").
5. **« Comprendre en détail »** (existing `<details>`) — formulas now live here: Hamilton products, `v′ = q ⊗ (0,v) ⊗ q*`, √½ computations. The definition/derivation/example/pitfalls/sources structure is kept. The math is *relegated, not deleted*.

Data model impact on `TutorialScreen` (`content.ts:1-16`): `observe` becomes the action instruction (renamed `tryIt`), `summary` becomes the after-the-fact intuition, a new `takeaway` field is added, `formula` moves into `details`.

### 4. Per-screen rewrite plan

1. **frames — "Repères : monde ENU, corps FLU"**: manipulation first (turn the boat, observe which axes follow and which stay fixed). Quaternion introduced in one sentence as "the tool that describes the rotation between these two frames". ENU/FLU gloss here.
2. **axis-angle**: θ slider and axis first; intuition "4 numbers = one axis + one angle"; q = (cos θ/2, u·sin θ/2) moves to details. Takeaway: q and −q are the same orientation.
3. **composition**: swap-order demo first; intuition "rotation order matters"; Hamilton √½ products to details. Takeaway: q_B ⊗ q_A = first A then B.
4. **gimbal-lock**: "déclencher 90°" button first — the user *sees* two axes align and a degree of freedom vanish; Z-Y′-X″ explanation to details. "Gimbal lock" term assumed with gloss.
5. **lotusim-xdyn**: framed as the practical payoff ("why xdyn prints [x,y,z,w] while this lab shows [w,x,y,z]"). Two-sided change-of-basis product to details.
6. **challenge**: principle unchanged (distractors are pedagogically sound); feedback strings rewritten with the new terminology.

### 5. Sandbox: explained normalization

- The normalization note becomes **visible and pedagogical**, directly under the quaternion fields: not just the fact ("norme 0.5 → 1") but the reason ("un quaternion d'orientation est forcément unitaire — vos valeurs ont été mises à l'échelle"). Same treatment for the w ≥ 0 canonicalization (q and −q).
- A live norm indicator `‖q‖ = …` next to the quaternion fields, updated while typing: the constraint is tangible before the snap, and echoes screen 2 (unit quaternion).
- Behavior (snap-back, normalization, canonicalization) is unchanged.

## Testing

- Update `model.test.ts`: the `tutorialChrome` test pinning the step-1-vs-rest chrome difference is replaced by a stable-grid/chrome test; add a test asserting every screen has non-empty `tryIt`/`takeaway` fields.
- Update any test referencing renamed content fields or removed chrome flags.
- Manual verification: `bun test`, `bun run typecheck`, then `bun dev` + browser screenshot to check the real rendering (stable layout step 1 → 6, sandbox norm indicator, legend wording).

## Out of scope

- No i18n framework (the V1 exclusion stands: French-language UI only).
- No granular-path or mission-based restructuring of the tutorial flow.
- No change to the challenge's distractor logic, quaternion math, or scene internals beyond axis glyph labels.
