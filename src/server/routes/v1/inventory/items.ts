import { fromWebHandler } from "h3";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";

import { ItemController } from "../../../modules/inventory/item/item.controller";
import { SessionService } from "../../../modules/identity";

const itemsRouter = new Hono().basePath("/v1/inventory/items");
const sessionService = new SessionService();

const requireInventoryManager = async (c: any, next: any) => {
  const token = getCookie(c, "golf_note_session");
  const user = token ? await sessionService.getUserBySessionToken(token) : null;
  const roles = (user?.roleAssignments ?? [])
    .filter((assignment: any) => assignment.isActive)
    .map((assignment: any) => assignment.role.code.toUpperCase());

  if (!user) {
    return c.json({ success: false, message: "Unauthorized" }, 401);
  }

  if (
    !["MANAGER", "ADMIN", "SUPER_ADMIN"].some((role) => roles.includes(role))
  ) {
    return c.json(
      {
        success: false,
        message: "You do not have permission to modify inventory",
      },
      403,
    );
  }

  return next();
};

itemsRouter.get("/", ItemController.list);
itemsRouter.get("/:id", ItemController.getById);
itemsRouter.post("/", requireInventoryManager, ItemController.create);
itemsRouter.patch("/:id", requireInventoryManager, ItemController.update);
itemsRouter.patch(
  "/:id/deactivate",
  requireInventoryManager,
  ItemController.deactivate,
);

export default fromWebHandler((request) => itemsRouter.fetch(request));
