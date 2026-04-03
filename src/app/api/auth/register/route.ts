import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { apiError, parseJsonBody, withApiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const registerSchema = z.object({
  email: z.string().email().max(160),
  password: z.string().min(8).max(120)
});

export const POST = withApiHandler(async (request: Request) => {
  const body = await parseJsonBody(request, registerSchema);
  const email = body.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true }
  });

  if (existing) {
    throw apiError(409, "Пользователь с таким e-mail уже существует.");
  }

  const passwordHash = await bcrypt.hash(body.password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      nickname: "Новый артист",
      role: "ARTIST",
      onboarding: {
        create: {
          surveyStatus: "NOT_STARTED",
          guideStatus: "NOT_STARTED",
          guideStepKey: "today"
        }
      }
    },
    select: {
      id: true,
      email: true
    }
  });

  return NextResponse.json({
    id: user.id,
    email: user.email
  });
});
