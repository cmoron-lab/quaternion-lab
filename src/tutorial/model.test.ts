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
    expect(previousScreen(startTutorial()).screenIndex).toBe(0);

    const secondScreen = nextScreen(nextScreen(startTutorial()));
    expect(previousScreen(secondScreen).screenIndex).toBe(1);

    let state = startTutorial();
    for (let index = 0; index <= TUTORIAL_SCREENS.length; index += 1) {
      state = nextScreen(state);
    }
    expect(state.screenIndex).toBe(TUTORIAL_SCREENS.length - 1);
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
