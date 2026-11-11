import { prisma } from "../../core/database/prisma.client";

const TASK_STATUSES = new Set([
  "OPEN",
  "IN_PROGRESS",
  "BLOCKED",
  "DONE",
  "CANCELLED",
]);
const TASK_PRIORITIES = new Set(["LOW", "NORMAL", "HIGH", "URGENT"]);

interface CreateTaskInput {
  title?: string;
  description?: string;
  area?: string;
  assigneeUsername?: string;
  priority?: string;
  dueAt?: string;
  note?: string;
}

interface UpdateTaskInput {
  status?: string;
  assigneeUsername?: string;
  note?: string;
}

export class HandoverService {
  async listTasks(query: { status?: string; area?: string } = {}) {
    const status = query.status?.toUpperCase();
    if (status && !TASK_STATUSES.has(status)) {
      throw new Error("HANDOVER_STATUS_INVALID");
    }

    const tasks = await prisma.handoverTask.findMany({
      where: {
        ...(status ? { status: status as never } : {}),
        ...(query.area?.trim()
          ? { area: { contains: query.area.trim(), mode: "insensitive" } }
          : {}),
      },
      include: { updates: { orderBy: { createdAt: "desc" } } },
      orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
      take: 100,
    });

    return this.attachUserNames(tasks);
  }

  async getTask(id: string) {
    const task = await prisma.handoverTask.findUnique({
      where: { id },
      include: { updates: { orderBy: { createdAt: "desc" } } },
    });
    if (!task) throw new Error("HANDOVER_TASK_NOT_FOUND");
    return (await this.attachUserNames([task]))[0];
  }

  async getPendingSummary() {
    const where = {
      status: { in: ["OPEN", "IN_PROGRESS", "BLOCKED"] as never[] },
    };
    const [count, tasks] = await Promise.all([
      prisma.handoverTask.count({ where }),
      prisma.handoverTask.findMany({
        where,
        include: { updates: { orderBy: { createdAt: "desc" }, take: 1 } },
        orderBy: [
          { priority: "desc" },
          { dueAt: "asc" },
          { createdAt: "desc" },
        ],
        take: 4,
      }),
    ]);
    return { count, tasks: await this.attachUserNames(tasks) };
  }

  async createTask(input: CreateTaskInput, actorId: string) {
    const title = input.title?.trim();
    if (!title) throw new Error("HANDOVER_TITLE_REQUIRED");

    const priority = (input.priority ?? "NORMAL").toUpperCase();
    if (!TASK_PRIORITIES.has(priority)) {
      throw new Error("HANDOVER_PRIORITY_INVALID");
    }

    const dueAt = input.dueAt ? new Date(input.dueAt) : undefined;
    if (dueAt && Number.isNaN(dueAt.getTime())) {
      throw new Error("HANDOVER_DUE_DATE_INVALID");
    }

    const assigneeId = await this.resolveAssignee(input.assigneeUsername);
    const task = await prisma.$transaction(async (tx) => {
      const created = await tx.handoverTask.create({
        data: {
          title,
          description: input.description?.trim() || undefined,
          area: input.area?.trim() || undefined,
          createdBy: actorId,
          assigneeId,
          priority: priority as never,
          dueAt,
          updates: {
            create: {
              actorId,
              status: "OPEN",
              note: input.note?.trim() || "Tạo công việc bàn giao",
            },
          },
        },
        include: { updates: { orderBy: { createdAt: "desc" } } },
      });
      return created;
    });

    return (await this.attachUserNames([task]))[0];
  }

  async updateTask(id: string, input: UpdateTaskInput, actorId: string) {
    const task = await prisma.handoverTask.findUnique({ where: { id } });
    if (!task) throw new Error("HANDOVER_TASK_NOT_FOUND");

    const status = input.status?.toUpperCase() ?? task.status;
    if (!TASK_STATUSES.has(status)) {
      throw new Error("HANDOVER_STATUS_INVALID");
    }

    const assigneeId =
      input.assigneeUsername === undefined
        ? task.assigneeId
        : await this.resolveAssignee(input.assigneeUsername);
    const statusChanged = status !== task.status;
    const updated = await prisma.$transaction(async (tx) => {
      await tx.handoverTask.update({
        where: { id },
        data: {
          status: status as never,
          assigneeId,
          completedAt: status === "DONE" ? new Date() : null,
        },
      });
      await tx.handoverTaskUpdate.create({
        data: {
          taskId: id,
          actorId,
          status: status as never,
          note:
            input.note?.trim() ||
            (statusChanged ? undefined : "Cập nhật công việc"),
        },
      });
      return tx.handoverTask.findUnique({
        where: { id },
        include: { updates: { orderBy: { createdAt: "desc" } } },
      });
    });

    return updated ? (await this.attachUserNames([updated]))[0] : null;
  }

  private async resolveAssignee(
    username?: string,
  ): Promise<string | undefined> {
    const normalized = username?.trim();
    if (!normalized) return undefined;

    const user = await prisma.user.findUnique({
      where: { username: normalized },
      select: { id: true, status: true },
    });
    if (!user || user.status !== "ACTIVE") {
      throw new Error("HANDOVER_ASSIGNEE_NOT_FOUND");
    }
    return user.id;
  }

  private async attachUserNames<
    T extends {
      createdBy: string;
      assigneeId: string | null;
      updates: Array<{ actorId: string }>;
    },
  >(tasks: T[]) {
    const ids = [
      ...new Set(
        tasks
          .flatMap((task) => [
            task.createdBy,
            task.assigneeId,
            ...task.updates.map((update) => update.actorId),
          ])
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const users = ids.length
      ? await prisma.user.findMany({
          where: { id: { in: ids } },
          select: { id: true, username: true, fullName: true },
        })
      : [];
    const names = new Map(
      users.map((user) => [user.id, user.fullName || user.username]),
    );

    return tasks.map((task) => ({
      ...task,
      creatorName: names.get(task.createdBy) ?? task.createdBy,
      assigneeName: task.assigneeId
        ? (names.get(task.assigneeId) ?? task.assigneeId)
        : null,
      updates: task.updates.map((update) => ({
        ...update,
        actorName: names.get(update.actorId) ?? update.actorId,
      })),
    }));
  }
}
