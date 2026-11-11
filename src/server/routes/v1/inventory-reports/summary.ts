import { createError, defineEventHandler, getQuery } from "h3";

import {
  requireInventoryReportUser,
  reportHttpError,
} from "../../../modules/reports/inventory-report.http";
import { InventoryReportService } from "../../../modules/reports/inventory-report.service";

const reports = new InventoryReportService();

export default defineEventHandler(async (event) => {
  await requireInventoryReportUser(event);
  try {
    const query = getQuery(event);
    const month = String(query.month ?? "");
    if (!month) {
      throw createError({ statusCode: 400, statusMessage: "REPORT_MONTH_REQUIRED" });
    }
    return { success: true, data: await reports.getMonthlySummary(month) };
  } catch (error) {
    throw reportHttpError(error);
  }
});
