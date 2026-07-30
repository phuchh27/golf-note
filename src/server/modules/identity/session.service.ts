import { TokenService } from "../../core/security";

import { prisma } from "../../core/database";

const SESSION_DURATION_MS = 9 * 60 * 60 * 1000;

export class SessionService {
  constructor(private readonly tokenService = new TokenService()) {}

  async createSession(userId: string) {
    const token = this.tokenService.generate();

    const tokenHash = this.tokenService.hash(token);

    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    await prisma.session.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return {
      token,
      expiresAt,
    };
  }

  async getUserBySessionToken(token: string) {
    const tokenHash = this.tokenService.hash(token);

    const session = await prisma.session.findUnique({
      where: {
        tokenHash,
      },

      include: {
        user: {
          include: {
            roleAssignments: {
              include: {
                role: true,
              },
            },

            permissionGrants: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      return null;
    }

    if (session.revokedAt) {
      return null;
    }

    if (session.expiresAt <= new Date()) {
      return null;
    }

    if (session.user.status !== "ACTIVE") {
      return null;
    }

    return session.user;
  }
  async validateSession(token: string) {
    const tokenHash = this.tokenService.hash(token);

    const session = await prisma.session.findFirst({
      where: {
        tokenHash,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    return Boolean(session);
  }

  async revokeSession(token: string) {
    const tokenHash = this.tokenService.hash(token);

    await prisma.session.deleteMany({
      where: {
        tokenHash,
      },
    });
  }
}
