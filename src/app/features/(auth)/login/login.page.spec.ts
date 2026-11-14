import { DOCUMENT } from "@angular/common";
import { TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthService } from "../../../core/auth/auth.service";
import { ToastService } from "../../../core/ui/toast.service";
import LoginPage from "./login.page";

const REMEMBERED_USERNAME_COOKIE = "golf_note_remembered_username";

describe("LoginPage", () => {
  let document: Document;
  let authService: { login: ReturnType<typeof vi.fn> };
  let router: { navigateByUrl: ReturnType<typeof vi.fn> };
  let toastService: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    authService = {
      login: vi.fn().mockResolvedValue(undefined),
    };
    router = {
      navigateByUrl: vi.fn().mockResolvedValue(true),
    };
    toastService = {
      success: vi.fn(),
      error: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        { provide: ToastService, useValue: toastService },
      ],
    }).compileComponents();

    document = TestBed.inject(DOCUMENT);
    clearRememberedUsernameCookie();
  });

  afterEach(() => {
    clearRememberedUsernameCookie();
  });

  it("restores the username and remember-me selection from its cookie", () => {
    document.cookie =
      `${REMEMBERED_USERNAME_COOKIE}=alex%40example.com; Path=/; SameSite=Lax`;

    const fixture = TestBed.createComponent(LoginPage);

    expect(fixture.componentInstance.username).toBe("alex@example.com");
    expect(fixture.componentInstance.rememberMe).toBe(true);

    fixture.destroy();
  });

  it("keeps the remembered username available after a successful login", async () => {
    const fixture = TestBed.createComponent(LoginPage);
    const component = fixture.componentInstance;
    component.username = "alex@example.com";
    component.password = "password";
    component.rememberMe = true;

    await component.login();

    expect(document.cookie).toContain(
      `${REMEMBERED_USERNAME_COOKIE}=alex%40example.com`,
    );

    fixture.destroy();

    const nextFixture = TestBed.createComponent(LoginPage);
    expect(nextFixture.componentInstance.username).toBe("alex@example.com");
    expect(nextFixture.componentInstance.rememberMe).toBe(true);
    nextFixture.destroy();
  });

  it("removes the remembered username when remember-me is unchecked", async () => {
    document.cookie =
      `${REMEMBERED_USERNAME_COOKIE}=old-user; Path=/; SameSite=Lax`;
    const fixture = TestBed.createComponent(LoginPage);
    const component = fixture.componentInstance;
    component.username = "new-user";
    component.password = "password";
    component.rememberMe = false;

    await component.login();

    expect(document.cookie).not.toContain(REMEMBERED_USERNAME_COOKIE);
    fixture.destroy();
  });

  function clearRememberedUsernameCookie(): void {
    document.cookie = `${REMEMBERED_USERNAME_COOKIE}=; Max-Age=0; Path=/`;
  }
});
