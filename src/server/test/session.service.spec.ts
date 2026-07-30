import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../core/database", () => ({
  prisma: {
    session: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "../core/database";
import { SessionService } from "../modules/identity/session.service";

describe("SessionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the same token hash for session lookup as login creation", async () => {
    vi.mocked(prisma.session.findUnique).mockResolvedValue(null);

    const tokenService = {
      hash: vi.fn().mockReturnValue("hash-from-token-service"),
    };

    const service = new SessionService(tokenService as any);

    await service.getUserBySessionToken("session-token");

    expect(tokenService.hash).toHaveBeenCalledWith("session-token");
    expect(prisma.session.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tokenHash: "hash-from-token-service",
        },
      }),
    );
  });
});
