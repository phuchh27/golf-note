import 'dotenv/config';

import { PasswordService } from '../src/server/core/security';

import { prisma } from '../src/server/core/database';

async function main() {
  const username = process.env['INITIAL_ADMIN_USERNAME']?.trim();
  const password = process.env['INITIAL_ADMIN_PASSWORD'];
  const fullName =
    process.env['INITIAL_ADMIN_FULL_NAME']?.trim() || 'System Administrator';

  if (!username || !password) {
    throw new Error(
      'INITIAL_ADMIN_USERNAME and INITIAL_ADMIN_PASSWORD must be set before seeding.',
    );
  }

  const passwordService = new PasswordService();

  const passwordHash = await passwordService.hash(password);

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
        username,
      },
      update: {},
      create: {
        username,
        fullName,
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