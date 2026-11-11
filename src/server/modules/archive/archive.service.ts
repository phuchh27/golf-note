import { prisma } from "../../core/database/prisma.client";

export type ArchiveType = "TEXT" | "LINK";

export interface ArchiveInput {
  title?: string;
  type?: string;
  content?: string;
}

const MAX_TITLE_LENGTH = 160;
const MAX_CONTENT_LENGTH = 50_000;

function normalizeInput(input: ArchiveInput) {
  const title = input.title?.trim();
  const type = input.type?.trim().toUpperCase();
  const content = input.content?.trim();

  if (!title) throw new Error("ARCHIVE_TITLE_REQUIRED");
  if (title.length > MAX_TITLE_LENGTH) throw new Error("ARCHIVE_TITLE_TOO_LONG");
  if (type !== "TEXT" && type !== "LINK") throw new Error("ARCHIVE_TYPE_INVALID");
  if (!content) throw new Error("ARCHIVE_CONTENT_REQUIRED");
  if (content.length > MAX_CONTENT_LENGTH) throw new Error("ARCHIVE_CONTENT_TOO_LONG");

  if (type === "LINK") {
    let url: URL;
    try {
      url = new URL(content);
    } catch {
      throw new Error("ARCHIVE_LINK_INVALID");
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("ARCHIVE_LINK_INVALID");
    }
  }

  return { title, type: type as ArchiveType, content };
}

export class ArchiveService {
  async list(query: { search?: string; type?: string } = {}) {
    const search = query.search?.trim();
    const type = query.type?.trim().toUpperCase();
    if (type && type !== "TEXT" && type !== "LINK") {
      throw new Error("ARCHIVE_TYPE_INVALID");
    }

    return prisma.archiveEntry.findMany({
      where: {
        ...(type ? { type: type as never } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: "insensitive" } },
                { content: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
    });
  }

  async create(input: ArchiveInput, actorId: string) {
    return prisma.archiveEntry.create({
      data: { ...normalizeInput(input), createdBy: actorId, updatedBy: actorId },
    });
  }

  async update(id: string, input: ArchiveInput, actorId: string) {
    const existing = await prisma.archiveEntry.findUnique({ where: { id } });
    if (!existing) throw new Error("ARCHIVE_ENTRY_NOT_FOUND");
    return prisma.archiveEntry.update({
      where: { id },
      data: { ...normalizeInput(input), updatedBy: actorId },
    });
  }

  async delete(id: string) {
    const existing = await prisma.archiveEntry.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new Error("ARCHIVE_ENTRY_NOT_FOUND");
    await prisma.archiveEntry.delete({ where: { id } });
    return { id };
  }
}
