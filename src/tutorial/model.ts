import type { Quaternion } from "../math/quaternion";
import { TUTORIAL_SCREENS } from "./content";

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

export const CHALLENGE_OPTIONS = [
  { id: "correct", quaternion: [1, 0, 0, 0] },
  { id: "sign-equivalent", quaternion: [-1, 0, 0, 0] },
  // q_NED_FRD ⊗ Q_FLU_TO_FRD: the world-frame swap was omitted.
  { id: "missing-world-swap", quaternion: [0, Math.SQRT1_2, Math.SQRT1_2, 0] },
  // Q_NED_TO_ENU ⊗ q_NED_FRD: the body-frame swap was omitted.
  { id: "missing-body-swap", quaternion: [0, 1, 0, 0] },
  // Q_FLU_TO_FRD ⊗ q_NED_FRD ⊗ Q_NED_TO_ENU: the factors were reversed.
  { id: "reversed-order", quaternion: [0, 0, 0, 1] },
  { id: "scalar-last", quaternion: [0.5, 0.5, 0.5, 0.5] },
] as const satisfies readonly Readonly<{
  id: ChallengeOptionId;
  quaternion: Quaternion;
}>[];

const LAST_SCREEN_INDEX = TUTORIAL_SCREENS.length - 1;

export const startTutorial = (): TutorialState => ({
  mode: "tutorial",
  screenIndex: 0,
  detailsOpen: false,
});

export const nextScreen = (state: TutorialState): TutorialState => ({
  ...state,
  screenIndex: Math.min(LAST_SCREEN_INDEX, Math.max(0, state.screenIndex + 1)),
});

export const previousScreen = (state: TutorialState): TutorialState => ({
  ...state,
  screenIndex: Math.min(LAST_SCREEN_INDEX, Math.max(0, state.screenIndex - 1)),
});

export const skipTutorial = (state: TutorialState): TutorialState => ({
  ...state,
  mode: "sandbox",
});

export const resumeTutorial = (state: TutorialState): TutorialState => ({
  ...state,
  mode: "tutorial",
});

export const restartTutorial = (_state: TutorialState): TutorialState =>
  startTutorial();

const CHALLENGE_RESULTS = {
  correct: {
    correct: true,
    feedback:
      "Correct: les deux changements de repère donnent l’identité ENU/FLU.",
  },
  "sign-equivalent": {
    correct: true,
    feedback:
      "Correct: q et −q décrivent la même orientation; le signe ne change pas l’attitude.",
  },
  "missing-world-swap": {
    correct: false,
    feedback:
      "Ce résultat omet le passage du monde NED au monde ENU; le changement du corps seul ne suffit pas.",
  },
  "missing-body-swap": {
    correct: false,
    feedback:
      "Ce résultat omet le passage du corps FRD au corps FLU; changer seulement NED en ENU est incomplet.",
  },
  "reversed-order": {
    correct: false,
    feedback:
      "L’ordre est inversé: Q_NED_TO_ENU agit à gauche et Q_FLU_TO_FRD à droite du quaternion xdyn.",
  },
  "scalar-last": {
    correct: false,
    feedback:
      "Les composantes ont été mélangées: xdyn fournit (qr,qi,qj,qk), scalaire d’abord, tandis que Three.js attend (x,y,z,w).",
  },
} as const satisfies Record<
  ChallengeOptionId,
  Readonly<{ correct: boolean; feedback: string }>
>;

export const evaluateChallenge = (id: ChallengeOptionId) =>
  CHALLENGE_RESULTS[id];
