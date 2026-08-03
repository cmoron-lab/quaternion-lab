import { describe, expect, test } from "bun:test";
import { TUTORIAL_SCREENS } from "./content";
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
} from "./model";

describe("tutorial", () => {
  test("contains five lessons and one final challenge", () => {
    expect(TUTORIAL_SCREENS.map((screen) => screen.id)).toEqual([
      "frames",
      "axis-angle",
      "composition",
      "gimbal-lock",
      "lotusim-xdyn",
      "challenge",
    ]);
    for (const screen of TUTORIAL_SCREENS) {
      expect(screen.summary.length).toBeGreaterThan(40);
      expect(screen.details.length).toBeGreaterThan(1);
      expect(screen.sources.length).toBeGreaterThan(0);
    }
  });

  test("clamps navigation to the tutorial bounds", () => {
    const firstScreen = startTutorial();
    expect(previousScreen(firstScreen)).toEqual(firstScreen);

    const secondScreen = nextScreen(nextScreen(startTutorial()));
    expect(previousScreen(secondScreen).screenIndex).toBe(1);

    let state = startTutorial();
    for (let index = 0; index <= TUTORIAL_SCREENS.length; index += 1) {
      state = nextScreen(state);
    }
    expect(state.screenIndex).toBe(TUTORIAL_SCREENS.length - 1);
    expect(nextScreen(state)).toEqual(state);
  });

  test("keeps every external source on HTTPS", () => {
    for (const screen of TUTORIAL_SCREENS) {
      for (const source of screen.sources) {
        expect(source.url.startsWith("https://")).toBe(true);
      }
    }
  });

  test("skips and resumes without losing the in-memory step", () => {
    const advanced = nextScreen(startTutorial());
    const skipped = skipTutorial({ ...advanced, detailsOpen: true });
    expect(skipped).toEqual({
      mode: "sandbox",
      screenIndex: 1,
      detailsOpen: true,
    });
    expect(resumeTutorial(skipped)).toEqual({
      mode: "tutorial",
      screenIndex: 1,
      detailsOpen: true,
    });
    expect(restartTutorial(skipped)).toEqual({
      mode: "tutorial",
      screenIndex: 0,
      detailsOpen: false,
    });
  });

  test("reveals navigation and expert controls only when they are useful", () => {
    expect(tutorialChrome(startTutorial())).toEqual({
      showSandbox: false,
      showSkip: true,
      showResume: false,
      showRestart: false,
      showTechnicalConventions: false,
    });

    const advanced = nextScreen(startTutorial());
    expect(tutorialChrome(advanced)).toEqual({
      showSandbox: true,
      showSkip: true,
      showResume: false,
      showRestart: true,
      showTechnicalConventions: false,
    });

    expect(tutorialChrome(skipTutorial(advanced))).toEqual({
      showSandbox: true,
      showSkip: false,
      showResume: true,
      showRestart: true,
      showTechnicalConventions: false,
    });

    let conversion = startTutorial();
    for (let index = 0; index < 4; index += 1) conversion = nextScreen(conversion);
    expect(tutorialChrome(conversion).showTechnicalConventions).toBe(true);
    expect(
      tutorialChrome(skipTutorial(conversion)).showTechnicalConventions,
    ).toBe(true);
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
