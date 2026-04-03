import { NextResponse } from "next/server";

import { apiError, withApiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server-auth";
import { getManagedPublicStorageKeyFromUrl, normalizeUploadFilename, storageProvider } from "@/lib/storage";

const MAX_AVATAR_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

async function isUploadUrlStillReferenced(url: string) {
  const [
    avatarRefs,
    projectCoverRefs,
    worldBackgroundRefs,
    worldProjectRefs,
    worldReferenceRefs,
    visualBoardImageRefs
  ] = await Promise.all([
    prisma.user.count({ where: { avatarUrl: url } }),
    prisma.project.count({ where: { coverImageUrl: url } }),
    prisma.artistIdentityProfile.count({ where: { worldBackgroundImageUrl: url } }),
    prisma.artistWorldProject.count({ where: { coverImageUrl: url } }),
    prisma.artistWorldReference.count({ where: { imageUrl: url } }),
    prisma.artistWorldVisualBoardImage.count({ where: { imageUrl: url } })
  ]);

  return (
    avatarRefs +
      projectCoverRefs +
      worldBackgroundRefs +
      worldProjectRefs +
      worldReferenceRefs +
      visualBoardImageRefs >
    0
  );
}

export const POST = withApiHandler(async (request: Request) => {
  const user = await requireUser();
  const existingUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { avatarUrl: true }
  });
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw apiError(400, "Файл аватара не найден.");
  }

  if (!ALLOWED_AVATAR_MIME_TYPES.has(file.type)) {
    throw apiError(400, "Поддерживаются только JPG, PNG, WEBP и GIF.");
  }

  if (file.size <= 0 || file.size > MAX_AVATAR_UPLOAD_BYTES) {
    throw apiError(400, `Размер аватара должен быть не больше ${MAX_AVATAR_UPLOAD_BYTES / (1024 * 1024)} МБ.`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const saved = await storageProvider.saveFile({
    buffer,
    filename: normalizeUploadFilename(file.name || "avatar")
  });

  const avatarUrl = `/api/uploads/${saved.storageKey}`;
  const previousAvatarStorageKey = getManagedPublicStorageKeyFromUrl(existingUser?.avatarUrl);

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl }
    });
  } catch (error) {
    await storageProvider.deleteFile(saved.storageKey).catch(() => null);
    throw error;
  }

  if (
    previousAvatarStorageKey &&
    previousAvatarStorageKey !== saved.storageKey &&
    existingUser?.avatarUrl &&
    !(await isUploadUrlStillReferenced(existingUser.avatarUrl))
  ) {
    await storageProvider.deleteFile(previousAvatarStorageKey).catch(() => null);
  }

  return NextResponse.json({ avatarUrl });
});
