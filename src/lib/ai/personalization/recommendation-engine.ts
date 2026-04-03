import type { OpenAiStructuredProvider } from "@/lib/ai/openai-provider";
import type { ArtistContext, Recommendation } from "./types";
import { formatContextAsPrompt } from "./context-builder";
import type { AiRecommendationType } from "@prisma/client";

const SYSTEM_PROMPT = `Ты — SAFE, персональный менеджер музыкального артиста.
Подбери рекомендации нужного типа на основе профиля артиста.

Правила:
- Язык русский, обращение на "ты"
- relevance: число от 0 до 1 (насколько актуально для этого артиста)
- Верни строго валидный JSON без markdown-обёртки`;

function buildUserPrompt(ctx: ArtistContext, type: AiRecommendationType, count: number): string {
  const typeDescriptions: Record<AiRecommendationType, string> = {
    LEARN: "образовательные материалы (статьи, видео по музыкальному продакшну, карьере артиста)",
    EVENT: "мероприятия (воркшопы, концерты, нетворкинг)",
    CREATOR: "специалисты и коллаборации (продюсеры, саунд-дизайнеры, операторы)",
    REFERENCE_ARTIST: "референсные артисты похожего стиля и эстетики",
    TASK: "конкретные задачи на ближайшие дни",
  };

  return `${formatContextAsPrompt(ctx)}

Подбери ${count} рекомендаций типа "${type}" (${typeDescriptions[type]}) для этого артиста.

Верни JSON:
{
  "recommendations": [
    {
      "type": "${type}",
      "title": "...",
      "description": "...",
      "relevance": 0.85,
      "rationale": "Почему это подходит артисту",
      "payload": {}
    }
  ]
}`;
}

type RawRecommendation = {
  type?: unknown;
  title?: unknown;
  description?: unknown;
  relevance?: unknown;
  rationale?: unknown;
  payload?: unknown;
};

type RecommendationsResponse = { recommendations?: RawRecommendation[] };

function parseRecommendations(raw: RecommendationsResponse, type: AiRecommendationType): Recommendation[] {
  if (!Array.isArray(raw.recommendations)) return [];

  return raw.recommendations
    .filter((r): r is RawRecommendation => typeof r === "object" && r !== null)
    .filter((r) => typeof r.title === "string" && r.title.length > 0)
    .map((r) => ({
      type,
      title: String(r.title),
      description: typeof r.description === "string" ? r.description : "",
      relevance: typeof r.relevance === "number" ? Math.min(1, Math.max(0, r.relevance)) : 0.5,
      rationale: typeof r.rationale === "string" ? r.rationale : "",
      payload: (typeof r.payload === "object" && r.payload !== null ? r.payload : {}) as Record<string, unknown>,
    }));
}

export async function generateRecommendations(
  provider: OpenAiStructuredProvider,
  ctx: ArtistContext,
  type: AiRecommendationType,
  count = 5
): Promise<Recommendation[]> {
  const raw = await provider.generateStructured<RecommendationsResponse>({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildUserPrompt(ctx, type, count),
  });

  return parseRecommendations(raw, type);
}
