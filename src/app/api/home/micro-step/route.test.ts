import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireUserMock, findUniqueMock, updateMock } = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  findUniqueMock: vi.fn(),
  updateMock: vi.fn()
}));

vi.mock("@/lib/server-auth", () => ({
  requireUser: requireUserMock
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    dailyMicroStep: {
      findUnique: findUniqueMock,
      update: updateMock
    }
  }
}));

import { PATCH } from "@/app/api/home/micro-step/route";

function makeJsonRequest(body: string) {
  return new Request("http://localhost/api/home/micro-step", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body
  });
}

describe("PATCH /api/home/micro-step", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireUserMock.mockResolvedValue({ id: "user-1", role: "ARTIST" });
  });

  it("returns 400 for malformed JSON and does not mutate state", async () => {
    const response = await PATCH(makeJsonRequest("not-json{{"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Invalid request body"
    });
    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("returns 400 for missing isCompleted and does not mutate state", async () => {
    const response = await PATCH(makeJsonRequest("{}"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "Invalid request body"
    });
    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("updates the current micro-step only for an explicit boolean payload", async () => {
    findUniqueMock.mockResolvedValue({
      id: "step-1",
      userId: "user-1",
      date: new Date("2026-03-19T00:00:00.000Z"),
      text: "Ship one safe fix",
      stepPool: ["Ship one safe fix", "Review another path"],
      stepCursor: 0,
      completedStepIndexes: [],
      isCompleted: false,
      completedAt: null
    });
    updateMock.mockResolvedValue({
      id: "step-1",
      isCompleted: true,
      completedStepIndexes: [0]
    });

    const response = await PATCH(makeJsonRequest(JSON.stringify({ isCompleted: true })));

    expect(response.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "step-1" },
        data: expect.objectContaining({
          isCompleted: true,
          completedStepIndexes: [0]
        })
      })
    );
  });
});
