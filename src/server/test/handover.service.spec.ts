import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
    handoverTask: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    handoverTaskUpdate: { create: vi.fn() },
    user: { findUnique: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock("../core/database/prisma.client", () => ({ prisma: prismaMock }));

import { HandoverService } from "../modules/handover/handover.service";

describe("HandoverService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback: any) =>
      callback(prismaMock),
    );
  });

  it("requires a task title", async () => {
    await expect(
      new HandoverService().createTask({ title: "  " }, "user-1"),
    ).rejects.toThrow("HANDOVER_TITLE_REQUIRED");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejects unknown status changes without writing history", async () => {
    prismaMock.handoverTask.findUnique.mockResolvedValue({
      id: "task-1",
      status: "OPEN",
      assigneeId: null,
    });

    await expect(
      new HandoverService().updateTask(
        "task-1",
        { status: "NOT_A_STATUS" },
        "user-1",
      ),
    ).rejects.toThrow("HANDOVER_STATUS_INVALID");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("persists a status change and records it in task history", async () => {
    prismaMock.handoverTask.findUnique
      .mockResolvedValueOnce({
        id: "task-1",
        status: "OPEN",
        assigneeId: null,
        createdBy: "user-1",
      })
      .mockResolvedValueOnce({
        id: "task-1",
        status: "DONE",
        assigneeId: null,
        createdBy: "user-1",
        updates: [],
      });
    prismaMock.user.findMany.mockResolvedValue([]);

    const result = await new HandoverService().updateTask(
      "task-1",
      { status: "DONE", note: "Finished" },
      "user-1",
    );

    expect(prismaMock.handoverTask.update).toHaveBeenCalledWith({
      where: { id: "task-1" },
      data: {
        status: "DONE",
        assigneeId: null,
        completedAt: expect.any(Date),
      },
    });
    expect(prismaMock.handoverTaskUpdate.create).toHaveBeenCalledWith({
      data: {
        taskId: "task-1",
        actorId: "user-1",
        status: "DONE",
        note: "Finished",
      },
    });
    expect(result?.status).toBe("DONE");
  });
});
