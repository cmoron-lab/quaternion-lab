import {
  Q_FLU_TO_FRD,
  Q_NED_TO_ENU,
  snapshotFromEnu,
  snapshotFromNed,
  type OrientationSnapshot,
} from "../math/frames";
import {
  canonicalize,
  fromAxisAngle,
  fromEulerZYX,
  multiply,
  type EulerZYX,
  type Quaternion,
  type Vec3,
} from "../math/quaternion";
import { LabScene } from "../scene/lab-scene";
import { TUTORIAL_SCREENS, type TutorialScreen } from "../tutorial/content";
import {
  CHALLENGE_OPTIONS,
  evaluateChallenge,
  nextScreen,
  previousScreen,
  restartTutorial,
  resumeTutorial,
  skipTutorial,
  startTutorial,
  tutorialChrome,
} from "../tutorial/model";
import {
  bindControls,
  quaternionLabel,
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

const radians = (value: number): number => (value * Math.PI) / 180;
const degreesLabel = (value: number): string => {
  const degrees = (value * 180) / Math.PI;
  return `${Math.abs(degrees) < 0.05 ? "0.0" : degrees.toFixed(1)}°`;
};
const axisLabel = (axis: readonly number[]): string =>
  `(${axis.map((value) => (Math.abs(value) < 5e-4 ? "0" : value.toFixed(3))).join(", ")})`;

export function mountLabApp(root: HTMLElement): void {
  const container = byId<HTMLElement>(root, "scene-container");
  const validation = byId<HTMLElement>(root, "validation-message");
  const normalization = byId<HTMLElement>(root, "normalization-note");
  const gimbalWarning = byId<HTMLElement>(root, "gimbal-warning");
  const resetCamera = byId<HTMLButtonElement>(root, "reset-camera");
  const sandbox = byId<HTMLElement>(root, "sandbox");
  const sandboxTitle = byId<HTMLElement>(root, "sandbox-title");
  const lesson = byId<HTMLElement>(root, "lesson-panel");
  const tutorialResume = byId<HTMLButtonElement>(root, "tutorial-resume");
  const tutorialRestart = byId<HTMLButtonElement>(root, "tutorial-restart");
  const challengeAnnouncer = document.createElement("p");
  challengeAnnouncer.className = "visually-hidden";
  challengeAnnouncer.setAttribute("aria-live", "polite");
  lesson.after(challengeAnnouncer);

  let scene: LabScene;
  try {
    scene = new LabScene(container);
  } catch (error) {
    console.error("La scène 3D n'a pas pu démarrer.", error);
    container.textContent = "La scène 3D n'a pas pu démarrer sur ce navigateur.";
    return;
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let snapshot = snapshotFromEnu([1, 0, 0, 0]);
  let tutorialState = startTutorial();
  let showNegative = false;
  let lessonAxis: Vec3 = [0, 0, 1];
  let compositionSwapped = false;
  let comparisonPhase: "world" | "body" | "full" = "full";
  let challengeSelection: number | null = null;
  let challengeFeedback = "";
  let challengeAnnouncementFrame: number | null = null;
  let paused = false;
  let animationSpeed: 0.5 | 1 = 1;

  const cancelChallengeAnnouncement = () => {
    if (challengeAnnouncementFrame !== null) cancelAnimationFrame(challengeAnnouncementFrame);
    challengeAnnouncementFrame = null;
    challengeAnnouncer.textContent = "";
  };

  const announceChallenge = (message: string) => {
    cancelChallengeAnnouncement();
    challengeAnnouncementFrame = requestAnimationFrame(() => {
      challengeAnnouncementFrame = null;
      challengeAnnouncer.textContent = message;
    });
  };

  const renderSnapshot = (
    next: OrientationSnapshot,
    note: string | null = null,
    animate = false,
  ) => {
    snapshot = next;
    if (animate) scene.animateOrientation(snapshot.enuFlu, reducedMotion.matches ? 0 : 900);
    else scene.setOrientation(snapshot.enuFlu);
    renderControls(root, snapshot);
    validation.textContent = "";
    normalization.textContent = note ?? "";
    gimbalWarning.textContent = snapshot.eulerEnu.gimbalLocked
      ? "Singularité de représentation : à ±90° de tangage, roulis et lacet ne sont plus indépendants; l'orientation physique existe toujours."
      : "";
  };

  const resetTeachingScene = () => {
    scene.setGhostOrientation(null);
    scene.setRotationAxis(null);
    scene.setGimbalAngles(null);
    scene.setComparison(null, null);
    scene.setComparisonPhase("full");
  };

  const resetAnimation = () => {
    paused = false;
    scene.pauseAnimation(false);
  };

  const composition = (): Readonly<{
    intermediate: Quaternion;
    result: Quaternion;
  }> => {
    const a = fromEulerZYX({ roll: Math.PI / 2, pitch: 0, yaw: 0 });
    const b = fromEulerZYX({ roll: 0, pitch: 0, yaw: Math.PI / 2 });
    return compositionSwapped
      ? { intermediate: b, result: multiply(a, b) }
      : { intermediate: a, result: multiply(b, a) };
  };

  // À θ = 0 la rotation n'a pas d'axe : toAxisAngle renvoie un fallback [1,0,0]
  // qui ferait sauter la flèche blanche; on garde le dernier axe manipulé.
  const currentRotationAxis = (): Vec3 =>
    snapshot.axisAngle.angle > 1e-6 ? snapshot.axisAngle.axis : lessonAxis;

  // Attitude du bateau LOTUSim selon la phase : les phases partielles montrent
  // l'attitude (fausse) produite en n'appliquant qu'un seul des deux facteurs —
  // les mêmes erreurs que les distracteurs du défi final.
  const xdynPhaseQuaternion = (): Quaternion => {
    switch (comparisonPhase) {
      case "world":
        return canonicalize(multiply(Q_NED_TO_ENU, snapshot.nedFrd));
      case "body":
        return canonicalize(multiply(snapshot.nedFrd, Q_FLU_TO_FRD));
      case "full":
        return snapshot.enuFlu;
    }
  };

  const applyCurrentTeachingVisuals = (screen: TutorialScreen, animateComparison = false) => {
    switch (screen.id) {
      case "axis-angle":
        scene.setRotationAxis(currentRotationAxis());
        break;
      case "composition":
        scene.setGhostOrientation(composition().intermediate);
        break;
      case "gimbal-lock":
        scene.setGimbalAngles(snapshot.eulerEnu);
        break;
      case "lotusim-xdyn":
        if (animateComparison) {
          scene.animateComparison(
            snapshot.enuFlu,
            xdynPhaseQuaternion(),
            reducedMotion.matches ? 0 : 900,
          );
        } else {
          scene.setComparison(snapshot.enuFlu, xdynPhaseQuaternion());
        }
        scene.setComparisonPhase(comparisonPhase);
        break;
      case "frames":
      case "challenge":
        break;
    }
  };

  const applyScreenDemo = (screen: TutorialScreen, animate = true) => {
    resetAnimation();
    resetTeachingScene();
    switch (screen.id) {
      case "frames":
        renderSnapshot(snapshotFromNed([1, 0, 0, 0]), null, animate);
        break;
      case "axis-angle":
        renderSnapshot(
          snapshotFromEnu(fromAxisAngle({ axis: [0, 0, 1], angle: Math.PI / 3 })),
          null,
          animate,
        );
        break;
      case "composition": {
        const { result } = composition();
        renderSnapshot(snapshotFromEnu(result), null, animate);
        break;
      }
      case "gimbal-lock": {
        const euler: EulerZYX = {
          roll: radians(20),
          pitch: radians(90),
          yaw: radians(35),
        };
        renderSnapshot(snapshotFromEnu(fromEulerZYX(euler)), null, animate);
        break;
      }
      case "lotusim-xdyn": {
        const converted = snapshotFromNed([1, 0, 0, 0]);
        renderSnapshot(converted);
        break;
      }
      case "challenge":
        renderSnapshot(snapshotFromNed([Math.SQRT1_2, 0, 0, Math.SQRT1_2]), null, animate);
        break;
    }
    applyCurrentTeachingVisuals(screen, screen.id === "lotusim-xdyn" && animate);
  };

  const screenSpecificMarkup = (screen: TutorialScreen): string => {
    switch (screen.id) {
      case "frames":
        return `<div class="lesson-demo convention-cards" aria-label="Repère monde ENU et repère corps FLU">
          <p><span>Monde ENU (East–North–Up)</span><strong>X East · Y North · Z Up</strong></p>
          <p><span>Corps FLU (Forward–Left–Up)</span><strong>X Forward · Y Left · Z Up</strong></p>
        </div>`;
      case "axis-angle": {
        const [w, x, y, z] = snapshot.enuFlu;
        const equivalent: Quaternion = showNegative ? [-w, -x, -y, -z] : snapshot.enuFlu;
        const thetaDegrees = ((snapshot.axisAngle.angle * 180) / Math.PI).toFixed(1);
        const displayedAxis = snapshot.axisAngle.angle > 1e-6 ? snapshot.axisAngle.axis : lessonAxis;
        return `<div class="lesson-demo equivalent-card">
          <div><span>q courant · axe ${axisLabel(displayedAxis)} · θ <span id="lesson-theta-label">${degreesLabel(snapshot.axisAngle.angle)}</span></span><code id="lesson-current-q">${quaternionLabel(snapshot.enuFlu)}</code></div>
          <button type="button" data-lesson-action="toggle-sign">${showNegative ? "Afficher q" : "Afficher −q"}</button>
          <label class="range-control" for="lesson-theta">θ
            <input id="lesson-theta" type="range" min="0" max="180" step="0.1" value="${thetaDegrees}" />
            <output id="lesson-theta-output" for="lesson-theta">${degreesLabel(snapshot.axisAngle.angle)}</output>
          </label>
          <p aria-live="polite"><span>Représentation équivalente affichée</span><code id="lesson-equivalent-q">${quaternionLabel(equivalent)}</code></p>
        </div>`;
      }
      case "composition": {
        const { result } = composition();
        return `<div class="lesson-demo composition-card">
          <p><strong>Démo de référence</strong> · A roulis 90° · B lacet 90° · fantôme après la première rotation</p>
          <code>${compositionSwapped ? "qA ⊗ qB" : "qB ⊗ qA"} = ${quaternionLabel(result)}</code>
          <p><strong>Bateau courant</strong> <code>${quaternionLabel(snapshot.enuFlu)}</code></p>
          <button type="button" data-lesson-action="swap-composition">Permuter l’ordre</button>
        </div>`;
      }
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
      case "lotusim-xdyn": {
        const formula =
          comparisonPhase === "world"
            ? "<mark>Q_NED_TO_ENU</mark> ⊗ q_NED_FRD ⊗ Q_FLU_TO_FRD"
            : comparisonPhase === "body"
              ? "Q_NED_TO_ENU ⊗ q_NED_FRD ⊗ <mark>Q_FLU_TO_FRD</mark>"
              : "<mark>Q_NED_TO_ENU ⊗ q_NED_FRD ⊗ Q_FLU_TO_FRD</mark>";
        return `<div class="lesson-demo lotusim-demo">
          <div class="convention-cards" aria-label="Deux écritures de la même attitude physique">
            <p><span>xdyn · NED/FRD · (qr,qi,qj,qk)</span><code>${quaternionLabel(snapshot.nedFrd)}</code></p>
            <p><span>LOTUSim · ENU/FLU · (w,x,y,z)</span><code>${quaternionLabel(snapshot.enuFlu)}</code></p>
          </div>
          <div class="phase-controls" role="group" aria-label="Étapes de conversion">
            <button type="button" data-phase="world" aria-pressed="${comparisonPhase === "world"}">Monde</button>
            <button type="button" data-phase="body" aria-pressed="${comparisonPhase === "body"}">Corps</button>
            <button type="button" data-phase="full" aria-pressed="${comparisonPhase === "full"}">Conversion complète</button>
          </div>
          <code class="phase-formula">${formula}</code>
        </div>`;
      }
      case "challenge":
        return `<div class="lesson-demo challenge" aria-labelledby="challenge-question">
          <p id="challenge-question"><strong>Quelle orientation ENU/FLU correspond à xdyn [√½, 0, 0, √½] ?</strong></p>
          <div class="challenge__options">
            ${CHALLENGE_OPTIONS.map(
              (option, index) =>
                `<button type="button" data-challenge-index="${index}" aria-pressed="${challengeSelection === index}"><code>${quaternionLabel(option.quaternion)}</code></button>`,
            ).join("")}
          </div>
          <p class="challenge__feedback">${challengeFeedback}</p>
          ${challengeFeedback ? '<button type="button" data-lesson-action="retry-challenge">Réessayer</button>' : ""}
        </div>`;
    }
  };

  const renderChrome = () => {
    const chrome = tutorialChrome(tutorialState);
    sandbox.hidden = !chrome.showSandbox;
    tutorialResume.hidden = !chrome.showResume;
    tutorialRestart.hidden = !chrome.showRestart;
  };

  const renderLesson = () => {
    renderChrome();
    const focused = document.activeElement;
    const focusSelector = focused instanceof HTMLElement && lesson.contains(focused)
      ? focused.dataset.lessonAction
        ? `[data-lesson-action="${focused.dataset.lessonAction}"]`
        : focused.dataset.phase
          ? `[data-phase="${focused.dataset.phase}"]`
          : focused.dataset.challengeIndex
            ? `[data-challenge-index="${focused.dataset.challengeIndex}"]`
            : focused.id
              ? `#${focused.id}`
              : null
      : null;
    lesson.hidden = tutorialState.mode === "sandbox";
    if (lesson.hidden) return;

    const screen: TutorialScreen = TUTORIAL_SCREENS[tutorialState.screenIndex]!;
    const detailHeadings = ["Définition exacte", "Dérivation", "Exemple de référence"];
    // Le résumé et la dérivation du défi contiennent la réponse : ne les
    // révéler qu'après un premier essai.
    const revealLesson = screen.id !== "challenge" || challengeFeedback !== "";
    lesson.innerHTML = `<header class="lesson-panel__header">
        <p class="lesson-panel__progress">Étape ${tutorialState.screenIndex + 1} / ${TUTORIAL_SCREENS.length}</p>
        <h2 tabindex="-1">${screen.title}</h2>
      </header>
      <p class="lesson-panel__tryit"><strong>Manipulation</strong>${screen.tryIt}</p>
      ${screenSpecificMarkup(screen)}
      <div class="animation-controls" role="group" aria-label="Animation de la leçon">
        <button type="button" data-lesson-action="replay">Rejouer</button>
        <button type="button" data-lesson-action="pause" aria-pressed="${paused}">${paused ? "Reprendre" : "Pause"}</button>
        <label>Vitesse
          <select id="lesson-speed">
            <option value="0.5"${animationSpeed === 0.5 ? " selected" : ""}>0,5×</option>
            <option value="1"${animationSpeed === 1 ? " selected" : ""}>1×</option>
          </select>
        </label>
      </div>
      ${revealLesson ? `<p class="lesson-panel__summary"><strong>Ce que vous venez d'observer</strong>${screen.summary}</p>
      <p class="lesson-panel__takeaway"><strong>À retenir</strong>${screen.takeaway}</p>
      <details${tutorialState.detailsOpen ? " open" : ""}>
        <summary>Comprendre en détail</summary>
        <ol class="lesson-details">
          ${screen.details.map((paragraph, index) => `<li><h3>${detailHeadings[index]}</h3><p>${paragraph}</p></li>`).join("")}
        </ol>
        <h3>Pièges de convention</h3>
        <ul>${screen.pitfalls.map((pitfall) => `<li>${pitfall}</li>`).join("")}</ul>
        <h3>Sources</h3>
        <ul class="source-list">${screen.sources
          .map(
            (source) =>
              `<li><a href="${source.url}" target="_blank" rel="noreferrer">${source.label}</a></li>`,
          )
          .join("")}</ul>
      </details>` : ""}
      <nav class="lesson-navigation" aria-label="Navigation du tutoriel">
        <button type="button" data-lesson-action="previous"${tutorialState.screenIndex === 0 ? " disabled" : ""}>Précédent</button>
        <button type="button" data-lesson-action="skip">Explorer librement</button>
        <button type="button" data-lesson-action="next"${tutorialState.screenIndex === TUTORIAL_SCREENS.length - 1 ? " disabled" : ""}>Suivant</button>
      </nav>`;

    lesson.querySelector("details")?.addEventListener("toggle", (event) => {
      tutorialState = {
        ...tutorialState,
        detailsOpen: (event.currentTarget as HTMLDetailsElement).open,
      };
    });
    lesson.querySelector<HTMLSelectElement>("#lesson-speed")?.addEventListener("change", (event) => {
      animationSpeed = Number((event.currentTarget as HTMLSelectElement).value) as 0.5 | 1;
      scene.setAnimationSpeed(animationSpeed);
    });
    const thetaSlider = lesson.querySelector<HTMLInputElement>("#lesson-theta");
    thetaSlider?.addEventListener("input", () => {
      if (snapshot.axisAngle.angle > 1e-6) lessonAxis = snapshot.axisAngle.axis;
      snapshot = snapshotFromEnu(
        fromAxisAngle({ axis: lessonAxis, angle: radians(Number(thetaSlider.value)) }),
      );
      scene.setOrientation(snapshot.enuFlu);
      scene.setRotationAxis(currentRotationAxis());
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
    lesson.querySelectorAll<HTMLButtonElement>("[data-phase]").forEach((button) => {
      button.addEventListener("click", () => {
        comparisonPhase = button.dataset.phase as typeof comparisonPhase;
        scene.animateComparison(
          snapshot.enuFlu,
          xdynPhaseQuaternion(),
          reducedMotion.matches ? 0 : 900,
        );
        scene.setComparisonPhase(comparisonPhase);
        renderLesson();
      });
    });
    lesson.querySelectorAll<HTMLButtonElement>("[data-challenge-index]").forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.challengeIndex);
        const option = CHALLENGE_OPTIONS[index];
        if (!option) return;
        challengeSelection = index;
        challengeFeedback = evaluateChallenge(option.id).feedback;
        resetTeachingScene();
        renderSnapshot(snapshotFromEnu(option.quaternion), null, true);
        renderLesson();
        announceChallenge(challengeFeedback);
      });
    });
    lesson.querySelectorAll<HTMLButtonElement>("[data-lesson-action]").forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.lessonAction;
        if (action === "previous" || action === "next") {
          tutorialState = action === "previous"
            ? previousScreen(tutorialState)
            : nextScreen(tutorialState);
          showNegative = false;
          compositionSwapped = false;
          comparisonPhase = "full";
          challengeSelection = null;
          challengeFeedback = "";
          cancelChallengeAnnouncement();
          applyScreenDemo(TUTORIAL_SCREENS[tutorialState.screenIndex]!);
          renderLesson();
        } else if (action === "skip") {
          enterSandbox();
        } else if (action === "toggle-sign") {
          showNegative = !showNegative;
          renderLesson();
        } else if (action === "swap-composition") {
          compositionSwapped = !compositionSwapped;
          applyScreenDemo(screen);
          renderLesson();
        } else if (action === "trigger-gimbal") {
          applyScreenDemo(screen);
          renderLesson();
        } else if (action === "reset-gimbal") {
          resetTeachingScene();
          renderSnapshot(snapshotFromEnu([1, 0, 0, 0]), null, true);
          applyCurrentTeachingVisuals(screen);
          renderLesson();
        } else if (action === "retry-challenge") {
          challengeSelection = null;
          challengeFeedback = "";
          cancelChallengeAnnouncement();
          applyScreenDemo(screen);
          renderLesson();
        } else if (action === "replay") {
          // Après une manipulation, l'animation sauvegardée est invalidée :
          // « Rejouer » relance alors la démo de l'écran, jamais un état périmé.
          if (scene.canReplayAnimation()) {
            scene.replayAnimation(!reducedMotion.matches);
          } else {
            applyScreenDemo(screen);
            renderLesson();
          }
        } else if (action === "pause") {
          paused = !paused;
          scene.pauseAnimation(paused);
          renderLesson();
        }
      });
    });

    if (focusSelector) {
      const restored = lesson.querySelector<HTMLElement>(focusSelector);
      const fallback = screen.id === "challenge"
        ? lesson.querySelector<HTMLElement>("[data-challenge-index]")
        : lesson.querySelector<HTMLElement>("h2");
      const target = restored instanceof HTMLButtonElement && restored.disabled
        ? fallback
        : restored ?? fallback;
      target?.focus();
    }
  };

  const enterSandbox = () => {
    cancelChallengeAnnouncement();
    resetAnimation();
    scene.setOrientation(snapshot.enuFlu);
    resetTeachingScene();
    tutorialState = skipTutorial(tutorialState);
    renderLesson();
    sandboxTitle.focus({ preventScroll: true });
    sandbox.scrollIntoView({ block: "start" });
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
    const screen = TUTORIAL_SCREENS[tutorialState.screenIndex]!;
    resetTeachingScene();
    renderSnapshot(derive(result.value), result.note);
    if (tutorialState.mode === "tutorial") {
      applyCurrentTeachingVisuals(screen, screen.id === "lotusim-xdyn");
    }
    renderLesson();
  };

  const focusLessonTitle = () => lesson.querySelector<HTMLElement>("h2")?.focus();

  resetCamera.addEventListener("click", () => scene.resetCamera());
  tutorialResume.addEventListener("click", () => {
    tutorialState = resumeTutorial(tutorialState);
    applyScreenDemo(TUTORIAL_SCREENS[tutorialState.screenIndex]!);
    renderLesson();
    focusLessonTitle();
    lesson.scrollIntoView({ block: "start" });
  });
  tutorialRestart.addEventListener("click", () => {
    tutorialState = restartTutorial(tutorialState);
    showNegative = false;
    compositionSwapped = false;
    comparisonPhase = "full";
    challengeSelection = null;
    challengeFeedback = "";
    cancelChallengeAnnouncement();
    resetAnimation();
    resetTeachingScene();
    renderSnapshot(snapshotFromEnu([1, 0, 0, 0]));
    applyCurrentTeachingVisuals(TUTORIAL_SCREENS[0]!);
    renderLesson();
    focusLessonTitle();
  });
  new ResizeObserver(() => scene.resize()).observe(container);

  bindControls(root, {
    onQuaternion: (result) => update(result, snapshotFromEnu),
    onAxisAngle: (result) => update(result, snapshotFromEnu),
    onEuler: (result) => update(result, (euler) => snapshotFromEnu(fromEulerZYX(euler))),
    onPreset: (preset) => {
      const screen = TUTORIAL_SCREENS[tutorialState.screenIndex]!;
      resetTeachingScene();
      renderSnapshot(presetSnapshot(preset));
      if (tutorialState.mode === "tutorial") {
        applyCurrentTeachingVisuals(screen, screen.id === "lotusim-xdyn");
      }
      renderLesson();
    },
  });

  scene.setAnimationSpeed(animationSpeed);
  applyScreenDemo(TUTORIAL_SCREENS[0]!);
  renderLesson();
}
