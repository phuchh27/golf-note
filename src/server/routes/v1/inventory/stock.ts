import { fromWebHandler } from "h3";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";

import { SessionService } from "../../../modules/identity";
import { StockController } from "../../../modules/inventory/stock/stock.controller";

const stockRouter = new Hono().basePath("/v1/inventory/stock");
const sessions = new SessionService();

const requireInventoryManager = async (c: any, next: any) => {
  const token = getCookie(c, "golf_note_session");
  const user = token ? await sessions.getUserBySessionToken(token) : null;
  if (!user)
    return c.json({ success: false, statusMessage: "Unauthorized" }, 401);

  const roles = user.roleAssignments
    .filter((assignment: any) => assignment.isActive)
    .map((assignment: any) => assignment.role.code.toUpperCase());
  if (
    !["MANAGER", "ADMIN", "SUPER_ADMIN"].some((role) => roles.includes(role))
  ) {
    return c.json(
      {
        success: false,
        statusMessage: "You do not have permission to modify inventory",
      },
      403,
    );
  }

  c.set("stockActorId", user.id);
  return next();
};

stockRouter.get("/", StockController.list);
stockRouter.get("/receipts", StockController.receiptHistory);
stockRouter.post("/receive", requireInventoryManager, StockController.receive);
stockRouter.post("/adjust", requireInventoryManager, StockController.adjust);
stockRouter.get("/:itemId/movements", StockController.movements);
stockRouter.get("/:itemId", StockController.getByItem);

export default fromWebHandler((request) => stockRouter.fetch(request));
