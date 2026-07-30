import 'dotenv/config';

import { PrismaClient } from '../generated/prisma/client';
import { PasswordService } from '../src/server/core/security';

import { prisma } from '../src/server/core/database';

async function main() {
  const passwordService = new PasswordService();

  const passwordHash =
    await passwordService.hash('admin');

  const adminRole =
    await prisma.role.upsert({
      where: {
        code: 'SUPER_ADMIN',
      },
      update: {},
      create: {
        code: 'SUPER_ADMIN',
        name: 'Super Administrator',
        description:
          'Full system access',
      },
    });

  const admin =
    await prisma.user.upsert({
      where: {
        username: 'admin',
      },
      update: {},
      create: {
        username: 'admin',
        fullName: 'System Administrator',
        passwordHash,
        status: 'ACTIVE',
      },
    });

  await prisma.userRoleAssignment.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: adminRole.id,
      },
    },
    update: {
      isActive: true,
      expiresAt: null,
    },
    create: {
      userId: admin.id,
      roleId: adminRole.id,
      isActive: true,
    },
  });

  console.log(
    `Admin account ready: ${admin.username}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });