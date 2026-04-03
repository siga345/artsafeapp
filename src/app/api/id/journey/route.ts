import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, parseJsonBody, withApiHandler } from "@/lib/api";
import {
  buildArtistWorldResponse,
  ensureArtistWorldVisualBoards,
  normalizeArtistWorldPayload,
  type ArtistWorldVisualBoardInput
} from "@/lib/artist-world";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server-auth";

const optionalStringSchema = z.string().max(240).optional().nullable();
const optionalLongStringSchema = z.string().max(600).optional().nullable();
const optionalUrlSchema = z.string().max(500).optional().nullable();

const journeySchema = z.object({
  group: z.enum(["meaning_core", "music", "visual"]),
  payload: z.object({
    mission: optionalStringSchema,
    identityStatement: optionalStringSchema,
    philosophy: optionalLongStringSchema,
    coreThemes: z.array(z.string().min(1).max(80)).max(6).optional(),
    favoriteArtists: z.array(z.string().min(1).max(120)).max(5).optional(),
    currentFocusTitle: optionalStringSchema,
    differentiator: optionalStringSchema,
    playlistUrl: optionalUrlSchema,
    visualDirection: optionalStringSchema,
    aestheticKeywords: z.array(z.string().min(1).max(80)).max(8).optional(),
    fashionSignals: z.array(z.string().min(1).max(80)).max(8).optional(),
    aestheticsBoardUrl: optionalUrlSchema,
    fashionBoardUrl: optionalUrlSchema
  })
});

function normalizeOptionalHttpUrl(value: string | null | undefined, fieldLabel: string) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    return new URL(withProtocol).toString();
  } catch {
    throw apiError(400, `${fieldLabel}: укажи корректную ссылку.`);
  }
}

async function getJourneyProfile(userId: string) {
  const profile = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      safeId: true,
      nickname: true,
      avatarUrl: true,
      links: true,
      notificationsEnabled: true,
      demosPrivate: true,
      identityProfile: true,
      artistWorldProjects: {
        orderBy: [{ sortIndex: "asc" }, { createdAt: "asc" }]
      },
      artistWorldReferences: {
        orderBy: [{ sortIndex: "asc" }, { createdAt: "asc" }]
      },
      artistWorldVisualBoards: {
        orderBy: [{ sortIndex: "asc" }],
        include: {
          images: {
            orderBy: [{ sortIndex: "asc" }, { createdAt: "asc" }]
          }
        }
      }
    }
  });

  return profile ? buildArtistWorldResponse(profile) : null;
}

export const GET = withApiHandler(async () => {
  const user = await requireUser();
  const profile = await getJourneyProfile(user.id);
  return NextResponse.json(profile);
});

export const PATCH = withApiHandler(async (request: Request) => {
  const user = await requireUser();
  const body = await parseJsonBody(request, journeySchema);

  await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        identityProfile: true,
        artistWorldVisualBoards: {
          orderBy: [{ sortIndex: "asc" }],
          include: {
            images: {
              orderBy: [{ sortIndex: "asc" }, { createdAt: "asc" }]
            }
          }
        }
      }
    });

    const merged = normalizeArtistWorldPayload({
      ...(existing.identityProfile ?? {}),
      worldCreated: true,
      ...body.payload,
      playlistUrl:
        body.payload.playlistUrl !== undefined
          ? normalizeOptionalHttpUrl(body.payload.playlistUrl, "Плейлист")
          : existing.identityProfile?.playlistUrl,
      visualBoards: existing.artistWorldVisualBoards as ArtistWorldVisualBoardInput[]
    });

    await tx.artistIdentityProfile.upsert({
      where: { userId: user.id },
      update: merged,
      create: {
        userId: user.id,
        ...merged
      }
    });

    if (body.group === "visual") {
      const currentBoards = ensureArtistWorldVisualBoards(existing.artistWorldVisualBoards as ArtistWorldVisualBoardInput[]);
      const nextBoards = currentBoards.map((board) => ({
        ...board,
        sourceUrl:
          board.slug === "aesthetics"
            ? body.payload.aestheticsBoardUrl !== undefined
              ? normalizeOptionalHttpUrl(body.payload.aestheticsBoardUrl, "Moodboard эстетики")
              : board.sourceUrl
            : board.slug === "fashion"
              ? body.payload.fashionBoardUrl !== undefined
                ? normalizeOptionalHttpUrl(body.payload.fashionBoardUrl, "Moodboard фэшна")
                : board.sourceUrl
              : board.sourceUrl
      }));

      const existingBoards = await tx.artistWorldVisualBoard.findMany({
        where: { userId: user.id },
        select: { id: true }
      });

      if (existingBoards.length > 0) {
        await tx.artistWorldVisualBoardImage.deleteMany({
          where: { boardId: { in: existingBoards.map((board) => board.id) } }
        });
        await tx.artistWorldVisualBoard.deleteMany({
          where: { userId: user.id }
        });
      }

      for (let boardIndex = 0; boardIndex < nextBoards.length; boardIndex++) {
        const boardInput = nextBoards[boardIndex];
        const createdBoard = await tx.artistWorldVisualBoard.create({
          data: {
            userId: user.id,
            slug: boardInput.slug,
            name: boardInput.name,
            sourceUrl: boardInput.sourceUrl ?? null,
            sortIndex: boardIndex
          }
        });

        if (boardInput.images.length > 0) {
          await tx.artistWorldVisualBoardImage.createMany({
            data: boardInput.images.map((image, imageIndex) => ({
              boardId: createdBoard.id,
              imageUrl: image.imageUrl,
              sortIndex: imageIndex
            }))
          });
        }
      }
    }
  });

  const profile = await getJourneyProfile(user.id);
  return NextResponse.json(profile);
});
