import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildArtistContext, formatContextAsPrompt } from "./context-builder";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUniqueOrThrow: vi.fn(),
    },
    dailyCheckIn: {
      findMany: vi.fn(),
    },
    track: {
      findMany: vi.fn(),
    },
    learnMaterialProgress: {
      findMany: vi.fn(),
    },
    communityEvent: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockUser = {
  id: "user-1",
  nickname: "TestArtist",
  pathStage: { id: 2, order: 2, name: "Форма", description: "Формирование стиля" },
  identityProfile: {
    identityStatement: "Электронный артист из Москвы",
    mission: "Создавать атмосферную музыку",
    aestheticKeywords: ["ambient", "dark"],
    coreThemes: ["одиночество", "город"],
    audienceCore: "Молодёжь 18-25",
    artistCity: "Москва",
    favoriteArtists: ["Burial", "The Weeknd"],
  },
  goals: [
    {
      id: "goal-1",
      title: "Выпустить EP",
      type: "ALBUM_RELEASE",
      status: "ACTIVE",
      isPrimary: true,
      targetDate: new Date("2026-06-01"),
      whyNow: "Готов материал",
      pillars: [
        {
          factor: "CATALOG" as const,
          tasks: [
            {
              id: "task-1",
              title: "Записать 4 трека",
              description: null,
              status: "IN_PROGRESS",
              priority: "HIGH" as const,
            },
          ],
        },
      ],
    },
  ],
};

const mockCheckIns = [
  { date: new Date("2026-03-22"), mood: "NORMAL" as const, note: null },
  { date: new Date("2026-03-21"), mood: "FLYING" as const, note: "Хорошо пишется" },
];

const mockTracks = [
  { id: "track-1", title: "Track One", workbenchState: "IN_PROGRESS" as const, primaryDemoId: "demo-1", updatedAt: new Date("2026-03-20") },
  { id: "track-2", title: "Track Two", workbenchState: "STUCK" as const, primaryDemoId: null, updatedAt: new Date("2026-03-18") },
];

const mockLearnProgress = [
  { materialKey: "mixing-basics", status: "APPLIED" as const },
  { materialKey: "arrangement-101", status: "OPEN" as const },
];

const mockEvents = [
  { id: "ev-1", title: "Beatmaking Workshop", startsAt: new Date("2026-04-10"), isOnline: true, city: null },
];

beforeEach(() => {
  vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue(mockUser as never);
  vi.mocked(prisma.dailyCheckIn.findMany).mockResolvedValue(mockCheckIns as never);
  vi.mocked(prisma.track.findMany).mockResolvedValue(mockTracks as never);
  vi.mocked(prisma.learnMaterialProgress.findMany).mockResolvedValue(mockLearnProgress as never);
  vi.mocked(prisma.communityEvent.findMany).mockResolvedValue(mockEvents as never);
});

describe("buildArtistContext", () => {
  it("returns correct userId and nickname", async () => {
    const ctx = await buildArtistContext("user-1");
    expect(ctx.userId).toBe("user-1");
    expect(ctx.nickname).toBe("TestArtist");
  });

  it("maps pathStage correctly", async () => {
    const ctx = await buildArtistContext("user-1");
    expect(ctx.pathStage).toEqual({ id: 2, order: 2, name: "Форма", description: "Формирование стиля" });
  });

  it("maps identity profile fields", async () => {
    const ctx = await buildArtistContext("user-1");
    expect(ctx.identityStatement).toBe("Электронный артист из Москвы");
    expect(ctx.aestheticKeywords).toEqual(["ambient", "dark"]);
    expect(ctx.favoriteArtists).toEqual(["Burial", "The Weeknd"]);
  });

  it("maps goals with tasks", async () => {
    const ctx = await buildArtistContext("user-1");
    expect(ctx.goals).toHaveLength(1);
    expect(ctx.goals[0].isPrimary).toBe(true);
    expect(ctx.goals[0].tasks[0].pillarFactor).toBe("CATALOG");
    expect(ctx.goals[0].tasks[0].priority).toBe("HIGH");
  });

  it("maps tracks with hasDemo flag", async () => {
    const ctx = await buildArtistContext("user-1");
    expect(ctx.tracks[0].hasDemo).toBe(true);
    expect(ctx.tracks[1].hasDemo).toBe(false);
    expect(ctx.totalTracksCount).toBe(2);
  });

  it("maps recent check-ins", async () => {
    const ctx = await buildArtistContext("user-1");
    expect(ctx.recentCheckIns).toHaveLength(2);
    expect(ctx.recentCheckIns[0].mood).toBe("NORMAL");
  });

  it("maps upcoming events", async () => {
    const ctx = await buildArtistContext("user-1");
    expect(ctx.upcomingEvents).toHaveLength(1);
    expect(ctx.upcomingEvents[0].title).toBe("Beatmaking Workshop");
    expect(ctx.upcomingEvents[0].isOnline).toBe(true);
  });

  it("handles null identityProfile gracefully", async () => {
    vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue({ ...mockUser, identityProfile: null } as never);
    const ctx = await buildArtistContext("user-1");
    expect(ctx.identityStatement).toBeNull();
    expect(ctx.aestheticKeywords).toEqual([]);
  });

  it("handles null pathStage gracefully", async () => {
    vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue({ ...mockUser, pathStage: null } as never);
    const ctx = await buildArtistContext("user-1");
    expect(ctx.pathStage).toBeNull();
  });
});

describe("formatContextAsPrompt", () => {
  it("includes nickname and path stage", async () => {
    const ctx = await buildArtistContext("user-1");
    const prompt = formatContextAsPrompt(ctx);
    expect(prompt).toContain("TestArtist");
    expect(prompt).toContain("Форма");
  });

  it("includes goals and tasks", async () => {
    const ctx = await buildArtistContext("user-1");
    const prompt = formatContextAsPrompt(ctx);
    expect(prompt).toContain("Выпустить EP");
    expect(prompt).toContain("Записать 4 трека");
  });

  it("includes aesthetic keywords", async () => {
    const ctx = await buildArtistContext("user-1");
    const prompt = formatContextAsPrompt(ctx);
    expect(prompt).toContain("ambient");
  });

  it("returns non-empty string for minimal context", async () => {
    vi.mocked(prisma.user.findUniqueOrThrow).mockResolvedValue({
      ...mockUser,
      pathStage: null,
      identityProfile: null,
      goals: [],
    } as never);
    vi.mocked(prisma.track.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.dailyCheckIn.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.communityEvent.findMany).mockResolvedValue([] as never);

    const ctx = await buildArtistContext("user-1");
    const prompt = formatContextAsPrompt(ctx);
    expect(prompt.length).toBeGreaterThan(0);
    expect(prompt).toContain("TestArtist");
  });
});
