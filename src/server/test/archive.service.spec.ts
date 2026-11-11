import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    archiveEntry: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("../core/database/prisma.client", () => ({ prisma: prismaMock }));

import { ArchiveService } from "../modules/archive/archive.service";

describe("ArchiveService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a shared text entry and records the actor", async () => {
    prismaMock.archiveEntry.create.mockResolvedValue({
      id: "entry-1",
      title: "Sunset",
      type: "TEXT",
      content: "Close the patio at dusk",
    });

    const result = await new ArchiveService().create(
      { title: " Sunset ", type: "text", content: " Close the patio at dusk " },
      "user-1",
    );

    expect(prismaMock.archiveEntry.create).toHaveBeenCalledWith({
      data: {
        title: "Sunset",
        type: "TEXT",
        content: "Close the patio at dusk",
        createdBy: "user-1",
        updatedBy: "user-1",
      },
    });
    expect(result.id).toBe("entry-1");
  });

  it("accepts only safe http and https links", async () => {
    prismaMock.archiveEntry.create.mockResolvedValue({ id: "link-1" });
    await new ArchiveService().create(
      { title: "Supplier", type: "LINK", content: "https://example.com" },
      "user-1",
    );
    await expect(
      new ArchiveService().create(
        { title: "Unsafe", type: "LINK", content: "javascript:alert(1)" },
        "user-1",
      ),
    ).rejects.toThrow("ARCHIVE_LINK_INVALID");
  });

  it("rejects image until image upload support is implemented", async () => {
    await expect(
      new ArchiveService().create(
        { title: "Sunset", type: "IMAGE", content: "data:image/png;base64,abc" },
        "user-1",
      ),
    ).rejects.toThrow("ARCHIVE_TYPE_INVALID");
    expect(prismaMock.archiveEntry.create).not.toHaveBeenCalled();
  });

  it("updates shared entries and requires an existing entry", async () => {
    prismaMock.archiveEntry.findUnique.mockResolvedValueOnce({ id: "entry-1" });
    prismaMock.archiveEntry.update.mockResolvedValue({ id: "entry-1", title: "Updated" });
    await new ArchiveService().update(
      "entry-1",
      { title: "Updated", type: "TEXT", content: "New content" },
      "user-2",
    );
    expect(prismaMock.archiveEntry.update).toHaveBeenCalledWith({
      where: { id: "entry-1" },
      data: { title: "Updated", type: "TEXT", content: "New content", updatedBy: "user-2" },
    });

    prismaMock.archiveEntry.findUnique.mockResolvedValueOnce(null);
    await expect(
      new ArchiveService().update("missing", { title: "x", type: "TEXT", content: "y" }, "user-1"),
    ).rejects.toThrow("ARCHIVE_ENTRY_NOT_FOUND");
  });
});
