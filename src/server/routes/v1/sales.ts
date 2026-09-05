import {
  createError,
  defineEventHandler,
  getCookie,
  getQuery,
  readBody,
} from "h3";

import { SessionService } from "../../modules/identity";
import { SaleService } from "../../modules/sales/sale.service";

const sessionService = new SessionService();
const saleService = new SaleService();

export default defineEventHandler(async (event) => {
  const token = getCookie(event, "golf_note_session");
  const user = token ? await sessionService.getUserBySessionToken(token) : null;

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
    });
  }

  try {
    if (event.method === "GET") {
      const query = getQuery(event);
      const customerType =
        query.customerType === "ROOM" || query.customerType === "EXTERNAL"
          ? query.customerType
          : undefined;

      return {
        success: true,
        data: await saleService.getSales({
          dateFrom: String(query.dateFrom ?? "") || undefined,
          dateTo: String(query.dateTo ?? "") || undefined,
          customerType,
          roomNumber: String(query.roomNumber ?? "") || undefined,
          page: Number(query.page) || 1,
          limit: Number(query.limit) || 20,
        }),
      };
    }

    return {
      success: true,
      data: await saleService.createSale({
        ...(await readBody(event)),
        createdBy: user.id,
      }),
    };
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage:
        error instanceof Error ? error.message : "Unable to create sale",
    });
  }
});
