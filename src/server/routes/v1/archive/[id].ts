import { createError, defineEventHandler, getCookie, getMethod, readBody } from "h3";

import { SessionService } from "../../../modules/identity";
import { ArchiveService } from "../../../modules/archive/archive.service";
import { archiveHttpError } from "../../../modules/archive/archive.http";

const sessions = new SessionService();
const archive = new ArchiveService();

export default defineEventHandler(async (event) => {
  const token = getCookie(event, "golf_note_session");
  const user = token ? await sessions.getUserBySessionToken(token) : null;
  if (!user) throw createError({ statusCode: 401, statusMessage: "Unauthorized" });

  const id = event.context.params?.id;
  if (!id) throw createError({ statusCode: 400, statusMessage: "ARCHIVE_ENTRY_ID_REQUIRED" });

  try {
    if (getMethod(event) === "PATCH") {
      return { success: true, data: await archive.update(id, await readBody(event), user.id) };
    }
    if (getMethod(event) === "DELETE") {
      return { success: true, data: await archive.delete(id) };
    }
    throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
  } catch (error) {
    throw archiveHttpError(error);
  }
});
