import type { UserRole } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getServerSessionMock, findUniqueMock } = vi.hoisted(() => ({
  getServerSessionMock: vi.fn(),
  findUniqueMock: vi.fn()
}));

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {}
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: findUniqueMock
    }
  }
}));

import { getFreshSessionUser, requireArtistUser, requireUser } from "@/lib/server-auth";

function makeSession(role: UserRole) {
  return {
    user: {
      id: "user-1",
      role
    }
  };
}

describe("server auth helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the fresh DB role instead of the stale session role", async () => {
    getServerSessionMock.mockResolvedValue(makeSession("ADMIN"));
    findUniqueMock.mockResolvedValue({
      id: "user-1",
      role: "ARTIST"
    });

    await expect(requireUser()).resolves.toEqual({
      id: "user-1",
      role: "ARTIST"
    });
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { id: true, role: true }
    });
  });

  it("returns null when there is no active session", async () => {
    getServerSessionMock.mockResolvedValue(null);

    await expect(getFreshSessionUser()).resolves.toBeNull();
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("throws 401 when the session user is missing from the database", async () => {
    getServerSessionMock.mockResolvedValue(makeSession("ARTIST"));
    findUniqueMock.mockResolvedValue(null);

    await expect(requireUser()).rejects.toMatchObject({
      status: 401,
      message: "Пользователь не найден. Пожалуйста, войдите заново."
    });
  });

  it("blocks non-artist users based on the DB role", async () => {
    getServerSessionMock.mockResolvedValue(makeSession("ARTIST"));
    findUniqueMock.mockResolvedValue({
      id: "user-1",
      role: "SPECIALIST"
    });

    await expect(requireArtistUser()).rejects.toMatchObject({
      status: 403,
      message: "Forbidden"
    });
  });
});
