import { createError, getCookie, type H3Event } from "h3";

import { SessionService } from "../identity";

const sessions = new SessionService();

export async function requireInventoryReportUser(event: H3Event) {
  const token = getCookie(event, "golf_note_session");
  const user = token ? await sessions.getUserBySessionToken(token) : null;
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }
  return user;
}

export function requireInventoryReportManager(
  user: Awaited<ReturnType<typeof requireInventoryReportUser>>,
) {
  const roles = user.roleAssignments
    .filter((assignment) => assignment.isActive)
    .map((assignment) => assignment.role.code.toUpperCase());
  if (
    !roles.some((role) => ["MANAGER", "ADMIN", "SUPER_ADMIN"].includes(role))
  ) {
    throw createError({ statusCode: 403, statusMessage: "Forbidden" });
  }
}

export function reportHttpError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "INVENTORY_REPORT_ERROR";
  if (typeof error === "object" && error !== null && "statusCode" in error) {
    return error;
  }

  const statusCode =
    message === "INVENTORY_REPORT_NOT_FOUND" ||
    message === "SHIFT_SCHEDULE_NOT_FOUND"
      ? 404
      : message === "INVENTORY_REPORT_ALREADY_EXISTS"
        ? 409
        : 400;
  return createError({ statusCode, statusMessage: message });
}
