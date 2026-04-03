import { Prisma, PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

function defaultNicknameForRole(role: UserRole) {
  switch (role) {
    case "SPECIALIST":
      return "Новый специалист";
    case "STUDIO":
      return "Новая студия";
    case "ARTIST":
    default:
      return "Новый артист";
  }
}

async function collectCounts() {
  const [
    users,
    specialistProfiles,
    identityProfiles,
    worldProjects,
    worldReferences,
    worldBoards,
    tracks,
    demos,
    projects,
    folders,
    goals,
    checkIns,
    microSteps,
    weeklyActivities,
    dailyTodos,
    posts,
    achievements,
    requests,
    requestActions,
    friendships,
    featuredCreators,
    onboardingStates,
    feedbackRequests,
    feedbackThreads,
    feedbackReplies,
    feedbackItems,
    feedbackResolutions,
    communityEvents,
    communityAttendance,
    learnApplications,
    learnProgress,
    recommendationEvents,
    trackDecisions
  ] = await Promise.all([
    prisma.user.count(),
    prisma.specialistProfile.count(),
    prisma.artistIdentityProfile.count(),
    prisma.artistWorldProject.count(),
    prisma.artistWorldReference.count(),
    prisma.artistWorldVisualBoard.count(),
    prisma.track.count(),
    prisma.demo.count(),
    prisma.project.count(),
    prisma.folder.count(),
    prisma.artistGoal.count(),
    prisma.dailyCheckIn.count(),
    prisma.dailyMicroStep.count(),
    prisma.weeklyActivity.count(),
    prisma.dailyTodo.count(),
    prisma.communityPost.count(),
    prisma.communityAchievement.count(),
    prisma.inAppRequest.count(),
    prisma.inAppRequestAction.count(),
    prisma.friendship.count(),
    prisma.featuredCreator.count(),
    prisma.userOnboardingState.count(),
    prisma.feedbackRequest.count(),
    prisma.communityFeedbackThread.count(),
    prisma.communityFeedbackReply.count(),
    prisma.feedbackItem.count(),
    prisma.feedbackResolution.count(),
    prisma.communityEvent.count(),
    prisma.communityEventAttendance.count(),
    prisma.learnApplication.count(),
    prisma.learnMaterialProgress.count(),
    prisma.recommendationEvent.count(),
    prisma.trackDecision.count()
  ]);

  return {
    users,
    specialistProfiles,
    identityProfiles,
    worldProjects,
    worldReferences,
    worldBoards,
    tracks,
    demos,
    projects,
    folders,
    goals,
    checkIns,
    microSteps,
    weeklyActivities,
    dailyTodos,
    posts,
    achievements,
    requests,
    requestActions,
    friendships,
    featuredCreators,
    onboardingStates,
    feedbackRequests,
    feedbackThreads,
    feedbackReplies,
    feedbackItems,
    feedbackResolutions,
    communityEvents,
    communityAttendance,
    learnApplications,
    learnProgress,
    recommendationEvents,
    trackDecisions
  };
}

async function main() {
  const before = await collectCounts();
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  await prisma.$transaction(async (tx) => {
    const boardIds = (
      await tx.artistWorldVisualBoard.findMany({
        select: { id: true }
      })
    ).map((board) => board.id);

    if (boardIds.length > 0) {
      await tx.artistWorldVisualBoardImage.deleteMany({
        where: { boardId: { in: boardIds } }
      });
    }

    await tx.inAppRequestAction.deleteMany();
    await tx.communityLike.deleteMany();
    await tx.communityEventAttendance.deleteMany();
    await tx.featuredCreator.deleteMany();
    await tx.friendship.deleteMany();

    await tx.dailyWrapUp.deleteMany();
    await tx.dailyTrackFocus.deleteMany();
    await tx.dailyFocus.deleteMany();
    await tx.dailyTodo.deleteMany();
    await tx.dailyMicroStep.deleteMany();
    await tx.dailyCheckIn.deleteMany();
    await tx.weeklyActivity.deleteMany();
    await tx.learnApplication.deleteMany();
    await tx.learnMaterialProgress.deleteMany();
    await tx.recommendationEvent.deleteMany();
    await tx.trackDecision.deleteMany();
    await tx.userOnboardingState.deleteMany();

    await tx.feedbackResolution.deleteMany();
    await tx.feedbackItem.deleteMany();
    await tx.communityFeedbackReply.deleteMany();
    await tx.communityFeedbackThread.deleteMany();
    await tx.feedbackRequest.deleteMany();
    await tx.communityPost.deleteMany();
    await tx.communityAchievement.deleteMany();
    await tx.communityEvent.deleteMany();
    await tx.inAppRequest.deleteMany();

    await tx.artistGoal.deleteMany();
    await tx.track.deleteMany();
    await tx.project.deleteMany();
    await tx.folder.deleteMany();

    await tx.artistWorldProject.deleteMany();
    await tx.artistWorldReference.deleteMany();
    await tx.artistWorldVisualBoard.deleteMany();
    await tx.artistIdentityProfile.deleteMany();
    await tx.specialistProfile.deleteMany();

    for (const user of users) {
      await tx.user.update({
        where: { id: user.id },
        data: {
          nickname: defaultNicknameForRole(user.role),
          avatarUrl: null,
          links: Prisma.DbNull,
          notificationsEnabled: true,
          demosPrivate: true,
          pathStageId: null
        }
      });
    }
  });

  const after = await collectCounts();
  const userSnapshot = await prisma.user.findMany({
    select: {
      email: true,
      role: true,
      nickname: true,
      avatarUrl: true,
      links: true,
      pathStageId: true
    },
    orderBy: {
      email: "asc"
    }
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        before,
        after,
        users: userSnapshot
      },
      null,
      2
    )
  );
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
