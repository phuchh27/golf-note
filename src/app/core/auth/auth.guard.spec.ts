import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter, UrlTree } from "@angular/router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthService } from "./auth.service";
import { authGuard } from "./auth.guard";

@Component({ template: "" })
class TestHostComponent {}

describe("authGuard", () => {
  const authService = {
    initialize: vi.fn(),
    isAuthenticated: vi.fn(),
    isInitialized: vi.fn(),
  };

  beforeEach(() => {
    authService.initialize.mockReset();
    authService.isAuthenticated.mockReset();
    authService.isInitialized.mockReset();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: "",
            component: TestHostComponent,
            canActivate: [authGuard],
          },
          {
            path: "login",
            component: TestHostComponent,
          },
        ]),
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    });
  });

  it("waits for initialization before redirecting unauthenticated users", async () => {
    let resolveInitialization!: () => void;
    const initialization = new Promise<void>((resolve) => {
      resolveInitialization = resolve;
    });

    authService.initialize.mockReturnValue(initialization);
    authService.isAuthenticated.mockReturnValue(false);
    authService.isInitialized.mockReturnValue(false);

    let settled = false;
    const resultPromise = TestBed.runInInjectionContext(() =>
      authGuard({} as never, {} as never),
    ) as Promise<boolean | UrlTree>;

    resultPromise.then(() => {
      settled = true;
    });

    await Promise.resolve();

    expect(authService.initialize).toHaveBeenCalledTimes(1);
    expect(settled).toBe(false);

    resolveInitialization();
    const result = await resultPromise;

    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe("/login");
  });
});
