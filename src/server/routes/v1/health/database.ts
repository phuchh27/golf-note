import { checkDatabaseHealth } from '../../../core/database';

export default async function databaseHealth() {
  const result = await checkDatabaseHealth();

  if (!result.healthy) {
    return Response.json(
      {
        status: 'error',
        database: 'disconnected',
      },
      {
        status: 503,
      },
    );
  }

  return Response.json({
    status: 'ok',
    database: 'connected',
  });
}