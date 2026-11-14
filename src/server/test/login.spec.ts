import { describe, expect, it } from "vitest";

import { createApp, createRouter, toNodeListener } from "h3";

import request from "supertest";

import { createLoginHandler } from "../routes/v1/auth/login.handler";

describe("Login API", () => {
  function createTestApp(identityService: any, sessionService: any) {
    const app = createApp();

    const router = createRouter();

    router.post(
      "/api/v1/auth/login",
      createLoginHandler(identityService, sessionService),
    );

    app.use(router);

    return app;
  }

  it("should return 400 when username is missing", async () => {
    const identityService = {
      authenticate: vi.fn(),
    };

    const sessionService = {
      createSession: vi.fn(),
    };

    const app = createTestApp(identityService, sessionService);

    const response = await request(toNodeListener(app))
      .post("/api/v1/auth/login")
      .send({
        password: "admin",
      });

    expect(response.status).toBe(400);

    expect(identityService.authenticate).not.toHaveBeenCalled();

    expect(sessionService.createSession).not.toHaveBeenCalled();
  });

  it("should return 400 when password is missing", async () => {
    const identityService = {
      authenticate: vi.fn(),
    };

    const sessionService = {
      createSession: vi.fn(),
    };

    const app = createTestApp(identityService, sessionService);

    const response = await request(toNodeListener(app))
      .post("/api/v1/auth/login")
      .send({
        username: "admin",
      });

    expect(response.status).toBe(400);
  });

  it("should return 401 for invalid credentials", async () => {
    const identityService = {
      authenticate: vi.fn().mockResolvedValue(null),
    };

    const sessionService = {
      createSession: vi.fn(),
    };

    const app = createTestApp(identityService, sessionService);

    const response = await request(toNodeListener(app))
      .post("/api/v1/auth/login")
      .send({
        username: "admin",
        password: "wrong-password",
      });

    expect(response.status).toBe(401);

    expect(identityService.authenticate).toHaveBeenCalledWith(
      "admin",
      "wrong-password",
    );

    expect(sessionService.createSession).not.toHaveBeenCalled();
  });

  it("should login successfully", async () => {
    const identityService = {
      authenticate: vi.fn().mockResolvedValue({
        id: "user-1",
        username: "admin",
        fullName: "System Administrator",
        roles: ["SUPER_ADMIN"],
        permissions: ["manage:all"],
      }),
    };

    const expiresAt = new Date(Date.now() + 9 * 60 * 60 * 1000);

    const sessionService = {
      createSession: vi.fn().mockResolvedValue({
        token: "test-session-token",
        expiresAt,
      }),
    };

    const app = createTestApp(identityService, sessionService);

    const response = await request(toNodeListener(app))
      .post("/api/v1/auth/login")
      .send({
        username: "admin",
        password: "admin",
      });

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      success: true,
      user: {
        id: "user-1",
        username: "admin",
        fullName: "System Administrator",
        roles: ["SUPER_ADMIN"],
        permissions: ["manage:all"],
      },
    });

    expect(identityService.authenticate).toHaveBeenCalledWith("admin", "admin");

    expect(sessionService.createSession).toHaveBeenCalledWith("user-1", false);

    const cookiesRaw = response.headers["set-cookie"];

    expect(cookiesRaw).toBeDefined();

    const cookies: string[] = Array.isArray(cookiesRaw)
      ? cookiesRaw
      : [cookiesRaw as string];

    expect(
      cookies.some((cookie: string) => cookie.includes("golf_note_session=")),
    ).toBe(true);

    expect(cookies.some((cookie: string) => cookie.includes("HttpOnly"))).toBe(
      true,
    );
    expect(cookies.some((cookie: string) => cookie.includes("Expires="))).toBe(
      false,
    );
  });

  it("creates a persistent cookie when rememberMe is enabled", async () => {
    const identityService = {
      authenticate: vi.fn().mockResolvedValue({
        id: "user-1",
        username: "admin",
        fullName: "System Administrator",
        roles: ["SUPER_ADMIN"],
        permissions: ["manage:all"],
      }),
    };

    const sessionService = {
      createSession: vi.fn().mockResolvedValue({
        token: "test-session-token",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }),
    };

    const app = createTestApp(identityService, sessionService);

    const response = await request(toNodeListener(app))
      .post("/api/v1/auth/login")
      .send({
        username: "admin",
        password: "admin",
        rememberMe: true,
      });

    expect(response.status).toBe(200);
    expect(sessionService.createSession).toHaveBeenCalledWith("user-1", true);

    const cookiesRaw = response.headers["set-cookie"];
    const cookies: string[] = Array.isArray(cookiesRaw)
      ? cookiesRaw
      : [cookiesRaw as string];

    expect(cookies.some((cookie) => cookie.includes("Expires="))).toBe(true);
  });
});
