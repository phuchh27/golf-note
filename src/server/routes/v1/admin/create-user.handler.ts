import { createError, getCookie, readBody, setResponseStatus } from "h3";

import { IdentityService, SessionService } from "../../../modules/identity";

export function createCreateUserHandler(
  identityService: IdentityService,
  sessionService: SessionService,
) {
  return async (event: any) => {
    const token = getCookie(event, "golf_note_session");

    if (!token) {
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
      });
    }

    const currentUser = await sessionService.getUserBySessionToken(token);

    if (!currentUser) {
      throw createError({
        statusCode: 401,
        statusMessage: "Session expired or invalid",
      });
    }

    const roles = (currentUser.roleAssignments ?? [])
      .filter((assignment: any) => assignment.isActive)
      .map((assignment: any) => assignment.role?.code)
      .filter(Boolean);

    if (!roles.includes("SUPER_ADMIN") && !roles.includes("ADMIN")) {
      throw createError({
        statusCode: 403,
        statusMessage: "Forbidden",
      });
    }

    const body = await readBody<{
      username?: string;
      fullName?: string;
      password?: string;
      role?: string;
      roles?: string[];
    }>(event);

    const username = body?.username?.trim();
    const fullName = body?.fullName?.trim();
    const password = body?.password;

    if (!username || !fullName || !password) {
      throw createError({
        statusCode: 400,
        statusMessage: "Username, full name, and password are required",
      });
    }

    const createdUser = await identityService.createUser({
      username,
      fullName,
      password,
      role: body?.role,
      roles: body?.roles,
    });

    setResponseStatus(event, 201);

    return {
      success: true,
      user: {
        id: createdUser.id,
        username: createdUser.username,
        fullName: createdUser.fullName,
      },
    };
  };
}
