import type { OpenAiStructuredProvider } from "@/lib/ai/openai-provider";
import type { ArtistContext, GeneratedTask } from "./types";
import { formatContextAsPrompt } from "./context-builder";

const SYSTEM_PROMPT = `Ты — SAFE, персональный менеджер музыкального артиста.
Твоя задача — предложить конкретные, выполнимые задачи на ближайшие дни.

Правила:
- Обращайся на "ты", язык русский
- Задачи должны быть конкретными и выполнимыми за 1-3 дня
- Учитывай текущий этап пути, активные цели и настроение
- Не дублируй задачи, которые уже есть в активных целях
- Рекомендуй, не диктуй — "я бы предложил", а не "сделай"
- category должен быть одним из: DIRECTION, ARTIST_WORLD, CATALOG, AUDIENCE, LIVE, TEAM, OPERATIONS
- priority: HIGH, MEDIUM или LOW
- Верни строго валидный JSON без markdown-обёртки`;

function buildUserPrompt(ctx: ArtistContext, count: number): string {
  return `${formatContextAsPrompt(ctx)}

Предложи ${count} задач для этого артиста на ближайшие дни.

Верни JSON:
{
  "tasks": [
    {
      "title": "...",
      "description": "...",
      "category": "CATALOG",
      "priority": "HIGH",
      "rationale": "Почему эта задача важна сейчас",
      "relatedGoalId": "goal-id или null"
    }
  ]
}`;
}

type RawTask = {
  title?: unknown;
  description?: unknown;
  category?: unknown;
  priority?: unknown;
  rationale?: unknown;
  relatedGoalId?: unknown;
};

type TasksResponse = { tasks?: RawTask[] };

const VALID_CATEGORIES = new Set([
  "DIRECTION", "ARTIST_WORLD", "CATALOG", "AUDIENCE", "LIVE", "TEAM", "OPERATIONS",
]);
const VALID_PRIORITIES = new Set(["HIGH", "MEDIUM", "LOW"]);

function parseGeneratedTasks(raw: TasksResponse, ctx: ArtistContext): GeneratedTask[] {
  if (!Array.isArray(raw.tasks)) return [];

  return raw.tasks
    .filter((t): t is RawTask => typeof t === "object" && t !== null)
    .filter((t) => typeof t.title === "string" && t.title.length > 0)
    .map((t) => {
      const goalId = typeof t.relatedGoalId === "string" && t.relatedGoalId !== "null"
        ? ctx.goals.find((g) => g.id === t.relatedGoalId)?.id
        : undefined;

      return {
        title: String(t.title),
        description: typeof t.description === "string" ? t.description : "",
        category: VALID_CATEGORIES.has(String(t.category)) ? (t.category as GeneratedTask["category"]) : "OPERATIONS",
        priority: VALID_PRIORITIES.has(String(t.priority)) ? (t.priority as GeneratedTask["priority"]) : "MEDIUM",
        rationale: typeof t.rationale === "string" ? t.rationale : "",
        relatedGoalId: goalId,
      };
    });
}

export async function generateTasks(
  provider: OpenAiStructuredProvider,
  ctx: ArtistContext,
  count = 5
): Promise<GeneratedTask[]> {
  const raw = await provider.generateStructured<TasksResponse>({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildUserPrompt(ctx, count),
  });

  return parseGeneratedTasks(raw, ctx);
}
