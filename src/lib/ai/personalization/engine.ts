import { prisma } from "@/lib/prisma";
import { getOpenAiProvider } from "@/lib/ai/openai-provider";
import { buildArtistContext } from "./context-builder";
import { generateTasks } from "./task-generator";
import { generateRecommendations } from "./recommendation-engine";
import { analyzeProfileGaps } from "./profile-analyzer";
import type { ArtistContext, GeneratedTask, Recommendation, ProfileGap } from "./types";
import type { AiRecommendationType } from "@prisma/client";

export type PersonalizationResult = {
  tasks: GeneratedTask[];
  recommendations: Recommendation[];
  profileGaps: ProfileGap[];
  context: ArtistContext;
};

export class PersonalizationEngine {
  async run(userId: string): Promise<PersonalizationResult> {
    const provider = getOpenAiProvider();
    const ctx = await buildArtistContext(userId);

    const [tasks, learnRecs, eventRecs] = await Promise.all([
      generateTasks(provider, ctx, 5),
      generateRecommendations(provider, ctx, "LEARN", 5),
      generateRecommendations(provider, ctx, "EVENT", 3),
    ]);

    const recommendations = [...learnRecs, ...eventRecs];
    const profileGaps = analyzeProfileGaps(ctx);

    await this.persist(userId, tasks, recommendations);

    return { tasks, recommendations, profileGaps, context: ctx };
  }

  async getProfileGaps(userId: string): Promise<ProfileGap[]> {
    const ctx = await buildArtistContext(userId);
    return analyzeProfileGaps(ctx);
  }

  async getRecommendations(userId: string, type?: AiRecommendationType): Promise<Recommendation[]> {
    const saved = await prisma.aiRecommendation.findMany({
      where: { userId, ...(type ? { type } : {}), isActive: true },
      orderBy: { relevance: "desc" },
      take: 10,
    });

    return saved.map((r) => ({
      type: r.type,
      title: r.title,
      description: r.reason,
      relevance: r.relevance,
      rationale: r.reason,
      payload: {},
    }));
  }

  async getGeneratedTasks(userId: string): Promise<GeneratedTask[]> {
    const saved = await prisma.aiRecommendation.findMany({
      where: { userId, type: "TASK", isActive: true },
      orderBy: { relevance: "desc" },
      take: 10,
    });

    const taskIds = saved.map((r) => r.id);
    const rationales = taskIds.length > 0
      ? await prisma.aiTaskRationale.findMany({ where: { taskId: { in: taskIds } } })
      : [];

    const rationaleByTaskId = Object.fromEntries(rationales.map((r) => [r.taskId, r.rationale]));

    return saved.map((r) => ({
      title: r.title,
      description: r.reason,
      category: (r.category as GeneratedTask["category"]) ?? "OPERATIONS",
      priority: r.type === "TASK" ? "MEDIUM" : "LOW",
      rationale: rationaleByTaskId[r.id] ?? r.reason,
    }));
  }

  private async persist(
    userId: string,
    tasks: GeneratedTask[],
    recommendations: Recommendation[]
  ): Promise<void> {
    await prisma.aiRecommendation.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    for (const task of tasks) {
      const relevance = task.priority === "HIGH" ? 0.9 : task.priority === "MEDIUM" ? 0.6 : 0.3;

      const rec = await prisma.aiRecommendation.create({
        data: {
          userId,
          type: "TASK",
          title: task.title,
          reason: task.description,
          relevance,
          category: task.category,
          isActive: true,
        },
      });

      if (task.rationale) {
        await prisma.aiTaskRationale.create({
          data: {
            userId,
            taskId: rec.id,
            taskTitle: task.title,
            rationale: task.rationale,
            priority: task.priority,
            category: task.category,
          },
        });
      }
    }

    for (const rec of recommendations) {
      await prisma.aiRecommendation.create({
        data: {
          userId,
          type: rec.type,
          title: rec.title,
          reason: rec.description,
          relevance: rec.relevance,
          isActive: true,
        },
      });
    }
  }
}

let engineInstance: PersonalizationEngine | null = null;

export function getPersonalizationEngine(): PersonalizationEngine {
  if (!engineInstance) {
    engineInstance = new PersonalizationEngine();
  }
  return engineInstance;
}
