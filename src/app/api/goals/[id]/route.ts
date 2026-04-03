import { ArtistGoalStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, parseJsonBody, withApiHandler } from "@/lib/api";
import {
  getGoalDetailForUser,
  getGoalTrajectoryReview,
  getIdentityProfile,
  serializeGoalDetail,
  todayToDateOnly,
  unsetOtherPrimaryGoals
} from "@/lib/artist-growth";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server-auth";

const updateGoalSchema = z.object({
  title: z.string().trim().min(3).max(140).optional(),
  whyNow: z.string().trim().max(500).optional().nullable(),
  successDefinition: z.string().trim().max(500).optional().nullable(),
  targetDate: z.string().trim().max(40).optional().nullable(),
  status: z.nativeEnum(ArtistGoalStatus).optional(),
  isPrimary: z.boolean().optional()
});

function isActivePrimaryGoalConflict(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }

  const target = Array.isArray(error.meta?.target)
    ? error.meta.target.join(",")
    : String(error.meta?.target ?? "");

  return target.includes("ArtistGoal_active_primary_user_unique") || target.includes("userId");
}

function parseOptionalDate(value?: string | null) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw apiError(400, "Некорректная дата цели.");
  }
  return parsed;
}

export const GET = withApiHandler(async (_request: Request, context: { params: { id: string } }) => {
  const user = await requireUser();
  const today = todayToDateOnly(new Date());
  const [goal, identityProfile] = await Promise.all([
    getGoalDetailForUser(prisma, user.id, context.params.id),
    getIdentityProfile(prisma, user.id)
  ]);

  if (!goal) {
    throw apiError(404, "Цель не найдена.");
  }

  const trajectoryReview = await getGoalTrajectoryReview(prisma, user.id, goal, today);

  return NextResponse.json(
    serializeGoalDetail(goal, identityProfile, {
      trajectoryReview
    })
  );
});

export const PATCH = withApiHandler(async (request: Request, context: { params: { id: string } }) => {
  const user = await requireUser();
  const body = await parseJsonBody(request, updateGoalSchema);
  const parsedTargetDate = parseOptionalDate(body.targetDate);
  const identityProfile = await getIdentityProfile(prisma, user.id);
  const today = todayToDateOnly(new Date());

  let updated;
  try {
    updated = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`;

      const existing = await tx.artistGoal.findFirst({
        where: {
          id: context.params.id,
          userId: user.id
        }
      });

      if (!existing) {
        throw apiError(404, "Цель не найдена.");
      }

      const nextStatus = body.status ?? existing.status;
      const nextIsPrimary = body.isPrimary ?? existing.isPrimary;

      if (nextIsPrimary && nextStatus !== ArtistGoalStatus.ACTIVE) {
        throw apiError(400, "Главной может быть только активная цель.");
      }

      if (nextIsPrimary) {
        await unsetOtherPrimaryGoals(tx, user.id, existing.id);
      }

      await tx.artistGoal.update({
        where: { id: existing.id },
        data: {
          title: body.title?.trim() ?? existing.title,
          whyNow: body.whyNow === undefined ? existing.whyNow : body.whyNow?.trim() || null,
          successDefinition:
            body.successDefinition === undefined ? existing.successDefinition : body.successDefinition?.trim() || null,
          targetDate: parsedTargetDate === undefined ? existing.targetDate : parsedTargetDate,
          status: nextStatus,
          isPrimary: nextStatus === ArtistGoalStatus.ACTIVE ? nextIsPrimary : false
        }
      });

      return getGoalDetailForUser(tx, user.id, existing.id);
    });
  } catch (error) {
    if (isActivePrimaryGoalConflict(error)) {
      throw apiError(409, "У тебя уже есть другая активная главная цель.");
    }
    throw error;
  }

  if (!updated) {
    throw apiError(404, "Цель не найдена.");
  }

  const trajectoryReview = await getGoalTrajectoryReview(prisma, user.id, updated, today);

  return NextResponse.json(
    serializeGoalDetail(updated, identityProfile, {
      trajectoryReview
    })
  );
});
