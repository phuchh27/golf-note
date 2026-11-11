import { createError, getCookie, type H3Event } from "h3";

import { SessionService } from "../../../modules/identity";

const sessionService = new SessionService();
const INVENTORY_MANAGER_ROLES = new Set(["MANAGER", "ADMIN", "SUPER_ADMIN"]);

export async function requireInventoryManager(
  event: H3Event,
): Promise<{ id: string }> {
  const token = getCookie(event, "golf_note_session");

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  const user = await sessionService.getUserBySessionToken(token);

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Session expired or invalid",
    });
  }

  const roles = user.roleAssignments
    .filter((assignment) => assignment.isActive)
    .map((assignment) => assignment.role.code.toUpperCase());

  if (!roles.some((role) => INVENTORY_MANAGER_ROLES.has(role))) {
    throw createError({
      statusCode: 403,
      statusMessage: "You do not have permission to modify inventory",
    });
  }

  return { id: user.id };
}

export async function requireInventoryAdmin(
  event: H3Event,
): Promise<{ id: string }> {
  const token = getCookie(event, "golf_note_session");
  const user = token ? await sessionService.getUserBySessionToken(token) : null;

  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const roles = user.roleAssignments
    .filter((assignment) => assignment.isActive)
    .map((assignment) => assignment.role.code.toUpperCase());

  if (!roles.some((role) => role === "ADMIN" || role === "SUPER_ADMIN")) {
    throw createError({
      statusCode: 403,
      statusMessage: "Administrator permission is required",
    });
  }

  return { id: user.id };
}
