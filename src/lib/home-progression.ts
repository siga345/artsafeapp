import type { ArtistWorldInput } from "@/lib/artist-world";
import { getArtistWorldReadinessMeta } from "@/lib/artist-world";

export type ArtistWorldReadiness = "EMPTY" | "SEEDED" | "IN_PROGRESS" | "READY_INTERNAL";
export type PathReadiness = "IDENTITY" | "FOCUS" | "EXECUTION" | "REVIEW";
export type EntryMode = "WORLD_FIRST" | "PATH_FIRST" | "PATH_ACTIVE";

export type HomeProgressionInput = {
  artistWorld: (ArtistWorldInput & { worldCreated?: boolean }) | null | undefined;
  hasPrimaryGoal: boolean;
  hasTodayFocus: boolean;
  hasExecutionObjects: boolean;
  checkInExists: boolean;
  weeklyActiveDays: number;
  completedFocusCount: number;
};

export type HomeProgressionSignals = {
  worldReadiness: ArtistWorldReadiness;
  pathReadiness: PathReadiness;
  entryMode: EntryMode;
  recommendedNextRoute: "/id" | "/today";
  careerSystemHint: string;
  nextBestActionReason: string;
};

export type HomeOnboardingStepId =
  | "artist_world"
  | "career_system"
  | "path_focus"
  | "first_execution"
  | "review_loop";

export type HomeOnboardingStep = {
  id: HomeOnboardingStepId;
  title: string;
  description: string;
  href: "/id" | "/today" | "/songs" | "/find";
  completed: boolean;
};

export type HomeOnboardingState = {
  isVisible: boolean;
  dismissedAt: string | null;
  completedCount: number;
  totalCount: number;
  steps: HomeOnboardingStep[];
  nextStep: HomeOnboardingStep | null;
};

export function deriveArtistWorldReadiness(profile: HomeProgressionInput["artistWorld"]): ArtistWorldReadiness {
  return getArtistWorldReadinessMeta(profile).state;
}

export function derivePathReadiness(input: {
  worldReadiness: ArtistWorldReadiness;
  hasPrimaryGoal: boolean;
  hasTodayFocus: boolean;
  hasExecutionObjects: boolean;
  checkInExists: boolean;
  weeklyActiveDays: number;
  completedFocusCount: number;
}): PathReadiness {
  if (input.worldReadiness !== "READY_INTERNAL") return "IDENTITY";
  if (!input.hasPrimaryGoal) return "FOCUS";
  if (!input.hasTodayFocus || !input.hasExecutionObjects) return "EXECUTION";
  if (input.checkInExists || input.completedFocusCount > 0 || input.weeklyActiveDays > 0) return "REVIEW";
  return "EXECUTION";
}

export function deriveEntryMode(pathReadiness: PathReadiness, worldReadiness: ArtistWorldReadiness): EntryMode {
  if (worldReadiness !== "READY_INTERNAL") return "WORLD_FIRST";
  if (pathReadiness === "FOCUS") return "PATH_FIRST";
  return "PATH_ACTIVE";
}

export function deriveRecommendedNextRoute(entryMode: EntryMode): "/id" | "/today" {
  return entryMode === "WORLD_FIRST" ? "/id" : "/today";
}

export function buildCareerSystemHint(input: {
  worldReadiness: ArtistWorldReadiness;
  pathReadiness: PathReadiness;
  entryMode: EntryMode;
}) {
  if (input.entryMode === "WORLD_FIRST") {
    return "Сначала собери мир артиста: смысл, образ, контекст и аудитория делают музыку читаемой как карьеру, а не как набор песен.";
  }

  if (input.pathReadiness === "FOCUS") {
    return "Мир уже есть, теперь зафиксируй фокус периода. Карьера артиста строится системно: смысл и образ переходят в execution через ясный приоритет.";
  }

  if (input.pathReadiness === "EXECUTION") {
    return "Фокус уже выбран. Следующий шаг - перевести его в конкретный объект работы и не сводить карьеру только к песням.";
  }

  return "Система работает через фокус, execution и review. Держи ритм и не теряй связь между музыкой, образом, контентом и людьми.";
}

export function buildNextBestActionReason(input: {
  worldReadiness: ArtistWorldReadiness;
  pathReadiness: PathReadiness;
}) {
  if (input.worldReadiness !== "READY_INTERNAL") {
    return "Без собранного мира артиста путь распадается на отдельные задачи и не складывается в карьерную систему.";
  }

  if (input.pathReadiness === "FOCUS") {
    return "Сначала нужен фокус периода: без него execution превращается в случайные движения и лишние траты.";
  }

  if (input.pathReadiness === "EXECUTION") {
    return "Фокус уже есть, теперь его нужно закрепить в конкретном шаге, чтобы карьера стала видимой в действиях.";
  }

  return "Сейчас важнее удержать цикл и обновить review, чем добавлять новые сущности без опоры на текущий ритм.";
}

export function buildHomeProgressionSignals(input: HomeProgressionInput): HomeProgressionSignals {
  const worldReadiness = deriveArtistWorldReadiness(input.artistWorld);
  const pathReadiness = derivePathReadiness({
    worldReadiness,
    hasPrimaryGoal: input.hasPrimaryGoal,
    hasTodayFocus: input.hasTodayFocus,
    hasExecutionObjects: input.hasExecutionObjects,
    checkInExists: input.checkInExists,
    weeklyActiveDays: input.weeklyActiveDays,
    completedFocusCount: input.completedFocusCount
  });
  const entryMode = deriveEntryMode(pathReadiness, worldReadiness);

  return {
    worldReadiness,
    pathReadiness,
    entryMode,
    recommendedNextRoute: deriveRecommendedNextRoute(entryMode),
    careerSystemHint: buildCareerSystemHint({ worldReadiness, pathReadiness, entryMode }),
    nextBestActionReason: buildNextBestActionReason({ worldReadiness, pathReadiness })
  };
}

export function buildHomeOnboardingState(input: {
  worldReadiness: ArtistWorldReadiness;
  pathReadiness: PathReadiness;
  hasPrimaryGoal: boolean;
  hasExecutionObjects: boolean;
  checkInExists: boolean;
  dismissedAt: Date | null | undefined;
}): HomeOnboardingState {
  const steps: HomeOnboardingStep[] = [
    {
      id: "artist_world",
      title: "Собрать мир артиста",
      description: "Смысл, образ и контекст должны появиться раньше, чем система начнет требовать результат.",
      href: "/id",
      completed: input.worldReadiness === "READY_INTERNAL"
    },
    {
      id: "career_system",
      title: "Понять карьеру как систему",
      description: "Артист - это не только песни, а еще позиция, визуал, контент и движение людей за тобой.",
      href: "/id",
      completed: input.worldReadiness !== "EMPTY"
    },
    {
      id: "path_focus",
      title: "Зафиксировать фокус периода",
      description: "Сначала выбирается главный вектор цикла, и только потом execution начинает работать по-настоящему.",
      href: "/today",
      completed: input.hasPrimaryGoal && input.pathReadiness !== "IDENTITY"
    },
    {
      id: "first_execution",
      title: "Сделать первый опорный шаг",
      description: "Переведи фокус в конкретное действие, чтобы путь артиста стал видимым в реальности.",
      href: "/songs",
      completed: input.hasExecutionObjects
    },
    {
      id: "review_loop",
      title: "Закрепить review loop",
      description: "Проверь ритм, зафиксируй прогресс и обнови следующий шаг как часть системы, а не случайности.",
      href: "/today",
      completed: input.checkInExists || input.pathReadiness === "REVIEW"
    }
  ];

  const completedCount = steps.filter((step) => step.completed).length;
  const nextStep = steps.find((step) => !step.completed) ?? null;

  return {
    isVisible: input.worldReadiness !== "READY_INTERNAL" && !input.dismissedAt && completedCount < steps.length,
    dismissedAt: input.dismissedAt ? input.dismissedAt.toISOString() : null,
    completedCount,
    totalCount: steps.length,
    steps,
    nextStep
  };
}
