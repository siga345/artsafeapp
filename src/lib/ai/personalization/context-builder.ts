import { prisma } from "@/lib/prisma";
import type {
  ArtistContext,
  ArtistContextGoal,
  ArtistContextTrack,
  ArtistContextCheckIn,
  ArtistContextLearnProgress,
  ArtistContextEvent,
} from "./types";

const RECENT_CHECKINS_LIMIT = 7;
const RECENT_TRACKS_LIMIT = 10;
const UPCOMING_EVENTS_LIMIT = 5;
const LEARN_PROGRESS_LIMIT = 20;

export async function buildArtistContext(userId: string): Promise<ArtistContext> {
  const [user, recentCheckIns, tracks, learnProgress, upcomingEvents] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        nickname: true,
        pathStage: {
          select: { id: true, order: true, name: true, description: true },
        },
        identityProfile: {
          select: {
            identityStatement: true,
            mission: true,
            aestheticKeywords: true,
            coreThemes: true,
            audienceCore: true,
            artistCity: true,
            favoriteArtists: true,
          },
        },
        goals: {
          where: { status: "ACTIVE" },
          orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }],
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
            isPrimary: true,
            targetDate: true,
            whyNow: true,
            pillars: {
              select: {
                factor: true,
                tasks: {
                  where: { status: { not: "DONE" } },
                  orderBy: [{ priority: "asc" }, { sortIndex: "asc" }],
                  take: 5,
                  select: {
                    id: true,
                    title: true,
                    description: true,
                    status: true,
                    priority: true,
                  },
                },
              },
            },
          },
        },
      },
    }),

    prisma.dailyCheckIn.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: RECENT_CHECKINS_LIMIT,
      select: { date: true, mood: true, note: true },
    }),

    prisma.track.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: RECENT_TRACKS_LIMIT,
      select: {
        id: true,
        title: true,
        workbenchState: true,
        primaryDemoId: true,
        updatedAt: true,
      },
    }),

    prisma.learnMaterialProgress.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: LEARN_PROGRESS_LIMIT,
      select: { materialKey: true, status: true },
    }),

    prisma.communityEvent.findMany({
      where: {
        status: "PUBLISHED",
        startsAt: { gte: new Date() },
      },
      orderBy: { startsAt: "asc" },
      take: UPCOMING_EVENTS_LIMIT,
      select: { id: true, title: true, startsAt: true, isOnline: true, city: true },
    }),
  ]);

  const goals: ArtistContextGoal[] = user.goals.map((goal) => ({
    id: goal.id,
    title: goal.title,
    type: goal.type,
    status: goal.status,
    isPrimary: goal.isPrimary,
    targetDate: goal.targetDate ? goal.targetDate.toISOString().split("T")[0] : null,
    whyNow: goal.whyNow,
    tasks: goal.pillars.flatMap((pillar) =>
      pillar.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        pillarFactor: pillar.factor,
      }))
    ),
  }));

  const tracksResult: ArtistContextTrack[] = tracks.map((track) => ({
    id: track.id,
    title: track.title,
    workbenchState: track.workbenchState,
    hasDemo: track.primaryDemoId !== null,
    updatedAt: track.updatedAt.toISOString(),
  }));

  const checkInsResult: ArtistContextCheckIn[] = recentCheckIns.map((ci) => ({
    date: ci.date.toISOString().split("T")[0],
    mood: ci.mood,
    note: ci.note,
  }));

  const learnResult: ArtistContextLearnProgress[] = learnProgress.map((lp) => ({
    materialKey: lp.materialKey,
    status: lp.status,
  }));

  const eventsResult: ArtistContextEvent[] = upcomingEvents.map((ev) => ({
    id: ev.id,
    title: ev.title,
    startsAt: ev.startsAt.toISOString(),
    isOnline: ev.isOnline,
    city: ev.city,
  }));

  const ip = user.identityProfile;

  return {
    userId: user.id,
    nickname: user.nickname,
    pathStage: user.pathStage
      ? {
          id: user.pathStage.id,
          order: user.pathStage.order,
          name: user.pathStage.name,
          description: user.pathStage.description,
        }
      : null,
    identityStatement: ip?.identityStatement ?? null,
    mission: ip?.mission ?? null,
    aestheticKeywords: ip?.aestheticKeywords ?? [],
    coreThemes: ip?.coreThemes ?? [],
    audienceCore: ip?.audienceCore ?? null,
    artistCity: ip?.artistCity ?? null,
    favoriteArtists: ip?.favoriteArtists ?? [],
    goals,
    tracks: tracksResult,
    totalTracksCount: tracksResult.length,
    recentCheckIns: checkInsResult,
    learnProgress: learnResult,
    upcomingEvents: eventsResult,
  };
}

export function formatContextAsPrompt(ctx: ArtistContext): string {
  const lines: string[] = [];

  lines.push(`Артист: ${ctx.nickname}`);
  lines.push(`Этап пути: ${ctx.pathStage ? `${ctx.pathStage.name} (уровень ${ctx.pathStage.order})` : "не задан"}`);

  if (ctx.identityStatement) lines.push(`Самопозиционирование: ${ctx.identityStatement}`);
  if (ctx.mission) lines.push(`Миссия: ${ctx.mission}`);
  if (ctx.audienceCore) lines.push(`Аудитория: ${ctx.audienceCore}`);
  if (ctx.artistCity) lines.push(`Город: ${ctx.artistCity}`);
  if (ctx.aestheticKeywords.length > 0) lines.push(`Эстетика: ${ctx.aestheticKeywords.join(", ")}`);
  if (ctx.coreThemes.length > 0) lines.push(`Темы: ${ctx.coreThemes.join(", ")}`);
  if (ctx.favoriteArtists.length > 0) lines.push(`Референсные артисты: ${ctx.favoriteArtists.join(", ")}`);

  lines.push(`\nТреки: всего ${ctx.totalTracksCount}`);
  for (const t of ctx.tracks.slice(0, 5)) {
    lines.push(`  - "${t.title}" [${t.workbenchState}]${t.hasDemo ? " (есть демо)" : ""}`);
  }

  if (ctx.goals.length > 0) {
    lines.push("\nАктивные цели:");
    for (const g of ctx.goals) {
      lines.push(`  - ${g.title} (${g.type})${g.isPrimary ? " [основная]" : ""}`);
      const pendingTasks = g.tasks.filter((t) => t.status !== "DONE").slice(0, 3);
      for (const t of pendingTasks) {
        lines.push(`    • [${t.priority}] ${t.title}`);
      }
    }
  }

  if (ctx.recentCheckIns.length > 0) {
    const moods = ctx.recentCheckIns.map((c) => c.mood).join(", ");
    lines.push(`\nНастроение последних дней: ${moods}`);
  }

  if (ctx.upcomingEvents.length > 0) {
    lines.push("\nПредстоящие события:");
    for (const ev of ctx.upcomingEvents) {
      lines.push(`  - ${ev.title} (${ev.isOnline ? "онлайн" : ev.city ?? "офлайн"}, ${new Date(ev.startsAt).toLocaleDateString("ru-RU")})`);
    }
  }

  const appliedMaterials = ctx.learnProgress.filter((lp) => lp.status === "APPLIED").length;
  if (appliedMaterials > 0) {
    lines.push(`\nПрименено материалов из Learn: ${appliedMaterials}`);
  }

  return lines.join("\n");
}
