import { prisma } from './prisma.client';

export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
}> {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return {
      healthy: true,
    };
  } catch (error) {
    console.error(
      '[DatabaseHealth] Database connection failed:',
      error,
    );

    return {
      healthy: false,
    };
  }
}