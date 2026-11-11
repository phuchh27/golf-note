import { createError, defineEventHandler, getQuery, readBody } from "h3";

import {
  requireInventoryReportUser,
  reportHttpError,
} from "../../modules/reports/inventory-report.http";
import { InventoryReportService } from "../../modules/reports/inventory-report.service";

const reports = new InventoryReportService();

export default defineEventHandler(async (event) => {
  const user = await requireInventoryReportUser(event);
  try {
    if (event.method === "GET") {
      const query = getQuery(event);
      return {
        success: true,
        data: await reports.listByMonth(String(query.month ?? "")),
      };
    }
    if (event.method === "POST") {
      return {
        success: true,
        data: await reports.createReport(await readBody(event), user.id),
      };
    }
    throw createError({ statusCode: 405, statusMessage: "Method not allowed" });
  } catch (error) {
    throw reportHttpError(error);
  }
});
