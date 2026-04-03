import { NextResponse } from "next/server";

import { withApiHandler } from "@/lib/api";
import {
  buildDiagnostics,
  ensureTodayFocus,
  getGoalTrajectoryReview,
  getArtistWorldJourneyMeta,
  goalDetailInclude,
  getIdentityProfile,
  getWeekStart as getCommandCenterWeekStart,
  serializePrimaryGoalSummary,
  serializeTodayFocus
} from "@/lib/artist-growth";
import { getDayLoopOverview } from "@/lib/day-loop";
import { buildRhythmOverview, getHomeRhythmWindowStart, serializeDailyTodo } from "@/lib/home-today";
import {
  canonicalizePathStage,
  getCanonicalPathStageLabel,
  getLatestPhase1PathStageLabel,
  getPhase1PathStageLabel
} from "@/lib/path-stages";
import {
  buildHomeOnboardingState,
  buildHomeProgressionSignals
} from "@/lib/home-progression";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function toDateOnly(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function getWeekStart(dateOnly: Date) {
  const dayOfWeek = dateOnly.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStartDate = new Date(dateOnly);
  weekStartDate.setUTCDate(dateOnly.getUTCDate() + mondayOffset);
  return weekStartDate;
}

const defaultStage = getCanonicalPathStageLabel(1);

const stageFallback = {
  id: 0,
  order: 1,
  name: defaultStage?.name ?? "Искра",
  iconKey: defaultStage?.iconKey ?? "spark",
  description: defaultStage?.description ?? "Творческий порыв"
};

async function getCommandCenterDataSafe(input: {
  userId: string;
  today: Date;
  checkInExists: boolean;
  weeklyActiveDays: number;
  trackCount: number;
  projectCount: number;
  requestCount: number;
}) {
  const weekStartDate = getCommandCenterWeekStart(input.today);
  const [identityProfile, activeGoals, completedFocusCount] = await Promise.all([
    getIdentityProfile(prisma, input.userId),
    prisma.artistGoal.findMany({
      where: {
        userId: input.userId,
        status: "ACTIVE"
      },
      include: goalDetailInclude,
      orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }]
    }),
    prisma.dailyFocus.count({
      where: {
        userId: input.userId,
        isCompleted: true,
        date: {
          gte: weekStartDate,
          lte: input.today
        }
      }
    })
  ]);
  const featuredGoal = activeGoals[0] ?? null;

  const trajectoryEntries = await Promise.all(
    activeGoals.map(async (goal) => ({
      goalId: goal.id,
      trajectoryReview: await getGoalTrajectoryReview(prisma, input.userId, goal, input.today)
    }))
  );
  const trajectoryByGoalId = new Map(trajectoryEntries.map((item) => [item.goalId, item.trajectoryReview]));

  const todayFocus = featuredGoal ? await ensureTodayFocus(prisma, input.userId, input.today, featuredGoal) : null;
  const trajectoryReview = featuredGoal ? trajectoryByGoalId.get(featuredGoal.id) ?? null : null;
  const diagnostics = buildDiagnostics({
    goal: featuredGoal,
    trajectoryReview,
    identityProfile,
    weeklyActiveDays: input.weeklyActiveDays,
    hasCheckIn: input.checkInExists,
    completedFocusCount,
    requestCount: input.requestCount,
    trackCount: input.trackCount,
    projectCount: input.projectCount
  });
  const biggestRisk = diagnostics.find((item) => item.state !== "STRONG") ?? diagnostics[0] ?? null;
  const activeProjects = activeGoals
    .map((goal) =>
      serializePrimaryGoalSummary(goal, identityProfile, {
        trajectoryReview: trajectoryByGoalId.get(goal.id) ?? null
      })
    )
    .filter((project): project is NonNullable<typeof project> => Boolean(project));
  const featuredProject = activeProjects[0] ?? null;
  const recommendedStart = serializeTodayFocus(featuredGoal, identityProfile, todayFocus, {
    trajectoryReview
  });
  const gapHighlights = activeProjects
    .map((project) => ({
      key: `gap:${project.id}`,
      projectId: project.id,
      projectTitle: project.title,
      projectLabel: project.projectLabel,
      state: project.gapSummary.state,
      title: project.gapSummary.title,
      message: project.gapSummary.message,
      recommendation: project.gapSummary.recommendation
    }))
    .slice(0, 5);
  const recommendations = [
    recommendedStart?.recommendation ?? null,
    ...activeProjects.flatMap((project) => project.recommendations)
  ]
    .filter(Boolean)
    .filter((item, index, items) => items.findIndex((candidate) => candidate?.key === item?.key) === index)
    .slice(0, 6);

  return {
    completedFocusCount,
    position: {
      biggestRisk
    },
    activeProjects,
    featuredProject,
    gapHighlights,
    recommendations,
    recommendedStart,
    primaryGoal: featuredProject,
    todayFocus: recommendedStart,
    diagnostics
  };
}

function buildCommandCenterFallback() {
  return {
    position: {
      biggestRisk: null
    },
    activeProjects: [],
    featuredProject: null,
    gapHighlights: [],
    recommendations: [],
    recommendedStart: null,
    primaryGoal: null,
    todayFocus: null,
    diagnostics: [],
    completedFocusCount: 0
  };
}

export const GET = withApiHandler(async () => {
  const user = await requireUser();
  const today = toDateOnly(new Date());
  const weekStartDate = getWeekStart(today);
  const rhythmWindowStart = getHomeRhythmWindowStart(today);

  const currentUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      nickname: true,
      links: true,
      identityProfile: true,
      pathStage: true,
      artistWorldVisualBoards: {
        orderBy: [{ sortIndex: "asc" }],
        include: {
          images: {
            orderBy: [{ sortIndex: "asc" }, { createdAt: "asc" }]
          }
        }
      }
    }
  });

  const currentStage = currentUser?.pathStage ? canonicalizePathStage(currentUser.pathStage) : stageFallback;
  const phase1StageLabel = getPhase1PathStageLabel(currentStage.order) ?? getLatestPhase1PathStageLabel();

  const [
    checkIn,
    microStep,
    dailyTodo,
    weeklyActivity,
    onboardingState,
    trackCount,
    demoCount,
    projectCount,
    requestCount,
    dayLoopResult,
    rhythmMicroSteps,
    rhythmDailyTodos
  ] = await Promise.all([
    prisma.dailyCheckIn.findUnique({
      where: { userId_date: { userId: user.id, date: today } }
    }),
    prisma.dailyMicroStep.findUnique({
      where: { userId_date: { userId: user.id, date: today } }
    }),
    prisma.dailyTodo.findUnique({
      where: { userId_date: { userId: user.id, date: today } }
    }),
    prisma.weeklyActivity.findUnique({
      where: { userId_weekStartDate: { userId: user.id, weekStartDate } }
    }),
    prisma.userOnboardingState.findUnique({ where: { userId: user.id } }),
    prisma.track.count({
      where: { userId: user.id }
    }),
    prisma.demo.count({
      where: { track: { userId: user.id } }
    }),
    prisma.project.count({
      where: { userId: user.id }
    }),
    prisma.inAppRequest.count({ where: { artistUserId: user.id } }),
    getDayLoopOverview(prisma, user.id, today).then(
      (value) => ({ status: "fulfilled" as const, value }),
      (error) => ({ status: "rejected" as const, reason: error })
    ),
    prisma.dailyMicroStep.findMany({
      where: {
        userId: user.id,
        date: {
          gte: rhythmWindowStart,
          lte: today
        }
      },
      select: {
        date: true,
        isCompleted: true
      }
    }),
    prisma.dailyTodo.findMany({
      where: {
        userId: user.id,
        date: {
          gte: rhythmWindowStart,
          lte: today
        }
      },
      select: {
        date: true,
        items: true
      }
    })
  ]);

  const weeklyActiveDays = Math.max(0, Math.min(7, weeklyActivity?.activeDays ?? 0));
  const serializedDailyTodo = serializeDailyTodo(today, dailyTodo?.items ?? []);
  const rhythm = buildRhythmOverview({
    today,
    microSteps: rhythmMicroSteps,
    dailyTodos: rhythmDailyTodos
  });
  const [commandCenterResult] = await Promise.allSettled([
    getCommandCenterDataSafe({
      userId: user.id,
      today,
      checkInExists: Boolean(checkIn),
      weeklyActiveDays,
      trackCount,
      projectCount,
      requestCount
    })
  ]);
  const commandCenter =
    commandCenterResult.status === "fulfilled" ? commandCenterResult.value : buildCommandCenterFallback();
  const dayLoop = dayLoopResult.status === "fulfilled" ? dayLoopResult.value : null;
  const hasExecutionObjects = trackCount + projectCount + requestCount > 0;
  const progression = buildHomeProgressionSignals({
    artistWorld: currentUser?.identityProfile,
    hasPrimaryGoal: Boolean(commandCenter.primaryGoal),
    hasTodayFocus: Boolean(commandCenter.todayFocus),
    hasExecutionObjects,
    checkInExists: Boolean(checkIn),
    weeklyActiveDays,
    completedFocusCount: commandCenter.completedFocusCount ?? 0
  });
  const onboarding = buildHomeOnboardingState({
    worldReadiness: progression.worldReadiness,
    pathReadiness: progression.pathReadiness,
    hasPrimaryGoal: Boolean(commandCenter.primaryGoal),
    hasExecutionObjects,
    checkInExists: Boolean(checkIn),
    dismissedAt: onboardingState?.dismissedAt
  });
  const artistWorldJourney = getArtistWorldJourneyMeta({
    ...(currentUser?.identityProfile ?? {}),
    visualBoards: currentUser?.artistWorldVisualBoards ?? []
  });
  const priorityTask =
    artistWorldJourney.state !== "COMPLETE"
      ? {
          title: "Любой путь артиста начинается с понимания себя",
          body: "Сейчас главный системный шаг - собрать Мир артиста последовательно: смысл, музыка и визуал.",
          ctaLabel:
            artistWorldJourney.state === "NOT_STARTED" ? "Создать Мир артиста" : "Продолжить Мир артиста",
          href: "/id" as const,
          groupTitle:
            artistWorldJourney.groups.find((group) => group.id === artistWorldJourney.currentGroupId)?.title ?? "Мир артиста"
        }
      : null;

  return NextResponse.json({
    today: today.toISOString(),
    stage: currentStage,
    phase1Stage: phase1StageLabel
      ? {
          ...currentStage,
          ...phase1StageLabel
        }
      : null,
    checkIn,
    microStep,
    dailyTodo: serializedDailyTodo,
    rhythm,
    onboarding,
    worldReadiness: progression.worldReadiness,
    pathReadiness: progression.pathReadiness,
    entryMode: progression.entryMode,
    recommendedNextRoute: progression.recommendedNextRoute,
    careerSystemHint: progression.careerSystemHint,
    nextBestActionReason: progression.nextBestActionReason,
    artistWorldJourney,
    priorityTask,
    commandCenter,
    dayLoop
  });
});
