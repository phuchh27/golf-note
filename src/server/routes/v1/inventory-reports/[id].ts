import { createError, defineEventHandler } from "h3";

import {
  requireInventoryReportUser,
  reportHttpError,
} from "../../../modules/reports/inventory-report.http";
import { InventoryReportService } from "../../../modules/reports/inventory-report.service";

const reports = new InventoryReportService();

export default defineEventHandler(async (event) => {
  await requireInventoryReportUser(event);
  try {
    const id = event.context.params?.id;
    if (!id)
      throw createError({
        statusCode: 400,
        statusMessage: "Report ID required",
      });
    return { success: true, data: await reports.getReport(id) };
  } catch (error) {
    throw reportHttpError(error);
  }
});
