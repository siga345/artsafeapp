import { describe, it, expect, vi, beforeEach } from "vitest";
import { PersonalizationEngine } from "./engine";
import type { ArtistContext } from "./types";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    aiRecommendation: {
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      create: vi.fn().mockResolvedValue({ id: "rec-1" }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    aiTaskRationale: {
      create: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

// Mock context-builder
vi.mock("./context-builder", () => ({
  buildArtistContext: vi.fn(),
  formatContextAsPrompt: vi.fn().mockReturnValue("mock context"),
}));

// Mock profile-analyzer
vi.mock("./profile-analyzer", () => ({
  analyzeProfileGaps: vi.fn().mockReturnValue([
    { field: "mission", label: "Миссия", importance: "HIGH", hint: "Заполни миссию" },
  ]),
}));

// Mock task-generator
vi.mock("./task-generator", () => ({
  generateTasks: vi.fn(),
}));

// Mock recommendation-engine
vi.mock("./recommendation-engine", () => ({
  generateRecommendations: vi.fn(),
}));

// Mock OpenAI provider
vi.mock("@/lib/ai/openai-provider", () => ({
  getOpenAiProvider: vi.fn().mockReturnValue({}),
}));

import { prisma } from "@/lib/prisma";
import { buildArtistContext } from "./context-builder";
import { generateTasks } from "./task-generator";
import { generateRecommendations } from "./recommendation-engine";

const mockContext: ArtistContext = {
  userId: "user-1",
  nickname: "TestArtist",
  pathStage: { id: 2, order: 2, name: "Форма", description: "Формирование стиля" },
  identityStatement: "Электронный артист",
  mission: "Создавать атмосферную музыку",
  aestheticKeywords: ["ambient"],
  coreThemes: ["город"],
  audienceCore: "Молодёжь",
  artistCity: "Москва",
  favoriteArtists: ["Burial"],
  goals: [{ id: "goal-1", title: "Выпустить EP", type: "ALBUM_RELEASE", status: "ACTIVE", isPrimary: true, targetDate: null, whyNow: null, tasks: [] }],
  tracks: [{ id: "t-1", title: "Track 1", workbenchState: "IN_PROGRESS", hasDemo: true, updatedAt: "2026-03-20T00:00:00Z" }],
  totalTracksCount: 1,
  recentCheckIns: [{ date: "2026-03-22", mood: "NORMAL", note: null }],
  learnProgress: [],
  upcomingEvents: [],
};

const mockTasks = [
  { title: "Записать демо", description: "Сделать черновик", category: "CATALOG" as const, priority: "HIGH" as const, rationale: "Нет демо у треков", relatedGoalId: "goal-1" },
];

const mockLearnRecs = [
  { type: "LEARN" as const, title: "Mixing 101", description: "Основы сведения", relevance: 0.8, rationale: "Нужно для EP", payload: {} },
];

const mockEventRecs = [
  { type: "EVENT" as const, title: "Beatmaking Workshop", description: "Воркшоп", relevance: 0.7, rationale: "Рядом с тобой", payload: {} },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(buildArtistContext).mockResolvedValue(mockContext);
  vi.mocked(generateTasks).mockResolvedValue(mockTasks);
  vi.mocked(generateRecommendations).mockImplementation(async (_p, _c, type) =>
    type === "LEARN" ? mockLearnRecs : mockEventRecs
  );
  vi.mocked(prisma.aiRecommendation.create).mockResolvedValue({ id: "rec-1" } as never);
});

describe("PersonalizationEngine.run", () => {
  it("returns tasks, recommendations and profileGaps", async () => {
    const engine = new PersonalizationEngine();
    const result = await engine.run("user-1");

    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].title).toBe("Записать демо");
    expect(result.recommendations).toHaveLength(2);
    expect(result.profileGaps).toHaveLength(1);
    expect(result.profileGaps[0].field).toBe("mission");
  });

  it("deactivates old recommendations before persisting", async () => {
    const engine = new PersonalizationEngine();
    await engine.run("user-1");

    expect(prisma.aiRecommendation.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", isActive: true },
      data: { isActive: false },
    });
  });

  it("persists tasks and creates rationale records", async () => {
    const engine = new PersonalizationEngine();
    await engine.run("user-1");

    // 1 task + 2 recommendations = 3 creates
    expect(prisma.aiRecommendation.create).toHaveBeenCalledTimes(3);
    expect(prisma.aiTaskRationale.create).toHaveBeenCalledTimes(1);
    expect(prisma.aiTaskRationale.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ taskTitle: "Записать демо", priority: "HIGH" }),
      })
    );
  });

  it("returns context from buildArtistContext", async () => {
    const engine = new PersonalizationEngine();
    const result = await engine.run("user-1");
    expect(result.context.userId).toBe("user-1");
  });
});

describe("PersonalizationEngine.getProfileGaps", () => {
  it("returns gaps without calling OpenAI", async () => {
    const engine = new PersonalizationEngine();
    const gaps = await engine.getProfileGaps("user-1");

    expect(gaps).toHaveLength(1);
    expect(gaps[0].importance).toBe("HIGH");
    // OpenAI provider не вызывается — только buildArtistContext
    expect(buildArtistContext).toHaveBeenCalledWith("user-1");
    expect(generateTasks).not.toHaveBeenCalled();
  });
});

describe("PersonalizationEngine.getGeneratedTasks", () => {
  it("returns tasks from DB", async () => {
    vi.mocked(prisma.aiRecommendation.findMany).mockResolvedValue([
      { id: "rec-1", type: "TASK", title: "Написать текст", reason: "Нет слов", relevance: 0.9, category: "CATALOG", isActive: true } as never,
    ]);
    vi.mocked(prisma.aiTaskRationale.findMany).mockResolvedValue([
      { taskId: "rec-1", rationale: "Это важно для EP" } as never,
    ]);

    const engine = new PersonalizationEngine();
    const tasks = await engine.getGeneratedTasks("user-1");

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe("Написать текст");
    expect(tasks[0].rationale).toBe("Это важно для EP");
    expect(tasks[0].category).toBe("CATALOG");
  });
});
