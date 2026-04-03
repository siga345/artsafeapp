import type { GuideStatus, SurveyStatus, UserOnboardingState } from "@prisma/client";

export type GuideStepKey = "today" | "songs" | "find" | "id";

export type GuideStep = {
  id: GuideStepKey;
  route: "/today" | "/songs" | "/find" | "/id";
  target: string;
  title: string;
  body: string;
  accent: string;
};

export type EntryFlowState = {
  isLegacyUser: boolean;
  surveyStatus: SurveyStatus;
  guideStatus: GuideStatus;
  guideStepKey: GuideStepKey;
  entryFlowCompletedAt: string | null;
  dismissedAt: string | null;
  surveyDraft: EntrySurveyDraft | null;
};

export type EntrySurveyDraft = {
  name?: string;
  age?: number;
  nickname?: string;
  city?: string;
  favoriteArtists?: string[];
  lifeValues?: string;
  musicAspirations?: string;
  teamPreference?: "solo" | "team" | "both";
  currentStep?: number;
};

export const entryGuideSteps: GuideStep[] = [
  {
    id: "today",
    route: "/today",
    target: "guide-today-priority",
    title: "Главный экран пути",
    body: "Здесь собираются приоритеты, ритм и следующий системный шаг. После онбординга именно отсюда начинается движение.",
    accent: "Сегодня"
  },
  {
    id: "songs",
    route: "/songs",
    target: "guide-songs-panel",
    title: "Песни как рабочий контур",
    body: "Тут рождаются треки, статусы и проекты. Не только идеи, а реальная музыкальная работа в процессе.",
    accent: "Песни"
  },
  {
    id: "find",
    route: "/find",
    target: "guide-find-catalog",
    title: "Поиск людей и команды",
    body: "Здесь ищутся специалисты под конкретную задачу: от сведения до визуала. Карьера строится не в одиночку.",
    accent: "Поиск"
  },
  {
    id: "id",
    route: "/id",
    target: "guide-id-journey",
    title: "Мир артиста",
    body: "Смысл, музыка и визуал собираются здесь в одну систему. Это твой главный приоритет после регистрации.",
    accent: "Мир артиста"
  }
];

export const defaultGuideStepKey: GuideStepKey = entryGuideSteps[0].id;

export function getGuideStep(key?: string | null): GuideStep {
  return entryGuideSteps.find((step) => step.id === key) ?? entryGuideSteps[0];
}

export function getNextGuideStep(key: GuideStepKey) {
  const index = entryGuideSteps.findIndex((step) => step.id === key);
  if (index === -1) return null;
  return entryGuideSteps[index + 1] ?? null;
}

export function serializeSurveyDraft(value: unknown): EntrySurveyDraft | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const draft = value as Record<string, unknown>;
  const readString = (key: string) => (typeof draft[key] === "string" ? draft[key] : undefined);
  const readStringArray = (key: string) =>
    Array.isArray(draft[key]) ? draft[key].filter((item): item is string => typeof item === "string") : undefined;

  return {
    name: readString("name"),
    age: typeof draft.age === "number" ? draft.age : undefined,
    nickname: readString("nickname"),
    city: readString("city"),
    favoriteArtists: readStringArray("favoriteArtists"),
    lifeValues: readString("lifeValues"),
    musicAspirations: readString("musicAspirations"),
    teamPreference:
      draft.teamPreference === "solo" || draft.teamPreference === "team" || draft.teamPreference === "both"
        ? draft.teamPreference
        : undefined,
    currentStep: typeof draft.currentStep === "number" ? draft.currentStep : undefined
  };
}

export function buildEntryFlowState(onboarding: UserOnboardingState | null | undefined): EntryFlowState {
  if (!onboarding) {
    return {
      isLegacyUser: true,
      surveyStatus: "COMPLETED",
      guideStatus: "COMPLETED",
      guideStepKey: defaultGuideStepKey,
      entryFlowCompletedAt: null,
      dismissedAt: null,
      surveyDraft: null
    };
  }

  return {
    isLegacyUser: false,
    surveyStatus: onboarding.surveyStatus,
    guideStatus: onboarding.guideStatus,
    guideStepKey: getGuideStep(onboarding.guideStepKey).id,
    entryFlowCompletedAt: onboarding.entryFlowCompletedAt ? onboarding.entryFlowCompletedAt.toISOString() : null,
    dismissedAt: onboarding.dismissedAt ? onboarding.dismissedAt.toISOString() : null,
    surveyDraft: serializeSurveyDraft(onboarding.surveyDraft)
  };
}

export function shouldForceWelcome(state: EntryFlowState) {
  return !state.isLegacyUser && state.surveyStatus !== "COMPLETED";
}

export function shouldRunGuide(state: EntryFlowState) {
  return !state.isLegacyUser && state.surveyStatus === "COMPLETED" && !["SKIPPED", "COMPLETED"].includes(state.guideStatus);
}

export function getEntryRedirectPath(state: EntryFlowState): "/welcome" | "/today" | null {
  if (state.isLegacyUser) return null;
  if (state.surveyStatus !== "COMPLETED") return "/welcome";
  return "/today";
}
