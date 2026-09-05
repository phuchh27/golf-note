import { fromWebHandler } from "h3";
import { Hono } from "hono";

import { StockController } from "../../../modules/inventory/stock/stock.controller";

const stockRouter = new Hono().basePath("/v1/inventory/stock");

stockRouter.get("/", StockController.list);
stockRouter.post("/receive", StockController.receive);
stockRouter.post("/adjust", StockController.adjust);
stockRouter.get("/:itemId/movements", StockController.movements);
stockRouter.get("/:itemId", StockController.getByItem);

export default fromWebHandler((request) => stockRouter.fetch(request));
