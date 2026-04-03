import { NextResponse } from "next/server";
import { z } from "zod";

import { parseJsonBody, withApiHandler } from "@/lib/api";
import { buildEntryFlowState, defaultGuideStepKey, getGuideStep } from "@/lib/entry-flow";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const onboardingActionSchema = z.object({
  action: z.enum(["START_GUIDE", "SET_GUIDE_STEP", "SKIP_GUIDE", "COMPLETE_GUIDE", "RESTART_GUIDE"]),
  guideStepKey: z.enum(["today", "songs", "find", "id"]).optional()
});

export const GET = withApiHandler(async () => {
  const user = await requireUser();
  const onboarding = await prisma.userOnboardingState.findUnique({
    where: { userId: user.id }
  });

  return NextResponse.json(buildEntryFlowState(onboarding));
});

export const PATCH = withApiHandler(async (request: Request) => {
  const user = await requireUser();
  const body = await parseJsonBody(request, onboardingActionSchema);
  const stepKey = getGuideStep(body.guideStepKey).id;

  const updated = await prisma.userOnboardingState.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      surveyStatus: body.action === "START_GUIDE" || body.action === "RESTART_GUIDE" ? "COMPLETED" : "NOT_STARTED",
      guideStatus:
        body.action === "SKIP_GUIDE"
          ? "SKIPPED"
          : body.action === "COMPLETE_GUIDE"
            ? "COMPLETED"
            : "IN_PROGRESS",
      guideStepKey:
        body.action === "SKIP_GUIDE" || body.action === "COMPLETE_GUIDE" ? defaultGuideStepKey : stepKey,
      entryFlowCompletedAt:
        body.action === "SKIP_GUIDE" || body.action === "COMPLETE_GUIDE" ? new Date() : null
    },
    update: {
      guideStatus:
        body.action === "SKIP_GUIDE"
          ? "SKIPPED"
          : body.action === "COMPLETE_GUIDE"
            ? "COMPLETED"
            : "IN_PROGRESS",
      guideStepKey:
        body.action === "SKIP_GUIDE" || body.action === "COMPLETE_GUIDE"
          ? defaultGuideStepKey
          : body.action === "START_GUIDE" || body.action === "RESTART_GUIDE" || body.action === "SET_GUIDE_STEP"
            ? stepKey
            : defaultGuideStepKey,
      surveyStatus:
        body.action === "START_GUIDE" || body.action === "RESTART_GUIDE" ? "COMPLETED" : undefined,
      entryFlowCompletedAt:
        body.action === "SKIP_GUIDE" || body.action === "COMPLETE_GUIDE"
          ? new Date()
          : body.action === "RESTART_GUIDE" || body.action === "START_GUIDE"
            ? null
            : undefined
    }
  });

  return NextResponse.json(buildEntryFlowState(updated));
});
