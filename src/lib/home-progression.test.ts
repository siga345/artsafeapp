import { describe, expect, it } from "vitest";

import { getArtistWorldReadinessMeta } from "@/lib/artist-world";
import { buildHomeOnboardingState, buildHomeProgressionSignals } from "@/lib/home-progression";

describe("home progression", () => {
  it("keeps the user in world-first mode when the artist world is empty", () => {
    const progression = buildHomeProgressionSignals({
      artistWorld: null,
      hasPrimaryGoal: false,
      hasTodayFocus: false,
      hasExecutionObjects: false,
      checkInExists: false,
      weeklyActiveDays: 0,
      completedFocusCount: 0
    });

    expect(progression.worldReadiness).toBe("EMPTY");
    expect(progression.pathReadiness).toBe("IDENTITY");
    expect(progression.entryMode).toBe("WORLD_FIRST");
    expect(progression.recommendedNextRoute).toBe("/id");
  });

  it("keeps a blank artist world object in world-first mode", () => {
    const progression = buildHomeProgressionSignals({
      artistWorld: {
        worldCreated: false
      },
      hasPrimaryGoal: false,
      hasTodayFocus: false,
      hasExecutionObjects: false,
      checkInExists: false,
      weeklyActiveDays: 0,
      completedFocusCount: 0
    });

    expect(progression.worldReadiness).toBe("EMPTY");
    expect(progression.entryMode).toBe("WORLD_FIRST");
    expect(progression.recommendedNextRoute).toBe("/id");
  });

  it("moves to focus mode once the world is ready but no primary goal exists", () => {
    const progression = buildHomeProgressionSignals({
      artistWorld: {
        worldCreated: true,
        mission: "Стать узнаваемым исполнителем",
        identityStatement: "Артист ночной нежности",
        favoriteArtists: ["A", "B", "C"],
        lifeValues: "Саморазвитие",
        coreThemes: ["Память", "Ночь"],
        references: [{ title: "Ref 1" }],
        visualBoards: [
          {
            slug: "aesthetics",
            name: "Эстетика",
            sourceUrl: "https://www.pinterest.com/artist/aesthetics-board/",
            images: []
          },
          {
            slug: "fashion",
            name: "Фэшн",
            images: []
          }
        ]
      },
      hasPrimaryGoal: false,
      hasTodayFocus: false,
      hasExecutionObjects: false,
      checkInExists: false,
      weeklyActiveDays: 0,
      completedFocusCount: 0
    });

    expect(progression.worldReadiness).toBe("READY_INTERNAL");
    expect(progression.pathReadiness).toBe("FOCUS");
    expect(progression.entryMode).toBe("PATH_FIRST");
    expect(progression.recommendedNextRoute).toBe("/today");
    expect(progression.careerSystemHint).toContain("Карьера артиста строится системно");
  });

  it("treats execution and review as active path mode", () => {
    const progression = buildHomeProgressionSignals({
      artistWorld: {
        worldCreated: true,
        mission: "Стать узнаваемым исполнителем",
        identityStatement: "Артист ночной нежности",
        favoriteArtists: ["A", "B", "C"],
        lifeValues: "Саморазвитие",
        coreThemes: ["Память", "Ночь"],
        references: [{ title: "Ref 1" }],
        visualBoards: [
          {
            slug: "aesthetics",
            name: "Эстетика",
            sourceUrl: "https://www.pinterest.com/artist/aesthetics-board/",
            images: []
          },
          {
            slug: "fashion",
            name: "Фэшн",
            images: []
          }
        ]
      },
      hasPrimaryGoal: true,
      hasTodayFocus: true,
      hasExecutionObjects: true,
      checkInExists: true,
      weeklyActiveDays: 3,
      completedFocusCount: 2
    });

    expect(progression.pathReadiness).toBe("REVIEW");
    expect(progression.entryMode).toBe("PATH_ACTIVE");
    expect(progression.nextBestActionReason).toContain("review");
  });

  it("builds a phase-1 onboarding state from the same readiness signals", () => {
    const onboarding = buildHomeOnboardingState({
      worldReadiness: "READY_INTERNAL",
      pathReadiness: "FOCUS",
      hasPrimaryGoal: false,
      hasExecutionObjects: false,
      checkInExists: false,
      dismissedAt: null
    });

    expect(onboarding.isVisible).toBe(false);
    expect(onboarding.steps[0].id).toBe("artist_world");
    expect(onboarding.steps[1].completed).toBe(true);
  });

  it("shows onboarding to a true empty user and points them at world setup first", () => {
    const onboarding = buildHomeOnboardingState({
      worldReadiness: "EMPTY",
      pathReadiness: "IDENTITY",
      hasPrimaryGoal: false,
      hasExecutionObjects: false,
      checkInExists: false,
      dismissedAt: null
    });

    expect(onboarding.isVisible).toBe(true);
    expect(onboarding.nextStep?.id).toBe("artist_world");
    expect(onboarding.steps[0]).toMatchObject({
      id: "artist_world",
      completed: false,
      href: "/id"
    });
  });

  it("uses the same readiness rule as the artist world meta", () => {
    const artistWorld = {
      worldCreated: true,
      mission: "Стать узнаваемым исполнителем",
      identityStatement: "Артист ночной нежности",
      favoriteArtists: ["A", "B", "C"],
      lifeValues: "Саморазвитие",
      coreThemes: ["Память", "Ночь"],
      references: [{ title: "Ref 1" }],
      visualBoards: [
        {
          slug: "aesthetics",
          name: "Эстетика",
          sourceUrl: "https://www.pinterest.com/artist/aesthetics-board/",
          images: []
        }
      ]
    };

    const progression = buildHomeProgressionSignals({
      artistWorld,
      hasPrimaryGoal: true,
      hasTodayFocus: true,
      hasExecutionObjects: true,
      checkInExists: true,
      weeklyActiveDays: 2,
      completedFocusCount: 1
    });

    expect(progression.worldReadiness).toBe(getArtistWorldReadinessMeta(artistWorld).state);
  });
});
