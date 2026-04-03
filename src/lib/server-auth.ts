import type { UserRole } from "@prisma/client";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export type SessionUser = {
  id: string;
  role: UserRole;
};

export async function getFreshSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true }
  });

  if (!user) {
    return null;
  }

  return user;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getFreshSessionUser();

  if (!user) {
    throw apiError(401, "Пользователь не найден. Пожалуйста, войдите заново.");
  }

  return user;
}

export async function requireArtistUser(): Promise<SessionUser> {
  const user = await requireUser();

  if (user.role !== "ARTIST") {
    throw apiError(403, "Forbidden");
  }

  return user;
}
