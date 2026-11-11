import { fromWebHandler } from "h3";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";

import { SessionService } from "../../modules/identity";
import { HandoverService } from "../../modules/handover/handover.service";

const router = new Hono().basePath("/v1/handover");
const sessions = new SessionService();
const handovers = new HandoverService();

async function currentUser(c: any) {
  const token = getCookie(c, "golf_note_session");
  return token ? sessions.getUserBySessionToken(token) : null;
}

router.get("/", async (c) => {
  const user = await currentUser(c);
  if (!user)
    return c.json({ success: false, statusMessage: "Unauthorized" }, 401);

  try {
    const data = await handovers.listTasks({
      status: c.req.query("status"),
      area: c.req.query("area"),
    });
    return c.json({ success: true, data });
  } catch (error) {
    return c.json(
      {
        success: false,
        statusMessage:
          error instanceof Error
            ? error.message
            : "Unable to load handover tasks",
      },
      400,
    );
  }
});

router.post("/", async (c) => {
  const user = await currentUser(c);
  if (!user)
    return c.json({ success: false, statusMessage: "Unauthorized" }, 401);

  try {
    const data = await handovers.createTask(await c.req.json(), user.id);
    return c.json({ success: true, data }, 201);
  } catch (error) {
    return c.json(
      {
        success: false,
        statusMessage:
          error instanceof Error
            ? error.message
            : "Unable to create handover task",
      },
      400,
    );
  }
});

router.patch("/:id", async (c) => {
  const user = await currentUser(c);
  if (!user)
    return c.json({ success: false, statusMessage: "Unauthorized" }, 401);

  try {
    const data = await handovers.updateTask(
      c.req.param("id"),
      await c.req.json(),
      user.id,
    );
    return c.json({ success: true, data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update handover task";
    return c.json(
      { success: false, statusMessage: message },
      message === "HANDOVER_TASK_NOT_FOUND" ? 404 : 400,
    );
  }
});

export default fromWebHandler((request) => router.fetch(request));
