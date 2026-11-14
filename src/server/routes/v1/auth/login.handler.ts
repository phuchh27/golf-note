import { createError, readBody, setCookie } from "h3";

import { IdentityService, SessionService } from "../../../modules/identity";

export function createLoginHandler(
  identityService: IdentityService,
  sessionService: SessionService,
) {
  return async (event: any) => {
    const body = await readBody<{
      username?: string;
      password?: string;
      rememberMe?: boolean;
    }>(event);

    const username = body.username?.trim();

    const password = body.password;

    if (!username || !password) {
      throw createError({
        statusCode: 400,
        statusMessage: "Username and password are required",
      });
    }

    const user = await identityService.authenticate(username, password);

    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: "Invalid username or password",
      });
    }

    const rememberMe = body.rememberMe === true;
    const session = await sessionService.createSession(user.id, rememberMe);

    const authUser = user as any;

    const rawRoles = Array.isArray(authUser.roles)
      ? authUser.roles
      : (authUser.roleAssignments ?? [])
          .filter((assignment: any) => assignment.isActive)
          .map((assignment: any) => assignment.role.code);

    const rawPermissions = Array.isArray(authUser.permissions)
      ? authUser.permissions
      : (authUser.permissionGrants ?? [])
          .filter((grant: any) => grant.isActive)
          .map((grant: any) => grant.permission.code);

    const roles = rawRoles ?? [];

    const permissions = rawPermissions ?? [];

    setCookie(event, "golf_note_session", session.token, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax",
      path: "/",
      ...(rememberMe ? { expires: session.expiresAt } : {}),
    });

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        roles,
        permissions,
      },
    };
  };
}
