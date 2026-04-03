import { describe, it, expect } from "vitest";
import { analyzeProfileGaps, getTopGaps } from "./profile-analyzer";
import type { ArtistContext } from "./types";

const fullContext: ArtistContext = {
  userId: "user-1",
  nickname: "TestArtist",
  pathStage: { id: 2, order: 2, name: "Форма", description: "Формирование стиля" },
  identityStatement: "Электронный артист",
  mission: "Создавать атмосферную музыку",
  aestheticKeywords: ["ambient", "dark"],
  coreThemes: ["город"],
  audienceCore: "Молодёжь 18-25",
  artistCity: "Москва",
  favoriteArtists: ["Burial"],
  goals: [{ id: "g-1", title: "EP", type: "ALBUM_RELEASE", status: "ACTIVE", isPrimary: true, targetDate: null, whyNow: null, tasks: [] }],
  tracks: [{ id: "t-1", title: "Track 1", workbenchState: "IN_PROGRESS", hasDemo: false, updatedAt: "" }],
  totalTracksCount: 1,
  recentCheckIns: [],
  learnProgress: [],
  upcomingEvents: [],
};

const emptyContext: ArtistContext = {
  userId: "user-2",
  nickname: "NewArtist",
  pathStage: null,
  identityStatement: null,
  mission: null,
  aestheticKeywords: [],
  coreThemes: [],
  audienceCore: null,
  artistCity: null,
  favoriteArtists: [],
  goals: [],
  tracks: [],
  totalTracksCount: 0,
  recentCheckIns: [],
  learnProgress: [],
  upcomingEvents: [],
};

describe("analyzeProfileGaps", () => {
  it("returns no gaps for complete profile", () => {
    const gaps = analyzeProfileGaps(fullContext);
    expect(gaps).toHaveLength(0);
  });

  it("returns all gaps for empty profile", () => {
    const gaps = analyzeProfileGaps(emptyContext);
    const fields = gaps.map((g) => g.field);

    expect(fields).toContain("pathStage");
    expect(fields).toContain("identityStatement");
    expect(fields).toContain("mission");
    expect(fields).toContain("aestheticKeywords");
    expect(fields).toContain("goals");
    expect(fields).toContain("tracks");
  });

  it("returns gap for missing mission only", () => {
    const ctx = { ...fullContext, mission: null };
    const gaps = analyzeProfileGaps(ctx);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].field).toBe("mission");
    expect(gaps[0].importance).toBe("HIGH");
  });

  it("returns gap for empty aestheticKeywords", () => {
    const ctx = { ...fullContext, aestheticKeywords: [] };
    const gaps = analyzeProfileGaps(ctx);
    expect(gaps.some((g) => g.field === "aestheticKeywords")).toBe(true);
  });

  it("returns gap when goals array is empty", () => {
    const ctx = { ...fullContext, goals: [] };
    const gaps = analyzeProfileGaps(ctx);
    expect(gaps.some((g) => g.field === "goals")).toBe(true);
  });

  it("includes hint text for each gap", () => {
    const gaps = analyzeProfileGaps(emptyContext);
    for (const gap of gaps) {
      expect(gap.hint.length).toBeGreaterThan(0);
    }
  });
});

describe("getTopGaps", () => {
  it("returns at most N gaps", () => {
    const gaps = getTopGaps(emptyContext, 3);
    expect(gaps.length).toBeLessThanOrEqual(3);
  });

  it("returns HIGH importance gaps first", () => {
    const gaps = getTopGaps(emptyContext, 5);
    const importances = gaps.map((g) => g.importance);
    const firstMediumIdx = importances.indexOf("MEDIUM");
    const lastHighIdx = importances.lastIndexOf("HIGH");

    if (firstMediumIdx !== -1 && lastHighIdx !== -1) {
      expect(lastHighIdx).toBeLessThan(firstMediumIdx);
    }
  });

  it("returns empty array for complete profile", () => {
    const gaps = getTopGaps(fullContext, 3);
    expect(gaps).toHaveLength(0);
  });
});
