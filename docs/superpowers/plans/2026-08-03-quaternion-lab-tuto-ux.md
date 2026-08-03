# Quaternion Lab — Tutorial UX & Clarity Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the quaternion tutorial stable (one fixed layout), concrete (action-first screens), and honest (English domain terminology), and explain the sandbox quaternion normalization instead of letting it surprise the user.

**Architecture:** Same Vite + TypeScript + three.js single-page app, same 6-screen state machine. Layout moves to a fixed two-column grid (lesson left, scene right); step controls live inside the lesson flow; formulas move into the existing "Comprendre en détail" `<details>`; the sandbox aside only appears in sandbox mode with a visible normalization explanation and a live norm indicator.

**Tech Stack:** Vite, TypeScript, three.js, Bun test runner (`bun test`, `bun run typecheck`, `bun run build`).

**Spec:** `docs/superpowers/specs/2026-08-03-quaternion-lab-tuto-ux-design.md`

**Worktree:** `/home/cyril/src/lotusim-lab/quaternion-lab/.worktrees/feat-quaternion-lab` — run all commands from this directory.

## Global Constraints

- Tooling: `bun` only (never npm/yarn). Scripts: `bun test`, `bun run typecheck`, `bun run build`, `bun dev`.
- No new dependencies. No i18n framework — French-language UI copy stays hardcoded.
- UI copy rules: French prose, **English domain terms** (quaternion, ENU/FLU/NED/FRD, gimbal lock, axis-angle, Euler angles, scalar-first) with a plain-language gloss at first use; professional tone; *vouvoiement*.
- `bun test` and `bun run typecheck` must be green at every commit.
- Conventional Commits; message explains the why.
- Do not touch the challenge distractor logic, quaternion math (`src/math/`), or scene internals beyond axis glyph labels.

---

### Task 1: English axis glyph labels in the 3D scene

**Files:**
- Modify: `src/scene/lab-scene.ts:14-39`
- Test: `src/scene/lab-scene.test.ts:33-69`

**Interfaces:**
- Consumes: nothing.
- Produces: glyph names `"FLU X · Forward"`, `"FLU Y · Left"`, `"FLU Z · Up"`, `"FRD X · Forward"`, `"FRD Y · Right"`, `"FRD Z · Down"`, `"ENU X · East"`, `"ENU Y · North"`, `"ENU Z · Up"`, `"NED X · North"`, `"NED Y · East"`, `"NED Z · Down"` (used by scene tests and read by screen readers via `title` elements).

- [ ] **Step 1: Update the test expectations first**

In `src/scene/lab-scene.test.ts`, replace the French suffixes in the two glyph tests:

```ts
      { name: "FLU X · Forward", direction: [1, 0, 0] },
      { name: "FLU Y · Left", direction: [0, 1, 0] },
      { name: "FLU Z · Up", direction: [0, 0, 1] },
```
```ts
      { name: "FRD X · Forward", direction: [1, 0, 0] },
      { name: "FRD Y · Right", direction: [0, -1, 0] },
      { name: "FRD Z · Down", direction: [0, 0, -1] },
```
```ts
      { name: "NED X · North", direction: [0, 1, 0] },
      { name: "NED Y · East", direction: [1, 0, 0] },
      { name: "NED Z · Down", direction: [0, 0, -1] },
```
```ts
      { name: "ENU X · East", direction: [1, 0, 0] },
      { name: "ENU Y · North", direction: [0, 1, 0] },
      { name: "ENU Z · Up", direction: [0, 0, 1] },
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test src/scene/lab-scene.test.ts`
Expected: FAIL — expected names like `"FLU X · Forward"`, received `"FLU X · Avant"`.

- [ ] **Step 3: Update the glyph definitions**

In `src/scene/lab-scene.ts:14-39`, rename the `name` fields of `FLU_AXES`, `FRD_AXES`, `ENU_AXES`, `NED_AXES` to the English forms listed above (directions and colors unchanged).

- [ ] **Step 4: Run the test to verify it passes**

Run: `bun test src/scene/lab-scene.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scene/lab-scene.ts src/scene/lab-scene.test.ts
git commit -m "fix: name scene axes with domain English terms"
```

---

### Task 2: Stable chrome in the tutorial model

**Files:**
- Modify: `src/tutorial/model.ts:43-49`
- Test: `src/tutorial/model.test.ts:75-107`

**Interfaces:**
- Consumes: `TutorialState` (unchanged).
- Produces: `tutorialChrome(state)` returning `{ showSandbox: boolean; showSkip: boolean; showResume: boolean; showRestart: boolean }` — **no `showTechnicalConventions` anymore**, and `showSandbox` is true only in sandbox mode. Task 5 relies on this exact shape.

- [ ] **Step 1: Rewrite the chrome test first**

In `src/tutorial/model.test.ts`, replace the test `"reveals navigation and expert controls only when they are useful"` (lines 75-107) with:

```ts
  test("keeps the chrome stable across screens and reserves the sandbox to sandbox mode", () => {
    expect(tutorialChrome(startTutorial())).toEqual({
      showSandbox: false,
      showSkip: true,
      showResume: false,
      showRestart: false,
    });

    let last = startTutorial();
    for (let index = 0; index < TUTORIAL_SCREENS.length - 1; index += 1) {
      last = nextScreen(last);
    }
    expect(tutorialChrome(last)).toEqual({
      showSandbox: false,
      showSkip: true,
      showResume: false,
      showRestart: true,
    });

    expect(tutorialChrome(skipTutorial(last))).toEqual({
      showSandbox: true,
      showSkip: false,
      showResume: true,
      showRestart: true,
    });
  });
```

Also remove `showTechnicalConventions` from the import list if it appears there (it does not — it is only a return-field; no import change needed).

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test src/tutorial/model.test.ts`
Expected: FAIL — actual chrome still contains `showTechnicalConventions` and `showSandbox: true` from screen 2 on.

- [ ] **Step 3: Simplify `tutorialChrome`**

In `src/tutorial/model.ts:43-49`:

```ts
export const tutorialChrome = (state: TutorialState) => ({
  showSandbox: state.mode === "sandbox",
  showSkip: state.mode === "tutorial",
  showResume: state.mode === "sandbox",
  showRestart: state.screenIndex > 0,
});
```

- [ ] **Step 4: Run tests and typecheck**

Run: `bun test src/tutorial/model.test.ts`
Expected: FAIL at typecheck level — `src/ui/app.ts` still reads `chrome.showTechnicalConventions`. `bun test` may pass (bun strips types), so also run:
Run: `bun run typecheck`
Expected: FAIL with `Property 'showTechnicalConventions' does not exist` in `src/ui/app.ts`. This is fixed in the next step.

- [ ] **Step 5: Remove the dead usages in `app.ts`**

In `src/ui/app.ts`:
- Delete line 84: `const technicalControls = root.querySelectorAll<HTMLElement>("[data-technical]");`
- In `renderChrome` (lines 301-323), delete the `technicalControls.forEach(...)` block (lines 307-309), delete the `lab.classList.toggle("lab--guided-intro", ...)` line (310), and replace the badge/legend/aria-label conditional blocks (311-322) with the static technical wording:

```ts
  const renderChrome = () => {
    const chrome = tutorialChrome(tutorialState);
    sandbox.hidden = !chrome.showSandbox;
    sandboxJump.hidden = !chrome.showSkip;
    tutorialResume.hidden = !chrome.showResume;
    tutorialRestart.hidden = !chrome.showRestart;
    conventionBadge.textContent = "Monde ENU · Corps FLU · xdyn NED/FRD";
    sceneLegend.textContent =
      "Monde ENU : X East · Y North · Z Up\nCorps FLU : X Forward · Y Left · Z Up";
    container.setAttribute("aria-label", "Bateau FLU dans le monde ENU");
  };
```

- [ ] **Step 6: Run tests and typecheck to verify green**

Run: `bun test && bun run typecheck`
Expected: PASS, no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/tutorial/model.ts src/tutorial/model.test.ts src/ui/app.ts
git commit -m "fix: keep tutorial chrome stable across all screens"
```

---

### Task 3: Content schema (`tryIt`, `takeaway`) and full copy rewrite

**Files:**
- Modify: `src/tutorial/content.ts` (whole file)
- Modify: `src/ui/app.ts:346-348` (field renames only, to keep typecheck green)
- Test: `src/tutorial/model.test.ts:16-30`

**Interfaces:**
- Consumes: nothing new.
- Produces: `TutorialScreen` = `{ id; title: string; tryIt: string; summary: string; takeaway: string; details: readonly [string, string, string]; pitfalls: readonly string[]; sources: readonly { label, url }[] }`. **Fields `observe` and `formula` no longer exist** — `formula` content is folded into `details[0]`. Task 5 renders `tryIt`/`summary`/`takeaway` in dedicated sections.

- [ ] **Step 1: Extend the content shape test first**

In `src/tutorial/model.test.ts`, inside the test `"contains five lessons and one final challenge"`, replace the per-screen assertions (lines 25-29) with:

```ts
    for (const screen of TUTORIAL_SCREENS) {
      expect(screen.tryIt.length).toBeGreaterThan(40);
      expect(screen.summary.length).toBeGreaterThan(40);
      expect(screen.takeaway.length).toBeGreaterThan(20);
      expect(screen.details.length).toBeGreaterThan(1);
      expect(screen.sources.length).toBeGreaterThan(0);
    }
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test src/tutorial/model.test.ts`
Expected: FAIL — `screen.tryIt` is undefined (and typecheck would fail on the old field names).

- [ ] **Step 3: Rewrite `src/tutorial/content.ts`**

Replace the `TutorialScreen` type (lines 1-16) with:

```ts
export type TutorialScreen = Readonly<{
  id:
    | "frames"
    | "axis-angle"
    | "composition"
    | "gimbal-lock"
    | "lotusim-xdyn"
    | "challenge";
  title: string;
  tryIt: string;
  summary: string;
  takeaway: string;
  details: readonly [definition: string, derivation: string, example: string];
  pitfalls: readonly string[];
  sources: readonly Readonly<{ label: string; url: string }>[];
}>;
```

Then replace every screen object in `TUTORIAL_SCREENS` with the copy below. Keep `pitfalls` and `sources` of each screen **exactly as they are today** — only `title`, `tryIt`, `summary`, `takeaway`, `details` change, and `formula` disappears (folded into `details[0]` where noted).

**Screen `frames`:**

```ts
    id: "frames",
    title: "Repères : monde ENU, corps FLU",
    tryIt:
      "Cliquez sur Rejouer et observez les deux repères : le grand repère du monde reste fixe pendant que le repère du bateau tourne avec lui. Repérez quels axes suivent le bateau et quels axes ne bougent pas.",
    summary:
      "Vous venez de voir deux repères. Le repère monde ENU (East–North–Up : X vers l'est, Y vers le nord, Z vers le haut) est fixe. Le repère corps FLU (Forward–Left–Up : X vers l'avant, Y vers la gauche, Z vers le haut) est solidaire du bateau. L'orientation du bateau est la rotation qui fait passer du repère corps au repère monde — et un quaternion est l'outil qui décrit cette rotation avec quatre nombres liés.",
    takeaway:
      "Orientation ≠ position : pendant toute la démonstration, le bateau n'a pas changé de place.",
    details: [
      "Le repère monde ENU est fixe : ses trois directions servent de référence. Le repère corps FLU est attaché au bateau : ses axes Forward, Left et Up tournent avec lui. L'orientation est la rotation qui fait passer du repère corps au repère monde.",
      "Pour un quaternion unitaire Hamilton actif corps-vers-monde, un vecteur du bateau v devient v′ = q ⊗ (0,v) ⊗ q*, où q* est le conjugué — et donc l'inverse — de q.",
      "Au départ, le bateau pointe vers l'est (X du monde). La démonstration le tourne vers le nord : sa position ne change pas, seule son orientation et les axes qui lui sont attachés tournent.",
    ],
```

**Screen `axis-angle`:**

```ts
    id: "axis-angle",
    title: "Axis-angle : un axe, un angle",
    tryIt:
      "Faites glisser θ jusqu'à 90° et observez l'axe lumineux : la partie vectorielle du quaternion reste alignée avec lui. Cliquez ensuite sur « Afficher −q » : l'attitude du bateau ne change pas.",
    summary:
      "Toute rotation peut se décrire par un axe et un angle : c'est la représentation axis-angle. Le quaternion range ces deux informations dans quatre nombres — une partie scalaire qui dépend de l'angle, une partie vectorielle alignée avec l'axe. Et vous venez de le vérifier : q et −q donnent exactement la même attitude.",
    takeaway:
      "q et −q décrivent la même orientation ; ne comparez jamais deux quaternions composante par composante sans y penser.",
    details: [
      "q = (cos(θ/2), u sin(θ/2)), avec ‖u‖ = 1. Si u=(uₓ,uᵧ,u_z), alors q=(cos(θ/2), uₓsin(θ/2), uᵧsin(θ/2), u_zsin(θ/2)) : sa norme au carré vaut cos²(θ/2)+‖u‖²sin²(θ/2)=1. Un quaternion d'orientation est toujours unitaire.",
      "Le demi-angle vient de l’action bilatérale q ⊗ (0, v) ⊗ q*: les deux facteurs quaternion conjugués produisent sur le vecteur la rotation physique d’angle θ. C’est aussi l’écriture exponentielle q=exp((0,u)θ/2).",
      "Ici u=(0,0,1) et θ=60°, donc q=(cos 30°,0,0,sin 30°)=(√3/2,0,0,1/2). Son opposé (−√3/2,0,0,−1/2) produit la même attitude, car les deux signes s’annulent dans q ⊗ (0,v) ⊗ q*.",
    ],
```

**Screen `composition`:**

```ts
    id: "composition",
    title: "Composer des rotations : l'ordre compte",
    tryIt:
      "Cliquez sur « Permuter l'ordre » et observez le bateau : appliquer A puis B ne donne pas la même attitude que B puis A. Le bateau fantôme marque la fin de la première rotation.",
    summary:
      "Vous venez de voir que les rotations ne commutent pas : roulis de 90° puis lacet de 90° ne donnent pas la même attitude que lacet puis roulis. La composition s'écrit avec le produit de quaternions : appliquer A puis B donne q_B ⊗ q_A — la première rotation appliquée se lit à droite.",
    takeaway:
      "q_B ⊗ q_A signifie « d'abord A, puis B » : l'ordre de lecture est l'inverse de l'ordre chronologique.",
    details: [
      "v′ = (q_B ⊗ q_A) ⊗ v ⊗ (q_B ⊗ q_A)*. Pour des quaternions Hamilton actifs corps-vers-monde, appliquer A puis B signifie q=q_B⊗q_A : la rotation la plus proche du vecteur agit en premier.",
      "Avec A=roulis +90° et B=lacet +90°, q_A=(√½,√½,0,0) et q_B=(√½,0,0,√½). Ainsi q_B⊗(q_A⊗v⊗q_A*)⊗q_B*=(q_B⊗q_A)⊗v⊗(q_B⊗q_A)*.",
      "Dans la démo de référence, q_B⊗q_A=(1/2,1/2,1/2,1/2). En permutant, q_A⊗q_B=(1/2,1/2,−1/2,1/2): le signe de y change et le bateau prend une autre attitude.",
    ],
```

**Screen `gimbal-lock`:**

```ts
    id: "gimbal-lock",
    title: "Euler angles et gimbal lock",
    tryIt:
      "Cliquez sur « Déclencher 90° » : les anneaux de lacet et de roulis s'alignent. Faites ensuite glisser le roulis ou le lacet : plusieurs couples de valeurs donnent exactement la même attitude, et la décomposition affichée saute à sa forme canonique.",
    summary:
      "Vous venez de voir le gimbal lock (verrouillage de cardan) : à ±90° de tangage, les axes de lacet et de roulis s'alignent et les deux angles ne sont plus indépendants. C'est une singularité des Euler angles — une représentation en trois angles — pas de l'orientation elle-même : le quaternion, lui, décrit toujours l'attitude sans singularité.",
    takeaway:
      "Le gimbal lock est un défaut des Euler angles, pas du quaternion.",
    details: [
      "R = R_Z(lacet) R_Y(tangage) R_X(roulis). La convention intrinsèque Z-Y′-X″ applique le lacet autour de Z, le tangage autour de Y′ déjà tourné, puis le roulis autour de X″. À ±90° de tangage, Z et X″ deviennent colinéaires: la décomposition perd un degré de liberté.",
      "Roulis 20°, tangage 90° et lacet 35° est une décomposition valide: les anneaux de lacet et de roulis s’alignent et la matrice ne conserve que leur différence 35°−20°=15°. Pour un affichage déterministe, le laboratoire choisit la représentation canonique équivalente roulis 0°, tangage 90°, lacet 15°.",
      "Plusieurs triplets d’Euler donnent donc la même rotation: c’est une singularité de représentation, pas une disparition du mouvement. À ce point, l'orientation physique existe toujours et le quaternion unitaire la décrit sans singularité interne.",
    ],
```

**Screen `lotusim-xdyn`:**

```ts
    id: "lotusim-xdyn",
    title: "Conversion xdyn ↔ LOTUSim : NED/FRD vers ENU/FLU",
    tryIt:
      "Cliquez sur « Monde » puis sur « Corps » pour animer séparément les deux changements de base, avant d'afficher la conversion complète. Observez les deux écritures de la même attitude physique.",
    summary:
      "xdyn parle NED/FRD (North–East–Down / Forward–Right–Down) ; LOTUSim et Gazebo parlent ENU/FLU. Passer de l'un à l'autre exige deux changements de base — un côté monde, un côté corps — et, à la frontière Three.js, un simple réordonnancement des composantes de (w,x,y,z) vers (x,y,z,w).",
    takeaway:
      "Deux changements de base (monde et corps) plus un réordonnancement : oublier l'un des trois est l'erreur classique.",
    details: [
      "q_ENU_FLU = Q_NED_TO_ENU ⊗ q_NED_FRD ⊗ Q_FLU_TO_FRD, avec Q_NED_TO_ENU=(0,1/√2,1/√2,0) et Q_FLU_TO_FRD=(0,1,0,0). Le facteur de gauche change les coordonnées du repère monde ; celui de droite change celles du repère corps. Omettre l'un des deux ne conserve pas l'attitude complète.",
      "xdyn transmet des quaternions Hamilton corps-vers-monde dans l’ordre scalaire d’abord (qr,qi,qj,qk)=(w,x,y,z). LOTUSim/Gazebo utilise ENU/FLU; à la seule frontière Three.js, les mêmes composantes sont réordonnées en (x,y,z,w). Ce réordonnancement n’est pas une rotation.",
      "Cap xdyn 0°: q_NED_FRD=(1,0,0,0), donc q_ENU_FLU=(1/√2,0,0,1/√2), soit un lacet ENU de +90°. Cap xdyn +90°: q_NED_FRD=(1/√2,0,0,1/√2), et le produit vaut une identité à un signe près, soit un lacet ENU de 0°.",
    ],
```

**Screen `challenge`:**

```ts
    id: "challenge",
    title: "Défi : diagnostic de convention",
    tryIt:
      "Choisissez l'attitude ENU/FLU équivalente au quaternion xdyn [√½, 0, 0, √½]. Chaque mauvaise proposition correspond à une erreur de convention précise : lisez le feedback après chaque essai.",
    summary:
      "Les propositions [1,0,0,0] et [−1,0,0,0] sont toutes deux correctes — la double couverture, vue à l'étape 2. Chaque distracteur isole une erreur : changement monde omis, changement corps omis, facteurs inversés, ou ordre scalaire xdyn lu comme l'ordre Three.js.",
    takeaway:
      "En cas de doute sur une convention, refaites le produit dans l'ordre annoncé plutôt que de juger à la proximité des composantes.",
    details: [
      "Q_NED_TO_ENU ⊗ [√½,0,0,√½] ⊗ Q_FLU_TO_FRD = [−1,0,0,0] ≡ [1,0,0,0]. L'entrée correspond à un cap NED de +90° ; après les changements monde et corps, le bateau pointe vers +X ENU avec ses axes FLU alignés : l'orientation ENU/FLU est l'identité, dont le quaternion opposé représente exactement la même rotation.",
      "En remplaçant les valeurs, (0,√½,√½,0)⊗(√½,0,0,√½)⊗(0,1,0,0)=(−1,0,0,0). La double couverture autorise ensuite la forme canonique opposée (1,0,0,0).",
      "Numériquement, [1,0,0,0] et [−1,0,0,0] sont corrects. Les autres propositions isolent une erreur: changement monde ou corps omis, facteurs inversés, ou ordre scalaire xdyn lu comme l’ordre Three.js.",
    ],
```

- [ ] **Step 4: Adapt `app.ts` field usages minimally**

In `src/ui/app.ts` `renderLesson` (line 346-348), replace:

```ts
      <p class="lesson-panel__summary">${screen.summary}</p>
      <p class="lesson-panel__observe"><strong>À observer</strong>${screen.observe}</p>
      ${screen.formula ? `<code class="lesson-panel__formula">${screen.formula}</code>` : ""}
```

with (temporary layout, restructured in Task 5):

```ts
      <p class="lesson-panel__observe"><strong>Manipulation</strong>${screen.tryIt}</p>
      <p class="lesson-panel__summary">${screen.summary}</p>
      <p class="lesson-panel__observe"><strong>À retenir</strong>${screen.takeaway}</p>
```

- [ ] **Step 5: Run tests and typecheck to verify green**

Run: `bun test && bun run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/tutorial/content.ts src/tutorial/model.test.ts src/ui/app.ts
git commit -m "feat: rewrite tutorial screens action-first with domain terms"
```

---

### Task 4: Static chrome terminology in `index.html`

**Files:**
- Modify: `index.html` (lines 13-16, 23, 27-28, 32, 36, 77, 80-81, 89)

**Interfaces:**
- Consumes: Task 2's static `renderChrome` wording (badge/legend are rewritten by JS on mount; the HTML values are the pre-JS and no-JS fallback and must match).
- Produces: no JS interface; DOM ids unchanged.

- [ ] **Step 1: Apply the terminology edits**

In `index.html`:
- Line 14: `<h1>Repères et orientation</h1>` → `<h1>Comprendre les quaternions</h1>`
- Line 16: badge text `Scène fixe · bateau mobile` → `Monde ENU · Corps FLU · xdyn NED/FRD`
- Line 23: `class="lab lab--guided-intro"` → `class="lab"`
- Line 27: `Instrument d'orientation` → `Laboratoire de quaternions`
- Line 28: legend → `Monde ENU : X East · Y North · Z Up<br />Corps FLU : X Forward · Y Left · Z Up`
- Line 32: `aria-label="Bateau et repères d'orientation"` → `aria-label="Bateau FLU dans le monde ENU"`
- Line 36: `aria-label="Bac à sable d'orientation"` → `aria-label="Bac à sable de quaternions"`
- Line 77: `Orientation neutre` → `Quaternion identité`
- Lines 80-81: remove the `data-technical` and `hidden` attributes from the `xdyn-north` and `xdyn-east` preset buttons (they are always visible now that Task 2 removed the gating).
- Line 89: `aria-label="Tutoriel d'orientation"` → `aria-label="Tutoriel quaternions"`

- [ ] **Step 2: Verify nothing references the removed hooks**

Run: `bun test && bun run typecheck`
Expected: PASS (no code references `data-technical` or `lab--guided-intro` in TS anymore — the CSS rules are removed in Task 6).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "fix: assume quaternion and frame terminology in page chrome"
```

---

### Task 5: Lesson pattern reorder + in-lesson step controls in `app.ts`

**Files:**
- Modify: `src/ui/app.ts` — `renderLesson` (325-469), `screenSpecificMarkup` (234-299)

**Interfaces:**
- Consumes: `TutorialScreen.tryIt/summary/takeaway` from Task 3; `radians`, `degreesLabel`, `axisLabel`, `quaternionLabel`, `renderControls`, `snapshotFromEnu`, `fromAxisAngle`, `fromEulerZYX` (all already imported/present in `app.ts`).
- Produces: lesson section order — header, `p.lesson-panel__tryit` ("Manipulation"), screen demo markup, animation controls, `p.lesson-panel__summary` ("Ce que vous venez d'observer"), `p.lesson-panel__takeaway` ("À retenir"), `<details>`, nav. In-lesson range inputs `#lesson-theta`, `#lesson-roll`, `#lesson-yaw` with `input` (live scene sync, no re-render) and `change` (full `renderLesson()`) listeners. Task 6 styles `lesson-panel__tryit`/`lesson-panel__takeaway`.

- [ ] **Step 1: Reorder the lesson sections**

In `renderLesson`, replace the temporary block from Task 3 (the `lesson-panel__observe`/`lesson-panel__summary` paragraphs and the position of `${screenSpecificMarkup(screen)}` and the animation controls) so the full `lesson.innerHTML` template reads:

```ts
    lesson.innerHTML = `<header class="lesson-panel__header">
        <p class="lesson-panel__progress">Étape ${tutorialState.screenIndex + 1} / ${TUTORIAL_SCREENS.length}</p>
        <h2 tabindex="-1">${screen.title}</h2>
      </header>
      <p class="lesson-panel__tryit"><strong>Manipulation</strong>${screen.tryIt}</p>
      ${screenSpecificMarkup(screen)}
      <div class="animation-controls" role="group" aria-label="Animation de la leçon">
        <button type="button" data-lesson-action="replay"${scene.canReplayAnimation() ? "" : " disabled"}>Rejouer</button>
        <button type="button" data-lesson-action="pause" aria-pressed="${paused}">${paused ? "Reprendre" : "Pause"}</button>
        <label>Vitesse
          <select id="lesson-speed">
            <option value="0.5"${animationSpeed === 0.5 ? " selected" : ""}>0,5×</option>
            <option value="1"${animationSpeed === 1 ? " selected" : ""}>1×</option>
          </select>
        </label>
      </div>
      <p class="lesson-panel__summary"><strong>Ce que vous venez d'observer</strong>${screen.summary}</p>
      <p class="lesson-panel__takeaway"><strong>À retenir</strong>${screen.takeaway}</p>
      <details${tutorialState.detailsOpen ? " open" : ""}>
        ... unchanged details block ...
      </details>
      <nav class="lesson-navigation" aria-label="Navigation du tutoriel">
        ... unchanged nav block ...
      </nav>`;
```

Also delete the now-unused temporary `lesson-panel__observe` paragraphs. The `<details>` and `<nav>` contents are byte-identical to today.

- [ ] **Step 2: Update the `frames` demo card wording**

In `screenSpecificMarkup`, `case "frames"` becomes:

```ts
        return `<div class="lesson-demo convention-cards" aria-label="Repère monde ENU et repère corps FLU">
          <p><span>Monde ENU (East–North–Up)</span><strong>X East · Y North · Z Up</strong></p>
          <p><span>Corps FLU (Forward–Left–Up)</span><strong>X Forward · Y Left · Z Up</strong></p>
        </div>`;
```

- [ ] **Step 3: Add the θ slider to the `axis-angle` demo card**

`case "axis-angle"` becomes (note the new `id` hooks and the range control):

```ts
      case "axis-angle": {
        const [w, x, y, z] = snapshot.enuFlu;
        const equivalent: Quaternion = showNegative ? [-w, -x, -y, -z] : snapshot.enuFlu;
        const thetaDegrees = ((snapshot.axisAngle.angle * 180) / Math.PI).toFixed(1);
        return `<div class="lesson-demo equivalent-card">
          <div><span>q courant · axe ${axisLabel(snapshot.axisAngle.axis)} · θ <span id="lesson-theta-label">${degreesLabel(snapshot.axisAngle.angle)}</span></span><code id="lesson-current-q">${quaternionLabel(snapshot.enuFlu)}</code></div>
          <button type="button" data-lesson-action="toggle-sign">${showNegative ? "Afficher q" : "Afficher −q"}</button>
          <label class="range-control" for="lesson-theta">θ
            <input id="lesson-theta" type="range" min="0" max="180" step="0.1" value="${thetaDegrees}" />
            <output id="lesson-theta-output" for="lesson-theta">${degreesLabel(snapshot.axisAngle.angle)}</output>
          </label>
          <p aria-live="polite"><span>Représentation équivalente affichée</span><code id="lesson-equivalent-q">${quaternionLabel(equivalent)}</code></p>
        </div>`;
      }
```

- [ ] **Step 4: Add roulis/lacet sliders to the `gimbal-lock` demo card**

`case "gimbal-lock"` becomes:

```ts
      case "gimbal-lock": {
        const rollDegrees = ((snapshot.eulerEnu.roll * 180) / Math.PI).toFixed(1);
        const yawDegrees = ((snapshot.eulerEnu.yaw * 180) / Math.PI).toFixed(1);
        return `<div class="lesson-demo gimbal-actions">
          <p><span>Décomposition canonique courante</span><code id="lesson-gimbal-euler">roulis ${degreesLabel(snapshot.eulerEnu.roll)} · tangage ${degreesLabel(snapshot.eulerEnu.pitch)} · lacet ${degreesLabel(snapshot.eulerEnu.yaw)}</code></p>
          <p><span>Quaternion courant</span><code id="lesson-gimbal-q">${quaternionLabel(snapshot.enuFlu)}</code></p>
          <button type="button" data-lesson-action="trigger-gimbal">Déclencher 90°</button>
          <button type="button" data-lesson-action="reset-gimbal">Réinitialiser les angles</button>
          <label class="range-control" for="lesson-roll">Roulis
            <input id="lesson-roll" type="range" min="-180" max="180" step="0.1" value="${rollDegrees}" />
            <output id="lesson-roll-output" for="lesson-roll">${degreesLabel(snapshot.eulerEnu.roll)}</output>
          </label>
          <label class="range-control" for="lesson-yaw">Lacet
            <input id="lesson-yaw" type="range" min="-180" max="180" step="0.1" value="${yawDegrees}" />
            <output id="lesson-yaw-output" for="lesson-yaw">${degreesLabel(snapshot.eulerEnu.yaw)}</output>
          </label>
        </div>`;
      }
```

- [ ] **Step 5: Wire the in-lesson slider listeners**

In `renderLesson`, right after the `#lesson-speed` listener block, add:

```ts
    const thetaSlider = lesson.querySelector<HTMLInputElement>("#lesson-theta");
    thetaSlider?.addEventListener("input", () => {
      snapshot = snapshotFromEnu(
        fromAxisAngle({ axis: snapshot.axisAngle.axis, angle: radians(Number(thetaSlider.value)) }),
      );
      scene.setOrientation(snapshot.enuFlu);
      scene.setRotationAxis(snapshot.axisAngle.axis);
      renderControls(root, snapshot);
      const output = lesson.querySelector<HTMLOutputElement>("#lesson-theta-output");
      if (output) output.value = degreesLabel(snapshot.axisAngle.angle);
      const thetaLabel = lesson.querySelector<HTMLElement>("#lesson-theta-label");
      if (thetaLabel) thetaLabel.textContent = degreesLabel(snapshot.axisAngle.angle);
      const current = lesson.querySelector<HTMLElement>("#lesson-current-q");
      if (current) current.textContent = quaternionLabel(snapshot.enuFlu);
      const [w, x, y, z] = snapshot.enuFlu;
      const equivalentCode = lesson.querySelector<HTMLElement>("#lesson-equivalent-q");
      if (equivalentCode) {
        equivalentCode.textContent = quaternionLabel(showNegative ? [-w, -x, -y, -z] : snapshot.enuFlu);
      }
    });
    thetaSlider?.addEventListener("change", () => renderLesson());

    const rollSlider = lesson.querySelector<HTMLInputElement>("#lesson-roll");
    const yawSlider = lesson.querySelector<HTMLInputElement>("#lesson-yaw");
    const syncGimbal = () => {
      if (!rollSlider || !yawSlider) return;
      snapshot = snapshotFromEnu(
        fromEulerZYX({
          roll: radians(Number(rollSlider.value)),
          pitch: snapshot.eulerEnu.pitch,
          yaw: radians(Number(yawSlider.value)),
        }),
      );
      scene.setOrientation(snapshot.enuFlu);
      scene.setGimbalAngles(snapshot.eulerEnu);
      renderControls(root, snapshot);
      const eulerCode = lesson.querySelector<HTMLElement>("#lesson-gimbal-euler");
      if (eulerCode) {
        eulerCode.textContent = `roulis ${degreesLabel(snapshot.eulerEnu.roll)} · tangage ${degreesLabel(snapshot.eulerEnu.pitch)} · lacet ${degreesLabel(snapshot.eulerEnu.yaw)}`;
      }
      const qCode = lesson.querySelector<HTMLElement>("#lesson-gimbal-q");
      if (qCode) qCode.textContent = quaternionLabel(snapshot.enuFlu);
    };
    rollSlider?.addEventListener("input", syncGimbal);
    yawSlider?.addEventListener("input", syncGimbal);
    rollSlider?.addEventListener("change", () => renderLesson());
    yawSlider?.addEventListener("change", () => renderLesson());
```

Rationale: `input` updates the scene and the read-outs in place (rebuilding `innerHTML` mid-drag would kill the drag); `change` fires at drag end and re-renders, which also snaps the gimbal sliders to the canonical decomposition — that visible snap is the pedagogical point of the step.

- [ ] **Step 6: Run tests and typecheck**

Run: `bun test && bun run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/ui/app.ts
git commit -m "feat: embed step manipulations in the lesson flow"
```

---

### Task 6: Stable two-column grid in `styles.css`

**Files:**
- Modify: `src/styles.css` (lines 71-79, 164-169, 189-191, 278-284, 313-318)

**Interfaces:**
- Consumes: DOM from Task 4 (`main.lab` children `.scene-shell`, `#sandbox.controls-panel`, `#lesson-panel.lesson-panel`) and classes `lesson-panel__tryit` / `lesson-panel__takeaway` produced by Task 5.
- Produces: `.lab` fixed grid `minmax(20rem, 0.65fr) | minmax(0, 1.65fr)`; left column = `.controls-panel` or `.lesson-panel`, right column = `.scene-shell`; below `56.25rem`, single column with the left-column panel above the scene.

- [ ] **Step 1: Replace the grid definition and delete the intro modifier**

Replace lines 71-79:

```css
.lab {
  display: grid;
  grid-template-columns: minmax(20rem, 0.65fr) minmax(0, 1.65fr);
  gap: 1rem;
  padding-bottom: 2rem;
}

.controls-panel, .lesson-panel { grid-column: 1; grid-row: 1; }
.scene-shell { grid-column: 2; grid-row: 1; }
```

(The `.lab--guided-intro` rules disappear entirely.)

- [ ] **Step 2: Update the lesson panel rule**

Replace lines 164-169 (`.lesson-panel { grid-column: 1 / -1; ... }`) with:

```css
.lesson-panel {
  min-height: 4rem;
  border-style: dashed;
  box-shadow: none;
}
```

- [ ] **Step 3: Style the new lesson sections**

Replace lines 189-191 (`.lesson-panel__summary` / `.lesson-panel__observe` rules) with:

```css
.lesson-panel__summary, .lesson-panel__tryit, .lesson-panel__takeaway { max-width: 75ch; margin: 0.55rem 0; line-height: 1.45; }
.lesson-panel__summary strong, .lesson-panel__tryit strong, .lesson-panel__takeaway strong {
  display: block;
  color: #086c7a;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.lesson-panel__takeaway { padding: 0.55rem 0.7rem; border-left: 3px solid #218b68; background: #edf3f2; }
```

- [ ] **Step 4: Single-column details and cards in the narrow lesson column**

Replace lines 278-284 (`.lesson-details` rule) grid-template-columns with `1fr`:

```css
.lesson-details {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  margin: 0;
  padding: 1rem 1rem 0 2.4rem;
}
```

And change `.convention-cards` (lines 215-219) to a single column:

```css
.convention-cards {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.55rem;
}
```

- [ ] **Step 5: Update the narrow-viewport media query**

Replace lines 313-318:

```css
@media (max-width: 56.25rem) {
  .lab { grid-template-columns: 1fr; }
  .scene-shell, .controls-panel, .lesson-panel { grid-column: auto; grid-row: auto; }
  .controls-panel, .lesson-panel { order: -1; }
  .scene-shell { grid-template-rows: auto minmax(22rem, 55vh) auto; }
}
```

(The `.lab--guided-intro` override and the `.lesson-details` override are gone — `.lesson-details` is already single-column everywhere.)

- [ ] **Step 6: Verify build and visuals**

Run: `bun test && bun run typecheck && bun run build`
Expected: all PASS. (CSS has no automated coverage; the browser check happens in Task 8.)

- [ ] **Step 7: Commit**

```bash
git add src/styles.css
git commit -m "fix: hold the lesson in a stable left column next to the scene"
```

---

### Task 7: Sandbox — explained normalization + live norm indicator

**Files:**
- Modify: `src/ui/controls.ts` (48-62, 108-124, 134-155)
- Modify: `index.html` (quaternion fieldset, lines 38-46; note line 85)
- Modify: `src/styles.css` (`.control-note` rule, line 162)
- Test: `src/ui/controls.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `formatNorm(values: readonly number[]): string` exported from `controls.ts` — returns `‖q‖ = <norm to 6 decimals>` when every value is finite, `‖q‖ = —` otherwise. DOM id `#norm-indicator` inside the quaternion fieldset; `#normalization-note` moved directly under the quaternion fieldset.

- [ ] **Step 1: Extend the controls tests first**

In `src/ui/controls.test.ts`:
- In the `controlRoot` id list (lines 12-16), add `"norm-indicator"`.
- Replace the `"keeps normalization visible"` test with:

```ts
  test("explains normalization instead of just snapping", () => {
    const result = validateQuaternionInput([2, 0, 0, 0]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual([1, 0, 0, 0]);
      expect(result.note).toContain("norme 2");
      expect(result.note).toContain("unitaire");
    }
  });
```

- Replace the canonical-sign test's note assertion with:

```ts
      expect(result.note).toContain("q et -q");
      expect(result.note).toContain("w ≥ 0");
```

- Add a new test:

```ts
  test("formats the live norm indicator", () => {
    expect(formatNorm([1, 0, 0, 0])).toBe("‖q‖ = 1.000000");
    expect(formatNorm([0.5, 0.5, 0.5, 0.5])).toBe("‖q‖ = 1.000000");
    expect(formatNorm([Number.NaN, 0, 0, 0])).toBe("‖q‖ = —");
  });
```

  and add `formatNorm` to the import list from `./controls`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun test src/ui/controls.test.ts`
Expected: FAIL — `formatNorm` is not exported, note texts lack "unitaire" / "w ≥ 0".

- [ ] **Step 3: Implement the new note texts and `formatNorm`**

In `src/ui/controls.ts`, `validateQuaternionInput` (48-62) — replace the two `notes.push(...)` lines with:

```ts
  if (Math.abs(norm - 1) > 1e-9) {
    notes.push(
      `Quaternion normalisé : norme ${norm} → 1 — un quaternion d'orientation est unitaire, vos valeurs ont été mises à l'échelle`,
    );
  }
  if (value[0] < 0) {
    value = value.map((component) => -component || 0) as [number, number, number, number];
    notes.push("q et -q décrivent la même orientation — affichage canonique avec w ≥ 0");
  }
```

Add the exported helper (next to `formatQuaternion`):

```ts
export function formatNorm(values: readonly number[]): string {
  return values.every((value) => Number.isFinite(value))
    ? `‖q‖ = ${Math.hypot(...values).toFixed(6)}`
    : "‖q‖ = —";
}
```

- [ ] **Step 4: Wire the indicator into `bindControls` and `renderControls`**

In `bindControls`, after the existing `bindChange(quaternionFields, ...)` line, add:

```ts
  const updateNormIndicator = () => {
    const values = quaternionFields.map((id) => {
      const raw = element<HTMLInputElement>(root, id).value;
      return raw.trim() === "" ? Number.NaN : Number(raw);
    });
    element<HTMLElement>(root, "norm-indicator").textContent = formatNorm(values);
  };
  bindInput(quaternionFields, updateNormIndicator);
```

In `renderControls`, at the end of the quaternion block (after the `snapshot.enuFlu.forEach(...)` loop), add:

```ts
  element<HTMLElement>(root, "norm-indicator").textContent = formatNorm(snapshot.enuFlu);
```

- [ ] **Step 5: Move the note and add the indicator in `index.html`**

Inside the quaternion fieldset, after the `.number-grid` div, add:

```html
            <p id="norm-indicator" class="control-note">‖q‖ = 1.000000</p>
```

Move `<p id="normalization-note" ...>` from its current position (line 85, bottom of the aside) to directly after the quaternion `</fieldset>`, and give it the emphasized variant class:

```html
          <p id="normalization-note" class="control-note control-note--explained" role="status" aria-live="polite"></p>
```

- [ ] **Step 6: Make the explained note visible in `styles.css`**

After the `.control-note` rule (line 162), add:

```css
.control-note--explained { padding: 0.45rem 0.6rem; border-left: 3px solid #e9a23b; background: #fdf3e3; }
```

- [ ] **Step 7: Run tests and typecheck to verify green**

Run: `bun test && bun run typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/ui/controls.ts src/ui/controls.test.ts index.html src/styles.css
git commit -m "fix: explain quaternion normalization in the sandbox"
```

---

### Task 8: End-to-end verification

**Files:** none (verification only).

- [ ] **Step 1: Automated checks**

Run: `bun test && bun run typecheck && bun run build`
Expected: all PASS.

- [ ] **Step 2: Browser smoke test**

Run: `bun dev` (background), open the printed URL, and verify:
1. Step 1 → step 6: the lesson panel stays in the **left** column, the scene in the right column — no layout jump between step 1 and step 2.
2. Badge reads "Monde ENU · Corps FLU · xdyn NED/FRD" from step 1; scene legend reads "Monde ENU : X East · Y North · Z Up / Corps FLU : X Forward · Y Left · Z Up".
3. Each lesson shows, in order: "Manipulation", the step controls, "Ce que vous venez d'observer", "À retenir", "Comprendre en détail", navigation.
4. Step 2: dragging θ rotates the boat live; "Afficher −q" keeps the same attitude.
5. Step 4: "Déclencher 90°" aligns the rings; dragging roulis snaps the canonical decomposition on release.
6. "Explorer librement": the sandbox occupies the left column; set `qw` to 0.5 (others 0) → the field snaps back to 1.000000 **and** the explained note appears under the quaternion fieldset while `‖q‖` tracks the raw values during typing.
7. Resize below 56.25rem: single column, lesson above the scene.

If a check fails, fix and re-run before claiming done.
