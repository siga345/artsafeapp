import {
  ArtistWorldBackgroundMode,
  ArtistWorldThemePreset
} from "@prisma/client";
import type { ArtistSupportNeedType } from "@prisma/client";

// ─── Block IDs ───────────────────────────────────────────────────────────────

export const artistWorldBlockIds = [
  "mission",
  "identity",
  "themes_audience",
  "aesthetics",
  "fashion",
  "playlist"
] as const;

export type ArtistWorldBlockId = (typeof artistWorldBlockIds)[number];

export const defaultArtistWorldBlockOrder: ArtistWorldBlockId[] = [...artistWorldBlockIds];

export const artistWorldThemePresetOptions: ArtistWorldThemePreset[] = [
  ArtistWorldThemePreset.EDITORIAL,
  ArtistWorldThemePreset.STUDIO,
  ArtistWorldThemePreset.CINEMATIC,
  ArtistWorldThemePreset.MINIMAL
];

export const artistWorldBackgroundModeOptions: ArtistWorldBackgroundMode[] = [
  ArtistWorldBackgroundMode.GRADIENT,
  ArtistWorldBackgroundMode.IMAGE
];

// ─── Input types ─────────────────────────────────────────────────────────────

export type ArtistWorldProjectInput = {
  id?: string | null;
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  linkUrl?: string | null;
  coverImageUrl?: string | null;
};

export type ArtistWorldReferenceInput = {
  id?: string | null;
  title?: string | null;
  creator?: string | null;
  note?: string | null;
  linkUrl?: string | null;
  imageUrl?: string | null;
};

export type ArtistWorldVisualBoardInput = {
  id?: string | null;
  slug: string;
  name: string;
  sourceUrl?: string | null;
  images?: Array<{ id?: string | null; imageUrl: string }>;
};

export const artistWorldVisualBoardDefinitions = [
  { slug: "aesthetics", name: "Эстетика" },
  { slug: "fashion", name: "Фэшн" }
] as const;

export type ArtistWorldVisualBoardSlug = (typeof artistWorldVisualBoardDefinitions)[number]["slug"];

export type ArtistWorldInput = {
  identityStatement?: string | null;
  mission?: string | null;
  philosophy?: string | null;
  values?: string[];
  coreThemes?: string[];
  aestheticKeywords?: string[];
  visualDirection?: string | null;
  audienceCore?: string | null;
  differentiator?: string | null;
  fashionSignals?: string[];
  worldThemePreset?: ArtistWorldThemePreset | null;
  worldBackgroundMode?: ArtistWorldBackgroundMode | null;
  worldBackgroundColorA?: string | null;
  worldBackgroundColorB?: string | null;
  worldBackgroundImageUrl?: string | null;
  worldBlockOrder?: unknown;
  worldHiddenBlocks?: unknown;
  worldCreated?: boolean;
  artistName?: string | null;
  artistAge?: number | null;
  artistCity?: string | null;
  favoriteArtists?: string[];
  lifeValues?: string | null;
  teamPreference?: string | null;
  playlistUrl?: string | null;
  currentFocusTitle?: string | null;
  currentFocusDetail?: string | null;
  seekingSupportDetail?: string | null;
  supportNeedTypes?: ArtistSupportNeedType[];
  references?: ArtistWorldReferenceInput[];
  projects?: ArtistWorldProjectInput[];
  visualBoards?: ArtistWorldVisualBoardInput[];
};

export type ArtistWorldReadinessState = "EMPTY" | "SEEDED" | "IN_PROGRESS" | "READY_INTERNAL";

export type ArtistWorldReadinessArea = "text_core" | "visual_core" | "references" | "projects" | "playlist";

export type ArtistWorldReadinessMeta = {
  state: ArtistWorldReadinessState;
  score: number;
  completedAreas: ArtistWorldReadinessArea[];
  missingAreas: ArtistWorldReadinessArea[];
  nextSuggestedArea: ArtistWorldReadinessArea | null;
  summary: string;
  educationalCue: string;
  hasTextCore: boolean;
  hasVisualContent: boolean;
  worldCreated: boolean;
  counts: {
    references: number;
    projects: number;
    visualBoards: number;
  };
};

export type ArtistWorldJourneyGroupId = "meaning_core" | "music" | "visual";
export type ArtistWorldJourneyState = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE";
export type ArtistWorldJourneyGroupState = "LOCKED" | "AVAILABLE" | "COMPLETE";

export type ArtistWorldJourneyGroup = {
  id: ArtistWorldJourneyGroupId;
  title: string;
  description: string;
  state: ArtistWorldJourneyGroupState;
  completion: number;
  prompts: string[];
  recommendations: string[];
};

export type ArtistWorldJourneyMeta = {
  state: ArtistWorldJourneyState;
  completedCount: number;
  totalCount: number;
  currentGroupId: ArtistWorldJourneyGroupId;
  groups: ArtistWorldJourneyGroup[];
};

export type ArtistWorldApiResponseInput = {
  id?: string;
  safeId?: string;
  nickname?: string;
  avatarUrl?: string | null;
  links?: unknown;
  notificationsEnabled?: boolean;
  demosPrivate?: boolean;
  identityProfile?: ArtistWorldInput | null;
  artistWorldReferences?: Array<Record<string, unknown>>;
  artistWorldProjects?: Array<Record<string, unknown>>;
  artistWorldVisualBoards?: Array<{
    id: string;
    slug: string;
    name: string;
    sourceUrl: string | null;
    images: Array<{ id: string; imageUrl: string }>;
  }>;
};

// ─── Internal helpers ────────────────────────────────────────────────────────

function trimOrNull(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function uniqueStrings(values?: string[] | null) {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const items: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    items.push(normalized);
  }
  return items;
}

function normalizeBlockIds(value: unknown, fallback: ArtistWorldBlockId[] = defaultArtistWorldBlockOrder) {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const seen = new Set<ArtistWorldBlockId>();
  const normalized: ArtistWorldBlockId[] = [];

  for (const item of value) {
    if (typeof item !== "string") continue;
    if (!(artistWorldBlockIds as readonly string[]).includes(item)) continue;
    const blockId = item as ArtistWorldBlockId;
    if (seen.has(blockId)) continue;
    seen.add(blockId);
    normalized.push(blockId);
  }

  for (const blockId of defaultArtistWorldBlockOrder) {
    if (!seen.has(blockId)) {
      normalized.push(blockId);
    }
  }

  return normalized;
}

function normalizeHiddenBlockIds(value: unknown) {
  if (!Array.isArray(value)) return [];

  const seen = new Set<ArtistWorldBlockId>();
  const normalized: ArtistWorldBlockId[] = [];

  for (const item of value) {
    if (typeof item !== "string") continue;
    if (!(artistWorldBlockIds as readonly string[]).includes(item)) continue;
    const blockId = item as ArtistWorldBlockId;
    if (seen.has(blockId)) continue;
    seen.add(blockId);
    normalized.push(blockId);
  }

  return normalized;
}

function normalizeOptionalHex(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 32);
}

function normalizeArtistWorldProject(input: ArtistWorldProjectInput) {
  return {
    id: trimOrNull(input.id),
    title: trimOrNull(input.title),
    subtitle: trimOrNull(input.subtitle),
    description: trimOrNull(input.description),
    linkUrl: trimOrNull(input.linkUrl),
    coverImageUrl: trimOrNull(input.coverImageUrl)
  };
}

function normalizeArtistWorldReference(input: ArtistWorldReferenceInput) {
  return {
    id: trimOrNull(input.id),
    title: trimOrNull(input.title),
    creator: trimOrNull(input.creator),
    note: trimOrNull(input.note),
    linkUrl: trimOrNull(input.linkUrl),
    imageUrl: trimOrNull(input.imageUrl)
  };
}

function isCanonicalVisualBoardSlug(value: string): value is ArtistWorldVisualBoardSlug {
  return artistWorldVisualBoardDefinitions.some((board) => board.slug === value);
}

function normalizeVisualBoardImages(images?: Array<{ id?: string | null; imageUrl: string }>) {
  if (!Array.isArray(images)) return [];

  return images
    .map((image) => ({
      id: trimOrNull(image.id),
      imageUrl: image.imageUrl.trim()
    }))
    .filter((image) => image.imageUrl.length > 0);
}

export function ensureArtistWorldVisualBoards(
  boards?: ArtistWorldVisualBoardInput[] | null
): Array<{
  id: string | null;
  slug: ArtistWorldVisualBoardSlug;
  name: string;
  sourceUrl: string | null;
  images: Array<{ id: string | null; imageUrl: string }>;
}> {
  const items = Array.isArray(boards) ? boards : [];

  return artistWorldVisualBoardDefinitions.map((definition) => {
    const existing = items.find((board) => isCanonicalVisualBoardSlug(board.slug) && board.slug === definition.slug);

    return {
      id: trimOrNull(existing?.id),
      slug: definition.slug,
      name: definition.name,
      sourceUrl: trimOrNull(existing?.sourceUrl),
      images: normalizeVisualBoardImages(existing?.images)
    };
  });
}

function hasIdentityGroup(input: ArtistWorldInput | null | undefined) {
  return Boolean(trimOrNull(input?.identityStatement) || trimOrNull(input?.philosophy));
}

function hasIdentityContextGroup(input: ArtistWorldInput | null | undefined) {
  return Boolean(trimOrNull(input?.lifeValues) || uniqueStrings(input?.favoriteArtists).length > 0);
}

function hasThemesAudienceGroup(input: ArtistWorldInput | null | undefined) {
  return Boolean(
    uniqueStrings(input?.values).length > 0 ||
    uniqueStrings(input?.coreThemes).length > 0 ||
    trimOrNull(input?.audienceCore) ||
    trimOrNull(input?.differentiator)
  );
}

export function countArtistWorldTextCoreAnswers(input: ArtistWorldInput | null | undefined) {
  const groups = [hasIdentityGroup(input), hasIdentityContextGroup(input), hasThemesAudienceGroup(input)].filter(Boolean).length;

  return (trimOrNull(input?.mission) ? 1 : 0) + groups;
}

export function hasArtistWorldTextCore(input: ArtistWorldInput | null | undefined) {
  const missionReady = Boolean(trimOrNull(input?.mission));
  const supportingGroups = [hasIdentityGroup(input), hasIdentityContextGroup(input), hasThemesAudienceGroup(input)].filter(Boolean).length;

  return missionReady && supportingGroups >= 2;
}

export function hasArtistWorldVisualContent(input: ArtistWorldInput | null | undefined) {
  return ensureArtistWorldVisualBoards(input?.visualBoards).some((board) => board.images.length > 0 || Boolean(board.sourceUrl));
}

function hasArtistWorldReferences(input: ArtistWorldInput | null | undefined) {
  return Array.isArray(input?.references) && input.references.some((reference) =>
    Boolean(trimOrNull(reference.title) || trimOrNull(reference.creator) || trimOrNull(reference.note) || trimOrNull(reference.linkUrl) || trimOrNull(reference.imageUrl))
  );
}

function countArtistWorldReferences(input: ArtistWorldInput | null | undefined) {
  return Array.isArray(input?.references)
    ? input.references.filter((reference) =>
        Boolean(trimOrNull(reference.title) || trimOrNull(reference.creator) || trimOrNull(reference.note) || trimOrNull(reference.linkUrl) || trimOrNull(reference.imageUrl))
      ).length
    : 0;
}

function hasArtistWorldProjects(input: ArtistWorldInput | null | undefined) {
  return Array.isArray(input?.projects) && input.projects.some((project) =>
    Boolean(trimOrNull(project.title) || trimOrNull(project.subtitle) || trimOrNull(project.description) || trimOrNull(project.linkUrl) || trimOrNull(project.coverImageUrl))
  );
}

function countArtistWorldProjects(input: ArtistWorldInput | null | undefined) {
  return Array.isArray(input?.projects)
    ? input.projects.filter((project) =>
        Boolean(trimOrNull(project.title) || trimOrNull(project.subtitle) || trimOrNull(project.description) || trimOrNull(project.linkUrl) || trimOrNull(project.coverImageUrl))
      ).length
    : 0;
}

function hasArtistWorldPlaylist(input: ArtistWorldInput | null | undefined) {
  return Boolean(trimOrNull(input?.playlistUrl));
}

function getReadinessAreas(input: ArtistWorldInput | null | undefined): {
  completedAreas: ArtistWorldReadinessArea[];
  missingAreas: ArtistWorldReadinessArea[];
  nextSuggestedArea: ArtistWorldReadinessArea | null;
} {
  const completedAreas: ArtistWorldReadinessArea[] = [];
  const missingAreas: ArtistWorldReadinessArea[] = [];
  const candidates: ArtistWorldReadinessArea[] = ["text_core", "visual_core", "references", "projects", "playlist"];

  if (hasArtistWorldTextCore(input)) completedAreas.push("text_core");
  else missingAreas.push("text_core");

  if (hasArtistWorldVisualContent(input)) completedAreas.push("visual_core");
  else missingAreas.push("visual_core");

  if (hasArtistWorldReferences(input)) completedAreas.push("references");
  else missingAreas.push("references");

  if (hasArtistWorldProjects(input)) completedAreas.push("projects");
  else missingAreas.push("projects");

  if (hasArtistWorldPlaylist(input)) completedAreas.push("playlist");
  else missingAreas.push("playlist");

  const nextSuggestedArea = candidates.find((area) => !completedAreas.includes(area)) ?? null;

  return {
    completedAreas,
    missingAreas,
    nextSuggestedArea
  };
}

function buildReadinessCue(state: ArtistWorldReadinessState, nextSuggestedArea: ArtistWorldReadinessArea | null) {
  if (state === "EMPTY") {
    return "Сначала собери смысловую основу: миссию, identity statement и опорные ценности. Карьера артиста начинается не с песен, а с того, что он транслирует.";
  }

  if (nextSuggestedArea === "text_core") {
    return "Усилить нужно не только песни, но и то, что они выражают: миссию, образ и темы. Системная карьера начинается с ясного ядра.";
  }

  if (nextSuggestedArea === "visual_core") {
    return "Следующий системный слой - визуал и образ. Музыка становится карьерой, когда у нее есть узнаваемая форма и персонаж.";
  }

  if (nextSuggestedArea === "references") {
    return "Добавь референсы, чтобы закрепить язык и не строить образ вслепую.";
  }

  if (nextSuggestedArea === "projects") {
    return "Один живой проект превращает мир артиста из описания в действие.";
  }

  if (nextSuggestedArea === "playlist") {
    return "Плейлист референсов помогает удерживать вектор, но он работает лучше, когда уже есть смысл и визуальная опора.";
  }

  if (state === "READY_INTERNAL") {
    return "Мир артиста уже собран достаточно, чтобы использовать его как внутреннюю систему роста и опору для команды.";
  }

  return "Собирай мир артиста как систему: смысл, образ, аудитория, контент и действие должны читаться вместе.";
}

function hasJourneyMeaningCore(input: ArtistWorldInput | null | undefined) {
  return Boolean(
    trimOrNull(input?.mission) &&
      trimOrNull(input?.identityStatement) &&
      trimOrNull(input?.philosophy) &&
      uniqueStrings(input?.coreThemes).length > 0
  );
}

function hasJourneyMusicCore(input: ArtistWorldInput | null | undefined) {
  return Boolean(
    uniqueStrings(input?.favoriteArtists).length > 0 &&
      (trimOrNull(input?.playlistUrl) || trimOrNull(input?.currentFocusTitle) || trimOrNull(input?.differentiator))
  );
}

function hasJourneyVisualCore(input: ArtistWorldInput | null | undefined) {
  const hasBoards = ensureArtistWorldVisualBoards(input?.visualBoards).some(
    (board) => board.images.length > 0 || Boolean(trimOrNull(board.sourceUrl))
  );

  return Boolean(
    trimOrNull(input?.visualDirection) &&
      uniqueStrings(input?.aestheticKeywords).length > 0 &&
      uniqueStrings(input?.fashionSignals).length > 0 &&
      hasBoards
  );
}

function computeJourneyGroupCompletion(input: ArtistWorldInput | null | undefined, groupId: ArtistWorldJourneyGroupId) {
  switch (groupId) {
    case "meaning_core": {
      const parts = [
        Boolean(trimOrNull(input?.mission)),
        Boolean(trimOrNull(input?.identityStatement)),
        Boolean(trimOrNull(input?.philosophy)),
        uniqueStrings(input?.coreThemes).length > 0
      ];
      return Math.round((parts.filter(Boolean).length / parts.length) * 100);
    }
    case "music": {
      const parts = [
        uniqueStrings(input?.favoriteArtists).length > 0,
        Boolean(trimOrNull(input?.currentFocusTitle)),
        Boolean(trimOrNull(input?.playlistUrl) || trimOrNull(input?.differentiator))
      ];
      return Math.round((parts.filter(Boolean).length / parts.length) * 100);
    }
    case "visual": {
      const hasBoards = ensureArtistWorldVisualBoards(input?.visualBoards).some(
        (board) => board.images.length > 0 || Boolean(trimOrNull(board.sourceUrl))
      );
      const parts = [
        Boolean(trimOrNull(input?.visualDirection)),
        uniqueStrings(input?.aestheticKeywords).length > 0,
        uniqueStrings(input?.fashionSignals).length > 0,
        hasBoards
      ];
      return Math.round((parts.filter(Boolean).length / parts.length) * 100);
    }
  }
}

function inferVisualRecommendationTags(input: ArtistWorldInput | null | undefined) {
  const haystack = [
    trimOrNull(input?.mission),
    trimOrNull(input?.identityStatement),
    trimOrNull(input?.visualDirection),
    ...uniqueStrings(input?.coreThemes),
    ...uniqueStrings(input?.aestheticKeywords)
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const recommendations: string[] = [];

  if (/(ноч|dark|shadow|гранж|noir|дым)/.test(haystack)) {
    recommendations.push("Тёмный cinematic-набор: контровой свет, холодный металл, дым и плотные фактуры.");
  }
  if (/(свет|angel|air|dream|роман|нежн)/.test(haystack)) {
    recommendations.push("Воздушный editorial-набор: молочный свет, мягкий фокус, ткань, стекло и почти пустое пространство.");
  }
  if (/(улиц|street|raw|urban|бетон|город)/.test(haystack)) {
    recommendations.push("Raw street-язык: бетон, вспышка, типографика, хром и ощущение реального города.");
  }
  if (/(ритуал|миф|spirit|символ|архетип|культ)/.test(haystack)) {
    recommendations.push("Символический набор: ритуальные предметы, знаки, маски и повторяющиеся артефакты кадра.");
  }

  if (recommendations.length === 0) {
    recommendations.push("Собери три референса на атмосферу, три на фактуру и три на сценический силуэт, чтобы визуал не оставался абстракцией.");
  }

  return recommendations.slice(0, 3);
}

function buildJourneyPrompts(groupId: ArtistWorldJourneyGroupId) {
  switch (groupId) {
    case "meaning_core":
      return [
        "Что человек должен почувствовать после контакта с твоим миром?",
        "Какая внутренняя правда повторяется в твоих текстах, образах и поведении?",
        "Какие 3-5 тем ты готов защищать и повторять долго?"
      ];
    case "music":
      return [
        "На каких артистах и звуках держится твой вектор прямо сейчас?",
        "Что в твоей музыке должно звучать как только твоё?",
        "Какой музыкальный фокус ты собираешься докручивать в ближайший цикл?"
      ];
    case "visual":
      return [
        "Если убрать музыку, по каким образам тебя всё равно можно узнать?",
        "Какие фактуры, цвета и материалы ощущаются как твоя среда?",
        "Какой сценический силуэт должен читаться твоим без подписи?"
      ];
  }
}

function buildJourneyRecommendations(input: ArtistWorldInput | null | undefined, groupId: ArtistWorldJourneyGroupId) {
  switch (groupId) {
    case "meaning_core":
      return [
        "Пиши не биографию, а позицию: коротко, жёстко и без объяснения всего подряд.",
        "Философия работает лучше, когда в ней есть конфликт, а не только приятное настроение.",
        "Темы ядра должны повторяться в песнях, визуале и поведении, иначе мир не собирается."
      ];
    case "music":
      return [
        "Сохраняй не только референсы, но и фокус цикла: какой звук сейчас доводишь до своего состояния.",
        "Если плейлист ещё сырой, зафиксируй хотя бы один differentiator или current focus, чтобы музыка имела направление.",
        "Референсы должны объяснять язык, а не подменять твою идентичность."
      ];
    case "visual":
      return inferVisualRecommendationTags(input);
  }
}

export function getArtistWorldJourneyMeta(input: ArtistWorldInput | null | undefined): ArtistWorldJourneyMeta {
  const completionFlags: Array<{ id: ArtistWorldJourneyGroupId; complete: boolean }> = [
    { id: "meaning_core", complete: hasJourneyMeaningCore(input) },
    { id: "music", complete: hasJourneyMusicCore(input) },
    { id: "visual", complete: hasJourneyVisualCore(input) }
  ];
  const firstIncomplete = completionFlags.find((group) => !group.complete)?.id ?? "visual";
  const completedCount = completionFlags.filter((group) => group.complete).length;

  const groups: ArtistWorldJourneyGroup[] = completionFlags.map((group, index) => {
    const previousCompleted = completionFlags.slice(0, index).every((item) => item.complete);
    const state: ArtistWorldJourneyGroupState = group.complete
      ? "COMPLETE"
      : previousCompleted
        ? "AVAILABLE"
        : "LOCKED";

    return {
      id: group.id,
      title:
        group.id === "meaning_core"
          ? "Смысловое ядро"
          : group.id === "music"
            ? "Музыка"
            : "Визуал",
      description:
        group.id === "meaning_core"
          ? "Философия, миссия и повторяющиеся темы, на которых держится твой артистический смысл."
          : group.id === "music"
            ? "Референсы, текущее музыкальное направление и то, как ты называешь своё звучание."
            : "Фактуры, moodboard, fashion-сигналы и сценический образ, которые делают тебя читаемым.",
      state,
      completion: computeJourneyGroupCompletion(input, group.id),
      prompts: buildJourneyPrompts(group.id),
      recommendations: buildJourneyRecommendations(input, group.id)
    };
  });

  return {
    state: completedCount === 0 ? "NOT_STARTED" : completedCount === completionFlags.length ? "COMPLETE" : "IN_PROGRESS",
    completedCount,
    totalCount: completionFlags.length,
    currentGroupId: firstIncomplete,
    groups
  };
}

function computeReadinessState(input: ArtistWorldInput | null | undefined, completedAreas: ArtistWorldReadinessArea[]) {
  const hasTextCore = hasArtistWorldTextCore(input);
  const hasVisualContent = hasArtistWorldVisualContent(input);
  const worldCreated = Boolean(input?.worldCreated);

  if (!worldCreated && completedAreas.length === 0) {
    return "EMPTY" as const;
  }

  const hasSupportingArtifact = completedAreas.some((area) => area === "references" || area === "projects" || area === "playlist");
  if (hasTextCore && hasVisualContent && hasSupportingArtifact) {
    return "READY_INTERNAL" as const;
  }

  if (worldCreated && completedAreas.length <= 2) {
    return "SEEDED" as const;
  }

  return "IN_PROGRESS" as const;
}

export function getArtistWorldReadinessMeta(input: ArtistWorldInput | null | undefined): ArtistWorldReadinessMeta {
  const { completedAreas, missingAreas, nextSuggestedArea } = getReadinessAreas(input);
  const hasTextCore = hasArtistWorldTextCore(input);
  const hasVisualContent = hasArtistWorldVisualContent(input);
  const state = computeReadinessState(input, completedAreas);

  const score = Math.min(
    100,
    [
      Boolean(trimOrNull(input?.mission)) ? 24 : 0,
      Boolean(trimOrNull(input?.identityStatement)) ? 12 : 0,
      Boolean(trimOrNull(input?.philosophy)) ? 8 : 0,
      uniqueStrings(input?.values).length > 0 ? 8 : 0,
      uniqueStrings(input?.coreThemes).length > 0 ? 8 : 0,
      uniqueStrings(input?.aestheticKeywords).length > 0 ? 6 : 0,
      Boolean(trimOrNull(input?.visualDirection)) ? 6 : 0,
      Boolean(trimOrNull(input?.audienceCore)) ? 8 : 0,
      Boolean(trimOrNull(input?.differentiator)) ? 4 : 0,
      uniqueStrings(input?.fashionSignals).length > 0 ? 4 : 0,
      hasTextCore ? 8 : 0,
      hasVisualContent ? 10 : 0,
      hasArtistWorldReferences(input) ? 5 : 0,
      hasArtistWorldProjects(input) ? 5 : 0,
      hasArtistWorldPlaylist(input) ? 4 : 0,
      Boolean(input?.worldCreated) ? 10 : 0
    ].reduce((sum, value) => sum + value, 0)
  );

  return {
    state,
    score,
    completedAreas,
    missingAreas,
    nextSuggestedArea,
    summary:
      state === "READY_INTERNAL"
        ? "Мир артиста уже собран достаточно, чтобы работать как внутренняя система бренда и движения."
        : state === "SEEDED"
          ? "Мир артиста только посеян: основа есть, но система еще не собрана."
          : state === "IN_PROGRESS"
            ? "У мира артиста уже есть контекст, но ему еще не хватает целостности."
            : "Мир артиста еще не собран.",
    educationalCue: buildReadinessCue(state, nextSuggestedArea),
    hasTextCore,
    hasVisualContent,
    worldCreated: Boolean(input?.worldCreated),
    counts: {
      references: countArtistWorldReferences(input),
      projects: countArtistWorldProjects(input),
      visualBoards: ensureArtistWorldVisualBoards(input?.visualBoards).filter((board) => board.images.length > 0 || Boolean(board.sourceUrl)).length
    }
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function normalizeArtistWorldPayload(input: ArtistWorldInput) {
  return {
    identityStatement: trimOrNull(input.identityStatement),
    mission: trimOrNull(input.mission),
    philosophy: trimOrNull(input.philosophy),
    values: uniqueStrings(input.values),
    coreThemes: uniqueStrings(input.coreThemes),
    aestheticKeywords: uniqueStrings(input.aestheticKeywords),
    visualDirection: trimOrNull(input.visualDirection),
    audienceCore: trimOrNull(input.audienceCore),
    differentiator: trimOrNull(input.differentiator),
    fashionSignals: uniqueStrings(input.fashionSignals),
    worldThemePreset:
      input.worldThemePreset && artistWorldThemePresetOptions.includes(input.worldThemePreset)
        ? input.worldThemePreset
        : ArtistWorldThemePreset.EDITORIAL,
    worldBackgroundMode:
      input.worldBackgroundMode && artistWorldBackgroundModeOptions.includes(input.worldBackgroundMode)
        ? input.worldBackgroundMode
        : ArtistWorldBackgroundMode.GRADIENT,
    worldBackgroundColorA: normalizeOptionalHex(input.worldBackgroundColorA),
    worldBackgroundColorB: normalizeOptionalHex(input.worldBackgroundColorB),
    worldBackgroundImageUrl: trimOrNull(input.worldBackgroundImageUrl),
    worldBlockOrder: normalizeBlockIds(input.worldBlockOrder),
    worldHiddenBlocks: normalizeHiddenBlockIds(input.worldHiddenBlocks),
    worldCreated: input.worldCreated ?? false,
    artistName: trimOrNull(input.artistName),
    artistAge: typeof input.artistAge === "number" && input.artistAge >= 10 && input.artistAge <= 100 ? input.artistAge : null,
    artistCity: trimOrNull(input.artistCity),
    favoriteArtists: uniqueStrings(input.favoriteArtists).slice(0, 5),
    lifeValues: trimOrNull(input.lifeValues),
    teamPreference: input.teamPreference && ["solo", "team", "both"].includes(input.teamPreference) ? input.teamPreference : null,
    playlistUrl: trimOrNull(input.playlistUrl),
    currentFocusTitle: trimOrNull(input.currentFocusTitle),
    currentFocusDetail: trimOrNull(input.currentFocusDetail),
    seekingSupportDetail: trimOrNull(input.seekingSupportDetail),
    supportNeedTypes: Array.isArray(input.supportNeedTypes) ? [...new Set(input.supportNeedTypes)] : [],
    references: Array.isArray(input.references) ? input.references.map(normalizeArtistWorldReference) : [],
    projects: Array.isArray(input.projects) ? input.projects.map(normalizeArtistWorldProject) : [],
    visualBoards: ensureArtistWorldVisualBoards(input.visualBoards)
  };
}

export function serializeArtistWorld(profile: ArtistWorldInput | null) {
  const normalized = normalizeArtistWorldPayload(profile ?? {});
  return {
    identityStatement: normalized.identityStatement,
    mission: normalized.mission,
    philosophy: normalized.philosophy,
    values: normalized.values,
    coreThemes: normalized.coreThemes,
    aestheticKeywords: normalized.aestheticKeywords,
    visualDirection: normalized.visualDirection,
    audienceCore: normalized.audienceCore,
    differentiator: normalized.differentiator,
    fashionSignals: normalized.fashionSignals,
    themePreset: normalized.worldThemePreset,
    backgroundMode: normalized.worldBackgroundMode,
    backgroundColorA: normalized.worldBackgroundColorA,
    backgroundColorB: normalized.worldBackgroundColorB,
    backgroundImageUrl: normalized.worldBackgroundImageUrl,
    blockOrder: normalized.worldBlockOrder,
    hiddenBlocks: normalized.worldHiddenBlocks,
    worldCreated: normalized.worldCreated,
    artistName: normalized.artistName,
    artistAge: normalized.artistAge,
    artistCity: normalized.artistCity,
    favoriteArtists: normalized.favoriteArtists,
    lifeValues: normalized.lifeValues,
    teamPreference: normalized.teamPreference,
    playlistUrl: normalized.playlistUrl,
    currentFocusTitle: normalized.currentFocusTitle,
    currentFocusDetail: normalized.currentFocusDetail,
    seekingSupportDetail: normalized.seekingSupportDetail,
    supportNeedTypes: normalized.supportNeedTypes,
    references: normalized.references,
    projects: normalized.projects,
    visualBoards: normalized.visualBoards
  };
}

export function buildArtistWorldResponse(profile: ArtistWorldApiResponseInput) {
  const artistWorldVisualBoards = ensureArtistWorldVisualBoards(profile.artistWorldVisualBoards ?? []).map((board) => ({
    id: board.id ?? board.slug,
    slug: board.slug,
    name: board.name,
    sourceUrl: board.sourceUrl,
    images: board.images.map((image) => ({
      id: image.id ?? `${board.slug}-${image.imageUrl}`,
      imageUrl: image.imageUrl
    }))
  }));
  const artistWorld = serializeArtistWorld({
    ...(profile.identityProfile ?? {}),
    references: (profile.artistWorldReferences ?? []) as ArtistWorldReferenceInput[],
    projects: (profile.artistWorldProjects ?? []) as ArtistWorldProjectInput[],
    visualBoards: artistWorldVisualBoards
  });

  return {
    ...profile,
    artistWorldVisualBoards,
    artistWorld,
    artistWorldMeta: getArtistWorldReadinessMeta(artistWorld),
    artistWorldJourney: getArtistWorldJourneyMeta(artistWorld)
  };
}

export function splitTextareaList(value: string) {
  return uniqueStrings(
    value
      .split(/\r?\n|,/)
      .map((item) => capitalize(item.trim()))
      .filter(Boolean)
  );
}
