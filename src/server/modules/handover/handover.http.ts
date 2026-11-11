import { createError, getCookie, type H3Event } from "h3";

import { SessionService } from "../identity";

const sessions = new SessionService();

export async function requireHandoverUser(event: H3Event) {
  const token = getCookie(event, "golf_note_session");
  const user = token ? await sessions.getUserBySessionToken(token) : null;
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }
  return user;
}

export function handoverHttpError(error: unknown) {
  if (typeof error === "object" && error !== null && "statusCode" in error) {
    return error;
  }
  const message = error instanceof Error ? error.message : "HANDOVER_ERROR";
  return createError({
    statusCode: message === "HANDOVER_TASK_NOT_FOUND" ? 404 : 400,
    statusMessage: message,
  });
}
