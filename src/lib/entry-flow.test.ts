import { describe, expect, it } from "vitest";

import { buildEntryFlowState, getEntryRedirectPath, getGuideStep, shouldForceWelcome, shouldRunGuide } from "./entry-flow";

describe("entry-flow helpers", () => {
  it("treats missing onboarding rows as legacy users", () => {
    const state = buildEntryFlowState(null);

    expect(state.isLegacyUser).toBe(true);
    expect(getEntryRedirectPath(state)).toBeNull();
    expect(shouldRunGuide(state)).toBe(false);
  });

  it("sends brand-new users to welcome first", () => {
    const state = buildEntryFlowState({
      userId: "user_1",
      dismissedAt: null,
      surveyStatus: "NOT_STARTED",
      guideStatus: "NOT_STARTED",
      guideStepKey: "today",
      surveyDraft: null,
      entryFlowCompletedAt: null,
      updatedAt: new Date("2026-03-20T10:00:00.000Z")
    });

    expect(shouldForceWelcome(state)).toBe(true);
    expect(getEntryRedirectPath(state)).toBe("/welcome");
  });

  it("starts the guide after survey completion", () => {
    const state = buildEntryFlowState({
      userId: "user_2",
      dismissedAt: null,
      surveyStatus: "COMPLETED",
      guideStatus: "IN_PROGRESS",
      guideStepKey: "songs",
      surveyDraft: { nickname: "Echo" },
      entryFlowCompletedAt: null,
      updatedAt: new Date("2026-03-20T10:00:00.000Z")
    });

    expect(shouldRunGuide(state)).toBe(true);
    expect(getGuideStep(state.guideStepKey).route).toBe("/songs");
    expect(getEntryRedirectPath(state)).toBe("/today");
  });
});
