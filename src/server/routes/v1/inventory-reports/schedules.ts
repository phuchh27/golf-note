import { defineEventHandler } from "h3";

import {
  requireInventoryReportUser,
  reportHttpError,
} from "../../../modules/reports/inventory-report.http";
import { InventoryReportService } from "../../../modules/reports/inventory-report.service";

const reports = new InventoryReportService();

export default defineEventHandler(async (event) => {
  await requireInventoryReportUser(event);
  try {
    return { success: true, data: await reports.getSchedules() };
  } catch (error) {
    throw reportHttpError(error);
  }
});
