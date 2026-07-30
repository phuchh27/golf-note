import { Hono } from "hono";

import { CategoryController } from "../../../modules/inventory/category/category.controller";

const categoriesRouter = new Hono();

categoriesRouter.get(
  "/",
  CategoryController.list,
);

categoriesRouter.get(
  "/:id",
  CategoryController.getById,
);

categoriesRouter.post(
  "/",
  CategoryController.create,
);

categoriesRouter.patch(
  "/:id",
  CategoryController.update,
);

categoriesRouter.patch(
  "/:id/deactivate",
  CategoryController.deactivate,
);

export default categoriesRouter;