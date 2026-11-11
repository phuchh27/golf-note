import { createError, defineEventHandler, readBody } from "h3";

import {
  handoverHttpError,
  requireHandoverUser,
} from "../../../modules/handover/handover.http";
import { HandoverService } from "../../../modules/handover/handover.service";

const handovers = new HandoverService();

export default defineEventHandler(async (event) => {
  const user = await requireHandoverUser(event);
  try {
    const id = event.context.params?.id;
    if (!id)
      throw createError({ statusCode: 400, statusMessage: "Task ID required" });

    if (event.method === "GET") {
      return { success: true, data: await handovers.getTask(id) };
    }
    if (event.method === "PATCH") {
      return {
        success: true,
        data: await handovers.updateTask(id, await readBody(event), user.id),
      };
    }
    throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
  } catch (error) {
    throw handoverHttpError(error);
  }
});
