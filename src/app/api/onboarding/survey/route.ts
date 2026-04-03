import { NextResponse } from "next/server";
import { z } from "zod";

import { parseJsonBody, withApiHandler } from "@/lib/api";
import { defaultGuideStepKey } from "@/lib/entry-flow";
import { normalizeArtistWorldPayload } from "@/lib/artist-world";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server-auth";

const teamPreferenceSchema = z.enum(["solo", "team", "both"]);

const surveyDraftSchema = z.object({
  name: z.string().max(80).optional(),
  age: z.number().int().min(0).max(120).optional(),
  nickname: z.string().max(80).optional(),
  city: z.string().max(120).optional(),
  favoriteArtists: z.array(z.string().min(1).max(120)).max(3).optional(),
  lifeValues: z.string().max(600).optional(),
  musicAspirations: z.string().max(600).optional(),
  teamPreference: teamPreferenceSchema.optional(),
  currentStep: z.number().int().min(0).max(7).optional()
});

const surveyCompleteSchema = z.object({
  name: z.string().min(1).max(80),
  age: z.number().int().min(10).max(100),
  nickname: z.string().min(1).max(80),
  city: z.string().min(1).max(120),
  favoriteArtists: z.array(z.string().min(1).max(120)).length(3),
  lifeValues: z.string().min(1).max(600),
  musicAspirations: z.string().min(1).max(600),
  teamPreference: teamPreferenceSchema
});

function mergeSurveyDraft(existing: unknown, incoming: z.output<typeof surveyDraftSchema>) {
  if (!existing || typeof existing !== "object" || Array.isArray(existing)) {
    return incoming;
  }

  return {
    ...(existing as Record<string, unknown>),
    ...incoming
  };
}

export const PATCH = withApiHandler(async (request: Request) => {
  const user = await requireUser();
  const body = await parseJsonBody(request, surveyDraftSchema);
  const current = await prisma.userOnboardingState.findUnique({
    where: { userId: user.id },
    select: {
      surveyDraft: true
    }
  });

  const updated = await prisma.userOnboardingState.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      surveyStatus: "NOT_STARTED",
      guideStatus: "NOT_STARTED",
      guideStepKey: defaultGuideStepKey,
      surveyDraft: body
    },
    update: {
      surveyDraft: mergeSurveyDraft(current?.surveyDraft, body)
    }
  });

  return NextResponse.json({
    ok: true,
    surveyDraft: updated.surveyDraft
  });
});

export const POST = withApiHandler(async (request: Request) => {
  const user = await requireUser();
  const body = await parseJsonBody(request, surveyCompleteSchema);

  const existingProfile = await prisma.artistIdentityProfile.findUnique({
    where: { userId: user.id }
  });

  const artistWorld = normalizeArtistWorldPayload({
    ...(existingProfile ?? {}),
    worldCreated: true,
    artistName: body.name.trim(),
    artistAge: body.age,
    artistCity: body.city.trim(),
    identityStatement:
      existingProfile?.identityStatement ??
      `Артист ${body.nickname.trim()} из ${body.city.trim()}. Собирает свой первый осознанный мир.`,
    mission: body.musicAspirations.trim(),
    philosophy: body.lifeValues.trim(),
    favoriteArtists: body.favoriteArtists.map((item) => item.trim()),
    lifeValues: body.lifeValues.trim(),
    teamPreference: body.teamPreference,
    currentFocusDetail: body.musicAspirations.trim()
  });
  const { references, projects, visualBoards, ...identityProfileData } = artistWorld;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        nickname: body.nickname.trim()
      }
    });

    await tx.artistIdentityProfile.upsert({
      where: { userId: user.id },
      update: identityProfileData,
      create: {
        userId: user.id,
        ...identityProfileData
      }
    });

    await tx.userOnboardingState.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        surveyStatus: "COMPLETED",
        guideStatus: "NOT_STARTED",
        guideStepKey: defaultGuideStepKey,
        surveyDraft: {
          ...body,
          currentStep: 7
        }
      },
      update: {
        surveyStatus: "COMPLETED",
        guideStatus: "NOT_STARTED",
        guideStepKey: defaultGuideStepKey,
        surveyDraft: {
          ...body,
          currentStep: 7
        },
        entryFlowCompletedAt: null
      }
    });
  });

  return NextResponse.json({
    ok: true
  });
});
