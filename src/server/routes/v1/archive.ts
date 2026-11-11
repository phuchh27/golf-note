import { createError, defineEventHandler, getCookie, getQuery, getMethod, readBody } from "h3";

import { SessionService } from "../../modules/identity";
import { ArchiveService } from "../../modules/archive/archive.service";
import { archiveHttpError } from "../../modules/archive/archive.http";

const sessions = new SessionService();
const archive = new ArchiveService();

export default defineEventHandler(async (event) => {
  const token = getCookie(event, "golf_note_session");
  const user = token ? await sessions.getUserBySessionToken(token) : null;
  if (!user) throw createError({ statusCode: 401, statusMessage: "Unauthorized" });

  try {
    if (getMethod(event) === "GET") {
      const query = getQuery(event);
      return {
        success: true,
        data: await archive.list({
          search: String(query.search ?? ""),
          type: String(query.type ?? ""),
        }),
      };
    }
    if (getMethod(event) === "POST") {
      return { success: true, data: await archive.create(await readBody(event), user.id) };
    }
    throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
  } catch (error) {
    throw archiveHttpError(error);
  }
});
