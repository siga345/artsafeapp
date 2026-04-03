import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.trim() || "demo@artsafehub.app";

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, safeId: true }
  });

  if (!user) {
    throw new Error(`User not found: ${email}`);
  }

  const before = await prisma.$transaction(async (tx) => {
    const [
      identityProfile,
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
      friendships,
      featuredCreator,
      onboarding,
      worldProjects,
      worldReferences,
      worldBoards
    ] = await Promise.all([
      tx.artistIdentityProfile.count({ where: { userId: user.id } }),
      tx.track.count({ where: { userId: user.id } }),
      tx.demo.count({ where: { track: { userId: user.id } } }),
      tx.project.count({ where: { userId: user.id } }),
      tx.folder.count({ where: { userId: user.id } }),
      tx.artistGoal.count({ where: { userId: user.id } }),
      tx.dailyCheckIn.count({ where: { userId: user.id } }),
      tx.dailyMicroStep.count({ where: { userId: user.id } }),
      tx.weeklyActivity.count({ where: { userId: user.id } }),
      tx.dailyTodo.count({ where: { userId: user.id } }),
      tx.communityPost.count({ where: { authorUserId: user.id } }),
      tx.communityAchievement.count({ where: { userId: user.id } }),
      tx.inAppRequest.count({
        where: {
          OR: [{ artistUserId: user.id }, { specialistUserId: user.id }]
        }
      }),
      tx.friendship.count({
        where: {
          OR: [{ requesterUserId: user.id }, { addresseeUserId: user.id }]
        }
      }),
      tx.featuredCreator.count({ where: { userId: user.id } }),
      tx.userOnboardingState.count({ where: { userId: user.id } }),
      tx.artistWorldProject.count({ where: { userId: user.id } }),
      tx.artistWorldReference.count({ where: { userId: user.id } }),
      tx.artistWorldVisualBoard.count({ where: { userId: user.id } })
    ]);

    return {
      identityProfile,
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
      friendships,
      featuredCreator,
      onboarding,
      worldProjects,
      worldReferences,
      worldBoards
    };
  });

  await prisma.$transaction(async (tx) => {
    const boardIds = (
      await tx.artistWorldVisualBoard.findMany({
        where: { userId: user.id },
        select: { id: true }
      })
    ).map((board) => board.id);

    if (boardIds.length > 0) {
      await tx.artistWorldVisualBoardImage.deleteMany({
        where: { boardId: { in: boardIds } }
      });
    }

    await tx.inAppRequestAction.deleteMany({
      where: { actorUserId: user.id }
    });
    await tx.communityLike.deleteMany({
      where: { userId: user.id }
    });
    await tx.communityEventAttendance.deleteMany({
      where: { userId: user.id }
    });
    await tx.featuredCreator.deleteMany({
      where: { userId: user.id }
    });
    await tx.friendship.deleteMany({
      where: {
        OR: [{ requesterUserId: user.id }, { addresseeUserId: user.id }]
      }
    });

    await tx.dailyWrapUp.deleteMany({
      where: { userId: user.id }
    });
    await tx.dailyTrackFocus.deleteMany({
      where: { userId: user.id }
    });
    await tx.dailyFocus.deleteMany({
      where: { userId: user.id }
    });
    await tx.dailyTodo.deleteMany({
      where: { userId: user.id }
    });
    await tx.dailyMicroStep.deleteMany({
      where: { userId: user.id }
    });
    await tx.dailyCheckIn.deleteMany({
      where: { userId: user.id }
    });
    await tx.weeklyActivity.deleteMany({
      where: { userId: user.id }
    });
    await tx.learnApplication.deleteMany({
      where: { userId: user.id }
    });
    await tx.learnMaterialProgress.deleteMany({
      where: { userId: user.id }
    });
    await tx.recommendationEvent.deleteMany({
      where: { userId: user.id }
    });
    await tx.trackDecision.deleteMany({
      where: { userId: user.id }
    });
    await tx.userOnboardingState.deleteMany({
      where: { userId: user.id }
    });

    await tx.feedbackResolution.deleteMany({
      where: { userId: user.id }
    });
    await tx.feedbackItem.deleteMany({
      where: { authorUserId: user.id }
    });
    await tx.communityFeedbackReply.deleteMany({
      where: { authorUserId: user.id }
    });
    await tx.communityFeedbackThread.deleteMany({
      where: { authorUserId: user.id }
    });
    await tx.feedbackRequest.deleteMany({
      where: {
        OR: [{ userId: user.id }, { recipientUserId: user.id }]
      }
    });
    await tx.communityPost.deleteMany({
      where: { authorUserId: user.id }
    });
    await tx.communityAchievement.deleteMany({
      where: { userId: user.id }
    });
    await tx.inAppRequest.deleteMany({
      where: {
        OR: [{ artistUserId: user.id }, { specialistUserId: user.id }]
      }
    });

    await tx.artistGoal.deleteMany({
      where: { userId: user.id }
    });
    await tx.track.deleteMany({
      where: { userId: user.id }
    });
    await tx.project.deleteMany({
      where: { userId: user.id }
    });
    await tx.folder.deleteMany({
      where: { userId: user.id }
    });

    await tx.artistWorldProject.deleteMany({
      where: { userId: user.id }
    });
    await tx.artistWorldReference.deleteMany({
      where: { userId: user.id }
    });
    await tx.artistWorldVisualBoard.deleteMany({
      where: { userId: user.id }
    });
    await tx.artistIdentityProfile.deleteMany({
      where: { userId: user.id }
    });

    await tx.user.update({
      where: { id: user.id },
      data: {
        nickname: "Demo Artist",
        avatarUrl: null,
        links: Prisma.DbNull,
        role: "ARTIST",
        notificationsEnabled: true,
        demosPrivate: true,
        pathStageId: null
      }
    });
  });

  const after = await prisma.$transaction(async (tx) => {
    const [
      identityProfile,
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
      friendships,
      featuredCreator,
      onboarding,
      worldProjects,
      worldReferences,
      worldBoards,
      currentUser
    ] = await Promise.all([
      tx.artistIdentityProfile.count({ where: { userId: user.id } }),
      tx.track.count({ where: { userId: user.id } }),
      tx.demo.count({ where: { track: { userId: user.id } } }),
      tx.project.count({ where: { userId: user.id } }),
      tx.folder.count({ where: { userId: user.id } }),
      tx.artistGoal.count({ where: { userId: user.id } }),
      tx.dailyCheckIn.count({ where: { userId: user.id } }),
      tx.dailyMicroStep.count({ where: { userId: user.id } }),
      tx.weeklyActivity.count({ where: { userId: user.id } }),
      tx.dailyTodo.count({ where: { userId: user.id } }),
      tx.communityPost.count({ where: { authorUserId: user.id } }),
      tx.communityAchievement.count({ where: { userId: user.id } }),
      tx.inAppRequest.count({
        where: {
          OR: [{ artistUserId: user.id }, { specialistUserId: user.id }]
        }
      }),
      tx.friendship.count({
        where: {
          OR: [{ requesterUserId: user.id }, { addresseeUserId: user.id }]
        }
      }),
      tx.featuredCreator.count({ where: { userId: user.id } }),
      tx.userOnboardingState.count({ where: { userId: user.id } }),
      tx.artistWorldProject.count({ where: { userId: user.id } }),
      tx.artistWorldReference.count({ where: { userId: user.id } }),
      tx.artistWorldVisualBoard.count({ where: { userId: user.id } }),
      tx.user.findUniqueOrThrow({
        where: { id: user.id },
        select: {
          nickname: true,
          avatarUrl: true,
          links: true,
          role: true,
          notificationsEnabled: true,
          demosPrivate: true,
          pathStageId: true
        }
      })
    ]);

    return {
      identityProfile,
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
      friendships,
      featuredCreator,
      onboarding,
      worldProjects,
      worldReferences,
      worldBoards,
      user: currentUser
    };
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        email: user.email,
        safeId: user.safeId,
        before,
        after
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
