import { redirect } from "next/navigation";

import { buildHomeProgressionSignals } from "@/lib/home-progression";
import { getIdentityProfile } from "@/lib/artist-growth";
import { buildEntryFlowState, getEntryRedirectPath } from "@/lib/entry-flow";
import { prisma } from "@/lib/prisma";
import { getFreshSessionUser } from "@/lib/server-auth";

function toDateOnly(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export default async function Home() {
  const user = await getFreshSessionUser();
  if (!user) {
    redirect("/signin");
  }

  const onboardingState = await prisma.userOnboardingState.findUnique({
    where: { userId: user.id }
  });
  const entryFlowState = buildEntryFlowState(onboardingState);
  const entryRedirectPath = getEntryRedirectPath(entryFlowState);

  if (entryRedirectPath) {
    redirect(entryRedirectPath);
  }

  const today = toDateOnly(new Date());
  const weekStartDate = new Date(today);
  const dayOfWeek = today.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  weekStartDate.setUTCDate(today.getUTCDate() + mondayOffset);

  const [identityProfile, primaryGoal, checkIn, weeklyActivity, trackCount, projectCount, requestCount, completedFocusCount] =
    await Promise.all([
      getIdentityProfile(prisma, user.id),
      prisma.artistGoal.findFirst({
        where: {
          userId: user.id,
          status: "ACTIVE",
          isPrimary: true
        },
        select: { id: true }
      }),
      prisma.dailyCheckIn.findUnique({
        where: { userId_date: { userId: user.id, date: today } },
        select: { id: true }
      }),
      prisma.weeklyActivity.findUnique({
        where: { userId_weekStartDate: { userId: user.id, weekStartDate } },
        select: { activeDays: true }
      }),
      prisma.track.count({
        where: { userId: user.id }
      }),
      prisma.project.count({
        where: { userId: user.id }
      }),
      prisma.inAppRequest.count({
        where: { artistUserId: user.id }
      }),
      prisma.dailyFocus.count({
        where: {
          userId: user.id,
          isCompleted: true,
          date: {
            gte: weekStartDate,
            lte: today
          }
        }
      })
    ]);

  const progression = buildHomeProgressionSignals({
    artistWorld: identityProfile,
    hasPrimaryGoal: Boolean(primaryGoal),
    hasTodayFocus: Boolean(primaryGoal),
    hasExecutionObjects: trackCount + projectCount + requestCount > 0,
    checkInExists: Boolean(checkIn),
    weeklyActiveDays: Math.max(0, Math.min(7, weeklyActivity?.activeDays ?? 0)),
    completedFocusCount
  });

  redirect(progression.recommendedNextRoute);
}
