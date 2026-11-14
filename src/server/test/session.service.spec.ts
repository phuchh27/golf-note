import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../core/database", () => ({
  prisma: {
    session: {
      create: vi.fn(),
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

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    [false, 9 * 60 * 60 * 1000],
    [true, 30 * 24 * 60 * 60 * 1000],
  ])("sets the session expiry for rememberMe=%s", async (rememberMe, duration) => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const service = new SessionService();
    const session = await service.createSession("user-1", rememberMe);

    expect(session.expiresAt).toEqual(new Date(now.getTime() + duration));
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
