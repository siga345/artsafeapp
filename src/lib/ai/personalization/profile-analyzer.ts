import type { ArtistContext, ProfileGap } from "./types";

type GapDefinition = {
  field: string;
  label: string;
  importance: "HIGH" | "MEDIUM" | "LOW";
  hint: string;
  isMissing: (ctx: ArtistContext) => boolean;
};

const GAP_DEFINITIONS: GapDefinition[] = [
  {
    field: "identityStatement",
    label: "Самопозиционирование",
    importance: "HIGH",
    hint: "Заполни — это основа твоего Мира артиста и помогает SAFE точнее подбирать задачи.",
    isMissing: (ctx) => !ctx.identityStatement,
  },
  {
    field: "mission",
    label: "Миссия",
    importance: "HIGH",
    hint: "Сформулируй миссию — она помогает выбирать, что делать дальше, когда всё кажется важным.",
    isMissing: (ctx) => !ctx.mission,
  },
  {
    field: "aestheticKeywords",
    label: "Эстетика",
    importance: "HIGH",
    hint: "Добавь ключевые слова эстетики — это улучшит рекомендации по референсным артистам.",
    isMissing: (ctx) => ctx.aestheticKeywords.length === 0,
  },
  {
    field: "audienceCore",
    label: "Аудитория",
    importance: "MEDIUM",
    hint: "Опиши свою аудиторию — SAFE будет точнее советовать контентные задачи.",
    isMissing: (ctx) => !ctx.audienceCore,
  },
  {
    field: "coreThemes",
    label: "Темы творчества",
    importance: "MEDIUM",
    hint: "Укажи темы — они помогут SAFE подбирать материалы из Learn.",
    isMissing: (ctx) => ctx.coreThemes.length === 0,
  },
  {
    field: "favoriteArtists",
    label: "Референсные артисты",
    importance: "MEDIUM",
    hint: "Добавь артистов, на которых ориентируешься — для лучших рекомендаций.",
    isMissing: (ctx) => ctx.favoriteArtists.length === 0,
  },
  {
    field: "artistCity",
    label: "Город",
    importance: "LOW",
    hint: "Укажи город — это поможет находить офлайн-события рядом.",
    isMissing: (ctx) => !ctx.artistCity,
  },
  {
    field: "pathStage",
    label: "Этап пути",
    importance: "HIGH",
    hint: "Выбери свой этап в Пути артиста — это точка отсчёта для всех рекомендаций.",
    isMissing: (ctx) => !ctx.pathStage,
  },
  {
    field: "goals",
    label: "Активная цель",
    importance: "HIGH",
    hint: "Создай хотя бы одну активную цель — SAFE будет генерировать задачи под неё.",
    isMissing: (ctx) => ctx.goals.length === 0,
  },
  {
    field: "tracks",
    label: "Треки",
    importance: "MEDIUM",
    hint: "Добавь треки в рабочее пространство — SAFE учитывает их при рекомендациях.",
    isMissing: (ctx) => ctx.totalTracksCount === 0,
  },
];

export function analyzeProfileGaps(ctx: ArtistContext): ProfileGap[] {
  return GAP_DEFINITIONS.filter((def) => def.isMissing(ctx)).map(({ field, label, importance, hint }) => ({
    field,
    label,
    importance,
    hint,
  }));
}

export function getTopGaps(ctx: ArtistContext, limit = 3): ProfileGap[] {
  const all = analyzeProfileGaps(ctx);
  const order: Record<ProfileGap["importance"], number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return all.sort((a, b) => order[a.importance] - order[b.importance]).slice(0, limit);
}
