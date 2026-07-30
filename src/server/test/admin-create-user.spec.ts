import { describe, expect, it } from "vitest";

import { createApp, createRouter, toNodeListener } from "h3";

import request from "supertest";

import { createCreateUserHandler } from "../routes/v1/admin/create-user.handler";

describe("Admin create-user API", () => {
  function createTestApp(identityService: any, sessionService: any) {
    const app = createApp();
    const router = createRouter();

    router.post(
      "/api/v1/admin/users",
      createCreateUserHandler(identityService, sessionService),
    );

    app.use(router);

    return app;
  }

  it("rejects users without admin access", async () => {
    const identityService = {
      createUser: vi.fn(),
    };

    const sessionService = {
      getUserBySessionToken: vi.fn().mockResolvedValue({
        id: "user-1",
        username: "staff",
        roleAssignments: [],
        permissionGrants: [],
      }),
    };

    const app = createTestApp(identityService, sessionService);

    const response = await request(toNodeListener(app))
      .post("/api/v1/admin/users")
      .set("cookie", "golf_note_session=abc123")
      .send({
        username: "newuser",
        password: "secret123",
        fullName: "New User",
      });

    expect(response.status).toBe(403);
    expect(identityService.createUser).not.toHaveBeenCalled();
  });

  it("creates a user for an authenticated admin", async () => {
    const identityService = {
      createUser: vi.fn().mockResolvedValue({
        id: "user-2",
        username: "newuser",
        fullName: "New User",
      }),
    };

    const sessionService = {
      getUserBySessionToken: vi.fn().mockResolvedValue({
        id: "admin-1",
        username: "admin",
        roleAssignments: [{ isActive: true, role: { code: "SUPER_ADMIN" } }],
        permissionGrants: [],
      }),
    };

    const app = createTestApp(identityService, sessionService);

    const response = await request(toNodeListener(app))
      .post("/api/v1/admin/users")
      .set("cookie", "golf_note_session=abc123")
      .send({
        username: "newuser",
        password: "secret123",
        fullName: "New User",
        role: "ADMIN",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(identityService.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        username: "newuser",
        fullName: "New User",
        password: "secret123",
        role: "ADMIN",
      }),
    );
  });
});
