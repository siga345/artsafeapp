import { NextResponse } from "next/server";

import { withApiHandler } from "@/lib/api";
import { requireArtistUser } from "@/lib/server-auth";
import { PersonalizationEngine } from "@/lib/ai/personalization/engine";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = withApiHandler(async () => {
  const actor = await requireArtistUser();
  const engine = new PersonalizationEngine();
  const tasks = await engine.getGeneratedTasks(actor.id);
  return NextResponse.json({ tasks });
});
