import { PasswordService } from "../../core/security";

import { prisma } from "../../core/database";

export class IdentityService {
  constructor(private readonly passwordService = new PasswordService()) {}

  async authenticate(username: string, password: string) {
    const user = await prisma.user.findUnique({
      where: {
        username,
      },
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
    });

    if (!user) {
      return null;
    }

    if (user.status !== "ACTIVE") {
      return null;
    }

    const isValid = await this.passwordService.verify(
      password,
      user.passwordHash,
    );

    if (!isValid) {
      return null;
    }

    return user;
  }

  async createUser(input: {
    username: string;
    fullName: string;
    password: string;
    role?: string;
    roles?: string[];
  }) {
    const normalizedUsername = input.username.trim().toLowerCase();
    const normalizedFullName = input.fullName.trim();

    const existingUser = await prisma.user.findUnique({
      where: {
        username: normalizedUsername,
      },
    });

    if (existingUser) {
      throw new Error("Username already exists");
    }

    const roleCodes = Array.from(
      new Set(
        [input.role, ...(input.roles ?? [])]
          .filter((role): role is string => Boolean(role))
          .map((role) => role.trim().toUpperCase()),
      ),
    );

    const resolvedRoles = roleCodes.length > 0 ? roleCodes : ["USER"];

    const passwordHash = await this.passwordService.hash(input.password);

    const user = await prisma.user.create({
      data: {
        username: normalizedUsername,
        fullName: normalizedFullName,
        passwordHash,
        status: "ACTIVE",
        roleAssignments: {
          create: await Promise.all(
            resolvedRoles.map(async (roleCode) => {
              let role = await prisma.role.findUnique({
                where: { code: roleCode },
              });

              if (!role) {
                role = await prisma.role.create({
                  data: {
                    code: roleCode,
                    name: roleCode.replace(/_/g, " "),
                    description: `Auto-created role ${roleCode}`,
                  },
                });
              }

              return {
                roleId: role.id,
                isActive: true,
                assignedBy: "system",
              };
            }),
          ),
        },
      },
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
    });

    return user;
  }
}
