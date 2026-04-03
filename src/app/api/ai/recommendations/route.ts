import { NextResponse } from "next/server";
import { z } from "zod";

import { withApiHandler, apiError } from "@/lib/api";
import { requireArtistUser } from "@/lib/server-auth";
import { PersonalizationEngine } from "@/lib/ai/personalization/engine";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const querySchema = z.object({
  type: z.enum(["LEARN", "EVENT", "CREATOR", "REFERENCE_ARTIST", "TASK"]).optional()
});

export const GET = withApiHandler(async (request: Request) => {
  const actor = await requireArtistUser();

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({ type: searchParams.get("type") ?? undefined });
  if (!parsed.success) {
    throw apiError(400, "Invalid query params", parsed.error.flatten());
  }

  const engine = new PersonalizationEngine();
  const recommendations = await engine.getRecommendations(actor.id, parsed.data.type);
  return NextResponse.json({ recommendations });
});
