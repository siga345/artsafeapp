import { NextResponse } from "next/server";
import { DemoVersionType as PrismaDemoVersionType, Prisma } from "@prisma/client";
import { z } from "zod";

import { apiError, parseJsonBody, withApiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server-auth";

const reorderDemosSchema = z.object({
  versionType: z.enum(["IDEA_TEXT", "DEMO", "ARRANGEMENT", "NO_MIX", "MIXED", "MASTERED", "RELEASE"]),
  orderedDemoIds: z.array(z.string().min(1)).min(1)
}).superRefine((value, ctx) => {
  const seen = new Set<string>();
  for (const id of value.orderedDemoIds) {
    if (seen.has(id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["orderedDemoIds"],
        message: "orderedDemoIds must be unique"
      });
      return;
    }
    seen.add(id);
  }
});

function isDemoSortConflict(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }

  const target = Array.isArray(error.meta?.target)
    ? error.meta.target.join(",")
    : String(error.meta?.target ?? "");

  return target.includes("Demo_trackId_versionType_sortIndex_key") || target.includes("sortIndex");
}

export const POST = withApiHandler(async (request: Request, { params }: { params: { id: string } }) => {
  const user = await requireUser();
  const body = await parseJsonBody(request, reorderDemosSchema);

  const track = await prisma.track.findFirst({
    where: { id: params.id, userId: user.id },
    select: { id: true, projectId: true }
  });

  if (!track) {
    throw apiError(404, "Track not found");
  }

  const actualIds = body.orderedDemoIds;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Track" WHERE id = ${track.id} FOR UPDATE`;

      const demosInStep = await tx.demo.findMany({
        where: { trackId: track.id, versionType: body.versionType as unknown as PrismaDemoVersionType },
        select: { id: true, sortIndex: true }
      });

      const expectedIds = demosInStep.map((demo) => demo.id);
      if (expectedIds.length !== actualIds.length) {
        throw apiError(400, "orderedDemoIds must include all demos of this versionType");
      }

      const expectedSet = new Set(expectedIds);
      for (const id of actualIds) {
        if (!expectedSet.has(id)) {
          throw apiError(400, "orderedDemoIds contains invalid demo for this track/versionType");
        }
      }

      const maxSortIndex = demosInStep.reduce((max, demo) => Math.max(max, demo.sortIndex), -1);
      const tempOffset = maxSortIndex + actualIds.length + 1;

      for (const [index, demoId] of actualIds.entries()) {
        await tx.demo.update({
          where: { id: demoId },
          data: { sortIndex: tempOffset + index }
        });
      }

      for (const [sortIndex, demoId] of actualIds.entries()) {
        await tx.demo.update({
          where: { id: demoId },
          data: { sortIndex }
        });
      }

      await tx.track.update({
        where: { id: track.id },
        data: { updatedAt: new Date() }
      });

      if (track.projectId) {
        await tx.project.update({
          where: { id: track.projectId },
          data: { updatedAt: new Date() }
        });
      }
    });
  } catch (error) {
    if (isDemoSortConflict(error)) {
      throw apiError(409, "Порядок версий изменился параллельно. Обнови страницу и попробуй снова.");
    }
    throw error;
  }

  return NextResponse.json({ ok: true });
});
