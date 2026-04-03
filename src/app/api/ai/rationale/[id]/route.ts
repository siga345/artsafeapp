import { NextResponse } from "next/server";

import { withApiHandler, apiError } from "@/lib/api";
import { requireArtistUser } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = withApiHandler(async (_request: Request, { params }: { params: { id: string } }) => {
  const actor = await requireArtistUser();

  const rationale = await prisma.aiTaskRationale.findUnique({
    where: { id: params.id }
  });

  if (!rationale) {
    throw apiError(404, "Rationale not found");
  }

  if (rationale.userId !== actor.id) {
    throw apiError(403, "Forbidden");
  }

  return NextResponse.json({ rationale });
});
