import { NextResponse } from "next/server";

import { withApiHandler, apiError } from "@/lib/api";
import { requireArtistUser } from "@/lib/server-auth";
import { getAiRuntimeConfig } from "@/lib/ai/config";
import { PersonalizationEngine } from "@/lib/ai/personalization/engine";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const POST = withApiHandler(async () => {
  const actor = await requireArtistUser();
  const config = getAiRuntimeConfig();
  if (!config.enabled) {
    throw apiError(503, "AI ASSIST is disabled");
  }

  const engine = new PersonalizationEngine();
  const result = await engine.run(actor.id);
  return NextResponse.json({
    tasksCount: result.tasks.length,
    recommendationsCount: result.recommendations.length,
    profileGapsCount: result.profileGaps.length
  });
});
