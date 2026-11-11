import { createError, defineEventHandler, readBody } from "h3";

import {
  requireInventoryReportManager,
  requireInventoryReportUser,
  reportHttpError,
} from "../../../../modules/reports/inventory-report.http";
import { InventoryReportService } from "../../../../modules/reports/inventory-report.service";

const reports = new InventoryReportService();

export default defineEventHandler(async (event) => {
  const user = await requireInventoryReportUser(event);
  requireInventoryReportManager(user);
  try {
    const code = event.context.params?.code;
    if (!code)
      throw createError({
        statusCode: 400,
        statusMessage: "Shift code required",
      });
    return {
      success: true,
      data: await reports.updateSchedule(code, await readBody(event)),
    };
  } catch (error) {
    throw reportHttpError(error);
  }
});
