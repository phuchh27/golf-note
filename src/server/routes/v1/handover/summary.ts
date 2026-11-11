import { defineEventHandler } from "h3";

import {
  requireHandoverUser,
  handoverHttpError,
} from "../../../modules/handover/handover.http";
import { HandoverService } from "../../../modules/handover/handover.service";

const handovers = new HandoverService();

export default defineEventHandler(async (event) => {
  await requireHandoverUser(event);
  try {
    return { success: true, data: await handovers.getPendingSummary() };
  } catch (error) {
    throw handoverHttpError(error);
  }
});
