import {
  createError,
  defineEventHandler,
  getCookie,
} from 'h3';

import { SessionService } from '../../../modules/identity';

const sessionService = new SessionService();

export default defineEventHandler(async (event) => {
  const token = getCookie(
    event,
    'golf_note_session',
  );

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    });
  }

  const user =
    await sessionService.getUserBySessionToken(
      token,
    );

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Session expired or invalid',
    });
  }

  return {
    success: true,

    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,

      roles: user.roleAssignments
        .filter((assignment) => assignment.isActive)
        .map((assignment) => assignment.role.code),

      permissions: user.permissionGrants
        .filter((grant) => grant.isActive)
        .map((grant) => grant.permission.code),
    },
  };
});